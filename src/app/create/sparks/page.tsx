'use client'

import React, { useState } from 'react'
import { Activity, Plus, Search, Users, Globe, MapPin, LayoutDashboard, List as ListIcon, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import SparksGrid from '@/features/studio/components/SparksGrid'
import CreateSparkModal from '@/features/studio/components/CreateSparkModal'

export default function SparksPage() {
    const [view, setView] = useState<'focused' | 'list'>('focused')
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    return (
        <main className="pb-12 pt-8 md:pt-10 px-6 md:px-10 flex flex-col min-h-screen">
            <div className="mx-auto space-y-10 w-full max-w-7xl">
                {/* Row 1: Header */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-1">
                        <h2 className="text-[11px] font-black text-orange-500 uppercase tracking-[0.3em]">Creative Protocol</h2>
                        <h1 className="text-4xl font-black text-black tracking-tighter uppercase grayscale">Tools Inbox</h1>
                    </div>

                    <div className="flex bg-black/[0.03] p-1.5 rounded-2xl border border-black/[0.05] items-center gap-0.5 h-fit mb-1">
                        {[
                            { label: 'Focused', value: 'focused' as const, icon: LayoutDashboard },
                            { label: 'List', value: 'list' as const, icon: ListIcon },
                        ].map(({ label, value, icon: Icon }) => (
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
                </header>

                {/* Row 2: Search */}
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                    <input
                        type="text"
                        placeholder="Search tools..."
                        value={searchQuery}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-black/[0.05] rounded-xl text-[13px] focus:outline-none focus:border-orange-200 transition-all font-medium"
                    />
                </div>

                {/* Row 4: Filters and Add (Rendered within SparksGrid) */}
                <SparksGrid
                    searchQuery={searchQuery}
                    view={view}
                    renderAddButton={() => (
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-xl text-[12px] font-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-black/10 self-start sm:self-auto"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden xs:inline">Add Tool</span>
                            <span className="xs:hidden">Add</span>
                        </button>
                    )}
                />
            </div>

            <CreateSparkModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />
        </main>
    )
}
