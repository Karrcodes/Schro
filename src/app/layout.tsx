import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/Sidebar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Schrö — Personal Operating System',
  description: 'Studio Karrtesian personal finance and life management system.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Schrö',
  },
  icons: {
    apple: '/app-icon.png',
    icon: '/app-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}


import { FinanceProfileProvider } from '@/features/finance/contexts/FinanceProfileContext'
import { SystemSettingsProvider } from '@/features/system/contexts/SystemSettingsContext'
import { TasksProfileProvider } from '@/features/tasks/contexts/TasksProfileContext'
import { VaultProvider } from '@/features/vault/contexts/VaultContext'
import { StudioProvider } from '@/features/studio/context/StudioContext'
import { SecurityLock } from '@/components/SecurityLock'
import { GlobalQuickAction } from '@/components/GlobalQuickAction'
import { headers } from 'next/headers'

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') || ''
  const isLandingPage = pathname === '/home'

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Schrö" />
      </head>
      <body className={`${inter.className} bg-white text-[#0a0a0a] antialiased`}>
        <SystemSettingsProvider>
          <FinanceProfileProvider>
            <TasksProfileProvider>
              <StudioProvider>
                <VaultProvider>
                  <SecurityLock>
                    {!isLandingPage && <Sidebar />}
                    {/* main margin tracks --sidebar-w CSS var set by Sidebar component */}
                    <main className={`${!isLandingPage ? 'md:main-sidebar-offset' : ''} min-h-screen bg-white transition-[margin] duration-300`}>
                      {children}
                    </main>
                    {!isLandingPage && <GlobalQuickAction />}
                  </SecurityLock>
                </VaultProvider>
              </StudioProvider>
            </TasksProfileProvider>
          </FinanceProfileProvider>
        </SystemSettingsProvider>
      </body>
    </html>
  )
}
