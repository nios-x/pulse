import "server-only";
import QRCode from "qrcode";

/** QR code as an inline SVG string (black on white, so any phone camera can read it). */
export async function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, { type: "svg", errorCorrectionLevel: "M", margin: 1, color: { dark: "#000000", light: "#ffffff" } });
}
