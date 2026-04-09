'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWellbeing } from '../contexts/WellbeingContext'
import type { Reflection } from '../types'
import { ReflectZenEditor } from './ReflectZenEditor'
import { PenLine, Plus, Trash2, Quote, ArrowLeft, Search, Calendar, Sparkles, Wand2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

import { format, parseISO } from 'date-fns'
import { Sun, Smile, Meh, CloudRain, Frown } from 'lucide-react'

const MOOD_MAP: Record<string, { icon: any, color: string, bg: string, label: string }> = {
    excellent: { icon: Sun, color: 'text-yellow-500', bg: 'bg-yellow-50', label: 'Excellent' },
    good: { icon: Smile, color: 'text-emerald-500', bg: 'bg-emerald-50', label: 'Good' },
    neutral: { icon: Meh, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Neutral' },
    low: { icon: CloudRain, color: 'text-amber-500', bg: 'bg-amber-50', label: 'Low' },
    bad: { icon: Frown, color: 'text-rose-500', bg: 'bg-rose-50', label: 'Bad' },
}

function formatDate(dateStr: string) {
    try { return format(parseISO(dateStr), 'EEE, MMM do yyyy') }
    catch { return dateStr }
}

function stripHtml(html: string) {
    if (typeof document !== 'undefined') {
        const doc = new DOMParser().parseFromString(html, 'text/html')
        return doc.body.textContent || ''
    }
    return html.replace(/<[^>]*>/g, '')
}

interface ReflectionEditorProps {
    reflection: Reflection | null
    onSave: (content: string, id?: string) => void
    onBack: () => void
}

function ReflectionEditor({ reflection, onSave, onBack }: ReflectionEditorProps) {
    const [content, setContent] = useState(reflection?.content || '')
    const [isSaving, setIsSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
    const hasChanges = content !== (reflection?.content || '')

    const handleSave = async () => {
        if (!content.trim() || isSaving) return
        setIsSaving(true)
        await new Promise(r => setTimeout(r, 400))
        onSave(content, reflection?.id)
        setIsSaving(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
    }

    const wordCount = stripHtml(content).trim().split(/\s+/).filter(Boolean).length

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="flex flex-col min-h-[60vh]"
        >
            {/* Editor header */}
            <div className="flex items-center justify-between mb-8">
                <button
                    onClick={() => {
                        if (hasChanges) setShowDiscardConfirm(true)
                        else onBack()
                    }}
                    className="flex items-center gap-2 text-[11px] font-black text-black/40 uppercase tracking-widest hover:text-black transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </button>
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-black/20 uppercase tracking-widest">{wordCount} words</span>
                    <button
                        onClick={handleSave}
                        disabled={!content.trim() || isSaving}
                        className={cn(
                            'px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all',
                            saved
                                ? 'bg-emerald-500 text-white'
                                : content.trim()
                                    ? 'bg-black text-white hover:bg-black/80 shadow-lg shadow-black/10'
                                    : 'bg-black/5 text-black/20 cursor-not-allowed'
                        )}
                    >
                        {isSaving ? 'Saving...' : saved ? '✓ Saved' : 'Save Entry'}
                    </button>
                </div>
            </div>

            {/* Date */}
            <p className="text-[10px] font-black text-black/20 uppercase tracking-[0.3em] mb-4">
                {formatDate(reflection?.date || new Date().toISOString().split('T')[0])}
            </p>

            {/* Writing area */}
            <div className="relative flex-1">
                <ReflectZenEditor 
                    content={content}
                    onChange={setContent}
                />
            </div>

            <p className="text-[9px] font-black text-black/15 uppercase tracking-widest text-right mt-12">
                Formatting tools appear at the bottom
            </p>

            {/* Discard changes modal */}
            <AnimatePresence>
                {showDiscardConfirm && (
                    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.94 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.94 }}
                            className="bg-white rounded-[28px] p-8 shadow-2xl shadow-black/20 max-w-sm w-full space-y-6 border border-black/5"
                        >
                            <div className="space-y-2 text-center">
                                <h3 className="text-[16px] font-black uppercase tracking-tighter">Discard Changes?</h3>
                                <p className="text-[13px] text-black/40 font-medium">You have unsaved changes in your reflection.</p>
                            </div>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setShowDiscardConfirm(false)} 
                                    className="flex-1 py-3 rounded-2xl bg-black/5 text-black/60 text-[12px] font-black uppercase tracking-widest hover:bg-black/10 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={onBack} 
                                    className="flex-1 py-3 rounded-2xl bg-black text-white text-[12px] font-black uppercase tracking-widest shadow-lg shadow-black/10 hover:bg-black/80 transition-colors"
                                >
                                    Discard
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}

export function ReflectionPage() {
    const { reflections, saveReflection, deleteReflection, moodLogs } = useWellbeing()
    const [activeReflection, setActiveReflection] = useState<Reflection | null>(null)
    const [isNew, setIsNew] = useState(false)
    const [search, setSearch] = useState('')
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
    const [viewingReflection, setViewingReflection] = useState<Reflection | null>(null)

    const today = new Date().toISOString().split('T')[0]

    const filtered = reflections.filter((r: Reflection) =>
        !search || stripHtml(r.content).toLowerCase().includes(search.toLowerCase()) || r.date.includes(search)
    )

    const handleNew = () => {
        setActiveReflection(null)
        setIsNew(true)
    }

    const handleSave = async (content: string, id?: string) => {
        await saveReflection(content, id)
        setIsNew(false)
        setActiveReflection(null)
    }

    const handleOpen = (r: Reflection) => {
        setActiveReflection(r)
        setIsNew(true)
    }

    const handleDelete = async (id: string) => {
        if (deleteReflection) await deleteReflection(id)
        setConfirmDelete(null)
    }

    return (
        <div className="space-y-8">
            <AnimatePresence mode="wait">
                {isNew ? (
                    <ReflectionEditor
                        key="editor"
                        reflection={activeReflection || { id: '', date: today, content: '' }}
                        onSave={handleSave}
                        onBack={() => { setIsNew(false); setActiveReflection(null) }}
                    />
                ) : (
                    <motion.div
                        key="list"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-6"
                    >
                        {/* Header Actions */}
                        <div className="flex items-center gap-3">
                            <div className="flex-1 flex items-center gap-2 bg-black/[0.03] border border-black/5 rounded-2xl px-4 py-3">
                                <Search className="w-4 h-4 text-black/20 shrink-0" />
                                <input
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search reflections..."
                                    className="flex-1 bg-transparent text-[13px] font-medium outline-none placeholder:text-black/20"
                                />
                            </div>
                            <button
                                onClick={handleNew}
                                className="flex items-center gap-2 px-5 py-3 bg-black text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-black/10 hover:scale-[1.02] transition-transform shrink-0"
                            >
                                <Plus className="w-4 h-4" />
                                New Entry
                            </button>
                        </div>

                        {/* Reflections list */}
                        {filtered.length === 0 ? (
                            <div className="text-center py-16 space-y-3">
                                <Quote className="w-10 h-10 text-black/[0.06] mx-auto" />
                                <p className="text-[12px] font-black text-black/20 uppercase tracking-widest">
                                    {search ? 'No matching entries' : 'No reflections yet'}
                                </p>
                                {!search && (
                                    <p className="text-[11px] font-medium text-black/20">Start your first entry above</p>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filtered.map((ref: Reflection) => {
                                    const moodEntry = moodLogs.find(m => m.date === ref.date)
                                    const mood = moodEntry ? MOOD_MAP[moodEntry.value] : null
                                    
                                    return (
                                        <motion.div
                                            key={ref.id}
                                            layout
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            onClick={() => setViewingReflection(ref)}
                                            className="group bg-white border border-black/5 rounded-[24px] p-6 flex items-start gap-4 hover:shadow-sm transition-all cursor-pointer hover:border-black/10 active:scale-[0.99]"
                                        >
                                            <div className="w-10 h-10 rounded-2xl bg-black/[0.03] border border-black/5 flex items-center justify-center shrink-0 mt-0.5">
                                                <Calendar className="w-4 h-4 text-black/20" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <p className="text-[10px] font-black text-black/30 uppercase tracking-widest">
                                                        {formatDate(ref.date)}
                                                    </p>
                                                    {mood && (
                                                        <div className={cn(
                                                            "flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-black/5 shrink-0",
                                                            mood.bg
                                                        )}>
                                                            <mood.icon className={cn("w-2.5 h-2.5", mood.color)} />
                                                            <span className={cn("text-[8px] font-black uppercase tracking-widest", mood.color)}>
                                                                {mood.label}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {ref.date === today && (
                                                        <span className="px-2 py-0.5 bg-black text-white rounded-full text-[9px] font-black uppercase tracking-widest">Today</span>
                                                    )}
                                                </div>
                                                <p className="text-[14px] font-medium text-black/70 leading-relaxed line-clamp-2 italic">
                                                    "{stripHtml(ref.content)}"
                                                </p>
                                                <p className="text-[10px] font-black text-black/20 uppercase mt-2">
                                                    {stripHtml(ref.content).trim().split(/\s+/).filter(Boolean).length} words
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleOpen(ref) }}
                                                    className="p-3 bg-black/5 hover:bg-black/10 rounded-xl transition-colors"
                                                    title="Edit"
                                                >
                                                    <PenLine className="w-4 h-4 text-black/60" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(ref.id) }}
                                                    className="p-3 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4 text-rose-500/60 hover:text-rose-500" />
                                                </button>
                                            </div>
                                        </motion.div>
                                    )
                                })}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Delete confirmation */}
            <AnimatePresence>
                {confirmDelete && (
                    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.94 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.94 }}
                            className="bg-white rounded-[28px] p-8 shadow-2xl shadow-black/20 max-w-sm w-full space-y-6 border border-black/5"
                        >
                            <div className="space-y-2">
                                <h3 className="text-[16px] font-black uppercase tracking-tighter">Delete Reflection?</h3>
                                <p className="text-[13px] text-black/40 font-medium">This entry will be permanently removed.</p>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setConfirmDelete(null)} className="flex-1 py-3 rounded-2xl bg-black/5 text-black/60 text-[12px] font-black uppercase tracking-widest hover:bg-black/10 transition-colors">
                                    Cancel
                                </button>
                                <button onClick={() => handleDelete(confirmDelete!)} className="flex-1 py-3 rounded-2xl bg-rose-500 text-white text-[12px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/20 hover:bg-rose-600 transition-colors">
                                    Delete
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            
            {/* View Modal */}
            <AnimatePresence>
                {viewingReflection && (
                    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 md:p-8 bg-black/20 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.94, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.94, y: 20 }}
                            className="bg-white rounded-[32px] shadow-2xl shadow-black/20 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-black/5"
                        >
                            {/* Modal Header */}
                            <div className="p-8 pb-4 flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        {(() => {
                                            const moodEntry = moodLogs.find(m => m.date === viewingReflection.date)
                                            const mood = moodEntry ? MOOD_MAP[moodEntry.value] : null
                                            if (!mood) return null
                                            return (
                                                <div className={cn("flex items-center gap-1.5 px-3 py-1 rounded-full border border-black/5", mood.bg)}>
                                                    <mood.icon className={cn("w-3 h-3", mood.color)} />
                                                    <span className={cn("text-[10px] font-black uppercase tracking-widest", mood.color)}>
                                                        {mood.label}
                                                    </span>
                                                </div>
                                            )
                                        })()}
                                    </div>
                                    <h2 className="text-[20px] font-black uppercase tracking-tighter">{formatDate(viewingReflection.date)}</h2>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => { handleOpen(viewingReflection); setViewingReflection(null) }}
                                        className="p-3 bg-black text-white hover:bg-black/80 rounded-2xl shadow-lg shadow-black/10 transition-all active:scale-95"
                                        title="Edit Entry"
                                    >
                                        <PenLine className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setViewingReflection(null)}
                                        className="p-3 bg-black/5 hover:bg-black/10 rounded-2xl transition-all active:scale-95"
                                        title="Close"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Content */}
                            <div className="flex-1 overflow-y-auto px-8 pb-12">
                                <div 
                                    className="text-[16px] font-medium text-black/80 leading-relaxed space-y-4"
                                    dangerouslySetInnerHTML={{ __html: viewingReflection.content }}
                                />
                                <div className="mt-12 pt-8 border-t border-black/5 flex items-center justify-between">
                                    <p className="text-[10px] font-black text-black/20 uppercase tracking-widest">
                                        {stripHtml(viewingReflection.content).trim().split(/\s+/).filter(Boolean).length} Words Written
                                    </p>
                                    <Quote className="w-8 h-8 text-black/[0.03]" />
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
