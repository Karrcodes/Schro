'use client'
import { Pin, Trash2, Archive, Link2, Rocket, Video, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StudioDraft } from '../types/studio.types'

interface Props {
    draft: StudioDraft
    onClick: () => void
    onPin: () => void
    onDelete: () => void
    onArchive: () => void
}

export default function ArticleCard({ draft, onClick, onPin, onDelete, onArchive }: Props) {
    const references = draft.node_references || []
    const counts = {
        notes: references.filter(r => r.node_type === 'entry').length,
        projects: references.filter(r => r.node_type === 'project').length,
        content: references.filter(r => r.node_type === 'content').length
    }

    const hasReferences = counts.notes > 0 || counts.projects > 0 || counts.content > 0

    return (
        <div
            className="group relative rounded-2xl border border-black/[0.06] p-4 cursor-pointer transition-all hover:shadow-md hover:border-black/10 flex flex-col gap-2 bg-white"
            onClick={onClick}
        >
            {/* Pin indicator */}
            {draft.pinned && (
                <div className="absolute top-3 right-3 w-4 h-4 flex items-center justify-center text-black/30">
                    <Pin className="w-3 h-3 fill-current" />
                </div>
            )}

            {/* Header Row: Icon and Counts */}
            <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />

                {hasReferences && (
                    <div className="flex items-center gap-2 opacity-60">
                        {counts.notes > 0 && (
                            <span className="flex items-center gap-0.5 text-[9px] font-bold text-indigo-500">
                                <Link2 className="w-2.5 h-2.5" />
                                {counts.notes}
                            </span>
                        )}
                        {counts.projects > 0 && (
                            <span className="flex items-center gap-0.5 text-[9px] font-bold text-orange-500">
                                <Rocket className="w-2.5 h-2.5" />
                                {counts.projects}
                            </span>
                        )}
                        {counts.content > 0 && (
                            <span className="flex items-center gap-0.5 text-[9px] font-bold text-blue-500">
                                <Video className="w-2.5 h-2.5" />
                                {counts.content}
                            </span>
                        )}
                    </div>
                )}
                <div className="ml-auto opacity-20">
                    <BookOpen className="w-3 h-3" />
                </div>
            </div>

            {/* Content Row */}
            <div className="flex flex-col gap-1">
                <h3 className="text-[13px] font-bold text-black leading-snug line-clamp-2 pr-6">{draft.title || 'Untitled Article'}</h3>
                {draft.body && (
                    <p className="text-[12px] text-black/50 leading-relaxed line-clamp-4 mt-1">
                        {draft.body.replace(/<[^>]*>/g, '').replace(/[#*`>]/g, '').trim().slice(0, 160)}...
                    </p>
                )}
            </div>

            {/* Date */}
            <div className="flex items-center mt-auto pt-2">
                <p className="text-[10px] text-black/25 font-medium">
                    Updated {new Date(draft.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </p>
            </div>

            {/* Action buttons */}
            <div
                className="absolute bottom-3 right-3 flex items-center gap-1 opacity-25 group-hover:opacity-100 transition-opacity"
                onClick={e => e.stopPropagation()}
            >
                <button
                    onClick={onPin}
                    className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95",
                        draft.pinned ? "bg-black text-white" : "text-black/30 hover:text-black hover:bg-black/5"
                    )}
                    title={draft.pinned ? "Unpin" : "Pin"}
                >
                    <Pin className={cn("w-4 h-4", draft.pinned && "fill-current")} />
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
        </div>
    )
}
