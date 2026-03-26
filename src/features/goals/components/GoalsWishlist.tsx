'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    Plus, Trash2, ExternalLink, Rocket, MoreVertical, 
    Star, Tag, PoundSterling, Edit2, GripVertical, CheckCircle2, XCircle,
    UploadCloud, X, AlertTriangle, Image as ImageIcon,
    Loader2, Zap, RefreshCw, Sparkles, Wand2, ChevronRight, ChevronDown,
    Globe, Upload
} from 'lucide-react'
import type { WishlistItem, CreateWishlistItemData, GoalCategory, WishlistStatus } from '../types/goals.types'
import { useGoals } from '../hooks/useGoals'
import { cn } from '@/lib/utils'
import ConfirmationModal from '@/components/ConfirmationModal'

import WishlistDetailModal from './WishlistDetailModal'

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
    const { createWishlistItem, updateWishlistItem, deleteWishlistItem } = useGoals()
    const [isCreatingInternal, setIsCreatingInternal] = useState(false)
    const isCreating = isCreatingExternal ?? isCreatingInternal
    const setIsCreating = (val: boolean) => {
        setIsCreatingInternal(val)
        onCreatingExternalChange?.(val)
    }
    const [selectedItem, setSelectedItem] = useState<WishlistItem | null>(null)
    const [startInEdit, setStartInEdit] = useState(false)
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

                                <div className="space-y-6">
                                    {['super', 'high', 'mid', 'low'].map((prio) => {
                                        const prioItems = columnItems
                                            .filter(item => item.priority === prio)
                                            .sort((a, b) => (b.price || 0) - (a.price || 0))
                                        
                                        if (prioItems.length === 0) return null

                                        const isExpanded = expandedStacks[prio]

                                        return (
                                            <div key={prio} className="space-y-3 group/stack">
                                                <div className="flex items-center justify-between px-2">
                                                    <h4 className="text-[9px] font-black uppercase tracking-widest text-black/20 flex items-center gap-2 group-hover/stack:text-black/40 transition-colors">
                                                        <span>{prio} priority</span>
                                                        <span className="w-1 h-1 rounded-full bg-black/10" />
                                                        <span className="font-bold opacity-60">£{prioItems.reduce((acc, curr) => acc + (curr.price || 0), 0).toLocaleString()}</span>
                                                    </h4>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[8px] font-black text-black/20 uppercase tracking-tighter opacity-0 group-hover/stack:opacity-100 transition-opacity">Swipe to cycle</span>
                                                        <button 
                                                            onClick={() => toggleStack(prio)}
                                                            className="p-1 hover:bg-black/5 rounded-md transition-colors"
                                                        >
                                                            {isExpanded ? <ChevronDown className="w-3 h-3 text-black/30" /> : <ChevronRight className="w-3 h-3 text-black/30" />}
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="relative">
                                                    {isExpanded ? (
                                                        <div className="flex flex-col gap-3">
                                                            {prioItems.map(item => (
                                                                <WishlistCard 
                                                                    key={item.id} 
                                                                    item={item} 
                                                                    onClick={() => {
                                                                        setSelectedItem(item)
                                                                        setStartInEdit(false)
                                                                    }}
                                                                    onEdit={() => {
                                                                        setSelectedItem(item)
                                                                        setStartInEdit(true)
                                                                    }}
                                                                    onUpdate={(updates, file) => updateWishlistItem(item.id, updates, file)}
                                                                    onDelete={() => deleteWishlistItem(item.id)}
                                                                    onPointerDragStart={(id) => setDraggingId(id)}
                                                                    onPointerDragOver={handlePointerDragOver}
                                                                    onPointerDrop={handlePointerDrop}
                                                                />
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <InteractiveSwipeStack 
                                                            items={prioItems}
                                                            onView={(item) => {
                                                                setSelectedItem(item)
                                                                setStartInEdit(false)
                                                            }}
                                                            onEdit={(item) => {
                                                                setSelectedItem(item)
                                                                setStartInEdit(true)
                                                            }}
                                                            onUpdate={updateWishlistItem}
                                                            onDelete={deleteWishlistItem}
                                                            onPointerDragStart={setDraggingId}
                                                            onPointerDragOver={handlePointerDragOver}
                                                            onPointerDrop={handlePointerDrop}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>

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
                {isCreating && (
                    <WishlistModal 
                        item={undefined}
                        onClose={() => {
                            setIsCreating(false)
                        }} 
                        onSave={async (data, file) => {
                            await createWishlistItem(data, file)
                            setIsCreating(false)
                        }}
                    />
                )}
            </AnimatePresence>

            <WishlistDetailModal
                isOpen={!!selectedItem}
                onClose={() => {
                    setSelectedItem(null)
                    setStartInEdit(false)
                }}
                item={selectedItem}
                initialEditMode={startInEdit}
                onDelete={async (id) => {
                    await deleteWishlistItem(id)
                    setSelectedItem(null)
                    setStartInEdit(false)
                }}
            />
        </div>
    )
}

interface InteractiveSwipeStackProps {
    items: WishlistItem[]
    onView: (item: WishlistItem) => void
    onEdit: (item: WishlistItem) => void
    onUpdate: (id: string, updates: Partial<WishlistItem>, file?: File) => void
    onDelete: (id: string) => void
    onPointerDragStart: (id: string) => void
    onPointerDragOver: (x: number, y: number) => void
    onPointerDrop: (id: string, x: number, y: number) => void
}

function InteractiveSwipeStack({ 
    items, onView, onEdit, onUpdate, onDelete,
    onPointerDragStart, onPointerDragOver, onPointerDrop
}: InteractiveSwipeStackProps) {
    const [index, setIndex] = useState(0)
    const containerRef = useRef<HTMLDivElement>(null)
    const lastScrollTime = useRef(0)

    useEffect(() => {
        const el = containerRef.current
        if (!el) return

        const handleWheel = (e: WheelEvent) => {
            if (Math.abs(e.deltaY) < 10) return
            
            // Only cycle if we're not busy
            const now = Date.now()
            if (now - lastScrollTime.current < 400) return

            const direction = e.deltaY > 0 ? 1 : -1
            const newIndex = index + direction
            if (newIndex >= 0 && newIndex < items.length) {
                setIndex(newIndex)
                lastScrollTime.current = now
            }
        }

        el.addEventListener('wheel', handleWheel)
        return () => el.removeEventListener('wheel', handleWheel)
    }, [index, items.length])

    return (
        <div 
            ref={containerRef}
            onMouseEnter={() => {
                document.body.style.overflow = 'hidden'
            }}
            onMouseLeave={() => {
                document.body.style.overflow = ''
            }}
            className="relative group/stack-nav h-[240px] mb-12 select-none"
        >
            {/* The actual visible stack */}
            <div className="relative w-full h-full">
                <AnimatePresence mode="popLayout" initial={false}>
                    {items.map((item, idx) => {
                        if (idx !== index) return null

                        return (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                                animate={{
                                    scale: 1, 
                                    y: 0, 
                                    opacity: 1,
                                    zIndex: 20,
                                }}
                                exit={{ 
                                    opacity: 0, 
                                    y: -30, 
                                    filter: 'blur(4px)',
                                    scale: 1.05
                                }}
                                transition={{ 
                                    type: 'spring', 
                                    stiffness: 300, 
                                    damping: 30,
                                    opacity: { duration: 0.15 }
                                }}
                                className="absolute inset-0 z-20"
                            >
                                <WishlistCard 
                                    item={item} 
                                    onClick={() => onView(item)}
                                    onEdit={() => onEdit(item)}
                                    onUpdate={(updates, file) => onUpdate(item.id, updates, file)}
                                    onDelete={() => onDelete(item.id)}
                                    onPointerDragStart={onPointerDragStart}
                                    onPointerDragOver={onPointerDragOver}
                                    onPointerDrop={onPointerDrop}
                                />
                            </motion.div>
                        )
                    })}
                </AnimatePresence>
            </div>

            {/* Persistent Navigation Indicators */}
            {items.length > 1 && (
                <div className="absolute -right-4 top-0 bottom-0 flex flex-col justify-center gap-1.5 transition-opacity">
                    {items.map((_, i) => (
                        <div 
                            key={i}
                            onClick={() => setIndex(i)}
                            className={cn(
                                "w-1 h-1 rounded-full transition-all duration-300 cursor-pointer hover:bg-amber-500/50",
                                i === index ? "bg-amber-500 h-3" : "bg-black/10"
                            )}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

interface WishlistCardProps {
    item: WishlistItem
    onClick?: () => void
    onEdit: () => void
    onUpdate: (updates: Partial<WishlistItem>, file?: File) => void
    onDelete: () => void
    onPointerDragStart: (id: string) => void
    onPointerDragOver: (x: number, y: number) => void
    onPointerDrop: (id: string, x: number, y: number) => void
}

function WishlistCard({ 
    item, onClick, onEdit, onUpdate, onDelete,
    onPointerDragStart, onPointerDragOver, onPointerDrop
}: WishlistCardProps) {
    const { generatingWishlistIds } = useGoals()
    const [showOptions, setShowOptions] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const isGenerating = generatingWishlistIds.includes(item.id)
    const isDragging = useRef(false)
    const wasDragging = useRef(false)
    const startPos = useRef({ x: 0, y: 0 })
    const [isDraggingThis, setIsDraggingThis] = useState(false)

    const handlePointerDown = (e: React.PointerEvent) => {
        // Only trigger drag on the specific handle or the whole card if preferred
        // We'll use a specific handle for better UX
        if (!(e.target as HTMLElement).closest('.cover-drag-handle')) return

        e.preventDefault()
        startPos.current = { x: e.clientX, y: e.clientY }
        isDragging.current = false
        wasDragging.current = false

        let ghost: HTMLDivElement | null = null

        const handleMove = (ev: PointerEvent) => {
            const dx = ev.clientX - startPos.current.x
            const dy = ev.clientY - startPos.current.y
            if (!isDragging.current && Math.sqrt(dx * dx + dy * dy) > 8) {
                isDragging.current = true
                wasDragging.current = true
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
            onClick={() => {
                if (wasDragging.current) return
                if (onClick) onClick()
            }}
            className={cn(
                "group relative bg-white border border-black/[0.05] rounded-[32px] overflow-hidden shadow-sm hover:shadow-xl hover:shadow-black/5 transition-all flex flex-col min-h-[160px] cursor-pointer",
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
    const [error, setError] = useState<string | null>(null)

    const fileInputRef = useRef<HTMLInputElement>(null)

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
        setError(null)
        try {
            await onSave(formData, imageFile || undefined)
            onClose()
        } catch (err: any) {
            setError(err?.message || 'Failed to manifest desire')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-6">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94dvh]"
            >
                {/* Header */}
                <div className="px-5 md:px-8 pt-5 md:pt-7 pb-4 md:pb-5 border-b border-black/5 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
                            <Zap className="w-5 h-5 fill-current" />
                        </div>
                        <div>
                            <h2 className="text-[18px] md:text-[20px] font-bold text-black tracking-tight">
                                {item ? 'Evolutionary Branching' : 'Manifest Desire'}
                            </h2>
                            <p className="text-[10px] text-black/35 font-medium uppercase tracking-wider">Concept Anchor Pipeline</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 rounded-full border border-black/5 flex items-center justify-center hover:bg-black/5 transition-colors">
                        <X className="w-4 h-4 text-black/40" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto no-scrollbar">
                    <div className="p-5 md:px-10 md:pt-10 pb-16 md:pb-[86px] space-y-8">
                        {/* Concept Title */}
                        <div className="space-y-4 relative group/title">
                            <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1">Concept Designation</label>
                            <div className="relative">
                                <input
                                    autoFocus
                                    required
                                    type="text"
                                    placeholder="e.g. Masterwork Camera Setup"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full text-[20px] md:text-[28px] font-bold tracking-tight placeholder:text-black/10 border-none p-0 focus:ring-0 outline-none pr-14"
                                />
                                <button
                                    type="button"
                                    disabled={isSuggesting || !formData.title}
                                    onClick={handleSuggest}
                                    className={cn(
                                        "absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                                        isSuggesting ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" : 
                                        suggestions.length > 0 ? "bg-amber-100 text-amber-600" : "bg-black/[0.03] hover:bg-black text-black/30 hover:text-white"
                                    )}
                                >
                                    {isSuggesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                </button>
                            </div>

                            <AnimatePresence>
                                {suggestions.length > 0 && (
                                    <motion.div 
                                        ref={suggestionsRef}
                                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                        animate={{ opacity: 1, scale: 1, y: 4 }}
                                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                        className="absolute left-0 right-0 top-full mt-2 z-[110] bg-white/95 border border-black/5 shadow-2xl rounded-2xl overflow-hidden backdrop-blur-xl"
                                    >
                                        <div className="p-3 border-b border-black/5 bg-black/[0.02] flex items-center justify-between">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-black/40 px-2">Manifested Options</p>
                                            <button onClick={() => setSuggestions([])} className="p-1 hover:bg-black/5 rounded-lg"><X className="w-3 h-3" /></button>
                                        </div>
                                        <div className="max-h-[280px] overflow-y-auto no-scrollbar">
                                            {suggestions.map((s, idx) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => handleSelectSuggestion(s)}
                                                    className="w-full flex items-center gap-4 px-6 py-4 hover:bg-black/[0.03] transition-all border-b border-black/[0.02] last:border-0 cursor-pointer group"
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <p className="text-[11px] font-black text-black group-hover:text-amber-600 transition-colors uppercase truncate tracking-tight">{s.title}</p>
                                                            <span className="text-[9px] font-black text-black/40 shrink-0 bg-black/[0.03] px-1.5 py-0.5 rounded-md">£{s.price}</span>
                                                        </div>
                                                        <p className="text-[10px] font-bold text-black/30 line-clamp-1">{s.description}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Tagline / Brief Description */}
                        <div className="space-y-2 pt-2 border-t border-black/5">
                            <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1">Concept Brief</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Define the nature of this desire..."
                                rows={2}
                                className="w-full text-sm font-medium text-black/60 placeholder:text-black/15 border-none p-0 focus:ring-0 resize-none outline-none"
                            />
                        </div>

                        {/* Config Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2 border-t border-black/5">
                            {/* Reality Value */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1">Reality Value (GBP)</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-black/20">£</div>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={formData.price || ''}
                                        onChange={e => setFormData({ ...formData, price: e.target.value ? parseFloat(e.target.value) : undefined })}
                                        className="w-full bg-black/[0.03] border border-black/5 focus:border-black/10 focus:bg-transparent rounded-xl pl-9 pr-4 py-3 text-sm font-bold outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {/* Status */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1">Current State</label>
                                <select
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value as WishlistStatus })}
                                    className="w-full bg-black/[0.03] border border-black/5 focus:border-black/10 focus:bg-transparent rounded-xl px-4 py-3 text-sm font-bold outline-none transition-all appearance-none"
                                >
                                    {COLUMNS.map(col => (
                                        <option key={col.value} value={col.value}>{col.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Row 2: Category & Priority */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2 border-t border-black/5">
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1">Sector</label>
                                <div className="grid grid-cols-2 gap-2 p-1 bg-black/5 rounded-xl">
                                    {['personal', 'finance', 'career', 'health'].map(cat => {
                                        const active = formData.category === cat
                                        return (
                                            <button
                                                key={cat}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, category: cat as GoalCategory })}
                                                className={cn(
                                                    "py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all",
                                                    active ? "bg-black text-white shadow-lg" : "text-black/30 hover:text-black/60"
                                                )}
                                            >
                                                {cat}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1">Anchor Priority</label>
                                <div className="grid grid-cols-2 gap-2 p-1 bg-black/5 rounded-xl">
                                    {(['low', 'mid', 'high', 'super'] as const).map(pr => {
                                        const active = formData.priority === pr
                                        return (
                                            <button
                                                key={pr}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, priority: pr })}
                                                className={cn(
                                                    "py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all",
                                                    active 
                                                        ? pr === 'super' ? "bg-purple-600 text-white shadow-lg" :
                                                          pr === 'high' ? "bg-rose-600 text-white shadow-lg" :
                                                          pr === 'mid' ? "bg-amber-500 text-white shadow-lg" : "bg-black text-white"
                                                        : "text-black/30 hover:text-black/60"
                                                )}
                                            >
                                                {pr}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* URL & Asset */}
                        <div className="space-y-6 pt-2 border-t border-black/5">
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1">Reality Endpoint (URL)</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20"><Globe className="w-4 h-4" /></div>
                                    <input
                                        type="url"
                                        placeholder="https://..."
                                        value={formData.url || ''}
                                        onChange={e => setFormData({ ...formData, url: e.target.value })}
                                        className="w-full bg-black/[0.03] border border-black/5 focus:border-black/10 focus:bg-transparent rounded-xl pl-11 pr-4 py-3 text-[13px] font-medium outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1">Visual Asset</label>
                                <div className="flex gap-3">
                                    <div className="flex-1 relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20"><ImageIcon className="w-4 h-4" /></div>
                                        <input
                                            type="url"
                                            placeholder="Cover image URL..."
                                            value={formData.image_url || ''}
                                            onChange={e => { setFormData({ ...formData, image_url: e.target.value }); setImagePreview(e.target.value) }}
                                            className="w-full bg-black/[0.03] border border-black/5 focus:border-black/10 focus:bg-transparent rounded-xl pl-11 pr-4 py-3 text-[13px] font-medium outline-none transition-all"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className={cn(
                                            "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                                            imageFile ? "bg-amber-500 text-white shadow-lg" : "bg-black/[0.04] text-black/30 hover:bg-black/[0.08]"
                                        )}
                                    >
                                        <Upload className="w-5 h-5" />
                                    </button>
                                    <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                </div>

                                {imagePreview && (
                                    <div className="mt-4 flex items-center gap-4 bg-black/[0.02] p-4 rounded-2xl border border-black/5">
                                        <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-black/[0.02] border border-black/5 shrink-0">
                                            <img src={imagePreview} alt="Preview" className={cn("w-full h-full object-cover", isGenerating && "animate-pulse blur-[2px]")} />
                                            {isGenerating && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm">
                                                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-black mb-1">Reality Prop Anchor</p>
                                            <div className="flex items-center gap-2">
                                                {item && (
                                                    <button
                                                        type="button"
                                                        disabled={isGenerating}
                                                        onClick={() => regenerateWishlistCover(item.id)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 rounded-lg transition-all"
                                                    >
                                                        {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                                        <span className="text-[9px] font-black uppercase tracking-widest">Regenerate</span>
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => { setImageFile(null); setImagePreview(''); setFormData({ ...formData, image_url: '' }) }}
                                                    className="p-1.5 rounded-lg border border-black/5 hover:bg-black/5 text-black/30 hover:text-black transition-all"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-5 md:px-8 py-4 border-t border-black/5 flex items-center justify-between gap-3 shrink-0 bg-white sticky bottom-0 z-50">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-xl border border-black/10 text-[12px] font-bold text-black/50 hover:bg-black/5 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !formData.title.trim()}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-10 py-2.5 bg-black text-white rounded-xl font-bold text-[12px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-black/10 disabled:opacity-40 disabled:scale-100"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-current" />}
                            {loading ? 'Processing...' : item ? 'Update Reality' : 'Anchor to Reality'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    )
}

