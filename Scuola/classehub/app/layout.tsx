import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { it } from "@/lib/i18n/it";

// Font del redesign (docs/DESIGN.md §Tipografia). Le variabili sono
// riferite in globals.css (@theme --font-display / --font-body); i
// componenti non le usano ancora, quindi l'aspetto non cambia.
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-space-grotesk",
});
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: it.app.name,
  description: it.app.tagline,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <body
        className={`${spaceGrotesk.variable} ${inter.variable} min-h-screen antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
