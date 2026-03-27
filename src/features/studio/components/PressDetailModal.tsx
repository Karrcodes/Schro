'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    X, Award, Globe, Shield, Calendar, Link as LinkIcon, Pencil, Save, Trash2, 
    ExternalLink, Rocket, Target, Zap, CheckCircle2, Check, Upload, Image as ImageIcon, 
    Sparkles, Loader2, RefreshCw, Layers, AlignLeft, Clock
} from 'lucide-react'
import DatePickerInput from '@/components/DatePickerInput'
import { useStudio } from '../hooks/useStudio'
import { useSystemSettings } from '@/features/system/contexts/SystemSettingsContext'
import type { PressType, PressStatus, StudioPress } from '../types/studio.types'
import { cn } from '@/lib/utils'
import ConfirmationModal from '@/components/ConfirmationModal'
import { FramerSyncStatus } from './FramerSyncStatus'

interface PressDetailModalProps {
    isOpen: boolean
    onClose: () => void
    item: StudioPress | null
}

const PRESS_TYPES: { value: PressType; label: string; icon: any; color: string }[] = [
    { value: 'competition', label: 'Competition', icon: Award, color: 'text-orange-600' },
    { value: 'grant', label: 'Grant', icon: Target, color: 'text-emerald-600' },
    { value: 'award', label: 'Award', icon: Zap, color: 'text-yellow-600' },
    { value: 'feature', label: 'Feature/PR', icon: Globe, color: 'text-blue-600' },
    { value: 'accelerator', label: 'Accelerator', icon: Shield, color: 'text-purple-600' },
    { value: 'other', label: 'Other', icon: Award, color: 'text-slate-600' }
]

const STATUSES: { value: PressStatus; label: string; color: string }[] = [
    { value: 'not_started', label: 'Backlog / Goal', color: 'text-slate-400' },
    { value: 'applying', label: 'Active Application', color: 'text-blue-500' },
    { value: 'submitted', label: 'Submitted / Pending', color: 'text-orange-500' },
    { value: 'achieved', label: 'Won / Achieved', color: 'text-emerald-500' },
    { value: 'published', label: 'Live / Published', color: 'text-purple-500' },
    { value: 'rejected', label: 'Unsuccessful', color: 'text-red-500' }
]

