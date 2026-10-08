/** A wa.me link that opens WhatsApp with the message ready to send. Client-safe. */
export function whatsappShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
