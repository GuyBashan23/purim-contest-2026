import type { Metadata } from 'next'
import { Heebo } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { SoundToggle } from '@/components/sound-toggle'
import { ErrorBoundary } from '@/components/error-boundary'

const heebo = Heebo({
  subsets: ['latin', 'hebrew'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-heebo',
})

export const metadata: Metadata = {
  title: 'J&J MedTech Purim 2026 - תחרות תחפושות',
  description: 'תחרות תחפושות פורים J&J MedTech 2026',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="he" dir="rtl" className={heebo.variable}>
      <body className={`${heebo.className} antialiased min-h-[100dvh]`}>
        <ErrorBoundary>
          <div className="min-h-[100dvh] flex items-center justify-center p-4">
            <div className="w-full max-w-md mx-auto relative z-10">
              {children}
            </div>
          </div>
          <SoundToggle />
          <Toaster />
        </ErrorBoundary>
      </body>
    </html>
  )
}
