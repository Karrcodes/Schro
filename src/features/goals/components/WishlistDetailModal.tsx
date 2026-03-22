'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    X, Pencil, Trash2, Target, RefreshCw, Loader2, 
    Star, Clock, Tag, ExternalLink, Globe, Rocket,
    RefreshCcw, Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGoals } from '../hooks/useGoals'
import type { WishlistItem, GoalPriority } from '../types/goals.types'
import ConfirmationModal from '@/components/ConfirmationModal'

interface WishlistDetailModalProps {
    isOpen: boolean
    onClose: () => void
    item: WishlistItem | null
    onDelete: (id: string) => Promise<void>
    initialEditMode?: boolean
}

export default function WishlistDetailModal({ 
    isOpen, 
    onClose, 
    item, 
    onDelete, 
    initialEditMode = false
}: WishlistDetailModalProps) {
    const { regenerateWishlistCover, suggestWishlistDetails, updateWishlistItem, generatingWishlistIds } = useGoals()
    const [isEditing, setIsEditing] = useState(false)
    const [isSuggesting, setIsSuggesting] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    
    // Edit state
    const [formData, setFormData] = useState<Partial<WishlistItem>>({})
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string>('')
    const [isSaving, setIsSaving] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (item && isOpen) {
            setFormData(item)
            setImagePreview(item.image_url || '')
            setIsEditing(initialEditMode)
        }
    }, [item, isOpen, initialEditMode])

    if (!isOpen || !item) return null

    const isGenerating = generatingWishlistIds.includes(item.id)

    const handleSave = async () => {
        if (!item || isSaving) return
        setIsSaving(true)
        try {
            await updateWishlistItem(item.id, formData as any, imageFile || undefined)
            setIsEditing(false)
        } finally {
            setIsSaving(false)
        }
    }

    const modalContent = (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-md z-[1000]"
                    />

                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[40px] z-[1001] max-h-[95vh] overflow-y-auto shadow-2xl border-t border-black/5 no-scrollbar font-outfit"
                    >
                        {/* Command Center: Absolute to Modal Sheet, Far Right */}
                        <div className="absolute top-8 right-8 md:top-10 md:right-12 flex items-center gap-3 z-50">
                            {!isEditing && (
                                <button
                                    onClick={() => {
                                        setIsEditing(true)
                                    }}
                                    className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-black text-white rounded-full transition-all active:scale-90 shadow-xl shadow-black/10 hover:scale-110 group"
                                    title="Edit Ambition"
                                >
                                    <Pencil className="w-4 h-4 md:w-5 md:h-5 text-white" />
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-black/[0.03] hover:bg-black/[0.1] rounded-full transition-all active:scale-90 border border-black/5 group"
                                title="Close Portal"
                            >
                                <X className="w-4 h-4 md:w-5 md:h-5 text-black/40 group-hover:text-black transition-colors" />
                            </button>
                        </div>

                        {/* Handle */}
                        <div className="flex justify-center p-4">
                            <div className="w-12 h-1.5 bg-black/10 rounded-full" />
                        </div>

                        <div className="max-w-6xl mx-auto px-6 md:px-12 pb-24 pt-4 md:pt-8 text-black">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                                {/* Left Column: The Asset */}
                                <div className="md:col-span-1 space-y-8">
                                    <div className="relative group aspect-[4/5] rounded-[32px] overflow-hidden border border-black/5 shadow-2xl shadow-black/10">
                                        <img 
                                            src={imagePreview || item.image_url || `/api/studio/cover?title=${encodeURIComponent(item.title)}&type=wishlist&id=${item.id}`} 
                                            alt={item.title}
                                            className={cn(
                                                "w-full h-full object-cover transition-transform duration-700 group-hover:scale-110",
                                                isGenerating && "blur-md scale-95 opacity-50"
                                            )} 
                                        />
                                        <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                                            <div className="flex items-center justify-between">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{item.category}</span>
                                                    <span className="text-[14px] font-black text-white">£{Number(item.price || 0).toLocaleString()}</span>
                                                </div>
                                                <button 
                                                    onClick={() => regenerateWishlistCover(item.id)}
                                                    disabled={isGenerating}
                                                    className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/40 transition-all active:scale-90"
                                                >
                                                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Forecast Stats */}
                                    <div className="p-8 bg-black/[0.02] rounded-[32px] border border-black/5 space-y-6">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-black/20">
                                                <Rocket className="w-3.5 h-3.5" />
                                                <span className="text-[9px] font-black uppercase tracking-widest">Affordability Forecast</span>
                                            </div>
                                            {(() => {
                                                const OT_RATE_NET = 20.35 * (1 - 0.1821)
                                                const HOURS_PER_SHIFT = 11.5
                                                const hours = (Number(item.price) || 0) / OT_RATE_NET
                                                const shifts = hours / HOURS_PER_SHIFT
                                                return (
                                                    <div className="space-y-1">
                                                        <h4 className="text-[18px] font-black text-black">{shifts.toFixed(1)} <span className="text-xs text-black/40">Shifts Required</span></h4>
                                                        <p className="text-[10px] font-bold text-black/20 uppercase tracking-tight">Based on net OT rates (£16.64/hr)</p>
                                                    </div>
                                                )
                                            })()}
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-black/5">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[8px] font-black text-black/20 uppercase">Priority</span>
                                                <span className={cn(
                                                    "text-[11px] font-black uppercase text-amber-600",
                                                    item.priority === 'super' && "text-purple-600",
                                                    item.priority === 'high' && "text-rose-600",
                                                    item.priority === 'mid' && "text-amber-600",
                                                    item.priority === 'low' && "text-black/40"
                                                )}>{item.priority}</span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[8px] font-black text-black/20 uppercase">Status</span>
                                                <span className="text-[11px] font-black uppercase text-blue-600">{item.status}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-4">
                                        <button 
                                            onClick={() => setShowDeleteConfirm(true)}
                                            className="w-full py-4 border border-rose-500/10 bg-rose-500/5 text-rose-500 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all active:scale-95 shadow-lg shadow-rose-500/5"
                                        >
                                            <Trash2 className="w-3.5 h-3.5 inline mr-2" />
                                            Abandon Desire
                                        </button>
                                    </div>
                                </div>

                                {/* Right Column: Details & Editing */}
                                <div className="md:col-span-2 space-y-10">
                                    {isEditing ? (
                                        <div className="space-y-10 animate-in fade-in slide-in-from-top-4 duration-500">
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-black/30 uppercase tracking-widest ml-1">Concept Designation</label>
                                                <input 
                                                    autoFocus
                                                    value={formData.title || ''}
                                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                                    className="w-full text-[28px] md:text-[42px] font-black tracking-tighter border-none p-0 focus:ring-0 outline-none placeholder:text-black/5 bg-transparent"
                                                    placeholder="Define the vision..."
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-8 pt-6 border-t border-black/5">
                                                <div className="space-y-3">
                                                    <label className="text-[9px] font-black text-black/30 uppercase tracking-widest ml-1">Reality Value (GBP)</label>
                                                    <div className="relative">
                                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-black/20">£</span>
                                                        <input 
                                                            type="number"
                                                            value={formData.price || ''}
                                                            onChange={e => setFormData({ ...formData, price: e.target.value ? Number(e.target.value) : undefined })}
                                                            className="w-full pl-8 pr-4 py-4 bg-black/[0.03] border border-black/5 rounded-2xl text-[14px] font-black outline-none focus:bg-white transition-all"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-3">
                                                    <label className="text-[9px] font-black text-black/30 uppercase tracking-widest ml-1">Anchor Priority</label>
                                                    <div className="flex gap-1 p-1 bg-black/[0.03] rounded-2xl border border-black/5">
                                                        {(['low', 'mid', 'high', 'super'] as const).map(p => (
                                                            <button 
                                                                key={p} 
                                                                onClick={() => setFormData({ ...formData, priority: p })}
                                                                className={cn(
                                                                    "flex-1 py-2 text-[8px] font-black uppercase tracking-widest rounded-xl transition-all",
                                                                    formData.priority === p 
                                                                        ? p === 'super' ? "bg-purple-600 text-white shadow-lg" :
                                                                          p === 'high' ? "bg-rose-600 text-white shadow-lg" :
                                                                          p === 'mid' ? "bg-amber-500 text-white shadow-lg" : "bg-black text-white shadow-lg"
                                                                        : "text-black/20 hover:text-black/40"
                                                                )}
                                                            >
                                                                {p}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-3 pt-6 border-t border-black/5">
                                                <label className="text-[9px] font-black text-black/30 uppercase tracking-widest ml-1">Reality Endpoint (URL)</label>
                                                <div className="relative">
                                                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                                                    <input 
                                                        type="url"
                                                        value={formData.url || ''}
                                                        onChange={e => setFormData({ ...formData, url: e.target.value })}
                                                        placeholder="https://..."
                                                        className="w-full pl-11 pr-4 py-4 bg-black/[0.03] border border-black/5 rounded-2xl text-[13px] font-medium outline-none focus:bg-white transition-all"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-3 pt-6 border-t border-black/5">
                                                <label className="text-[9px] font-black text-black/30 uppercase tracking-widest ml-1">Identity Brief</label>
                                                <textarea 
                                                    value={formData.description || ''}
                                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                                    rows={3}
                                                    className="w-full px-5 py-4 bg-black/[0.03] border border-black/5 rounded-2xl text-[14px] font-medium leading-relaxed outline-none focus:bg-white transition-all resize-none"
                                                    placeholder="The nature of this ambition..."
                                                />
                                            </div>

                                            <div className="flex items-center gap-4 pt-6">
                                                <button 
                                                    onClick={handleSave}
                                                    disabled={isSaving}
                                                    className="flex-1 py-4 bg-black text-white rounded-2xl text-[12px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-black/20 disabled:opacity-50"
                                                >
                                                    {isSaving ? 'Syncing...' : 'Apply Reality Sync'}
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        setIsEditing(false)
                                                        setFormData(item)
                                                    }}
                                                    className="px-8 py-4 bg-black/[0.03] text-black/40 rounded-2xl text-[12px] font-black uppercase tracking-widest hover:bg-black/[0.06] transition-all"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-10 animate-in fade-in duration-500">
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-600 rounded-full border border-amber-500/20 shadow-sm">
                                                        <Star className="w-3 h-3 fill-current" />
                                                        <span className="text-[9px] font-black uppercase tracking-widest">{item.status}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-black/[0.03] text-black/40 rounded-full border border-black/5">
                                                        <Clock className="w-3 h-3" />
                                                        <span className="text-[9px] font-black uppercase tracking-widest">Added {new Date(item.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                                <h1 className="text-[42px] md:text-[52px] font-black tracking-tighter text-black leading-[0.9]">{item.title}</h1>
                                            </div>

                                            <div className="p-10 bg-black/[0.01] border border-black/[0.03] rounded-[40px] space-y-6">
                                                <div className="flex items-center gap-2 text-black/20">
                                                    <Tag className="w-4 h-4" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Designation Brief</span>
                                                </div>
                                                <p className="text-[17px] md:text-[20px] font-medium text-black/70 leading-relaxed font-outfit">
                                                    {item.description || 'This ambition is yet to be fully defined.'}
                                                </p>
                                            </div>

                                            {item.url && (
                                                <div className="pt-10">
                                                    <a 
                                                        href={item.url} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="w-full flex items-center justify-center gap-3 py-5 bg-black/[0.03] border border-black/5 text-black rounded-[24px] text-[13px] font-black uppercase tracking-widest hover:bg-black/[0.06] transition-all"
                                                    >
                                                        <ExternalLink className="w-5 h-5" />
                                                        View Reality Endpoint
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}

            <ConfirmationModal 
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={async () => {
                    await onDelete(item.id)
                    onClose()
                }}
                title="Abandon Desire?"
                message={`Are you sure you want to remove "${item.title}" from your vision? This action cannot be undone.`}
                confirmText="Abandon"
                type="danger"
            />
        </AnimatePresence>
    )

    if (typeof document === 'undefined') return null
    return createPortal(modalContent, document.body)
}
