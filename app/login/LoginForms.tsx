"use client";

import { useActionState, useState } from "react";
import { adminLoginAction, employeeLoginAction, type FormState } from "@/app/actions";

export function LoginForms() {
  const [tab, setTab] = useState<"employee" | "office">("employee");
  const [empState, empAction, empPending] = useActionState<FormState, FormData>(employeeLoginAction, {});
  const [adminState, adminAction, adminPending] = useActionState<FormState, FormData>(adminLoginAction, {});

  return (
    <div className="card space-y-4 p-4">
      <div className="flex gap-2" role="tablist">
        {(["employee", "office"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`btn flex-1 justify-center ${tab === t ? "btn-primary" : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "employee" ? "Employee" : "Office"}
          </button>
        ))}
      </div>

      {tab === "employee" ? (
        <form action={empAction} className="space-y-3">
          <label className="block">
            <span className="text-sm font-semibold">Your name</span>
            <input name="name" className="input mt-1" autoComplete="name" required placeholder="First and last name" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">PIN</span>
            <input
              name="pin"
              className="input mt-1"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              pattern="\d{4,6}"
              required
              placeholder="4–6 digits from the office"
            />
          </label>
          {empState.error && <p className="warn px-3 py-2 text-sm">{empState.error}</p>}
          <button className="btn btn-primary w-full justify-center" disabled={empPending}>
            {empPending ? "Logging in…" : "Log in"}
          </button>
        </form>
      ) : (
        <form action={adminAction} className="space-y-3">
          <label className="block">
            <span className="text-sm font-semibold">Office password</span>
            <input name="password" className="input mt-1" type="password" autoComplete="current-password" required />
          </label>
          {adminState.error && <p className="warn px-3 py-2 text-sm">{adminState.error}</p>}
          <button className="btn btn-primary w-full justify-center" disabled={adminPending}>
            {adminPending ? "Logging in…" : "Log in"}
          </button>
        </form>
      )}
    </div>
  );
}
