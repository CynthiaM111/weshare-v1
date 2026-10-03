import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, IBM_Plex_Sans } from "next/font/google";
import { AdminSiteNotifier } from "@/components/AdminSiteNotifier";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const body = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://weshare.rw"),
  title: "WeShare — Rwanda's Ride Sharing App",
  description:
    "WeShare connects drivers and passengers across Rwanda. Find affordable rides or share your journey. Download the app today.",
  applicationName: "WeShare",
  keywords: [
    "ride sharing",
    "carpool",
    "Rwanda",
    "Kigali",
    "transport",
    "East Africa",
    "WeShare",
  ],
  authors: [{ name: "WeShare Ltd." }],
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    type: "website",
    url: "https://weshare.rw",
    title: "WeShare — Rwanda's Ride Sharing App",
    description:
      "Affordable, reliable ride sharing across Rwanda. Find rides or share your journey.",
    siteName: "WeShare",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "WeShare — Rwanda's Ride Sharing App",
      },
    ],
    locale: "en_RW",
  },
  twitter: {
    card: "summary_large_image",
    title: "WeShare — Rwanda's Ride Sharing App",
    description:
      "Affordable, reliable ride sharing across Rwanda. Download the app today.",
    images: ["/og-image.svg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="bg-black text-white antialiased font-body">
        {children}
        <AdminSiteNotifier />
      </body>
    </html>
  );
}
