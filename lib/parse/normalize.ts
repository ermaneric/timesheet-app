import { emptyEntry, isBlankEntry, type EntryInput, type EntryFieldKey } from "../fields";
import { isIsoDate, parseLooseDate, weekStartFor, excelSerialToIso } from "../dates";

/** Column header text → canonical field key (null when unrecognised). */
export function matchHeader(raw: unknown): EntryFieldKey | "employeeName" | null {
  const h = String(raw ?? "")
    .toLowerCase()
    .replace(/[^a-z#]/g, "");
  if (!h) return null;
  if (h.startsWith("date") || h === "day") return "date";
  if (h.includes("employee") || h === "name" || h === "tech" || h === "technician") return "employeeName";
  if (h.includes("job") || h.includes("invoice")) return "jobNumber";
  if (h.includes("extended")) return "extendedTravel";
  if (h.includes("travel")) return "travelTime";
  if (h.includes("hour") && !h.includes("total")) return "hoursBilled";
  if (h.includes("truck")) return "truckStock";
  if (h.includes("receipt")) return "receiptCount";
  if (h === "rb" || h.includes("review")) return "reviewBonus";
  if (h.includes("tip")) return "tip";
  if (h.includes("note")) return "notes";
  return null;
}

/** "$12.50", "1,5" (comma decimal), " 2 " → number; blanks and junk → null. */
export function parseNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).trim().replace(/[$\s]/g, "");
  if (!s || s === "-") return null;
  const n = Number(s.replace(/,(\d{1,2})$/, ".$1").replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function parseDateCell(
  v: unknown,
  referenceYear: number,
  referenceDate?: string,
): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") {
    // Excel stores dates as serial day numbers (e.g. 45921 = 2025-09-21).
    return v > 20000 ? excelSerialToIso(v) : null;
  }
  return parseLooseDate(String(v), referenceYear, referenceDate);
}

export function cellText(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

/**
 * Clean a list of entries: drop blank rows, round numbers, and pick the
 * Sunday that starts the week. Returns warnings for anything the user should
 * double-check on the review screen.
 */
export function finalizeEntries(
  entries: EntryInput[],
  weekStartHint: string | null,
): { entries: EntryInput[]; weekStart: string; warnings: string[] } {
  const warnings: string[] = [];
  const kept = entries.filter((e) => !isBlankEntry(e));
  kept.forEach((e, i) => {
    if (!isIsoDate(e.date)) {
      warnings.push(`Row ${i + 1}: date is missing or unreadable — please fill it in.`);
    }
    if (e.hoursBilled === null && e.jobNumber) {
      warnings.push(`Row ${i + 1} (job ${e.jobNumber}): no hours billed.`);
    }
  });

  const dated = kept.filter((e) => isIsoDate(e.date)).map((e) => e.date).sort();
  let weekStart = weekStartHint && isIsoDate(weekStartHint) ? weekStartFor(weekStartHint) : null;
  if (!weekStart && dated.length) weekStart = weekStartFor(dated[0]);
  if (!weekStart) {
    weekStart = "";
    warnings.push("Couldn't tell which week this is — please pick the week.");
  } else {
    const outside = dated.filter((d) => weekStartFor(d) !== weekStart);
    if (outside.length) {
      warnings.push(
        `${outside.length} row(s) fall outside the Sunday–Saturday week starting ${weekStart}.`,
      );
    }
  }
  return { entries: kept, weekStart, warnings };
}

export { emptyEntry };
