import type { Metadata } from "next"
import { Source_Serif_4, DM_Sans, JetBrains_Mono } from "next/font/google"
import { SiteHeader } from "@/components/site-header"
import "./globals.css"

const heading = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
})

const body = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: "FT Stemmer | Folketingets Afstemninger",
  description: "Overskueligt overblik over afstemninger i Folketinget",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="da">
      <body
        className={`${body.variable} ${heading.variable} ${mono.variable} antialiased`}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:shadow-elevated"
        >
          Spring til indhold
        </a>
        <SiteHeader />
        <main id="main-content" className="min-h-[calc(100vh-3.5rem)] bg-background">
          {children}
        </main>
      </body>
    </html>
  )
}
