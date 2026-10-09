import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/providers/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f4" },
    { media: "(prefers-color-scheme: dark)", color: "#141a20" },
  ],
};

// Applies the saved theme (or the OS preference) before first paint, so there is no flash.
const themeScript = `(function(){try{var t=localStorage.getItem('pulse-theme');var d=t==='dark'||((!t||t==='system')&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh">
        <TooltipProvider delay={150}>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
