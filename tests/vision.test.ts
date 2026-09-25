import { describe, expect, it } from "vitest";
import { parseWithVision } from "@/lib/parse/vision";

describe("parseWithVision", () => {
  it("turns Claude's transcription into a draft", async () => {
    let sentBlocks: unknown[] = [];
    const draft = await parseWithVision(
      { data: Buffer.from("fake"), mediaType: "image/jpeg", fileName: "sheet.jpg", referenceYear: 2025 },
      async (content) => {
        sentBlocks = content;
        return {
          employeeName: " Eric Erman ",
          weekOf: "",
          entries: [
            {
              date: "9/21",
              jobNumber: "18245",
              hoursBilled: 2,
              travelTime: 0.5,
              extendedTravel: null,
              truckStock: null,
              tip: 5,
              reviewBonus: null,
              receiptCount: 1,
              notes: "",
            },
          ],
          uncertainties: ["Row 1 tip could be 5 or 6"],
        };
      },
    );
    expect(sentBlocks[0]).toMatchObject({ type: "image", source: { media_type: "image/jpeg" } });
    expect(draft.sourceType).toBe("photo");
    expect(draft.employeeName).toBe("Eric Erman");
    expect(draft.weekStart).toBe("2025-09-21");
    expect(draft.entries[0]).toMatchObject({ date: "2025-09-21", tip: 5, receiptCount: 1 });
    expect(draft.warnings[0]).toContain("tip could be 5 or 6");
  });

  it("sends PDFs as document blocks", async () => {
    let sentBlocks: unknown[] = [];
    const draft = await parseWithVision({ data: Buffer.from("%PDF"), mediaType: "application/pdf" }, async (content) => {
      sentBlocks = content;
      return { employeeName: "A", weekOf: "9/21/25", entries: [], uncertainties: [] };
    });
    expect(sentBlocks[0]).toMatchObject({ type: "document" });
    expect(draft.sourceType).toBe("pdf");
    expect(draft.weekStart).toBe("2025-09-21");
  });
});
