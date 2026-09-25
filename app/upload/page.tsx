import { listEmployees } from "@/lib/db";
import { UploadClient } from "./UploadClient";

export const dynamic = "force-dynamic";

export default function UploadPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Upload timesheets</h1>
      <p className="muted">
        Excel (.xlsx) or CSV exports, PDFs, and photos of paper timesheets. Each sheet is read into an editable table —
        check it against the original, fix anything, then confirm to save it under the employee.
      </p>
      <UploadClient employeeNames={listEmployees().map((e) => e.name)} />
    </div>
  );
}
