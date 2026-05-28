import { describe, it, expect } from "vitest";
import { hashPassword, comparePassword, signToken, verifyToken } from "../lib/auth";

describe("hashPassword / comparePassword", () => {
  it("hashes a password and verifies it correctly", async () => {
    const hash = await hashPassword("MyPassword123!");
    expect(hash).not.toBe("MyPassword123!");
    const valid = await comparePassword("MyPassword123!", hash);
    expect(valid).toBe(true);
  });

  it("returns false for wrong password", async () => {
    const hash = await hashPassword("CorrectPassword");
    const valid = await comparePassword("WrongPassword", hash);
    expect(valid).toBe(false);
  });
});

describe("signToken / verifyToken", () => {
  it("signs and verifies a token correctly", () => {
    const payload = { userId: 1, tenantId: 1, email: "test@example.com" };
    const token = signToken(payload);
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);

    const decoded = verifyToken(token);
    expect(decoded.userId).toBe(1);
    expect(decoded.tenantId).toBe(1);
    expect(decoded.email).toBe("test@example.com");
  });

  it("throws on invalid token", () => {
    expect(() => verifyToken("invalid.token.here")).toThrow();
  });

  it("throws on tampered token", () => {
    const token = signToken({ userId: 1, tenantId: 1, email: "a@b.com" });
    const tampered = token.slice(0, -5) + "xxxxx";
    expect(() => verifyToken(tampered)).toThrow();
  });
});
