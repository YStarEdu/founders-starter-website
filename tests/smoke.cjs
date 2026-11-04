// Smoke test: builds the site in local mode, opens every page in a real browser (Playwright) at phone size,
// tries the order form with bad and good answers, and fails if anything breaks or the Console shows an error.
// Run it with: npm test   (or on its own: node tests/smoke.cjs)
const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.log("SKIPPED the browser smoke test: Playwright isn't installed on this computer.");
  console.log("To run it too: npm install --no-save playwright, then npx playwright install chromium");
  process.exit(0);
}

const root = path.join(__dirname, "..");
const vite = path.join(root, "node_modules", "vite", "bin", "vite.js");
const BANNER = "Local mode: data is saved in this browser only. Connect Supabase in Week 4.";

// Every page, and which menu link should be marked as the current page.
const PAGES = [
  { path: "/", current: "Home" },
  { path: "/menu.html", current: "Menu" },
  { path: "/about.html", current: "About" },
  { path: "/order.html", current: "Order" },
  { path: "/privacy.html" },
  { path: "/check.html" },
  { path: "/404.html" },
];

let failures = 0;

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function main() {
  // Build a separate copy in local mode, so the test never sends anything to your real Supabase project.
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "crumb-smoke-"));
  const env = { ...process.env, VITE_SUPABASE_URL: "", VITE_SUPABASE_PUBLISHABLE_KEY: "" };
  const build = spawnSync(process.execPath, [vite, "build", "--outDir", outDir, "--emptyOutDir", "--logLevel", "error"], {
    cwd: root,
    env,
    stdio: "inherit",
  });
  if (build.status !== 0) throw new Error("vite build failed, so the smoke test can't run");

  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, [vite, "preview", "--outDir", outDir, "--port", String(port), "--strictPort", "--host", "127.0.0.1"], {
    cwd: root,
    env,
    stdio: "ignore",
  });

  try {
    await waitForServer(base);
    await runChecks(base);
  } finally {
    server.kill();
    fs.rmSync(outDir, { recursive: true, force: true });
  }

  console.log(failures ? `\nSmoke test: ${failures} failed` : "\nSmoke test: all passed");
  process.exit(failures ? 1 : 0);
}

