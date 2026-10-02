import type { Metadata } from "next";
import { Josefin_Sans, Literata, Playfair_Display, Shantell_Sans } from "next/font/google";
import "./globals.css";

// Bookish text face, like a well-thumbed paperback (see docs/design-direction.md).
const literata = Literata({
  variable: "--font-literata",
  subsets: ["latin"],
});

// Hand lettering for headings and annotations; its informality/bounce axes let the
// same face read as a tidy heading or a scrawled fridge note.
const shantell = Shantell_Sans({
  variable: "--font-shantell",
  subsets: ["latin"],
  axes: ["INFM", "BNCE"],
});

// Geometric capitals for the street-name sign and buttons, in the spirit of London enamel signs.
const josefin = Josefin_Sans({
  variable: "--font-josefin",
  subsets: ["latin"],
  weight: ["700"],
});

// High-contrast display serif for the page heading.
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "The Olive Grove", template: "%s · The Olive Grove" },
  description: "House services for The Olive Grove",
  robots: { index: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${literata.variable} ${shantell.variable} ${josefin.variable} ${playfair.variable} h-full antialiased`}>
      <body className="min-h-full font-serif">{children}</body>
    </html>
  );
}
