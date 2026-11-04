// The Menu page: builds the list of items from MENU in src/bakery.js.
import "../main.js";
import { MENU, formatPrice } from "../bakery.js";

const container = document.querySelector("#menu");
const categories = [...new Set(MENU.map((entry) => entry.category))];

for (const category of categories) {
  const section = element("section", "menu-section");
  const list = element("ul", "menu-list");
  section.append(element("h2", "", category), list);

  for (const entry of MENU.filter((item) => item.category === category)) {
    const item = element("li", "menu-item");
    const order = element("a", "menu-item-order", "Order ");
    order.href = `/order.html?item=${encodeURIComponent(entry.name)}`;
    order.append(element("span", "visually-hidden", entry.name)); // so screen readers hear "Order Baguette"
    item.append(element("h3", "", entry.name), element("p", "price", formatPrice(entry.price)), element("p", "menu-item-description", entry.description), order);
    list.append(item);
  }
  container.append(section);
}

// Makes an element with a class and some text. textContent (not innerHTML) keeps text as plain text.
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}
