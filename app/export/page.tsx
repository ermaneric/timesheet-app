import { requireAdminPage } from "@/lib/auth";
import { listTimesheets, listWeeks } from "@/lib/db";
import { formatWeek, isIsoDate, todayIso, weekStartFor } from "@/lib/dates";
import { computeTotals } from "@/lib/totals";
import { TimesheetTable } from "@/components/TimesheetTable";

export const dynamic = "force-dynamic";

export default async function ExportPage({ searchParams }: { searchParams: Promise<{ week?: string; employees?: string | string[] }> }) {
  await requireAdminPage();
  const sp = await searchParams;
  const weeks = listWeeks();
  const week = sp.week && isIsoDate(sp.week) ? weekStartFor(sp.week) : (weeks[0] ?? weekStartFor(todayIso()));
  const all = listTimesheets({ weekStart: week });

  const employees = new Map<number, string>();
  for (const s of all) employees.set(s.employeeId, s.employeeName);
  // `employees` is absent on first visit (select everyone), else the checked ids.
  const picked = sp.employees === undefined ? null : [sp.employees].flat().flatMap((v) => v.split(",")).map(Number);
  const selected = new Set(picked ?? employees.keys());
  const sheets = all.filter((s) => selected.has(s.employeeId));
  const unreviewed = sheets.filter((s) => s.status === "submitted");

  const byEmployee = new Map<number, typeof sheets>();
  for (const s of sheets) byEmployee.set(s.employeeId, [...(byEmployee.get(s.employeeId) ?? []), s]);
  const ids = [...selected].filter((id) => employees.has(id)).join(",");
  const link = (type: string) => `/api/export?week=${week}&type=${type}&employees=${ids}`;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Export for Jobber</h1>
      <form className="card flex flex-wrap items-end gap-4 p-4" method="get">
        <label className="block">
          <span className="text-sm font-semibold">Week</span>
          <select name="week" defaultValue={week} className="input mt-1">
            {!weeks.includes(week) && <option value={week}>{formatWeek(week)} (no timesheets)</option>}
            {weeks.map((w) => (
              <option key={w} value={w}>
                {formatWeek(w)}
              </option>
            ))}
          </select>
        </label>
        <button className="btn">Show week</button>
      </form>

      {employees.size === 0 ? (
        <p className="muted">No timesheets saved for {formatWeek(week)}.</p>
      ) : (
        <>
          <form className="card space-y-3 p-4" method="get">
            <input type="hidden" name="week" value={week} />
            <input type="hidden" name="employees" value="" />
            <p className="text-sm font-semibold">Employees to include</p>
            <div className="flex flex-wrap gap-4">
              {[...employees.entries()].map(([id, name]) => (
                <label key={id} className="flex items-center gap-2">
                  <input type="checkbox" name="employees" value={id} defaultChecked={selected.has(id)} />
                  {name}
                </label>
              ))}
            </div>
            <button className="btn">Update selection</button>
            <p className="muted text-xs">Tip: after changing checkboxes, press Update so the downloads match.</p>
          </form>

          {unreviewed.length > 0 && (
            <p className="warn p-3 text-sm">
              {unreviewed.length} timesheet(s) this week haven&apos;t been reviewed yet (
              {[...new Set(unreviewed.map((s) => s.employeeName))].join(", ")}). They&apos;re included in the export — review
              them first if you haven&apos;t checked them.
            </p>
          )}
          <div className="card flex flex-wrap items-center gap-3 p-4">
            <a className="btn btn-primary" href={link("detail")}>
              Download detail CSV
            </a>
            <a className="btn" href={link("summary")}>
              Download weekly totals CSV
            </a>
            <p className="muted text-sm">
              Detail = one row per job, grouped by employee (use this to enter hours in Jobber). Totals = one row per
              employee with total hours, bonus + tips and truck stock.
            </p>
          </div>

          {[...byEmployee.values()].map((empSheets) => {
            const entries = empSheets.flatMap((s) => s.entries).sort((a, b) => a.date.localeCompare(b.date));
            const t = computeTotals(entries);
            return (
              <section key={empSheets[0].employeeId} className="card space-y-2 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-lg font-bold">{empSheets[0].employeeName}</h2>
                  <p className="text-sm">
                    <b>{t.totalHours}</b> total hours · <b>{t.bonusAndTips}</b> bonus + tips · <b>{t.truckStock}</b> truck stock
                  </p>
                </div>
                <TimesheetTable entries={entries} />
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
