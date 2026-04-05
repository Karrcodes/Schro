'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Target, LayoutDashboard, Shield, Plus, Clock, ExternalLink, ArrowRight, Activity, Award, Zap, Video, Rocket, Users, Globe, PenLine, Images } from 'lucide-react'
import { useStudio } from '../hooks/useStudio'
import { useSystemSettings } from '@/features/system/contexts/SystemSettingsContext'
import { KarrFooter } from '@/components/KarrFooter'
import { cn } from '@/lib/utils'
import Link from 'next/link'

import CreateSparkModal from './CreateSparkModal'
import ProjectDetailModal from './ProjectDetailModal'
import SparkDetailModal from './SparkDetailModal'
import ContentDetailModal from './ContentDetailModal'
import PlatformIcon from './PlatformIcon'
import type { StudioProject, StudioSpark, StudioContent } from '../types/studio.types'


export default function StudioDashboard() {
    const { projects, sparks, content, press, loading, error, generatingProjectIds, generatingContentIds, drafts } = useStudio()
    const { settings } = useSystemSettings()


    const [isSparkModalOpen, setIsSparkModalOpen] = useState(false)

    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
    const [selectedContentId, setSelectedContentId] = useState<string | null>(null)
    const [selectedSparkId, setSelectedSparkId] = useState<string | null>(null)





    const activeProjects = projects.filter(p => (p.status === 'active' || p.status === 'research') && !p.is_archived)

    const activeContent = content.filter(c => ['scripted', 'filmed', 'edited', 'scheduled'].includes(c.status) && !c.is_archived)
    const recentSparks = sparks.slice(0, 4)

    const selectedProject = projects.find(p => p.id === selectedProjectId) || null
    const selectedContent = content.find(c => c.id === selectedContentId) || null
    const selectedSpark = sparks.find(s => s.id === selectedSparkId) || null

    return (
        <div className="w-full px-6 md:px-10 py-8 md:py-10">
            <div className="max-w-7xl mx-auto space-y-10">
                {/* Standard Module Header */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-1">
                        <h2 className="text-[11px] font-black text-orange-600 uppercase tracking-[0.3em]">Creative Protocol</h2>
                        <div className="flex items-center gap-4">
                            <h1 className="text-4xl font-black text-black tracking-tighter uppercase grayscale">Studio Dashboard</h1>

                        </div>
                    </div>

                </header>



                <div className="space-y-12">
                    {error && error.includes('relation') && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex flex-col gap-2">
                            <p className="text-[13px] font-bold text-red-900">Database Tables Missing</p>
                            <p className="text-[11px] text-red-800/60">It looks like the Studio module tables haven't been created yet. Please execute the SQL migration script in your Supabase dashboard.</p>
                        </div>
                    )}


                    {/* Subpage Quick Actions */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-2">
                        {[
                            { label: 'Projects', href: '/create/projects', icon: Rocket, color: 'text-orange-600', bg: 'bg-orange-500/10' },
                            { label: 'Content', href: '/create/content', icon: Video, color: 'text-blue-600', bg: 'bg-blue-600/10' },
                            { label: 'Canvas', href: '/create/canvas', icon: PenLine, color: 'text-rose-600', bg: 'bg-rose-500/10' },
                            { label: 'Tools', href: '/create/sparks', icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
                            { label: 'Network', href: '/create/network', icon: Users, color: 'text-purple-600', bg: 'bg-purple-500/10' },
                            { label: 'Press', href: '/create/press', icon: Award, color: 'text-amber-600', bg: 'bg-amber-500/10' },
                            ...(!settings.is_demo_mode ? [{ label: 'Portfolio', href: '/create/portfolio', icon: Images, color: 'text-indigo-600', bg: 'bg-indigo-500/10' }] : [])
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


                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-2">
                        {/* Active Projects Summary */}
                        <div className="lg:col-span-2 space-y-8">
                            <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Rocket className="w-4 h-4 text-orange-500" />
                                        <h3 className="text-[13px] font-bold uppercase tracking-wider text-black">Active Pipeline</h3>
                                    </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {loading ? (
                                        [1, 2, 3, 4].map(i => (
                                            <div key={i} className="h-32 bg-black/[0.02] border border-black/[0.05] rounded-2xl animate-pulse" />
                                        ))
                                    ) : activeProjects.length === 0 ? (
                                        <div className="col-span-2 py-12 bg-white border border-black/[0.05] rounded-3xl flex flex-col items-center justify-center text-center px-6">
                                            <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center mb-4">
                                                <Sparkles className="w-6 h-6 text-orange-500" />
                                            </div>
                                            <h3 className="text-sm font-bold text-black">No active projects</h3>
                                            <p className="text-[12px] text-black/40 mt-1 max-w-[240px]">Start a new project to track your goals and milestones.</p>

                                        </div>
                                    ) : (
                                        activeProjects.map(project => (
                                            <div
                                                key={project.id}
                                                onClick={() => setSelectedProjectId(project.id)}
                                                className="bg-white border border-black/[0.05] rounded-2xl hover:border-orange-200 hover:shadow-lg transition-all group cursor-pointer overflow-hidden flex flex-col"
                                            >
                                                <div className="h-24 w-full relative shrink-0 bg-black/[0.02] overflow-hidden">
                                                    <img
                                                        src={project.cover_url || `/api/studio/cover?title=${encodeURIComponent(project.title)}&tagline=${encodeURIComponent(project.tagline || '')}&type=${encodeURIComponent(project.type || '')}&id=${project.id}&w=1200&h=630`}
                                                        alt=""
                                                        className={cn(
                                                            "w-full h-full object-cover transition-transform duration-500 group-hover:scale-110",
                                                            (!project.cover_url || generatingProjectIds.includes(project.id)) && "scale-[1.15]"
                                                        )}
                                                    />
                                                    {generatingProjectIds.includes(project.id) && (
                                                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-[2]">
                                                            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Generating Cover...</span>
                                                        </div>
                                                    )}
                                                    <div className={cn(
                                                        "absolute inset-0 bottom-[-2px] bg-gradient-to-t from-white via-transparent to-transparent pointer-events-none z-[1] translate-y-[1px]",
                                                        project.cover_url ? "opacity-60" : "opacity-20"
                                                    )} />

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
                                                <div className="p-4 flex flex-col flex-1">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                                                            <div className="flex flex-wrap items-center gap-1.5">
                                                                {project.type && (
                                                                    <div className={cn(
                                                                        "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tight",
                                                                        project.type === 'Architectural Design' && "bg-blue-50 text-blue-600",
                                                                        project.type === 'Product Design' && "bg-emerald-50 text-emerald-600",
                                                                        project.type === 'Technology' && "bg-cyan-50 text-cyan-600",
                                                                        project.type === 'Media' && "bg-rose-50 text-rose-600",
                                                                        project.type === 'Fashion' && "bg-purple-50 text-purple-600",
                                                                        !['Architectural Design', 'Product Design', 'Technology', 'Media', 'Fashion'].includes(project.type as any) && "bg-black/[0.03] text-black/40"
                                                                    )}>
                                                                        {project.type}
                                                                    </div>
                                                                )}
                                                                {project.priority && (
                                                                    <div className={cn(
                                                                        "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter w-fit",
                                                                        project.priority === 'super' ? "bg-purple-50 text-purple-600 border border-purple-100" :
                                                                            project.priority === 'high' ? "bg-red-50 text-red-600 border border-red-100" :
                                                                                project.priority === 'mid' ? "bg-yellow-50 text-yellow-600 border border-yellow-100" :
                                                                                    "bg-black/5 text-black/40"
                                                                    )}>
                                                                        {project.priority}
                                                                    </div>
                                                                )}
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
                                                                    <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-500/5 rounded-md border border-orange-500/5">
                                                                        <Zap className="w-2.5 h-2.5 text-orange-500 fill-orange-500" />
                                                                        <span className="text-[10px] font-black text-orange-600">{project.impact_score}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <h4 className="text-[14px] font-black text-black leading-snug group-hover:text-orange-600 transition-colors mt-auto">{project.title}</h4>
                                                    <p className="text-[11px] text-black/40 mt-1 line-clamp-2">{project.tagline || 'No tagline set'}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Active Content Summary */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-2">
                                    <h2 className="text-[13px] font-bold uppercase tracking-wider flex items-center gap-2 text-black">
                                        <Video className="w-4 h-4 text-blue-500" />
                                        Active Content
                                    </h2>
                                    <Link href="/create/content" className="text-[11px] font-bold text-black/40 hover:text-black transition-colors">See Pipeline</Link>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {loading ? (
                                        [1, 2, 3, 4].map(i => (
                                            <div key={i} className="h-24 bg-black/[0.02] border border-black/[0.05] rounded-2xl animate-pulse" />
                                        ))
                                    ) : activeContent.length === 0 ? (
                                        <div className="col-span-2 py-12 bg-white border border-black/[0.05] rounded-3xl flex flex-col items-center justify-center text-center px-6">
                                            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                                                <Video className="w-6 h-6 text-blue-500" />
                                            </div>
                                            <h3 className="text-sm font-bold text-black">No active content</h3>
                                            <p className="text-[12px] text-black/40 mt-1 max-w-[240px]">Start scripting or filming to populate your content pipeline.</p>
                                        </div>
                                    ) : (
                                        (activeContent.slice(0, 4) as StudioContent[]).map(item => (
                                            <div
                                                key={item.id}
                                                onClick={() => setSelectedContentId(item.id)}
                                                className="bg-white border border-black/[0.05] rounded-2xl hover:border-blue-200 hover:shadow-lg transition-all group cursor-pointer overflow-hidden flex flex-col h-full"
                                            >
                                                <div className="h-24 w-full relative shrink-0 bg-black/[0.02] overflow-hidden">
                                                    <img
                                                        src={item.cover_url || `/api/studio/cover?title=${encodeURIComponent(item.title)}&tagline=${encodeURIComponent(item.category || 'Content')}&type=${encodeURIComponent(item.type || '')}&id=${item.id}&w=1200&h=630`}
                                                        alt=""
                                                        className={cn(
                                                            "w-full h-full object-cover transition-transform duration-500 group-hover:scale-110",
                                                            (!item.cover_url || generatingContentIds.includes(item.id)) && "scale-[1.15]"
                                                        )}
                                                    />
                                                    {generatingContentIds.includes(item.id) && (
                                                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-[2]">
                                                            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Generating Cover...</span>
                                                        </div>
                                                    )}
                                                    <div className={cn(
                                                        "absolute inset-0 bottom-[-2px] bg-gradient-to-t from-white via-transparent to-transparent pointer-events-none z-[1] translate-y-[1px]",
                                                        item.cover_url ? "opacity-60" : "opacity-20"
                                                    )} />
                                                    {/* Platform icons overlay */}
                                                    {item.platforms && item.platforms.length > 0 && (
                                                        <div className="absolute top-2 left-2 flex -space-x-1 ring-1 ring-white/20 rounded-full p-0.5 bg-black/10 backdrop-blur-md">
                                                            {item.platforms.map(p => (
                                                                <div key={p} className="w-4 h-4 rounded-full bg-white border border-black/[0.1] flex items-center justify-center text-black shadow-sm z-[1]" title={p}>
                                                                    <PlatformIcon platform={p} className="w-2.1 h-2" />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="p-4 flex flex-col flex-1">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                                                            <div className="flex flex-wrap items-center gap-1.5">
                                                                {item.category && (
                                                                    <div className={cn(
                                                                        "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tight",
                                                                        item.category === 'Thoughts' && "bg-blue-50 text-blue-600",
                                                                        item.category === 'Concept' && "bg-emerald-50 text-emerald-600",
                                                                        item.category === 'Vlog' && "bg-purple-50 text-purple-600",
                                                                        item.category === 'Showcase' && "bg-rose-50 text-rose-600",
                                                                        item.category === 'Update' && "bg-amber-50 text-amber-600",
                                                                        !['Thoughts', 'Concept', 'Vlog', 'Showcase', 'Update'].includes(item.category as any) && "bg-black/[0.03] text-black/40"
                                                                    )}>
                                                                        {item.category}
                                                                    </div>
                                                                )}
                                                                {item.priority && (
                                                                    <div className={cn(
                                                                        "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter w-fit",
                                                                        item.priority === 'super' ? "bg-purple-50 text-purple-600 border border-purple-100" :
                                                                            item.priority === 'high' ? "bg-red-50 text-red-600 border border-red-100" :
                                                                                item.priority === 'mid' ? "bg-yellow-50 text-yellow-600 border border-yellow-100" :
                                                                                    "bg-black/5 text-black/40"
                                                                    )}>
                                                                        {item.priority}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                                                            <div className="flex items-center gap-2">
                                                                {item.url && (
                                                                    <a
                                                                        href={item.url.startsWith('http') ? item.url : `https://${item.url}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all flex items-center justify-center shadow-sm"
                                                                        title="View Online"
                                                                    >
                                                                        <Globe className="w-3.5 h-3.5" />
                                                                    </a>
                                                                )}
                                                                {item.deadline && (
                                                                    <div className="flex items-center gap-1 text-[9px] text-black/30 font-bold uppercase tracking-tighter">
                                                                        <Clock className="w-2.5 h-2.5" />
                                                                        {new Date(item.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                                                    </div>
                                                                )}
                                                                {item.impact_score && (
                                                                    <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-500/5 rounded-md border border-orange-500/5">
                                                                        <Zap className="w-2.5 h-2.5 text-orange-500 fill-orange-500" />
                                                                        <span className="text-[10px] font-black text-orange-600">{item.impact_score}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <h4 className="text-[14px] font-black text-black leading-snug group-hover:text-blue-600 transition-colors mt-auto line-clamp-2">{item.title}</h4>
                                                    <p className="text-[11px] text-black/40 mt-1 line-clamp-2">{item.category || 'No category set'}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Sidebar Cards */}
                        <div className="space-y-6">
                            {/* Quick Sparks */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-2">
                                    <h2 className="text-[13px] font-bold text-black uppercase tracking-wider flex items-center gap-2">
                                        <Target className="w-4 h-4 text-emerald-500" />
                                        Recent Tools
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
                                                    tool: '🛠️',
                                                    resource: '🔗',
                                                    event: '📅'
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
                                        Capture New Tool
                                    </button>
                                </div>
                            </div>

                            {/* Content Pulse */}
                            <div className="p-5 bg-white border border-black/[0.06] rounded-[32px] space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                                        <Video className="w-5 h-5" />
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
                </div>


                <CreateSparkModal
                    isOpen={isSparkModalOpen}
                    onClose={() => setIsSparkModalOpen(false)}
                />
                <ProjectDetailModal
                    isOpen={!!selectedProjectId}
                    onClose={() => setSelectedProjectId(null)}
                    project={selectedProject}
                />
                <ContentDetailModal
                    isOpen={!!selectedContentId}
                    onClose={() => setSelectedContentId(null)}
                    item={selectedContent}
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
            </div>
        </div>
    )
}
