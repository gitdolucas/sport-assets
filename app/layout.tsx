import type { Metadata } from 'next'
import { Geist, Geist_Mono, Syne } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const syne = Syne({
  variable: '--font-syne',
  subsets: ['latin'],
  weight: ['700', '800'],
})

export const metadata: Metadata = {
  title: 'Sport Assets – 3D Sport Ball Background',
  description:
    'Reusable 3D sport-ball background component (React Three Fiber + Rapier). Physics-based interactive background with instanced sport ball models.',
  openGraph: {
    title: 'Sport Assets – 3D Sport Ball Background',
    description:
      'Reusable 3D sport-ball background component (React Three Fiber + Rapier). Physics-based interactive background with instanced sport ball models.',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${syne.variable}`}>
      <body className="min-h-screen font-sans antialiased">{children}<Analytics /></body>
    </html>
  )
}
