'use client'

import React, { useState } from 'react'
import ProjectKanban from '@/features/studio/components/ProjectKanban'
import ProjectMatrix from '@/features/studio/components/ProjectMatrix'
import ProjectTimeline from '@/features/studio/components/ProjectTimeline'
import CreateProjectModal from '@/features/studio/components/CreateProjectModal'
import ProjectDetailModal from '@/features/studio/components/ProjectDetailModal'
import { useStudio } from '@/features/studio/hooks/useStudio'
import { Plus, Search, Filter, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StudioProject } from '@/features/studio/types/studio.types'

export default function ProjectsPage() {
    const { error } = useStudio()
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [view, setView] = useState<'board' | 'matrix' | 'timeline'>('board')
    const [selectedProject, setSelectedProject] = useState<StudioProject | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterType, setFilterType] = useState<string | null>(null)
    const [showArchived, setShowArchived] = useState(false)

    return (
        <main className={cn("pb-12 pt-4 px-4 md:px-8 flex flex-col", view !== 'matrix' && "flex-1")}>
            <div className={cn("mx-auto space-y-6 w-full", view === 'matrix' ? 'max-w-7xl' : 'max-w-7xl flex-1')}>
                {error && error.includes('relation') && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex flex-col gap-2">
                        <p className="text-[13px] font-bold text-red-900">Database Tables Missing</p>
                        <p className="text-[11px] text-red-800/60">It looks like the Studio module tables haven't been created yet. Please execute the SQL migration script in your Supabase dashboard.</p>
                    </div>
                )}
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div>
                            <h1 className="text-[22px] font-bold text-black tracking-tight">Project Pipeline</h1>
                            <p className="text-[12px] text-black/35 mt-0.5">Studio Module · Strategic Development</p>
                        </div>
                        <button
                            onClick={() => setShowArchived(!showArchived)}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border",
                                showArchived
                                    ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20"
                                    : "bg-black/[0.03] text-black/30 border-transparent hover:border-black/10 hover:text-black/60"
                            )}
                        >
                            <Shield className={cn("w-3 h-3", showArchived ? "text-white" : "text-black/20")} />
                            {showArchived ? 'Viewing Archives' : 'View Archives'}
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex bg-black/[0.03] p-1 rounded-xl border border-black/[0.04] items-center">
                            {(['board', 'matrix', 'timeline'] as const).map((v) => (
                                <button
                                    key={v}
                                    onClick={() => setView(v)}
                                    className={cn(
                                        "px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-tight transition-all",
                                        view === v ? 'bg-white text-black shadow-sm' : 'text-black/30 hover:text-black/60'
                                    )}
                                >
                                    {v}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-xl text-[12px] font-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-black/10"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden xs:inline">New Project</span>
                            <span className="xs:hidden">Add</span>
                        </button>
                    </div>
                </div>

                {/* Filters & Search */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                        <input
                            type="text"
                            placeholder="Search projects..."
                            value={searchQuery}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-black/[0.05] rounded-xl text-[13px] focus:outline-none focus:border-orange-200 transition-all font-medium"
                        />
                    </div>
                    <div className="flex bg-black/[0.03] p-1 rounded-xl border border-black/[0.04] items-center">
                        {[null, 'Architectural Design', 'Technology', 'Media', 'Fashion'].map((type) => (
                            <button
                                key={type || 'all'}
                                onClick={() => setFilterType(type)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all",
                                    filterType === type ? 'bg-white text-black shadow-sm' : 'text-black/30 hover:text-black/60'
                                )}
                            >
                                {type || 'All'}
                            </button>
                        ))}
                    </div>
                </div>

                {view === 'board' && <ProjectKanban searchQuery={searchQuery} filterType={filterType} showArchived={showArchived} />}
                {view === 'matrix' && <ProjectMatrix searchQuery={searchQuery} filterType={filterType} showArchived={showArchived} />}
                {view === 'timeline' && <ProjectTimeline onProjectClick={setSelectedProject} searchQuery={searchQuery} filterType={filterType} showArchived={showArchived} />}
            </div>

            <CreateProjectModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />

            <ProjectDetailModal
                isOpen={!!selectedProject}
                onClose={() => setSelectedProject(null)}
                project={selectedProject}
            />
        </main >
    )
}
