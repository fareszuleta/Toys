import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Playroom — Small toys. Big adventures.",
  description: "A happy little place for big imaginations. Discover playful toys, thoughtful gifts, and better-together bundles. Prices in USD.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
