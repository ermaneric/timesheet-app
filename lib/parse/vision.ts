import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { emptyEntry, type EntryInput, type TimesheetDraft } from "../fields";
import { finalizeEntries, parseDateCell } from "./normalize";

export const VISION_MODEL = "claude-opus-5";

const num = z.number().nullable();

const ExtractedTimesheet = z.object({
  employeeName: z.string().describe("Name written next to 'Name:', or empty string if absent"),
  weekOf: z
    .string()
    .describe("The 'Week of' date exactly as written (e.g. '9/21/25'), or empty string if absent"),
  entries: z.array(
    z.object({
      date: z.string().describe("Date as written, e.g. '9/21'"),
      jobNumber: z.string().describe("Job # / Invoice #"),
      hoursBilled: num,
      travelTime: num,
      extendedTravel: num,
      truckStock: num,
      tip: num,
      reviewBonus: num.describe("The 'RB' (review bonus) column"),
      receiptCount: num.describe("The '# of receipts' column"),
      notes: z.string().describe("Time Sheet notes column"),
    }),
  ),
  uncertainties: z
    .array(z.string())
    .describe("Short notes about any value that was hard to read, e.g. 'Row 3 hours could be 1 or 7'"),
});

type Extracted = z.infer<typeof ExtractedTimesheet>;

const PROMPT = `This is a weekly employee timesheet from a handyman company (possibly handwritten or a photo of a screen/printout).
Columns, left to right: Date, Job # / Invoice #, Hours billed, Travel time, Extended travel, Truck Stock, Tip, RB (review bonus), # of receipts, Time Sheet notes.
Below the rows there may be a TOTAL row and a summary block (TOTAL HOURS, BONUS + TIPS, TRUCK STOCK) — do not include those as entries.

Transcribe every filled-in row. Use null for empty numeric cells, and don't invent values. Copy job numbers exactly (keep leading zeros).
If a value is hard to read, give your best reading and describe the doubt in "uncertainties".`;

export type VisionInput = {
  data: Buffer;
  mediaType: string;
  fileName?: string | null;
  referenceYear?: number;
};

export type ExtractFn = (content: Anthropic.Beta.BetaContentBlockParam[]) => Promise<Extracted>;

/** Read a timesheet photo or PDF with Claude and return an editable draft. */
export async function parseWithVision(input: VisionInput, extract: ExtractFn = extractWithClaude): Promise<TimesheetDraft> {
  const isPdf = input.mediaType === "application/pdf";
  const b64 = input.data.toString("base64");
  const fileBlock: Anthropic.Beta.BetaContentBlockParam = isPdf
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } }
    : {
        type: "image",
        source: {
          type: "base64",
          media_type: input.mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
          data: b64,
        },
      };

  const extracted = await extract([fileBlock, { type: "text", text: PROMPT }]);
  return toDraft(extracted, {
    sourceType: isPdf ? "pdf" : "photo",
    fileName: input.fileName ?? null,
    referenceYear: input.referenceYear ?? new Date().getFullYear(),
  });
}

export function toDraft(
  x: Extracted,
  ctx: { sourceType: "pdf" | "photo"; fileName: string | null; referenceYear: number },
): TimesheetDraft {
  const weekOf = x.weekOf ? parseDateCell(x.weekOf, ctx.referenceYear) : null;
  const refYear = weekOf ? Number(weekOf.slice(0, 4)) : ctx.referenceYear;
  const entries: EntryInput[] = x.entries.map((e) => ({
    ...emptyEntry(),
    ...e,
    jobNumber: e.jobNumber.trim(),
    notes: e.notes.trim(),
    date: parseDateCell(e.date, refYear, weekOf ?? undefined) ?? e.date,
  }));
  const { entries: kept, weekStart, warnings } = finalizeEntries(entries, weekOf);
  if (!x.employeeName.trim()) warnings.unshift("No employee name found — please choose the employee.");
  return {
    employeeName: x.employeeName.trim(),
    weekStart,
    sourceType: ctx.sourceType,
    sourceFileName: ctx.fileName,
    entries: kept,
    warnings: [...x.uncertainties.map((u) => `Hard to read: ${u}`), ...warnings],
  };
}

async function extractWithClaude(content: Anthropic.Beta.BetaContentBlockParam[]): Promise<Extracted> {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    throw new Error(
      "Reading photos and PDFs needs an Anthropic API key. Add ANTHROPIC_API_KEY to your .env file, or enter the sheet manually.",
    );
  }
  const client = new Anthropic();
  const response = await client.beta.messages.parse({
    model: VISION_MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    messages: [{ role: "user", content }],
    output_config: { effort: "medium", format: betaZodOutputFormat(ExtractedTimesheet) },
  });
  if (response.stop_reason === "refusal") {
    throw new Error("The timesheet image couldn't be processed. Please enter it manually.");
  }
  if (!response.parsed_output) {
    throw new Error("Couldn't read the timesheet. Try a clearer photo, or enter it manually.");
  }
  return response.parsed_output;
}
