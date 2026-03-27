import type { Metadata } from "next";
import { Instrument_Serif, Space_Grotesk } from "next/font/google";
import "@/app/globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { SiteHeader } from "@/components/site-header";
import { ToastProvider } from "@/components/toast-provider";

const displayFont = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400"]
});

const bodyFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-body"
});

export const metadata: Metadata = {
  title: "Smart Expense",
  description: "Frontend for the smart expense backend"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${displayFont.variable} ${bodyFont.variable}`}
        style={{ fontFamily: "var(--font-body)" }}
      >
        <AuthProvider>
          <ToastProvider>
            <SiteHeader />
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
