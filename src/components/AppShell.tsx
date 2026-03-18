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
    const { leftUrl, rightUrl, focusedPane, setFocusedPane, toggleMultitasking } = useMultitasking()

    const renderPane = (pane: Pane, url: string) => {
        const isFocused = focusedPane === pane
        return (
            <div 
                className={cn(
                    "flex-1 relative transition-all duration-300 h-full overflow-hidden rounded-xl bg-white border border-black/5",
                    isFocused ? "ring-2 ring-blue-500/20 border-blue-500/30 z-10 shadow-lg" : "opacity-90 scale-[0.995]"
                )}
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
        <div className="flex h-screen w-full bg-[#f5f5f5] gap-2 p-2 relative">
            {renderPane('left', leftUrl)}
            {renderPane('right', rightUrl)}

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
    const searchParams = useSearchParams()
    const [mounted, setMounted] = React.useState(false)
    
    React.useEffect(() => {
        setMounted(true)
    }, [])
    
    // Check if we are in an iframe
    const isIframe = mounted && typeof window !== 'undefined' && window.self !== window.top
    
    // Detect minimal UI from param or iframe environment
    const isMinimal = (searchParams?.get('ui') === 'minimal') || isIframe

    if (isMinimal) {
        return <div className="min-h-screen bg-white relative">{children}</div>
    }

    if (isMultitasking && pathname !== '/home') {
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
