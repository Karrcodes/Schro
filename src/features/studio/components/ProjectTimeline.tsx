'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Target, Flag, Clock, CheckCircle2, AlertCircle, ArrowRight, Briefcase } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StudioProject, StudioMilestone, ProjectTimelineProps } from '../types/studio.types'
import { useStudio } from '../hooks/useStudio'


type StrategicStage = 'preparation' | 'execution' | 'extraction' | 'secured'

const STAGE_CONFIG: Record<StrategicStage, { label: string, desc: string, icon: any, color: string }> = {
    preparation: {
        label: 'Preparation',
        desc: 'Long-term planning & research',
        icon: Clock,
        color: 'text-black/40 bg-black/[0.03]'
    },
    execution: {
        label: 'Execution',
        desc: 'Active creative operations',
        icon: Target,
        color: 'text-blue-600 bg-blue-50'
    },
    extraction: {
        label: 'Extraction',
        desc: 'Critical delivery window',
        icon: AlertCircle,
        color: 'text-orange-600 bg-orange-50'
    },
    secured: {
        label: 'Secured',
        desc: 'Projects shipped & archived',
        icon: CheckCircle2,
        color: 'text-emerald-600 bg-emerald-50'
    }
}

export default function ProjectTimeline({
    onProjectClick,
    searchQuery = '',
    filterType = null,
    showArchived = false
}: ProjectTimelineProps) {
    const { projects, milestones } = useStudio()

    const groupedProjects = useMemo(() => {
        const groups: Record<StrategicStage, StudioProject[]> = {
            preparation: [],
            execution: [],
            extraction: [],
            secured: []
        }

        const filtered = projects.filter((p: StudioProject) => {
            const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.tagline?.toLowerCase().includes(searchQuery.toLowerCase())
            const matchesType = !filterType || p.type === filterType
            const archiveMatch = showArchived ? p.is_archived : !p.is_archived
            return matchesSearch && matchesType && archiveMatch
        })

        const today = new Date()
        const criticalThreshold = new Date()
        criticalThreshold.setDate(today.getDate() + 14) // 2 weeks for extraction

        filtered.forEach((project: StudioProject) => {
            if (project.status === 'shipped' || project.status === 'archived') {
                groups.secured.push(project)
                return
            }

            const projectMilestones = milestones.filter((m: StudioMilestone) => m.project_id === project.id)
            const completedCount = projectMilestones.filter((m: StudioMilestone) => m.status === 'completed').length
            const progress = projectMilestones.length > 0 ? (completedCount / projectMilestones.length) * 100 : 0

            const targetDate = project.target_date ? new Date(project.target_date) : null

            if (targetDate && targetDate <= criticalThreshold) {
                groups.extraction.push(project)
            } else if (progress > 0 || project.status === 'active') {
                groups.execution.push(project)
            } else {
                groups.preparation.push(project)
            }
        })

        return groups
    }, [projects, milestones, searchQuery, filterType])

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {(['preparation', 'execution', 'extraction', 'secured'] as StrategicStage[]).map((stageId: StrategicStage) => {
                const config = STAGE_CONFIG[stageId]
                const stageProjects = groupedProjects[stageId]

                return (
                    <div key={stageId} className="flex flex-col gap-4">
                        <div className="flex flex-col px-1">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <div className={cn("p-1.5 rounded-lg", config.color)}>
                                        <config.icon className="w-4 h-4" />
                                    </div>
                                    <h3 className="text-[14px] font-bold text-black uppercase tracking-widest">{config.label}</h3>
                                </div>
                                <span className="text-[11px] font-bold font-mono text-black/20">
                                    {stageProjects.length}
                                </span>
                            </div>
                            <p className="text-[11px] text-black/35 font-medium ml-9">{config.desc}</p>
                        </div>

                        <div className="flex flex-col gap-3 min-h-[500px] p-2 rounded-2xl bg-black/[0.02] border border-black/[0.03]">
                            {stageProjects.map((project: StudioProject) => {
                                const projectMilestones = milestones.filter((m: StudioMilestone) => m.project_id === project.id)
                                const completedCount = projectMilestones.filter(m => m.status === 'completed').length
                                const progress = projectMilestones.length > 0 ? (completedCount / projectMilestones.length) * 100 : 0

                                return (
                                    <motion.button
                                        key={project.id}
                                        layoutId={project.id}
                                        onClick={() => onProjectClick(project)}
                                        className="group relative flex flex-col w-full bg-white border border-black/[0.06] rounded-xl p-4 text-left hover:border-black/20 hover:shadow-xl hover:shadow-black/5 transition-all"
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider",
                                                project.status === 'active' ? "bg-emerald-50 text-emerald-600" : "bg-black/5 text-black/40"
                                            )}>
                                                {project.status}
                                            </span>
                                            {project.target_date && (
                                                <div className="flex items-center gap-1 text-[9px] font-bold text-black/20 uppercase">
                                                    <Clock className="w-2.5 h-2.5" />
                                                    {new Date(project.target_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                                </div>
                                            )}
                                        </div>

                                        <h4 className="text-[14px] font-bold text-black mb-1 group-hover:text-blue-600 transition-colors">
                                            {project.title}
                                        </h4>
                                        <p className="text-[11px] text-black/40 font-medium line-clamp-1 mb-3">{project.tagline || 'No tagline'}</p>

                                        <div className="mt-auto space-y-2">
                                            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tighter">
                                                <span className="text-black/35">Roadmap</span>
                                                <span className="text-black/60">{completedCount}/{projectMilestones.length}</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-black/[0.03] rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${progress}%` }}
                                                    className={cn(
                                                        "h-full transition-all duration-500",
                                                        stageId === 'secured' ? "bg-emerald-500" :
                                                            stageId === 'extraction' ? "bg-orange-500" :
                                                                "bg-blue-500"
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    </motion.button>
                                )
                            })}

                            {stageProjects.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                    <div className="w-8 h-8 rounded-full border border-dashed border-black/10 flex items-center justify-center mb-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-black/5" />
                                    </div>
                                    <p className="text-[10px] font-bold text-black/15 uppercase tracking-widest">Latent Stage</p>
                                </div>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
