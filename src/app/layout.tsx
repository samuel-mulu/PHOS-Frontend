import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import { Providers } from "./providers";
import "./globals.css";
import { APP_NAME } from "@/lib/constants";
import { APPEARANCE_BOOT_SCRIPT } from "@/lib/appearance";

// Geist fonts are bundled locally (src/app/fonts) so production builds
// never need internet access to fonts.googleapis.com / fonts.gstatic.com.
const geistSans = localFont({
  src: "./fonts/GeistVF.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "Arial", "sans-serif"],
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
  fallback: ["ui-monospace", "Consolas", "Courier New", "monospace"],
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Perfect Health Operating System - clinic workstation",
  icons: {
    icon: [{ url: "/logo.png", type: "image/png" }],
    shortcut: ["/logo.png"],
    apple: [{ url: "/logo.png", type: "image/png" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <Script
          id="phos-appearance-boot"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: APPEARANCE_BOOT_SCRIPT }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
