import type { Metadata, Viewport } from "next";
import { Mukta } from "next/font/google";
import { I18nProvider } from "@/components/i18n-provider";
import { getLocale } from "@/lib/i18n-server";
import "./globals.css";

// Mukta covers both Devanagari and Latin, so Hindi and English share one font.
const mukta = Mukta({
  variable: "--font-mukta",
  subsets: ["devanagari", "latin"],
  weight: ["400", "500", "600", "700"],
});

// Every screen depends on the language cookie and the signed-in user,
// so the app renders per request instead of from a static shell.
export const instant = false;

export const metadata: Metadata = {
  title: "Pulse",
  description: "Sugar care for the whole family",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1b6f73",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${mukta.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-base">
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
