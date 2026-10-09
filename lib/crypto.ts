import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Health record files are encrypted at rest with AES-256-GCM.
 * Layout: iv (12 bytes) | auth tag (16 bytes) | ciphertext.
 * The key comes from ENCRYPTION_KEY (64 hex chars). Without it, a development key
 * derived from a fixed string is used and a warning is logged once.
 */

let warned = false;

function key(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (hex && /^[0-9a-f]{64}$/i.test(hex)) return Buffer.from(hex, "hex");
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_DEV_ENCRYPTION_KEY) {
    throw new Error("ENCRYPTION_KEY (64 hex characters) must be set in production");
  }
  if (!warned) {
    warned = true;
    console.warn("ENCRYPTION_KEY is not set; using a development key. Do not use real health data.");
  }
  return createHash("sha256").update("pulse-development-key").digest();
}

export function encrypt(plain: Buffer): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]);
}

export function decrypt(blob: Buffer): Buffer {
  const iv = blob.subarray(0, 12);
  const tag = blob.subarray(12, 28);
  const body = blob.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]);
}

/** URL-safe random token, e.g. for share links and sessions. */
export function randomToken(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Short, unambiguous invite code (no 0/O/1/I). */
export function inviteCode(length = 6): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(length);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}
