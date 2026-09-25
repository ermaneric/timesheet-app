import Link from "next/link";
import { notFound } from "next/navigation";
import { getTimesheet, listEmployees } from "@/lib/db";
import { DraftEditor } from "@/components/DraftEditor";

export const dynamic = "force-dynamic";

export default async function EditTimesheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sheet = getTimesheet(Number(id));
  if (!sheet) notFound();
  const names = listEmployees().map((e) => e.name);
  return (
    <div className="space-y-4">
      <Link href={`/employees/${sheet.employeeId}`} className="muted text-sm hover:underline">
        ← Back to {sheet.employeeName}
      </Link>
      <h1 className="text-2xl font-bold">Edit timesheet</h1>
      <DraftEditor
        timesheetId={sheet.id}
        employeeNames={names}
        initial={{
          employeeName: sheet.employeeName,
          weekStart: sheet.weekStart,
          sourceType: sheet.sourceType,
          sourceFileName: sheet.sourceFileName,
          entries: sheet.entries.map(({ id: _id, ...e }) => e),
          warnings: [],
        }}
      />
    </div>
  );
}
