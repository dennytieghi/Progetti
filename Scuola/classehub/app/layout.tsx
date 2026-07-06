import type { Metadata, Viewport } from "next";
import "./globals.css";
import { it } from "@/lib/i18n/it";

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
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
