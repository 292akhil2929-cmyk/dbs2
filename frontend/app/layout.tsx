import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShopSphere — Premium Tech, Delivered",
  description:
    "Discover hand-picked audio, peripherals, and workspace gear. Free shipping on orders over AED 200.",
  keywords: ["tech", "audio", "peripherals", "e-commerce", "UAE"],
  openGraph: {
    title: "ShopSphere",
    description: "Premium Tech, Delivered.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
