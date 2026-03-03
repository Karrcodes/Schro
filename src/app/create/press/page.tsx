'use client'

import React, { useState } from 'react'
import { Award, Globe, Shield, Target, Zap, Plus, Search, Filter, ArrowRight, ExternalLink, Calendar, Briefcase } from 'lucide-react'
import { useStudio } from '@/features/studio/hooks/useStudio'
import CreatePressModal from '@/features/studio/components/CreatePressModal'
import PressDetailModal from '@/features/studio/components/PressDetailModal'
import type { StudioPress, PressType, PressStatus } from '@/features/studio/types/studio.types'
import { cn } from '@/lib/utils'

const TYPE_ICONS: Record<PressType, any> = {
    competition: Award,
    grant: Target,
    award: Zap,
    feature: Globe,
    accelerator: Shield,
    other: Award // Using Award as fallback or HelpCircle if preferred
}

const TYPE_COLORS: Record<PressType, string> = {
    competition: 'text-orange-600 bg-orange-50',
    grant: 'text-emerald-600 bg-emerald-50',
    award: 'text-yellow-600 bg-yellow-50',
    feature: 'text-blue-600 bg-blue-50',
    accelerator: 'text-purple-600 bg-purple-50',
    other: 'text-slate-600 bg-slate-50'
}

