"use client";

import { useRef, useState } from "react";
import { emptyEntry, type TimesheetDraft } from "@/lib/fields";
import { todayIso, weekStartFor } from "@/lib/dates";
import { parseFile } from "@/lib/client/upload";
import { DraftEditor } from "@/components/DraftEditor";

function blankDraft(employeeName: string): TimesheetDraft {
  const week = weekStartFor(todayIso());
  return {
    employeeName,
    weekStart: week,
    sourceType: "manual",
    sourceFileName: null,
    entries: [emptyEntry(todayIso())],
    warnings: [],
  };
}

type Props = {
  employeeNames: string[];
  defaultEmployee: string;
  /** Set when an employee is submitting their own sheet. */
  lockedEmployee?: boolean;
};

export function ManualEntryClient({ employeeNames, defaultEmployee, lockedEmployee }: Props) {
  const [draft, setDraft] = useState(() => blankDraft(defaultEmployee));
  const [version, setVersion] = useState(0);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = (next: TimesheetDraft) => {
    setDraft(next);
    setVersion((v) => v + 1); // remount the editor with the new starting values
  };

  const readPhoto = async () => {
    if (!photo) return;
    setReading(true);
    setError(null);
    try {
      const [d] = await parseFile(photo);
      const employeeName = lockedEmployee ? draft.employeeName : d.employeeName || draft.employeeName;
      reset({ ...d, employeeName, sourceType: d.sourceType === "photo" || d.sourceType === "pdf" ? d.sourceType : "manual" });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setReading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-3 p-4">
        <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
          {photo ? "Change photo" : lockedEmployee ? "Take or choose a photo of your sheet" : "Attach photo of sheet (optional)"}
        </button>
        <input
          ref={fileRef}
          type="file"
          hidden
          accept="image/*,.pdf,.xlsx,.xls,.csv"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            setPhoto(f);
            setPhotoUrl(URL.createObjectURL(f));
          }}
        />
        {photo && (
          <>
            <span className="muted text-sm">{photo.name}</span>
            <button type="button" className="btn btn-primary" onClick={readPhoto} disabled={reading}>
              {reading ? "Reading…" : "Fill in table from this file"}
            </button>
            <button
              type="button"
              className="muted text-sm underline"
              onClick={() => {
                setPhoto(null);
                setPhotoUrl(null);
              }}
            >
              Remove photo
            </button>
          </>
        )}
        <button type="button" className="muted ml-auto text-sm underline" onClick={() => reset(blankDraft(draft.employeeName))}>
          Start over
        </button>
      </div>
      {error && <p className="warn p-3 text-sm">{error}</p>}
      <DraftEditor
        key={version}
        initial={draft}
        employeeNames={employeeNames}
        previewUrl={photo && (photo.type.startsWith("image/") || photo.type === "application/pdf") ? photoUrl : null}
        previewType={photo?.type}
        lockedEmployee={lockedEmployee}
        savedLink={lockedEmployee ? { href: "/me", label: "See my timesheets" } : undefined}
      />
    </div>
  );
}
