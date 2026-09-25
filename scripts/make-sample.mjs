// Builds tests/fixtures/sample-timesheet.xlsx, a copy of the company's
// Google Sheet layout filled in with the example week. Run: node scripts/make-sample.mjs
import * as XLSX from "xlsx";
import fs from "node:fs";

const serial = (y, m, d) => (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000;
const blank = Array(10).fill(null);
const rows = [
  ["Nathan's Handyman Service Time Sheet", null, null, null, null, "Name: Eric Erman", null, null, null, null],
  blank,
  ["Week of", null, null, "(Sunday - Saturday)", null, null, null, null, null, null],
  blank,
  ["Date", "Job # / Invoice #", "Hours billed", "Travel time", "Extended travel", "Truck Stock", "Tip", "RB", "# of receipts", "Time Sheet notes"],
  [serial(2025, 9, 21), 18245, 2, 0.5, null, null, null, null, null, null],
  [serial(2025, 9, 21), 18247, 1, 0.5, null, null, null, null, null, null],
  [serial(2025, 9, 23), 18251, 1, 0.5, null, null, null, null, null, null],
  [serial(2025, 9, 25), 18243, 1, 0.5, null, null, null, null, null, null],
  [serial(2025, 9, 25), 18244, 1, 0.5, null, null, null, null, null, null],
  blank, blank, blank, blank, blank,
  ["TOTAL", null, 6, 2.5, 0, 0, 0, 0, 0, null],
  ["TOTAL HOURS", 8.5, ...Array(8).fill(null)],
  ["BONUS + TIPS", 0, ...Array(8).fill(null)],
  ["TRUCK STOCK", null, ...Array(8).fill(null)],
];
const ws = XLSX.utils.aoa_to_sheet(rows);
for (let r = 5; r <= 9; r++) {
  const cell = ws[XLSX.utils.encode_cell({ r, c: 0 })];
  cell.t = "n";
  cell.z = "m/d";
}
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
fs.mkdirSync("tests/fixtures", { recursive: true });
fs.writeFileSync("tests/fixtures/sample-timesheet.xlsx", XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log("wrote tests/fixtures/sample-timesheet.xlsx");
