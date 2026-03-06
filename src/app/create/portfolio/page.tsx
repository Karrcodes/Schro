'use client'

import React, { useState } from 'react'
import { Shield, ExternalLink, Calendar, Award, CheckCircle2, Plus, Rocket, Globe, X, Orbit } from 'lucide-react'

import { useStudio } from '@/features/studio/hooks/useStudio'
import Link from 'next/link'
import type { StudioProject, StudioPress } from '@/features/studio/types/studio.types'

export default function PortfolioPage() {
    const { projects, press } = useStudio()

    const portfolioProjects = projects.filter(p => p.gtv_featured)
    const portfolioPress = press.filter(p => p.is_portfolio_item && (p.status === 'achieved' || p.status === 'published'))

    const evidenceCount = portfolioProjects.length + portfolioPress.length

    return (
        <main className="pb-24 pt-4 px-4 md:px-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* GTV Status Header */}
                <div className="p-8 rounded-[40px] bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12">
                        <Shield className="w-64 h-64" />
                    </div>

                    <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-400/20 w-fit text-blue-200 border border-blue-400/20 text-[10px] font-bold uppercase tracking-widest">
                                <Shield className="w-3 h-3" />
                                GTV Portfolio Mode
                            </div>
                            <h1 className="text-4xl font-black tracking-tight leading-none">Global Talent Visa<br /><span className="text-blue-300/80">Evidence Evidence Storage</span></h1>
                            <p className="text-[14px] font-medium text-blue-200/60 max-w-xl">
                                Your curated evidence for the September 2026 application. Everything here represents your case for Exceptional Promise under Tech Nation's Digital Technology criteria.
                            </p>
                        </div>

                        <div className="flex gap-4">
                            <div className="p-4 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md">
                                <p className="text-[10px] font-black uppercase tracking-widest text-blue-300 mb-1">Application Target</p>
                                <div className="flex items-center gap-2 text-xl font-bold">
                                    <Calendar className="w-5 h-5 text-blue-400" />
                                    Sept 2026
                                </div>
                            </div>
                            <div className="p-4 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md">
                                <p className="text-[10px] font-black uppercase tracking-widest text-blue-300 mb-1">Evidence Count</p>
                                <div className="flex items-center gap-2 text-xl font-bold">
                                    <Award className="w-5 h-5 text-blue-400" />
                                    {evidenceCount} / 10
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Portfolio Sections */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {['Innovation', 'Impact', 'Recognition'].map(category => {
                        const isInnovation = category.toLowerCase() === 'innovation';
                        const activeProjects = isInnovation ? portfolioProjects : [];
                        const activePress = portfolioPress.filter(p => p.gtv_category === category.toLowerCase());
                        const totalCount = activeProjects.length + activePress.length;

                        return (
                            <div key={category} className="space-y-4">
                                <div className="flex items-center justify-between px-2">
                                    <h2 className="text-[12px] font-black text-black/40 uppercase tracking-[0.2em]">{category}</h2>
                                    <span className="text-[11px] font-bold text-black/20">{totalCount} pieces</span>
                                </div>
                                <div className="rounded-[32px] bg-white border border-black/[0.05] p-3 flex flex-col min-h-[500px] h-[600px] overflow-hidden">
                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
                                        {totalCount === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-center">
                                                <div className="w-16 h-16 rounded-full bg-black/[0.02] border-2 border-dashed border-black/[0.05] flex items-center justify-center mb-6">
                                                    <Plus className="w-8 h-8 text-black/10" />
                                                </div>
                                                <h3 className="text-[13px] font-bold text-black/30">Add {category} Evidence</h3>
                                                <p className="text-[11px] text-black/20 mt-2 px-4">Tag active projects as 'gtv_featured' to curate your portfolio.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {activeProjects.map(project => (
                                                    <div key={project.id} className="p-4 bg-black/[0.02] rounded-[24px] border border-black/[0.05] flex justify-between items-start gap-3 hover:border-blue-200 transition-colors group">
                                                        <div className="flex gap-3">
                                                            <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                                                                <Rocket className="w-4 h-4" />
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="text-[9px] font-black uppercase tracking-widest text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">Project</span>
                                                                </div>
                                                                <h3 className="text-[13px] font-black text-black group-hover:text-blue-600 transition-colors leading-tight mb-1">{project.title}</h3>
                                                                {project.description && <p className="text-[11px] font-medium text-black/60 line-clamp-2">{project.description}</p>}
                                                            </div>
                                                        </div>
                                                        <Link href="/create/projects" className="p-2 rounded-xl text-black/20 hover:text-black hover:bg-black/5 bg-white shrink-0 transition-colors shadow-sm">
                                                            <ExternalLink className="w-3.5 h-3.5" />
                                                        </Link>
                                                    </div>
                                                ))}

                                                {activePress.map(p => (
                                                    <div key={p.id} className="p-4 bg-black/[0.02] rounded-[24px] border border-black/[0.05] flex justify-between items-start gap-3 hover:border-blue-200 transition-colors group">
                                                        <div className="flex gap-3">
                                                            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                                                <Globe className="w-4 h-4" />
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Press & Media</span>
                                                                </div>
                                                                <h3 className="text-[13px] font-black text-black group-hover:text-blue-600 transition-colors leading-tight mb-1">{p.title}</h3>
                                                                <p className="text-[11px] font-bold text-black/40">{p.organization} • {p.type}</p>
                                                            </div>
                                                        </div>
                                                        <Link href="/create/press" className="p-2 rounded-xl text-black/20 hover:text-black hover:bg-black/5 bg-white shrink-0 transition-colors shadow-sm">
                                                            <ExternalLink className="w-3.5 h-3.5" />
                                                        </Link>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Resources */}
                <div className="p-6 rounded-3xl bg-blue-50 border border-blue-200/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="text-[14px] font-black text-blue-900">Tech Nation Guidelines</h4>
                            <p className="text-[12px] font-medium text-blue-800/60">Review the official criteria for Exceptional Promise endorsement.</p>
                        </div>
                    </div>
                    <a
                        href="https://technation.io/visa/digital-technology-exceptional-promise-criteria/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-6 py-3 bg-blue-900 text-white rounded-2xl text-[12px] font-bold hover:bg-blue-800 transition-all"
                    >
                        View Official Guide
                        <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                </div>
            </div>
        </main>
    )
}
