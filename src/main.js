// Runs on every page: shows the local-mode banner and keeps the footer year up to date.
// (The styles are linked in each page's <head>, so the site still looks right if JavaScript fails.)
import { LOCAL_MODE } from "./config.js";

if (LOCAL_MODE) {
  const banner = document.createElement("aside");
  banner.className = "local-banner";
  banner.setAttribute("aria-label", "Local mode");
  banner.textContent = "Local mode: data is saved in this browser only. Connect Supabase in Week 4.";
  document.body.prepend(banner);
}

for (const element of document.querySelectorAll("[data-year]")) {
  element.textContent = new Date().getFullYear();
}
