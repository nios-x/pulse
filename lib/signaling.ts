import { sign, type TokenPayload } from "@/signaling/token";

/** Signs a token the signaling server will accept. Server-only: needs SIGNALING_SECRET. */
export function signToken(payload: TokenPayload): string {
  const secret = process.env.SIGNALING_SECRET;
  if (!secret) throw new Error("SIGNALING_SECRET is not set");
  return sign(payload, secret);
}

export const nowSeconds = () => Math.floor(Date.now() / 1000);
