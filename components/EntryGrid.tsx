"use client";

import { ENTRY_FIELDS, emptyEntry, type EntryInput, type EntryFieldKey } from "@/lib/fields";
import { computeTotals } from "@/lib/totals";
import { TotalsBlock } from "./TotalsBlock";
import { useIsNarrow } from "./useIsNarrow";

type Props = {
  entries: EntryInput[];
  onChange: (entries: EntryInput[]) => void;
  /** Used as the default date for the first new row. */
  weekStart?: string;
};

const WIDTH: Partial<Record<EntryFieldKey, string>> = {
  date: "9.5rem",
  jobNumber: "7.5rem",
  notes: "14rem",
};

/** Editable timesheet grid, columns in the same order as the paper sheet. */
export function EntryGrid({ entries, onChange, weekStart }: Props) {
  const totals = computeTotals(entries);
  const narrow = useIsNarrow();

  const update = (i: number, key: EntryFieldKey, raw: string) => {
    const next = entries.slice();
    const field = ENTRY_FIELDS.find((f) => f.key === key)!;
    let value: string | number | null = raw;
    if (field.type === "number") {
      value = raw.trim() === "" ? null : Number(raw);
      if (typeof value === "number" && !Number.isFinite(value)) value = null;
    }
    next[i] = { ...next[i], [key]: value };
    onChange(next);
  };

  const addRow = () => {
    const last = entries[entries.length - 1];
    onChange([...entries, emptyEntry(last?.date || weekStart || "")]);
  };

  const removeRow = (i: number) => onChange(entries.filter((_, j) => j !== i));

  const input = (e: EntryInput, i: number, f: (typeof ENTRY_FIELDS)[number]) => (
    <input
      className="input"
      aria-label={`${f.label} row ${i + 1}`}
      type={f.type === "date" ? "date" : f.type === "number" ? "number" : "text"}
      inputMode={f.type === "number" ? "decimal" : undefined}
      step={f.type === "number" ? "any" : undefined}
      style={f.type === "number" ? { textAlign: "right" } : undefined}
      value={e[f.key] ?? ""}
      onChange={(ev) => update(i, f.key, ev.target.value)}
    />
  );

  if (narrow) {
    // Phone layout: one card per row, fields stacked in the same order as the sheet.
    return (
      <div className="space-y-3">
        {entries.map((e, i) => (
          <div key={i} className="rounded-lg border p-3" style={{ borderColor: "var(--line)" }}>
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold">Row {i + 1}</span>
              <button type="button" className="btn-danger text-sm underline" onClick={() => removeRow(i)}>
                Remove
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {ENTRY_FIELDS.map((f) => (
                <label key={f.key} className={f.key === "notes" || f.key === "date" || f.key === "jobNumber" ? "col-span-2" : ""}>
                  <span className="muted text-xs font-semibold">{f.label}</span>
                  {input(e, i, f)}
                </label>
              ))}
            </div>
          </div>
        ))}
        <button type="button" className="btn w-full justify-center" onClick={addRow}>
          + Add row
        </button>
        <TotalsBlock totals={totals} />
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="sheet" style={{ minWidth: "72rem" }}>
          <thead>
            <tr>
              {ENTRY_FIELDS.map((f) => (
                <th key={f.key} className={f.type === "number" ? "num" : ""} style={{ width: WIDTH[f.key] ?? "6rem" }}>
                  {f.label}
                </th>
              ))}
              <th aria-label="Remove row" style={{ width: "2.5rem" }} />
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <tr key={i}>
                {ENTRY_FIELDS.map((f) => (
                  <td key={f.key} style={{ padding: "0.15rem" }}>
                    {input(e, i, f)}
                  </td>
                ))}
                <td style={{ textAlign: "center" }}>
                  <button type="button" className="btn-danger" title="Remove row" onClick={() => removeRow(i)}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={ENTRY_FIELDS.length + 1} className="muted" style={{ textAlign: "center", padding: "1rem" }}>
                  No rows yet — add one below.
                </td>
              </tr>
            )}
            <tr className="total">
              {ENTRY_FIELDS.map((f, idx) => (
                <td key={f.key} className={f.type === "number" ? "num" : ""}>
                  {idx === 0 ? "TOTAL" : f.type === "number" ? totals.columns[f.key as keyof typeof totals.columns] : ""}
                </td>
              ))}
              <td />
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <button type="button" className="btn" onClick={addRow}>
          + Add row
        </button>
        <TotalsBlock totals={totals} />
      </div>
    </div>
  );
}
