"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import type { TimesheetDraft } from "@/lib/fields";
import { formatWeek, isIsoDate, weekStartFor } from "@/lib/dates";
import { EntryGrid } from "./EntryGrid";
import { existingSheetCountAction, saveTimesheetAction, updateTimesheetAction, type SaveResult } from "@/app/actions";

type Props = {
  initial: TimesheetDraft;
  employeeNames: string[];
  /** When set, saving updates this timesheet instead of creating a new one. */
  timesheetId?: number;
  /** Image/PDF of the original sheet, shown next to the grid for checking. */
  previewUrl?: string | null;
  previewType?: string;
  onSaved?: (result: Extract<SaveResult, { ok: true }>) => void;
};

/** Employee + week + editable rows, with save. Used for uploads, manual entry and edits. */
export function DraftEditor({ initial, employeeNames, timesheetId, previewUrl, previewType, onSaved }: Props) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Extract<SaveResult, { ok: true }> | null>(null);
  const [existing, setExisting] = useState(0);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (timesheetId) return;
    let cancelled = false;
    const t = setTimeout(() => {
      existingSheetCountAction(draft.employeeName, draft.weekStart).then((n) => !cancelled && setExisting(n));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [draft.employeeName, draft.weekStart, timesheetId]);

  const save = () => {
    setError(null);
    startTransition(async () => {
      const result = timesheetId ? await updateTimesheetAction(timesheetId, draft) : await saveTimesheetAction(draft);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(result);
      onSaved?.(result);
    });
  };

  if (saved && !timesheetId) {
    return (
      <div className="card p-4">
        <p className="font-semibold">
          ✓ Saved {draft.entries.length} row(s) for {draft.employeeName} — week of {formatWeek(weekStartFor(draft.weekStart))}.
        </p>
        <Link className="underline" href={`/employees/${saved.employeeId}`}>
          View {draft.employeeName}&apos;s timesheets
        </Link>
      </div>
    );
  }

  const weekValid = isIsoDate(draft.weekStart);
  const grid = (
    <EntryGrid entries={draft.entries} weekStart={weekValid ? draft.weekStart : undefined} onChange={(entries) => setDraft({ ...draft, entries })} />
  );

  return (
    <div className="card space-y-4 p-4">
      <div className="flex flex-wrap items-end gap-4">
        <label className="block">
          <span className="text-sm font-semibold">Employee</span>
          <input
            className="input mt-1"
            style={{ minWidth: "16rem" }}
            list="employee-names"
            placeholder="Type or pick a name"
            value={draft.employeeName}
            onChange={(e) => setDraft({ ...draft, employeeName: e.target.value })}
          />
          <datalist id="employee-names">
            {employeeNames.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </label>
        <label className="block">
          <span className="text-sm font-semibold">Week of (any day in the week)</span>
          <input
            className="input mt-1"
            type="date"
            value={draft.weekStart}
            onChange={(e) => setDraft({ ...draft, weekStart: e.target.value ? weekStartFor(e.target.value) : "" })}
          />
        </label>
        <p className="muted pb-2 text-sm">{weekValid ? `Sun–Sat: ${formatWeek(draft.weekStart)}` : "Sunday – Saturday"}</p>
        {draft.sourceFileName && <p className="muted pb-2 text-sm">From: {draft.sourceFileName}</p>}
      </div>

      {(draft.warnings.length > 0 || existing > 0) && (
        <ul className="warn list-disc space-y-1 py-2 pr-3 pl-8 text-sm">
          {existing > 0 && (
            <li>
              {existing} timesheet(s) are already saved for {draft.employeeName} this week. Saving adds another — make sure
              this isn&apos;t a duplicate.
            </li>
          )}
          {draft.warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}

      {previewUrl ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div>
            <p className="mb-1 text-sm font-semibold">Original</p>
            {previewType === "application/pdf" ? (
              <iframe src={previewUrl} title="Original timesheet" className="h-[28rem] w-full rounded border" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <a href={previewUrl} target="_blank" rel="noreferrer">
                <img src={previewUrl} alt="Original timesheet" className="w-full rounded border" style={{ borderColor: "var(--line)" }} />
              </a>
            )}
          </div>
          <div className="min-w-0">{grid}</div>
        </div>
      ) : (
        grid
      )}

      {error && <p className="warn px-3 py-2 text-sm font-semibold">{error}</p>}
      <div className="flex items-center gap-3">
        <button type="button" className="btn btn-primary" onClick={save} disabled={pending}>
          {pending ? "Saving…" : timesheetId ? "Save changes" : "Confirm & save"}
        </button>
        {timesheetId && saved && <span className="text-sm">✓ Saved</span>}
      </div>
    </div>
  );
}
