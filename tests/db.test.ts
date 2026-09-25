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
