import { NextResponse } from "next/server";
import { parseSpreadsheet } from "@/lib/parse/spreadsheet";
import { parseWithVision } from "@/lib/parse/vision";

export const runtime = "nodejs";
export const maxDuration = 120;

const SPREADSHEET = /\.(xlsx|xlsm|xls|ods|csv|tsv)$/i;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

/** Reads an uploaded timesheet and returns editable drafts. Nothing is saved here. */
export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  const referenceYear = Number(form.get("referenceYear")) || new Date().getFullYear();
  const data = Buffer.from(await file.arrayBuffer());

  try {
    if (SPREADSHEET.test(file.name) || file.type.includes("spreadsheet") || file.type === "text/csv") {
      const drafts = parseSpreadsheet(data, { fileName: file.name, referenceYear });
      if (!drafts.length) {
        return NextResponse.json(
          { error: `Couldn't find a timesheet in ${file.name}. Make sure it has a header row starting with "Date".` },
          { status: 422 },
        );
      }
      return NextResponse.json({ drafts });
    }
    if (file.type === "application/pdf" || /\.pdf$/i.test(file.name) || IMAGE_TYPES.has(file.type)) {
      const mediaType = /\.pdf$/i.test(file.name) ? "application/pdf" : file.type;
      const draft = await parseWithVision({ data, mediaType, fileName: file.name, referenceYear });
      return NextResponse.json({ drafts: [draft] });
    }
    if (/heic|heif/i.test(file.type) || /\.hei[cf]$/i.test(file.name)) {
      return NextResponse.json(
        { error: "HEIC photos aren't supported. On iPhone, set Camera → Formats → Most Compatible, or upload from the browser's camera option." },
        { status: 415 },
      );
    }
    return NextResponse.json({ error: `Unsupported file type: ${file.name}` }, { status: 415 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't read the file.";
    console.error("parse failed", file.name, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
