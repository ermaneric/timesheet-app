import * as XLSX from "xlsx";
import { emptyEntry, type EntryInput, type SourceType, type TimesheetDraft } from "../fields";
import { cellText, finalizeEntries, matchHeader, parseDateCell, parseNumber } from "./normalize";
import { parseLooseDate } from "../dates";

type Row = unknown[];

export type SpreadsheetOptions = {
  fileName?: string | null;
  /** Year used for dates written without one (e.g. "9/21"). Defaults to this year. */
  referenceYear?: number;
};

/**
 * Parse an Excel/CSV timesheet. Understands the company layout
 * ("Name: …" and "Week of …" above a header row that starts with "Date",
 * data rows until "TOTAL") as well as flat CSVs with an Employee column.
 * Each sheet (and each employee in a flat file) becomes its own draft.
 */
export function parseSpreadsheet(data: ArrayBuffer | Buffer, opts: SpreadsheetOptions = {}): TimesheetDraft[] {
  const fileName = opts.fileName ?? null;
  const isCsv = !!fileName && /\.(csv|tsv|txt)$/i.test(fileName);
  const sourceType: SourceType = isCsv ? "csv" : "xlsx";
  const wb = XLSX.read(data, { type: "buffer", raw: isCsv, cellDates: false });
  const referenceYear = opts.referenceYear ?? new Date().getFullYear();

  const drafts: TimesheetDraft[] = [];
  for (const sheetName of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<Row>(wb.Sheets[sheetName], {
      header: 1,
      raw: true,
      defval: null,
      blankrows: true,
    });
    drafts.push(...parseRows(rows, { referenceYear, sourceType, fileName, sheetName }));
  }
  return drafts;
}

function parseRows(
  rows: Row[],
  ctx: { referenceYear: number; sourceType: SourceType; fileName: string | null; sheetName: string },
): TimesheetDraft[] {
  const headerIdx = rows.findIndex((r) => {
    const keys = (r ?? []).map((c) => matchHeader(c));
    return keys.includes("date") && keys.filter(Boolean).length >= 3;
  });
  if (headerIdx < 0) return [];

  const header = rows[headerIdx];
  const columns = header.map((h) => matchHeader(h));
  const { employeeName, weekOf } = readPreamble(rows.slice(0, headerIdx), ctx.referenceYear);
  const refYear = weekOf ? Number(weekOf.slice(0, 4)) : ctx.referenceYear;

  const byEmployee = new Map<string, EntryInput[]>();
  for (const row of rows.slice(headerIdx + 1)) {
    if (!row || row.every((c) => cellText(c) === "")) continue;
    const first = cellText(row[firstFilled(row)]).toUpperCase();
    if (first.startsWith("TOTAL")) break;

    const entry = emptyEntry();
    let rowEmployee = employeeName;
    columns.forEach((key, i) => {
      if (!key) return;
      const v = row[i];
      switch (key) {
        case "date":
          entry.date = parseDateCell(v, refYear, weekOf ?? undefined) ?? cellText(v);
          break;
        case "employeeName":
          rowEmployee = cellText(v) || rowEmployee;
          break;
        case "jobNumber":
        case "notes":
          entry[key] = cellText(v);
          break;
        default:
          entry[key] = parseNumber(v);
      }
    });
    const list = byEmployee.get(rowEmployee) ?? [];
    list.push(entry);
    byEmployee.set(rowEmployee, list);
  }

  return [...byEmployee.entries()].map(([name, entries]) => {
    const { entries: kept, weekStart, warnings } = finalizeEntries(entries, weekOf);
    if (!name) warnings.unshift("No employee name found on the sheet — please choose the employee.");
    return {
      employeeName: name,
      weekStart,
      sourceType: ctx.sourceType,
      sourceFileName: ctx.fileName,
      entries: kept,
      warnings,
    };
  });
}

function firstFilled(row: Row | undefined): number {
  if (!row) return 0;
  const i = row.findIndex((c) => cellText(c) !== "");
  return i < 0 ? 0 : i;
}

/** Find "Name: X" and "Week of X" in the rows above the header. */
function readPreamble(rows: Row[], referenceYear: number): { employeeName: string; weekOf: string | null } {
  let employeeName = "";
  let weekOf: string | null = null;
  for (const row of rows) {
    if (!row) continue;
    row.forEach((cell, i) => {
      const text = cellText(cell);
      const name = text.match(/^(?:employee\s*)?name\s*:?\s*(.*)$/i);
      if (name && !employeeName) {
        employeeName = name[1].trim() || nextText(row, i);
      }
      const week = text.match(/^week\s*of\s*:?\s*(.*)$/i);
      if (week && !weekOf) {
        const candidates = [week[1].trim(), ...row.slice(i + 1)];
        for (const c of candidates) {
          const d =
            typeof c === "number"
              ? parseDateCell(c, referenceYear)
              : parseLooseDate(cellText(c).replace(/\(.*\)/, "").trim(), referenceYear);
          if (d) {
            weekOf = d;
            break;
          }
        }
      }
    });
  }
  return { employeeName, weekOf };
}

function nextText(row: Row, i: number): string {
  for (const c of row.slice(i + 1)) {
    const t = cellText(c);
    if (t) return t;
  }
  return "";
}
