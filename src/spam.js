// Week 5: two simple spam limits for the order form. (The third limit, the database checks,
// is in supabase/setup.sql.) The honest truth: these slow down lazy bots and stop accidental
// double orders, but someone determined can skip this page and call the database directly.
// That's why the database checks matter most. See docs/week-05-permissions.md.
import { readJSON, writeJSON } from "./storage.js";

// 1. The honeypot: a form field people can't see (CSS moves it off the screen), so they leave it empty.
//    Simple bots fill in every field they find, which gives them away.
export function isHoneypotFilled(form) {
  return String(form.elements.namedItem("website").value).trim() !== "";
}

// 2. One order per 30 seconds from this browser.
export const WAIT_SECONDS = 30;
const LAST_ORDER_KEY = "crumb-last-order-at";

// How many seconds this browser must still wait before sending another order (0 means go ahead).
export function secondsUntilNextOrder(now = Date.now()) {
  const lastOrderAt = Number(readJSON(LAST_ORDER_KEY, 0)) || 0;
  const waitSeconds = Math.ceil((lastOrderAt + WAIT_SECONDS * 1000 - now) / 1000);
  return Math.min(Math.max(waitSeconds, 0), WAIT_SECONDS);
}

export function rememberOrderTime(now = Date.now()) {
  writeJSON(LAST_ORDER_KEY, now);
}
