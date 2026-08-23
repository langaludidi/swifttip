import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./polish.css";

export const metadata: Metadata = {
  title: "SwiftTip",
  description: "Digital gratuities for verified workers with clear fees and private receipts."
};

export const viewport: Viewport = {
  themeColor: "#073e43",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
