// The bakery's menu and opening hours. Change these to make the site yours:
// the Menu page, the order form and the pickup-time check all read from this file.

// Prices are in Canadian dollars. `name` is what gets saved with each order (60 characters at most).
export const MENU = [
  { category: "Bread", name: "Sourdough loaf", price: 9, description: "Crackly crust, chewy inside. Baked every morning." },
  { category: "Bread", name: "Seeded rye", price: 8.5, description: "Dark rye with sunflower and flax seeds." },
  { category: "Bread", name: "Baguette", price: 4, description: "Thin, crisp and best on the day you buy it." },
  { category: "Pastries", name: "Butter croissant", price: 3.75, description: "Flaky, golden and made with real butter." },
  { category: "Pastries", name: "Cinnamon bun", price: 4.5, description: "Soft and sticky, with cream cheese icing." },
  { category: "Pastries", name: "Butter tart", price: 3.5, description: "The Canadian classic, with a runny centre." },
  { category: "Cookies", name: "Chocolate chip cookie", price: 2.5, description: "Crispy edges, soft middle." },
  { category: "Cookies", name: "Oatmeal raisin cookie", price: 2.5, description: "Chewy oats and plump raisins." },
];

// Opening hours, which are also the pickup hours. Use the 24-hour clock ("18:00" is 6 p.m.).
// Write null for a day you're closed.
export const HOURS = {
  Monday: null,
  Tuesday: { open: "07:30", close: "18:00" },
  Wednesday: { open: "07:30", close: "18:00" },
  Thursday: { open: "07:30", close: "18:00" },
  Friday: { open: "07:30", close: "19:00" },
  Saturday: { open: "08:00", close: "17:00" },
  Sunday: { open: "09:00", close: "14:00" },
};

// JavaScript numbers the days of the week from 0 (Sunday) to 6 (Saturday).
export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// The opening hours on a given date, or null if the bakery is closed that day.
export function hoursOn(date) {
  return HOURS[DAYS[date.getDay()]];
}

// "07:30" → 450 (minutes after midnight). Handy for comparing times.
export function toMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

// "07:30" → "7:30 a.m."
export function formatTime(time) {
  const [hours, minutes] = time.split(":").map(Number);
  const suffix = hours < 12 ? "a.m." : "p.m.";
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

// 3.5 → "$3.50"
export function formatPrice(price) {
  return `$${price.toFixed(2)}`;
}
