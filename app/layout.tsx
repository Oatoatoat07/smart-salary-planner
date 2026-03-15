import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Salary Planner & Budget - Premium',
  description: 'Smart Thai salary and budget planner with auto-categorization.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-100 text-slate-800 min-h-screen`}>
        {children}
      </body>
    </html>
  )
}
