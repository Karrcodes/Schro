'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Rocket, Globe, Video, Type, CheckCircle2, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PortfolioDetailModalProps {
    isOpen: boolean
    onClose: () => void
    item: any
    coverUrl: string | null
    displayTitle: string
}

export default function PortfolioDetailModal({ isOpen, onClose, item, coverUrl, displayTitle }: PortfolioDetailModalProps) {
    if (!item) return null

    const typeLabel = item._type === 'project' ? 'Project' : 
                      item._type === 'press' ? 'Press' : 
                      item._type === 'media' ? 'Media' : 'Article'
                      
    const Icon = item._type === 'project' ? Rocket :
                 item._type === 'press' ? Globe :
                 item._type === 'media' ? Video : Type

    const isDiscovered = !item.id && !!item.framer_cms_id

    const colorClass = item._type === 'project' ? "text-orange-600 bg-orange-50" :
                       item._type === 'press' ? "text-emerald-600 bg-emerald-50" :
                       item._type === 'media' ? "text-blue-600 bg-blue-50" : "text-indigo-600 bg-indigo-50"

    const stripHtml = (text: string | undefined | null) => {
        if (!text) return text;
        // Convert structural HTML elements to newlines
        let formatted = text.replace(/<\/?(p|br|div|h[1-6])[^>]*>/gi, '\n');
        // Strip remaining HTML tags
        formatted = formatted.replace(/<[^>]+>/g, '');
        // Decode common HTML entities
        formatted = formatted.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        // Collapse multiple empty newlines
        return formatted.replace(/\n\s*\n/g, '\n\n').trim();
    }

    const getCMSBodyText = () => {
        // 1. Check local DB mapped fields first
        if (item.body) return stripHtml(item.body);
        
        // 2. Dig into raw Framer data to find "body text"
        const fd = item.fieldData || item.stage_data?.fieldData;
        const fields = item._fields || item.stage_data?._fields;
        
        if (fd && fields) {
            const bodyField = fields.find((f: any) => 
                f.slug === 'body-text' || f.name.toLowerCase() === 'body text' || f.slug === 'body' || f.name.toLowerCase() === 'body' || f.id === 'body-text'
            );
            
            if (bodyField && fd[bodyField.id]) {
                const val = fd[bodyField.id];
                if (typeof val === 'string') return stripHtml(val);
                
                // Extract from rich text/formatted content
                if (val && typeof val === 'object') {
                    if (typeof val.value === 'string') return stripHtml(val.value);
                    if (val.text) return stripHtml(val.text);
                    if (val.html) return stripHtml(val.html);
                    if (val.value?.text) return stripHtml(val.value.text);
                    if (val.value?.html) return stripHtml(val.value.html);
                }
            }
        }
        
        // 3. Fallbacks
        return stripHtml(item.description || item.tagline || item.notes || item.gtv_narrative);
    }

    const description = getCMSBodyText();

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90]"
                    />

                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] z-[100] max-h-[90vh] overflow-y-auto shadow-2xl border-t border-black/5 no-scrollbar"
                    >
                        {/* Command Center */}
                        <div className="absolute top-8 right-8 md:top-10 md:right-12 flex items-center gap-3 z-50">
                            <button
                                onClick={onClose}
                                className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-black/[0.03] hover:bg-black/[0.1] rounded-full transition-all active:scale-90 border border-black/5 group"
                                title="Close Preview"
                            >
                                <X className="w-4 h-4 md:w-5 md:h-5 text-black/40 group-hover:text-black transition-colors" />
                            </button>
                        </div>

                        {/* Handle */}
                        <div className="flex justify-center p-4">
                            <div className="w-12 h-1.5 bg-black/10 rounded-full" />
                        </div>

                        <div className="max-w-4xl mx-auto px-6 md:px-8 pb-20 pt-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                                {/* Left Column: Visual & Meta */}
                                <div className="md:col-span-1 space-y-8">
                                    <div className="relative group aspect-[4/5] rounded-[24px] overflow-hidden border border-black/5 shadow-2xl shadow-black/10 bg-black/[0.02]">
                                        {coverUrl && (
                                            <img
                                                src={coverUrl}
                                                alt={displayTitle}
                                                className="w-full h-full object-cover transition-transform duration-700 max-h-full max-w-full"
                                            />
                                        )}
                                        <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent rounded-b-[24px]">
                                            <div className="flex items-center justify-between">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{typeLabel}</span>
                                                    <span className="text-[12px] font-bold text-white uppercase tracking-widest">{item.category || item._collectionName || 'General'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 bg-black/[0.02] rounded-3xl border border-black/5 space-y-6">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("w-10 h-10 rounded-[14px] flex items-center justify-center border", colorClass)}>
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-black/20 uppercase tracking-widest">Item Classification</span>
                                                <span className={cn("text-[13px] font-black uppercase tracking-tight text-black")}>{typeLabel}</span>
                                            </div>
                                        </div>
                                        <div className="pt-4 border-t border-black/5 flex flex-col gap-1">
                                            <span className="text-[9px] font-black text-black/20 uppercase tracking-widest">Visibility Status</span>
                                            <div className="flex items-center gap-2">
                                                {isDiscovered ? (
                                                    <span className="text-[11px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg flex items-center gap-1.5 border border-emerald-100/50">
                                                        Ready for Import
                                                    </span>
                                                ) : item.is_staged && !item.framer_cms_id ? (
                                                    <span className="text-[11px] font-black uppercase tracking-widest text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg flex items-center gap-1.5 border border-orange-100/50">
                                                        Staged in Queue
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg flex items-center gap-1.5 border border-blue-100/50">
                                                        Live on Website
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Content */}
                                <div className="md:col-span-2 space-y-12 self-start">
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-black/10 text-black/40")}>
                                                    {item.status || 'Active'}
                                                </div>
                                            </div>
                                            <h1 className="text-[32px] md:text-[42px] font-black tracking-tight text-black leading-none">{displayTitle}</h1>
                                            {item.organization && <p className="text-[14px] md:text-[16px] font-bold text-black/40 uppercase tracking-widest">{item.organization}</p>}
                                        </div>

                                        <div className="p-8 bg-black/[0.01] border border-black/[0.03] rounded-[32px] space-y-4">
                                            <div className="flex items-center gap-2 text-black/20 mb-2">
                                                <span className="text-[10px] font-black uppercase tracking-widest">Detail Summary</span>
                                            </div>
                                            <p className="text-[15px] font-medium text-black/70 leading-relaxed whitespace-pre-wrap">{description || 'No detailed description active.'}</p>
                                        </div>
                                    </div>
                                    
                                    {item.gtv_featured && (
                                        <div className="pt-8 border-t border-black/5 space-y-6">
                                            <div className="flex items-center gap-3">
                                                <CheckCircle2 className="w-5 h-5 text-amber-500" />
                                                <h4 className="text-[14px] font-black text-black">GTV Portfolio Evidence</h4>
                                            </div>
                                            <div className="p-6 bg-amber-50/30 border border-amber-100/30 rounded-[24px] space-y-3">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-amber-900/40">Evidence Narrative</span>
                                                <p className="text-[14px] font-medium text-amber-900/80 leading-relaxed italic">
                                                    "{item.gtv_narrative || 'Recognized as Global Talent Visa technical/leadership evidence.'}"
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {item.framer_cms_id && (
                                        <div className="pt-8 border-t border-black/5">
                                            <a
                                                href={`https://karr.tech/${item._type === 'content' ? 'media' : item._type === 'draft' ? 'writing' : item._type}s/${item.slug}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center justify-center w-full py-4 bg-black text-white rounded-2xl text-[12px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-black/20"
                                            >
                                                View Live on Website
                                                <ExternalLink className="w-4 h-4 ml-2" />
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
