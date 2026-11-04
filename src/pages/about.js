// The About page: fills in the opening hours from HOURS in src/bakery.js.
import "../main.js";
import { HOURS, formatTime } from "../bakery.js";

const tableBody = document.querySelector("#hours-table tbody");

for (const [day, hours] of Object.entries(HOURS)) {
  const row = document.createElement("tr");
  const dayCell = document.createElement("th");
  dayCell.scope = "row";
  dayCell.textContent = day;
  const timeCell = document.createElement("td");
  timeCell.textContent = hours ? `${formatTime(hours.open)} to ${formatTime(hours.close)}` : "Closed";
  row.append(dayCell, timeCell);
  tableBody.append(row);
}
