import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { DocumentsSidebar } from '@/components/shell/documentsSidebar'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'TweakDoc',
  description:
    'Merge a Notion-style editor with a linked spreadsheet to batch-generate personalized PDFs',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full">
        <DocumentsSidebar />
        <main className="flex-1 overflow-hidden">{children}</main>
        <Toaster />
      </body>
    </html>
  )
}
