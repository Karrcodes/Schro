'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, ExternalLink, Rocket, MoreVertical, Star, Tag, DollarSign, Edit2 } from 'lucide-react'
import type { WishlistItem, CreateWishlistItemData, GoalCategory, WishlistStatus } from '../types/goals.types'
import { useGoals } from '../hooks/useGoals'
import { cn } from '@/lib/utils'

interface GoalsWishlistProps {
    items: WishlistItem[]
    isCreatingExternal?: boolean
    onCreatingExternalChange?: (isCreating: boolean) => void
}

export default function GoalsWishlist({ items, isCreatingExternal, onCreatingExternalChange }: GoalsWishlistProps) {
    const { createWishlistItem, updateWishlistItem, deleteWishlistItem, convertWishlistToGoal } = useGoals()
    const [isCreatingInternal, setIsCreatingInternal] = useState(false)
    const isCreating = isCreatingExternal ?? isCreatingInternal
    const setIsCreating = (val: boolean) => {
        setIsCreatingInternal(val)
        onCreatingExternalChange?.(val)
    }
    const [editingId, setEditingId] = useState<string | null>(null)

    const categories: GoalCategory[] = ['finance', 'career', 'health', 'personal']

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {/* Create New Card */}
                <button
                    onClick={() => setIsCreating(true)}
                    className="group border-2 border-dashed border-black/[0.05] rounded-3xl p-8 flex flex-col items-center justify-center gap-4 hover:border-amber-500/30 hover:bg-amber-500/[0.02] transition-all min-h-[300px]"
                >
                    <div className="w-12 h-12 bg-black/[0.03] group-hover:bg-amber-500/10 rounded-2xl flex items-center justify-center transition-colors">
                        <Plus className="w-6 h-6 text-black/20 group-hover:text-amber-600 transition-colors" />
                    </div>
                    <div className="text-center">
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-black/20 group-hover:text-amber-600/50">New Manifestation</p>
                        <p className="text-[10px] font-bold text-black/10 uppercase tracking-widest mt-1">Materialize your desires</p>
                    </div>
                </button>

                {items.map((item) => (
                    <WishlistCard 
                        key={item.id} 
                        item={item} 
                        onUpdate={(updates) => updateWishlistItem(item.id, updates)}
                        onDelete={() => deleteWishlistItem(item.id)}
                        onConvertToGoal={() => convertWishlistToGoal(item.id)}
                    />
                ))}
            </div>

            <AnimatePresence>
                {isCreating && (
                    <WishlistCreateModal 
                        onClose={() => setIsCreating(false)} 
                        onSave={async (data) => {
                            await createWishlistItem(data)
                            setIsCreating(false)
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}

interface WishlistCardProps {
    item: WishlistItem
    onUpdate: (updates: Partial<WishlistItem>) => void
    onDelete: () => void
    onConvertToGoal: () => void
}

function WishlistCard({ item, onUpdate, onDelete, onConvertToGoal }: WishlistCardProps) {
    const [showOptions, setShowOptions] = useState(false)

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group relative bg-white border border-black/[0.05] rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-black/5 transition-all flex flex-col min-h-[300px]"
        >
            {/* Image Section */}
            <div className="aspect-[16/9] w-full bg-black/[0.02] relative overflow-hidden">
                {item.image_url ? (
                    <img 
                        src={item.image_url} 
                        alt={item.title} 
                        className="w-full h-full object-cover grayscale brightness-95 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-10">
                        <Star className="w-12 h-12" />
                    </div>
                )}
                
                {/* Status Badge */}
                <div className="absolute top-4 left-4">
                    <div className={cn(
                        "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest backdrop-blur-md shadow-sm border",
                        item.status === 'acquired' 
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                            : "bg-white/80 text-black/40 border-black/5"
                    )}>
                        {item.status}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="absolute top-4 right-4 flex gap-2">
                    <button 
                        onClick={() => onConvertToGoal()}
                        className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all hover:scale-110 shadow-lg"
                        title="Manifest into Goal"
                    >
                        <Rocket className="w-3.5 h-3.5" />
                    </button>
                    <button 
                        onClick={() => setShowOptions(!showOptions)}
                        className="w-8 h-8 bg-white/90 backdrop-blur-md border border-black/5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all [transition-delay:50ms] hover:bg-white shadow-lg"
                    >
                        <MoreVertical className="w-4 h-4 text-black" />
                    </button>
                </div>

                {/* Options Menu Popover */}
                <AnimatePresence>
                    {showOptions && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowOptions(false)} />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                className="absolute top-14 right-4 z-20 bg-white shadow-2xl rounded-2xl border border-black/5 p-2 min-w-[140px]"
                            >
                                <button
                                    onClick={() => {
                                        onUpdate({ status: item.status === 'acquired' ? 'wanted' : 'acquired' })
                                        setShowOptions(false)
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-2 text-[11px] font-bold text-black/60 hover:bg-black/[0.03] rounded-xl transition-all"
                                >
                                    {item.status === 'acquired' ? 'Mark Wanted' : 'Mark Acquired'}
                                </button>
                                <button
                                    onClick={() => {
                                        onDelete()
                                        setShowOptions(false)
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-2 text-[11px] font-bold text-rose-500 hover:bg-rose-500/5 rounded-xl transition-all"
                                >
                                    <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>

            {/* Content Section */}
            <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-4 mb-2">
                    <h3 className="text-sm font-black text-black uppercase tracking-tight leading-tight line-clamp-2">
                        {item.title}
                    </h3>
                    {item.price && (
                        <div className="flex items-center text-amber-500 shrink-0">
                            <span className="text-[10px] font-black mr-0.5">£</span>
                            <span className="text-xs font-black tracking-tighter">{item.price.toLocaleString()}</span>
                        </div>
                    )}
                </div>

                {item.description && (
                    <p className="text-[11px] font-bold text-black/40 line-clamp-2 mb-4">
                        {item.description}
                    </p>
                )}

                <div className="mt-auto flex items-center justify-between pt-4 border-t border-black/[0.03]">
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-black/[0.03] rounded-md flex items-center justify-center">
                            <Tag className="w-2.5 h-2.5 text-black/30" />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-[0.1em] text-black/30">
                            {item.category}
                        </span>
                    </div>

                    {item.url && (
                        <a 
                            href={item.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-black/[0.03] hover:bg-black/5 text-black/40 hover:text-black rounded-lg transition-all"
                        >
                            <span className="text-[9px] font-black uppercase tracking-widest">Store</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                    )}
                </div>
            </div>
        </motion.div>
    )
}

interface WishlistCreateModalProps {
    onClose: () => void
    onSave: (data: CreateWishlistItemData) => Promise<void>
}

function WishlistCreateModal({ onClose, onSave }: WishlistCreateModalProps) {
    const [formData, setFormData] = useState<CreateWishlistItemData>({
        title: '',
        description: '',
        price: undefined,
        url: '',
        image_url: '',
        category: 'personal',
        priority: 'mid'
    })
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            await onSave(formData)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden"
            >
                <div className="p-8 md:p-10">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-[11px] font-black text-amber-500 uppercase tracking-[0.3em] mb-1">Reality Anchor</h2>
                            <h3 className="text-3xl font-black text-black tracking-tighter uppercase">Manifest Item</h3>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-black/30 block mb-2 px-1">Concept</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. Dream Apartment in London"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full bg-black/[0.03] border-2 border-transparent focus:border-black/5 focus:bg-white rounded-2xl px-6 py-4 text-sm font-bold outline-none transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-black/30 block mb-2 px-1">Value (GBP)</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                                        <input
                                            type="number"
                                            placeholder="0"
                                            value={formData.price || ''}
                                            onChange={e => setFormData({ ...formData, price: e.target.value ? parseFloat(e.target.value) : undefined })}
                                            className="w-full bg-black/[0.03] border-2 border-transparent focus:border-black/5 focus:bg-white rounded-2xl pl-12 pr-6 py-4 text-sm font-bold outline-none transition-all"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-black/30 block mb-2 px-1">Domain</label>
                                    <select
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value as GoalCategory })}
                                        className="w-full bg-black/[0.03] border-2 border-transparent focus:border-black/5 focus:bg-white rounded-2xl px-6 py-4 text-sm font-bold outline-none transition-all appearance-none"
                                    >
                                        <option value="personal">Personal</option>
                                        <option value="finance">Finance</option>
                                        <option value="career">Career</option>
                                        <option value="health">Health</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-black/30 block mb-2 px-1">Resource URL</label>
                                <input
                                    type="url"
                                    placeholder="https://..."
                                    value={formData.url}
                                    onChange={e => setFormData({ ...formData, url: e.target.value })}
                                    className="w-full bg-black/[0.03] border-2 border-transparent focus:border-black/5 focus:bg-white rounded-2xl px-6 py-4 text-sm font-bold outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-black/30 block mb-2 px-1">Visual Representation (Image URL)</label>
                                <input
                                    type="url"
                                    placeholder="https://images.unsplash.com/..."
                                    value={formData.image_url}
                                    onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                                    className="w-full bg-black/[0.03] border-2 border-transparent focus:border-black/5 focus:bg-white rounded-2xl px-6 py-4 text-sm font-bold outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-8 py-4 bg-black/[0.03] hover:bg-black/[0.06] text-black/60 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !formData.title}
                                className="flex-[2] px-8 py-4 bg-black text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-black/20 disabled:opacity-50 disabled:hover:scale-100"
                            >
                                {loading ? 'Materializing...' : 'Anchor to Reality'}
                            </button>
                        </div>
                    </form>
                </div>
            </motion.div>
        </div>
    )
}
