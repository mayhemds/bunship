/**
 * Password hashing utilities using Bun's built-in Argon2
 */

/**
 * Hash a password using Argon2id
 */
export async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password, {
    algorithm: "argon2id",
    memoryCost: 65536, // 64 MB
    timeCost: 3,
  });
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await Bun.password.verify(password, hash);
  } catch {
    // Invalid hash encoding (e.g. dummy hash for timing-safe comparison)
    return false;
  }
}
