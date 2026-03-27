'use client'
import { useState, useMemo, useRef, useEffect } from 'react'
import { PenLine, Search, Pin, Plus, X, LayoutGrid, Network, Trash2, Archive, RotateCcw, Video, Rocket, ArrowUpRight, SlidersHorizontal, Zap, BookOpen, List, Shield, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import CanvasCard from './CanvasCard'
import CanvasEntryModal from './CanvasEntryModal'
import CreateMapModal from './CreateMapModal'
import CanvasWebView from './CanvasWebView'
import StudioComposer from './StudioComposer'
import ArticleCard from './ArticleCard'
import ProjectDetailModal from './ProjectDetailModal'
import ContentDetailModal from './ContentDetailModal'
import { useStudioContext } from '../context/StudioContext'
import { useCanvas } from '../hooks/useCanvas'
import { useDrafts } from '../hooks/useDrafts'
import { supabase } from '@/lib/supabase'
import { initiateTwitterAuth, handleTwitterCallback, postTweet } from '../services/twitter'
import type { StudioCanvasEntry, CanvasColor, StudioProject, StudioContent, CanvasMap, CanvasMapNode, CanvasConnection, PolymorphicNode, ProjectType, StudioDraft } from '../types/studio.types'

type ViewMode = 'board' | 'web'

export default function CanvasDashboard() {
    const {
        entries, connections, loading: canvasLoading,
        maps, currentMapId, setCurrentMapId, mapNodes,
        createEntry, updateEntry, updateNodePosition, deleteEntry, archiveEntry, togglePin,
        createConnection, deleteConnection,
        createMap, fetchMaps, addNodeToMap, deleteMapNode, deleteMap, archiveMap, renameMap,
        refresh: refreshCanvas
    } = useCanvas()

    const { projects, content, loading: studioLoading } = useStudioContext()
    const { drafts, createDraft, deleteDraft: deleteDraftData, archiveDraft: archiveDraftData, togglePin: toggleDraftPin, refresh: refreshDrafts } = useDrafts()

    const [viewMode, setViewMode] = useState<ViewMode>('board')
    const [boardTab, setBoardTab] = useState<'notes' | 'articles'>('notes')
    const [composingNodes, setComposingNodes] = useState<PolymorphicNode[] | null>(null)
    const [activeDraft, setActiveDraft] = useState<StudioDraft | null>(null)
    const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active')
    const [showArchivedMaps, setShowArchivedMaps] = useState(false)
    const [libraryTab, setLibraryTab] = useState<'canvas' | 'projects' | 'content'>('canvas')
    const [libraryCanvasType, setLibraryCanvasType] = useState<'notes' | 'articles'>('notes')
    const [selectedEntry, setSelectedEntry] = useState<StudioCanvasEntry | null>(null)
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
    const [selectedContentId, setSelectedContentId] = useState<string | null>(null)
    const [librarySort, setLibrarySort] = useState<'priority' | 'impact' | 'date'>('priority')
    const [libraryFilter, setLibraryFilter] = useState<string | null>(null)
    const [isImporting, setIsImporting] = useState(false)
    const [showBrowser, setShowBrowser] = useState(false)
    const [isNodeOverLibrary, setIsNodeOverLibrary] = useState(false)
    const [search, setSearch] = useState('')
    const [filterTag, setFilterTag] = useState<string | null>(null)
    const [pinnedFirst, setPinnedFirst] = useState(true)
    const [pinnedOnly, setPinnedOnly] = useState(false)
    const [quickTitle, setQuickTitle] = useState('')
    const [confirmAction, setConfirmAction] = useState<{
        type: 'delete_note' | 'archive_note' | 'delete_map' | 'archive_map' | 'rename_map' | 'delete_draft' | 'archive_draft',
        id: string,
        title: string
    } | null>(null)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [dragOverTab, setDragOverTab] = useState<'notes' | 'articles' | null>(null)

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 3000)
    }
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [renameValue, setRenameValue] = useState('')
    const [synthesisModalNodes, setSynthesisModalNodes] = useState<PolymorphicNode[] | null>(null)
    const [synthesisTitle, setSynthesisTitle] = useState('')
    const [isTwitterConnected, setIsTwitterConnected] = useState(false)
    const [isConnectingTwitter, setIsConnectingTwitter] = useState(false)
    const [isAuthorizingTwitter, setIsAuthorizingTwitter] = useState(false)
    const [tweetConfirmation, setTweetConfirmation] = useState<{ text: string; noteId?: string } | null>(null)
    const quickInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const el = document.getElementById('global-quick-action')
        if (el) {
            if (viewMode === 'web') el.style.visibility = 'hidden'
            else el.style.visibility = 'visible'
        }
        return () => { if (el) el.style.visibility = 'visible' }
    }, [viewMode])

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search)
        const code = urlParams.get('code')
        const state = urlParams.get('state')

        if (code && state) {
            setIsAuthorizingTwitter(true)
            handleTwitterCallback(code, state)
                .then(() => {
                    showToast('X Account Connected Successfully!')
                    setIsTwitterConnected(true)
                    setIsConnectingTwitter(false)
                    window.history.replaceState({}, document.title, window.location.pathname)
                })
                .catch(err => {
                    console.error('Twitter OAuth failed:', err)
                    showToast('X Connection Failed: ' + err.message, 'error')
                })
                .finally(() => setIsAuthorizingTwitter(false))
        } else {
            const saved = localStorage.getItem('schro_twitter_connected')
            if (saved === 'true') setIsTwitterConnected(true)
        }
    }, [])

    const handleConfirmTweet = async () => {
        if (!tweetConfirmation) return
        
        const { text, noteId } = tweetConfirmation
        setTweetConfirmation(null)
        
        try {
            if (noteId) {
                // For existing notes, update tags
                const entry = entries.find(e => e.id === noteId)
                if (entry) {
                    const currentTags = entry.tags || []
                    if (!currentTags.includes('tweeted')) {
                        await updateEntry(noteId, { tags: [...currentTags, 'tweeted'] })
                    }
                }
                await postTweet(text)
                showToast('Tweet Published Successfully!')
            } else {
                // For quick tweets, create a new note
                const entry = await createEntry({
                    title: text,
                    tags: ['tweeted'],
                    color: 'blue'
                })
                if (entry) {
                    setSelectedEntry(entry)
                    await postTweet(text)
                    showToast('Tweet Published Successfully!')
                }
            }
        } catch (err: any) {
            console.error('Failed to post tweet:', err)
            showToast('Failed to Tweet: ' + err.message, 'error')
        }
    }
    const handleTwitterConnect = async () => {
        try {
            await initiateTwitterAuth()
        } catch (err: any) {
            console.error('Auth initiation failed:', err)
            showToast('Failed to start X authorization', 'error')
        }
    }

    const [isCreateMapModalOpen, setIsCreateMapModalOpen] = useState(false)

    const convertNoteToArticle = async (noteId: string) => {
        const note = entries.find(e => e.id === noteId)
        if (!note) return

        try {
            // Prep images as HTML at the top
            let bodyWithImages = note.body || ''
            if (note.images && note.images.length > 0) {
                const imageHtml = note.images.map(url => `<p><img src="${url}" alt="Imported Image" /></p>`).join('')
                bodyWithImages = imageHtml + '<p><br></p>' + bodyWithImages
            }

            const draft = await createDraft({
                title: note.title,
                body: bodyWithImages,
                project_id: (note as any).project_id || undefined,
            })

            if (draft) {
                await deleteEntry(noteId)
                showToast('Converted Note to Article', 'success')
                refreshDrafts()
                refreshCanvas()
                setBoardTab('articles')
            }
        } catch (err) {
            console.error('Conversion failed:', err)
            showToast('Failed to convert', 'error')
        }
    }

    const convertArticleToNote = async (articleId: string) => {
        const draft = drafts.find(d => d.id === articleId)
        if (!draft) return

        try {
            // Extract images from HTML
            const imgRegex = /<img [^>]*src="([^"]*)"[^>]*>/g
            const images: string[] = []
            let match
            while ((match = imgRegex.exec(draft.body || '')) !== null) {
                if (match[1] && !images.includes(match[1])) images.push(match[1])
            }

            // Strip HTML for note body
            const plainBody = (draft.body || '')
                .replace(/<p><br><\/p>/g, '\n')
                .replace(/<\/p><p>/g, '\n')
                .replace(/<[^>]*>/g, '')
                .trim()

            const entry = await createEntry({
                title: draft.title,
                body: plainBody,
                images: images.length > 0 ? images : undefined,
                // Article to note conversion: notes don't have project_id currently
            })

            if (entry) {
                await deleteDraftData(articleId)
                showToast('Converted Article to Note', 'success')
                refreshCanvas()
                refreshDrafts()
                setBoardTab('notes')
            }
        } catch (err) {
            console.error('Conversion failed:', err)
            showToast('Failed to convert', 'error')
        }
    }

    useEffect(() => {
        const handleCardDrop = (e: any) => {
            const { id, type, clientX, clientY } = e.detail
            const element = document.elementFromPoint(clientX, clientY)
            const target = element?.closest('[data-conversion-target]')
            
            if (!target) return
            
            const targetTab = target.getAttribute('data-conversion-target')
            
            if (type === 'note' && targetTab === 'articles') {
                convertNoteToArticle(id)
            } else if (type === 'article' && targetTab === 'notes') {
                convertArticleToNote(id)
            }
        }

        window.addEventListener('studio-canvas-card-drop' as any, handleCardDrop)
        return () => window.removeEventListener('studio-canvas-card-drop' as any, handleCardDrop)
    }, [entries, drafts])

    useEffect(() => {
        const handleDrag = (e: any) => {
            setIsDragging(true)
            const { x, y } = e.detail
            const element = document.elementFromPoint(x, y)
            const target = element?.closest('[data-conversion-target]')
            setDragOverTab(target?.getAttribute('data-conversion-target') as any || null)
        }
        const handleDragEnd = () => {
            setIsDragging(false)
            setDragOverTab(null)
        }

        window.addEventListener('studio-canvas-card-drag' as any, handleDrag)
        window.addEventListener('studio-canvas-card-drag-end' as any, handleDragEnd)
        return () => {
            window.removeEventListener('studio-canvas-card-drag' as any, handleDrag)
            window.removeEventListener('studio-canvas-card-drag-end' as any, handleDragEnd)
        }
    }, [])

    const loading = studioLoading || canvasLoading

    useEffect(() => {
        refreshCanvas()
    }, [refreshCanvas])

    useEffect(() => {
        fetchMaps(showArchivedMaps)
    }, [fetchMaps, showArchivedMaps])

    const isBoard = viewMode === 'board'

    useEffect(() => {
        if (viewMode === 'board') quickInputRef.current?.focus()
    }, [viewMode])

    const allTags = useMemo(() => {
        const set = new Set<string>()
        entries.forEach(e => e.tags?.forEach(t => set.add(t)))
        return Array.from(set).sort()
    }, [entries])

    const filtered = useMemo(() => {
        let list = entries.filter(e => e.is_archived === (activeTab === 'archived') && !e.is_independent)
        if (search) {
            const q = search.toLowerCase()
            list = list.filter(e => e.title.toLowerCase().includes(q) || e.body?.toLowerCase().includes(q))
        }
        if (filterTag) list = list.filter(e => e.tags?.includes(filterTag))
        if (pinnedOnly) list = list.filter(e => e.pinned)
        else if (pinnedFirst && activeTab === 'active') list = [...list.filter(e => e.pinned), ...list.filter(e => !e.pinned)]
        return list
    }, [entries, search, filterTag, pinnedFirst, pinnedOnly, activeTab])

    const filteredDrafts = useMemo(() => {
        let list = drafts.filter(d => d.is_archived === (activeTab === 'archived'))
        if (search) {
            const q = search.toLowerCase()
            list = list.filter(d => d.title.toLowerCase().includes(q) || d.body?.toLowerCase().includes(q))
        }
        if (pinnedOnly) list = list.filter(d => d.pinned)
        else if (pinnedFirst && activeTab === 'active') list = [...list.filter(d => d.pinned), ...list.filter(d => !d.pinned)]
        return list
    }, [drafts, search, pinnedFirst, pinnedOnly, activeTab])

    const handleQuickCreate = async () => {
        if (!quickTitle.trim()) return
        if (boardTab === 'notes') {
            const entry = await createEntry({ title: quickTitle.trim() })
            if (entry) setSelectedEntry(entry)
        } else {
            const draft = await createDraft({ title: quickTitle.trim() })
            if (draft) setActiveDraft(draft)
        }
        setQuickTitle('')
    }

    const handleQuickTweet = async () => {
        if (!quickTitle.trim()) return
        
        if (!isTwitterConnected) {
            setIsConnectingTwitter(true)
            return
        }

        if (boardTab === 'notes') {
            setTweetConfirmation({ text: quickTitle.trim() })
            setQuickTitle('')
        }
    }


    const connectionDataMap = useMemo(() => {
        const map: Record<string, { notes: number; projects: { id: string; title: string }[]; content: { id: string; title: string }[] }> = {}

        connections.forEach(c => {
            const nodes = [c.from_id, c.to_id]
            nodes.forEach(id => {
                if (!map[id]) map[id] = { notes: 0, projects: [], content: [] }

                const otherId = id === c.from_id ? c.to_id : c.from_id

                // Identify target type
                const project = projects.find(p => p.id === otherId)
                if (project) {
                    if (!map[id].projects.find(p => p.id === project.id)) {
                        map[id].projects.push({ id: project.id, title: project.title })
                    }
                    return
                }

                const item = content.find(i => i.id === otherId)
                if (item) {
                    if (!map[id].content.find(i => i.id === item.id)) {
                        map[id].content.push({ id: item.id, title: item.title })
                    }
                    return
                }

                const entry = entries.find(e => e.id === otherId)
                if (entry) {
                    map[id].notes++
                }
            })
        })
        return map
    }, [connections, projects, content, entries])

    const entriesInMap = useMemo(() => {
        if (!currentMapId) return []
        return mapNodes.map(mn => {
            if (mn.entry_id) {
                const entry = entries.find(e => e.id === mn.entry_id && !e.is_archived)
                return entry ? { ...entry, web_x: mn.x, web_y: mn.y, node_type: 'entry' as const } : null
            }
            if (mn.project_id) {
                const project = projects.find(p => p.id === mn.project_id)
                return project ? { ...project, web_x: mn.x, web_y: mn.y, node_type: 'project' as const } : null
            }
            if (mn.content_id) {
                const c = content.find(item => item.id === mn.content_id)
                return c ? { ...c, web_x: mn.x, web_y: mn.y, node_type: 'content' as const } : null
            }
            return null
        }).filter(Boolean) as PolymorphicNode[]
    }, [mapNodes, entries, projects, content, currentMapId])

    const unmappedEntries = useMemo(() => {
        const mappedIds = new Set(mapNodes.map(m => m.entry_id))
        return entries.filter(e => !mappedIds.has(e.id) && !e.is_archived && !e.is_independent)
    }, [entries, mapNodes])

    const priorityWeight: Record<string, number> = { urgent: 4, high: 3, mid: 2, low: 1 }

    const unmappedProjects = useMemo(() => {
        const mappedIds = new Set(mapNodes.map(m => m.project_id))
        let list = projects.filter(p => !mappedIds.has(p.id) && !p.is_archived)
        if (libraryFilter) list = list.filter(p => p.type === libraryFilter)
        if (librarySort === 'priority') list = [...list].sort((a, b) => (priorityWeight[b.priority || 'low'] || 0) - (priorityWeight[a.priority || 'low'] || 0))
        else if (librarySort === 'impact') list = [...list].sort((a, b) => (b.impact_score || 0) - (a.impact_score || 0))
        return list
    }, [projects, mapNodes, librarySort, libraryFilter])

    const unmappedContent = useMemo(() => {
        const mappedIds = new Set(mapNodes.map(m => m.content_id))
        let list = content.filter(c => !mappedIds.has(c.id))
        if (libraryFilter) list = list.filter(c => (c as any).platform === libraryFilter || (c as any).type === libraryFilter)
        return list
    }, [content, mapNodes, libraryFilter])

    const projectTypes = useMemo(() => Array.from(new Set(projects.map(p => p.type).filter((t): t is ProjectType => !!t))), [projects])
    const contentPlatforms = useMemo(() => Array.from(new Set(content.map(c => (c as any).platform || (c as any).type).filter((p): p is string => !!p))), [content])

    const activeMap = useMemo(() => maps.find(m => m.id === currentMapId), [maps, currentMapId])

    const handleCompose = (nodes: PolymorphicNode[]) => {
        if (nodes.length === 0) return
        setSynthesisModalNodes(nodes)
        setSynthesisTitle(nodes[0].title || `Synthesis: ${nodes.length} Items`)
    }

    const handleCreateIdea = async () => {
        const entry = await createEntry({ title: 'New Idea', x: 400, y: 300, is_independent: true })
        if (entry) setSelectedEntry(entry)
    }

    const startComposition = async (nodes: PolymorphicNode[], title: string) => {
        const finalTitle = title || `Synthesis: ${nodes.length} Items`
        setSynthesisModalNodes(null)
        setSynthesisTitle('')

        const projectId = nodes.find(n => n.node_type === 'project')?.id

        try {
            const draft = await createDraft({ title: finalTitle, project_id: projectId })
            if (draft) {
                setComposingNodes(nodes)
                setActiveDraft(draft)
            } else {
                // Fallback for offline/DB error: create a mock draft object
                const mockDraft: StudioDraft = {
                    id: `temp-${Date.now()}`,
                    title: finalTitle,
                    project_id: projectId,
                    body: '',
                    node_references: nodes.map(n => ({ node_id: n.id, node_type: n.node_type })),
                    status: 'draft',
                    is_archived: false,
                    last_snapshot_at: new Date().toISOString(),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
                setComposingNodes(nodes)
                setActiveDraft(mockDraft)
                setSelectedIds([]) // Clear selection once starting
            }
        } catch (err) {
            console.error('Composition failed:', err)
            // Even if it throws, we try to open the composer with mock data
            const mockDraft: StudioDraft = {
                id: `error-${Date.now()}`,
                title: finalTitle,
                body: '',
                node_references: nodes.map(n => ({ node_id: n.id, node_type: n.node_type })),
                status: 'draft',
                is_archived: false,
                last_snapshot_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }
            setComposingNodes(nodes)
            setActiveDraft(mockDraft)
            setSelectedIds([]) // Clear selection once starting
        }
    }

    const handleCreateMap = async () => {
        setIsCreateMapModalOpen(true)
    }

    return (
        <div className="min-h-screen bg-[#fafafa] flex flex-col">
            {/* Composer Overlay */}
            {(activeDraft || composingNodes) && (
                <StudioComposer
                    draftId={activeDraft?.id}
                    initialDraft={activeDraft}
                    initialNodes={composingNodes || []}
                    onBack={() => {
                        setActiveDraft(null)
                        setComposingNodes(null)
                        // Refresh both notes and drafts to ensure titles/edits are reflected
                        refreshDrafts()
                        refreshCanvas()
                    }}
                />
            )}

            <CreateMapModal 
                isOpen={isCreateMapModalOpen} 
                onClose={() => setIsCreateMapModalOpen(false)} 
                onCreate={createMap} 
            />


            {/* Header */}
            <header className="px-6 md:px-10 py-8 md:py-10 border-b border-black/[0.06] bg-[#fafafa] shrink-0 z-30">
                <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="flex flex-col md:flex-row md:items-end gap-6 md:gap-10">
                        <div className="space-y-1">
                            <h2 className="text-[11px] font-black text-orange-500 uppercase tracking-[0.3em]">Creative Protocol</h2>
                            <h1 className="text-4xl font-black text-black tracking-tighter uppercase grayscale">Canvas</h1>
                        </div>

                        {viewMode === 'web' && (
                            <div className="flex items-center gap-3 self-start sm:self-auto mb-1">
                                <button
                                    onClick={() => setShowBrowser(!showBrowser)}
                                    className={cn(
                                        "flex items-center gap-2 px-4 h-[42px] rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border shrink-0",
                                        showBrowser ? "bg-black text-white border-black shadow-lg" : "bg-white text-black/50 border-black/[0.06] hover:border-black/20"
                                    )}
                                >
                                    <LayoutGrid className="w-3.5 h-3.5" />
                                    {showBrowser ? "Back to Canvas" : "All Maps"}
                                </button>
                                
                                {!showBrowser && (
                                    <>
                                        <div className="h-6 w-px bg-black/[0.06] mx-1 hidden sm:block" />
                                        <div className="flex items-center gap-2">
                                            <div className="relative">
                                                <select
                                                    value={currentMapId || ''}
                                                    onChange={e => { setCurrentMapId(e.target.value); setShowBrowser(false); setSelectedIds([]) }}
                                                    className="bg-black/[0.03] border border-black/[0.06] rounded-xl px-4 pr-10 h-[42px] text-[12px] font-bold outline-none focus:ring-2 ring-indigo-500/20 appearance-none cursor-pointer hover:border-black/10 transition-all shrink-0 min-w-[140px]"
                                                >
                                                    {maps.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                                    {maps.length === 0 && <option value="">No Mindmaps</option>}
                                                </select>
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-30">
                                                    <Network className="w-3.5 h-3.5" />
                                                </div>
                                            </div>
                                            <button 
                                                onClick={handleCreateMap} 
                                                className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 active:scale-95 shrink-0"
                                            >
                                                <Plus className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3 self-start sm:self-auto mb-1">
                        {/* View Archived Toggle for Board & Browser */}
                        {(viewMode === 'board' || (viewMode === 'web' && showBrowser)) && (
                            <button
                                onClick={() => {
                                    if (viewMode === 'board') {
                                        setActiveTab(activeTab === 'active' ? 'archived' : 'active')
                                    } else {
                                        setShowArchivedMaps(!showArchivedMaps)
                                    }
                                }}
                                className={cn(
                                    "flex items-center gap-2 px-4 h-[42px] rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border shrink-0",
                                    (viewMode === 'board' ? activeTab === 'archived' : showArchivedMaps)
                                        ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20"
                                        : "bg-black/[0.03] text-black/30 border-transparent hover:border-black/10 hover:text-black/60"
                                )}
                            >
                                <Shield className={cn("w-3.5 h-3.5", (viewMode === 'board' ? activeTab === 'archived' : showArchivedMaps) ? "text-white" : "text-black/20")} />
                                {(viewMode === 'board' ? activeTab === 'archived' : showArchivedMaps) ? 'Archives' : 'View Archives'}
                            </button>
                        )}


                        {/* View toggle */}
                        <div className="flex bg-black/[0.03] p-1.5 rounded-2xl border border-black/[0.05] items-center gap-0.5 h-[42px]">
                            {([
                                { label: 'Board', value: 'board' as const, icon: LayoutGrid },
                                { label: 'Node', value: 'web' as const, icon: Network },
                            ] as const).map(({ label, value, icon: Icon }) => (
                                <button
                                    key={value}
                                    onClick={() => { setViewMode(value); setSelectedIds([]) }}
                                    className={cn(
                                        "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-tight transition-all",
                                        viewMode === value ? 'bg-white text-black shadow-sm' : 'text-black/30 hover:text-black/60'
                                    )}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </header>

            {/* View Switching */}
            {viewMode === 'web' ? (
                <div className="flex-1 flex relative overflow-hidden" style={{ height: 'calc(100vh - 96px)' }}>
                    {showBrowser ? (
                        <div className="flex-1 bg-[#fafafa] overflow-y-auto p-8 sm:p-12 z-20">
                            <div className="max-w-6xl mx-auto">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
                                    <div>
                                        <h2 className="text-[32px] font-black text-black tracking-tight">Mindmap Browser</h2>
                                        <p className="text-[12px] text-black/35 mt-1 font-medium">Manage and explore your mindmaps</p>
                                    </div>
                                    <button
                                        onClick={handleCreateMap}
                                        className="flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-2xl font-black uppercase text-[11px] tracking-wider shadow-xl hover:bg-black/80 transition-all active:scale-95"
                                    >
                                        <Plus className="w-4 h-4" />
                                        New Mindmap
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {maps.map(map => {
                                        const nodeCount = mapNodes.filter(mn => mn.map_id === map.id).length
                                        const connCount = connections.filter(c => c.map_id === map.id).length
                                        const isActive = currentMapId === map.id

                                        return (
                                            <div
                                                onClick={() => { setCurrentMapId(map.id); setShowBrowser(false) }}
                                                key={map.id}
                                                className={cn(
                                                    "relative p-8 rounded-[32px] border border-black/[0.06] bg-white shadow-sm cursor-pointer overflow-hidden group hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300",
                                                    isActive && "border-indigo-500 ring-4 ring-indigo-500/10 shadow-indigo-500/10"
                                                )}
                                            >
                                                <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-all duration-500" />

                                                <div className="flex items-start justify-between mb-8 relative z-10">
                                                    <div className={cn(
                                                        "p-4 rounded-[20px] transition-all duration-500 group-hover:rotate-6",
                                                        isActive ? "bg-indigo-500 text-white shadow-lg shadow-indigo-200" : "bg-black/[0.04] text-black/40 group-hover:bg-indigo-50"
                                                    )}>
                                                        <Network className="w-6 h-6" />
                                                    </div>
                                                    <div className="flex items-center gap-1.5 opacity-20 group-hover:opacity-100 transition-all duration-300">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setRenameValue(map.name);
                                                                setConfirmAction({ type: 'rename_map', id: map.id, title: map.name })
                                                            }}
                                                            className="p-2.5 hover:bg-black/5 rounded-xl text-black/40 hover:text-black hover:scale-110 active:scale-95 transition-all"
                                                            title="Rename"
                                                        >
                                                            <PenLine className="w-4 h-4" />
                                                        </button>
                                                        {!showArchivedMaps ? (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setConfirmAction({ type: 'archive_map', id: map.id, title: map.name })
                                                                }}
                                                                className="p-2.5 rounded-xl text-black/40 hover:text-white hover:bg-amber-500 hover:scale-110 active:scale-95 transition-all shadow-sm hover:shadow-amber-500/20"
                                                                title="Archive"
                                                            >
                                                                <Archive className="w-4 h-4" />
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    supabase.from('studio_canvas_maps').update({ is_archived: false }).eq('id', map.id).then(() => fetchMaps(true))
                                                                }}
                                                                className="p-2.5 rounded-xl text-black/40 hover:text-white hover:bg-emerald-500 hover:scale-110 active:scale-95 transition-all shadow-sm hover:shadow-emerald-500/20"
                                                                title="Restore"
                                                            >
                                                                <RotateCcw className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setConfirmAction({ type: 'delete_map', id: map.id, title: map.name })
                                                            }}
                                                            className="p-2.5 rounded-xl text-black/40 hover:text-white hover:bg-red-500 hover:scale-110 active:scale-95 transition-all shadow-sm hover:shadow-red-500/20"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="relative z-10">
                                                    <h3 className="text-[19px] font-black text-black tracking-tight mb-1 group-hover:text-indigo-600 transition-colors">{map.name}</h3>
                                                    <div className="flex items-center gap-2 mb-6">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-black/10" />
                                                        <p className="text-[10px] text-black/30 font-black uppercase tracking-widest">
                                                            Last Edit {new Date(map.updated_at || map.created_at).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="mt-auto pt-6 border-t border-black/[0.04] flex items-center justify-between relative z-10">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex flex-col">
                                                            <span className="text-[13px] font-black text-black">{nodeCount}</span>
                                                            <span className="text-[9px] font-black uppercase tracking-tighter text-black/25">Nodes</span>
                                                        </div>
                                                        <div className="w-px h-6 bg-black/[0.06]" />
                                                        <div className="flex flex-col">
                                                            <span className="text-[13px] font-black text-black">{connCount}</span>
                                                            <span className="text-[9px] font-black uppercase tracking-tighter text-black/25">Conns</span>
                                                        </div>
                                                    </div>
                                                    <div className={cn(
                                                        "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                                                        isActive
                                                            ? "bg-indigo-500 text-white shadow-lg shadow-indigo-200"
                                                            : "bg-black/[0.05] text-black/30 group-hover:bg-indigo-50 group-hover:text-indigo-500"
                                                    )}>
                                                        {isActive ? "Viewing" : "Open Map"}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}

                                    {!showArchivedMaps && (
                                        <button
                                            onClick={handleCreateMap}
                                            className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-black/[0.06] rounded-[32px] hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group group-hover:-translate-y-1 duration-300"
                                        >
                                            <div className="w-12 h-12 bg-black/[0.03] rounded-2xl flex items-center justify-center mb-4 group-hover:bg-indigo-100 group-hover:text-indigo-500 transition-all">
                                                <Plus className="w-6 h-6 text-black/20 group-hover:text-indigo-500" />
                                            </div>
                                            <p className="text-[14px] font-black text-black/30 group-hover:text-indigo-600">Create New Map</p>
                                        </button>
                                    )}
                                </div>
                            </div >
                        </div >
                    ) : (
                        <>
                            {isImporting && (
                                <div className={cn(
                                    "w-72 bg-white border-r border-black/[0.06] flex flex-col z-20 animate-in slide-in-from-left duration-300 shadow-2xl transition-all",
                                    isNodeOverLibrary && "ring-4 ring-indigo-500/20 bg-indigo-50/5 border-indigo-200"
                                )}>
                                    <div className="px-6 py-5 border-b border-black/[0.05] flex items-center justify-between shrink-0">
                                        <div>
                                            <h3 className="text-[13px] font-black uppercase tracking-wider text-black">Concept Library</h3>
                                            <p className="text-[10px] text-black/30 font-medium">Add items to this map</p>
                                        </div>
                                        <button onClick={() => setIsImporting(false)} className="p-1.5 hover:bg-black/5 rounded-xl transition-colors text-black/20">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="flex border-b border-black/[0.05]">
                                        {(['canvas', 'projects', 'content'] as const).map(tab => (
                                            <button
                                                key={tab}
                                                onClick={() => setLibraryTab(tab)}
                                                className={cn(
                                                    "flex-1 py-3 text-[10px] font-black uppercase tracking-tighter transition-all",
                                                    libraryTab === tab ? "text-indigo-600 bg-indigo-50/50 border-b-2 border-indigo-600" : "text-black/30 hover:text-black/50"
                                                )}
                                            >
                                                {tab === 'canvas' ? 'Canvas' : tab}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Sub-toggle for Canvas tab: Notes vs Articles */}
                                    {libraryTab === 'canvas' && (
                                        <div className="px-4 py-2 border-b border-black/[0.03] bg-black/[0.01]">
                                            <div className="flex bg-black/[0.03] p-1 rounded-xl border border-black/5">
                                                {(['notes', 'articles'] as const).map(type => (
                                                    <button
                                                        key={type}
                                                        onClick={() => setLibraryCanvasType(type)}
                                                        className={cn(
                                                            "flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                                                            libraryCanvasType === type ? "bg-white text-black shadow-sm" : "text-black/30 hover:text-black/60"
                                                        )}
                                                    >
                                                        {type}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex-1 overflow-y-auto p-4 space-y-2 pb-12">
                                        {/* Sort/Filter bar for projects & content */}
                                        {(libraryTab === 'projects' || libraryTab === 'content') && (
                                            <div className="space-y-2 pb-2">
                                                {/* Sort */}
                                                <div className="flex items-center gap-1.5 p-1 bg-black/[0.03] rounded-xl border border-black/5">
                                                    {(['priority', 'impact', 'date'] as const).map(mode => (
                                                        libraryTab === 'projects' ? (
                                                            <button
                                                                key={mode}
                                                                onClick={() => setLibrarySort(mode)}
                                                                className={cn(
                                                                    "flex-1 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                                                                    librarySort === mode ? "bg-white text-black shadow-sm" : "text-black/30 hover:text-black/60"
                                                                )}
                                                            >{mode}</button>
                                                        ) : null
                                                    ))}
                                                    {libraryTab === 'content' && (
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-black/30 flex-1 text-center">Filter by platform</span>
                                                    )}
                                                </div>
                                                {/* Filter chips */}
                                                {libraryTab === 'projects' && projectTypes.length > 0 && (
                                                    <div className="flex flex-wrap gap-1">
                                                        <button
                                                            onClick={() => setLibraryFilter(null)}
                                                            className={cn("px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter transition-all", !libraryFilter ? "bg-indigo-500 text-white" : "bg-black/[0.04] text-black/40 hover:bg-black/[0.08]")}
                                                        >All</button>
                                                        {projectTypes.map(t => (
                                                            <button key={t}
                                                                onClick={() => setLibraryFilter(f => f === t ? null : t as string)}
                                                                className={cn("px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter transition-all", libraryFilter === t ? "bg-orange-500 text-white" : "bg-black/[0.04] text-black/40 hover:bg-orange-50 hover:text-orange-600")}
                                                            >{t}</button>
                                                        ))}
                                                    </div>
                                                )}
                                                {libraryTab === 'content' && contentPlatforms.length > 0 && (
                                                    <div className="flex flex-wrap gap-1">
                                                        <button
                                                            onClick={() => setLibraryFilter(null)}
                                                            className={cn("px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter transition-all", !libraryFilter ? "bg-indigo-500 text-white" : "bg-black/[0.04] text-black/40 hover:bg-black/[0.08]")}
                                                        >All</button>
                                                        {contentPlatforms.map(p => (
                                                            <button key={p}
                                                                onClick={() => setLibraryFilter(f => f === p ? null : p)}
                                                                className={cn("px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter transition-all", libraryFilter === p ? "bg-blue-500 text-white" : "bg-black/[0.04] text-black/40 hover:bg-blue-50 hover:text-blue-600")}
                                                            >{p}</button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {libraryTab === 'canvas' && (
                                            libraryCanvasType === 'notes' ? (
                                                unmappedEntries.length === 0 ? (
                                                    <EmptyLibrary message="No unmapped ideas" />
                                                ) : (
                                                    unmappedEntries.map(e => (
                                                        <LibraryItem key={e.id} id={e.id} type="entry" title={e.title} onClick={() => addNodeToMap(e.id, 'entry' as const)} />
                                                    ))
                                                )
                                            ) : (
                                                drafts.filter(d => !mapNodes.some(m => m.entry_id === d.id)).length === 0 ? (
                                                    <EmptyLibrary message="No unmapped articles" />
                                                ) : (
                                                    drafts.filter(d => !mapNodes.some(m => m.entry_id === d.id)).map(d => (
                                                        <LibraryItem key={d.id} id={d.id} type="content" title={d.title} onClick={() => addNodeToMap(d.id, 'content' as const)} />
                                                    ))
                                                )
                                            )
                                        )}
                                        {libraryTab === 'projects' && (
                                            unmappedProjects.length === 0 ? (
                                                <EmptyLibrary message="No unmapped projects" />
                                            ) : (
                                                unmappedProjects.map(p => (
                                                    <LibraryItem key={p.id} id={p.id} title={p.title} type="project" onClick={() => addNodeToMap(p.id, 'project' as const)} />
                                                ))
                                            )
                                        )}
                                        {libraryTab === 'content' && (
                                            unmappedContent.length === 0 ? (
                                                <EmptyLibrary message="No unmapped content" />
                                            ) : (
                                                unmappedContent.map(c => (
                                                    <LibraryItem key={c.id} id={c.id} title={c.title} type="content" onClick={() => addNodeToMap(c.id, 'content' as const)} />
                                                ))
                                            )
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="flex-1 flex flex-col min-h-0 bg-[#f7f7f7] relative">
                                {currentMapId ? (
                                    <>
                                        <div className="absolute top-6 left-6 z-30 flex flex-col gap-2">
                                            <button
                                                onClick={() => setIsImporting(!isImporting)}
                                                className={cn(
                                                    "w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl transition-all active:scale-90 border group",
                                                    isImporting
                                                        ? "bg-indigo-600 text-white border-indigo-700"
                                                        : "bg-white text-black/40 border-black/[0.08] hover:border-indigo-200 hover:text-indigo-600"
                                                )}
                                                title={isImporting ? "Close Library" : "Import Node (Quick Add)"}
                                            >
                                                <LayoutGrid className={cn("w-5 h-5 transition-transform group-hover:scale-110", isImporting && "rotate-90")} />
                                            </button>
                                        </div>

                                        <CanvasWebView
                                            entries={entriesInMap}
                                            connections={connections}
                                            isLibraryOpen={isImporting}
                                            onOverLibraryChange={setIsNodeOverLibrary}
                                            onComposeSelection={() => {
                                                const id = selectedIds[0]
                                                if (id) {
                                                    const inMap = entriesInMap.find(e => e.id === id)
                                                    const node = inMap || entries.find(e => e.id === id) || projects.find(p => p.id === id) || content.find(c => c.id === id)
                                                    if (node) handleCompose([node as PolymorphicNode])
                                                }
                                            }}
                                            onNodeClick={(node) => {
                                                if (node.node_type === 'entry') {
                                                    setSelectedEntry(node as StudioCanvasEntry)
                                                } else if (node.node_type === 'project') {
                                                    setSelectedProjectId(node.id)
                                                } else if (node.node_type === 'content') {
                                                    setSelectedContentId(node.id)
                                                }
                                            }}
                                            onCreateConnection={createConnection}
                                            onDeleteConnection={deleteConnection}
                                            onUpdatePosition={updateNodePosition}
                                            onDeleteNode={(id) => setConfirmAction({ type: 'delete_note', id, title: 'Note' })}
                                            onRemoveNode={deleteMapNode}
                                            onDropNode={addNodeToMap}
                                            onArchiveNode={(id) => setConfirmAction({ type: 'archive_note', id, title: 'Note' })}
                                            onCreateNode={async (data) => {
                                                const entry = await createEntry({ ...data, is_independent: true })
                                                if (entry) setSelectedEntry(entry)
                                            }}
                                            onToggleIndependent={(id) => updateEntry(id, { is_independent: false })}
                                            onCompose={handleCompose}
                                            selectedIds={selectedIds}
                                            onSelectionChange={setSelectedIds}
                                        />
                                    </>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center gap-4">
                                        <div className="p-10 bg-white border border-black/[0.05] rounded-[48px] shadow-2xl shadow-black/5 text-center max-w-sm">
                                            <div className="w-20 h-20 bg-indigo-50 rounded-[28px] flex items-center justify-center mx-auto mb-8 shadow-inner">
                                                <Network className="w-10 h-10 text-indigo-500" />
                                            </div>
                                            <h3 className="text-2xl font-black text-black tracking-tight mb-2">Build Your Universe</h3>
                                            <p className="text-[14px] text-black/40 font-medium leading-relaxed mb-8">
                                                Each mindmap is an independent dimension of thought. Start your first session now.
                                            </p>
                                            <button
                                                onClick={handleCreateMap}
                                                className="w-full py-4 bg-indigo-500 text-white rounded-[24px] font-black uppercase text-[12px] tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-600 hover:-translate-y-1 transition-all active:translate-y-0 active:scale-95"
                                            >
                                                Create First Mindmap
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div >
            ) : (
                <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
                    <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-20 flex-1 flex flex-col gap-6">
                        {/* Tab Toggle (Only for Board View) */}
                        {viewMode === 'board' && activeTab === 'active' && (
                            <div className="flex items-center justify-between">
                                <div className="flex bg-black/[0.03] p-1 rounded-2xl border border-black/[0.04] items-center gap-0.5">
                                    {([
                                        { label: 'Notes', value: 'notes' as const, icon: List },
                                        { label: 'Articles', value: 'articles' as const, icon: BookOpen },
                                    ] as const).map(({ label, value, icon: Icon }) => (
                                        <button
                                            key={value}
                                            onClick={() => setBoardTab(value)}
                                            data-conversion-target={value}
                                            className={cn(
                                                "flex items-center gap-2 px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-tight transition-all relative group/tab",
                                                boardTab === value
                                                    ? 'bg-white text-black shadow-lg shadow-black/5'
                                                    : 'text-black/30 hover:text-black/60 hover:bg-black/[0.02]',
                                                dragOverTab === value && "bg-indigo-50 text-indigo-600 z-20 shadow-xl shadow-indigo-500/20"
                                            )}
                                        >
                                            <div className="absolute inset-0 rounded-xl border-2 border-dashed border-indigo-500/0 group-hover/tab:border-indigo-500/20 transition-all pointer-events-none" />
                                            <Icon className="w-3.5 h-3.5" />
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Quick Capture Bar */}
                        {activeTab === 'active' && (
                            <div className={cn(
                                "flex items-center gap-3 bg-white border border-black/[0.07] rounded-2xl px-4 h-[60px] shadow-sm hover:border-black/10 transition-all focus-within:border-orange-200 focus-within:shadow-orange-500/5 relative",
                                isDragging && "select-none pointer-events-none opacity-50 grayscale"
                            )}>
                                <PenLine className="w-4 h-4 text-black/25 shrink-0" />
                                <input
                                    ref={quickInputRef}
                                    value={quickTitle}
                                    onChange={e => setQuickTitle(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleQuickCreate() }}
                                    placeholder="Capture an idea... press Enter to save"
                                    className="flex-1 text-[14px] font-medium text-black bg-transparent outline-none placeholder:text-black/25"
                                />
                                <div className="flex items-center gap-1.5 shrink-0">
                                    {boardTab === 'notes' && (
                                        <button
                                            onClick={handleQuickTweet}
                                            disabled={!quickTitle.trim()}
                                            className={cn(
                                                "flex items-center gap-1.5 flex-shrink-0 px-4 py-1.5 text-[11px] font-black rounded-xl transition-all border",
                                                quickTitle.trim()
                                                    ? isTwitterConnected 
                                                        ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20"
                                                        : "bg-white text-blue-600 border-blue-200 hover:bg-blue-50"
                                                    : "bg-black/[0.02] text-black/20 border-transparent cursor-not-allowed"
                                            )}
                                        >
                                            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                                            {isTwitterConnected ? 'Tweet' : 'Connect X'}
                                        </button>
                                    )}
                                    {quickTitle && (
                                        <button onClick={handleQuickCreate} className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white text-[11px] font-black rounded-xl hover:bg-black/80 transition-all">
                                            <Plus className="w-3.5 h-3.5" />
                                            Save
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Filter row */}
                        <div className={cn("flex items-center gap-4 flex-wrap", isDragging && "select-none pointer-events-none")}>
                            <div className="relative flex-1 min-w-[180px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/25" />
                                <input
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search ideas..."
                                    className="w-full pl-9 pr-4 py-2 bg-white border border-black/[0.06] rounded-xl text-[12px] font-medium text-black outline-none focus:border-black/20 transition-all"
                                />
                            </div>
                            {allTags.length > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    {allTags.slice(0, 8).map(tag => (
                                        <button
                                            key={tag}
                                            onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                                            className={cn(
                                                "text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all",
                                                filterTag === tag
                                                    ? 'bg-black text-white border-black'
                                                    : 'bg-white text-black/50 border-black/[0.08] hover:border-black/20'
                                            )}
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                    {filterTag && (
                                        <button onClick={() => setFilterTag(null)} className="w-6 h-6 flex items-center justify-center rounded-full bg-black/[0.05] text-black/40 hover:bg-black/10 transition-all">
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            )}
                            <button
                                onClick={() => setPinnedFirst(p => !p)}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all",
                                    pinnedFirst
                                        ? 'bg-black/[0.1] text-black/70 border-black/10'
                                        : 'bg-white text-black/40 border-black/[0.06] hover:border-black/15'
                                )}
                            >
                                <Pin className="w-3 h-3" />
                                Pinned first
                            </button>
                            <button
                                onClick={() => setPinnedOnly(!pinnedOnly)}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all",
                                    pinnedOnly
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20'
                                        : 'bg-white text-black/40 border-black/[0.06] hover:border-black/15'
                                )}
                            >
                                <Pin className={cn("w-3 h-3", pinnedOnly && "fill-current")} />
                                Pinned only
                            </button>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-4 text-[11px] text-black/30 font-medium">
                            {boardTab === 'notes' ? (
                                <>
                                    <span>{entries.length} {entries.length === 1 ? 'idea' : 'ideas'}</span>
                                    {entries.filter(e => e.pinned).length > 0 && (
                                        <span>· {entries.filter(e => e.pinned).length} pinned</span>
                                    )}
                                </>
                            ) : (
                                <>
                                    <span>{drafts.length} {drafts.length === 1 ? 'article' : 'articles'}</span>
                                    {drafts.filter(d => d.pinned).length > 0 && (
                                        <span>· {drafts.filter(d => d.pinned).length} pinned</span>
                                    )}
                                </>
                            )}
                            {connections.length > 0 && <span>· {connections.length} connection{connections.length !== 1 ? 's' : ''}</span>}
                        </div>

                        {/* Grid */}
                        {loading ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                {[...Array(8)].map((_, i) => (
                                    <div key={i} className="h-32 bg-black/[0.02] rounded-2xl animate-pulse" />
                                ))}
                            </div>
                        ) : boardTab === 'notes' ? (
                            filtered.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-24 gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-black/[0.03] flex items-center justify-center">
                                        <PenLine className="w-5 h-5 text-black/20" />
                                    </div>
                                    <p className="text-[13px] font-bold text-black/20">
                                        {search || filterTag ? 'No matching ideas' : 'Your canvas is empty'}
                                    </p>
                                </div>
                            ) : (
                                <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3">
                                    {filtered.map(entry => (
                                        <div key={entry.id} className="break-inside-avoid mb-3">
                                            <CanvasCard
                                                entry={entry}
                                                connections={connectionDataMap[entry.id]}
                                                onClick={() => setSelectedEntry(entry)}
                                                onPin={() => togglePin(entry.id, entry.pinned)}
                                                onArchive={() => setConfirmAction({ type: 'archive_note', id: entry.id, title: entry.title })}
                                                onDelete={() => setConfirmAction({ type: 'delete_note', id: entry.id, title: entry.title })}
                                                onColorChange={(c) => updateEntry(entry.id, { color: c })}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )
                        ) : (
                            filteredDrafts.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-24 gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-black/[0.03] flex items-center justify-center">
                                        <BookOpen className="w-5 h-5 text-black/20" />
                                    </div>
                                    <p className="text-[13px] font-bold text-black/20">
                                        {search ? 'No matching articles' : 'No articles found'}
                                    </p>
                                </div>
                            ) : (
                                <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3">
                                    {filteredDrafts.map(draft => (
                                        <div key={draft.id} className="break-inside-avoid mb-3">
                                            <ArticleCard
                                                draft={draft}
                                                onClick={() => setActiveDraft(draft)}
                                                onPin={() => toggleDraftPin(draft.id, !!draft.pinned)}
                                                onDelete={() => setConfirmAction({ type: 'delete_draft', id: draft.id, title: draft.title })}
                                                onArchive={() => setConfirmAction({ type: 'archive_draft', id: draft.id, title: draft.title })}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )
                        )}
                    </main>
                </div>
            )}

            {/* Detail Modal */}
            {/* X Connection Modal */}
            {isConnectingTwitter && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setIsConnectingTwitter(false)}>
                    <div className="bg-white rounded-[40px] p-10 max-w-[420px] w-full shadow-2xl border border-black/5 animate-in zoom-in-95 duration-200 overflow-hidden relative" onClick={e => e.stopPropagation()}>
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 via-blue-600 to-black" />
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl" />
                        
                        <div className="relative z-10 flex flex-col items-center text-center">
                            <div className="w-20 h-20 bg-black text-white rounded-[24px] flex items-center justify-center mb-8 shadow-2xl shadow-blue-500/20 active:scale-95 transition-all">
                                <svg viewBox="0 0 24 24" className="w-10 h-10 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                            </div>

                            <h3 className="text-[24px] font-black tracking-tighter text-black mb-3 italic">Connect your X Profile</h3>
                            <p className="text-[14px] text-black/40 font-medium leading-relaxed mb-10">
                                Link your account to push ideas directly from your Canvas to the world. Schro handles the formatting and social protocol.
                            </p>

                            <div className="w-full space-y-3">
                                <button
                                    onClick={handleTwitterConnect}
                                    disabled={isAuthorizingTwitter}
                                    className={cn(
                                        "w-full py-4 bg-black text-white rounded-[22px] font-black text-[12px] uppercase tracking-[0.2em] shadow-xl hover:bg-neutral-800 hover:-translate-y-1 transition-all active:translate-y-0 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed",
                                        isAuthorizingTwitter && "bg-neutral-800"
                                    )}
                                >
                                    {isAuthorizingTwitter ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Authenticating...
                                        </>
                                    ) : (
                                        <>
                                            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                                            Authorize with X
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => setIsConnectingTwitter(false)}
                                    className="w-full py-4 text-[11px] font-black uppercase tracking-widest text-black/30 hover:text-black/50 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>

                            <div className="mt-8 pt-8 border-t border-black/[0.04] w-full">
                                <p className="text-[10px] text-black/20 font-bold uppercase tracking-widest">Safe & Encryption Secure</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tweet Confirmation Modal */}
            {tweetConfirmation && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setTweetConfirmation(null)}></div>
                    <div className="relative w-full max-w-md bg-[#0A0A0B] border border-white/10 rounded-[30px] p-8 shadow-2xl overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[80px] -mr-16 -mt-16 pointer-events-none" />
                        
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-black border border-white/10 flex items-center justify-center">
                                <Zap className="w-6 h-6 text-blue-400 fill-current" />
                            </div>
                            <div>
                                <h3 className="font-black text-[18px] uppercase tracking-[0.1em] text-white">Broadcast to X</h3>
                                <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Review your transmission</p>
                            </div>
                        </div>

                        <div className="bg-black/40 border border-white/5 rounded-2xl p-6 mb-8 relative">
                            <textarea
                                value={tweetConfirmation.text}
                                onChange={e => setTweetConfirmation({ ...tweetConfirmation, text: e.target.value })}
                                className="w-full bg-transparent border-none outline-none text-[15px] leading-relaxed text-white font-medium italic resize-none min-h-[100px] placeholder:text-white/20"
                                placeholder="Your broadcast..."
                            />
                            <div className="absolute bottom-2 right-4 flex items-center gap-1">
                                <span className={cn(
                                    "text-[9px] font-black tracking-widest uppercase",
                                    tweetConfirmation.text.length > 280 ? "text-red-400" : "text-white/20"
                                )}>
                                    {tweetConfirmation.text.length}/280
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button 
                                onClick={() => setTweetConfirmation(null)}
                                className="flex-1 px-6 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all font-black text-[10px] uppercase tracking-widest text-white/60 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleConfirmTweet}
                                disabled={tweetConfirmation.text.length > 280}
                                className="flex-[2] px-6 py-4 rounded-2xl bg-blue-500 hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_30px_-5px_rgba(59,130,246,0.5)] transition-all font-black text-[10px] uppercase tracking-[0.2em] text-white"
                            >
                                Launch Tweet
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toast && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[2000] animate-in slide-in-from-bottom-5 duration-300">
                    <div className={cn(
                        "px-6 py-4 rounded-[20px] shadow-2xl flex items-center gap-3 border backdrop-blur-md",
                        toast.type === 'success' 
                            ? "bg-black text-white border-white/10" 
                            : "bg-red-500 text-white border-red-400/20"
                    )}>
                        {toast.type === 'success' ? (
                            <Zap className="w-5 h-5 text-blue-400 fill-current" />
                        ) : (
                            <X className="w-5 h-5" />
                        )}
                        <span className="font-black text-[12px] uppercase tracking-[0.1em]">{toast.message}</span>
                    </div>
                </div>
            )}

            <CanvasEntryModal
                entry={selectedEntry}
                isOpen={!!selectedEntry}
                onClose={() => setSelectedEntry(null)}
                onUpdate={(id, upd) => { updateEntry(id, upd); setSelectedEntry(prev => prev ? { ...prev, ...upd } : prev) }}
                onDelete={(id) => setConfirmAction({ type: 'delete_note', id, title: selectedEntry?.title || '' })}
                onArchive={(id) => setConfirmAction({ type: 'archive_note', id, title: selectedEntry?.title || '' })}
                connections={selectedEntry ? connectionDataMap[selectedEntry.id] : undefined}
                onAddLink={createConnection}
                onRemoveLink={(entryId, targetId) => {
                    const conn = connections.find(c => (c.from_id === entryId && c.to_id === targetId) || (c.from_id === targetId && c.to_id === entryId))
                    if (conn) deleteConnection(conn.id)
                }}
                allTags={allTags}
                onTweet={(id: string, title: string) => {
                    if (!isTwitterConnected) {
                        setIsConnectingTwitter(true)
                        return
                    }
                    setTweetConfirmation({ text: title, noteId: id })
                }}
            />

            {/* Global Confirmation Modal */}
            {
                confirmAction && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setConfirmAction(null)}>
                        <div className="bg-white rounded-[32px] p-8 max-w-[360px] w-full shadow-2xl border border-black/5 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                            <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center mb-6",
                                confirmAction.type.includes('delete') ? "bg-red-50 text-red-500" : confirmAction.type === 'rename_map' ? "bg-indigo-50 text-indigo-500" : "bg-amber-50 text-amber-500"
                            )}>
                                {confirmAction.type.includes('delete') ? <Trash2 className="w-6 h-6" /> : confirmAction.type === 'rename_map' ? <PenLine className="w-6 h-6" /> : <Archive className="w-6 h-6" />}
                            </div>

                            <h3 className="text-[18px] font-black tracking-tight text-black mb-2">
                                {confirmAction.type === 'delete_note' && 'Delete Note?'}
                                {confirmAction.type === 'archive_note' && 'Archive Note?'}
                                {confirmAction.type === 'delete_map' && 'Delete Mindmap?'}
                                {confirmAction.type === 'archive_map' && 'Archive Mindmap?'}
                                {confirmAction.type === 'rename_map' && 'Rename Mindmap'}
                            </h3>

                            <p className="text-[13px] text-black/50 leading-relaxed mb-6">
                                {confirmAction.type === 'rename_map' ? 'Enter a new name for your mindmap.' : `Are you sure you want to ${confirmAction.type.includes('delete') ? 'delete' : 'archive'} "${confirmAction.title}"?`}
                            </p>

                            {confirmAction.type === 'rename_map' && (
                                <input
                                    autoFocus
                                    value={renameValue}
                                    onChange={e => setRenameValue(e.target.value)}
                                    className="w-full px-4 py-3 bg-black/[0.03] border border-black/[0.06] rounded-xl text-[14px] font-medium mb-8 outline-none focus:border-indigo-500/30"
                                    onKeyDown={e => { if (e.key === 'Enter') { if (confirmAction) { renameMap(confirmAction.id, renameValue); setConfirmAction(null) } } }}
                                />
                            )}

                            {confirmAction?.type === 'delete_note' && (
                                <div className="p-4 bg-red-50 text-red-600 rounded-xl mb-6 text-[13px] font-medium border border-red-100 flex items-center gap-3 animate-in slide-in-from-top duration-300">
                                    <Trash2 className="w-5 h-5 shrink-0" />
                                    <p>Permanently delete note: <b>{confirmAction.title}</b>?</p>
                                </div>
                            )}
                            {confirmAction?.type === 'archive_note' && (
                                <div className="p-4 bg-amber-50 text-amber-600 rounded-xl mb-6 text-[13px] font-medium border border-amber-100 flex items-center gap-3 animate-in slide-in-from-top duration-300">
                                    <Archive className="w-5 h-5 shrink-0" />
                                    <p>Archive this note: <b>{confirmAction.title}</b>?</p>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={async () => {
                                        if (!confirmAction) return
                                        if (confirmAction.type === 'delete_note') { await deleteEntry(confirmAction.id); setSelectedEntry(null) }
                                        else if (confirmAction.type === 'archive_note') { await archiveEntry(confirmAction.id); setSelectedEntry(null) }
                                        else if (confirmAction.type === 'delete_map') { await deleteMap(confirmAction.id); setCurrentMapId(null); fetchMaps(showArchivedMaps) }
                                        else if (confirmAction.type === 'archive_map') { await archiveMap(confirmAction.id); setCurrentMapId(null); fetchMaps(showArchivedMaps) }
                                        else if (confirmAction.type === 'delete_draft') await deleteDraftData(confirmAction.id)
                                        else if (confirmAction.type === 'archive_draft') await archiveDraftData(confirmAction.id)
                                        else if (confirmAction.type === 'rename_map') { await renameMap(confirmAction.id, renameValue); fetchMaps(showArchivedMaps) }
                                        setConfirmAction(null)
                                    }}
                                    className={cn(
                                        "flex-1 py-3 rounded-[20px] text-[12px] font-black uppercase tracking-widest text-white shadow-xl hover:-translate-y-0.5 transition-all active:translate-y-0",
                                        confirmAction?.type.startsWith('delete') ? "bg-red-500 shadow-red-200" :
                                            confirmAction?.type === 'rename_map' ? "bg-indigo-500 shadow-indigo-200" : "bg-amber-500 shadow-amber-200"
                                    )}
                                >
                                    {confirmAction?.type === 'rename_map' ? 'Rename' :
                                        confirmAction?.type.startsWith('delete') ? 'Confirm Delete' : 'Confirm Archive'}
                                </button>
                                <button
                                    onClick={() => setConfirmAction(null)}
                                    className="flex-1 py-3 rounded-[20px] text-[12px] font-black uppercase tracking-widest text-black/40 hover:bg-black/5 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Studio Synthesis Modal */}
            {synthesisModalNodes && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setSynthesisModalNodes(null)}>
                    <div className="bg-white rounded-[32px] p-8 max-w-[400px] w-full shadow-2xl border border-black/5 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mb-6">
                            <BookOpen className="w-6 h-6" />
                        </div>

                        <h3 className="text-[18px] font-black tracking-tight text-black mb-2">Create Synthesis Draft</h3>
                        <p className="text-[13px] text-black/50 leading-relaxed mb-6">
                            You are about to compile {synthesisModalNodes.length} nodes into a long-form draft. Enter a title to begin your synthesis.
                        </p>

                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-black/30 block mb-1.5 ml-1">Draft Title</label>
                                <input
                                    autoFocus
                                    value={synthesisTitle}
                                    onChange={e => setSynthesisTitle(e.target.value)}
                                    placeholder="Enter synthesis title..."
                                    className="w-full px-4 py-3 bg-black/[0.03] border border-black/[0.06] rounded-xl text-[14px] font-medium outline-none focus:border-indigo-500/30 transition-all"
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            if (synthesisModalNodes) startComposition(synthesisModalNodes, synthesisTitle)
                                        }
                                        if (e.key === 'Escape') setSynthesisModalNodes(null)
                                    }}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => {
                                    if (synthesisModalNodes) startComposition(synthesisModalNodes, synthesisTitle)
                                }}
                                className="w-full py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-wider transition-all active:scale-95 shadow-[0_20px_40px_rgba(79,70,229,0.2)] hover:bg-indigo-700"
                            >
                                Start Drafting
                            </button>
                            <button
                                onClick={() => setSynthesisModalNodes(null)}
                                className="w-full py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-wider text-black/40 hover:bg-black/5 transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Project modal */}
            <ProjectDetailModal
                isOpen={!!selectedProjectId}
                onClose={() => setSelectedProjectId(null)}
                project={projects.find(p => p.id === selectedProjectId) || null}
            />

            {/* Content modal */}
            <ContentDetailModal
                isOpen={!!selectedContentId}
                onClose={() => setSelectedContentId(null)}
                item={content.find(c => c.id === selectedContentId) || null}
            />

            {/* Global Compose Button */}
            {selectedIds.length > 1 && !(activeDraft || composingNodes) && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-8 duration-500">
                    <button
                        onClick={() => {
                            // Map over selectedIds to preserve the chronological selection order
                            const orderedNodes = selectedIds.map(id => {
                                const inMap = entriesInMap.find(e => e.id === id)
                                if (inMap) return inMap
                                return entries.find(e => e.id === id) || projects.find(p => p.id === id) || content.find(c => c.id === id)
                            }).filter(Boolean) as PolymorphicNode[]

                            handleCompose(orderedNodes)
                        }}
                        className="flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-[24px] font-black uppercase text-[12px] tracking-widest shadow-[0_20px_60px_rgba(79,70,229,0.4)] hover:bg-indigo-700 hover:-translate-y-1 transition-all active:scale-95 group border-2 border-white/20"
                    >
                        <BookOpen className="w-5 h-5 group-hover:rotate-6 transition-transform" />
                        Compose Synthesis ({selectedIds.length})
                    </button>
                    <button
                        onClick={() => setSelectedIds([])}
                        className="absolute -top-2 -right-2 w-7 h-7 bg-white border border-black/10 rounded-full flex items-center justify-center text-black/40 hover:text-black shadow-lg hover:shadow-xl transition-all"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    )
}

function EmptyLibrary({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center opacity-30 transition-all">
            <LayoutGrid className="w-10 h-10 mb-3" />
            <p className="text-[12px] font-bold">{message}</p>
            <p className="text-[10px] mt-1">Items available in board view will appear here for mapping.</p>
        </div>
    )
}

function LibraryItem({ id, title, type = 'entry', onClick }: { id: string; title: string; type?: 'entry' | 'project' | 'content'; onClick: () => void }) {
    const isDraggingRef = useRef(false)
    const startPosRef = useRef({ x: 0, y: 0 })
    const [isDraggingThis, setIsDraggingThis] = useState(false)

    const handlePointerDown = (e: React.PointerEvent) => {
        if (e.button !== 0 && e.pointerType !== 'touch') return
        e.preventDefault()
        startPosRef.current = { x: e.clientX, y: e.clientY }
        isDraggingRef.current = false

        let ghost: HTMLDivElement | null = null

        const handleMove = (ev: PointerEvent) => {
            const dx = ev.clientX - startPosRef.current.x
            const dy = ev.clientY - startPosRef.current.y
            if (!isDraggingRef.current && Math.sqrt(dx * dx + dy * dy) > 8) {
                isDraggingRef.current = true
                setIsDraggingThis(true)

                ghost = document.createElement('div')
                ghost.style.cssText = [
                    'position:fixed',
                    'pointer-events:none',
                    'z-index:9999',
                    'width:180px',
                    'background:white',
                    'border-radius:14px',
                    'box-shadow:0 24px 48px rgba(0,0,0,0.18),0 0 0 1px rgba(0,0,0,0.06)',
                    'padding:10px 12px',
                    'font-family:ui-sans-serif, system-ui, sans-serif',
                    'color:#000',
                    'transform:rotate(-2deg) scale(0.95)',
                    'opacity:0.96',
                    'line-height:1.3'
                ].join(';')
                ghost.innerHTML = `
                    <div style="font-size:11px;font-weight:800;color:#000;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${title}</div>
                    <div style="font-size:9px;color:rgba(0,0,0,0.4);text-transform:uppercase;font-weight:bold;">${type}</div>
                `
                document.body.appendChild(ghost)
            }

            if (isDraggingRef.current && ghost) {
                ghost.style.left = `${ev.clientX - 90}px`
                ghost.style.top = `${ev.clientY - 30}px`
            }
        }

        const handleUp = (ev: PointerEvent) => {
            window.removeEventListener('pointermove', handleMove)
            window.removeEventListener('pointerup', handleUp)

            if (ghost) { ghost.remove(); ghost = null }
            setIsDraggingThis(false)

            if (isDraggingRef.current) {
                window.dispatchEvent(new CustomEvent('studio-canvas-pointer-drop', {
                    detail: { id, type, clientX: ev.clientX, clientY: ev.clientY }
                }))
                isDraggingRef.current = false
            } else {
                onClick()
            }
        }

        window.addEventListener('pointermove', handleMove)
        window.addEventListener('pointerup', handleUp)
    }

    return (
        <div
            onPointerDown={handlePointerDown}
            className={cn(
                "w-full text-left p-4 rounded-2xl border border-black/[0.05] transition-all group relative overflow-hidden select-none cursor-grab active:cursor-grabbing",
                isDraggingThis ? "opacity-30 scale-95 shadow-none" : "hover:border-indigo-300 hover:bg-indigo-50/30"
            )}
            style={{ touchAction: 'none' }}
        >
            <div className={cn(
                "absolute top-0 right-0 w-1 h-full opacity-0 group-hover:opacity-100 transition-all",
                type === 'project' ? "bg-orange-500" : type === 'content' ? "bg-blue-500" : "bg-indigo-500"
            )} />
            <p className="text-[13px] font-black text-black line-clamp-1">{title}</p>
            <div className="flex items-center gap-1.5 mt-1">
                {type === 'project' ? <Rocket className="w-3 h-3 text-orange-500" /> : type === 'content' ? <Video className="w-3 h-3 text-blue-500" /> : <Plus className="w-3 h-3 text-indigo-500" />}
                <p className={cn(
                    "text-[10px] font-bold uppercase tracking-tighter",
                    type === 'project' ? "text-orange-500/70" : type === 'content' ? "text-blue-500/70" : "text-indigo-500/70"
                )}>
                    {type ? `Map ${type}` : 'Map Idea'}
                </p>
            </div>
        </div>
    )
}
