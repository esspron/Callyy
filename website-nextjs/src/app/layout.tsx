import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Voicory - Voice AI Agents for India',
  description: 'Build intelligent voice AI agents that speak Hindi, English, and 10+ Indian languages. Perfect for customer service, appointment setting, lead qualification, and more.',
  keywords: ['voice AI', 'AI agents', 'India', 'Hindi AI', 'customer service automation', 'voice bot'],
  authors: [{ name: 'Voicory' }],
  openGraph: {
    title: 'Voicory - Voice AI Agents for India',
    description: 'Build intelligent voice AI agents that speak Hindi, English, and 10+ Indian languages.',
    url: 'https://voicory.com',
    siteName: 'Voicory',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Voicory - Voice AI Agents for India',
    description: 'Build intelligent voice AI agents that speak Hindi, English, and 10+ Indian languages.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
