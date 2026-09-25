import Link from "next/link";
import { notFound } from "next/navigation";
import { getEmployee, listTimesheets, type Timesheet } from "@/lib/db";
import { formatWeek } from "@/lib/dates";
import { computeTotals } from "@/lib/totals";
import { TimesheetTable } from "@/components/TimesheetTable";
import { TotalsBlock } from "@/components/TotalsBlock";
import { deleteEmployeeAction, deleteTimesheetAction, renameEmployeeAction } from "@/app/actions";

export const dynamic = "force-dynamic";

const SOURCE_LABEL: Record<string, string> = {
  xlsx: "Excel upload",
  csv: "CSV upload",
  pdf: "PDF upload",
  photo: "Photo upload",
  manual: "Manual entry",
};

export default async function EmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const employee = getEmployee(Number(id));
  if (!employee) notFound();

  const sheets = listTimesheets({ employeeId: employee.id });
  const weeks = new Map<string, Timesheet[]>();
  for (const s of sheets) weeks.set(s.weekStart, [...(weeks.get(s.weekStart) ?? []), s]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/" className="muted text-sm hover:underline">
            ← All employees
          </Link>
          <h1 className="text-2xl font-bold">{employee.name}</h1>
        </div>
        <details className="text-sm">
          <summary className="cursor-pointer">Employee settings</summary>
          <div className="card mt-2 space-y-3 p-3">
            <form action={renameEmployeeAction} className="flex gap-2">
              <input type="hidden" name="id" value={employee.id} />
              <input name="name" defaultValue={employee.name} className="input" aria-label="Employee name" />
              <button className="btn">Rename</button>
            </form>
            <form action={deleteEmployeeAction}>
              <input type="hidden" name="id" value={employee.id} />
              <button className="btn btn-danger">Delete employee and all their timesheets</button>
            </form>
          </div>
        </details>
      </div>

      {weeks.size === 0 && <p className="muted">No timesheets saved for {employee.name} yet.</p>}

      {[...weeks.entries()].map(([week, weekSheets]) => {
        const all = weekSheets.flatMap((s) => s.entries);
        return (
          <section key={week} className="card space-y-4 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-bold">Week of {formatWeek(week)}</h2>
              <Link className="text-sm underline" href={`/export?week=${week}`}>
                Export this week
              </Link>
            </div>
            {weekSheets.map((s) => (
              <div key={s.id} className="space-y-2">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="muted">
                    {SOURCE_LABEL[s.sourceType] ?? s.sourceType}
                    {s.sourceFileName ? ` · ${s.sourceFileName}` : ""}
                  </span>
                  <Link className="underline" href={`/timesheets/${s.id}/edit`}>
                    Edit
                  </Link>
                  <form action={deleteTimesheetAction}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="back" value={`/employees/${employee.id}`} />
                    <button className="btn-danger underline">Delete</button>
                  </form>
                </div>
                <TimesheetTable entries={s.entries} />
              </div>
            ))}
            <div className="flex justify-end">
              <TotalsBlock totals={computeTotals(all)} />
            </div>
          </section>
        );
      })}
    </div>
  );
}
