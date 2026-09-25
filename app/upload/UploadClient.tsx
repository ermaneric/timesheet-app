"use client";

import { useRef, useState } from "react";
import type { TimesheetDraft } from "@/lib/fields";
import { parseFile } from "@/lib/client/upload";
import { DraftEditor } from "@/components/DraftEditor";

type Item = {
  id: string;
  file: File;
  previewUrl: string | null;
  status: "reading" | "ready" | "error";
  drafts: TimesheetDraft[];
  error?: string;
};

export function UploadClient({ employeeNames }: { employeeNames: string[] }) {
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const patch = (id: string, p: Partial<Item>) => setItems((all) => all.map((it) => (it.id === id ? { ...it, ...p } : it)));

  const addFiles = (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      const id = `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`;
      const showPreview = file.type.startsWith("image/") || file.type === "application/pdf";
      setItems((all) => [
        ...all,
        { id, file, previewUrl: showPreview ? URL.createObjectURL(file) : null, status: "reading", drafts: [] },
      ]);
      parseFile(file)
        .then((drafts) => patch(id, { status: "ready", drafts }))
        .catch((err: Error) => patch(id, { status: "error", error: err.message }));
    }
  };

  return (
    <div className="space-y-6">
      <div
        className="card flex flex-col items-center gap-3 p-8 text-center"
        style={{ borderStyle: "dashed", borderWidth: 2, borderColor: dragging ? "var(--accent)" : "var(--line)" }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
      >
        <p className="font-semibold">Drop timesheet files here</p>
        <p className="muted text-sm">.xlsx, .csv, .pdf, .jpg, .png — several at once is fine</p>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" className="btn btn-primary" onClick={() => inputRef.current?.click()}>
            Choose files
          </button>
          <button type="button" className="btn" onClick={() => cameraRef.current?.click()}>
            Take a photo
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          accept=".xlsx,.xlsm,.xls,.ods,.csv,.pdf,image/*"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={cameraRef}
          type="file"
          hidden
          accept="image/*"
          capture="environment"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {items.map((it) => (
        <section key={it.id} className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">{it.file.name}</h2>
            <button type="button" className="muted text-sm underline" onClick={() => setItems((all) => all.filter((x) => x.id !== it.id))}>
              Dismiss
            </button>
          </div>
          {it.status === "reading" && <p className="card muted p-4">Reading timesheet…</p>}
          {it.status === "error" && <p className="warn p-4">{it.error}</p>}
          {it.status === "ready" &&
            it.drafts.map((d, i) => (
              <DraftEditor
                key={i}
                initial={d}
                employeeNames={employeeNames}
                previewUrl={it.previewUrl}
                previewType={it.file.type}
              />
            ))}
        </section>
      ))}
    </div>
  );
}
