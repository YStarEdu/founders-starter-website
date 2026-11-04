// The data layer: the only file that knows where orders are saved.
// Local mode: in this browser (localStorage). Supabase mode: in the orders table of your database.
// Pages call saveOrder() the same way in both modes.
import { LOCAL_MODE } from "./config.js";
import { supabase } from "./supabase.js";
import { readJSON, writeJSON } from "./storage.js";

const LOCAL_ORDERS_KEY = "crumb-orders";

// Saves one order. If it fails, it throws an Error whose message you can show to the customer.
export async function saveOrder(order) {
  if (LOCAL_MODE) {
    const orders = readJSON(LOCAL_ORDERS_KEY, []);
    orders.push({ ...order, created_at: new Date().toISOString() });
    if (!writeJSON(LOCAL_ORDERS_KEY, orders)) {
      throw new Error("Your browser didn't let this site save the order. Try again in a normal (not private) window.");
    }
    return;
  }

  // There's no .select() after .insert() on purpose: visitors may add orders but not read them,
  // so asking for the new row back would be refused (see supabase/setup.sql).
  const { error } = await supabase.from("orders").insert(order);
  if (error) {
    console.error("The order wasn't saved:", error); // details for you, in the browser Console
    throw new Error(friendlyMessage(error));
  }
}

// The orders saved in this browser in local mode. Once Supabase is connected,
// you read orders in Supabase's Table Editor instead.
export function localOrders() {
  return readJSON(LOCAL_ORDERS_KEY, []);
}

// Turns a database error into words a customer understands.
function friendlyMessage(error) {
  const text = `${error.code || ""} ${error.message || ""}`;
  if (error.code === "23514") return "One of your answers isn't allowed. Check the form and try again.";
  if (/row-level security/i.test(text)) return "This order couldn't be accepted. Check the pickup time and try again.";
  if (/fetch|network/i.test(text)) return "We couldn't reach the order system. Check your internet connection and try again.";
  return "Our order system isn't working right now. Please try again later, or call or email us.";
}
