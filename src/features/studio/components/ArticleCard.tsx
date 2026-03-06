'use client'
import { Pin, Trash2, Archive, Link2, Rocket, Video, BookOpen, Image as ImageIcon } from 'lucide-react'
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

    // Extract images from HTML body
    const images = (() => {
        const urls: string[] = []
        if (!draft.body) return urls
        const imgRegex = /<img [^>]*src="([^"]*)"[^>]*>/g
        let match
        while ((match = imgRegex.exec(draft.body)) !== null) {
            if (match[1] && !urls.includes(match[1])) urls.push(match[1])
        }
        return urls.slice(0, 3) // Show top 3 in stack
    })()

    return (
        <div
            className="group relative rounded-[32px] border border-black/[0.06] p-5 cursor-pointer transition-all hover:shadow-xl hover:border-black/10 flex flex-col gap-3 bg-white hover:-translate-y-1 duration-300 overflow-hidden"
            onClick={onClick}
        >
            {/* Header Row: Icon and Counts */}
            <div className="flex items-center gap-2 mb-1 relative z-20">
                <div className={cn("w-2 h-2 rounded-full shrink-0", images.length > 0 ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]" : "bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.4)]")} />

                {hasReferences && (
                    <div className="flex items-center gap-2 opacity-60">
                        {counts.notes > 0 && (
                            <span className="flex items-center gap-0.5 text-[9px] font-black text-indigo-500 uppercase tracking-tighter">
                                <Link2 className="w-2.5 h-2.5" />
                                {counts.notes}
                            </span>
                        )}
                        {counts.projects > 0 && (
                            <span className="flex items-center gap-0.5 text-[9px] font-black text-orange-500 uppercase tracking-tighter">
                                <Rocket className="w-2.5 h-2.5" />
                                {counts.projects}
                            </span>
                        )}
                        {counts.content > 0 && (
                            <span className="flex items-center gap-0.5 text-[9px] font-black text-blue-500 uppercase tracking-tighter">
                                <Video className="w-2.5 h-2.5" />
                                {counts.content}
                            </span>
                        )}
                    </div>
                )}
                <div className="ml-auto opacity-20">
                    {images.length > 0 ? <ImageIcon className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />}
                </div>
            </div>

            {/* Main Content Area: Side-By-Side for stack */}
            <div className="flex gap-4 relative z-10 flex-1 min-h-0">
                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    <h3 className="text-[15px] font-black text-black leading-tight line-clamp-2 pr-6 tracking-tight group-hover:text-indigo-600 transition-colors">
                        {draft.title || 'Untitled Article'}
                    </h3>
                    {draft.body && (
                        <p className="text-[12px] text-black/40 leading-relaxed line-clamp-3 mt-1 font-medium italic">
                            {draft.body.replace(/<[^>]*>/g, '').replace(/[#*`>]/g, '').trim().slice(0, 160)}
                        </p>
                    )}
                </div>

                {/* Stacked Image thumbnails (Matching CanvasCard Notes) */}
                {images.length > 0 && (
                    <div className="shrink-0 pt-1">
                        <div className="relative w-14 h-14 flex items-center justify-center">
                            {images.slice(0, 3).map((url, i) => (
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
                            {images.length > 3 && (
                                <div
                                    className="absolute bottom-0 right-[-4px] w-6 h-6 rounded-lg bg-black/80 backdrop-blur-md flex items-center justify-center text-[8px] font-black text-white border border-white/20 z-20 shadow-lg"
                                >
                                    +{images.length - 3}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Row: Date & Hover Actions */}
            <div className="flex items-center justify-between mt-auto pt-3 border-t border-black/[0.04] relative z-10 h-10 overflow-hidden">
                <p className="text-[9px] text-black/20 font-black uppercase tracking-widest group-hover:translate-y-10 transition-all duration-300">
                    {new Date(draft.updated_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                </p>

                {/* Actions: Simplified Visibility & Animation */}
                <div className="flex items-center gap-1.5 absolute right-0 translate-y-10 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out">
                    <button
                        onClick={(e) => { e.stopPropagation(); onPin(); }}
                        className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-sm",
                            draft.pinned ? "bg-black text-white" : "text-black/20 hover:text-black hover:bg-black/5"
                        )}
                        title="Pin"
                    >
                        <Pin className={cn("w-3.5 h-3.5", draft.pinned && "fill-current")} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onArchive(); }}
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-black/20 bg-white hover:text-white hover:bg-amber-500 border border-black/[0.05] transition-all hover:scale-110 active:scale-95 shadow-sm hover:shadow-amber-500/20"
                        title="Archive"
                    >
                        <Archive className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-black/20 bg-white hover:text-white hover:bg-red-500 border border-black/[0.05] transition-all hover:scale-110 active:scale-95 shadow-sm hover:shadow-red-500/20"
                        title="Delete"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    )
}
