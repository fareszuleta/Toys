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
  const schema = {
    "@context": "https://schema.org",
    "@type": "Store",
    "name": "Playroom Toys",
    "description": "A happy little place for big imaginations. Discover playful toys, thoughtful gifts, and better-together bundles.",
    "url": "https://playroom-toys.onrender.com",
    "foundingDate": "2019",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "2847 NW Everett St, Suite 200",
      "addressLocality": "Portland",
      "addressRegion": "OR",
      "postalCode": "97210",
      "addressCountry": "US"
    },
    "currenciesAccepted": "USD",
    "paymentAccepted": "Credit Card",
    "priceRange": "$$",
    "openingHours": "Mo-Fr 09:00-17:00"
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="https://js.stripe.com/v3/" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
