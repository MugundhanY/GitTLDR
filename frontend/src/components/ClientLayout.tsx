'use client'
import { RepositoryProvider } from '@/contexts/RepositoryContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { SidebarProvider } from '@/contexts/SidebarContext'
import { QnAProvider } from '@/contexts/QnAContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import '../styles/toast.css'
import { ReactQueryProvider } from '../app/react-query-provider'

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
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
  )
}
