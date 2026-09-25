import { beforeEach, describe, expect, it } from "vitest";
import {
  createTimesheet,
  findExistingSheets,
  listEmployees,
  listTimesheets,
  resetDbForTests,
  updateTimesheet,
  deleteTimesheet,
} from "@/lib/db";
import { emptyEntry } from "@/lib/fields";

beforeEach(() => resetDbForTests());

const entry = (date: string, job: string, hours: number) => ({ ...emptyEntry(date), jobNumber: job, hoursBilled: hours });

describe("db", () => {
  it("saves timesheets under employees and groups by employee", () => {
    createTimesheet({
      employeeName: "Eric Erman",
      weekStart: "2025-09-21",
      sourceType: "xlsx",
      sourceFileName: "a.xlsx",
      entries: [entry("2025-09-23", "2", 1), entry("2025-09-21", "1", 2)],
    });
    createTimesheet({ employeeName: "eric  erman", weekStart: "2025-09-28", sourceType: "manual", sourceFileName: null, entries: [entry("2025-09-29", "3", 1)] });
    createTimesheet({ employeeName: "Amy Adams", weekStart: "2025-09-21", sourceType: "photo", sourceFileName: null, entries: [] });

    const employees = listEmployees();
    expect(employees.map((e) => [e.name, e.weeks, e.entryCount])).toEqual([
      ["Amy Adams", 1, 0],
      ["Eric Erman", 2, 3],
    ]);
    const [older] = listTimesheets({ employeeId: employees[1].id, weekStart: "2025-09-21" });
    expect(older.entries.map((e) => e.jobNumber)).toEqual(["1", "2"]);
    expect(findExistingSheets("Eric Erman", "2025-09-21")).toHaveLength(1);
  });

  it("updates and deletes", () => {
    const t = createTimesheet({ employeeName: "A", weekStart: "2025-09-21", sourceType: "manual", sourceFileName: null, entries: [entry("2025-09-21", "1", 1)] });
    const updated = updateTimesheet(t.id, { employeeName: "B", weekStart: "2025-09-21", entries: [entry("2025-09-22", "9", 3), entry("2025-09-23", "10", 1)] });
    expect(updated.employeeName).toBe("B");
    expect(updated.entries).toHaveLength(2);
    deleteTimesheet(t.id);
    expect(listTimesheets()).toHaveLength(0);
  });
});

describe("db: PINs, status and migration", () => {
  it("stores submitted status and PIN hashes", async () => {
    const { createTimesheet, setTimesheetStatus, listTimesheets, findOrCreateEmployee, setEmployeePinHash, findEmployeeByName, listEmployees } = await import("@/lib/db");
    const t = createTimesheet({ employeeName: "Pat Lee", weekStart: "2025-09-21", sourceType: "photo", sourceFileName: null, status: "submitted", entries: [entry("2025-09-22", "1", 2)] });
    expect(listTimesheets({ status: "submitted" }).map((s) => s.id)).toEqual([t.id]);
    setTimesheetStatus(t.id, "reviewed");
    expect(listTimesheets({ status: "submitted" })).toHaveLength(0);

    const e = findOrCreateEmployee("Pat Lee");
    expect(listEmployees()[0].hasPin).toBe(false);
    setEmployeePinHash(e.id, "salt:hash");
    expect(findEmployeeByName("  pat   LEE ")?.pinHash).toBe("salt:hash");
    expect(listEmployees()[0].hasPin).toBe(true);
  });

  it("adds new columns to a database from the first version", async () => {
    const fs = await import("node:fs");
    const os = await import("node:os");
    const path = await import("node:path");
    const { DatabaseSync } = await import("node:sqlite");
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ts-")), "old.db");
    const old = new DatabaseSync(file);
    old.exec(`CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE COLLATE NOCASE);
      CREATE TABLE timesheets (id INTEGER PRIMARY KEY, employee_id INTEGER NOT NULL, week_start TEXT NOT NULL,
        source_type TEXT NOT NULL, source_file_name TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
      INSERT INTO employees (name) VALUES ('Old Timer');
      INSERT INTO timesheets (employee_id, week_start, source_type) VALUES (1, '2025-01-05', 'xlsx');`);
    old.close();

    resetDbForTests(file);
    const { listTimesheets, listEmployees } = await import("@/lib/db");
    expect(listTimesheets()[0].status).toBe("reviewed");
    expect(listEmployees()[0]).toMatchObject({ name: "Old Timer", hasPin: false });
  });
});

describe("backup", () => {
  it("writes a readable copy and keeps 30", async () => {
    const fs = await import("node:fs");
    const os = await import("node:os");
    const path = await import("node:path");
    const { runBackup } = await import("@/lib/backup");
    const { DatabaseSync } = await import("node:sqlite");
    resetDbForTests(path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ts-")), "live.db"));
    createTimesheet({ employeeName: "Kim", weekStart: "2025-09-21", sourceType: "manual", sourceFileName: null, entries: [entry("2025-09-22", "1", 1)] });
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bk-"));
    let file = "";
    for (let i = 0; i < 32; i++) file = runBackup(dir, new Date(Date.UTC(2025, 0, 1 + i, 2)));
    expect(fs.readdirSync(dir)).toHaveLength(30);
    const copy = new DatabaseSync(file);
    expect(copy.prepare("SELECT name FROM employees").get()).toEqual({ name: "Kim" });
    copy.close();
  });
});
