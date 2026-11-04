// The Permission check page (Week 5). It uses the same public key as your website, so it can only do
// what any visitor or bot could do. It adds one test order, then tries to read, change and delete orders.
// Each line passes when the database answers the way your policies in supabase/setup.sql say it should.
import "../main.js";
import { LOCAL_MODE } from "../config.js";
import { supabase } from "../supabase.js";
import { MENU } from "../bakery.js";

const TEST_NAME = "Permission check";

// A valid order for tomorrow. The check adds it so there's something to try to read, change and delete.
function testOrder() {
  return {
    name: TEST_NAME,
    email: "check@example.com",
    item: MENU[0].name,
    quantity: 1,
    pickup_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    notes: "Added by the permission check page. Safe to delete.",
  };
}

// "Refused" means the database said no: a security rule (42501) or a check constraint (23514).
const refused = (error) => error && (error.code === "42501" || error.code === "23514");

const CHECKS = [
  {
    title: "A visitor can place an order",
    run: () => supabase.from("orders").insert(testOrder()),
    passes: ({ error }) => !error,
    explain: ({ error }) => (error ? error.message : "The test order was saved."),
  },
  {
    title: "A visitor can't place an order for 99 items",
    run: () => supabase.from("orders").insert({ ...testOrder(), quantity: 99 }),
    passes: ({ error }) => refused(error),
    explain: ({ error }) => (error ? `Refused: ${error.message}` : "It was saved! Check the quantity limit in setup.sql."),
  },
  {
    title: "A visitor can't read any orders",
    run: () => supabase.from("orders").select("name, email").limit(5),
    passes: ({ data, error }) => refused(error) || (!error && data.length === 0),
    explain: ({ data, error }) => {
      if (error) return `Refused: ${error.message}`;
      if (data.length === 0) return "The database sent back 0 orders, even though there's at least one (the test order).";
      return `The database sent back ${data.length} orders, so anyone can read them! Remove the select policy on orders.`;
    },
  },
  {
    title: "A visitor can't change orders",
    run: () => supabase.from("orders").update({ notes: "Changed by a visitor" }, { count: "exact" }).eq("name", TEST_NAME),
    passes: ({ error, count }) => refused(error) || (!error && count === 0),
    explain: (result) => countExplanation(result, "changed", "update"),
  },
  {
    title: "A visitor can't delete orders",
    run: () => supabase.from("orders").delete({ count: "exact" }).eq("name", TEST_NAME),
    passes: ({ error, count }) => refused(error) || (!error && count === 0),
    explain: (result) => countExplanation(result, "deleted", "delete"),
  },
];

function countExplanation({ error, count }, verb, command) {
  if (error) return `Refused: ${error.message}`;
  if (count === 0) return `0 orders were ${verb}.`;
  if (count === null || count === undefined) return `The database didn't say how many orders were ${verb}. Check the test order in the Table Editor.`;
  return `${count} orders were ${verb}! Remove the ${command} policy on orders.`;
}

document.querySelector(LOCAL_MODE ? "#check-local" : "#check-ready").hidden = false;
document.querySelector("#run-check").addEventListener("click", runChecks);

async function runChecks() {
  const button = document.querySelector("#run-check");
  const list = document.querySelector("#check-results");
  list.replaceChildren();
  button.disabled = true;

  let allPassed = true;
  for (const check of CHECKS) {
    let result;
    try {
      result = await check.run();
    } catch (error) {
      result = { error: { message: error.message } };
    }
    const passed = check.passes(result);
    allPassed &&= passed;
    list.append(resultLine(check.title, passed, check.explain(result)));
    if (!passed && check === CHECKS[0]) break; // without the test order, the other checks prove nothing
  }

  const summary = document.querySelector("#check-summary");
  summary.textContent = allPassed
    ? "All checks passed. Visitors can place orders and nothing else. Now delete the test orders in Supabase's Table Editor."
    : "Some checks failed. Compare your policies with supabase/setup.sql and read docs/week-05-permissions.md.";
  summary.hidden = false;
  button.disabled = false;
}

function resultLine(title, passed, detail) {
  const item = document.createElement("li");
  item.className = passed ? "pass" : "fail";
  const label = document.createElement("strong");
  label.textContent = passed ? "Pass: " : "Fail: ";
  const text = document.createElement("span");
  text.textContent = `${title}. ${detail}`;
  item.append(label, text);
  return item;
}
