import type { TimesheetTotals } from "@/lib/totals";

/** The TOTAL HOURS / BONUS + TIPS / TRUCK STOCK block from the bottom of the sheet. */
export function TotalsBlock({ totals }: { totals: TimesheetTotals }) {
  const rows = [
    ["TOTAL HOURS", totals.totalHours],
    ["BONUS + TIPS", totals.bonusAndTips],
    ["TRUCK STOCK", totals.truckStock],
  ] as const;
  return (
    <table className="sheet" style={{ width: "auto" }}>
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label}>
            <td className="total-cell font-bold">{label}</td>
            <td className="total-cell num" style={{ minWidth: "5rem" }}>
              {value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
