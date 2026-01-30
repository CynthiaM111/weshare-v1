import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import dynamic from "next/dynamic";

// Dynamically import Navigation to reduce initial bundle size
const Navigation = dynamic(() => import("@/components/Navigation"), {
  ssr: true,
  loading: () => <div className="h-16 bg-white border-b border-gray-200" />,
});

// Dynamically import Toaster to reduce initial bundle size
const Toaster = dynamic(() => import("sonner").then((mod) => mod.Toaster), {
  ssr: false,
});

const poppins = Poppins({ 
  subsets: ["latin"],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  title: "WeShare - Carpooling & Bus Ticketing",
  description: "Connect drivers with passengers and book inter-city bus tickets",
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={poppins.className}>
        <Navigation />
        {children}
        <Toaster position="top-center" closeButton richColors />
      </body>
    </html>
  );
}

