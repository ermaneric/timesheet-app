"use client";

import { useActionState } from "react";
import { setPinAction, type FormState } from "@/app/actions";

export function PinForm({ employeeId, hasPin }: { employeeId: number; hasPin: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(setPinAction, {});
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={employeeId} />
      <p className="text-sm">{hasPin ? "This employee can log in with their PIN." : "No PIN yet — this employee can't log in."}</p>
      <div className="flex gap-2">
        <input name="pin" className="input" inputMode="numeric" pattern="\d{4,6}" placeholder="New 4–6 digit PIN" aria-label="New PIN" />
        <button className="btn" disabled={pending}>
          {hasPin ? "Change PIN" : "Set PIN"}
        </button>
      </div>
      {hasPin && (
        <button name="remove" value="1" className="btn-danger text-sm underline" formNoValidate>
          Remove PIN (block login)
        </button>
      )}
      {state.error && <p className="warn px-3 py-2 text-sm">{state.error}</p>}
      {state.message && <p className="text-sm">✓ {state.message}</p>}
    </form>
  );
}
