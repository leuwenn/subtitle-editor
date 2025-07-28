import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { useId } from "react";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://subtitle-editor.org"),
  title: {
    template: "%s | Éditeur de sous-titre Ouide", // Page title will replace %s
    default: "Éditeur de sous-titre Ouide", // Default title for root layout
  },
  description:
    "Edit, create, and align SRT subtitle and captions files easily with this free, open-source, web-based editor. Features video preview and waveform visualization. No signup required.",
  icons: "/badge-cc.svg", // Set the favicon
  // Add Open Graph tags
  openGraph: {
    // title: Will use title.default or template from above
    // description: Will use the main description from above
    url: "https://subtitle-editor.org",
    siteName: "Éditeur de sous-titre Ouide",
    images: [
      {
        url: "/badge-cc.svg", // Placeholder - recommend replacing with PNG/JPG 1200x630 later
      },
    ],
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const googleAdsId = useId();
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
