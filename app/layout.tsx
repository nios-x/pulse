import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "@/components/providers/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const jakarta = Plus_Jakarta_Sans({ variable: "--font-display", subsets: ["latin"], weight: ["600", "700", "800"] });

export const metadata: Metadata = {
  title: { default: "Pulse · Family health, in one place", template: "%s · Pulse" },
  description:
    "One place for a family to manage everyone's health: records, medicines, appointments and emergency info, with role-based access for each member.",
  applicationName: "Pulse",
  icons: { icon: "/icons/pulse.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f7f5fb",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} ${jakarta.variable}`}>
      <body className="min-h-dvh">
        <TooltipProvider delay={150}>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
