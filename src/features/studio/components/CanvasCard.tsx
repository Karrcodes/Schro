'use client'
import { useState } from 'react'
import { Pin, Trash2, Palette, ArrowUpRight, Link2, Archive, List, Rocket, Video } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StudioCanvasEntry, CanvasColor } from '../types/studio.types'

const COLOR_MAP: Record<CanvasColor, { card: string; dot: string }> = {
    default: { card: 'bg-white', dot: 'bg-black/20' },
    yellow: { card: 'bg-amber-50', dot: 'bg-amber-400' },
    blue: { card: 'bg-blue-50', dot: 'bg-blue-400' },
    green: { card: 'bg-emerald-50', dot: 'bg-emerald-400' },
    purple: { card: 'bg-purple-50', dot: 'bg-purple-400' },
    red: { card: 'bg-rose-50', dot: 'bg-rose-400' },
}
const COLORS: CanvasColor[] = ['default', 'yellow', 'blue', 'green', 'purple', 'red']

interface Props {
    entry: StudioCanvasEntry
    connectionCount?: number
    onClick: () => void
    onPin: () => void
    onDelete: () => void
    onArchive: () => void
    onColorChange: (color: CanvasColor) => void
    links?: { id: string; type: 'project' | 'content'; title: string }[]
}

export default function CanvasCard({ entry, connectionCount = 0, onClick, onPin, onDelete, onArchive, onColorChange, links = [] }: Props) {
    const [showPalette, setShowPalette] = useState(false)
    const { card, dot } = COLOR_MAP[entry.color] || COLOR_MAP.default

    return (
        <div
            className={cn(
                "group relative rounded-2xl border border-black/[0.06] p-4 cursor-pointer transition-all hover:shadow-md hover:border-black/10 flex flex-col gap-2",
                card
            )}
            onClick={onClick}
        >
            {/* Pin indicator */}
            {entry.pinned && (
                <div className="absolute top-3 right-3 w-4 h-4 flex items-center justify-center text-black/30">
                    <Pin className="w-3 h-3 fill-current" />
                </div>
            )}

            {/* Header Row: dot, connection count, semantic links */}
            <div className="flex items-center gap-2 mb-1">
                {/* Color dot */}
                <div className={cn("w-2 h-2 rounded-full shrink-0", dot)} />

                {/* Connection count */}
                {connectionCount > 0 && (
                    <span className="flex items-center gap-0.5 text-[9px] font-bold text-indigo-400 shrink-0">
                        <Link2 className="w-2.5 h-2.5" />
                        {connectionCount}
                    </span>
                )}

                {/* Semantic Links */}
                {links && links.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-1 min-w-0 pr-4">
                        <div className="flex -space-x-1 shrink-0">
                            {links.slice(0, 3).map((link, i) => (
                                <div key={link.id} className={cn(
                                    "w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white text-white",
                                    link.type === 'project' ? "bg-orange-500" : "bg-blue-500"
                                )} title={link.title}>
                                    {link.type === 'project' ? <Rocket className="w-2 h-2" /> : <Video className="w-2 h-2" />}
                                </div>
                            ))}
                        </div>
                        <p className="text-[9px] font-black text-black/40 truncate flex-1 leading-none">
                            {links.length === 1 ? links[0].title : `${links.length} links`}
                        </p>
                    </div>
                )}
            </div>


            {/* Content Row */}
            <div className="flex gap-4">
                <div className="flex-1 min-w-0">
                    {/* Title */}
                    <h3 className="text-[13px] font-bold text-black leading-snug line-clamp-2 pr-6">{entry.title}</h3>

                    {/* Body */}
                    {entry.body && (
                        <p className="text-[12px] text-black/50 leading-relaxed line-clamp-4 whitespace-pre-line mt-1">{entry.body}</p>
                    )}
                </div>

                {/* Image thumbnail (right side) */}
                {entry.images && entry.images.length > 0 && (
                    <div className="flex flex-col gap-1.5 shrink-0">
                        {entry.images.slice(0, 2).map((url, i) => (
                            <img key={i} src={url} alt="" className="w-14 h-14 rounded-xl object-cover border border-black/[0.06] shadow-sm" />
                        ))}
                        {entry.images.length > 2 && (
                            <div className="w-14 h-14 rounded-xl bg-black/[0.04] flex items-center justify-center text-[10px] font-bold text-black/40">
                                +{entry.images.length - 2}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Tags */}
            {entry.tags && entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-auto pt-1">
                    {entry.tags.slice(0, 4).map(tag => (
                        <span key={tag} className="text-[10px] font-bold text-black/40 bg-black/[0.04] px-2 py-0.5 rounded-full">
                            {tag}
                        </span>
                    ))}
                </div>
            )}

            {/* Date */}
            <div className="flex items-center mt-1 pt-1">
                <p className="text-[10px] text-black/25 font-medium">
                    {new Date(entry.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </p>
            </div>

            {/* Action buttons - always visible but low opacity until hover */}
            <div
                className="absolute bottom-3 right-3 flex items-center gap-1 opacity-25 group-hover:opacity-100 transition-opacity"
                onClick={e => e.stopPropagation()}
            >
                {/* Color palette */}
                <div className="relative">
                    <button
                        onClick={() => setShowPalette(p => !p)}
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-black/30 hover:text-black/60 hover:bg-black/[0.05] transition-all"
                    >
                        <Palette className="w-3.5 h-3.5" />
                    </button>
                    {showPalette && (
                        <div className="absolute bottom-full right-0 mb-1.5 flex items-center gap-1 p-1.5 bg-white border border-black/[0.08] rounded-xl shadow-xl z-[50]">
                            {COLORS.map(c => (
                                <button
                                    key={c}
                                    onClick={() => { onColorChange(entry.color === c ? 'default' : c); setShowPalette(false) }}
                                    className={cn("w-5 h-5 rounded-full border-2 transition-all hover:scale-110", COLOR_MAP[c].dot,
                                        entry.color === c ? 'border-black/40' : 'border-transparent'
                                    )}
                                />
                            ))}
                        </div>
                    )}
                </div>
                <button
                    onClick={onPin}
                    className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95",
                        entry.pinned ? "bg-black text-white" : "text-black/30 hover:text-black hover:bg-black/5"
                    )}
                    title={entry.pinned ? "Unpin" : "Pin"}
                >
                    <Pin className={cn("w-4 h-4", entry.pinned && "fill-current")} />
                </button>

                <div className="w-px h-4 bg-black/[0.05] mx-0.5" />

                <button
                    onClick={onArchive}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-black/30 hover:text-white hover:bg-amber-500 transition-all hover:scale-110 active:scale-95 shadow-sm hover:shadow-amber-500/20"
                    title="Archive"
                >
                    <Archive className="w-4 h-4" />
                </button>
                <button
                    onClick={onDelete}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-black/30 hover:text-white hover:bg-red-500 transition-all hover:scale-110 active:scale-95 shadow-sm hover:shadow-red-500/20"
                    title="Delete"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {/* Promoted badge */}
            {entry.promoted_to_spark_id && (
                <div className="absolute top-3 left-3 flex items-center gap-1 text-[9px] font-black text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-md">
                    <ArrowUpRight className="w-2.5 h-2.5" />
                    <span>SPARKED</span>
                </div>
            )}
        </div>
    )
}
