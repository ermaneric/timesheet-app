import { requireEmployeePage } from "@/lib/auth";
import { ManualEntryClient } from "@/app/entry/new/ManualEntryClient";

export const dynamic = "force-dynamic";

export default async function SubmitPage() {
  const me = await requireEmployeePage();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Submit a timesheet</h1>
      <ol className="muted list-decimal space-y-1 pl-5 text-sm">
        <li>Take a photo of your paper sheet (or pick your spreadsheet) and tap <b>Fill in table from this file</b>, or type your rows in.</li>
        <li>Check every row against your sheet and fix anything that&apos;s wrong.</li>
        <li>Tap <b>Send to office</b>.</li>
      </ol>
      <ManualEntryClient employeeNames={[]} defaultEmployee={me.employeeName} lockedEmployee />
    </div>
  );
}
