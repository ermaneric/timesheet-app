"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createTimesheet,
  deleteEmployee,
  deleteTimesheet,
  findEmployeeByName,
  findExistingSheets,
  findOrCreateEmployee,
  getTimesheet,
  renameEmployee,
  setEmployeePinHash,
  setTimesheetStatus,
  updateTimesheet,
} from "@/lib/db";
import { isBlankEntry } from "@/lib/fields";
import { isIsoDate, weekStartFor } from "@/lib/dates";
import {
  assertAdmin,
  assertSignedIn,
  clientIp,
  endSession,
  getSession,
  loginLimits,
  NotAuthorizedError,
  startSession,
} from "@/lib/auth";
import { hashPin, isValidPin, passwordMatches, verifyPin } from "@/lib/session";

const num = z.number().finite().nullable();
const EntrySchema = z.object({
  date: z.string(),
  jobNumber: z.string().max(200),
  hoursBilled: num,
  travelTime: num,
  extendedTravel: num,
  truckStock: num,
  tip: num,
  reviewBonus: num,
  receiptCount: num,
  notes: z.string().max(2000),
});

const DraftSchema = z.object({
  employeeName: z.string().max(200),
  weekStart: z.string(),
  sourceType: z.enum(["xlsx", "csv", "pdf", "photo", "manual"]),
  sourceFileName: z.string().max(300).nullable(),
  entries: z.array(EntrySchema).max(200),
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
  if (!draft.entries.length) return { ok: false, error: "Add at least one row before saving." };
  const badRow = draft.entries.findIndex((e) => !isIsoDate(e.date));
  if (badRow >= 0) return { ok: false, error: `Row ${badRow + 1} needs a date.` };
  return { ok: true, draft };
}

async function guarded<T>(fn: () => Promise<T>): Promise<T | { ok: false; error: string }> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof NotAuthorizedError) return { ok: false, error: err.message };
    throw err;
  }
}

/**
 * Office: saves as reviewed under any name. Employee: always saved under their
 * own name (whatever name was sent) and marked as submitted for the office to check.
 */
export async function saveTimesheetAction(raw: unknown): Promise<SaveResult> {
  return guarded(async () => {
    const session = await assertSignedIn();
    const v = validate(
      session.role === "employee" ? { ...(raw as object), employeeName: session.employeeName } : raw,
    );
    if (!v.ok) return v;
    const sheet = createTimesheet({ ...v.draft, status: session.role === "employee" ? "submitted" : "reviewed" });
    revalidatePath("/", "layout");
    return { ok: true as const, timesheetId: sheet.id, employeeId: sheet.employeeId };
  });
}

/** Office can edit any sheet; employees only their own sheets that the office hasn't reviewed yet. */
export async function updateTimesheetAction(id: number, raw: unknown): Promise<SaveResult> {
  return guarded(async () => {
    const session = await assertSignedIn();
    const existing = getTimesheet(id);
    if (!existing) return { ok: false as const, error: "That timesheet no longer exists." };
    if (session.role === "employee") {
      if (existing.employeeId !== session.employeeId) throw new NotAuthorizedError();
      if (existing.status !== "submitted") {
        return { ok: false as const, error: "The office has already reviewed this timesheet. Ask them to make changes." };
      }
    }
    const v = validate(
      session.role === "employee" ? { ...(raw as object), employeeName: session.employeeName } : raw,
    );
    if (!v.ok) return v;
    const sheet = updateTimesheet(id, v.draft);
    revalidatePath("/", "layout");
    return { ok: true as const, timesheetId: sheet.id, employeeId: sheet.employeeId };
  });
}

/** How many sheets are already saved for this employee + week (duplicate-upload warning). */
export async function existingSheetCountAction(employeeName: string, weekStart: string): Promise<number> {
  const session = await getSession();
  if (!session) return 0;
  const name = session.role === "employee" ? session.employeeName : employeeName;
  if (!name.trim() || !isIsoDate(weekStart)) return 0;
  return findExistingSheets(name, weekStartFor(weekStart)).length;
}

