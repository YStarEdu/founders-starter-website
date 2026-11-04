// The Order page: checks the form, applies the spam limits, saves the order and shows a confirmation.
import "../main.js";
import { MENU, formatPrice, formatTime } from "../bakery.js";
import { LIMITS, validateOrder } from "../validate.js";
import { saveOrder } from "../store.js";
import { isHoneypotFilled, rememberOrderTime, secondsUntilNextOrder } from "../spam.js";

const form = document.querySelector("#order-form");
const errorSummary = document.querySelector("#error-summary");
const formMessage = document.querySelector("#form-message");
const confirmation = document.querySelector("#confirmation");
const submitButton = form.querySelector('button[type="submit"]');

// The form fields, in the order they appear on the page.
const FIELDS = ["name", "email", "item", "quantity", "date", "time", "notes"];
const field = (name) => form.elements.namedItem(name);

fillItemChoices();
limitPickupDates();

form.addEventListener("submit", async (event) => {
  event.preventDefault(); // we handle sending ourselves, instead of the browser reloading the page
  clearErrors();

  // Spam limit 1 (Week 5): a bot filled in the hidden field. Pretend it worked, so it moves on.
  if (isHoneypotFilled(form)) {
    showConfirmation(null);
    return;
  }

  const values = Object.fromEntries(new FormData(form));
  const { errors, order } = validateOrder(values);
  if (Object.keys(errors).length > 0) {
    showErrors(errors);
    return;
  }

  // Spam limit 2 (Week 5): one order per 30 seconds from this browser.
  const wait = secondsUntilNextOrder();
  if (wait > 0) {
    showMessage(`Your last order just went through. Please wait ${wait} seconds before sending another one.`);
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Sending…";
  try {
    await saveOrder(order);
    rememberOrderTime();
    showConfirmation(order);
  } catch (error) {
    showMessage(error.message);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Place order";
  }
});

document.querySelector("#order-again").addEventListener("click", () => {
  form.reset();
  confirmation.hidden = true;
  form.hidden = false;
  field("name").focus();
});

// Adds one choice per menu item. Coming from the Menu page (order.html?item=Baguette) picks that item.
function fillItemChoices() {
  for (const entry of MENU) {
    field("item").append(new Option(`${entry.name} (${formatPrice(entry.price)})`, entry.name));
  }
  const wanted = new URLSearchParams(location.search).get("item");
  if (MENU.some((entry) => entry.name === wanted)) field("item").value = wanted;
}

// The date picker only offers today up to 30 days ahead.
function limitPickupDates() {
  const lastDay = new Date();
  lastDay.setDate(lastDay.getDate() + LIMITS.maxDaysAhead);
  field("date").min = toDateValue(new Date());
  field("date").max = toDateValue(lastDay);
}

function showErrors(errors) {
  const list = errorSummary.querySelector("ul");
  list.replaceChildren();
  for (const name of FIELDS) {
    if (!errors[name]) continue;
    const input = field(name);
    const errorText = document.querySelector(`#${name}-error`);
    errorText.textContent = errors[name];
    errorText.hidden = false;
    input.setAttribute("aria-invalid", "true");

    // Each problem in the summary links to its field.
    const link = document.createElement("a");
    link.href = `#${name}`;
    link.textContent = errors[name];
    link.addEventListener("click", (event) => {
      event.preventDefault();
      input.focus();
    });
    const item = document.createElement("li");
    item.append(link);
    list.append(item);
  }
  errorSummary.hidden = false;
  errorSummary.focus(); // screen readers read the summary, and it scrolls into view
}

function clearErrors() {
  errorSummary.hidden = true;
  formMessage.hidden = true;
  for (const name of FIELDS) {
    document.querySelector(`#${name}-error`).hidden = true;
    field(name).removeAttribute("aria-invalid");
  }
}

function showMessage(text) {
  formMessage.textContent = text;
  formMessage.hidden = false;
}

// `order` is null when the honeypot caught a bot: the bot sees "thanks", and nothing is saved.
function showConfirmation(order) {
  const heading = document.querySelector("#confirmation-heading");
  const details = document.querySelector("#confirmation-details");
  details.replaceChildren();
  heading.textContent = order ? `Thanks, ${order.name}! Your order is in.` : "Thanks! Your order is in.";

  if (order) {
    const pickup = new Date(order.pickup_at);
    const day = pickup.toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" });
    const time = formatTime(`${pickup.getHours()}:${pickup.getMinutes()}`);
    const price = MENU.find((entry) => entry.name === order.item).price;
    addDetail(details, "Order", `${order.quantity} × ${order.item}`);
    addDetail(details, "Pickup", `${day} at ${time}`);
    addDetail(details, "Pay at pickup", formatPrice(price * order.quantity));
    addDetail(details, "Questions go to", order.email);
  }

  form.hidden = true;
  confirmation.hidden = false;
  confirmation.focus();
}

function addDetail(list, label, value) {
  const term = document.createElement("dt");
  term.textContent = label;
  const description = document.createElement("dd");
  description.textContent = value;
  list.append(term, description);
}

// A date as the "YYYY-MM-DD" text that date inputs use.
function toDateValue(date) {
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
