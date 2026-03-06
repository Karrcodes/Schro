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
    connections?: {
        notes: number
        projects: { id: string; title: string }[]
        content: { id: string; title: string }[]
    }
    onClick: () => void
    onPin: () => void
    onDelete: () => void
    onArchive: () => void
    onColorChange: (color: CanvasColor) => void
}

export default function CanvasCard({ entry, connections, onClick, onPin, onDelete, onArchive, onColorChange }: Props) {
    const [showPalette, setShowPalette] = useState(false)
    const { card, dot } = COLOR_MAP[entry.color] || COLOR_MAP.default

    const hasConnections = connections && (connections.notes > 0 || connections.projects.length > 0 || connections.content.length > 0)

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

            {/* Header Row: dot, connections */}
            <div className="flex items-center gap-2 mb-1">
                {/* Color dot */}
                <div className={cn("w-2 h-2 rounded-full shrink-0", dot)} />

                {/* Unified Connections */}
                {hasConnections && (
                    <div className="flex items-center gap-2 opacity-60">
                        {connections.notes > 0 && (
                            <span className="flex items-center gap-0.5 text-[9px] font-bold text-indigo-500">
                                <Link2 className="w-2.5 h-2.5" />
                                {connections.notes > 1 && connections.notes}
                            </span>
                        )}
                        {connections.projects.length > 0 && (
                            <span className="flex items-center gap-0.5 text-[9px] font-bold text-orange-500">
                                <Rocket className="w-2.5 h-2.5" />
                                {connections.projects.length > 1 && connections.projects.length}
                            </span>
                        )}
                        {connections.content.length > 0 && (
                            <span className="flex items-center gap-0.5 text-[9px] font-bold text-blue-500">
                                <Video className="w-2.5 h-2.5" />
                                {connections.content.length > 1 && connections.content.length}
                            </span>
                        )}
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

                {/* Stacked Image thumbnails (right side) */}
                {entry.images && entry.images.length > 0 && (
                    <div className="shrink-0 pt-1">
                        <div className="relative w-14 h-14 flex items-center justify-center">
                            {entry.images.slice(0, 3).map((url, i) => (
                                <div
                                    key={i}
                                    className="absolute w-12 h-12 rounded-xl overflow-hidden shadow-md transition-all duration-500 border border-white"
                                    style={{
                                        zIndex: 10 - i,
                                        transform: `translateX(${i * 6}px) translateY(${i * -2}px) rotate(${i * 6 - 6}deg) scale(${1 - i * 0.08})`,
                                        opacity: 1 - i * 0.2
                                    }}
                                >
                                    <img src={url} alt="" className="w-full h-full object-cover" />
                                </div>
                            ))}
                            {entry.images.length > 3 && (
                                <div
                                    className="absolute bottom-0 right-[-4px] w-6 h-6 rounded-lg bg-black/80 backdrop-blur-md flex items-center justify-center text-[8px] font-black text-white border border-white/20 z-20 shadow-lg"
                                >
                                    +{entry.images.length - 3}
                                </div>
                            )}
                        </div>
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

            {/* Date & Persistent Actions */}
            <div className="flex items-center justify-between mt-auto pt-2 border-t border-black/[0.04] relative z-20">
                <p className="text-[10px] text-black/25 font-medium shrink-0">
                    {new Date(entry.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </p>

                {/* Action buttons - Persistent for iPad accessibility */}
                <div
                    className="flex items-center gap-1.5 ml-auto"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Color palette */}
                    <div className="relative">
                        <button
                            onClick={() => setShowPalette(p => !p)}
                            className="w-8 h-8 rounded-xl flex items-center justify-center bg-white text-black/30 hover:text-black/60 hover:bg-black/[0.05] border border-black/[0.05] transition-all"
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
                            "w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-sm border border-black/[0.03]",
                            entry.pinned ? "bg-black text-white" : "bg-white text-black/30 hover:text-black hover:bg-black/5"
                        )}
                        title={entry.pinned ? "Unpin" : "Pin"}
                    >
                        <Pin className={cn("w-3.5 h-3.5", entry.pinned && "fill-current")} />
                    </button>

                    <button
                        onClick={onArchive}
                        className="w-8 h-8 rounded-xl flex items-center justify-center bg-white text-black/30 hover:text-white hover:bg-amber-500 border border-black/[0.05] transition-all hover:scale-110 active:scale-95 shadow-sm hover:shadow-amber-500/20"
                        title="Archive"
                    >
                        <Archive className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={onDelete}
                        className="w-8 h-8 rounded-xl flex items-center justify-center bg-white text-black/30 hover:text-white hover:bg-red-500 border border-black/[0.05] transition-all hover:scale-110 active:scale-95 shadow-sm hover:shadow-red-500/20"
                        title="Delete"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
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
