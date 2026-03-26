'use client'

import React from 'react'
import { Shield, Rocket, Globe, Award, Target, Zap, Clock, Calendar, X } from 'lucide-react'
import type { StudioProject, StudioPress } from '../types/studio.types'
import { cn } from '@/lib/utils'

interface GTVEvidencePageProps {
    project?: StudioProject
    press?: StudioPress
    pageNumber: number
}

function GTVEvidencePage({ project, press, pageNumber }: GTVEvidencePageProps) {
    const title = project?.title || press?.title
    const category = (project?.gtv_category || press?.gtv_category || 'Evidence').toUpperCase()
    const narrative = project?.gtv_narrative || project?.description || press?.notes || 'No narrative provided yet.'
    
    return (
        <div className="w-full aspect-[1/1.414] bg-white shadow-2xl rounded-sm p-16 flex flex-col gap-8 text-black relative overflow-hidden print:shadow-none print:rounded-none">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-blue-600 pb-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-blue-600">
                        <Shield className="w-5 h-5" />
                        <span className="text-[12px] font-black uppercase tracking-[0.3em]">Criteria: {category}</span>
                    </div>
                    <h1 className="text-3xl font-black tracking-tighter uppercase grayscale">{title}</h1>
                </div>
                <div className="text-right">
                    <span className="text-[10px] font-black text-black/20 uppercase tracking-widest">Evidence Item #{pageNumber}</span>
                </div>
            </div>

            {/* Content Grid */}
            <div className="flex-1 grid grid-cols-5 gap-12">
                {/* Left: Metadata & Stats */}
                <div className="col-span-2 space-y-8">
                    <div className="aspect-square rounded-3xl overflow-hidden border border-black/5 bg-black/[0.02]">
                        <img 
                            src={project?.cover_url || (press?.url ? `https://api.microlink.io/?url=${encodeURIComponent(press.url)}&screenshot=true&embed=screenshot.url` : '/api/studio/cover?title=' + encodeURIComponent(title || ''))} 
                            className="w-full h-full object-cover grayscale opacity-80"
                            alt="Evidence Visual"
                        />
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-black/30">Key Performance Indicators</h4>
                            <div className="grid grid-cols-1 gap-2">
                                {project && (
                                    <>
                                        <div className="flex items-center justify-between p-3 bg-black/[0.02] rounded-xl border border-black/[0.05]">
                                            <div className="flex items-center gap-2 text-[11px] font-bold text-black/40">
                                                <Zap className="w-3.5 h-3.5" />
                                                Impact Score
                                            </div>
                                            <span className="text-[12px] font-black text-black">{project.impact_score}/10</span>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-black/[0.02] rounded-xl border border-black/[0.05]">
                                            <div className="flex items-center gap-2 text-[11px] font-bold text-black/40">
                                                <Award className="w-3.5 h-3.5" />
                                                Status
                                            </div>
                                            <span className="text-[12px] font-black text-black uppercase">{project.status}</span>
                                        </div>
                                    </>
                                )}
                                {press && (
                                    <div className="flex items-center justify-between p-3 bg-black/[0.02] rounded-xl border border-black/[0.05]">
                                        <div className="flex items-center gap-2 text-[11px] font-bold text-black/40">
                                            <Globe className="w-3.5 h-3.5" />
                                            Publisher
                                        </div>
                                        <span className="text-[12px] font-black text-black">{press.organization}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-black/30">Timeline Reference</h4>
                            <div className="flex items-center gap-3 text-black/60">
                                <Calendar className="w-4 h-4" />
                                <span className="text-[12px] font-bold">
                                    {project?.start_date ? new Date(project.start_date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : 'Ongoing'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Narrative */}
                <div className="col-span-3 space-y-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Target className="w-4 h-4 text-blue-600" />
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-blue-900/60">Professional Narrative</h3>
                        </div>
                        <p className="text-[16px] font-medium leading-[1.6] text-black/80 whitespace-pre-wrap pt-2 border-t border-black/[0.05]">
                            {narrative}
                        </p>
                    </div>

                    <div className="mt-12 p-6 bg-blue-50/30 rounded-3xl border border-blue-100/50">
                        <p className="text-[11px] font-bold text-blue-900/40 leading-relaxed italic">
                            "This evidence demonstrates exceptional promise in the field of digital technology by showcasing {category.toLowerCase()} through concrete project execution and delivery."
                        </p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-auto pt-8 border-t border-black/5 flex justify-between items-center opacity-20">
                <span className="text-[9px] font-black uppercase tracking-[0.4em]">Schrö Portfolio Engine • GTV Application v.2026</span>
                <span className="text-[9px] font-black">{pageNumber}</span>
            </div>
            
            {/* Watermark */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] rotate-[-45deg] pointer-events-none">
                <Shield className="w-[600px] h-[600px] text-black" />
            </div>
        </div>
    )
}

interface PortfolioDocumentProps {
    projects: StudioProject[]
    press: StudioPress[]
    onClose: () => void
}

export default function PortfolioDocument({ projects, press, onClose }: PortfolioDocumentProps) {
    const items = [...projects.map(p => ({ type: 'project', data: p })), ...press.map(p => ({ type: 'press', data: p }))]

    return (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md overflow-y-auto pt-20 pb-40 px-6 no-scrollbar h-screen">
            <div className="max-w-4xl mx-auto space-y-20">
                <div className="flex items-center justify-between sticky top-0 z-50 py-4 mb-10 bg-black/40 backdrop-blur-md rounded-full px-8 border border-white/5 shadow-2xl">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                            <Shield className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-white font-black text-lg">GTV Evidence Builder</h2>
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{items.length} Pages Generated</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => window.print()}
                            className="px-6 py-2.5 bg-white text-black rounded-2xl text-[12px] font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-xl"
                        >
                            Download PDF
                        </button>
                        <button 
                            onClick={onClose}
                            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl text-white/40 hover:text-white transition-all border border-white/10"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="space-y-24 print:space-y-0">
                    {items.map((item, index) => (
                        <div key={index} className="print:page-break-after-always">
                            <GTVEvidencePage 
                                project={item.type === 'project' ? item.data as StudioProject : undefined}
                                press={item.type === 'press' ? item.data as StudioPress : undefined}
                                pageNumber={index + 1}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
