
import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Providers } from '@/components/ui/provider';
import "./globals.css"

export const metadata: Metadata = {
  title: "SunnySwap - Cross-Chain Atomic Swaps Between EVM and Stacks",
  description: "Seamlessly execute trustless atomic swaps between EVM chains and Stacks blockchain with SunnySwap. Secure, decentralized cross-chain trading.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`dark ${GeistSans.variable} ${GeistMono.variable}`}>
      <body className={`dark ${GeistSans.className}`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
