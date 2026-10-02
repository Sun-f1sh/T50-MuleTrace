import type { Metadata } from "next";
import localFont from "next/font/local";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/hooks/useTheme";
import "@/styles/globals.css";

const urbanist = localFont({
  src: "../fonts/Urbanist-Variable.woff2",
  variable: "--font-urbanist",
  weight: "100 900",
  style: "normal",
  display: "swap",
});

const plexMono = localFont({
  src: [
    { path: "../fonts/IBMPlexMono-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/IBMPlexMono-Medium.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MuleTrace — Trace the money",
  description:
    "MuleTrace turns transaction data into an investigation you can understand. Detection, risk, network, timeline, decision, audit.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${urbanist.variable} ${plexMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="bg-bg font-sans text-ink antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
