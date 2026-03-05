'use client'
import { useState, useEffect } from 'react'
import { ArrowLeft, Save, Sparkles, BookOpen, Layers, Settings2, Trash2, Archive, Share2, MoreVertical, Maximize2, Minimize2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDrafts } from '../hooks/useDrafts'
import type { StudioDraft, PolymorphicNode } from '../types/studio.types'

interface StudioComposerProps {
    draftId?: string
    initialDraft?: StudioDraft | null
    initialNodes?: PolymorphicNode[]
    onBack: () => void
}

export default function StudioComposer({ draftId, initialDraft, initialNodes = [], onBack }: StudioComposerProps) {
    const { drafts, updateDraft, loading } = useDrafts()
    const [draft, setDraft] = useState<StudioDraft | null>(initialDraft || null)
    const [body, setBody] = useState(initialDraft?.body || '')
    const [title, setTitle] = useState(initialDraft?.title || 'Untitled Draft')
    const [isSaving, setIsSaving] = useState(false)
    const [activePane, setActivePane] = useState<'research' | 'editor' | 'context'>('editor')
    const [showScaffold, setShowScaffold] = useState(true)
    const [showContext, setShowContext] = useState(true)

    // Load initial draft ONLY when draftId changes or on first mount
    useEffect(() => {
        if (draftId && drafts.length > 0) {
            const existing = drafts.find(d => d.id === draftId)
            if (existing) {
                setDraft(existing)
                // Only update body/title if they are currently empty or if it's a completely different draft
                if (!body || draftId !== draft?.id) {
                    setBody(existing.body || '')
                    setTitle(existing.title || 'Untitled Draft')
                }
            }
        }
    }, [draftId, drafts.length]) // Use length to avoid firing on object reference changes if content is same

    const handleSave = async () => {
        if (!draft || isSaving) return
        setIsSaving(true)
        try {
            await updateDraft(draft.id, {
                body,
                title,
                node_references: draft.node_references
            })
        } catch (err) {
            console.error('Save failed:', err)
        }
        setIsSaving(false)
    }

    // Auto-save logic
    useEffect(() => {
        const timer = setTimeout(() => {
            const hasBodyChanged = body !== draft?.body
            const hasTitleChanged = title !== draft?.title
            if (hasBodyChanged || hasTitleChanged) {
                handleSave()
            }
        }, 1500)
        return () => clearTimeout(timer)
    }, [body, title, draft?.node_references])

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
                        {initialNodes.map(node => {
                            const isAdded = draft?.node_references?.some(r => r.node_id === node.id)
                            return (
                                <ResearchNodeCard
                                    key={node.id}
                                    node={node}
                                    isAdded={isAdded}
                                    onInsert={(text, data) => {
                                        setBody(prev => {
                                            const spacing = prev.length === 0 ? "" : (prev.endsWith('\n\n') ? "" : (prev.endsWith('\n') ? "\n" : "\n\n"))
                                            return prev + spacing + text
                                        })
                                        setDraft(prev => {
                                            if (!prev) return prev
                                            const exists = prev.node_references?.some(r => r.node_id === data.id)
                                            if (exists) return prev
                                            return {
                                                ...prev,
                                                node_references: [
                                                    ...(prev.node_references || []),
                                                    { node_id: data.id, node_type: data.type }
                                                ]
                                            }
                                        })
                                    }}
                                />
                            )
                        })}
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
                    <div className="w-full max-w-[720px] py-16 px-8 flex flex-col min-h-full">
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                                e.preventDefault()
                                const jsonData = e.dataTransfer.getData('application/json')
                                const plainText = e.dataTransfer.getData('text/plain')

                                if (plainText) {
                                    // Basic insertion at the end for now, or we could try to calculate cursor position
                                    // In a textarea, e.target.selectionStart might not be set during drop easily
                                    setBody(prev => prev + (prev.endsWith('\n\n') ? '' : prev.endsWith('\n') ? '\n' : '\n\n') + plainText)
                                }

                                if (jsonData) {
                                    try {
                                        const data = JSON.parse(jsonData)
                                        if (data.id && data.type) {
                                            // Add to node references if not already there
                                            setDraft(prev => {
                                                if (!prev) return prev
                                                const exists = prev.node_references?.some(r => r.node_id === data.id)
                                                if (exists) return prev
                                                return {
                                                    ...prev,
                                                    node_references: [
                                                        ...(prev.node_references || []),
                                                        { node_id: data.id, node_type: data.type }
                                                    ]
                                                }
                                            })
                                        }
                                    } catch (err) {
                                        console.error('Failed to parse dropped node data', err)
                                    }
                                }
                            }}
                            placeholder="Start writing..."
                            className="w-full flex-1 text-[18px] text-black/80 leading-relaxed bg-transparent outline-none border-none placeholder:text-black/10 resize-none font-medium selection:bg-indigo-100 selection:text-indigo-900"
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

