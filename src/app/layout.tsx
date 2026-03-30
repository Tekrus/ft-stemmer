import type { Metadata } from "next"
import { Source_Serif_4, DM_Sans, JetBrains_Mono } from "next/font/google"
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
  title: "FT Stemmer — Folketingets Afstemninger",
  description: "Overskueligt overblik over afstemninger i Folketinget",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="da">
      <body className={`${body.variable} ${heading.variable} ${mono.variable} antialiased`}>
        <main className="min-h-screen bg-background" style={{ fontVariantNumeric: "tabular-nums" }}>
          {children}
        </main>
      </body>
    </html>
  )
}
