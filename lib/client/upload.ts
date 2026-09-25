import type { TimesheetDraft } from "../fields";

const MAX_EDGE = 2200;

/**
 * Phone photos are often 5–12 MB, above what the vision API accepts. Downscale
 * to a JPEG before upload; spreadsheets and PDFs pass through untouched.
 */
export async function prepareFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 3_500_000 && file.type !== "image/heic") return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.88));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file; // browser can't decode it (e.g. HEIC on desktop Chrome) — let the server report it
  }
}

export async function parseFile(file: File): Promise<TimesheetDraft[]> {
  const body = new FormData();
  body.append("file", await prepareFile(file));
  body.append("referenceYear", String(new Date().getFullYear()));
  const res = await fetch("/api/parse", { method: "POST", body });
  const json = (await res.json().catch(() => ({}))) as { drafts?: TimesheetDraft[]; error?: string };
  if (!res.ok || !json.drafts) throw new Error(json.error ?? `Upload failed (${res.status}).`);
  return json.drafts;
}
