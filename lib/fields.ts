/**
 * Canonical timesheet columns, in the order they appear on the paper/Google
 * timesheet. Every table, form and CSV export is driven from this list so the
 * order stays consistent across the app.
 */
export const ENTRY_FIELDS = [
  { key: "date", label: "Date", type: "date" },
  { key: "jobNumber", label: "Job # / Invoice #", type: "text" },
  { key: "hoursBilled", label: "Hours billed", type: "number" },
  { key: "travelTime", label: "Travel time", type: "number" },
  { key: "extendedTravel", label: "Extended travel", type: "number" },
  { key: "truckStock", label: "Truck Stock", type: "number" },
  { key: "tip", label: "Tip", type: "number" },
  { key: "reviewBonus", label: "Review bonus (RB)", type: "number" },
  { key: "receiptCount", label: "# of receipts", type: "number" },
  { key: "notes", label: "Time Sheet notes", type: "text" },
] as const;

export type EntryFieldKey = (typeof ENTRY_FIELDS)[number]["key"];

export const NUMBER_FIELDS = [
  "hoursBilled",
  "travelTime",
  "extendedTravel",
  "truckStock",
  "tip",
  "reviewBonus",
  "receiptCount",
] as const;

export type NumberFieldKey = (typeof NUMBER_FIELDS)[number];

/** One row of a timesheet. Dates are ISO `YYYY-MM-DD`; blank numbers are null. */
export type EntryInput = {
  date: string;
  jobNumber: string;
  notes: string;
} & Record<NumberFieldKey, number | null>;

export type SourceType = "xlsx" | "csv" | "pdf" | "photo" | "manual";

/** A timesheet that has been read from a file (or typed in) but not saved yet. */
export type TimesheetDraft = {
  employeeName: string;
  /** Sunday that starts the Sunday–Saturday week, `YYYY-MM-DD`. */
  weekStart: string;
  sourceType: SourceType;
  sourceFileName: string | null;
  entries: EntryInput[];
  warnings: string[];
};

export function emptyEntry(date = ""): EntryInput {
  return {
    date,
    jobNumber: "",
    hoursBilled: null,
    travelTime: null,
    extendedTravel: null,
    truckStock: null,
    tip: null,
    reviewBonus: null,
    receiptCount: null,
    notes: "",
  };
}

/** True when a row has nothing filled in besides (possibly) the date. */
export function isBlankEntry(e: EntryInput): boolean {
  return (
    !e.jobNumber.trim() &&
    !e.notes.trim() &&
    NUMBER_FIELDS.every((k) => e[k] === null || e[k] === 0)
  );
}