export default function PressDetailModal({ isOpen, onClose, item }: PressDetailModalProps) {
    const { refresh, updatePress, deletePress, projects, stageItem, regeneratePressCover, generatingPressIds } = useStudio()
    const { settings } = useSystemSettings()
    
    const [isEditing, setIsEditing] = useState(false)
    const [editedData, setEditedData] = useState<Partial<StudioPress>>({})
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [coverFile, setCoverFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

    const isGenerating = item ? generatingPressIds.includes(item.id) : false

    useEffect(() => {
        if (!isOpen || !item) return
        setEditedData({})
        setIsEditing(false)
        setCoverFile(null)
        setPreviewUrl(null)
    }, [isOpen, item])

    if (!item) return null

    const handleSave = async () => {
        try {
            await updatePress(item.id, editedData, coverFile || undefined)
            setIsEditing(false)
            setCoverFile(null)
            setPreviewUrl(null)
        } catch (err: any) {
            alert(`Failed to save: ${err.message}`)
        }
    }

    const currentType = PRESS_TYPES.find(t => t.value === (editedData.type ?? item.type)) || PRESS_TYPES[0]
    const currentStatus = STATUSES.find(s => s.value === (editedData.status ?? item.status)) || STATUSES[0]

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110]"
                    />

                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[40px] z-[120] max-h-[95vh] overflow-y-auto shadow-2xl border-t border-black/5 no-scrollbar font-outfit"
                    >
                        {/* Command Center */}
                        <div className="absolute top-8 right-8 flex items-center gap-3 z-50">
                            {!isEditing && (
                                <button
                                    onClick={() => {
                                        setEditedData(item)
                                        setIsEditing(true)
                                    }}
                                    className="w-12 h-12 flex items-center justify-center bg-black text-white rounded-full transition-all active:scale-90 shadow-xl shadow-black/10 hover:scale-110 group"
                                    title="Edit Entry"
                                >
                                    <Pencil className="w-5 h-5" />
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="w-12 h-12 flex items-center justify-center bg-black/[0.03] hover:bg-black/[0.06] rounded-full transition-all active:scale-90 border border-black/5 group"
                                title="Close"
                            >
                                <X className="w-6 h-6 text-black/20 group-hover:text-black transition-colors" />
                            </button>
                        </div>

                        {/* Handle */}
                        <div className="flex justify-center p-4">
                            <div className="w-12 h-1.5 bg-black/10 rounded-full" />
                        </div>

                        <div className="max-w-5xl mx-auto px-6 md:px-12 pb-24 pt-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                                
                                {/* Left Column: Visual & Meta */}
                                <div className="md:col-span-1 space-y-8">
                                    <div className="relative group aspect-[3/4] rounded-[40px] overflow-hidden border border-black/5 shadow-2xl shadow-black/5 bg-black/[0.02]">
                                        <img
                                            src={previewUrl || item.cover_url || `/api/studio/cover?title=${encodeURIComponent(item.title)}&tagline=${encodeURIComponent(item.organization)}&type=press&id=${item.id}`}
                                            alt={item.title}
                                            className={cn(
                                                "w-full h-full object-cover transition-transform duration-700",
                                                !isEditing && "group-hover:scale-110",
                                                isGenerating && "blur-md opacity-40 grayscale"
                                            )}
                                        />
                                        
                                        <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
                                            <div className="flex items-center justify-between">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{currentType.label}</span>
                                                    <span className="text-[13px] font-bold text-white leading-tight">{item.organization}</span>
                                                </div>
                                                <button
                                                    onClick={() => regeneratePressCover(item.id)}
                                                    disabled={isGenerating}
                                                    className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/40 transition-colors"
                                                >
                                                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        {isEditing && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="px-6 py-3 bg-white text-black rounded-2xl text-[12px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2"
                                                >
                                                    <Upload className="w-4 h-4" />
                                                    Replace
                                                </button>
                                            </div>
                                        )}

                                        {isGenerating && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm gap-2">
                                                <Loader2 className="w-8 h-8 text-white animate-spin" />
                                                <span className="text-[10px] font-black text-white uppercase tracking-widest">Generating...</span>
                                            </div>
                                        )}
                                    </div>
                                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => {
                                        const file = e.target.files?.[0]
                                        if (file) { setCoverFile(file); setPreviewUrl(URL.createObjectURL(file)) }
                                    }} />

                                    {/* Staging & Sync */}
                                    <FramerSyncStatus
                                        itemId={item.id}
                                        itemType="press"
                                        framerCmsId={item.framer_cms_id}
                                        isStaged={item.is_staged}
                                        collectionName="Press & Awards"
                                        onStage={async (staged) => {
                                            await stageItem(item.id, 'press', staged)
                                            await refresh()
                                        }}
                                        onStatusChange={() => refresh()}
                                        className="p-6 bg-black/[0.02] rounded-[32px] border border-black/5"
                                    />

                                    {/* Status Badge Passive */}
                                    {!isEditing && (
                                        <div className="p-6 bg-black/[0.015] border border-black/[0.03] rounded-[32px] space-y-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-black/30">Entry Status</span>
                                                <div className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border", currentStatus.color.replace('text-', 'bg-').split('-')[0] + '-50', currentStatus.color)}>
                                                    {currentStatus.label}
                                                </div>
                                            </div>
                                            {item.deadline && (
                                                <div className="flex items-center justify-between pt-2">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-black/30">Target / Date</span>
                                                    <span className="text-[12px] font-bold text-black">{new Date(item.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <button
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="w-full py-4 border border-rose-500/10 bg-rose-500/5 text-rose-500 rounded-3xl text-[11px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all active:scale-95"
                                    >
                                        <Trash2 className="w-3.5 h-3.5 inline mr-2" />
                                        Delete Entry
                                    </button>
                                </div>

                                {/* Right Column: Content & Modifiers */}
                                <div className="md:col-span-2 space-y-10">
                                    {isEditing ? (
                                        <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
                                            {/* Header Editing */}
                                            <div className="space-y-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-black/30 uppercase tracking-widest ml-1">Entry Title</label>
                                                    <input
                                                        autoFocus
                                                        value={editedData.title ?? item.title}
                                                        onChange={e => setEditedData(prev => ({ ...prev, title: e.target.value }))}
                                                        className="w-full text-[24px] md:text-[36px] font-black tracking-tight bg-transparent border-none p-0 focus:ring-0 outline-none placeholder:text-black/5"
                                                        placeholder="Achievement Name..."
                                                    />
                                                </div>
                                                <div className="space-y-2 pt-4 border-t border-black/5">
                                                    <label className="text-[10px] font-black text-black/30 uppercase tracking-widest ml-1">Issuing Organization / Publisher</label>
                                                    <input
                                                        value={editedData.organization ?? item.organization}
                                                        onChange={e => setEditedData(prev => ({ ...prev, organization: e.target.value }))}
                                                        className="w-full text-lg font-bold text-black/60 bg-transparent border-none p-0 focus:ring-0 outline-none placeholder:text-black/5"
                                                        placeholder="e.g. Forbes, RIBA, TechCrunch..."
                                                    />
                                                </div>
                                            </div>

                                            {/* Description */}
                                            <div className="space-y-3 pt-6 border-t border-black/5">
                                                <div className="flex items-center gap-2 text-black/20">
                                                    <AlignLeft className="w-4 h-4" />
                                                    <label className="text-[10px] font-black uppercase tracking-widest">Entry Description</label>
                                                </div>
                                                <textarea
                                                    value={editedData.description ?? item.description ?? ''}
                                                    onChange={e => setEditedData(prev => ({ ...prev, description: e.target.value }))}
                                                    placeholder="Detail the significance of this entry..."
                                                    rows={4}
                                                    className="w-full text-[15px] font-medium text-black/70 bg-black/[0.02] border border-black/5 rounded-[24px] p-6 focus:ring-0 outline-none resize-none leading-relaxed"
                                                />
                                            </div>

                                            {/* Selectors Row */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-black/5">
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black text-black/30 uppercase tracking-widest ml-1">Category</label>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {PRESS_TYPES.slice(0, 4).map(t => (
                                                            <button
                                                                key={t.value}
                                                                onClick={() => setEditedData(prev => ({ ...prev, type: t.value }))}
                                                                className={cn(
                                                                    "py-3 rounded-xl border text-[10px] font-black uppercase tracking-tight transition-all",
                                                                    (editedData.type ?? item.type) === t.value ? "bg-black text-white border-black shadow-lg" : "bg-white border-black/5 text-black/20 hover:border-black/20"
                                                                )}
                                                            >
                                                                {t.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black text-black/30 uppercase tracking-widest ml-1">Current Status</label>
                                                    <select
                                                        value={editedData.status ?? item.status}
                                                        onChange={e => setEditedData(prev => ({ ...prev, status: e.target.value as PressStatus }))}
                                                        className="w-full px-5 py-3.5 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-[13px] font-bold focus:outline-none focus:border-orange-200 appearance-none cursor-pointer"
                                                    >
                                                        {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Mixed Attributes */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-black/5">
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black text-black/30 uppercase tracking-widest ml-1">Linked Project</label>
                                                    <select
                                                        value={editedData.project_id ?? item.project_id ?? ''}
                                                        onChange={e => setEditedData(prev => ({ ...prev, project_id: e.target.value || null }))}
                                                        className="w-full px-5 py-3.5 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-[13px] font-bold focus:outline-none focus:border-orange-200 appearance-none cursor-pointer"
                                                    >
                                                        <option value="">No Project</option>
                                                        {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                                                    </select>
                                                </div>
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black text-black/30 uppercase tracking-widest ml-1">Target / achievement Date</label>
                                                    <DatePickerInput
                                                        value={(editedData.deadline ?? item.deadline ?? '').split('T')[0]}
                                                        onChange={val => setEditedData(prev => ({ ...prev, deadline: val }))}
                                                    />
                                                </div>
                                            </div>

                                            {/* Link */}
                                            <div className="space-y-3 pt-6 border-t border-black/5">
                                                <label className="text-[10px] font-black text-black/30 uppercase tracking-widest ml-1">Public Resource Link</label>
                                                <div className="relative">
                                                    <LinkIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                                                    <input
                                                        type="url"
                                                        value={editedData.url ?? item.url ?? ''}
                                                        onChange={e => setEditedData(prev => ({ ...prev, url: e.target.value }))}
                                                        placeholder="https://..."
                                                        className="w-full pl-12 pr-4 py-3.5 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-[13px] font-bold focus:outline-none focus:border-orange-200"
                                                    />
                                                </div>
                                            </div>

                                            {/* Requirement Goal Textarea */}
                                            <div className="space-y-3 pt-6 border-t border-black/5">
                                                <div className="flex items-center gap-2 text-black/20">
                                                    <Target className="w-4 h-4" />
                                                    <label className="text-[10px] font-black uppercase tracking-widest">Requirement / Goal Logic</label>
                                                </div>
                                                <textarea
                                                    value={editedData.milestone_goal ?? item.milestone_goal ?? ''}
                                                    onChange={e => setEditedData(prev => ({ ...prev, milestone_goal: e.target.value }))}
                                                    placeholder="What needs to happen to achieve this?"
                                                    rows={3}
                                                    className="w-full text-[14px] font-medium text-black/60 bg-black/[0.01] border border-black/5 rounded-[24px] p-6 focus:ring-0 outline-none resize-none leading-relaxed"
                                                />
                                            </div>

                                            {/* Strategy & Portfolio */}
                                            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-black/5">
                                                <button
                                                    type="button"
                                                    onClick={() => setEditedData(prev => ({ ...prev, is_strategy_goal: !(editedData.is_strategy_goal ?? item.is_strategy_goal) }))}
                                                    className={cn(
                                                        "p-5 rounded-3xl border flex items-center gap-4 transition-all text-left",
                                                        (editedData.is_strategy_goal ?? item.is_strategy_goal) ? "bg-emerald-50 border-emerald-200" : "bg-black/[0.01] border-black/5 hover:border-black/10"
                                                    )}
                                                >
                                                    <Target className={cn("w-6 h-6", (editedData.is_strategy_goal ?? item.is_strategy_goal) ? "text-emerald-500" : "text-black/10")} />
                                                    <div>
                                                        <p className="text-[11px] font-black text-black leading-none">Strategy</p>
                                                        <p className="text-[9px] text-black/30 font-bold uppercase tracking-widest mt-1">Goal</p>
                                                    </div>
                                                </button>
                                                {!settings.is_demo_mode && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditedData(prev => ({ ...prev, is_portfolio_item: !(editedData.is_portfolio_item ?? item.is_portfolio_item) }))}
                                                        className={cn(
                                                            "p-5 rounded-3xl border flex items-center gap-4 transition-all text-left",
                                                            (editedData.is_portfolio_item ?? item.is_portfolio_item) ? "bg-blue-50 border-blue-200" : "bg-black/[0.01] border-black/5 hover:border-black/10"
                                                        )}
                                                    >
                                                        <Shield className={cn("w-6 h-6", (editedData.is_portfolio_item ?? item.is_portfolio_item) ? "text-blue-500" : "text-black/10")} />
                                                        <div>
                                                            <p className="text-[11px] font-black text-black leading-none">Portfolio</p>
                                                            <p className="text-[9px] text-black/30 font-bold uppercase tracking-widest mt-1">GTV</p>
                                                        </div>
                                                    </button>
                                                )}
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex items-center gap-3 pt-6">
                                                <button
                                                    onClick={handleSave}
                                                    className="flex-1 py-4 bg-black text-white rounded-[24px] text-[12px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-black/20"
                                                >
                                                    Save Entry
                                                </button>
                                                <button
                                                    onClick={() => setIsEditing(false)}
                                                    className="px-8 py-4 bg-black/[0.04] text-black/40 rounded-[24px] text-[12px] font-black uppercase tracking-widest hover:bg-black/[0.08] transition-all"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-10">
                                            {/* View Mode Header */}
                                            <div className="space-y-4">
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <div className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border", currentStatus.color.replace('text-', 'bg-').split('-')[0] + '-50', currentStatus.color)}>
                                                        {currentStatus.label}
                                                    </div>
                                                    <div className={cn(
                                                        "flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                                                        currentType.color,
                                                        currentType.color.replace('text-', 'bg-').split('-')[0] + '-50'
                                                    )}>
                                                        <currentType.icon className="w-3 h-3" />
                                                        {currentType.label}
                                                    </div>
                                                    {item.is_strategy_goal && (
                                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 rounded-full text-[9px] font-black uppercase tracking-widest text-emerald-600 border border-emerald-500/20 shadow-sm">
                                                            <Target className="w-3 h-3" />
                                                            Strategic Goal
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <h1 className="text-[36px] md:text-[52px] font-black tracking-tighter text-black leading-none uppercase grayscale">{item.title}</h1>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <span className="text-[15px] md:text-[18px] font-bold text-black/40 uppercase tracking-[0.2em]">{item.organization}</span>
                                                        {item.url && (
                                                            <a href={item.url.startsWith('http') ? item.url : `https://${item.url}`} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-all">
                                                                <ExternalLink className="w-3.5 h-3.5" />
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Entry Brief / Description */}
                                            <div className="p-10 bg-black/[0.015] border border-black/[0.03] rounded-[40px] space-y-4">
                                                <div className="flex items-center gap-2 text-black/20 mb-2">
                                                    <AlignLeft className="w-4 h-4" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Entry Brief</span>
                                                </div>
                                                <p className="text-[16px] font-medium text-black/70 leading-relaxed whitespace-pre-wrap">
                                                    {item.description || 'No detailed description provided for this entry.'}
                                                </p>
                                            </div>

                                            {/* Milestone Goal View */}
                                            {item.milestone_goal && (
                                                <div className="p-8 bg-orange-50/10 border border-orange-200/20 rounded-[32px] space-y-4">
                                                    <div className="flex items-center gap-2 text-orange-500/40">
                                                        <Target className="w-4 h-4" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">Strategic Logic / Requirement</span>
                                                    </div>
                                                    <p className="text-[14px] font-bold text-orange-900/60 leading-relaxed italic">
                                                        "{item.milestone_goal}"
                                                    </p>
                                                </div>
                                            )}

                                            {/* GTV Evidence Section Passive */}
                                            {!settings.is_demo_mode && item.is_portfolio_item && (
                                                <div className="p-10 bg-blue-50/30 border border-blue-100/50 rounded-[40px] space-y-6">
                                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/10">
                                                                <Shield className="w-6 h-6" />
                                                            </div>
                                                            <div>
                                                                <h4 className="text-[15px] font-black text-black">GTV Portfolio Recognition</h4>
                                                                <p className="text-[11px] font-medium text-black/30 uppercase tracking-widest">Status: Verified Evidence</p>
                                                            </div>
                                                        </div>
                                                        <div className="px-5 py-2 rounded-xl bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 border border-blue-400">
                                                            Featured Evidence: {item.gtv_category || 'Recognition'}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    <ConfirmationModal
                        isOpen={showDeleteConfirm}
                        onClose={() => setShowDeleteConfirm(false)}
                        onConfirm={async () => {
                            await deletePress(item.id)
                            onClose()
                        }}
                        title="Delete Entry?"
                        message={`Are you sure you want to permanently delete "${item.title}"? This cannot be undone.`}
                        confirmText="Delete"
                        type="danger"
                    />
                </>
            )}
        </AnimatePresence>
    )
}
