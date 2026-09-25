import { listTimesheets } from "@/lib/db";
import { detailCsv, summaryCsv } from "@/lib/export/csv";
import { isIsoDate } from "@/lib/dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/export?week=YYYY-MM-DD&type=detail|summary&employees=1,2 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const week = url.searchParams.get("week") ?? "";
  const type = url.searchParams.get("type") === "summary" ? "summary" : "detail";
  const employeeIds = (url.searchParams.get("employees") ?? "")
    .split(",")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);
  if (!isIsoDate(week)) return new Response("Missing or invalid week", { status: 400 });

  const sheets = listTimesheets({ weekStart: week, employeeIds });
  const csv = type === "summary" ? summaryCsv(sheets) : detailCsv(sheets);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="timesheets-${type}-week-of-${week}.csv"`,
    },
  });
}
