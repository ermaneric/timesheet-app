import { ENTRY_FIELDS, type EntryInput } from "@/lib/fields";
import { formatShortDate } from "@/lib/dates";
import { computeTotals } from "@/lib/totals";

/** Read-only timesheet table in the sheet's column order, with a TOTAL row. */
export function TimesheetTable({ entries }: { entries: EntryInput[] }) {
  const totals = computeTotals(entries);
  return (
    <div className="overflow-x-auto">
      <table className="sheet" style={{ minWidth: "56rem" }}>
        <thead>
          <tr>
            {ENTRY_FIELDS.map((f) => (
              <th key={f.key} className={f.type === "number" ? "num" : ""}>
                {f.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr key={i}>
              {ENTRY_FIELDS.map((f) => (
                <td key={f.key} className={f.type === "number" ? "num" : ""}>
                  {f.key === "date" ? formatShortDate(e.date) : (e[f.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
          <tr className="total">
            {ENTRY_FIELDS.map((f, idx) => (
              <td key={f.key} className={f.type === "number" ? "num" : ""}>
                {idx === 0 ? "TOTAL" : f.type === "number" ? totals.columns[f.key as keyof typeof totals.columns] : ""}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
