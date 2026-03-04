'use client'

import React, { useMemo, useRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Clock, Circle, CheckCircle2, ArrowRight, Zap, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StudioProject, StudioMilestone, ProjectTimelineProps } from '../types/studio.types'
import { useStudio } from '../hooks/useStudio'

interface MonthHeader {
    name: string
    isNewYear: boolean
    yearLabel: string
    offset: number
}

const ROW_HEIGHT = 64 // px

type ViewRange = '1m' | '3m' | '6m' | '1y'

export default function ProjectRoadmap({
    onProjectClick,
    searchQuery = '',
    filterType = null,
    showArchived = false
}: ProjectTimelineProps) {
    const { projects, milestones } = useStudio()
    const scrollRef = useRef<HTMLDivElement>(null)
    const [viewRange, setViewRange] = useState<ViewRange>('1y')
    const [sortBy, setSortBy] = useState<'impact' | 'priority'>('impact')

    const filteredProjects = useMemo(() => {
        const priorityOrder = { urgent: 0, high: 1, mid: 2, low: 3 }

        return projects
            .filter((p: StudioProject) => {
                const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.tagline?.toLowerCase().includes(searchQuery.toLowerCase())
                const matchesType = !filterType || p.type === filterType
                // Users requested: completed/shipped projects shouldnt show up on the timeline.
                const statusMatch = ['research', 'active'].includes(p.status)
                const archiveMatch = showArchived ? p.is_archived : !p.is_archived
                return matchesSearch && matchesType && statusMatch && archiveMatch
            })
            .sort((a, b) => {
                if (sortBy === 'impact') {
                    const diff = (b.impact_score || 0) - (a.impact_score || 0)
                    if (diff !== 0) return diff
                    return (priorityOrder[a.priority || 'low'] || 99) - (priorityOrder[b.priority || 'low'] || 99)
                } else {
                    const diff = (priorityOrder[a.priority || 'low'] || 99) - (priorityOrder[b.priority || 'low'] || 99)
                    if (diff !== 0) return diff
                    return (b.impact_score || 0) - (a.impact_score || 0)
                }
            })
    }, [projects, searchQuery, filterType, showArchived, sortBy])

    const roadmapRange = useMemo(() => {
        const today = new Date()
        const start = new Date(today.getFullYear(), today.getMonth(), 1)
        let end = new Date(today.getFullYear(), today.getMonth() + 1, 0)

        if (viewRange === '3m') {
            end = new Date(today.getFullYear(), today.getMonth() + 3, 0)
        } else if (viewRange === '6m') {
            end = new Date(today.getFullYear(), today.getMonth() + 6, 0)
        } else if (viewRange === '1y') {
            start.setMonth(today.getMonth() - 2)
            end = new Date(today.getFullYear(), today.getMonth() + 10, 0)
        }

        const days: Date[] = []
        let cur = new Date(start)
        while (cur <= end) {
            days.push(new Date(cur))
            cur.setDate(cur.getDate() + 1)
        }

        const totalDays = days.length
        const diffToday = Math.floor((today.getTime() - start.getTime()) / 86_400_000)
        const todayPct = (diffToday / totalDays) * 100

        const months: MonthHeader[] = []
        let lastMonth = -1
        let lastYear = -1
        days.forEach((date, idx) => {
            if (date.getMonth() !== lastMonth) {
                const isNewYear = date.getFullYear() !== lastYear && lastYear !== -1
                months.push({
                    name: date.toLocaleDateString('en-GB', { month: viewRange === '1m' ? 'long' : 'short' }),
                    isNewYear,
                    yearLabel: String(date.getFullYear()),
                    offset: (idx / totalDays) * 100
                })
                lastMonth = date.getMonth()
                lastYear = date.getFullYear()
            }
        })

        return { start, end, totalDays, todayPct, months }
    }, [viewRange])

    const minW = viewRange === '1m' ? 1400 : viewRange === '3m' ? 1600 : viewRange === '6m' ? 2000 : 2400
    const chartH = 40 + filteredProjects.length * ROW_HEIGHT

    useEffect(() => {
        if (!scrollRef.current) return
        const el = scrollRef.current
        const todayPx = (minW * roadmapRange.todayPct) / 100
        el.scrollLeft = todayPx - el.clientWidth / 3
    }, [roadmapRange.todayPct, minW, viewRange])

    const calcPos = (project: StudioProject) => {
        // Use start_date if available, else created_at
        const s = project.start_date ? new Date(project.start_date) : new Date(project.created_at)
        const e = project.target_date ? new Date(project.target_date) : (project.status === 'shipped' ? new Date() : new Date(roadmapRange.end))

        const sd = (s.getTime() - roadmapRange.start.getTime()) / 86_400_000
        const ed = (e.getTime() - roadmapRange.start.getTime()) / 86_400_000
        const left = Math.max(0, (sd / roadmapRange.totalDays) * 100)
        const width = Math.max(4, Math.min(100 - left, ((ed - sd) / roadmapRange.totalDays) * 100))

        // If project entirely before or after range, hide it? 
        // For now just clamp.
        const visible = left < 100 && (left + width) > 0

        return { left: `${left}%`, width: `${width}%`, visible }
    }

    return (
        <div className="flex flex-col h-full min-h-[500px] bg-white border border-black/[0.06] rounded-[24px] overflow-hidden shadow-sm">
            {/* Context Header: Filters & Zoom */}
            <div className="h-14 shrink-0 flex items-center justify-between px-6 border-b border-black/[0.05] bg-black/[0.01]">
                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-black/5 rounded-xl p-1">
                        {(['1m', '3m', '6m', '1y'] as ViewRange[]).map(r => (
                            <button
                                key={r}
                                onClick={() => setViewRange(r)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                    viewRange === r ? "bg-white text-black shadow-sm" : "text-black/30 hover:text-black"
                                )}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-black/20 uppercase tracking-[0.2em] mr-2">Sort By</span>
                    <button
                        onClick={() => setSortBy(sortBy === 'impact' ? 'priority' : 'impact')}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-black/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-black/20 transition-all shadow-sm"
                    >
                        {sortBy === 'impact' ? <Zap className="w-3 h-3 text-orange-500" /> : <Clock className="w-3 h-3 text-purple-500" />}
                        {sortBy}
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Fixed Project Sidebar */}
                <div className="w-[160px] md:w-[240px] shrink-0 flex flex-col border-r border-black/[0.06] bg-white">
                    <div className="h-10 shrink-0 flex items-center px-4 border-b border-black/[0.06] bg-black/[0.01]">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-black/30">Pipeline</span>
                    </div>
                    <div className="flex flex-col overflow-y-auto no-scrollbar" style={{ minHeight: `${filteredProjects.length * ROW_HEIGHT}px` }}>
                        {filteredProjects.map(project => (
                            <button
                                key={project.id}
                                onClick={() => onProjectClick(project)}
                                className="group px-3 md:px-4 flex flex-col justify-center text-left hover:bg-black/[0.02] transition-colors overflow-hidden border-b border-black/[0.03] shrink-0"
                                style={{ height: ROW_HEIGHT }}
                            >
                                <div className="flex items-center justify-between gap-2 overflow-hidden">
                                    <h4 className="text-[11px] md:text-[12px] font-bold text-black truncate group-hover:text-blue-600 transition-colors uppercase tracking-tight leading-snug flex-1">
                                        {project.title}
                                    </h4>
                                    <div className="flex items-center gap-1 shrink-0">
                                        {project.gtv_featured && <Shield className="w-2.5 h-2.5 text-blue-500" />}
                                        {project.impact_score && (
                                            <div className="flex items-center gap-0.5">
                                                <Zap className="w-2.5 h-2.5 text-orange-500 fill-orange-500" />
                                                <span className="text-[9px] font-bold text-orange-600">{project.impact_score}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <span className={cn(
                                        "px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest",
                                        project.type === 'Architectural Design' || project.type === 'Product Design' ? "bg-emerald-50 text-emerald-600" :
                                            project.type === 'Technology' ? "bg-blue-50 text-blue-600" :
                                                project.type === 'Media' || project.type === 'Fashion' ? "bg-rose-50 text-rose-600" :
                                                    "bg-black/5 text-black/40"
                                    )}>
                                        {project.type || 'Other'}
                                    </span>
                                    {project.priority && (
                                        <span className={cn(
                                            "px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest",
                                            project.priority === 'urgent' ? "bg-purple-100 text-purple-700 animate-pulse" :
                                                project.priority === 'high' ? "bg-orange-100 text-orange-700" :
                                                    "bg-black/5 text-black/40"
                                        )}>
                                            {project.priority}
                                        </span>
                                    )}
                                </div>
                            </button>
                        ))}
                        {filteredProjects.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
                                <Clock className="w-8 h-8 mb-2 text-black/10" />
                                <p className="text-[10px] font-bold uppercase tracking-widest text-black/15">Zero Active Projects</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Scrollable timeline pane */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-x-auto overflow-y-auto no-scrollbar"
                >
                    <div
                        className="relative bg-black/[0.005]"
                        style={{ minWidth: minW, height: chartH }}
                    >
                        {/* Vertical grid lines */}
                        {roadmapRange.months.map((m, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "absolute top-0 bottom-0",
                                    m.isNewYear ? "border-l-2 border-blue-200" : "border-l border-black/[0.04]"
                                )}
                                style={{ left: `${m.offset}%` }}
                            />
                        ))}

                        {/* Month header row */}
                        <div className="absolute top-0 left-0 right-0 h-10 border-b border-black/[0.06] bg-black/[0.01]">
                            {roadmapRange.months.map((m, i) => (
                                <div
                                    key={i}
                                    className="absolute inset-y-0 flex flex-col justify-center px-2 pointer-events-none"
                                    style={{ left: `${m.offset}%` }}
                                >
                                    {m.isNewYear && (
                                        <span className="text-[8px] font-bold text-blue-400 uppercase leading-none mb-px">{m.yearLabel}</span>
                                    )}
                                    <span className="text-[10px] font-bold uppercase tracking-tighter text-black/50 whitespace-nowrap">{m.name}</span>
                                </div>
                            ))}
                        </div>

                        {/* Today Line */}
                        <div
                            className="absolute top-0 bottom-0 w-px bg-blue-500 z-20 shadow-[0_0_10px_rgba(59,130,246,0.2)]"
                            style={{ left: `${roadmapRange.todayPct}%` }}
                        >
                            <div className="absolute top-10 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-blue-500 text-white text-[8px] font-bold rounded-full uppercase tracking-tight whitespace-nowrap shadow-sm">
                                Today
                            </div>
                        </div>

                        {/* Project Bars */}
                        {filteredProjects.map((project, rowIdx) => {
                            const pos = calcPos(project)
                            if (!pos.visible) return null

                            const projectMilestones = milestones.filter((m: StudioMilestone) => m.project_id === project.id)
                            const done = projectMilestones.filter(m => m.status === 'completed').length
                            const progress = projectMilestones.length ? (done / projectMilestones.length) * 100 : 0
                            const top = 40 + rowIdx * ROW_HEIGHT

                            return (
                                <div
                                    key={project.id}
                                    className="absolute left-0 right-0 border-b border-black/[0.03] flex items-center group/row"
                                    style={{ top, height: ROW_HEIGHT }}
                                >
                                    <motion.div
                                        initial={{ opacity: 0, scaleX: 0 }}
                                        animate={{ opacity: 1, scaleX: 1 }}
                                        transition={{ duration: 0.4, ease: 'easeOut' }}
                                        className="absolute h-8 rounded-full border border-black/10 shadow-sm flex items-center px-4 overflow-hidden cursor-pointer hover:shadow-md transition-shadow group"
                                        style={{
                                            left: pos.left,
                                            width: pos.width,
                                            transformOrigin: 'left',
                                            backgroundColor: project.status === 'shipped' ? '#f0fdf4' : 'white'
                                        }}
                                        onClick={() => onProjectClick(project)}
                                    >
                                        <div
                                            className="absolute inset-y-0 left-0 bg-black/[0.06] rounded-full"
                                            style={{ width: `${progress}%` }}
                                        />
                                        <div className="relative z-10 flex items-center justify-between w-full gap-4">
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[10px] font-black uppercase tracking-tight truncate text-black group-hover:text-blue-600 transition-colors">
                                                    {project.title}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <ArrowRight className="w-2.5 h-2.5 text-black/40" />
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}
