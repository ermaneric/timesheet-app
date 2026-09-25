import { describe, expect, it } from "vitest";
import { detailCsv, summaryCsv } from "@/lib/export/csv";
import { emptyEntry } from "@/lib/fields";

const sheets = [
  {
    employeeName: "Sam Smith",
    weekStart: "2025-09-21",
    entries: [{ ...emptyEntry("2025-09-22"), jobNumber: "7", hoursBilled: 4, travelTime: 1, tip: 10, reviewBonus: 25 }],
  },
  {
    employeeName: "Eric Erman",
    weekStart: "2025-09-21",
    entries: [
      { ...emptyEntry("2025-09-23"), jobNumber: "18251", hoursBilled: 1, travelTime: 0.5, notes: 'Said "thanks", paid' },
      { ...emptyEntry("2025-09-21"), jobNumber: "18245", hoursBilled: 2, travelTime: 0.5, truckStock: 15 },
    ],
  },
];

describe("detailCsv", () => {
  it("uses the timesheet column order and sorts by employee then date", () => {
    const lines = detailCsv(sheets).trim().split("\r\n");
    expect(lines[0]).toBe(
      "Employee,Week of,Date,Job # / Invoice #,Hours billed,Travel time,Extended travel,Truck Stock,Tip,Review bonus (RB),# of receipts,Time Sheet notes",
    );
    expect(lines[1]).toBe("Eric Erman,09/21/2025,09/21/2025,18245,2,0.5,,15,,,,");
    expect(lines[2]).toBe('Eric Erman,09/21/2025,09/23/2025,18251,1,0.5,,,,,,"Said ""thanks"", paid"');
    expect(lines[3].startsWith("Sam Smith,")).toBe(true);
  });
});

describe("summaryCsv", () => {
  it("totals each employee's week", () => {
    const lines = summaryCsv(sheets).trim().split("\r\n");
    expect(lines).toEqual([
      "Employee,Week of,Hours billed,Travel time,Extended travel,Total hours,Tips,Review bonus,Bonus + Tips,Truck Stock,# of receipts",
      "Eric Erman,09/21/2025,3,1,0,4,0,0,0,15,0",
      "Sam Smith,09/21/2025,4,1,0,5,10,25,35,0,0",
    ]);
  });
});
