import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { RepositoryProvider } from '@/contexts/RepositoryContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { SidebarProvider } from '@/contexts/SidebarContext'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import '../styles/toast.css'

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
        <ThemeProvider>
          <SidebarProvider>
            <RepositoryProvider>
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
            </RepositoryProvider>
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
