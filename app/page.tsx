import { requireAdminPage } from "@/lib/auth";
import Link from "next/link";
import { listEmployees, listTimesheets } from "@/lib/db";
import { AddEmployeeForm } from "@/components/office/AddEmployeeForm";
import { formatWeek } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  await requireAdminPage();
  const employees = listEmployees();
  const submitted = listTimesheets({ status: "submitted" });
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Employees</h1>
        <div className="flex gap-2">
          <Link href="/upload" className="btn btn-primary">
            Upload timesheets
          </Link>
          <Link href="/entry/new" className="btn">
            Enter manually
          </Link>
        </div>
      </div>
      {submitted.length > 0 && (
        <section className="card space-y-2 p-4">
          <h2 className="text-lg font-bold">New from employees ({submitted.length})</h2>
          <p className="muted text-sm">Check each one against the original, then mark it reviewed.</p>
          <ul className="divide-y" style={{ borderColor: "var(--line)" }}>
            {submitted.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  <b>{s.employeeName}</b> · week of {formatWeek(s.weekStart)} · {s.entries.length} row(s)
                </span>
                <Link className="underline" href={`/employees/${s.employeeId}#sheet-${s.id}`}>
                  Review
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {employees.length === 0 ? (
        <div className="card p-6">
          <p className="font-semibold">No timesheets yet.</p>
          <p className="muted mt-1">
            Upload an Excel/CSV export, a PDF, or a photo of a timesheet — or type one in by hand. Employees are added
            automatically from the name on each sheet. To let employees send in their own sheets, add them below with a PIN.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {employees.map((e) => (
            <li key={e.id}>
              <Link href={`/employees/${e.id}`} className="card block p-4 hover:shadow">
                <p className="text-lg font-semibold">{e.name}</p>
                <p className="muted text-sm">
                  {e.weeks} week(s) · {e.entryCount} entries · {e.hasPin ? "can log in" : "no PIN"}
                </p>
                {e.latestWeek && <p className="muted text-sm">Latest: {formatWeek(e.latestWeek)}</p>}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <AddEmployeeForm />
    </div>
  );
}
