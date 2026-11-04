// Vite settings for the Crumb website. Most of the time you won't need to change this file.
// Adding a page? Create the .html file next to index.html and add its name to `pages` below.
import { defineConfig, loadEnv } from "vite";
import { readFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

// Every page of the site. Each one becomes a real HTML file in dist/ when you build.
const pages = ["index", "menu", "about", "order", "privacy", "check", "404"];

export default defineConfig(({ mode }) => {
  checkSupabaseSettings(loadEnv(mode, root, "VITE_"));
  return {
    appType: "mpa", // a multi-page site: every page is its own HTML file, and unknown addresses show the 404 page
    plugins: [sharedHeaderAndFooter()],
    build: {
      rolldownOptions: {
        input: Object.fromEntries(pages.map((page) => [page, resolve(root, `${page}.html`)])),
      },
    },
  };
});

// Pastes the shared header and footer into every page, so you only edit them in one place.
// A line like <!-- include src/partials/header.html --> is replaced by the contents of that file.
function sharedHeaderAndFooter() {
  return {
    name: "shared-header-and-footer",
    transformIndexHtml: {
      order: "pre",
      handler(html, ctx) {
        const file = basename(ctx.filename);
        const href = file === "index.html" ? "/" : `/${file}`;
        return html.replace(/<!--\s*include\s+(\S+)\s*-->/g, (line, partial) =>
          readFileSync(resolve(root, partial), "utf8")
            // Marks the links to the page you're on, so they can be styled and screen readers announce them.
            .replaceAll(`href="${href}"`, `href="${href}" aria-current="page"`),
        );
      },
    },
    // When you save a file in src/partials, reload the browser so you see the change.
    handleHotUpdate({ file, server }) {
      if (file.replaceAll("\\", "/").includes("/src/partials/")) {
        server.ws.send({ type: "full-reload" });
        return [];
      }
    },
  };
}

// Stops the build if a secret key is about to go into the website, and catches common setup mistakes.
function checkSupabaseSettings(env) {
  const url = (env.VITE_SUPABASE_URL || "").trim();
  const key = (env.VITE_SUPABASE_PUBLISHABLE_KEY || "").trim();
  if (key.startsWith("sb_secret_") || isServiceRoleKey(key)) {
    throw new Error(
      "VITE_SUPABASE_PUBLISHABLE_KEY is a SECRET key. A secret key skips every security rule, so it must never go in a website. " +
        "Use the publishable key (it starts with sb_publishable_) or the legacy anon key. See docs/troubleshooting.md.",
    );
  }
  if (url && !/^https?:\/\/[^/\s]+\/?$/.test(url)) {
    throw new Error(
      "VITE_SUPABASE_URL should look like https://abcdefghijklmnopqrst.supabase.co, with nothing after .co. " +
        "Copy the Project URL from Supabase (Project Settings, Data API).",
    );
  }
  if (Boolean(url) !== Boolean(key)) {
    console.warn("\nOnly one of VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY is set, so the site stays in local mode.\n");
  }
}

// Legacy Supabase keys are JWTs: three parts separated by dots. The middle part says which role the key has.
function isServiceRoleKey(key) {
  const payload = key.split(".")[1];
  if (!payload) return false;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")).role === "service_role";
  } catch {
    return false;
  }
}
