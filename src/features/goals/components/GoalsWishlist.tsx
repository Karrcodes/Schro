'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    Plus, Trash2, ExternalLink, Rocket, MoreVertical, 
    Star, Tag, PoundSterling, Edit2, GripVertical, CheckCircle2, XCircle,
    UploadCloud, X, AlertTriangle, Image as ImageIcon,
    Loader2, Zap, RefreshCw, Sparkles, Wand2, ChevronRight, ChevronDown
} from 'lucide-react'
import type { WishlistItem, CreateWishlistItemData, GoalCategory, WishlistStatus } from '../types/goals.types'
import { useGoals } from '../hooks/useGoals'
import { cn } from '@/lib/utils'
import ConfirmationModal from '@/components/ConfirmationModal'

interface GoalsWishlistProps {
    items: WishlistItem[]
    isCreatingExternal?: boolean
    onCreatingExternalChange?: (isCreating: boolean) => void
}

const COLUMNS: { label: string; value: WishlistStatus; color: string }[] = [
    { label: 'Incoming', value: 'incoming', color: 'bg-blue-400' },
    { label: 'Next in Queue', value: 'queue', color: 'bg-amber-400' },
    { label: 'Acquired', value: 'acquired', color: 'bg-emerald-400' },
    { label: 'Abandoned', value: 'abandoned', color: 'bg-rose-400' }
]

