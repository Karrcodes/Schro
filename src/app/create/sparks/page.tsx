'use client'

import React, { useState } from 'react'
import { Activity, Plus, Search, Users, Globe, MapPin, Grid, List as ListIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import SparksGrid from '@/features/studio/components/SparksGrid'
import CreateSparkModal from '@/features/studio/components/CreateSparkModal'

export default function SparksPage() {
    const [view, setView] = useState<'grid' | 'list'>('grid')
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    return (
        <main className="pb-24 pt-4 px-4 md:px-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-[22px] font-bold text-black tracking-tight">Studio Sparks</h1>
                        <p className="text-[12px] text-black/35 mt-0.5">Studio Module · Capture ideas, tools, and inspiration instantly</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-[12px] font-bold hover:scale-105 transition-transform shadow-lg shadow-emerald-500/20"
                        >
                            <Plus className="w-4 h-4" />
                            New Spark
                        </button>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                        <input
                            type="text"
                            placeholder="Search sparks by title or tag..."
                            value={searchQuery}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-black/[0.05] rounded-xl text-[13px] focus:outline-none focus:border-emerald-200 transition-all font-medium"
                        />
                    </div>
                    <div className="flex items-center bg-white border border-black/[0.05] rounded-xl p-1 gap-1">
                        <button
                            onClick={() => setView('grid')}
                            className={cn("p-1.5 rounded-lg transition-all", view === 'grid' ? "bg-black/5 text-black" : "text-black/20 hover:text-black/40")}
                        >
                            <Grid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setView('list')}
                            className={cn("p-1.5 rounded-lg transition-all", view === 'list' ? "bg-black/5 text-black" : "text-black/20 hover:text-black/40")}
                        >
                            <ListIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <SparksGrid searchQuery={searchQuery} />
            </div>

            <CreateSparkModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />
        </main>
    )
}
