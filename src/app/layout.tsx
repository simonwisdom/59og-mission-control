import type { Metadata, Viewport } from "next";
import { Josefin_Sans, Literata, Marcellus } from "next/font/google";
import "./globals.css";

// Bookish text face, like a well-thumbed paperback (see docs/design-direction.md).
const literata = Literata({
  variable: "--font-literata",
  subsets: ["latin"],
});

// Carved Roman capitals standing in for Kindersley's London street-nameplate lettering;
// used for the nameplate and headings.
const marcellus = Marcellus({
  variable: "--font-marcellus",
  subsets: ["latin"],
  weight: "400",
});

// Geometric capitals for small labels, the top bar and buttons.
const josefin = Josefin_Sans({
  variable: "--font-josefin",
  subsets: ["latin"],
  weight: ["700"],
});

export const metadata: Metadata = {
  // Link previews need the image's full address; APP_URL is the site's public address on Railway
  metadataBase: process.env.APP_URL ? new URL(process.env.APP_URL) : undefined,
  title: { default: "The Olive Grove", template: "%s · The Olive Grove" },
  description: "A shared house in Finsbury Park, London",
  openGraph: { siteName: "The Olive Grove", locale: "en_GB", type: "website" },
  robots: { index: false },
};

// Tints the browser bar navy to match the top bar
export const viewport: Viewport = { themeColor: "#16325c" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${literata.variable} ${marcellus.variable} ${josefin.variable} h-full antialiased`}>
      <body className="min-h-full font-serif">{children}</body>
    </html>
  );
}
