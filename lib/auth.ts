import "server-only";
import crypto from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getEmployeeAuth } from "./db";
import { RateLimiter, sessionExpiry, signSession, verifySession, type SessionPayload } from "./session";

export const SESSION_COOKIE = "ts_session";

export type Session = { role: "admin" } | { role: "employee"; employeeId: number; employeeName: string };

const globalForAuth = globalThis as unknown as { devSecret?: string };

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set (at least 16 characters) in .env");
  }
  // Development only: a per-process secret, so logins reset when the dev server restarts.
  globalForAuth.devSecret ??= crypto.randomBytes(32).toString("hex");
  return globalForAuth.devSecret;
}

/** The signed-in user, or null. Employees whose PIN was removed are signed out. */
export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const payload = verifySession(token, secret());
  if (!payload) return null;
  if (payload.role === "admin") return { role: "admin" };
  const employee = getEmployeeAuth(payload.employeeId);
  if (!employee?.pinHash) return null;
  return { role: "employee", employeeId: employee.id, employeeName: employee.name };
}

export async function startSession(who: { role: "admin" } | { role: "employee"; employeeId: number }) {
  const exp = sessionExpiry();
  const payload: SessionPayload = who.role === "admin" ? { role: "admin", exp } : { ...who, exp };
  const token = signSession(payload, secret());
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: await isHttps(),
    sameSite: "lax",
    path: "/",
    expires: new Date(exp),
  });
}

/**
 * Secure-only cookies when reached over https (e.g. through Tailscale Funnel).
 * Plain http is only allowed for localhost, where Safari would otherwise drop the cookie.
 */
async function isHttps(): Promise<boolean> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto");
  if (proto) return proto.split(",")[0].trim() === "https";
  const host = (h.get("host") ?? "").replace(/:\d+$/, "");
  return !["localhost", "127.0.0.1", "[::1]"].includes(host);
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** For office pages: redirects to login (or an employee's own page). */
export async function requireAdminPage(): Promise<void> {
  const s = await getSession();
  if (!s) redirect("/login");
  if (s.role !== "admin") redirect("/me");
}

/** For employee pages: redirects to login (or the office dashboard for admins). */
export async function requireEmployeePage(): Promise<Extract<Session, { role: "employee" }>> {
  const s = await getSession();
  if (!s) redirect("/login");
  if (s.role !== "employee") redirect("/");
  return s;
}

export class NotAuthorizedError extends Error {
  constructor() {
    super("You're not allowed to do that. Please log in again.");
  }
}

/** For server actions and API routes. */
export async function assertAdmin(): Promise<void> {
  const s = await getSession();
  if (s?.role !== "admin") throw new NotAuthorizedError();
}

export async function assertSignedIn(): Promise<Session> {
  const s = await getSession();
  if (!s) throw new NotAuthorizedError();
  return s;
}

// Failed-login limits: per IP + name, and per name from anywhere (stops PIN guessing).
const globalForLimits = globalThis as unknown as { loginLimits?: { perIp: RateLimiter; perName: RateLimiter } };
export const loginLimits = (globalForLimits.loginLimits ??= {
  perIp: new RateLimiter(10, 15 * 60 * 1000),
  perName: new RateLimiter(20, 60 * 60 * 1000),
});

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "local";
}
