import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { ENTRY_FIELDS, NUMBER_FIELDS, type EntryInput, type SourceType, type TimesheetDraft } from "./fields";

/**
 * SQLite storage using Node's built-in `node:sqlite` (no native build step).
 * The database file lives at DATABASE_PATH (default ./data/timesheets.db).
 */

const SCHEMA = `
CREATE TABLE IF NOT EXISTS employees (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE
);
CREATE TABLE IF NOT EXISTS timesheets (
  id INTEGER PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  week_start TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_file_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS timesheets_employee_week ON timesheets(employee_id, week_start);
CREATE TABLE IF NOT EXISTS entries (
  id INTEGER PRIMARY KEY,
  timesheet_id INTEGER NOT NULL REFERENCES timesheets(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  date TEXT NOT NULL,
  job_number TEXT NOT NULL DEFAULT '',
  hours_billed REAL,
  travel_time REAL,
  extended_travel REAL,
  truck_stock REAL,
  tip REAL,
  review_bonus REAL,
  receipt_count REAL,
  notes TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS entries_timesheet ON entries(timesheet_id);
`;

/** camelCase field key → column name. */
const COLUMN: Record<(typeof ENTRY_FIELDS)[number]["key"], string> = {
  date: "date",
  jobNumber: "job_number",
  hoursBilled: "hours_billed",
  travelTime: "travel_time",
  extendedTravel: "extended_travel",
  truckStock: "truck_stock",
  tip: "tip",
  reviewBonus: "review_bonus",
  receiptCount: "receipt_count",
  notes: "notes",
};

const globalForDb = globalThis as unknown as { timesheetDb?: DatabaseSync };

export function getDb(): DatabaseSync {
  if (!globalForDb.timesheetDb) {
    const file = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "timesheets.db");
    if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
    const db = new DatabaseSync(file);
    db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
    db.exec(SCHEMA);
    globalForDb.timesheetDb = db;
  }
  return globalForDb.timesheetDb;
}

/** For tests: swap in a fresh database. */
export function resetDbForTests(file = ":memory:"): void {
  globalForDb.timesheetDb?.close();
  globalForDb.timesheetDb = undefined;
  process.env.DATABASE_PATH = file;
}

export type Employee = { id: number; name: string };

export type EmployeeSummary = Employee & {
  weeks: number;
  latestWeek: string | null;
  entryCount: number;
};

export type SavedEntry = EntryInput & { id: number };

export type Timesheet = {
  id: number;
  employeeId: number;
  employeeName: string;
  weekStart: string;
  sourceType: SourceType;
  sourceFileName: string | null;
  createdAt: string;
  entries: SavedEntry[];
};