async function runChecks(base) {
  const { MENU, HOURS, DAYS } = await import(pathToFileURL(path.join(root, "src", "bakery.js")).href);
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 360, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await context.newPage();

  // Collect every error the browser Console shows, on every page.
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(`${page.url()}: ${message.text()}`);
  });
  page.on("pageerror", (error) => consoleErrors.push(`${page.url()}: ${error.message}`));

  console.log("Pages (at 360px, a small phone)");
  for (const { path: pagePath, current } of PAGES) {
    await step(`${pagePath} loads with a header, a footer and the local-mode banner`, async () => {
      const response = await page.goto(base + pagePath);
      expect(response.status() === 200, `the server answered ${response.status()}`);
      expect((await page.locator("h1").count()) === 1, "the page should have exactly one <h1>");
      expect((await page.locator("h1").innerText()).trim() !== "", "the <h1> is empty");
      expect((await page.locator(".local-banner").innerText()) === BANNER, "the local-mode banner is missing");
      expect((await page.locator("header nav a").count()) >= 4, "the header menu is missing");
      expect((await page.locator('footer a[href="/privacy.html"]').count()) === 1, "the footer has no Privacy link");
      if (current) {
        const marked = await page.locator('header nav a[aria-current="page"]').allInnerTexts();
        expect(marked.join() === current, `the menu should mark "${current}" as the current page, not "${marked.join()}"`);
      }
      const extra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(extra <= 0, `the page is ${extra}px wider than the screen, so it scrolls sideways on a phone`);
    });
  }

  await step("an address that doesn't exist answers 404", async () => {
    const response = await fetch(`${base}/no-such-page`); // asked from Node, so the browser Console stays clean
    expect(response.status === 404, `the server answered ${response.status}`);
  });

  await step("the Menu page lists every item in src/bakery.js, with prices", async () => {
    await page.goto(`${base}/menu.html`);
    expect((await page.locator(".menu-item").count()) === MENU.length, `expected ${MENU.length} menu items`);
    expect((await page.locator(".menu-item .price").first().innerText()).startsWith("$"), "prices should start with $");
  });

  await step("the About page shows a row of opening hours for each day", async () => {
    await page.goto(`${base}/about.html`);
    expect((await page.locator("#hours-table tbody tr").count()) === Object.keys(HOURS).length, "wrong number of rows");
  });

  await step("the Permission check page explains that local mode has nothing to check", async () => {
    await page.goto(`${base}/check.html`);
    expect(await page.locator("#check-local").isVisible(), "the local-mode message isn't showing");
  });

  console.log("\nOrder form");
  const submit = () => page.click('#order-form button[type="submit"]');
  const savedOrders = () => page.evaluate(() => JSON.parse(localStorage.getItem("crumb-orders") || "[]"));
  const visible = (selector) => page.locator(selector).isVisible();

  await page.goto(`${base}/order.html`);
  await step("sending an empty form shows an error for each required field, and saves nothing", async () => {
    await submit();
    expect(await visible("#error-summary"), "the error summary isn't showing");
    for (const field of ["name", "email", "item", "date", "time"]) {
      expect(await visible(`#${field}-error`), `no error under the ${field} field`);
      expect((await page.getAttribute(`#${field}`, "aria-invalid")) === "true", `the ${field} field isn't marked invalid`);
    }
    expect((await page.evaluate(() => document.activeElement.id)) === "error-summary", "focus should move to the error summary");
    expect((await savedOrders()).length === 0, "an invalid order was saved");
  });

  await step("a bad email and a quantity of 13 are caught", async () => {
    await page.fill("#name", "Ava Martin");
    await page.fill("#email", "not-an-email");
    await page.fill("#quantity", "13");
    await submit();
    expect(await visible("#email-error"), "no error under Email");
    expect(await visible("#quantity-error"), "no error under Quantity");
    expect(!(await visible("#name-error")), "the name is fine now, so its error should be gone");
  });

  // A pickup slot that's valid: the first open day from tomorrow, one hour after opening.
  const slot = await page.evaluate(
    ({ hours, days }) => {
      const pad = (n) => String(n).padStart(2, "0");
      for (let ahead = 1; ahead <= 14; ahead++) {
        const date = new Date();
        date.setDate(date.getDate() + ahead);
        const open = hours[days[date.getDay()]];
        if (!open) continue;
        const [h, m] = open.open.split(":").map(Number);
        return { date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`, time: `${pad(Math.min(h + 1, 23))}:${pad(m)}` };
      }
      return null;
    },
    { hours: HOURS, days: DAYS },
  );
  const fillValidOrder = async () => {
    await page.fill("#name", "Ava Martin");
    await page.fill("#email", "ava@example.com");
    await page.selectOption("#item", MENU[0].name);
    await page.fill("#quantity", "2");
    await page.fill("#date", slot.date);
    await page.fill("#time", slot.time);
    await page.fill("#notes", "Smoke test order");
  };

  await step("a valid order shows the confirmation and is saved in localStorage", async () => {
    expect(slot, "couldn't find an open day in the next two weeks in HOURS");
    await fillValidOrder();
    await submit();
    await page.waitForSelector("#confirmation:not([hidden])", { timeout: 5000 });
    expect((await page.innerText("#confirmation-heading")).includes("Ava Martin"), "the confirmation doesn't thank the customer by name");
    expect((await page.evaluate(() => document.activeElement.id)) === "confirmation", "focus should move to the confirmation");
    const orders = await savedOrders();
    expect(orders.length === 1, `expected 1 saved order, found ${orders.length}`);
    const [order] = orders;
    expect(order.name === "Ava Martin" && order.email === "ava@example.com", "name or email saved wrong");
    expect(order.item === MENU[0].name && order.quantity === 2, "item or quantity saved wrong");
    expect(!Number.isNaN(Date.parse(order.pickup_at)), "pickup_at isn't a date");
  });

  await step("a second order within 30 seconds is held back (spam limit)", async () => {
    await page.click("#order-again");
    await fillValidOrder();
    await submit();
    expect(await visible("#form-message"), "no 'please wait' message");
    expect((await page.innerText("#form-message")).includes("wait"), "the message should ask to wait");
    expect((await savedOrders()).length === 1, "the second order was saved anyway");
  });

  await step("a bot that fills the hidden honeypot field sees 'thanks', but nothing is saved", async () => {
    await page.evaluate(() => localStorage.removeItem("crumb-last-order-at")); // skip the 30-second wait
    await page.reload();
    await fillValidOrder();
    await page.$eval("#website", (input) => {
      input.value = "https://spam.example";
    });
    await submit();
    await page.waitForSelector("#confirmation:not([hidden])", { timeout: 5000 });
    expect((await savedOrders()).length === 1, "the bot's order was saved");
  });

  console.log("\nConsole");
  await step("no errors in the browser Console on any page", async () => {
    expect(consoleErrors.length === 0, `\n        ${consoleErrors.join("\n        ")}`);
  });

  await browser.close();
}

// ---------- helpers ----------

async function step(name, fn) {
  try {
    await fn();
    console.log(`  ok    ${name}`);
  } catch (error) {
    failures++;
    console.log(`  FAIL  ${name} - ${error.message.split("\n=====")[0]}`);
  }
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.on("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

async function waitForServer(url, timeoutMs = 20000) {
  const giveUpAt = Date.now() + timeoutMs;
  while (Date.now() < giveUpAt) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`vite preview didn't start at ${url}`);
}
