import { NUMBER_FIELDS, type EntryInput, type NumberFieldKey } from "./fields";

export type ColumnTotals = Record<NumberFieldKey, number>;

export type TimesheetTotals = {
  columns: ColumnTotals;
  /** Hours billed + travel time + extended travel (the sheet's TOTAL HOURS). */
  totalHours: number;
  /** Tips + review bonuses (the sheet's BONUS + TIPS). */
  bonusAndTips: number;
  truckStock: number;
};

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computeTotals(entries: Pick<EntryInput, NumberFieldKey>[]): TimesheetTotals {
  const columns = Object.fromEntries(NUMBER_FIELDS.map((k) => [k, 0])) as ColumnTotals;
  for (const e of entries) {
    for (const k of NUMBER_FIELDS) columns[k] += e[k] ?? 0;
  }
  for (const k of NUMBER_FIELDS) columns[k] = round2(columns[k]);
  return {
    columns,
    totalHours: round2(columns.hoursBilled + columns.travelTime + columns.extendedTravel),
    bonusAndTips: round2(columns.tip + columns.reviewBonus),
    truckStock: columns.truckStock,
  };
}
