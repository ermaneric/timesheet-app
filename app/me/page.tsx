import Link from "next/link";
import { requireEmployeePage } from "@/lib/auth";
import { listTimesheets } from "@/lib/db";
import { formatWeek } from "@/lib/dates";
import { computeTotals } from "@/lib/totals";
import { TimesheetTable } from "@/components/TimesheetTable";
import { TotalsBlock } from "@/components/TotalsBlock";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function MyTimesheetsPage() {
  const me = await requireEmployeePage();
  const sheets = listTimesheets({ employeeId: me.employeeId });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Hi, {me.employeeName.split(" ")[0]}</h1>
        <p className="muted">Send your weekly timesheet to the office by photo, file, or typing it in.</p>
      </div>
      <Link href="/me/submit" className="btn btn-primary w-full justify-center py-3 text-lg sm:w-auto">
        Submit this week&apos;s timesheet
      </Link>

      <h2 className="text-lg font-bold">My timesheets</h2>
      {sheets.length === 0 && <p className="muted">Nothing sent yet.</p>}
      {sheets.map((s) => (
        <section key={s.id} className="card space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-bold">Week of {formatWeek(s.weekStart)}</h3>
            <div className="flex items-center gap-3 text-sm">
              <StatusBadge status={s.status} />
              {s.status === "submitted" && (
                <Link className="underline" href={`/me/edit/${s.id}`}>
                  Edit
                </Link>
              )}
            </div>
          </div>
          <TimesheetTable entries={s.entries} />
          <div className="flex justify-end">
            <TotalsBlock totals={computeTotals(s.entries)} />
          </div>
        </section>
      ))}
    </div>
  );
}
