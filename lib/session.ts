import crypto from "node:crypto";

/**
 * Signed session tokens, PIN hashing and login rate limiting. Pure Node code
 * (no Next.js imports) so it can be unit tested; `lib/auth.ts` wires it to cookies.
 */

export type SessionPayload =
  | { role: "admin"; exp: number }
  | { role: "employee"; employeeId: number; exp: number };

export const SESSION_DAYS = 30;

const b64url = (buf: Buffer | string) => Buffer.from(buf).toString("base64url");

function hmac(secret: string, data: string): string {
  return crypto.createHmac("sha256", secret).update(data).digest("base64url");
}

export function signSession(payload: SessionPayload, secret: string): string {
  const body = b64url(JSON.stringify(payload));
  return `${body}.${hmac(secret, body)}`;
}

/** Returns the payload when the signature is valid and it hasn't expired. */
export function verifySession(token: string | undefined, secret: string, now = Date.now()): SessionPayload | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = hmac(secret, body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < now) return null;
    if (payload.role === "admin") return payload;
    if (payload.role === "employee" && Number.isInteger(payload.employeeId)) return payload;
    return null;
  } catch {
    return null;
  }
}

export function sessionExpiry(now = Date.now()): number {
  return now + SESSION_DAYS * 24 * 60 * 60 * 1000;
}

export function isValidPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

export function hashPin(pin: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(pin, salt, 32);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPin(pin: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = crypto.scryptSync(pin, Buffer.from(saltHex, "hex"), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

/** Constant-time password comparison. */
export function passwordMatches(given: string, expected: string | undefined): boolean {
  if (!expected) return false;
  const a = crypto.createHash("sha256").update(given).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

/**
 * Counts failed logins per key within a time window. A key is locked once it
 * reaches `max` failures, until the window since its first failure passes.
 */
export class RateLimiter {
  private failures = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private max: number,
    private windowMs: number,
  ) {}

  isLocked(key: string, now = Date.now()): boolean {
    const f = this.failures.get(key);
    if (!f) return false;
    if (f.resetAt <= now) {
      this.failures.delete(key);
      return false;
    }
    return f.count >= this.max;
  }

  fail(key: string, now = Date.now()): void {
    if (this.failures.size > 10_000) {
      for (const [k, v] of this.failures) if (v.resetAt <= now) this.failures.delete(k);
    }
    const f = this.failures.get(key);
    if (!f || f.resetAt <= now) this.failures.set(key, { count: 1, resetAt: now + this.windowMs });
    else f.count += 1;
  }

  clear(key: string): void {
    this.failures.delete(key);
  }
}