export default function GoalsWishlist({ items, isCreatingExternal, onCreatingExternalChange }: GoalsWishlistProps) {
    const { createWishlistItem, updateWishlistItem, deleteWishlistItem, convertWishlistToGoal } = useGoals()
    const [isCreatingInternal, setIsCreatingInternal] = useState(false)
    const isCreating = isCreatingExternal ?? isCreatingInternal
    const setIsCreating = (val: boolean) => {
        setIsCreatingInternal(val)
        onCreatingExternalChange?.(val)
    }
    const [editingItem, setEditingItem] = useState<WishlistItem | null>(null)
    const [dragOverStatus, setDragOverStatus] = useState<WishlistStatus | null>(null)
    const [draggingId, setDraggingId] = useState<string | null>(null)
    const [expandedStacks, setExpandedStacks] = useState<Record<string, boolean>>({
        super: false,
        high: true,
        mid: false,
        low: false
    })

    const toggleStack = (priority: string) => {
        setExpandedStacks(prev => ({ ...prev, [priority]: !prev[priority] }))
    }

    const handlePointerDragOver = (x: number, y: number) => {
        const elements = document.elementsFromPoint(x, y)
        for (const el of elements) {
            if (el instanceof HTMLElement && el.dataset.columnStatus) {
                setDragOverStatus(el.dataset.columnStatus as WishlistStatus)
                return
            }
        }
        setDragOverStatus(null)
    }

    const handlePointerDrop = async (itemId: string, x: number, y: number) => {
        const elements = document.elementsFromPoint(x, y)
        let targetStatus: WishlistStatus | null = null
        for (const el of elements) {
            if (el instanceof HTMLElement && el.dataset.columnStatus) {
                targetStatus = el.dataset.columnStatus as WishlistStatus
                break
            }
        }
        
        setDraggingId(null)
        setDragOverStatus(null)
        
        if (targetStatus && itemId) {
            await updateWishlistItem(itemId, { status: targetStatus })
        }
    }

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 min-h-[600px]">
                {COLUMNS.map(column => {
                    const columnItems = items.filter(i => {
                        // If no status, treat as abandoned (migration for old items)
                        if (column.value === 'abandoned') {
                            return i.status === 'abandoned' || !i.status
                        }
                        return i.status === column.value
                    })
                    const isOver = dragOverStatus === column.value

                    return (
                        <div key={column.value} className="flex flex-col gap-4">
                            {/* Column Header */}
                            <div className="flex items-center justify-between px-2 mb-2">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-black/30 flex items-center gap-2">
                                    <div className={cn("w-1.5 h-1.5 rounded-full", column.color)} />
                                    {column.label}
                                </h3>
                                <span className="text-[10px] font-bold text-black/20 bg-black/5 px-1.5 py-0.5 rounded-md">
                                    {columnItems.length}
                                </span>
                            </div>

                            {/* Column Content Area */}
                            <div
                                data-column-status={column.value}
                                className={cn(
                                    "flex-1 rounded-[32px] transition-all p-2 space-y-4 min-h-[400px] border-2 border-transparent",
                                    isOver ? "bg-amber-50/50 border-amber-200 shadow-inner scale-[1.01]" :
                                    draggingId ? "bg-black/[0.01] border-dashed border-black/[0.05]" : "bg-transparent"
                                )}
                            >
                                {column.value === 'incoming' && (
                                    <button
                                        onClick={() => setIsCreating(true)}
                                        className="w-full border-2 border-dashed border-black/[0.05] rounded-[24px] p-6 flex flex-col items-center justify-center gap-2 hover:border-amber-500/30 hover:bg-amber-500/[0.02] transition-all group mb-2"
                                    >
                                        <Plus className="w-5 h-5 text-black/20 group-hover:text-amber-600 transition-colors" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-black/20 group-hover:text-amber-600/50">Add Desire</span>
                                    </button>
                                )}

                                {column.value === 'incoming' ? (
                                    <div className="space-y-6">
                                        {['super', 'high', 'mid', 'low'].map((prio) => {
                                            const prioItems = columnItems
                                                .filter(item => item.priority === prio)
                                                .sort((a, b) => (b.price || 0) - (a.price || 0))
                                            
                                            if (prioItems.length === 0) return null

                                            const isExpanded = expandedStacks[prio]
                                            const topItem = prioItems[0]

                                            return (
                                                <div key={prio} className="space-y-3">
                                                    <div className="flex items-center justify-between px-2">
                                                        <h4 className="text-[9px] font-black uppercase tracking-widest text-black/20 flex items-center gap-2">
                                                            <span>{prio} priority</span>
                                                            <span className="w-1 h-1 rounded-full bg-black/10" />
                                                            <span className="font-bold opacity-60">£{prioItems.reduce((acc, curr) => acc + (curr.price || 0), 0).toLocaleString()}</span>
                                                        </h4>
                                                        <button 
                                                            onClick={() => toggleStack(prio)}
                                                            className="p-1 hover:bg-black/5 rounded-md transition-colors"
                                                        >
                                                            {isExpanded ? <ChevronDown className="w-3 h-3 text-black/30" /> : <ChevronRight className="w-3 h-3 text-black/30" />}
                                                        </button>
                                                    </div>

                                                    <div className="relative">
                                                        {isExpanded ? (
                                                            <div className="flex flex-col gap-3">
                                                                {prioItems.map(item => (
                                                                    <WishlistCard 
                                                                        key={item.id} 
                                                                        item={item} 
                                                                        onEdit={() => setEditingItem(item)}
                                                                        onUpdate={(updates, file) => updateWishlistItem(item.id, updates, file)}
                                                                        onDelete={() => deleteWishlistItem(item.id)}
                                                                        onConvertToGoal={() => convertWishlistToGoal(item.id)}
                                                                        onPointerDragStart={(id) => setDraggingId(id)}
                                                                        onPointerDragOver={handlePointerDragOver}
                                                                        onPointerDrop={handlePointerDrop}
                                                                    />
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="relative">
                                                                {/* Render up to 2 ghost cards below, in reverse so card 1 is on top */}
                                                                <div className="relative">
                                                                    {/* Card 3 (bottom of stack) */}
                                                                    {prioItems.length > 2 && (
                                                                        <div 
                                                                            className="absolute -bottom-3 left-3 right-3 h-12 rounded-[22px] bg-black/[0.035] border border-black/[0.06]"
                                                                            style={{ transform: 'scale(0.94)', transformOrigin: 'bottom center' }}
                                                                        />
                                                                    )}
                                                                    {/* Card 2 (middle of stack) */}
                                                                    {prioItems.length > 1 && (
                                                                        <div 
                                                                            className="absolute -bottom-1.5 left-1.5 right-1.5 h-12 rounded-[23px] bg-black/[0.055] border border-black/[0.08]"
                                                                            style={{ transform: 'scale(0.97)', transformOrigin: 'bottom center' }}
                                                                        />
                                                                    )}

                                                                    {/* Top Card */}
                                                                    <div className="relative z-20 mb-6">
                                                                        <WishlistCard 
                                                                            item={topItem} 
                                                                            onEdit={() => setEditingItem(topItem)}
                                                                            onUpdate={(updates, file) => updateWishlistItem(topItem.id, updates, file)}
                                                                            onDelete={() => deleteWishlistItem(topItem.id)}
                                                                            onConvertToGoal={() => convertWishlistToGoal(topItem.id)}
                                                                            onPointerDragStart={(id) => setDraggingId(id)}
                                                                            onPointerDragOver={handlePointerDragOver}
                                                                            onPointerDrop={handlePointerDrop}
                                                                        />
                                                                    </div>
                                                                </div>
                                                                {prioItems.length > 1 && (
                                                                    <div 
                                                                        onClick={() => toggleStack(prio)}
                                                                        className="flex items-center justify-center gap-1 -mt-4 cursor-pointer group/more"
                                                                    >
                                                                        <span className="text-[8px] font-black uppercase tracking-wider text-black/25 group-hover/more:text-black/50 transition-colors">+{prioItems.length - 1} more — tap to expand</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-4">
                                        {columnItems.map((item) => (
                                            <WishlistCard 
                                                key={item.id} 
                                                item={item} 
                                                onEdit={() => setEditingItem(item)}
                                                onUpdate={(updates, file) => updateWishlistItem(item.id, updates, file)}
                                                onDelete={() => deleteWishlistItem(item.id)}
                                                onConvertToGoal={() => convertWishlistToGoal(item.id)}
                                                onPointerDragStart={(id) => setDraggingId(id)}
                                                onPointerDragOver={handlePointerDragOver}
                                                onPointerDrop={handlePointerDrop}
                                            />
                                        ))}
                                    </div>
                                )}

                                {columnItems.length === 0 && column.value !== 'incoming' && (
                                    <div className="py-12 flex flex-col items-center justify-center text-center px-4 opacity-5">
                                        <Star className="w-8 h-8 mb-2" />
                                        <p className="text-[10px] font-bold uppercase tracking-widest">Empty Stage</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            <AnimatePresence>
                {(isCreating || editingItem) && (
                    <WishlistModal 
                        item={editingItem || undefined}
                        onClose={() => {
                            setIsCreating(false)
                            setEditingItem(null)
                        }} 
                        onSave={async (data, file) => {
                            if (editingItem) {
                                await updateWishlistItem(editingItem.id, data, file)
                            } else {
                                await createWishlistItem(data, file)
                            }
                            setIsCreating(false)
                            setEditingItem(null)
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}

interface WishlistCardProps {
    item: WishlistItem
    onEdit: () => void
    onUpdate: (updates: Partial<WishlistItem>, file?: File) => void
    onDelete: () => void
    onConvertToGoal: () => void
    onPointerDragStart: (id: string) => void
    onPointerDragOver: (x: number, y: number) => void
    onPointerDrop: (id: string, x: number, y: number) => void
}

function WishlistCard({ 
    item, onEdit, onUpdate, onDelete, onConvertToGoal,
    onPointerDragStart, onPointerDragOver, onPointerDrop
}: WishlistCardProps) {
    const { generatingWishlistIds } = useGoals()
    const [showOptions, setShowOptions] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const isGenerating = generatingWishlistIds.includes(item.id)
    const isDragging = useRef(false)
    const startPos = useRef({ x: 0, y: 0 })
    const [isDraggingThis, setIsDraggingThis] = useState(false)

    const handlePointerDown = (e: React.PointerEvent) => {
        // Only trigger drag on the specific handle or the whole card if preferred
        // We'll use a specific handle for better UX
        if (!(e.target as HTMLElement).closest('.cover-drag-handle')) return

        e.preventDefault()
        startPos.current = { x: e.clientX, y: e.clientY }
        isDragging.current = false

        let ghost: HTMLDivElement | null = null

        const handleMove = (ev: PointerEvent) => {
            const dx = ev.clientX - startPos.current.x
            const dy = ev.clientY - startPos.current.y
            if (!isDragging.current && Math.sqrt(dx * dx + dy * dy) > 8) {
                isDragging.current = true
                setIsDraggingThis(true)
                onPointerDragStart(item.id)

                ghost = document.createElement('div')
                ghost.style.cssText = `
                    position: fixed;
                    pointer-events: none;
                    z-index: 9999;
                    width: 240px;
                    background: white;
                    border-radius: 20px;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                    padding: 16px;
                    border: 1px solid rgba(0,0,0,0.05);
                    transform: rotate(-2deg) scale(0.95);
                    opacity: 0.9;
                `
                ghost.innerHTML = `
                    <div style="font-size: 11px; font-weight: 900; color: #000; text-transform: uppercase;">${item.title}</div>
                    <div style="font-size: 9px; color: rgba(0,0,0,0.3); margin-top: 4px;">${item.category}</div>
                `
                document.body.appendChild(ghost)
            }

            if (isDragging.current) {
                onPointerDragOver(ev.clientX, ev.clientY)
                if (ghost) {
                    ghost.style.left = `${ev.clientX - 120}px`
                    ghost.style.top = `${ev.clientY - 40}px`
                }
            }
        }

        const handleUp = (ev: PointerEvent) => {
            window.removeEventListener('pointermove', handleMove)
            window.removeEventListener('pointerup', handleUp)
            if (ghost) { ghost.remove(); ghost = null }
            setIsDraggingThis(false)
            if (isDragging.current) {
                onPointerDrop(item.id, ev.clientX, ev.clientY)
                isDragging.current = false
            }
        }

        window.addEventListener('pointermove', handleMove)
        window.addEventListener('pointerup', handleUp)
    }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
                "group relative bg-white border border-black/[0.05] rounded-[32px] overflow-hidden shadow-sm hover:shadow-xl hover:shadow-black/5 transition-all flex flex-col min-h-[160px]",
                isDraggingThis && "opacity-20 scale-95"
            )}
        >
            <div 
                className={cn(
                    "aspect-[21/9] w-full relative overflow-hidden bg-black/[0.02] border-b border-black/[0.03] cover-drag-handle",
                    (item.image_url || isGenerating) ? "cursor-grab active:cursor-grabbing" : "h-12 flex items-center justify-center cursor-grab active:cursor-grabbing"
                )}
                onPointerDown={handlePointerDown}
            >
                {!item.image_url && !isGenerating && (
                    <div className="flex items-center gap-2 opacity-20">
                        <GripVertical className="w-3.5 h-3.5" />
                        <span className="text-[8px] font-black uppercase tracking-widest">Hold to Drag</span>
                    </div>
                )}
                {item.image_url && (
                    <img src={item.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700" />
                )}
                {isGenerating && (
                    <div className={cn(
                        "absolute inset-0 bg-black/20 backdrop-blur-sm flex flex-col items-center justify-center gap-2 transition-all",
                        item.image_url ? "bg-black/40" : "bg-black/5"
                    )}>
                        <div className="flex flex-col items-center gap-2 animate-in zoom-in-95 duration-300">
                            <Loader2 className="w-5 h-5 text-black/60 animate-spin" />
                            <div className="flex flex-col items-center">
                                <span className="text-[9px] font-black text-black/40 uppercase tracking-widest">Visualising Desire</span>
                                <span className="text-[7px] font-bold text-black/20 uppercase tracking-widest mt-0.5 opacity-50">Manifesting...</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="p-4 pb-2.5 flex flex-col h-full">
                <div className="mb-2">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <div className={cn(
                                    "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border",
                                    item.priority === 'super' ? "border-purple-200 bg-purple-50 text-purple-600" :
                                    item.priority === 'high' ? "border-red-200 bg-red-50 text-red-600" :
                                    item.priority === 'mid' ? "border-amber-200 bg-amber-50 text-amber-600" :
                                    "border-black/5 bg-black/[0.03] text-black/40"
                                )}>
                                    {item.priority}
                                </div>
                                {item.category && (
                                    <div className="px-2 py-0.5 rounded-full bg-black/[0.03] text-black/30 text-[8px] font-black uppercase tracking-widest border border-transparent">
                                        {item.category}
                                    </div>
                                )}
                            </div>
                            {item.price && (
                                <span className="text-[10px] font-black text-black/40">£{item.price.toLocaleString()}</span>
                            )}
                        </div>
                        <h4 className="text-[13px] font-black text-black leading-tight group-hover:text-amber-600 transition-colors uppercase italic">{item.title}</h4>
                        {item.description && <p className="text-[9px] font-bold text-black/40 mt-1 line-clamp-2 leading-relaxed">{item.description}</p>}
                        {item.price && item.price > 0 && (() => {
                            const OT_RATE_NET = 20.35 * (1 - 0.1821) // ~£16.64/hr net
                            const HOURS_PER_SHIFT = 11.5
                            const hoursNeeded = item.price / OT_RATE_NET
                            const shiftsNeeded = hoursNeeded / HOURS_PER_SHIFT
                            const label = hoursNeeded < HOURS_PER_SHIFT
                                ? `${hoursNeeded.toFixed(1)} OT hrs`
                                : `${shiftsNeeded.toFixed(1)} OT shift${shiftsNeeded >= 2 ? 's' : ''}`
                            return (
                                <div className="flex items-center gap-1 mt-1.5">
                                    <Zap className="w-2.5 h-2.5 text-amber-500/60" />
                                    <span className="text-[8px] font-black uppercase tracking-wider text-black/25">{label} to afford</span>
                                </div>
                            )
                        })()}
                    </div>
                </div>

                <div className="mt-auto flex items-center justify-between pt-2 border-t border-black/[0.03]">
                    {item.url ? (
                        <a 
                            href={item.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[8px] font-black uppercase tracking-widest text-black/30 hover:text-black transition-colors"
                        >
                            Store ↗
                        </a>
                    ) : (
                        <div />
                    )}

                    <div className="flex items-center gap-1.5">
                        <button 
                            onClick={(e) => { e.stopPropagation(); onEdit(); }}
                            className="w-6 h-6 bg-black/[0.03] hover:bg-black/[0.06] rounded-full flex items-center justify-center transition-colors group/edit"
                            title="Edit"
                        >
                            <Edit2 className="w-2.5 h-2.5 text-black/30 group-hover:text-black transition-colors" />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
                            className="w-6 h-6 bg-black/[0.03] hover:bg-black/[0.06] rounded-full flex items-center justify-center transition-colors group/del"
                            title="Delete"
                        >
                            <Trash2 className="w-2.5 h-2.5 text-black/30 group-hover:text-rose-500 transition-colors" />
                        </button>
                    </div>
                </div>
            </div>

            <ConfirmationModal 
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={async () => {
                    await onDelete()
                }}
                title="Abandon Desire?"
                message={`Are you sure you want to remove "${item.title}" from your vision? This action cannot be undone.`}
                confirmText="Abandon"
                type="danger"
            />
        </motion.div>
    )
}

interface WishlistModalProps {
    item?: WishlistItem
    onClose: () => void
    onSave: (data: CreateWishlistItemData, file?: File) => Promise<void>
}

function WishlistModal({ item, onClose, onSave }: WishlistModalProps) {
    const { regenerateWishlistCover, suggestWishlistDetails, generatingWishlistIds } = useGoals()
    const isGenerating = item ? generatingWishlistIds.includes(item.id) : false
    const [isSuggesting, setIsSuggesting] = useState(false)
    const [suggestions, setSuggestions] = useState<any[]>([])
    const suggestionsRef = useRef<HTMLDivElement>(null)
    const [formData, setFormData] = useState<CreateWishlistItemData>({
        title: item?.title || '',
        description: item?.description || '',
        price: item?.price || undefined,
        url: item?.url || '',
        image_url: item?.image_url || '',
        category: item?.category || 'personal',
        priority: item?.priority || 'mid',
        status: item?.status || 'incoming'
    })
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string>(item?.image_url || '')
    const [loading, setLoading] = useState(false)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setImageFile(file)
            const reader = new FileReader()
            reader.onloadend = () => {
                setImagePreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleSuggest = async () => {
        if (!formData.title || isSuggesting) return
        setIsSuggesting(true)
        setSuggestions([])
        try {
            const results = await suggestWishlistDetails(formData.title)
            if (Array.isArray(results) && results.length > 0) {
                setSuggestions(results)
            }
        } finally {
            setIsSuggesting(false)
        }
    }

    const handleSelectSuggestion = (s: any) => {
        setFormData(prev => ({
            ...prev,
            title: s.title || prev.title,
            price: s.price || prev.price,
            description: s.description || prev.description,
            url: s.url || prev.url,
            category: (s.category as GoalCategory) || prev.category,
            priority: (s.priority as any) || prev.priority
        }))
        setSuggestions([])
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            await onSave(formData, imageFile || undefined)
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
                className="relative bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                <div className="p-8 md:p-10 overflow-y-auto flex-1">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-[11px] font-black text-amber-500 uppercase tracking-[0.3em] mb-1">
                                {item ? 'Altering Reality' : 'Reality Anchor'}
                            </h2>
                            <h3 className="text-3xl font-black text-black tracking-tighter uppercase">
                                {item ? 'Edit Desire' : 'Manifest Item'}
                            </h3>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                             <div className="relative group/title">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-black/30 block mb-2 px-1">Concept</label>
                                <div className="relative">
                                    <input
                                        required
                                        type="text"
                                        placeholder="e.g. Dream Apartment in London"
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full bg-black/[0.03] border-2 border-transparent focus:border-black/5 focus:bg-white rounded-2xl px-6 py-4 text-sm font-bold outline-none transition-all pr-14"
                                    />
                                    <button
                                        type="button"
                                        disabled={isSuggesting || !formData.title}
                                        onClick={handleSuggest}
                                        className={cn(
                                            "absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                                            isSuggesting ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" : 
                                            suggestions.length > 0 ? "bg-amber-100 text-amber-600" : "bg-black/[0.03] hover:bg-black text-black/30 hover:text-white"
                                        )}
                                        title="AI Manifest Details"
                                    >
                                        {isSuggesting ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Wand2 className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>

                                <AnimatePresence>
                                    {suggestions.length > 0 && (
                                        <motion.div 
                                            ref={suggestionsRef}
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 4 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="absolute left-0 right-0 top-full mt-2 z-[110] bg-white/90 border border-black/5 shadow-2xl shadow-black/20 rounded-2xl overflow-hidden backdrop-blur-xl"
                                        >
                                            <div className="p-3 border-b border-black/5 bg-black/[0.02] flex items-center justify-between">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-black/40 px-2 font-mono">Manifested Options</p>
                                                <button 
                                                    onClick={() => setSuggestions([])}
                                                    className="w-6 h-6 rounded-lg flex items-center justify-center text-black/20 hover:text-black hover:bg-black/[0.05] transition-all"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                            <div className="max-h-[280px] overflow-y-auto custom-scrollbar">
                                                {suggestions.map((s, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="w-full flex items-center gap-4 px-6 py-4 hover:bg-black/[0.03] transition-all border-b border-black/[0.02] last:border-0 group relative"
                                                    >
                                                        {/* Info */}
                                                        <div 
                                                            className="flex-1 min-w-0 cursor-pointer"
                                                            onClick={() => handleSelectSuggestion(s)}
                                                        >
                                                            <div className="flex items-center gap-2 mb-0.5">
                                                                <p className="text-[11px] font-black text-black group-hover:text-amber-600 transition-colors uppercase truncate tracking-tight">{s.title}</p>
                                                                <span className="text-[9px] font-black text-black/40 shrink-0 bg-black/[0.03] px-1.5 py-0.5 rounded-md self-start mt-0.5">£{s.price}</span>
                                                            </div>
                                                            <p className="text-[10px] font-bold text-black/30 line-clamp-1 leading-relaxed">{s.description}</p>
                                                        </div>

                                                        {/* Actions */}
                                                        <div className="flex items-center gap-1">
                                                            {s.url && (
                                                                <a
                                                                    href={s.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-black/20 hover:text-black hover:bg-black/[0.05] transition-all"
                                                                    title="Visit Website"
                                                                >
                                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                                </a>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSelectSuggestion(s)}
                                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-black/20 hover:text-amber-600 hover:bg-amber-50 transition-all group-hover:text-amber-500"
                                                                title="Insert Details"
                                                            >
                                                                <Plus className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-1">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-black/30 block mb-2 px-1">Value (GBP)</label>
                                    <div className="relative">
                                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-[12px] font-black text-black/20">£</div>
                                        <input
                                            type="number"
                                            placeholder="0"
                                            value={formData.price || ''}
                                            onChange={e => setFormData({ ...formData, price: e.target.value ? parseFloat(e.target.value) : undefined })}
                                            className="w-full h-[58px] bg-black/[0.03] border-2 border-transparent focus:border-black/5 focus:bg-white rounded-2xl pl-12 pr-6 py-4 text-sm font-bold outline-none transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="col-span-1">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-black/30 block mb-2 px-1">Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={e => setFormData({ ...formData, status: e.target.value as WishlistStatus })}
                                        className="w-full h-[58px] bg-black/[0.03] border-2 border-transparent focus:border-black/5 focus:bg-white rounded-2xl px-6 py-4 text-sm font-bold outline-none transition-all appearance-none"
                                    >
                                        {COLUMNS.map(col => (
                                            <option key={col.value} value={col.value}>{col.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-black/30 block mb-2 px-1">Category</label>
                                <div className="flex gap-2 p-1.5 bg-black/[0.03] rounded-2xl">
                                    {['personal', 'finance', 'career', 'health'].map(cat => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, category: cat as GoalCategory })}
                                            className={cn(
                                                "flex-1 py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                                formData.category === cat 
                                                    ? cn(
                                                        "text-white shadow-lg shadow-black/10",
                                                        cat === 'personal' && "bg-amber-500",
                                                        cat === 'finance' && "bg-emerald-500",
                                                        cat === 'career' && "bg-blue-500",
                                                        cat === 'health' && "bg-rose-500"
                                                    )
                                                    : "text-black/30 hover:text-black hover:bg-black/[0.02]"
                                            )}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-black/30 block mb-2 px-1">Priority</label>
                                <div className="flex gap-2 p-1.5 bg-black/[0.03] rounded-2xl">
                                    {['low', 'mid', 'high', 'super'].map(pri => (
                                        <button
                                            key={pri}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, priority: pri as any })}
                                            className={cn(
                                                "flex-1 py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                                formData.priority === pri 
                                                    ? cn(
                                                        "text-white shadow-lg shadow-black/10",
                                                        pri === 'low' && "bg-slate-400",
                                                        pri === 'mid' && "bg-yellow-500",
                                                        pri === 'high' && "bg-red-600",
                                                        pri === 'super' && "bg-purple-600"
                                                    )
                                                    : "text-black/30 hover:text-black hover:bg-black/[0.02]"
                                            )}
                                        >
                                            {pri}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-black/30 block mb-2 px-1">Resource URL</label>
                                <input
                                    type="url"
                                    placeholder="https://..."
                                    value={formData.url || ''}
                                    onChange={e => setFormData({ ...formData, url: e.target.value })}
                                    className="w-full bg-black/[0.03] border-2 border-transparent focus:border-black/5 focus:bg-white rounded-2xl px-6 py-4 text-sm font-bold outline-none transition-all"
                                />
                            </div>

                             <div>
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-black/30 block mb-2 px-1">Visual Representation</label>
                                <div className="flex gap-3">
                                    <div className="flex-1">
                                        <input
                                            type="url"
                                            placeholder="https://images.unsplash.com/..."
                                            value={formData.image_url || ''}
                                            onChange={e => {
                                                setFormData({ ...formData, image_url: e.target.value })
                                                setImagePreview(e.target.value)
                                            }}
                                            className="w-full h-[58px] bg-black/[0.03] border-2 border-transparent focus:border-black/5 focus:bg-white rounded-2xl px-6 text-sm font-bold outline-none transition-all"
                                        />
                                    </div>
                                    <label className="cursor-pointer group/upload relative">
                                        <input 
                                            type="file" 
                                            className="hidden" 
                                            accept="image/*"
                                            onChange={handleFileChange}
                                        />
                                        <div className={cn(
                                            "w-[58px] h-[58px] rounded-2xl border-2 border-dashed flex items-center justify-center transition-all",
                                            imageFile ? "border-amber-500 bg-amber-50 text-amber-600" : "border-black/[0.06] hover:border-black/20 bg-black/[0.03]"
                                        )}>
                                            <UploadCloud className="w-5 h-5" />
                                        </div>
                                    </label>
                                </div>
                                {imagePreview && (
                                    <div className="mt-4 flex items-center gap-4 bg-black/[0.02] p-3 rounded-2xl border border-black/5">
                                        <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-black/[0.02] border border-black/5 shrink-0">
                                             <img src={imagePreview} alt="Preview" className={cn("w-full h-full object-cover", isGenerating && "animate-pulse blur-[2px]")} />
                                             <button 
                                                 type="button"
                                                 onClick={() => {
                                                     setImageFile(null)
                                                     setImagePreview('')
                                                     setFormData({ ...formData, image_url: '' })
                                                 }}
                                                 className="absolute top-1 right-1 w-5 h-5 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center backdrop-blur-sm transition-all shadow-sm z-10"
                                             >
                                                 <X className="w-3 h-3" />
                                             </button>
                                             {isGenerating && (
                                                 <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-20">
                                                     <Loader2 className="w-4 h-4 text-white animate-spin" />
                                                 </div>
                                             )}
                                         </div>
                                         <div className="flex-1 min-w-0">
                                             <div className="flex items-center justify-between mb-1">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-black">Reality Anchor Set</p>
                                                {item && (
                                                    <button
                                                        type="button"
                                                        disabled={isGenerating}
                                                        onClick={() => regenerateWishlistCover(item.id)}
                                                        className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 rounded-lg transition-all disabled:opacity-50"
                                                    >
                                                        {isGenerating ? (
                                                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                                        ) : (
                                                            <RefreshCw className="w-2.5 h-2.5" />
                                                        )}
                                                        <span className="text-[9px] font-black uppercase">Regenerate</span>
                                                    </button>
                                                )}
                                             </div>
                                             <p className="text-[9px] font-bold text-black/30 truncate">{imageFile ? imageFile.name : 'Visual from URL'}</p>
                                         </div>
    </div>
                                )}
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
                                {loading ? 'Processing...' : item ? 'Update Reality' : 'Anchor to Reality'}
                            </button>
                        </div>
                    </form>
                </div>
            </motion.div>
        </div>
    )
}

