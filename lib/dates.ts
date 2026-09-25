/** Date helpers. All dates are handled as ISO `YYYY-MM-DD` strings in UTC. */

export function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function fromIso(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

export function isIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(fromIso(s).getTime());
}

/** Sunday on or before the given date. */
export function weekStartFor(iso: string): string {
  const d = fromIso(iso);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return toIso(d);
}

export function addDays(iso: string, days: number): string {
  const d = fromIso(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toIso(d);
}

export function todayIso(): string {
  return toIso(new Date());
}

/** "Sep 21 – Sep 27, 2025" */
export function formatWeek(weekStart: string): string {
  const fmt = (iso: string, withYear: boolean) =>
    fromIso(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      ...(withYear ? { year: "numeric" } : {}),
      timeZone: "UTC",
    });
  return `${fmt(weekStart, false)} – ${fmt(addDays(weekStart, 6), true)}`;
}

/** "9/21" */
export function formatShortDate(iso: string): string {
  if (!isIsoDate(iso)) return iso;
  const d = fromIso(iso);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

/** Excel serial day number → ISO date. */
export function excelSerialToIso(serial: number): string {
  const epoch = Date.UTC(1899, 11, 30);
  return toIso(new Date(epoch + Math.round(serial) * 86400000));
}

/**
 * Parse loose handwritten/spreadsheet date text such as "9/21", "9/21/25",
 * "2025-09-21" or "Sept 21". `referenceYear` fills in a missing year; when
 * `referenceDate` is given the year is picked so the date lands closest to it
 * (handles weeks that straddle New Year).
 */
export function parseLooseDate(
  text: string,
  referenceYear: number,
  referenceDate?: string,
): string | null {
  const s = text.trim();
  if (!s) return null;
  if (isIsoDate(s)) return s;

  let m = s.match(/^(\d{1,2})[/\-.](\d{1,2})(?:[/\-.](\d{2,4}))?$/);
  if (m) {
    const month = Number(m[1]);
    const day = Number(m[2]);
    let year = m[3] ? Number(m[3]) : null;
    if (year !== null && year < 100) year += 2000;
    return build(month, day, year, referenceYear, referenceDate);
  }

  m = s.match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:,?\s+(\d{4}))?$/);
  if (m) {
    const month = MONTHS.findIndex((name) => m![1].toLowerCase().startsWith(name)) + 1;
    if (month > 0) {
      return build(month, Number(m[2]), m[3] ? Number(m[3]) : null, referenceYear, referenceDate);
    }
  }

  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return toIso(new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())));
  }
  return null;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function build(
  month: number,
  day: number,
  year: number | null,
  referenceYear: number,
  referenceDate?: string,
): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const make = (y: number) => toIso(new Date(Date.UTC(y, month - 1, day)));
  if (year !== null) return make(year);
  if (!referenceDate) return make(referenceYear);
  const ref = fromIso(referenceDate).getTime();
  const candidates = [referenceYear - 1, referenceYear, referenceYear + 1].map(make);
  return candidates.reduce((best, c) =>
    Math.abs(fromIso(c).getTime() - ref) < Math.abs(fromIso(best).getTime() - ref) ? c : best,
  );
}
