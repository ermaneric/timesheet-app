import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { parseSpreadsheet } from "@/lib/parse/spreadsheet";
import { matchHeader, parseNumber } from "@/lib/parse/normalize";
import { computeTotals } from "@/lib/totals";

const fixture = fs.readFileSync(path.join(__dirname, "fixtures/sample-timesheet.xlsx"));

describe("parseSpreadsheet (company xlsx layout)", () => {
  const [draft, ...rest] = parseSpreadsheet(fixture, { fileName: "sample-timesheet.xlsx" });

  it("reads one timesheet for the named employee", () => {
    expect(rest).toHaveLength(0);
    expect(draft.employeeName).toBe("Eric Erman");
    expect(draft.sourceType).toBe("xlsx");
  });

  it("reads the five rows in order and stops at TOTAL", () => {
    expect(draft.entries.map((e) => [e.date, e.jobNumber, e.hoursBilled, e.travelTime])).toEqual([
      ["2025-09-21", "18245", 2, 0.5],
      ["2025-09-21", "18247", 1, 0.5],
      ["2025-09-23", "18251", 1, 0.5],
      ["2025-09-25", "18243", 1, 0.5],
      ["2025-09-25", "18244", 1, 0.5],
    ]);
    expect(draft.entries[0].tip).toBeNull();
  });

  it("works out the Sunday–Saturday week from the dates", () => {
    expect(draft.weekStart).toBe("2025-09-21");
    expect(draft.warnings).toEqual([]);
  });

  it("matches the sheet's totals block", () => {
    const t = computeTotals(draft.entries);
    expect(t.columns.hoursBilled).toBe(6);
    expect(t.columns.travelTime).toBe(2.5);
    expect(t.totalHours).toBe(8.5);
    expect(t.bonusAndTips).toBe(0);
    expect(t.truckStock).toBe(0);
  });
});

describe("parseSpreadsheet (csv)", () => {
  it("parses a CSV export with text dates and a Week of date", () => {
    const csv = [
      "Nathan's Handyman Service Time Sheet,,,,,Name: Jane Doe",
      "Week of,9/21/2025,,(Sunday - Saturday)",
      "Date,Job # / Invoice #,Hours billed,Travel time,Extended travel,Truck Stock,Tip,RB,# of receipts,Time Sheet notes",
      '9/22,00912,3,0.5,1,$12.50,20,10,2,"Replaced faucet, customer happy"',
      ",,,,,,,,,",
      "TOTAL,,3,0.5,1,12.5,20,10,2,",
    ].join("\n");
    const [draft] = parseSpreadsheet(Buffer.from(csv), { fileName: "jane.csv", referenceYear: 2030 });
    expect(draft.employeeName).toBe("Jane Doe");
    expect(draft.sourceType).toBe("csv");
    expect(draft.weekStart).toBe("2025-09-21");
    expect(draft.entries).toEqual([
      {
        date: "2025-09-22",
        jobNumber: "00912",
        hoursBilled: 3,
        travelTime: 0.5,
        extendedTravel: 1,
        truckStock: 12.5,
        tip: 20,
        reviewBonus: 10,
        receiptCount: 2,
        notes: "Replaced faucet, customer happy",
      },
    ]);
  });

  it("splits a flat CSV with an Employee column into one draft per employee", () => {
    const csv = [
      "Employee,Date,Job #,Hours billed,Travel time",
      "Eric Erman,2025-09-22,1,2,0.5",
      "Sam Smith,2025-09-22,2,4,1",
      "Eric Erman,2025-09-23,3,1,0.5",
    ].join("\n");
    const drafts = parseSpreadsheet(Buffer.from(csv), { fileName: "flat.csv" });
    expect(drafts.map((d) => [d.employeeName, d.entries.length])).toEqual([
      ["Eric Erman", 2],
      ["Sam Smith", 1],
    ]);
  });

  it("flags rows with unreadable dates and a missing employee name", () => {
    const csv = ["Date,Job #,Hours billed,Travel time", "someday,5,1,0"].join("\n");
    const [draft] = parseSpreadsheet(Buffer.from(csv), { fileName: "x.csv" });
    expect(draft.employeeName).toBe("");
    expect(draft.warnings.join(" ")).toMatch(/employee/i);
    expect(draft.warnings.join(" ")).toMatch(/date/i);
  });
});

describe("header + number helpers", () => {
  it("maps the sheet's column headers", () => {
    expect(
      ["Date", "Job # / Invoice #", "Hours billed", "Travel time", "Extended travel", "Truck Stock", "Tip", "RB", "# of receipts", "Time Sheet notes"].map(matchHeader),
    ).toEqual(["date", "jobNumber", "hoursBilled", "travelTime", "extendedTravel", "truckStock", "tip", "reviewBonus", "receiptCount", "notes"]);
  });

  it("parses loose numbers", () => {
    expect(parseNumber("$1,234.50")).toBe(1234.5);
    expect(parseNumber(" ")).toBeNull();
    expect(parseNumber("abc")).toBeNull();
    expect(parseNumber(0.5)).toBe(0.5);
  });
});
