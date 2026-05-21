import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { ProfileProvider } from '@/lib/profile-context'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })

export const metadata: Metadata = {
  title: 'Clarity – Community',
  description: 'The Clarity Community Platform.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body
        className="min-h-full antialiased"
        style={{ backgroundColor: '#F2F2F7', color: '#111827', margin: 0 }}
      >
        <ProfileProvider>{children}</ProfileProvider>
      </body>
    </html>
  )
}
