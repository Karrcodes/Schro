'use client'

import React, { useState } from 'react'
import ProjectKanban from '@/features/studio/components/ProjectKanban'
import ProjectMatrix from '@/features/studio/components/ProjectMatrix'
import ProjectRoadmap from '@/features/studio/components/ProjectRoadmap'
import CreateProjectModal from '@/features/studio/components/CreateProjectModal'
import ProjectDetailModal from '@/features/studio/components/ProjectDetailModal'
import { useStudio } from '@/features/studio/hooks/useStudio'
import { Search, Shield, LayoutGrid, Network, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StudioProject } from '@/features/studio/types/studio.types'

export default function ProjectsPage() {
    const { projects, error } = useStudio()
    const [view, setView] = useState<'board' | 'matrix' | 'timeline'>('board')
    const [selectedProject, setSelectedProject] = useState<StudioProject | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [showArchived, setShowArchived] = useState(false)
    const [sortBy, setSortBy] = useState<'priority' | 'impact' | 'date'>('priority')

    return (
        <main className="pb-20 pt-8 md:pt-10 px-6 md:px-10 flex flex-col flex-1">
            <div className="mx-auto space-y-8 w-full max-w-7xl flex-1">
                {error && error.includes('relation') && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex flex-col gap-2">
                        <p className="text-[13px] font-bold text-red-900">Database Tables Missing</p>
                        <p className="text-[11px] text-red-800/60">It looks like the Studio module tables haven't been created yet. Please execute the SQL migration script in your Supabase dashboard.</p>
                    </div>
                )}
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-1">
                        <h2 className="text-[11px] font-black text-orange-500 uppercase tracking-[0.3em]">Creative Protocol</h2>
                        <h1 className="text-4xl font-black text-black tracking-tighter uppercase grayscale">Project Pipeline</h1>
                    </div>

                    <div className="flex items-center gap-3 self-start sm:self-auto mb-1">
                        <button
                            onClick={() => setShowArchived(!showArchived)}
                            className={cn(
                                "flex items-center gap-2 px-4 h-[42px] rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border shrink-0",
                                showArchived
                                    ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20"
                                    : "bg-black/[0.03] text-black/30 border-transparent hover:border-black/10 hover:text-black/60"
                            )}
                        >
                            <Shield className={cn("w-3.5 h-3.5", showArchived ? "text-white" : "text-black/20")} />
                            {showArchived ? 'Archives' : 'View Archives'}
                        </button>

                        {/* View toggle */}
                        <div className="flex bg-black/[0.03] p-1.5 rounded-2xl border border-black/[0.05] items-center gap-0.5 h-[42px]">
                            {[
                                { label: 'Board', value: 'board' as const, icon: LayoutGrid },
                                { label: 'Timeline', value: 'timeline' as const, icon: Clock },
                            ].map(({ label, value, icon: Icon }) => (
                                <button
                                    key={value}
                                    onClick={() => setView(value)}
                                    className={cn(
                                        "items-center gap-1.5 px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-tight transition-all",
                                        view === value ? 'bg-white text-black shadow-sm' : 'text-black/30 hover:text-black/60',
                                        value === 'board' ? 'flex' : 'hidden sm:flex'
                                    )}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    <span className={value !== 'board' ? "hidden sm:inline" : ""}>{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Row 2: Search */}
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                    <input
                        type="text"
                        placeholder="Search projects..."
                        value={searchQuery}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-black/[0.05] rounded-xl text-[13px] focus:outline-none focus:border-orange-200 transition-all font-medium"
                    />
                </div>

                {/* Row 3 & 4: Filters and Add */}
                <div className="flex flex-col gap-4">
                    {/* Sort By row - Positioned above categories */}
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-black/20 ml-2">Sort By</span>
                        <div className="flex items-center gap-1.5 p-1 bg-black/[0.03] rounded-xl border border-black/5 w-fit">
                            {(['priority', 'impact', 'date'] as const).map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => setSortBy(mode)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                        sortBy === mode
                                            ? "bg-white text-black shadow-sm ring-1 ring-black/5"
                                            : "text-black/30 hover:text-black/60"
                                    )}
                                >
                                    {mode}
                                </button>
                            ))}
                        </div>
                    </div>


                </div>

                {view === 'board' && <ProjectKanban searchQuery={searchQuery} showArchived={showArchived} sortBy={sortBy} />}
                {view === 'timeline' && <ProjectRoadmap onProjectClick={setSelectedProject} searchQuery={searchQuery} showArchived={showArchived} sortBy={sortBy} />}
            </div>

            <ProjectDetailModal
                isOpen={!!selectedProject}
                onClose={() => setSelectedProject(null)}
                project={selectedProject}
            />
        </main >
    )
}
