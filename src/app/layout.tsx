import type { Metadata } from "next";
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
  title: { default: "The Olive Grove", template: "%s · The Olive Grove" },
  description: "House services for The Olive Grove",
  robots: { index: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${literata.variable} ${marcellus.variable} ${josefin.variable} h-full antialiased`}>
      <body className="min-h-full font-serif">{children}</body>
    </html>
  );
}
