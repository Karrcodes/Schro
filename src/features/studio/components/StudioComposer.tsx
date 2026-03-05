'use client'
import { useState, useEffect } from 'react'
import { ArrowLeft, Save, Sparkles, BookOpen, Layers, Settings2, Trash2, Archive, Share2, MoreVertical, Maximize2, Minimize2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDrafts } from '../hooks/useDrafts'
import type { StudioDraft, PolymorphicNode } from '../types/studio.types'

interface StudioComposerProps {
    draftId?: string
    initialNodes?: PolymorphicNode[]
    onBack: () => void
}

export default function StudioComposer({ draftId, initialNodes = [], onBack }: StudioComposerProps) {
    const { drafts, updateDraft, loading } = useDrafts()
    const [draft, setDraft] = useState<StudioDraft | null>(null)
    const [body, setBody] = useState('')
    const [title, setTitle] = useState('Untitled Draft')
    const [isSaving, setIsSaving] = useState(false)
    const [activePane, setActivePane] = useState<'research' | 'editor' | 'context'>('editor')
    const [showScaffold, setShowScaffold] = useState(true)
    const [showContext, setShowContext] = useState(true)

    // Load initial draft or create local state if draftId is provided
    useEffect(() => {
        if (draftId && drafts.length > 0) {
            const existing = drafts.find(d => d.id === draftId)
            if (existing) {
                setDraft(existing)
                setBody(existing.body || '')
                setTitle(existing.title || 'Untitled Draft')
            }
        }
    }, [draftId, drafts])

    const handleSave = async () => {
        if (!draft || isSaving) return
        setIsSaving(true)
        await updateDraft(draft.id, { body, title })
        setIsSaving(false)
    }

    // Auto-save logic
    useEffect(() => {
        const timer = setTimeout(() => {
            if (body !== draft?.body || title !== draft?.title) {
                handleSave()
            }
        }, 2000)
        return () => clearTimeout(timer)
    }, [body, title, draft])

    return (
        <div className="fixed inset-0 bg-[#fafafa] z-[100] flex flex-col animate-in fade-in duration-300">
            {/* Header */}
            <header className="h-[72px] border-b border-black/[0.05] bg-white flex items-center justify-between px-6 shrink-0 z-20 shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-black/5 rounded-xl text-black/40 hover:text-black transition-all"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="h-6 w-px bg-black/[0.05]" />
                    <div>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="text-[17px] font-black text-black bg-transparent outline-none border-none placeholder:text-black/20 max-w-[300px]"
                            placeholder="Draft Title..."
                        />
                        <p className="text-[10px] font-bold text-black/30 uppercase tracking-widest mt-0.5">
                            Draft · {isSaving ? 'Saving...' : 'All changes saved'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex bg-black/[0.03] p-1 rounded-xl border border-black/5 mr-2">
                        <button
                            onClick={() => setShowScaffold(!showScaffold)}
                            className={cn(
                                "p-2 rounded-lg transition-all",
                                showScaffold ? "bg-white text-indigo-500 shadow-sm" : "text-black/30 hover:text-black/60"
                            )}
                        >
                            <Layers className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setShowContext(!showContext)}
                            className={cn(
                                "p-2 rounded-lg transition-all",
                                showContext ? "bg-white text-indigo-500 shadow-sm" : "text-black/30 hover:text-black/60"
                            )}
                        >
                            <Sparkles className="w-4 h-4" />
                        </button>
                    </div>
                    <button className="px-5 py-2.5 bg-black text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-black/80 transition-all active:scale-95">
                        Publish
                    </button>
                </div>
            </header>

            {/* Main Workspace */}
            <main className="flex-1 flex overflow-hidden relative">
                {/* Left: Research Scaffold */}
                <aside
                    className={cn(
                        "w-[320px] bg-white border-r border-black/[0.05] flex flex-col transition-all duration-300 overflow-hidden",
                        !showScaffold && "w-0 opacity-0"
                    )}
                >
                    <div className="p-6 border-b border-black/[0.03]">
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-black/40">Research Scaffold</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {initialNodes.map(node => (
                            <ResearchNodeCard key={node.id} node={node} />
                        ))}
                        {initialNodes.length === 0 && (
                            <div className="py-12 px-4 text-center opacity-20">
                                <BookOpen className="w-10 h-10 mx-auto mb-3" />
                                <p className="text-[12px] font-bold italic text-black/40 leading-relaxed">No research nodes linked to this draft yet. Lasso some nodes in the Mindmap to start.</p>
                            </div>
                        )}
                    </div>
                </aside>

                {/* Center: Zen Editor */}
                <section className="flex-1 overflow-y-auto bg-white flex flex-col items-center">
                    <div className="w-full max-w-[720px] py-16 px-8 min-h-full">
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder="Start writing..."
                            className="w-full min-h-[600px] text-[18px] text-black/80 leading-relaxed bg-transparent outline-none border-none placeholder:text-black/10 resize-none font-medium selection:bg-indigo-100 selection:text-indigo-900"
                            style={{ fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif' }}
                        />
                    </div>
                </section>

                {/* Right: Context Panel */}
                <aside
                    className={cn(
                        "w-[340px] bg-white border-l border-black/[0.05] flex flex-col transition-all duration-300 overflow-hidden",
                        !showContext && "w-0 opacity-0"
                    )}
                >
                    <div className="p-6 border-b border-black/[0.03] flex items-center justify-between">
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-black/40">Studio Assistant</h3>
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    </div>
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="bg-indigo-50/50 rounded-2xl p-5 border border-indigo-100/50 mb-6">
                            <p className="text-[13px] font-bold text-indigo-600 mb-2">Contextual Suggestion</p>
                            <p className="text-[12px] text-black/60 leading-relaxed italic">
                                "Try expanding on the 'Centralized OS' theme mentioned in your Mindmap nodes. It feels like the core tension of this draft."
                            </p>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-tighter text-black/30 mb-3">Draft Metadata</h4>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-[11px] font-bold">
                                        <span className="text-black/40">Reading Time</span>
                                        <span className="text-black">{Math.ceil(body.split(' ').length / 200)} min</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] font-bold">
                                        <span className="text-black/40">Word Count</span>
                                        <span className="text-black">{body.split(' ').filter(Boolean).length}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>
            </main>
        </div>
    )
}

function ResearchNodeCard({ node }: { node: PolymorphicNode }) {
    return (
        <div className="p-4 bg-black/[0.02] border border-black/[0.05] rounded-2xl group hover:border-indigo-200 hover:bg-indigo-50/30 transition-all cursor-grab active:cursor-grabbing">
            <h4 className="text-[12px] font-black text-black line-clamp-1 mb-1">{node.title}</h4>
            <p className="text-[10px] text-black/40 line-clamp-2 leading-relaxed font-medium">
                {node.node_type === 'entry' ? (node as any).body : (node as any).tagline || 'No description provided.'}
            </p>
            <div className="flex items-center gap-1.5 mt-2 opacity-0 group-hover:opacity-100 transition-all">
                <span className="text-[9px] font-black uppercase text-indigo-500/70">Drag to insert</span>
            </div>
        </div>
    )
}
