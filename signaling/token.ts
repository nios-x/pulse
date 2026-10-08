import { createHmac, timingSafeEqual } from "node:crypto";

// Tokens are `base64url(JSON payload).signature`, signed with SIGNALING_SECRET,
// which the Next.js app shares. `exp` is in seconds since the epoch.

export type TokenPayload = { exp: number } & Record<string, unknown>;

export function sign(payload: TokenPayload, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

/** The payload if the signature is right and it hasn't expired, otherwise null. */
export function verify(token: unknown, secret: string, nowMs = Date.now()): TokenPayload | null {
  if (typeof token !== "string" || token.length > 2048) return null;
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra !== undefined) return null;
  const expected = createHmac("sha256", secret).update(body).digest();
  const given = Buffer.from(signature, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof payload?.exp !== "number" || payload.exp * 1000 <= nowMs) return null;
    return payload as TokenPayload;
  } catch {
    return null;
  }
}
