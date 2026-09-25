import Link from "next/link";
import { notFound } from "next/navigation";
import { requireEmployeePage } from "@/lib/auth";
import { getTimesheet } from "@/lib/db";
import { DraftEditor } from "@/components/DraftEditor";

export const dynamic = "force-dynamic";

export default async function EditMySheetPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireEmployeePage();
  const { id } = await params;
  const sheet = getTimesheet(Number(id));
  if (!sheet || sheet.employeeId !== me.employeeId) notFound();
  return (
    <div className="space-y-4">
      <Link href="/me" className="muted text-sm hover:underline">
        ← My timesheets
      </Link>
      <h1 className="text-2xl font-bold">Edit timesheet</h1>
      {sheet.status !== "submitted" ? (
        <p className="card p-4">The office has already reviewed this timesheet. Ask them if something needs changing.</p>
      ) : (
        <DraftEditor
          timesheetId={sheet.id}
          employeeNames={[]}
          lockedEmployee
          initial={{
            employeeName: sheet.employeeName,
            weekStart: sheet.weekStart,
            sourceType: sheet.sourceType,
            sourceFileName: sheet.sourceFileName,
            entries: sheet.entries.map(({ id: _id, ...e }) => e),
            warnings: [],
          }}
        />
      )}
    </div>
  );
}
