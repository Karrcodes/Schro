'use client'

import React, { useState } from 'react'
import ContentKanban from '@/features/studio/components/ContentKanban'
import ProjectMatrix from '@/features/studio/components/ProjectMatrix'
import ContentCalendar from '@/features/studio/components/ContentCalendar'
import { cn } from '@/lib/utils'
import { LayoutGrid, Network, Calendar } from 'lucide-react'

export default function ContentPage() {
    const [view, setView] = useState<'board' | 'matrix' | 'planner'>('board')

    return (
        <main className={cn("pb-12 pt-4 px-4 md:px-8 flex flex-col", view !== 'matrix' && "flex-1")}>
            <div className={cn("mx-auto space-y-6 w-full", view === 'matrix' ? 'max-w-7xl' : 'max-w-7xl flex-1')}>

                {/* Unified Header Row — matches projects page layout */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-[22px] font-bold text-black tracking-tight">Content Pipeline</h1>
                        <p className="text-[12px] text-black/35 mt-0.5">Studio Module · Creative Production</p>
                    </div>

                    {/* View toggle */}
                    <div className="flex bg-black/[0.03] p-1 rounded-xl border border-black/[0.04] items-center gap-0.5 self-start sm:self-auto">
                        {([
                            { label: 'Board', value: 'board' as const, icon: LayoutGrid },
                            { label: 'Planner', value: 'planner' as const, icon: Calendar },
                            { label: 'Matrix', value: 'matrix' as const, icon: Network },
                        ]).map(({ label, value, icon: Icon }) => (
                            <button
                                key={value}
                                onClick={() => setView(value)}
                                className={cn(
                                    "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-tight transition-all",
                                    view === value ? 'bg-white text-black shadow-sm' : 'text-black/30 hover:text-black/60'
                                )}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Views — Kanban hides its own title since the page header covers it */}
                {view === 'board' && <ContentKanban hideHeader />}
                {view === 'matrix' && <ProjectMatrix />}
                {view === 'planner' && <ContentCalendar />}

            </div>
        </main >
    )
}
