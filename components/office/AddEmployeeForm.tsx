"use client";

import { useActionState } from "react";
import { addEmployeeAction, type FormState } from "@/app/actions";

export function AddEmployeeForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(addEmployeeAction, {});
  return (
    <form action={action} className="card flex flex-wrap items-end gap-3 p-4">
      <label className="block">
        <span className="text-sm font-semibold">New employee name</span>
        <input name="name" className="input mt-1" required />
      </label>
      <label className="block">
        <span className="text-sm font-semibold">PIN for logging in (4–6 digits)</span>
        <input name="pin" className="input mt-1" inputMode="numeric" pattern="\d{4,6}" />
      </label>
      <button className="btn" disabled={pending}>
        Add employee
      </button>
      {state.error && <p className="warn w-full px-3 py-2 text-sm">{state.error}</p>}
      {state.message && <p className="w-full text-sm">✓ {state.message}</p>}
    </form>
  );
}
