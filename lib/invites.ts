import { randomInt } from "node:crypto";
import type { Role } from "@/db/schema";
import { createT } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { originUrl } from "@/lib/origin";
import { whatsappShareUrl } from "@/lib/whatsapp";

// No 0/O or 1/I/L, so a code read out over the phone can't be misheard.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const INVITE_TTL_HOURS = 48;

export function generateInviteCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return code;
}

export { whatsappShareUrl } from "@/lib/whatsapp";

/** The join link and a WhatsApp message for an invite, in the inviter's language. */
export async function inviteShare(input: {
  code: string;
  role: Role;
  inviterName: string;
  patientName: string;
}): Promise<{ url: string; whatsapp: string }> {
  const t = createT(await getLocale());
  const url = `${await originUrl()}/join/${input.code}`;
  const key = input.role === "owner" ? "invite.whatsappOwnerText" : "invite.whatsappText";
  const message = t(key, { name: input.inviterName, patient: input.patientName, code: input.code, url });
  return { url, whatsapp: whatsappShareUrl(message) };
}
