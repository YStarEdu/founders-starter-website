// Checks an order before it's sent. The database checks the same limits again (supabase/setup.sql):
// this page checks first so people get a friendly message, and the database checks because
// anyone can skip this page and send data straight to the database.
import { DAYS, MENU, formatTime, hoursOn, toMinutes } from "./bakery.js";

export const LIMITS = {
  nameLength: 80,
  emailLength: 254,
  notesLength: 500,
  minQuantity: 1,
  maxQuantity: 12,
  minHoursAhead: 1, // the bakery needs at least an hour to get an order ready
  maxDaysAhead: 30,
};

// The same pattern the database uses: something@something.something, with no spaces.
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// `values` is the text from the form. Returns { errors, order }.
// `errors` has one message per field that needs fixing (it's empty when all is well),
// and `order` has the column names of the orders table, ready to save.
export function validateOrder(values, now = new Date()) {
  const errors = {};
  const name = (values.name || "").trim();
  const email = (values.email || "").trim();
  const item = values.item || "";
  const quantity = Number(values.quantity);
  const notes = (values.notes || "").trim();

  if (!name) errors.name = "Enter your name.";
  else if (name.length > LIMITS.nameLength) errors.name = `Keep your name to ${LIMITS.nameLength} characters or fewer.`;

  if (!email) errors.email = "Enter your email address.";
  else if (email.length > LIMITS.emailLength || !EMAIL_PATTERN.test(email)) {
    errors.email = "Enter an email address like name@example.com.";
  }

  if (!MENU.some((entry) => entry.name === item)) errors.item = "Choose an item from the menu.";

  if (!Number.isInteger(quantity) || quantity < LIMITS.minQuantity || quantity > LIMITS.maxQuantity) {
    errors.quantity = `Choose a quantity from ${LIMITS.minQuantity} to ${LIMITS.maxQuantity}.`;
  }

  const pickup = checkPickup(values.date, values.time, now, errors);

  if (notes.length > LIMITS.notesLength) errors.notes = `Keep notes to ${LIMITS.notesLength} characters or fewer.`;

  return {
    errors,
    order: { name, email, item, quantity, pickup_at: pickup ? pickup.toISOString() : null, notes },
  };
}

// The pickup must be on a day you're open, during opening hours,
// at least an hour from now and no more than 30 days ahead.
function checkPickup(date, time, now, errors) {
  if (!date) errors.date = "Choose a pickup date.";
  if (!time) errors.time = "Choose a pickup time.";
  if (!date || !time) return null;

  const pickup = new Date(`${date}T${time}`); // in the visitor's own time zone
  if (Number.isNaN(pickup.getTime())) {
    errors.date = "Choose a pickup date.";
    return null;
  }

  const day = DAYS[pickup.getDay()];
  const hours = hoursOn(pickup);
  const minutes = pickup.getHours() * 60 + pickup.getMinutes();
  const hoursAhead = (pickup - now) / (60 * 60 * 1000);

  if (!hours) {
    errors.date = `We're closed on ${day}s. Choose another day.`;
  } else if (minutes < toMinutes(hours.open) || minutes > toMinutes(hours.close)) {
    errors.time = `On ${day}s you can pick up between ${formatTime(hours.open)} and ${formatTime(hours.close)}.`;
  } else if (hoursAhead < LIMITS.minHoursAhead) {
    errors.time = `Choose a time at least ${LIMITS.minHoursAhead} ${LIMITS.minHoursAhead === 1 ? "hour" : "hours"} from now.`;
  } else if (hoursAhead > LIMITS.maxDaysAhead * 24) {
    errors.date = `You can order up to ${LIMITS.maxDaysAhead} days ahead.`;
  }
  return pickup;
}
