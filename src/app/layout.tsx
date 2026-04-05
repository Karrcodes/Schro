import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/Sidebar'
import { BugHerd } from '@/components/BugHerd'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Schrö — Life Management System',
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
import { FinanceAdvisorProvider } from '@/features/finance/contexts/FinanceAdvisorContext'
import { SystemSettingsProvider } from '@/features/system/contexts/SystemSettingsContext'
import { TasksProfileProvider } from '@/features/tasks/contexts/TasksProfileContext'
import { VaultProvider } from '@/features/vault/contexts/VaultContext'
import { StudioProvider } from '@/features/studio/context/StudioContext'
import { MultitaskingProvider } from '@/features/system/contexts/MultitaskingContext'
import { SecurityLock } from '@/components/SecurityLock'
import { GlobalQuickAction } from '@/components/GlobalQuickAction'
import { AuthProvider } from '@/contexts/AuthContext'
import { WellbeingProvider } from '@/features/wellbeing/contexts/WellbeingContext'
import { TasksProvider } from '@/features/tasks/contexts/TasksContext'
import { GroceryLibraryProvider } from '@/features/tasks/contexts/GroceryLibraryContext'
import { GoalsProvider } from '@/features/goals/contexts/GoalsContext'
import { headers } from 'next/headers'
import { AppShell } from '@/components/AppShell'

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') || ''
  // Pages that don't use the main app shell (sidebar, security lock, etc.)
  const isShellFreePage = pathname === '/home' || pathname.startsWith('/login') || pathname.startsWith('/waitlist')

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Schrö" />
      </head>
      <body className={`${inter.className} bg-white text-[#0a0a0a] antialiased`}>
        <AuthProvider>
          <SystemSettingsProvider>
            <FinanceProfileProvider>
              <FinanceAdvisorProvider>
                <TasksProfileProvider>
                  <StudioProvider>
                    <TasksProvider>
                      <GroceryLibraryProvider>
                        <GoalsProvider>
                          <VaultProvider>
                            <WellbeingProvider>
                              <MultitaskingProvider>
                                {isShellFreePage ? (
                                  <>{children}</>
                                ) : (
                                  <SecurityLock>
                                    <AppShell pathname={pathname}>
                                      {children}
                                    </AppShell>
                                  </SecurityLock>
                                )}
                              </MultitaskingProvider>
                            </WellbeingProvider>
                          </VaultProvider>
                        </GoalsProvider>
                      </GroceryLibraryProvider>
                    </TasksProvider>
                  </StudioProvider>
                </TasksProfileProvider>
              </FinanceAdvisorProvider>
            </FinanceProfileProvider>
          </SystemSettingsProvider>
        </AuthProvider>
        <BugHerd />
      </body>
    </html>
  )
}
