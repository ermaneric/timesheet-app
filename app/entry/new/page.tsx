import { requireAdminPage } from "@/lib/auth";
import { listEmployees } from "@/lib/db";
import { ManualEntryClient } from "./ManualEntryClient";

export const dynamic = "force-dynamic";

export default async function ManualEntryPage({ searchParams }: { searchParams: Promise<{ employee?: string }> }) {
  await requireAdminPage();
  const { employee } = await searchParams;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Manual entry</h1>
      <p className="muted">
        Type in a timesheet by hand — for example from a handwritten sheet. Attach a photo to see it next to the table
        while you type, or let the app fill in the table from the photo for you to check.
      </p>
      <ManualEntryClient employeeNames={listEmployees().map((e) => e.name)} defaultEmployee={employee ?? ""} />
    </div>
  );
}