function ResearchNodeCard({ node, onInsert, isAdded }: { node: PolymorphicNode; onInsert: (text: string, data: any) => void; isAdded?: boolean }) {
    const [justInserted, setJustInserted] = useState(false)

    const handleDragStart = (e: React.DragEvent) => {
        const typeLabel = node.node_type === 'entry' ? 'Note' : node.node_type === 'project' ? 'Project' : 'Content'
        const bodyContent = node.node_type === 'entry' ? (node as any).body : (node as any).tagline || (node as any).description || ''
        const data = { id: node.id, type: node.node_type }
        const textToInsert = `\n\n> [!${typeLabel}: ${node.title}]\n> ${bodyContent.replace(/\n/g, '\n> ')}\n\n`

        e.dataTransfer.setData('text/plain', textToInsert)
        e.dataTransfer.setData('application/json', JSON.stringify(data))
        e.dataTransfer.effectAllowed = 'copy'
    }

    const handleClickInsert = (e: React.MouseEvent) => {
        e.stopPropagation()
        console.log('Inserting node:', node.title)
        const typeLabel = node.node_type === 'entry' ? 'Note' : node.node_type === 'project' ? 'Project' : 'Content'
        const bodyContent = node.node_type === 'entry' ? (node as any).body : (node as any).tagline || (node as any).description || ''
        const data = { id: node.id, type: node.node_type }
        const textToInsert = `\n\n> [!${typeLabel}: ${node.title}]\n> ${bodyContent.replace(/\n/g, '\n> ')}\n\n`

        onInsert(textToInsert, data)
        setJustInserted(true)
        setTimeout(() => setJustInserted(false), 2000)
    }

    return (
        <div
            draggable
            onDragStart={handleDragStart}
            className={cn(
                "p-4 border rounded-2xl group transition-all cursor-grab active:cursor-grabbing relative select-none",
                isAdded || justInserted ? "bg-indigo-50/50 border-indigo-200 shadow-sm" : "bg-black/[0.02] border-black/[0.05] hover:border-indigo-200 hover:bg-indigo-50/30"
            )}
        >
            <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                <button
                    onClick={handleClickInsert}
                    className={cn(
                        "w-6 h-6 rounded-lg flex items-center justify-center shadow-sm transition-all active:scale-95",
                        justInserted ? "bg-green-500 text-white border-green-500" : "bg-white border border-black/5 text-indigo-500 hover:bg-indigo-50 hover:border-indigo-100"
                    )}
                    title="Insert to draft"
                >
                    {justInserted ? <Save className="w-3 h-3" /> : <Plus className="w-3.5 h-3.5" />}
                </button>
                <Maximize2 className="w-3 h-3 text-black/20" />
            </div>
            <h4 className="text-[12px] font-black text-black line-clamp-1 mb-1">{node.title}</h4>
            <p className="text-[10px] text-black/40 line-clamp-2 leading-relaxed font-medium">
                {node.node_type === 'entry' ? (node as any).body : (node as any).tagline || 'No description provided.'}
            </p>
            <div className="flex items-center gap-1.5 mt-2">
                <span className={cn(
                    "text-[9px] font-black uppercase transition-all",
                    isAdded || justInserted ? "text-indigo-500" : "text-black/20 group-hover:text-indigo-500"
                )}>
                    {justInserted ? 'Added to draft' : isAdded ? 'Referenced' : 'Drag or Click + to insert'}
                </span>
            </div>
        </div>
    )
}
