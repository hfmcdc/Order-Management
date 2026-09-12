import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";

const inter = Inter({ subsets: ["latin"], variable: "--font-body" });
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Vaiga Order Manager",
  description: "Diwali 2026 order manager for Vaiga Sweets & Snacks",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body className="font-sans">
        <div className="min-h-screen flex flex-col md:flex-row">
          <Nav />
          <main className="flex-1 pb-20 md:pb-8 px-4 md:px-8 pt-4 md:pt-8 max-w-5xl w-full mx-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
