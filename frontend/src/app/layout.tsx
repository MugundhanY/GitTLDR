'use client'
import { Inter } from 'next/font/google'
import './globals.css'
import { RepositoryProvider } from '@/contexts/RepositoryContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { SidebarProvider } from '@/contexts/SidebarContext'
import { QnAProvider } from '@/contexts/QnAContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import '../styles/toast.css'
import { ReactQueryProvider } from './react-query-provider'
import { Metadata } from 'next'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://gittldr.vercel.app'),
  title: {
    default: 'GitTLDR - AI-Powered Git Repository Analytics & Meeting Intelligence',
    template: '%s | GitTLDR'
  },
  description: 'GitTLDR transforms your Git repositories with AI-powered analytics, automated meeting summaries, and intelligent code insights. Track commits, analyze trends, and boost productivity with comprehensive repository intelligence.',
  keywords: [
    'GitTLDR',
    'Git analytics',
    'repository analytics',
    'AI code analysis',
    'meeting intelligence',
    'commit tracking',
    'code insights',
    'developer productivity',
    'GitHub analytics',
    'Git repository dashboard',
    'AI meeting summaries',
    'code review analytics',
    'developer metrics',
    'Git visualization',
    'repository intelligence'
  ],
  authors: [{ name: 'GitTLDR Team' }],
  creator: 'GitTLDR',
  publisher: 'GitTLDR',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://gittldr.vercel.app',
    title: 'GitTLDR - AI-Powered Git Repository Analytics & Meeting Intelligence',
    description: 'Transform your Git repositories with AI-powered analytics, automated meeting summaries, and intelligent code insights. Boost developer productivity with comprehensive repository intelligence.',
    siteName: 'GitTLDR',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'GitTLDR - AI-Powered Git Repository Analytics',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GitTLDR - AI-Powered Git Repository Analytics',
    description: 'Transform your Git repositories with AI-powered analytics and meeting intelligence.',
    images: ['/og-image.png'],
    creator: '@gittldr',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
    yandex: 'your-yandex-verification-code',
    yahoo: 'your-yahoo-verification-code',
  },
  alternates: {
    canonical: 'https://gittldr.vercel.app',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Favicon and App Icons */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        
        {/* Theme and Viewport */}
        <meta name="theme-color" content="#07090E" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* Preload critical resources */}
        <link rel="preload" href="/GitTLDR_logo.png" as="image" />
        
        {/* Google Analytics - Replace GA_MEASUREMENT_ID with your actual ID */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-CX4BBZMVDL"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());

              gtag('config', 'G-CX4BBZMVDL');
            `,
          }}
        />
        
        {/* Structured Data for GitTLDR */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "GitTLDR",
              "applicationCategory": "DeveloperApplication",
              "operatingSystem": "Web",
              "description": "AI-powered Git repository analytics and meeting intelligence platform that transforms code insights and boosts developer productivity.",
              "url": "https://gittldr.vercel.app",
              "author": {
                "@type": "Organization",
                "name": "GitTLDR Team"
              },
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "5.0",
                "ratingCount": "1"
              }
            })
          }}
        />
        
        {/* Theme Detection Script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function() {
              try {
                var theme = localStorage.getItem('theme') || 'system';
                var isDark = false;
                
                if (theme === 'dark') {
                  isDark = true;
                } else if (theme === 'system') {
                  isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                }
                
                if (isDark) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {
                document.documentElement.classList.add('dark');
              }
            })();`,
          }}
        />
      </head>
      <body className={inter.className}>
        <ReactQueryProvider>
          <ThemeProvider>
            <SidebarProvider>
              <RepositoryProvider>
                <QnAProvider>
                  <NotificationProvider>
                    <div id="root">{children}</div>
                    <ToastContainer
                      position="bottom-right"
                      autoClose={3000}
                      hideProgressBar={false}
                      newestOnTop={false}
                      closeOnClick
                      rtl={false}
                      pauseOnFocusLoss
                      draggable
                      pauseOnHover
                      theme="light"
                    />
                  </NotificationProvider>
                </QnAProvider>
              </RepositoryProvider>
            </SidebarProvider>
          </ThemeProvider>
        </ReactQueryProvider>
      </body>
    </html>
  )
}
