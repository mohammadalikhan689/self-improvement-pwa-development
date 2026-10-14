import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Toaster } from 'sonner'
import './globals.css'
import { Splash } from '@/components/splash'

export const metadata: Metadata = {
  title: 'Small Steps — A quiet self-improvement journal',
  description: 'A gentle space to reflect, build small habits, and keep moving with intention.',
  generator: 'v0.app',
  icons: {
    icon: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Uplifting%20Growth%20App%20Icon-oLGnGRxDAPdTmFwV7JkSLmFxwBMC9u.png',
    apple: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Uplifting%20Growth%20App%20Icon-oLGnGRxDAPdTmFwV7JkSLmFxwBMC9u.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Splash />
        {children}
        <Toaster position="top-center" />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
