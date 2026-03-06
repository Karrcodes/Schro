'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { ArrowLeft, Save, Sparkles, BookOpen, Layers, Settings2, Trash2, Archive, Share2, MoreVertical, Maximize2, Minimize2, Plus, Bold, Italic, Highlighter, List, Heading1, Heading2, Wand2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDrafts } from '../hooks/useDrafts'
import { StudioDraft, PolymorphicNode, ProjectType, NodeReference } from '../types/studio.types'
import { ZenEditor, type ZenEditorRef } from './ZenEditor'
import { useStudioContext } from '../context/StudioContext'
import { useCanvas } from '../hooks/useCanvas'
import { Search, Filter, Hash, Image as ImageIcon, FileText, Check } from 'lucide-react'
import { PublishModal } from './PublishModal'

interface StudioComposerProps {
    draftId?: string
    initialDraft?: StudioDraft | null
    initialNodes?: PolymorphicNode[]
    onBack: () => void
}

export default function StudioComposer({ draftId, initialDraft, initialNodes = [], onBack }: StudioComposerProps) {
    const { drafts, updateDraft, loading: draftsLoading } = useDrafts()
    const { projects, content, loading: studioLoading } = useStudioContext()
    const { entries, connections, loading: canvasLoading } = useCanvas()

    const [draft, setDraft] = useState<StudioDraft | null>(initialDraft || null)
    const [body, setBody] = useState(initialDraft?.body || '')
    const [title, setTitle] = useState(initialDraft?.title || 'Untitled Draft')
    const [nodeRefs, setNodeRefs] = useState<NodeReference[]>(initialDraft?.node_references || [])
    const [isSaving, setIsSaving] = useState(false)
    const [showScaffold, setShowScaffold] = useState(true)
    const [showContext, setShowContext] = useState(true)
    const [isPublishModalOpen, setIsPublishModalOpen] = useState(false)

    // Library State
    const [leftTab, setLeftTab] = useState<'scaffold' | 'library'>('scaffold')
    const [librarySearch, setLibrarySearch] = useState('')
    const [libraryType, setLibraryType] = useState<'all' | 'notes' | 'projects' | 'content'>('all')
    const [libraryFilter, setLibraryFilter] = useState<string | null>(null)

    const [isGenerating, setIsGenerating] = useState<string | null>(null) // node id being processed
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [analysis, setAnalysis] = useState<{ suggestion: string, insertable_text: string } | null>(null)
    const editorRef = useRef<ZenEditorRef>(null)

    // Load initial draft ONLY when draftId changes or on first mount
    useEffect(() => {
        if (draftId && drafts.length > 0) {
            const existing = drafts.find(d => d.id === draftId)
            if (existing) {
                setDraft(existing)
                // Only update local states if it's a completely different draft
                if (draftId !== draft?.id) {
                    setBody(existing.body || '')
                    setTitle(existing.title || 'Untitled Draft')
                    setNodeRefs(existing.node_references || [])
                }
            }
        } else if (!draftId && initialNodes.length > 0 && (!title || title === 'Untitled Draft')) {
            // New draft: use the first node's title as the default title
            setTitle(initialNodes[0].title)
        }
    }, [draftId, drafts.length, initialNodes])

    const handleSave = async (currentId?: string, currentBody?: string, currentTitle?: string, currentRefs?: NodeReference[]) => {
        const id = currentId || draft?.id
        if (!id || isSaving) return

        setIsSaving(true)
        try {
            const updated = await updateDraft(id, {
                body: currentBody ?? body,
                title: currentTitle ?? title,
                node_references: currentRefs ?? nodeRefs
            })
            if (updated) setDraft(updated)
        } catch (err) {
            console.error('Save failed:', err)
        }
        setIsSaving(false)
    }

    const insertText = (text: string) => {
        const editor = editorRef.current?.getEditor()
        if (editor) {
            // Check if there is already text to decide on spacing
            const currentText = editor.getText()
            const prefix = currentText.length === 0 ? '' : '<p><br></p>'

            // Convert plain text to paragraphs
            const paragraphs = text.split('\n\n').map(p => `<p>${p}</p>`).join('')

            editor.chain().focus('end').insertContent(`${prefix}${paragraphs}`).run()
        } else {
            // Fallback for when the editor hasn't mounted
            setBody(prev => {
                const spacing = prev.length === 0 ? "" : (prev.endsWith('\n\n') ? "" : (prev.endsWith('\n') ? "\n" : "\n\n"))
                return prev + spacing + text
            })
        }
    }

    const handleDropNode = (data: any, plainText?: string) => {
        if (plainText) {
            insertText(plainText)
        }
        if (data && data.id && data.type) {
            setNodeRefs(prev => {
                const exists = prev.some(r => r.node_id === data.id)
                if (exists) return prev
                return [...prev, { node_id: data.id, node_type: data.type }]
            })
        }
    }

    const handleAIInsert = async (node: PolymorphicNode) => {
        if (isGenerating) return
        setIsGenerating(node.id)

        try {
            const res = await fetch('/api/ai/studio/synthesize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    node,
                    currentBody: body,
                    draftTitle: title
                })
            })

            const data = await res.json()
            if (data.text) {
                insertText(data.text)

                // Add to node references
                setNodeRefs(prev => {
                    const exists = prev.some(r => r.node_id === node.id)
                    if (exists) return prev
                    return [...prev, { node_id: node.id, node_type: node.node_type }]
                })
            }
        } catch (err) {
            console.error('AI synthesis failed:', err)
        } finally {
            setIsGenerating(null)
        }
    }

    const filteredLibrary = useMemo(() => {
        let list: PolymorphicNode[] = []
        if (libraryType === 'all' || libraryType === 'notes') {
            list = [...list, ...entries.filter(e => !e.is_archived).map(e => ({ ...e, node_type: 'entry' as const }))]
        }
        if (libraryType === 'all' || libraryType === 'projects') {
            list = [...list, ...projects.filter(p => !p.is_archived).map(p => ({ ...p, node_type: 'project' as const }))]
        }
        if (libraryType === 'all' || libraryType === 'content') {
            list = [...list, ...content.map(c => ({ ...c, node_type: 'content' as const }))]
        }

        if (librarySearch) {
            const q = librarySearch.toLowerCase()
            list = list.filter(n => n.title.toLowerCase().includes(q) || (n as any).body?.toLowerCase().includes(q) || (n as any).tagline?.toLowerCase().includes(q))
        }

        if (libraryFilter) {
            list = list.filter(n => (n as any).type === libraryFilter || (n as any).platform === libraryFilter)
        }

        return list
    }, [entries, projects, content, librarySearch, libraryType, libraryFilter])

    const projectTypes = useMemo(() => Array.from(new Set(projects.map(p => p.type).filter((t): t is ProjectType => !!t))), [projects])
    const contentPlatforms = useMemo(() => Array.from(new Set(content.map(c => (c as any).platform || (c as any).type).filter((p): p is string => !!p))), [content])

    const handleAnalyzeDraft = async () => {
        if (isAnalyzing || !body.trim()) return
        setIsAnalyzing(true)
        try {
            const res = await fetch('/api/ai/studio/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ body, title })
            })
            const data = await res.json()
            if (data.suggestion && data.insertable_text) {
                setAnalysis(data)
            }
        } catch (err) {
            console.error('Analysis failed:', err)
        } finally {
            setIsAnalyzing(false)
        }
    }

    // Auto-save logic
    useEffect(() => {
        const timer = setTimeout(() => {
            const hasBodyChanged = body !== (draft?.body || '')
            const hasTitleChanged = title !== (draft?.title || 'Untitled Draft')
            const hasRefsChanged = JSON.stringify(nodeRefs) !== JSON.stringify(draft?.node_references || [])

            if (hasBodyChanged || hasTitleChanged || hasRefsChanged) {
                handleSave(draft?.id, body, title, nodeRefs)
            }
        }, 1500)
        return () => clearTimeout(timer)
    }, [body, title, nodeRefs, draft?.id])

    // Final save on unmount or refresh
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (draft?.id) {
                // We use a simplified version for synchronous-ish unload if possible,
                // but usually handleSave is enough for normal navigation
                handleSave(draft.id, body, title, nodeRefs)
            }
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload)
            handleBeforeUnload()
        }
    }, [body, title, nodeRefs, draft?.id])

    return (
        <div className="fixed inset-0 bg-[#fafafa] z-[100] flex flex-col animate-in fade-in duration-300">
            {/* Header */}
            <header className="h-[72px] border-b border-black/[0.05] bg-white flex items-center justify-between px-6 shrink-0 z-20 shadow-sm relative">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-black/5 rounded-xl text-black/40 hover:text-black transition-all"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="hidden md:block">
                        <p className="text-[10px] font-bold text-black/25 uppercase tracking-widest">
                            {isSaving ? 'Saving...' : 'All changes saved'}
                        </p>
                    </div>
                </div>

                {/* Centered Draft Title (Read-only) */}
                <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none px-4 w-full max-w-[40%]">
                    <h2 className="text-[13px] font-bold text-black/80 tracking-tight truncate w-full text-center">
                        {title || 'Untitled Draft'}
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5">
                        <div className={cn("w-1.5 h-1.5 rounded-full", isSaving ? "bg-amber-400 animate-pulse" : "bg-emerald-400")} />
                        <span className="text-[9px] font-black text-black/20 uppercase tracking-[0.15em]">Studio Live</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex bg-black/[0.03] p-1.5 rounded-2xl border border-black/5 mr-4 gap-1.5">
                        <button
                            onClick={() => setShowScaffold(!showScaffold)}
                            className={cn(
                                "p-3 rounded-xl transition-all active:scale-90",
                                showScaffold ? "bg-white text-indigo-500 shadow-sm" : "text-black/30 hover:text-black/60"
                            )}
                            title="Toggle Scaffold"
                        >
                            <Layers className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setShowContext(!showContext)}
                            className={cn(
                                "p-3 rounded-xl transition-all active:scale-90",
                                showContext ? "bg-white text-indigo-500 shadow-sm" : "text-black/30 hover:text-black/60"
                            )}
                            title="Toggle Assistant"
                        >
                            <Sparkles className="w-5 h-5" />
                        </button>
                    </div>
                    <button
                        onClick={() => setIsPublishModalOpen(true)}
                        className="px-6 py-3 bg-black text-white rounded-2xl text-[12px] font-black uppercase tracking-widest shadow-xl hover:bg-black/80 transition-all active:scale-95 touch-manipulation"
                    >
                        Publish
                    </button>
                </div>
            </header>

            {/* Main Workspace */}
            <main className="flex-1 flex overflow-hidden relative">
                {/* Left: Research Scaffold */}
                <aside
                    className={cn(
                        "w-[340px] bg-white border-r border-black/[0.05] flex flex-col transition-all duration-300 overflow-hidden",
                        !showScaffold && "w-0 opacity-0"
                    )}
                >
                    <div className="flex border-b border-black/[0.03] shrink-0">
                        <button
                            onClick={() => setLeftTab('scaffold')}
                            className={cn(
                                "flex-1 py-4 text-[11px] font-black uppercase tracking-widest transition-all relative",
                                leftTab === 'scaffold' ? "text-indigo-600 bg-indigo-50/30" : "text-black/30 hover:text-black/50"
                            )}
                        >
                            Draft Research
                            {leftTab === 'scaffold' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500" />}
                        </button>
                        <button
                            onClick={() => setLeftTab('library')}
                            className={cn(
                                "flex-1 py-4 text-[11px] font-black uppercase tracking-widest transition-all relative",
                                leftTab === 'library' ? "text-indigo-600 bg-indigo-50/30" : "text-black/30 hover:text-black/50"
                            )}
                        >
                            Global Library
                            {leftTab === 'library' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500" />}
                        </button>
                    </div>

                    {leftTab === 'scaffold' ? (
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {initialNodes.map(node => {
                                const isAdded = draft?.node_references?.some(r => r.node_id === node.id)
                                return (
                                    <ResearchNodeCard
                                        key={node.id}
                                        node={node}
                                        isAdded={isAdded}
                                        onInsert={(text, data) => {
                                            insertText(text)
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
                                        insertImage={(url, title) => {
                                            const editor = editorRef.current?.getEditor()
                                            if (editor) editor.chain().focus().setImage({ src: url, alt: title }).run()
                                        }}
                                        onAIInsert={() => handleAIInsert(node)}
                                        isGenerating={isGenerating === node.id}
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
                    ) : (
                        <div className="flex-1 flex flex-col min-h-0 bg-[#fafafa]">
                            {/* Library Header: Search & Filter */}
                            <div className="p-4 space-y-3 bg-white border-b border-black/[0.03]">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/25" />
                                    <input
                                        value={librarySearch}
                                        onChange={e => setLibrarySearch(e.target.value)}
                                        placeholder="Search entire library..."
                                        className="w-full pl-9 pr-4 py-2 bg-black/[0.03] border border-black/[0.06] rounded-xl text-[12px] font-medium outline-none focus:border-indigo-500/30 transition-all"
                                    />
                                </div>
                                <div className="flex bg-black/[0.03] p-1 rounded-xl border border-black/5">
                                    {(['all', 'notes', 'projects', 'content'] as const).map(type => (
                                        <button
                                            key={type}
                                            onClick={() => { setLibraryType(type); setLibraryFilter(null) }}
                                            className={cn(
                                                "flex-1 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                                                libraryType === type ? "bg-white text-black shadow-sm" : "text-black/30 hover:text-black/60"
                                            )}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                                {(libraryType === 'projects' || libraryType === 'content') && (
                                    <div className="flex flex-wrap gap-1 pt-1">
                                        <button
                                            onClick={() => setLibraryFilter(null)}
                                            className={cn("px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter transition-all", !libraryFilter ? "bg-indigo-500 text-white" : "bg-black/[0.04] text-black/40 hover:bg-black/[0.08]")}
                                        >All</button>
                                        {(libraryType === 'projects' ? projectTypes : contentPlatforms).map(f => (
                                            <button key={f}
                                                onClick={() => setLibraryFilter(curr => curr === f ? null : f)}
                                                className={cn(
                                                    "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter transition-all",
                                                    libraryFilter === f ? "bg-black text-white" : "bg-black/[0.04] text-black/40 hover:bg-indigo-50 hover:text-indigo-600"
                                                )}
                                            >{f}</button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {filteredLibrary.map(node => {
                                    const isAdded = draft?.node_references?.some(r => r.node_id === node.id)
                                    return (
                                        <ResearchNodeCard
                                            key={node.id}
                                            node={node}
                                            isAdded={isAdded}
                                            onInsert={(text, data) => {
                                                insertText(text)
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
                                            insertImage={(url, title) => {
                                                const editor = editorRef.current?.getEditor()
                                                if (editor) editor.chain().focus().setImage({ src: url, alt: title }).run()
                                            }}
                                            onAIInsert={() => handleAIInsert(node)}
                                            isGenerating={isGenerating === node.id}
                                        />
                                    )
                                })}
                                {filteredLibrary.length === 0 && (
                                    <div className="py-12 px-4 text-center opacity-20">
                                        <Search className="w-10 h-10 mx-auto mb-3" />
                                        <p className="text-[12px] font-bold italic text-black/40 leading-relaxed">No items found matching your search.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </aside>

                {/* Center: Zen Editor */}
                <section className="flex-1 overflow-y-auto bg-white flex flex-col items-center relative">
                    <div className="w-full max-w-[720px] pb-[60vh] pt-[64px] px-8 flex flex-col">
                        {/* Title & Metadata Area */}
                        <div className="mb-12">
                            <textarea
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full text-[42px] font-black tracking-[-0.03em] text-black bg-transparent outline-none border-none placeholder:text-black/20 font-serif leading-tight mb-4 resize-none overflow-hidden"
                                placeholder="Draft Title"
                                rows={1}
                                onInput={(e) => {
                                    const target = e.target as HTMLTextAreaElement;
                                    target.style.height = 'auto';
                                    target.style.height = `${target.scrollHeight}px`;
                                }}
                                ref={(el) => {
                                    if (el) {
                                        el.style.height = 'auto';
                                        el.style.height = `${el.scrollHeight}px`;
                                    }
                                }}
                            />
                            <div className="flex items-center gap-3 text-[13px] font-medium text-black/40">
                                <span>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                                <span className="w-1 h-1 rounded-full bg-black/20" />
                                <span>{Math.ceil(body.split(' ').length / 200)} min read</span>
                            </div>
                        </div>

                        <ZenEditor
                            ref={editorRef}
                            content={body}
                            onChange={setBody}
                            onDropNode={handleDropNode}
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
                    <div className="flex-1 overflow-y-auto p-6 space-y-10">
                        <div>
                            <button
                                onClick={handleAnalyzeDraft}
                                disabled={isAnalyzing || !body.trim()}
                                className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-[12px] font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isAnalyzing ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Analyzing...</span>
                                    </>
                                ) : (
                                    <>
                                        <Wand2 className="w-3.5 h-3.5" />
                                        <span>Analyze Draft</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {analysis && (
                            <div className="bg-indigo-50/50 rounded-2xl border border-indigo-100/50 overflow-hidden animate-in slide-in-from-top-2 fade-in">
                                <div className="p-4 border-b border-indigo-100/30 flex items-center justify-between bg-white/40">
                                    <p className="text-[12px] font-bold text-indigo-600">AI Suggestion</p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handleAnalyzeDraft}
                                            className="text-[10px] font-black text-indigo-500 hover:text-indigo-600 uppercase tracking-widest transition-colors flex items-center gap-1"
                                            disabled={isAnalyzing}
                                        >
                                            Redo
                                        </button>
                                        <span className="w-1 h-1 rounded-full bg-black/10" />
                                        <button
                                            onClick={() => setAnalysis(null)}
                                            className="text-[10px] font-black text-black/20 hover:text-black/40 uppercase tracking-widest transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                                <div className="p-5">
                                    <p className="text-[12px] text-black/60 leading-relaxed italic mb-4">
                                        "{analysis.suggestion}"
                                    </p>

                                    <div className="mb-4">
                                        <p className="text-[10px] font-black text-black/30 uppercase tracking-widest mb-2">Suggested Text</p>
                                        <div className="bg-white/80 border border-indigo-100/30 rounded-xl p-3 max-h-[160px] overflow-y-auto text-[12px] text-black/70 leading-relaxed font-serif whitespace-pre-wrap">
                                            {analysis.insertable_text}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => {
                                            insertText(analysis.insertable_text)
                                            setAnalysis(null)
                                        }}
                                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/10 text-white rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
                                    >
                                        <Plus className="w-3 h-3" />
                                        Insert Suggestion
                                    </button>
                                </div>
                            </div>
                        )}
                        <div className="space-y-6 pt-6">
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

            {/* Modals */}
            <PublishModal
                isOpen={isPublishModalOpen}
                onClose={() => setIsPublishModalOpen(false)}
                title={title}
                htmlContent={body}
            />
        </div>
    )
}

function ResearchNodeCard({ node, onInsert, insertImage, onAIInsert, isAdded, isGenerating }: {
    node: PolymorphicNode;
    onInsert: (text: string, data: any) => void;
    insertImage: (url: string, title: string) => void;
    onAIInsert: () => void;
    isAdded?: boolean;
    isGenerating?: boolean;
}) {
    const [justInserted, setJustInserted] = useState(false)
    const [isDraggingThis, setIsDraggingThis] = useState(false)
    const [isExpanded, setIsExpanded] = useState(false)
    const startPosRef = useRef({ x: 0, y: 0 })
    const isDraggingRef = useRef(false)

    const typeLabel = node.node_type === 'entry' ? 'Note' : node.node_type === 'project' ? 'Project' : 'Content'
    const bodyContent = node.node_type === 'entry' ? (node as any).body : (node as any).tagline || (node as any).description || ''
    const coverImage = (node as any).cover_url || (node as any).images?.[0] || (
        node.node_type === 'project'
            ? `/api/studio/cover?title=${encodeURIComponent(node.title)}&tagline=${encodeURIComponent((node as any).tagline || '')}&type=project&id=${node.id}&w=600&h=400`
            : node.node_type === 'content'
                ? `/api/studio/cover?title=${encodeURIComponent(node.title)}&tagline=${encodeURIComponent((node as any).category || 'Content')}&type=content&id=${node.id}&w=600&h=400`
                : null
    )

    const handlePointerDown = (e: React.PointerEvent) => {
        if (e.button !== 0 && e.pointerType !== 'touch') return
        if ((e.target as HTMLElement).closest('button')) return

        startPosRef.current = { x: e.clientX, y: e.clientY }
        isDraggingRef.current = false

        let ghost: HTMLDivElement | null = null
        const typeLabel = node.node_type === 'entry' ? 'Note' : node.node_type === 'project' ? 'Project' : 'Content'
        const bodyContent = node.node_type === 'entry' ? (node as any).body : (node as any).tagline || (node as any).description || ''
        const data = { id: node.id, type: node.node_type }
        const textToInsert = `\n\n> [!${typeLabel}: ${node.title}]\n> ${bodyContent.replace(/\n/g, '\n> ')}\n\n`

        const handleMove = (ev: PointerEvent) => {
            const dx = ev.clientX - startPosRef.current.x
            const dy = ev.clientY - startPosRef.current.y
            if (!isDraggingRef.current && Math.sqrt(dx * dx + dy * dy) > 20) {
                isDraggingRef.current = true
                setIsDraggingThis(true)
                ghost = document.createElement('div')
                ghost.style.cssText = `position:fixed;pointer-events:none;z-index:9999;width:240px;background:white;border-radius:20px;box-shadow:0 24px 60px rgba(79,70,229,0.15),0 0 0 1px rgba(79,70,229,0.1);padding:16px;font-family:ui-sans-serif,system-ui,sans-serif;transform:rotate(-2deg) scale(0.95);opacity:0.96;`
                ghost.innerHTML = `<div style="font-size:12px;font-weight:900;color:#000;margin-bottom:4px;">${node.title}</div><div style="font-size:10px;font-weight:700;color:#4f46e5;text-transform:uppercase;letter-spacing:0.05em;">${typeLabel}</div>`
                document.body.appendChild(ghost)
            }
            if (isDraggingRef.current && ghost) {
                ghost.style.left = `${ev.clientX - 120}px`
                ghost.style.top = `${ev.clientY - 40}px`
            }
        }

        const handleUp = (ev: PointerEvent) => {
            window.removeEventListener('pointermove', handleMove)
            window.removeEventListener('pointerup', handleUp)
            if (ghost) { ghost.remove(); ghost = null }
            setIsDraggingThis(false)
            if (isDraggingRef.current) {
                const editorElement = document.getElementById('studio-zen-editor')
                if (editorElement) {
                    const rect = editorElement.getBoundingClientRect()
                    if (ev.clientX >= rect.left && ev.clientX <= rect.right && ev.clientY >= rect.top && ev.clientY <= rect.bottom) {
                        onInsert(textToInsert, data)
                    }
                }
                isDraggingRef.current = false
            }
        }
        window.addEventListener('pointermove', handleMove)
        window.addEventListener('pointerup', handleUp)
    }

    const handleClickInsert = (e: React.PointerEvent) => {
        e.stopPropagation()
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
            onPointerDown={handlePointerDown}
            className={cn(
                "p-4 border rounded-2xl group transition-all cursor-grab active:cursor-grabbing relative select-none touch-none",
                isDraggingThis ? "opacity-30 scale-95 border-indigo-300 shadow-none" :
                    isAdded || justInserted ? "bg-indigo-50/50 border-indigo-200 shadow-sm" :
                        "bg-black/[0.02] border-black/[0.05] hover:border-indigo-200 hover:bg-indigo-50/30",
                isExpanded && "shadow-md bg-white border-indigo-300/30 shadow-indigo-500/5 scale-[1.02] z-40"
            )}
            style={{ touchAction: 'none' }}
        >
            <div className="flex justify-between items-start gap-3 mb-1">
                <h4 className="text-[12px] font-black text-black leading-tight flex-1">{node.title}</h4>
                {coverImage && (
                    <button
                        onPointerDown={(e) => {
                            e.stopPropagation()
                            insertImage(coverImage, node.title)
                        }}
                        className="w-10 h-10 rounded-lg overflow-hidden border border-black/5 shrink-0 transition-transform active:scale-90 shadow-sm"
                        title="Quick Insert Image"
                    >
                        <img src={coverImage} alt="" className="w-full h-full object-cover" />
                    </button>
                )}
            </div>
            <p className={cn(
                "text-[10px] text-black/40 leading-relaxed font-medium transition-all duration-300",
                isExpanded ? "line-clamp-none opacity-80" : "line-clamp-2"
            )}>
                {node.node_type === 'entry' ? (node as any).body : (node as any).tagline || 'No description provided.'}
            </p>

            <div className="flex items-end justify-between mt-3">
                <div className="flex flex-col gap-0.5">
                    <span className={cn(
                        "text-[9px] font-black uppercase transition-all tracking-tight",
                        isAdded || justInserted ? "text-indigo-500" : "text-black/20"
                    )}>
                        {justInserted ? 'Added to draft' : isAdded ? 'Referenced' : ''}
                    </span>
                    <span className="text-[8px] font-bold text-black/10 uppercase tracking-widest">
                        {node.node_type}
                    </span>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-4">
                    <button
                        onPointerDown={(e) => {
                            e.stopPropagation()
                            setIsExpanded(!isExpanded)
                        }}
                        className={cn(
                            "w-11 h-11 bg-white border border-black/5 rounded-xl flex items-center justify-center text-black/20 hover:text-black/40 transition-all active:scale-90",
                            isExpanded && "text-indigo-500 border-indigo-100 bg-indigo-50/20"
                        )}
                        title={isExpanded ? "Collapse" : "Expand"}
                    >
                        {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>


                    <button
                        onPointerDown={(e) => {
                            e.stopPropagation()
                            onInsert(`\n\n${bodyContent}\n\n`, { id: node.id, type: node.node_type })
                            setJustInserted(true)
                            setTimeout(() => setJustInserted(false), 2000)
                        }}
                        className="w-11 h-11 bg-white border border-black/5 rounded-xl flex items-center justify-center text-blue-500 hover:bg-blue-50 hover:border-blue-100 transition-all active:scale-95"
                        title="Insert Text Only"
                    >
                        <FileText className="w-4 h-4" />
                    </button>

                    <button
                        onPointerDown={(e) => {
                            e.stopPropagation()
                            onAIInsert()
                        }}
                        disabled={isGenerating}
                        className={cn(
                            "w-11 h-11 rounded-xl flex items-center justify-center shadow-sm transition-all active:scale-95",
                            isGenerating ? "bg-indigo-50 border-indigo-100" : "bg-white border border-black/5 text-indigo-500 hover:bg-indigo-50 hover:border-indigo-100"
                        )}
                        title="Draft with AI"
                    >
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    </button>
                    <button
                        onPointerDown={handleClickInsert}
                        className={cn(
                            "w-11 h-11 rounded-xl flex items-center justify-center shadow-sm transition-all active:scale-95 z-30",
                            justInserted ? "bg-green-500 text-white border-green-500" : "bg-white border border-black/5 text-indigo-500 hover:bg-indigo-50 hover:border-indigo-100"
                        )}
                        title="Insert as Block"
                    >
                        {justInserted ? <Check className="w-4 h-4" /> : <Plus className="w-5 h-5" />}
                    </button>
                </div>
            </div>
        </div>
    )
}
