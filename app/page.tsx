import Link from "next/link";
import { listEmployees } from "@/lib/db";
import { formatWeek } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default function EmployeesPage() {
  const employees = listEmployees();
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
      {employees.length === 0 ? (
        <div className="card p-6">
          <p className="font-semibold">No timesheets yet.</p>
          <p className="muted mt-1">
            Upload an Excel/CSV export, a PDF, or a photo of a timesheet — or type one in by hand. Employees are added
            automatically from the name on each sheet.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {employees.map((e) => (
            <li key={e.id}>
              <Link href={`/employees/${e.id}`} className="card block p-4 hover:shadow">
                <p className="text-lg font-semibold">{e.name}</p>
                <p className="muted text-sm">
                  {e.weeks} week(s) · {e.entryCount} entries
                </p>
                {e.latestWeek && <p className="muted text-sm">Latest: {formatWeek(e.latestWeek)}</p>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
