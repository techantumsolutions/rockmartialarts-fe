import type { Metadata } from 'next'
import { Poppins, Roboto,Inter,Bebas_Neue } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { RegistrationProvider } from '@/contexts/RegistrationContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { CMSProvider } from '@/contexts/CMSContext'
import { PlatformBrandingProvider } from '@/contexts/PlatformBrandingContext'
import { PlatformFavicon } from '@/components/PlatformFavicon'
import { BranchPublicBrandProvider } from '@/contexts/BranchPublicBrandContext'
import { Toaster } from '@/components/ui/toaster'
import AccessibilityProvider from '@/components/accessibility-provider'
import { FixedTopNavWrapper } from '@/components/FixedTopNavWrapper'
import { TopNavSpacer } from '@/components/TopNavSpacer'
import { RouteScrollToTop } from '@/components/layout/RouteScrollToTop'
import { WhatsAppFloatButton } from '@/components/whatsapp-float-button'
import { PageTransition } from '@/components/PageTransition'
import { GlobalImageFallback } from '@/components/ui/GlobalImageFallback'
import { ActionOverlayProvider } from '@/components/providers/ActionOverlayProvider'
import { StudentPromotionPopupHost } from '@/components/promotions/StudentPromotionPopupHost'
import './globals.css'

// Poppins: preload false — multiple weights each get a preload hint; unused weights spam the console.
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
  preload: false,
})

// Load Roboto for monospace/code (preload: false to avoid "preloaded but not used" console warnings)
const roboto = Roboto({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-roboto',
  preload: false,
})

// Load Inter (secondary sans option)
const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
  preload: false,
})
// Load Bebas Neue (display headings, bold titles, etc.)
const bebasNeue = Bebas_Neue({
  subsets: ['latin'],
  weight: '400', // Bebas Neue only has one weight
  variable: '--font-bebas',
  preload: false,
})
export const metadata: Metadata = {
  // Neutral brand default — role shells override via nested layouts.
  title: {
    default: 'Rock Martial Arts Academy',
    template: '%s | Rock Martial Arts Academy',
  },
  description:
    'Rock Martial Arts Academy — training, academies, courses, and management portals.',
  keywords: 'martial arts, karate, training, academy, rock martial arts',
  generator: 'v0.app',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${roboto.variable} ${inter.variable} ${bebasNeue.variable}`}>
      <head>
        <meta name="color-scheme" content="light" />
        <meta name="theme-color" content="#f59e0b" />
        <script src="https://checkout.razorpay.com/v1/checkout.js" async></script>
      </head>
      <body className={`font-sans ${poppins.variable}`}>
        <AccessibilityProvider>
          <AuthProvider>
            <CMSProvider>
            <PlatformBrandingProvider>
            <PlatformFavicon />
            <BranchPublicBrandProvider>
            <RegistrationProvider>
              <ActionOverlayProvider>
              <GlobalImageFallback />
              <RouteScrollToTop />
              <FixedTopNavWrapper />
              <TopNavSpacer>
                <PageTransition>{children}</PageTransition>
              </TopNavSpacer>
              <WhatsAppFloatButton />
              <StudentPromotionPopupHost />
              </ActionOverlayProvider>
            </RegistrationProvider>
            </BranchPublicBrandProvider>
            </PlatformBrandingProvider>
            </CMSProvider>
          </AuthProvider>
          <Toaster />
        </AccessibilityProvider>
        {process.env.VERCEL ? <Analytics /> : null}
      </body>
    </html>
  )
}