// ---- Office-only actions (forms) ----

export async function deleteTimesheetAction(formData: FormData): Promise<void> {
  await assertAdmin();
  deleteTimesheet(Number(formData.get("id")));
  revalidatePath("/", "layout");
  redirect(safeBack(formData.get("back")));
}

export async function markReviewedAction(formData: FormData): Promise<void> {
  await assertAdmin();
  setTimesheetStatus(Number(formData.get("id")), "reviewed");
  revalidatePath("/", "layout");
}

export async function renameEmployeeAction(formData: FormData): Promise<void> {
  await assertAdmin();
  renameEmployee(Number(formData.get("id")), String(formData.get("name") ?? ""));
  revalidatePath("/", "layout");
}

export async function deleteEmployeeAction(formData: FormData): Promise<void> {
  await assertAdmin();
  deleteEmployee(Number(formData.get("id")));
  revalidatePath("/", "layout");
  redirect("/");
}

export type FormState = { error?: string; message?: string };

export async function setPinAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await assertAdmin();
  const id = Number(formData.get("id"));
  const pin = String(formData.get("pin") ?? "").trim();
  if (formData.get("remove")) {
    setEmployeePinHash(id, null);
    revalidatePath("/", "layout");
    return { message: "PIN removed — this employee can no longer log in." };
  }
  if (!isValidPin(pin)) return { error: "PIN must be 4 to 6 digits." };
  setEmployeePinHash(id, hashPin(pin));
  revalidatePath("/", "layout");
  return { message: "PIN saved. Give it to the employee along with the app link." };
}

export async function addEmployeeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await assertAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const pin = String(formData.get("pin") ?? "").trim();
  if (!name) return { error: "Enter the employee's name." };
  if (pin && !isValidPin(pin)) return { error: "PIN must be 4 to 6 digits." };
  if (findEmployeeByName(name)) return { error: `${name} is already on the list.` };
  const employee = findOrCreateEmployee(name);
  if (pin) setEmployeePinHash(employee.id, hashPin(pin));
  revalidatePath("/", "layout");
  return { message: `Added ${employee.name}${pin ? " with a PIN" : " (set a PIN on their page so they can log in)"}.` };
}

// ---- Login / logout ----

const LOCKED = "Too many attempts. Please wait 15 minutes and try again.";

export async function employeeLoginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  const pin = String(formData.get("pin") ?? "").trim();
  if (!name || !pin) return { error: "Enter your name and PIN." };
  const ipKey = `${await clientIp()}|${name.toLowerCase()}`;
  const nameKey = name.toLowerCase();
  if (loginLimits.perIp.isLocked(ipKey) || loginLimits.perName.isLocked(nameKey)) return { error: LOCKED };

  const employee = findEmployeeByName(name);
  if (!employee || !verifyPin(pin, employee.pinHash)) {
    loginLimits.perIp.fail(ipKey);
    loginLimits.perName.fail(nameKey);
    return { error: "That name and PIN don't match. Check with the office if you need a PIN." };
  }
  loginLimits.perIp.clear(ipKey);
  loginLimits.perName.clear(nameKey);
  await startSession({ role: "employee", employeeId: employee.id });
  redirect("/me");
}

export async function adminLoginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  const key = `${await clientIp()}|admin`;
  if (loginLimits.perIp.isLocked(key) || loginLimits.perName.isLocked("admin")) return { error: LOCKED };
  if (!process.env.ADMIN_PASSWORD) return { error: "The office password hasn't been set up. Add ADMIN_PASSWORD to the .env file." };
  if (!passwordMatches(password, process.env.ADMIN_PASSWORD)) {
    loginLimits.perIp.fail(key);
    loginLimits.perName.fail("admin");
    return { error: "Wrong password." };
  }
  loginLimits.perIp.clear(key);
  loginLimits.perName.clear("admin");
  await startSession({ role: "admin" });
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/login");
}

/** Only allow redirects back to our own pages. */
function safeBack(v: FormDataEntryValue | null): string {
  const s = String(v ?? "/");
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
}
