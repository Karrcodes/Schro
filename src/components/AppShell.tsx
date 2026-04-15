'use client'

import React, { Suspense } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { GlobalQuickAction } from '@/components/GlobalQuickAction'
import { useMultitasking, Pane } from '@/features/system/contexts/MultitaskingContext'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

import { FloatingModulePicker } from './FloatingModulePicker'
import { X } from 'lucide-react'

function SplitView() {
    const { leftUrl, rightUrl, focusedPane, setFocusedPane, toggleMultitasking, splitPosition, setSplitPosition } = useMultitasking()
    const [isResizing, setIsResizing] = React.useState(false)

    const startResizing = React.useCallback((e: React.MouseEvent) => {
        setIsResizing(true)
        e.preventDefault()
    }, [])

    const stopResizing = React.useCallback(() => {
        setIsResizing(false)
    }, [])

    const resize = React.useCallback((e: MouseEvent) => {
        if (isResizing) {
            const newSplit = (e.clientX / window.innerWidth) * 100
            if (newSplit > 20 && newSplit < 80) {
                setSplitPosition(newSplit)
            }
        }
    }, [isResizing, setSplitPosition])

    React.useEffect(() => {
        if (isResizing) {
            window.addEventListener('mousemove', resize)
            window.addEventListener('mouseup', stopResizing)
        } else {
            window.removeEventListener('mousemove', resize)
            window.removeEventListener('mouseup', stopResizing)
        }
        return () => {
            window.removeEventListener('mousemove', resize)
            window.removeEventListener('mouseup', stopResizing)
        }
    }, [isResizing, resize, stopResizing])

    const renderPane = (pane: Pane, url: string, widthPercentage: number) => {
        const isFocused = focusedPane === pane
        return (
            <div 
                className={cn(
                    "relative transition-all duration-300 h-full overflow-hidden rounded-xl bg-white border border-black/5",
                    isFocused ? "ring-2 ring-blue-500/20 border-blue-500/30 z-10 shadow-lg" : "opacity-90 scale-[0.995]"
                )}
                style={{ 
                    flex: `0 0 ${widthPercentage}%`,
                    maxWidth: `${widthPercentage}%`
                }}
                onMouseEnter={() => setFocusedPane(pane)}
            >
                {/* Floating Navigation for this pane */}
                <FloatingModulePicker pane={pane} />

                <iframe 
                    src={`${url}${url.includes('?') ? '&' : '?'}ui=minimal`}
                    className="w-full h-full border-0"
                />
            </div>
        )
    }

    return (
        <div className={cn(
            "flex h-screen w-full bg-[#f5f5f5] gap-0.5 p-2 relative",
            isResizing ? "cursor-col-resize select-none" : ""
        )}>
            {renderPane('left', leftUrl, splitPosition)}
            
            {/* Resizer Handle */}
            <div 
                onMouseDown={startResizing}
                className={cn(
                    "w-1 group relative cursor-col-resize hover:bg-blue-500/40 transition-colors z-[60]",
                    isResizing ? "bg-blue-500" : "bg-transparent"
                )}
            >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-12 bg-white/10 backdrop-blur-md rounded-full border border-black/5 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-0.5 h-3 bg-black/20 rounded-full" />
                    <div className="w-0.5 h-3 bg-black/20 rounded-full" />
                </div>
            </div>

            {renderPane('right', rightUrl, 100 - splitPosition)}

            {/* Persistent Exit Button */}
            <button
                onClick={() => toggleMultitasking()}
                className="fixed bottom-4 right-4 z-[100] px-3 py-2 bg-white/80 backdrop-blur-md border border-black/10 rounded-xl shadow-xl hover:bg-white hover:scale-105 active:scale-95 transition-all group"
                title="Exit Multitasking"
            >
                <div className="flex items-center gap-2">
                    <X className="w-3.5 h-3.5 text-black/40 group-hover:text-red-500 transition-colors" />
                    <span className="text-[11px] font-bold text-black/60 uppercase tracking-tight">Exit Multitasking</span>
                </div>
            </button>
        </div>
    )
}

import { useAuth } from '@/contexts/AuthContext'
import { usePathname } from 'next/navigation'

export function AppShell({ children, pathname }: { children: React.ReactNode, pathname: string }) {
    return (
        <Suspense fallback={null}>
            <AppShellInner pathname={pathname}>
                {children}
            </AppShellInner>
        </Suspense>
    )
}

function AppShellInner({ children, pathname }: { children: React.ReactNode, pathname: string }) {
    const { isMultitasking } = useMultitasking()
    const { user } = useAuth()
    const browserPathname = usePathname()
    const searchParams = useSearchParams()
    const [mounted, setMounted] = React.useState(false)
    
    React.useEffect(() => {
        setMounted(true)
    }, [])
    
    const currentPath = browserPathname || pathname
    
    // Check if we are in an iframe
    const isIframe = mounted && typeof window !== 'undefined' && window.self !== window.top
    
    // Detect minimal UI from param or iframe environment
    const isMinimal = (searchParams?.get('ui') === 'minimal') || isIframe

    // Pages that should NEVER have the shell
    const isShellFreePage = currentPath === '/' || currentPath === '/home' || currentPath.startsWith('/login') || currentPath.startsWith('/waitlist')

    if (isMinimal || isShellFreePage) {
        return <div className="min-h-screen bg-white relative">{children}</div>
    }

    if (isMultitasking && currentPath !== '/home') {
        return (
            <div className="flex min-h-screen bg-white">
                <div className="flex-1 h-screen overflow-hidden">
                    <SplitView />
                </div>
            </div>
        )
    }

    return (
        <>
            <Sidebar />
            <main className="md:main-sidebar-offset min-h-screen bg-white transition-[margin] duration-300">
                {children}
            </main>
            <GlobalQuickAction />
        </>
    )
}
