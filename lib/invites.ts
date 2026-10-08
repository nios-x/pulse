import { randomInt } from "node:crypto";

// No 0/O or 1/I/L, so a code read out over the phone can't be misheard.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const INVITE_TTL_HOURS = 48;

export function generateInviteCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return code;
}

export function whatsappShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
