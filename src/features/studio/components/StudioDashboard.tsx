'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Briefcase, Target, LayoutDashboard, Shield, Plus, Clock, ExternalLink, ArrowRight, Activity, Award, Zap } from 'lucide-react'
import { useStudio } from '../hooks/useStudio'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import CreateProjectModal from './CreateProjectModal'
import CreateSparkModal from './CreateSparkModal'
import ProjectDetailModal from './ProjectDetailModal'
import SparkDetailModal from './SparkDetailModal'
import PlatformIcon from './PlatformIcon'
import type { StudioProject, StudioSpark } from '../types/studio.types'

export default function StudioDashboard() {
    const { projects, sparks, content, press, loading, error } = useStudio()
    const [daysUntilGTV, setDaysUntilGTV] = useState(0)
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false)
    const [isSparkModalOpen, setIsSparkModalOpen] = useState(false)
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
    const [selectedSparkId, setSelectedSparkId] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active')

    useEffect(() => {
        const target = new Date('2026-09-01')
        const now = new Date()
        const diff = target.getTime() - now.getTime()
        setDaysUntilGTV(Math.ceil(diff / (1000 * 60 * 60 * 24)))
    }, [])

    const activeProjects = projects.filter(p => (p.status === 'active' || p.status === 'research') && !p.is_archived)
    const archivedProjects = projects.filter(p => p.is_archived)
    const recentSparks = sparks.slice(0, 4)

    const selectedProject = projects.find(p => p.id === selectedProjectId) || null
    const selectedSpark = sparks.find(s => s.id === selectedSparkId) || null

    return (
        <div className="space-y-6">
            {error && error.includes('relation') && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex flex-col gap-2">
                    <p className="text-[13px] font-bold text-red-900">Database Tables Missing</p>
                    <p className="text-[11px] text-red-800/60">It looks like the Studio module tables haven't been created yet. Please execute the SQL migration script in your Supabase dashboard.</p>
                </div>
            )}
            {/* GTV Header Banner */}
            <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#0A2647] to-[#144272] p-6 md:p-10 text-white shadow-2xl">
                <div className="absolute top-0 right-0 p-8 opacity-10 hidden sm:block">
                    <Shield className="w-48 h-48" />
                </div>
                <div className="relative z-10 flex flex-col gap-2">
                    <div className="flex flex-col gap-1">
                        <p className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.25em] text-blue-300/80 mb-2">Global Talent Visa Pipeline</p>
                        <div className="flex items-baseline gap-3 mb-4 md:mb-6">
                            <h1 className="text-4xl md:text-6xl font-black font-outfit">{daysUntilGTV}</h1>
                            <p className="text-base md:text-xl font-bold text-blue-200/60 lowercase">days until 2026 cutoff</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mt-2 pt-6 border-t border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="flex -space-x-3">
                                {projects.filter(p => p.gtv_featured).slice(0, 4).map((p, i) => (
                                    <div key={p.id} className="w-8 md:w-10 h-8 md:h-10 rounded-full border-2 border-blue-900 bg-blue-100 flex items-center justify-center text-blue-900 font-black text-[10px] md:text-xs ring-4 ring-[#0A2647] overflow-hidden">
                                        {p.title[0]}
                                    </div>
                                ))}
                                {projects.filter(p => p.gtv_featured).length > 4 && (
                                    <div className="w-8 md:w-10 h-8 md:h-10 rounded-full border-2 border-blue-900 bg-blue-800 flex items-center justify-center text-blue-200 font-black text-[10px] md:text-xs ring-4 ring-[#0A2647]">
                                        +{projects.filter(p => p.gtv_featured).length - 4}
                                    </div>
                                )}
                            </div>
                            <p className="text-[12px] md:text-[13px] font-bold text-blue-100/70">
                                Portfolio is <span className="text-white font-black">{Math.min(100, Math.round(((projects.filter(p => p.gtv_featured).length + press.filter(p => p.is_portfolio_item && (p.status === 'achieved' || p.status === 'published')).length) / 10) * 100))}%</span> optimized
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Subpage Quick Actions */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {[
                    { label: 'Projects', href: '/create/projects', icon: Briefcase, color: 'text-orange-600', bg: 'bg-orange-500/10' },
                    { label: 'Content', href: '/create/content', icon: LayoutDashboard, color: 'text-blue-600', bg: 'bg-blue-600/10' },
                    { label: 'Sparks', href: '/create/sparks', icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
                    { label: 'Network', href: '/create/network', icon: Activity, color: 'text-purple-600', bg: 'bg-purple-500/10' },
                    { label: 'Press', href: '/create/press', icon: Award, color: 'text-amber-600', bg: 'bg-amber-500/10' },
                    { label: 'Portfolio', href: '/create/portfolio', icon: Shield, color: 'text-blue-600', bg: 'bg-blue-500/10' }
                ].map((item) => (
                    <Link
                        key={item.label}
                        href={item.href}
                        className="flex items-center gap-2 px-3 py-2 bg-white border border-black/[0.06] rounded-xl hover:border-black/20 hover:bg-black/[0.02] transition-all group shadow-sm"
                    >
                        <div className={cn(
                            "w-6 h-6 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm",
                            item.bg, item.color
                        )}>
                            <item.icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[12px] font-bold text-black/70 group-hover:text-black">{item.label}</span>
                    </Link>
                ))}
            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Active Projects Summary */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setActiveTab('active')}
                                className={cn(
                                    "text-[13px] font-bold uppercase tracking-wider flex items-center gap-2 transition-all",
                                    activeTab === 'active' ? "text-black opacity-100 scale-105" : "text-black/30 hover:text-black/60 opacity-50"
                                )}
                            >
                                <Briefcase className={cn("w-4 h-4", activeTab === 'active' ? "text-orange-500" : "text-black/20")} />
                                Active Pipeline
                            </button>
                            <button
                                onClick={() => setActiveTab('archived')}
                                className={cn(
                                    "text-[13px] font-bold uppercase tracking-wider flex items-center gap-2 transition-all",
                                    activeTab === 'archived' ? "text-black opacity-100 scale-105" : "text-black/30 hover:text-black/60 opacity-50"
                                )}
                            >
                                <Shield className={cn("w-4 h-4", activeTab === 'archived' ? "text-blue-500" : "text-black/20")} />
                                Archives
                            </button>
                        </div>
                        <Link href="/create/projects" className="text-[11px] font-bold text-black/40 hover:text-black transition-colors">See Kanban</Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {loading ? (
                            [1, 2, 3, 4].map(i => (
                                <div key={i} className="h-32 bg-black/[0.02] border border-black/[0.05] rounded-2xl animate-pulse" />
                            ))
                        ) : activeTab === 'active' && activeProjects.length === 0 ? (
                            <div className="col-span-2 py-12 bg-white border border-black/[0.05] rounded-3xl flex flex-col items-center justify-center text-center px-6">
                                <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center mb-4">
                                    <Sparkles className="w-6 h-6 text-orange-500" />
                                </div>
                                <h3 className="text-sm font-bold text-black">No active projects</h3>
                                <p className="text-[12px] text-black/40 mt-1 max-w-[240px]">Transform your sparks into projects to start your GTV portfolio.</p>
                                <button
                                    onClick={() => setIsProjectModalOpen(true)}
                                    className="mt-4 px-4 py-2 bg-black text-white text-[11px] font-bold rounded-xl hover:scale-105 transition-transform"
                                >
                                    Start New Project
                                </button>
                            </div>
                        ) : activeTab === 'archived' && archivedProjects.length === 0 ? (
                            <div className="col-span-2 py-12 bg-white border border-black/[0.05] rounded-3xl flex flex-col items-center justify-center text-center px-6">
                                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                                    <Shield className="w-6 h-6 text-blue-500" />
                                </div>
                                <h3 className="text-sm font-bold text-black">No archived projects</h3>
                                <p className="text-[12px] text-black/40 mt-1 max-w-[240px]">Your archived projects will show up here for future reference.</p>
                            </div>
                        ) : (
                            (activeTab === 'active' ? activeProjects : archivedProjects).map(project => (
                                <div
                                    key={project.id}
                                    onClick={() => setSelectedProjectId(project.id)}
                                    className="p-4 bg-white border border-black/[0.05] rounded-2xl hover:border-orange-200 hover:shadow-lg transition-all group cursor-pointer"
                                >
                                    {project.cover_url && (
                                        <div className="h-24 -mx-4 -mt-4 mb-4 overflow-hidden relative">
                                            <img
                                                src={project.cover_url || `/api/studio/cover?title=${encodeURIComponent(project.title)}&tagline=${encodeURIComponent(project.tagline || '')}&type=${encodeURIComponent(project.type || '')}&id=${project.id}&w=800&h=600`}
                                                alt=""

                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent opacity-60" />

                                            {/* Platform icons overlay */}
                                            {project.platforms && project.platforms.length > 0 && (
                                                <div className="absolute top-2 left-2 flex -space-x-1 ring-1 ring-white/20 rounded-full p-0.5 bg-black/10 backdrop-blur-md">
                                                    {project.platforms.map(p => (
                                                        <div
                                                            key={p}
                                                            className="w-4 h-4 rounded-full bg-white border border-black/[0.1] flex items-center justify-center text-black shadow-sm z-[1]"
                                                            title={p}
                                                        >
                                                            <PlatformIcon platform={p} className="w-2 h-2" />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div className="flex justify-between items-start mb-3">

                                        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                {!project.cover_url && project.platforms && project.platforms.length > 0 && (
                                                    <div className="flex -space-x-1 mr-1">
                                                        {project.platforms.map(p => (
                                                            <div
                                                                key={p}
                                                                className="w-4 h-4 rounded-full bg-white border border-black/[0.1] flex items-center justify-center text-black shadow-sm z-[1]"
                                                                title={p}
                                                            >
                                                                <PlatformIcon platform={p} className="w-2 h-2" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                <div className={cn(
                                                    "px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-tight",
                                                    project.status === 'active' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                                                )}>
                                                    {project.status}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                                            <div className="flex items-center gap-2">
                                                {project.target_date && (
                                                    <div className="flex items-center gap-1 text-[9px] text-black/30 font-bold uppercase tracking-tighter">
                                                        <Clock className="w-2.5 h-2.5" />
                                                        {new Date(project.target_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                                    </div>
                                                )}
                                                {project.impact_score && (
                                                    <div className="flex items-center gap-0.5">
                                                        <Zap className="w-3 h-3 text-orange-500 fill-orange-500" />
                                                        <span className="text-[11px] font-black text-orange-600">
                                                            {project.impact_score}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            {project.gtv_featured && <Shield className="w-3.5 h-3.5 text-blue-500" />}
                                        </div>
                                    </div>


                                    <h4 className="text-[14px] font-black text-black leading-tight group-hover:text-orange-600 transition-colors">{project.title}</h4>
                                    <p className="text-[11px] text-black/40 mt-1 line-clamp-2">{project.tagline || 'No tagline set'}</p>

                                </div>
                            ))

                        )}
                    </div>

                </div>

                {/* Sidebar Cards */}
                <div className="space-y-6">
                    {/* Quick Sparks */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-[13px] font-bold text-black uppercase tracking-wider flex items-center gap-2">
                                <Target className="w-4 h-4 text-emerald-500" />
                                Recent Sparks
                            </h2>
                            <Link href="/create/sparks" className="text-[11px] font-bold text-black/40 hover:text-black transition-colors">See Grid</Link>
                        </div>

                        <div className="space-y-2">
                            {recentSparks.map(spark => (
                                <div
                                    key={spark.id}
                                    onClick={() => setSelectedSparkId(spark.id)}
                                    className="p-3 bg-white border border-black/[0.04] rounded-xl flex items-center gap-3 group hover:border-emerald-200 cursor-pointer transition-all"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-black/[0.02] flex items-center justify-center text-sm border border-black/[0.05]">
                                        {{
                                            idea: '💡',
                                            tool: '🛠️',
                                            item: '🛒',
                                            resource: '🔗',
                                            event: '📅',
                                            person: '👤',
                                            platform: '📱'
                                        }[spark.type] || '✨'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[12px] font-bold text-black truncate">{spark.title}</p>
                                        <p className="text-[10px] text-black/30 font-medium uppercase tracking-tight">{spark.type}</p>
                                    </div>
                                    {spark.url && (
                                        <a
                                            href={spark.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="p-1.5 rounded-lg hover:bg-emerald-50 text-black/20 hover:text-emerald-600 transition-all"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                    )}
                                </div>
                            ))}
                            <button
                                onClick={() => setIsSparkModalOpen(true)}
                                className="w-full p-3 border-2 border-dashed border-black/[0.05] rounded-xl flex items-center justify-center gap-2 text-[12px] font-bold text-black/40 hover:border-emerald-200 hover:text-emerald-600 hover:bg-emerald-50/30 transition-all group"
                            >
                                <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                                Capture New Spark
                            </button>
                        </div>
                    </div>

                    {/* Content Pulse */}
                    <div className="p-5 bg-white border border-black/[0.06] rounded-[32px] space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                                <LayoutDashboard className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-[13px] font-black text-black leading-none">Content Pipeline</h3>
                                <p className="text-[11px] text-black/40 mt-1">{content.length} active ideas & posts</p>
                            </div>
                        </div>
                        <div className="pt-2 border-t border-black/[0.05]">
                            <Link href="/create/content" className="flex items-center justify-between text-[11px] font-bold text-black group hover:text-blue-600 transition-colors">
                                Open Content Calendar
                                <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <CreateProjectModal
                isOpen={isProjectModalOpen}
                onClose={() => setIsProjectModalOpen(false)}
            />
            <CreateSparkModal
                isOpen={isSparkModalOpen}
                onClose={() => setIsSparkModalOpen(false)}
            />
            <ProjectDetailModal
                isOpen={!!selectedProjectId}
                onClose={() => setSelectedProjectId(null)}
                project={selectedProject}
            />
            <SparkDetailModal
                isOpen={!!selectedSparkId}
                onClose={() => setSelectedSparkId(null)}
                spark={selectedSpark}
                projects={projects}
            />
            <style jsx global>{`
                input[type="date"]::-webkit-calendar-picker-indicator {
                    opacity: 0;
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    cursor: pointer;
                    z-index: 10;
                }
            `}</style>
        </div >
    )
}
