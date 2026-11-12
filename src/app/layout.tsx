import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://chatdesk.example"),
  title: { default: "ChatDesk — WhatsApp CRM for tiny teams", template: "%s" },
  description: "The simplest CRM for micro-businesses. Manage contacts, follow-ups and sales right from WhatsApp. Set up in 2 minutes.",
  openGraph: { title: "ChatDesk — WhatsApp CRM for tiny teams", description: "Contacts, follow-ups and sales for small teams, built around WhatsApp.", type: "website" },
  twitter: { card: "summary", title: "ChatDesk — WhatsApp CRM for tiny teams" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col"><StoreProvider>{children}</StoreProvider></body>
    </html>
  );
}
