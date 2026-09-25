"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createTimesheet,
  deleteTimesheet,
  findExistingSheets,
  getTimesheet,
  updateTimesheet,
  deleteEmployee,
  renameEmployee,
} from "@/lib/db";
import { isBlankEntry } from "@/lib/fields";
import { isIsoDate, weekStartFor } from "@/lib/dates";

const num = z.number().finite().nullable();
const EntrySchema = z.object({
  date: z.string(),
  jobNumber: z.string(),
  hoursBilled: num,
  travelTime: num,
  extendedTravel: num,
  truckStock: num,
  tip: num,
  reviewBonus: num,
  receiptCount: num,
  notes: z.string(),
});

const DraftSchema = z.object({
  employeeName: z.string(),
  weekStart: z.string(),
  sourceType: z.enum(["xlsx", "csv", "pdf", "photo", "manual"]),
  sourceFileName: z.string().nullable(),
  entries: z.array(EntrySchema),
});

export type SaveResult = { ok: true; timesheetId: number; employeeId: number } | { ok: false; error: string };

function validate(raw: unknown): { ok: true; draft: z.infer<typeof DraftSchema> } | { ok: false; error: string } {
  const parsed = DraftSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Some values are invalid. Check the numbers and try again." };
  const draft = parsed.data;
  draft.employeeName = draft.employeeName.trim();
  if (!draft.employeeName) return { ok: false, error: "Choose or type the employee's name." };
  if (!isIsoDate(draft.weekStart)) return { ok: false, error: "Pick the week (Sunday–Saturday) this timesheet is for." };
  draft.weekStart = weekStartFor(draft.weekStart);
  draft.entries = draft.entries.filter((e) => !isBlankEntry(e));
  const badRow = draft.entries.findIndex((e) => !isIsoDate(e.date));
  if (badRow >= 0) return { ok: false, error: `Row ${badRow + 1} needs a date.` };
  return { ok: true, draft };
}

export async function saveTimesheetAction(raw: unknown): Promise<SaveResult> {
  const v = validate(raw);
  if (!v.ok) return v;
  const sheet = createTimesheet(v.draft);
  revalidatePath("/", "layout");
  return { ok: true, timesheetId: sheet.id, employeeId: sheet.employeeId };
}

export async function updateTimesheetAction(id: number, raw: unknown): Promise<SaveResult> {
  if (!getTimesheet(id)) return { ok: false, error: "That timesheet no longer exists." };
  const v = validate(raw);
  if (!v.ok) return v;
  const sheet = updateTimesheet(id, v.draft);
  revalidatePath("/", "layout");
  return { ok: true, timesheetId: sheet.id, employeeId: sheet.employeeId };
}

/** How many sheets are already saved for this employee + week (duplicate-upload warning). */
export async function existingSheetCountAction(employeeName: string, weekStart: string): Promise<number> {
  if (!employeeName.trim() || !isIsoDate(weekStart)) return 0;
  return findExistingSheets(employeeName, weekStartFor(weekStart)).length;
}

export async function deleteTimesheetAction(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  const back = String(formData.get("back") ?? "/");
  deleteTimesheet(id);
  revalidatePath("/", "layout");
  redirect(back);
}

export async function renameEmployeeAction(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  renameEmployee(id, String(formData.get("name") ?? ""));
  revalidatePath("/", "layout");
}

export async function deleteEmployeeAction(formData: FormData): Promise<void> {
  deleteEmployee(Number(formData.get("id")));
  revalidatePath("/", "layout");
  redirect("/");
}
