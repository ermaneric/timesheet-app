import { ENTRY_FIELDS, type EntryInput } from "../fields";
import { fromIso, isIsoDate } from "../dates";
import { computeTotals } from "../totals";

export type ExportSheet = {
  employeeName: string;
  weekStart: string;
  entries: EntryInput[];
};

function escape(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: unknown[][]): string {
  return rows.map((r) => r.map(escape).join(",")).join("\r\n") + "\r\n";
}

/** ISO → MM/DD/YYYY, which Jobber and spreadsheets read as a US date. */
export function usDate(iso: string): string {
  if (!isIsoDate(iso)) return iso;
  const d = fromIso(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCDate())}/${d.getUTCFullYear()}`;
}

const byEmployeeThenDate = (a: { employeeName: string }, b: { employeeName: string }) =>
  a.employeeName.localeCompare(b.employeeName, undefined, { sensitivity: "base" });

/**
 * One row per timesheet line, grouped by employee, columns in timesheet order.
 * This is the sheet to work from when entering hours into Jobber.
 */
export function detailCsv(sheets: ExportSheet[]): string {
  const header = ["Employee", "Week of", ...ENTRY_FIELDS.map((f) => f.label)];
  const rows: unknown[][] = [header];
  const lines = sheets
    .flatMap((s) => s.entries.map((e) => ({ employeeName: s.employeeName, weekStart: s.weekStart, e })))
    .sort((a, b) => byEmployeeThenDate(a, b) || a.e.date.localeCompare(b.e.date));
  for (const { employeeName, weekStart, e } of lines) {
    rows.push([
      employeeName,
      usDate(weekStart),
      ...ENTRY_FIELDS.map((f) => (f.key === "date" ? usDate(e.date) : e[f.key])),
    ]);
  }
  return toCsv(rows);
}

/** One row per employee per week with the totals block from the timesheet. */
export function summaryCsv(sheets: ExportSheet[]): string {
  const header = [
    "Employee",
    "Week of",
    "Hours billed",
    "Travel time",
    "Extended travel",
    "Total hours",
    "Tips",
    "Review bonus",
    "Bonus + Tips",
    "Truck Stock",
    "# of receipts",
  ];
  const groups = new Map<string, ExportSheet>();
  for (const s of sheets) {
    const key = `${s.employeeName.toLowerCase()}|${s.weekStart}`;
    const g = groups.get(key) ?? { employeeName: s.employeeName, weekStart: s.weekStart, entries: [] };
    g.entries = g.entries.concat(s.entries);
    groups.set(key, g);
  }
  const rows: unknown[][] = [header];
  for (const g of [...groups.values()].sort((a, b) => byEmployeeThenDate(a, b) || a.weekStart.localeCompare(b.weekStart))) {
    const t = computeTotals(g.entries);
    rows.push([
      g.employeeName,
      usDate(g.weekStart),
      t.columns.hoursBilled,
      t.columns.travelTime,
      t.columns.extendedTravel,
      t.totalHours,
      t.columns.tip,
      t.columns.reviewBonus,
      t.bonusAndTips,
      t.truckStock,
      t.columns.receiptCount,
    ]);
  }
  return toCsv(rows);
}
