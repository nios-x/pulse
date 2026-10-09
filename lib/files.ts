export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const ACCEPTED_UPLOADS = "application/pdf,image/jpeg,image/png,image/webp";

/** Detects the real file type from its first bytes; never trust the browser's label. */
export function detectFileType(b: Uint8Array): string | null {
  if (b.length < 12) return null;
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return "application/pdf"; // %PDF
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  return null;
}
