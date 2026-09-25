import { describe, expect, it } from "vitest";
import {
  hashPin,
  isValidPin,
  passwordMatches,
  RateLimiter,
  signSession,
  verifySession,
} from "@/lib/session";

const SECRET = "test-secret-0123456789";

describe("session tokens", () => {
  const exp = Date.now() + 60_000;

  it("round-trips a valid session", () => {
    const token = signSession({ role: "employee", employeeId: 7, exp }, SECRET);
    expect(verifySession(token, SECRET)).toEqual({ role: "employee", employeeId: 7, exp });
  });

  it("rejects tampered, wrongly-signed, expired and junk tokens", () => {
    const token = signSession({ role: "employee", employeeId: 7, exp }, SECRET);
    const [, sig] = token.split(".");
    const forgedBody = Buffer.from(JSON.stringify({ role: "admin", exp })).toString("base64url");
    expect(verifySession(`${forgedBody}.${sig}`, SECRET)).toBeNull();
    expect(verifySession(token, "another-secret-abcdef")).toBeNull();
    expect(verifySession(signSession({ role: "admin", exp: Date.now() - 1 }, SECRET), SECRET)).toBeNull();
    expect(verifySession("garbage", SECRET)).toBeNull();
    expect(verifySession(undefined, SECRET)).toBeNull();
  });
});

describe("PINs and passwords", () => {
  it("validates PIN format", () => {
    expect(["1234", "123456"].every(isValidPin)).toBe(true);
    expect(["123", "1234567", "12a4", ""].some(isValidPin)).toBe(false);
  });

  it("hashes with a salt and verifies", async () => {
    const { verifyPin } = await import("@/lib/session");
    const a = hashPin("4321");
    expect(a).not.toContain("4321");
    expect(hashPin("4321")).not.toBe(a);
    expect(verifyPin("4321", a)).toBe(true);
    expect(verifyPin("4322", a)).toBe(false);
    expect(verifyPin("4321", null)).toBe(false);
  });

  it("compares the office password", () => {
    expect(passwordMatches("hunter22", "hunter22")).toBe(true);
    expect(passwordMatches("hunter2", "hunter22")).toBe(false);
    expect(passwordMatches("", undefined)).toBe(false);
  });
});

describe("RateLimiter", () => {
  it("locks after max failures until the window passes", () => {
    const rl = new RateLimiter(3, 1000);
    const t = 1_000_000;
    rl.fail("k", t);
    rl.fail("k", t + 1);
    expect(rl.isLocked("k", t + 2)).toBe(false);
    rl.fail("k", t + 3);
    expect(rl.isLocked("k", t + 4)).toBe(true);
    expect(rl.isLocked("other", t + 4)).toBe(false);
    expect(rl.isLocked("k", t + 1001)).toBe(false);
  });

  it("clears on success", () => {
    const rl = new RateLimiter(1, 1000);
    rl.fail("k");
    expect(rl.isLocked("k")).toBe(true);
    rl.clear("k");
    expect(rl.isLocked("k")).toBe(false);
  });
});