function transaction<T>(fn: () => T): T {
  const db = getDb();
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export function listEmployees(): EmployeeSummary[] {
  const rows = getDb()
    .prepare(
      `SELECT e.id, e.name,
              COUNT(DISTINCT t.week_start) AS weeks,
              MAX(t.week_start) AS latestWeek,
              (SELECT COUNT(*) FROM entries en JOIN timesheets t2 ON t2.id = en.timesheet_id
                WHERE t2.employee_id = e.id) AS entryCount
         FROM employees e LEFT JOIN timesheets t ON t.employee_id = e.id
        GROUP BY e.id ORDER BY e.name COLLATE NOCASE`,
    )
    .all() as unknown as EmployeeSummary[];
  return rows.map((r) => ({ ...r, weeks: Number(r.weeks), entryCount: Number(r.entryCount) }));
}

export function getEmployee(id: number): Employee | null {
  const row = getDb().prepare("SELECT id, name FROM employees WHERE id = ?").get(id);
  return (row as Employee | undefined) ?? null;
}

export function findOrCreateEmployee(name: string): Employee {
  const clean = name.trim().replace(/\s+/g, " ");
  if (!clean) throw new Error("Employee name is required.");
  const db = getDb();
  db.prepare("INSERT INTO employees (name) VALUES (?) ON CONFLICT(name) DO NOTHING").run(clean);
  return db.prepare("SELECT id, name FROM employees WHERE name = ?").get(clean) as Employee;
}

export function renameEmployee(id: number, name: string): void {
  const clean = name.trim().replace(/\s+/g, " ");
  if (!clean) throw new Error("Employee name is required.");
  getDb().prepare("UPDATE employees SET name = ? WHERE id = ?").run(clean, id);
}

export function deleteEmployee(id: number): void {
  getDb().prepare("DELETE FROM employees WHERE id = ?").run(id);
}

function loadEntries(timesheetIds: number[]): Map<number, SavedEntry[]> {
  const map = new Map<number, SavedEntry[]>();
  if (!timesheetIds.length) return map;
  const cols = ENTRY_FIELDS.map((f) => `${COLUMN[f.key]} AS ${f.key}`).join(", ");
  const rows = getDb()
    .prepare(
      `SELECT id, timesheet_id AS timesheetId, ${cols} FROM entries
        WHERE timesheet_id IN (${timesheetIds.map(() => "?").join(",")})
        ORDER BY date, position`,
    )
    .all(...timesheetIds) as unknown as (SavedEntry & { timesheetId: number })[];
  for (const { timesheetId, ...entry } of rows) {
    const list = map.get(timesheetId) ?? [];
    list.push(entry);
    map.set(timesheetId, list);
  }
  return map;
}

type TimesheetFilter = { employeeId?: number; weekStart?: string; id?: number; employeeIds?: number[] };

export function listTimesheets(filter: TimesheetFilter = {}): Timesheet[] {
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (filter.id !== undefined) {
    where.push("t.id = ?");
    params.push(filter.id);
  }
  if (filter.employeeId !== undefined) {
    where.push("t.employee_id = ?");
    params.push(filter.employeeId);
  }
  if (filter.weekStart) {
    where.push("t.week_start = ?");
    params.push(filter.weekStart);
  }
  if (filter.employeeIds?.length) {
    where.push(`t.employee_id IN (${filter.employeeIds.map(() => "?").join(",")})`);
    params.push(...filter.employeeIds);
  }
  const sheets = getDb()
    .prepare(
      `SELECT t.id, t.employee_id AS employeeId, e.name AS employeeName, t.week_start AS weekStart,
              t.source_type AS sourceType, t.source_file_name AS sourceFileName, t.created_at AS createdAt
         FROM timesheets t JOIN employees e ON e.id = t.employee_id
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY t.week_start DESC, e.name COLLATE NOCASE, t.id`,
    )
    .all(...params) as unknown as Omit<Timesheet, "entries">[];
  const entries = loadEntries(sheets.map((s) => s.id));
  return sheets.map((s) => ({ ...s, entries: entries.get(s.id) ?? [] }));
}

export function getTimesheet(id: number): Timesheet | null {
  return listTimesheets({ id })[0] ?? null;
}

/** Distinct weeks that have data, newest first. */
export function listWeeks(): string[] {
  return (
    getDb().prepare("SELECT DISTINCT week_start AS w FROM timesheets ORDER BY w DESC").all() as { w: string }[]
  ).map((r) => r.w);
}

function insertEntries(timesheetId: number, entries: EntryInput[]): void {
  const keys = ENTRY_FIELDS.map((f) => f.key);
  const stmt = getDb().prepare(
    `INSERT INTO entries (timesheet_id, position, ${keys.map((k) => COLUMN[k]).join(", ")})
     VALUES (?, ?, ${keys.map(() => "?").join(", ")})`,
  );
  entries.forEach((e, i) => {
    stmt.run(timesheetId, i, ...keys.map((k) => e[k] ?? null));
  });
}

export type SaveTimesheetInput = Pick<TimesheetDraft, "employeeName" | "weekStart" | "sourceType" | "sourceFileName" | "entries">;

export function createTimesheet(input: SaveTimesheetInput): Timesheet {
  const id = transaction(() => {
    const employee = findOrCreateEmployee(input.employeeName);
    const result = getDb()
      .prepare(
        "INSERT INTO timesheets (employee_id, week_start, source_type, source_file_name) VALUES (?, ?, ?, ?)",
      )
      .run(employee.id, input.weekStart, input.sourceType, input.sourceFileName);
    const id = Number(result.lastInsertRowid);
    insertEntries(id, input.entries);
    return id;
  });
  return getTimesheet(id)!;
}

export function updateTimesheet(id: number, input: Pick<SaveTimesheetInput, "employeeName" | "weekStart" | "entries">): Timesheet {
  transaction(() => {
    const employee = findOrCreateEmployee(input.employeeName);
    getDb()
      .prepare("UPDATE timesheets SET employee_id = ?, week_start = ? WHERE id = ?")
      .run(employee.id, input.weekStart, id);
    getDb().prepare("DELETE FROM entries WHERE timesheet_id = ?").run(id);
    insertEntries(id, input.entries);
  });
  return getTimesheet(id)!;
}

export function deleteTimesheet(id: number): void {
  getDb().prepare("DELETE FROM timesheets WHERE id = ?").run(id);
}

/** Existing sheets for an employee/week — used to warn about duplicate uploads. */
export function findExistingSheets(employeeName: string, weekStart: string): Timesheet[] {
  const employee = getDb()
    .prepare("SELECT id FROM employees WHERE name = ?")
    .get(employeeName.trim().replace(/\s+/g, " ")) as { id: number } | undefined;
  if (!employee) return [];
  return listTimesheets({ employeeId: employee.id, weekStart });
}

export { NUMBER_FIELDS };