export default function PressPage() {
    const { press, loading, projects } = useStudio()
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [selectedItem, setSelectedItem] = useState<StudioPress | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterType, setFilterType] = useState<PressType | 'all'>('all')

    const filteredPress = press.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.organization.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesType = filterType === 'all' || item.type === filterType
        return matchesSearch && matchesType
    })

    const goals = filteredPress.filter(p => p.status !== 'achieved' && p.status !== 'published' && p.status !== 'rejected')
    const achievements = filteredPress.filter(p => p.status === 'achieved' || p.status === 'published')

    return (
        <main className="pb-24 pt-4 px-4 md:px-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-[22px] font-bold text-black tracking-tight">Press &amp; Media</h1>
                        <p className="text-[12px] text-black/35 mt-0.5">Studio Module · {press.length} entries · Tracking achievements &amp; strategy</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20 group-focus-within:text-orange-500 transition-colors" />
                            <input
                                placeholder="Search press..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-11 pr-4 py-2.5 bg-white border border-black/[0.05] rounded-2xl text-[13px] font-bold focus:outline-none focus:border-orange-200 w-full md:w-64 shadow-sm"
                            />
                        </div>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded-2xl text-[13px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-black/10 shrink-0"
                        >
                            <Plus className="w-4 h-4" />
                            Add Entry
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2 pb-4 border-b border-black/[0.05]">
                    <button
                        onClick={() => setFilterType('all')}
                        className={cn(
                            "px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
                            filterType === 'all' ? "bg-black text-white" : "bg-white border border-black/[0.05] text-black/40 hover:border-black/20"
                        )}
                    >
                        All Items
                    </button>
                    {(Object.keys(TYPE_ICONS) as PressType[]).map(type => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all border",
                                filterType === type
                                    ? "bg-black text-white border-black"
                                    : "bg-white border-black/[0.05] text-black/40 hover:border-black/20"
                            )}
                        >
                            <span className={cn(filterType === type ? "text-white" : TYPE_COLORS[type].split(' ')[0])}>
                                {React.createElement(TYPE_ICONS[type], { className: "w-3.5 h-3.5" })}
                            </span>
                            {type}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Active Strategy / Goals */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-[12px] font-black text-black/40 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Target className="w-4 h-4 text-orange-500" />
                                Active Strategy & Goals
                            </h2>
                            <span className="text-[11px] font-bold text-black/20">{goals.length} items</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {goals.map(item => (
                                <PressCard key={item.id} item={item} onClick={() => setSelectedItem(item)} projects={projects} />
                            ))}
                            {goals.length === 0 && !loading && (
                                <div className="col-span-2 py-20 bg-black/[0.015] border-2 border-dashed border-black/[0.05] rounded-[40px] flex flex-col items-center justify-center text-center px-6">
                                    <Target className="w-12 h-12 text-black/5 mb-4" />
                                    <p className="text-[13px] font-bold text-black/20 italic">No active strategy items found</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Achievements Showcase */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-[12px] font-black text-black/40 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Award className="w-4 h-4 text-emerald-500" />
                                Achievements
                            </h2>
                            <span className="text-[11px] font-bold text-black/20">{achievements.length} won</span>
                        </div>

                        <div className="space-y-4">
                            {achievements.map(item => (
                                <AchievementCard key={item.id} item={item} onClick={() => setSelectedItem(item)} />
                            ))}
                            {achievements.length === 0 && !loading && (
                                <div className="py-12 bg-black/[0.015] border-2 border-dashed border-black/[0.05] rounded-[32px] flex flex-col items-center justify-center text-center">
                                    <Award className="w-10 h-10 text-black/5 mb-3" />
                                    <p className="text-[11px] font-bold text-black/20 uppercase tracking-widest italic">No achievements yet</p>
                                </div>
                            )}
                        </div>

                        {/* Motivation Card */}
                        <div className="p-6 rounded-[32px] bg-gradient-to-br from-[#0A2647] to-[#144272] text-white space-y-4 shadow-xl shadow-blue-900/20">
                            <Shield className="w-8 h-8 text-blue-300/50" />
                            <div>
                                <h3 className="text-[15px] font-black leading-tight">GTV Evidence Hub</h3>
                                <p className="text-[12px] text-blue-200/60 mt-2 font-medium">Mark achievements as 'Portfolio Item' to automatically sync them with your Global Talent Visa dossier.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <CreatePressModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />
            <PressDetailModal
                isOpen={!!selectedItem}
                onClose={() => setSelectedItem(null)}
                item={selectedItem}
            />
        </main>
    )
}

function PressCard({ item, onClick, projects }: { item: StudioPress; onClick: () => void, projects: any[] }) {
    const Icon = TYPE_ICONS[item.type]
    const project = projects.find(p => p.id === item.project_id)

    return (
        <div
            onClick={onClick}
            className="p-5 bg-white border border-black/[0.05] rounded-[32px] hover:border-orange-200 hover:shadow-xl transition-all group cursor-pointer flex flex-col h-full"
        >
            <div className="flex justify-between items-start mb-4">
                <div className={cn("px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5", TYPE_COLORS[item.type])}>
                    <Icon className="w-3 h-3" />
                    {item.type}
                </div>
                {item.is_portfolio_item && <Shield className="w-4 h-4 text-blue-500" />}
            </div>

            <h3 className="text-[15px] font-black text-black group-hover:text-orange-600 transition-colors leading-tight mb-1">{item.title}</h3>
            <p className="text-[12px] font-bold text-black/40 mb-4">{item.organization}</p>

            {item.milestone_goal && (
                <div className="flex-1 p-3 bg-black/[0.02] rounded-2xl mb-4 border border-black/[0.03]">
                    <p className="text-[11px] text-black/60 font-medium line-clamp-3 italic">"{item.milestone_goal}"</p>
                </div>
            )}

            <div className="mt-auto space-y-3 pt-3 border-t border-black/[0.05]">
                <div className="flex items-center justify-between">
                    {project && (
                        <div className="flex items-center gap-2 text-[10px] font-black text-black/40">
                            <Briefcase className="w-3 h-3" />
                            {project.title}
                        </div>
                    )}
                    {item.deadline && (
                        <div className="flex items-center gap-2 text-[10px] font-black text-black/40 ml-auto">
                            <Calendar className="w-3 h-3" />
                            {new Date(item.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </div>
                    )}
                </div>
                <div className="flex items-center justify-between">
                    <span className={cn(
                        "text-[9px] font-black uppercase px-2 py-0.5 rounded-lg",
                        item.status === 'applying' ? "bg-blue-50 text-blue-600" : "bg-black/[0.04] text-black/30"
                    )}>
                        {item.status.replace('_', ' ')}
                    </span>
                    {item.url && <ExternalLink className="w-3 h-3 text-black/20" />}
                </div>
            </div>
        </div>
    )
}

function AchievementCard({ item, onClick }: { item: StudioPress; onClick: () => void }) {
    const Icon = TYPE_ICONS[item.type]

    return (
        <div
            onClick={onClick}
            className="p-4 bg-white border border-black/[0.05] rounded-3xl hover:shadow-lg transition-all group cursor-pointer relative overflow-hidden"
        >
            <div className="flex items-center gap-4">
                <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shrink-0", TYPE_COLORS[item.type])}>
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-[13px] font-black text-black leading-none">{item.title}</h3>
                    <p className="text-[11px] font-bold text-black/30 mt-1">{item.organization}</p>
                </div>
                {item.is_portfolio_item && <Shield className="w-3 h-3 text-blue-500 absolute top-4 right-4" />}
            </div>
        </div>
    )
}
