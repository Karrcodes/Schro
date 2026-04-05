'use client'

import React from 'react'
import { LayoutGrid, Calendar, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type GoalsView = 'matrix' | 'timeline'

interface GoalsViewSwitcherProps {
    currentView: GoalsView
    onViewChange: (view: GoalsView) => void
}

export default function GoalsViewSwitcher({ currentView, onViewChange }: GoalsViewSwitcherProps) {
    const views = [
        { id: 'matrix', label: 'The Matrix', icon: LayoutGrid },
        { id: 'timeline', label: 'The Timeline', icon: Calendar },
    ] as const

    return (
        <div className="flex items-center bg-black/[0.03] p-1 rounded-xl border border-black/[0.05]">
            {views.map((view) => (
                <button
                    key={view.id}
                    onClick={() => onViewChange(view.id)}
                    className={cn(
                        "flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg text-[13px] font-bold transition-all relative",
                        currentView === view.id
                            ? "bg-white text-black shadow-sm"
                            : "text-black/40 hover:text-black/60 hover:bg-black/[0.02]"
                    )}
                >
                    <view.icon className={cn("w-4 h-4", currentView === view.id ? "text-black" : "text-black/40")} />
                    <span className="hidden lg:block">{view.label}</span>
                </button>
            ))}
        </div>
    )
}
