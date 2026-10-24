import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import SplashScreen from "@/components/SplashScreen";
import MotionProvider from "@/components/motion/MotionProvider";
import PageShell from "@/components/PageShell";

const inter = Inter({ subsets: ["latin"], variable: "--font-body" });
// Playfair Display: a serif with real editorial weight — reads as a premium
// gifting/sweets brand rather than the generic-SaaS feel of a geometric
// grotesk like the previous Poppins.
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Vaiga Order Manager",
  description: "Diwali 2026 order manager for Vaiga Sweets & Snacks",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Vaiga",
  },
};

export const viewport: Viewport = {
  themeColor: "#14100E",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="font-sans">
        <MotionProvider>
          <SplashScreen />
          <div className="min-h-screen flex flex-col md:flex-row">
            <Nav />
            <PageShell>{children}</PageShell>
          </div>
        </MotionProvider>
      </body>
    </html>
  );
}
