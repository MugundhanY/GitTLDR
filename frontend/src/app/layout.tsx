import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { RepositoryProvider } from '@/contexts/RepositoryContext'
import { ThemeProvider } from '@/contexts/ThemeContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GitTLDR - AI-Powered Repository Insights',
  description: 'Transform GitHub repositories into intelligent, searchable knowledge bases with AI-powered embeddings and summarization.',
  keywords: ['GitHub', 'AI', 'Repository', 'Summarization', 'Embeddings', 'Code Analysis'],
  authors: [{ name: 'GitTLDR Team' }],
  openGraph: {
    title: 'GitTLDR - AI-Powered Repository Insights',
    description: 'Transform GitHub repositories into intelligent, searchable knowledge bases',
    type: 'website',
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
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
                  // Fallback to dark mode if there's an error
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <RepositoryProvider>
            <div id="root">{children}</div>
          </RepositoryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
