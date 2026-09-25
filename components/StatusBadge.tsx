import type { TimesheetStatus } from "@/lib/db";

export function StatusBadge({ status }: { status: TimesheetStatus }) {
  return status === "submitted" ? (
    <span className="warn rounded-full px-2 py-0.5 text-xs font-semibold">Waiting for office review</span>
  ) : (
    <span className="total-cell rounded-full px-2 py-0.5 text-xs font-semibold">Reviewed</span>
  );
}
