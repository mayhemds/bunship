/**
 * Password hashing utilities unit tests
 *
 * Tests hashPassword and verifyPassword from src/lib/password.ts.
 * Uses Bun's built-in Argon2id hashing.
 */
import { describe, it, expect } from "bun:test";
import { hashPassword, verifyPassword } from "../../lib/password";

describe("hashPassword", () => {
  it("returns a non-empty string", async () => {
    const hash = await hashPassword("Str0ngP@ssword!");

    expect(typeof hash).toBe("string");
    expect(hash.length).toBeGreaterThan(0);
  });

  it("returns a string that differs from the plaintext input", async () => {
    const password = "MySecret123";
    const hash = await hashPassword(password);

    expect(hash).not.toBe(password);
  });

  it("produces different hashes for the same password (random salt)", async () => {
    const password = "SamePassword1";
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    expect(hash1).not.toBe(hash2);
  });

  it("produces a hash using the argon2id algorithm", async () => {
    const hash = await hashPassword("CheckAlgorithm1");

    // Bun.password.hash with argon2id produces a PHC-format string starting with "$argon2id$"
    expect(hash).toStartWith("$argon2id$");
  });

  it("embeds expected memory and time cost parameters", async () => {
    const hash = await hashPassword("ParamCheck1");

    // PHC string includes m=65536 (64 MB) and t=3
    expect(hash).toContain("m=65536");
    expect(hash).toContain("t=3");
  });
});

describe("verifyPassword", () => {
  it("returns true for a correct password", async () => {
    const password = "Correct1Password";
    const hash = await hashPassword(password);
    const result = await verifyPassword(password, hash);

    expect(result).toBe(true);
  });

  it("returns false for an incorrect password", async () => {
    const hash = await hashPassword("RealPassword1");
    const result = await verifyPassword("WrongPassword1", hash);

    expect(result).toBe(false);
  });

  it("returns false for an empty password against a valid hash", async () => {
    const hash = await hashPassword("ValidPassword1");
    const result = await verifyPassword("", hash);

    expect(result).toBe(false);
  });

  it("returns true when re-hashing produces a different hash but both verify", async () => {
    const password = "ConsistentCheck1";
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    // Hashes differ due to different salts
    expect(hash1).not.toBe(hash2);

    // Both hashes verify against the original password
    expect(await verifyPassword(password, hash1)).toBe(true);
    expect(await verifyPassword(password, hash2)).toBe(true);
  });

  it("returns false for a slightly modified password", async () => {
    const hash = await hashPassword("AlmostRight1");
    const result = await verifyPassword("AlmostRight2", hash);

    expect(result).toBe(false);
  });
});
