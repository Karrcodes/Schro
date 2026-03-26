'use client'

import React, { useState, useEffect, useMemo } from 'react'
import type { StudioProject, StudioPress, StudioContent } from '../types/studio.types'
import { FramerSyncService } from '../services/FramerSyncService'
import { X, Globe, Check, AlertCircle, RefreshCw, Trash2, Rocket, Award, Loader2, ArrowRight, Layout, Image as ImageIcon, Type, AlignLeft, Video } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
    projects: StudioProject[]
    press?: StudioPress[]
    content?: StudioContent[]
    drafts?: any[]
    onClose: () => void
    onUpdateProject: (id: string, updates: Partial<StudioProject>) => Promise<any>
    onUpdatePress?: (id: string, updates: Partial<StudioPress>) => Promise<any>
    onUpdateContent?: (id: string, updates: Partial<StudioContent>) => Promise<any>
    onUpdateDraft?: (id: string, updates: any) => Promise<any>
    onAddProject?: (project: Partial<StudioProject>) => Promise<any>
    onAddPress?: (item: Partial<StudioPress>) => Promise<any>
    onAddContent?: (item: Partial<StudioContent>) => Promise<any>
    onAddDraft?: (data: { title: string; body?: string; project_id?: string }) => Promise<any>
}

export default function FramerSyncModal({ 
    projects, 
    press = [], 
    content = [], 
    drafts = [], 
    onClose, 
    onUpdateProject, 
    onUpdatePress,
    onUpdateContent,
    onUpdateDraft,
    onAddProject,
    onAddPress,
    onAddContent,
    onAddDraft
}: Props) {
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [selectedType, setSelectedType] = useState<'project' | 'press' | 'content' | 'draft'>('project')
    const [cmsItems, setCmsItems] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isReconciling, setIsReconciling] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isSyncing, setIsSyncing] = useState(false)
    const [syncSuccess, setSyncSuccess] = useState(false)
    const [recentJobs, setRecentJobs] = useState<any[]>([])
    const [isTesting, setIsTesting] = useState(false)
    const [testResult, setTestResult] = useState<{ success: boolean, message: string } | null>(null)
    const [syncStatus, setSyncStatus] = useState<{ status: 'idle' | 'syncing' | 'success' | 'error', message: string } | null>(null)
    const [isAutoRefreshing, setIsAutoRefreshing] = useState(false)
    const [unmatchedRemotes, setUnmatchedRemotes] = useState<any[]>([])
    const [showFieldDebug, setShowFieldDebug] = useState(false)
    const [pendingImportItem, setPendingImportItem] = useState<any | null>(null)
    const [importConfig, setImportConfig] = useState<{ type: string; category: string }>({ type: '', category: '' })

    // Configuration from localStorage
    const [config, setConfig] = useState<{ siteId: string, collectionId: string, collectionName?: string } | null>(null)

    const allItems = useMemo(() => ({
        project: projects,
        press: press,
        content: content || [],
        draft: drafts || []
    }), [projects, press, content, drafts])

    const selectedItem = useMemo(() => {
        if (!selectedId) return null
        const itemsForType = allItems[selectedType as keyof typeof allItems]
        return itemsForType?.find((item: any) => item.id === selectedId)
    }, [selectedId, selectedType, allItems])

    useEffect(() => {
        const init = async () => {
            const stored = localStorage.getItem('framer_sync_config')
            if (stored) {
                const parsed = JSON.parse(stored)
                setConfig(parsed)
                loadCmsItems(parsed.siteId)
            } else {
                // AUTO-DISCOVERY: Fetch default config from backend
                try {
                    console.log('Sync Manager: Attempting auto-discovery...')
                    const res = await fetch('/api/studio/framer-sync?endpoint=config')
                    const data = await res.json()
                    
                    if (data.connected && data.siteId) {
                        console.log('Sync Manager: Auto-discovered config:', data.projectName)
                        const newConfig = {
                            siteId: data.siteId,
                            collectionId: data.collectionId,
                            collectionName: data.collectionName
                        }
                        setConfig(newConfig)
                        localStorage.setItem('framer_sync_config', JSON.stringify(newConfig))
                        loadCmsItems(newConfig.siteId)
                    }
                } catch (e) {
                    console.error('Sync Manager: Auto-discovery failed', e)
                }
            }
            loadRecentJobs()
        }
        init()
    }, [])

    useEffect(() => {
        if (cmsItems.length > 0 && config?.siteId && !isReconciling) {
            reconcileCmsStatus(projects, press, content, drafts, cmsItems, config.siteId)
        }
    }, [projects, press, content, drafts, cmsItems, config?.siteId])

    // Background Autorefresh Poller
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null
        let safetyTimeout: NodeJS.Timeout | null = null

        if (isAutoRefreshing && config) {
            console.log('Sync Manager: Auto-refresh enabled (60s)')
            
            // Safety: Auto-off after 10 minutes to save Vercel usage
            safetyTimeout = setTimeout(() => {
                console.log('Sync Manager: Auto-off safety triggered')
                setIsAutoRefreshing(false)
            }, 600000)

            interval = setInterval(() => {
                if (!isLoading && !isReconciling && !isSyncing) {
                    loadCmsItems(config.siteId)
                }
            }, 60000) // Changed to 60s for better resource management
        }

        return () => { 
            if (interval) clearInterval(interval) 
            if (safetyTimeout) clearTimeout(safetyTimeout)
        }
    }, [isAutoRefreshing, config, isLoading, isReconciling, isSyncing])

    useEffect(() => {
        if (selectedItem?.framer_cms_id && config) {
            verifyStatus(selectedItem, selectedType)
        }
    }, [selectedId, selectedType, config, selectedItem])

    const verifyStatus = async (item: any, type: string) => {
        if (!item.framer_cms_id || !config) return
        try {
            // Find the collection ID for this item from the tag
            // Item in allItems doesn't have the tag, but we can find it in cmsItems
            const cmsItem = cmsItems.find(it => it.id === item.framer_cms_id)
            const collId = cmsItem?._collectionId || config.collectionId

            const res = await fetch(`/api/studio/framer-sync?endpoint=verify&siteId=${config.siteId}&collectionId=${collId}&itemId=${item.framer_cms_id}`)
            const data = await res.json()
            if (data.exists === false) {
                // Item was deleted from Framer! Update local state
                if (type === 'project') {
                    await onUpdateProject(item.id, { 
                        framer_cms_id: null as any,
                        framer_collection_id: null as any 
                    })
                } else if (onUpdatePress) {
                    await onUpdatePress(item.id, {
                        framer_cms_id: null as any,
                        framer_collection_id: null as any
                    })
                }
            }
        } catch (e) {
            console.error('Verify status failed', e)
        }
    }

    const loadRecentJobs = async () => {
        try {
            const res = await fetch('/api/studio/framer-jobs')
            const data = await res.json()
            setRecentJobs(data.jobs || [])
        } catch (e) {
            console.error('Failed to load jobs', e)
        }
    }

    const testConnection = async () => {
        setIsTesting(true)
        setTestResult(null)
        try {
            const res = await fetch('/api/studio/sync/test')
            const data = await res.json()
            setTestResult({ success: data.success, message: data.message })
            if (data.success && config) {
                loadCmsItems(config.siteId)
            }
        } catch (err: any) {
            setTestResult({ success: false, message: err.message })
        } finally {
            setIsTesting(false)
        }
    }

    const handleReconcileAll = async () => {
        if (!config || projects.length === 0) return
        setIsReconciling(true)
        try {
            await loadCmsItems(config.siteId)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsReconciling(false)
        }
    }

    const loadCmsItems = async (siteId: string) => {
        setIsLoading(true)
        try {
            const collections = await FramerSyncService.getCollections(siteId)
            
            // Map collections to categories
            const typeMapping: Record<string, string[]> = {
                project: ['technology', 'projects', 'work', 'design', 'fashion', 'architecture', 'product', 'creative'],
                press: ['press', 'awards', 'recognition'],
                content: ['content', 'video', 'media', 'learning', 'talks'],
                draft: ['articles', 'blog', 'journal', 'drafts', 'writing']
            }

            const relevantCollections = collections.filter(coll => {
                const name = coll.name.toLowerCase()
                return Object.values(typeMapping).some(keywords => 
                    keywords.some(k => name.includes(k))
                )
            })

            console.log(`Sync Manager: Found ${relevantCollections.length} relevant collections.`)

            const allFetchedItems: any[] = []
            
            for (const coll of relevantCollections) {
                const items = await FramerSyncService.getCollectionItems(siteId, coll.id)
                // Tag items with their collection info and field schema for discovery
                const taggedItems = items.map(it => ({ 
                    ...it, 
                    _collectionName: coll.name,
                    _collectionId: coll.id,
                    _fields: coll.fields || [],  // field schema: [{ id, name, slug, type }]
                    _category: Object.keys(typeMapping).find(type => 
                        typeMapping[type].some(k => coll.name.toLowerCase().includes(k))
                    )
                }))
                allFetchedItems.push(...taggedItems)
            }

            setCmsItems(allFetchedItems)
            
            // Initial reconciliation
            await reconcileCmsStatus(projects, press, content, drafts, allFetchedItems, siteId)
            
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    const reconcileCmsStatus = async (
        localProjects: StudioProject[], 
        localPress: StudioPress[], 
        localContent: StudioContent[],
        localDrafts: any[],
        remoteItems: any[], 
        siteId: string
    ) => {
        setIsReconciling(true)
        const matchedRemoteIds = new Set<string>()
        
        const slugify = (text: string) => text
            .toString()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w-]+/g, '')
            .replace(/--+/g, '-');

        // Reconcile Projects
        const remoteProjects = remoteItems.filter(it => it._category === 'project')
        for (const project of localProjects) {
            const targetSlug = slugify(project.title)
            const matchedRemote = remoteProjects.find(it => it.id === project.framer_cms_id) || remoteProjects.find(it => it.slug === targetSlug)

            if (matchedRemote) {
                matchedRemoteIds.add(matchedRemote.id)
                const updates: Partial<StudioProject> = { 
                    framer_cms_id: matchedRemote.id,
                    framer_collection_id: matchedRemote._collectionId
                }
                if (project.status !== 'shipped' && project.status !== 'archived') updates.status = 'shipped'
                if (project.framer_cms_id !== matchedRemote.id || updates.status) await onUpdateProject(project.id, updates)
            } else if (project.framer_cms_id) {
                await onUpdateProject(project.id, { framer_cms_id: null as any, framer_collection_id: null as any })
            }
        }

        // Reconcile Press
        const remotePress = remoteItems.filter(it => it._category === 'press')
        if (onUpdatePress) {
            for (const item of localPress) {
                const targetSlug = slugify(item.title)
                const matchedRemote = remotePress.find(it => it.id === item.framer_cms_id) || remotePress.find(it => it.slug === targetSlug)

                if (matchedRemote) {
                    matchedRemoteIds.add(matchedRemote.id)
                    const updates: Partial<StudioPress> = { 
                        framer_cms_id: matchedRemote.id,
                        framer_collection_id: matchedRemote._collectionId
                    }
                    if (item.status !== 'published' && item.status !== 'achieved') updates.status = 'published'
                    if (item.framer_cms_id !== matchedRemote.id || updates.status) await onUpdatePress(item.id, updates)
                } else if (item.framer_cms_id) {
                    await onUpdatePress(item.id, { framer_cms_id: null as any, framer_collection_id: null as any })
                }
            }
        }

        // Reconcile Content (Media)
        const remoteContent = remoteItems.filter(it => it._category === 'content')
        if (onUpdateContent) {
            for (const item of localContent) {
                const targetSlug = slugify(item.title)
                const matchedRemote = remoteContent.find(it => it.id === item.framer_cms_id) || remoteContent.find(it => it.slug === targetSlug)

                if (matchedRemote) {
                    matchedRemoteIds.add(matchedRemote.id)
                    const updates: Partial<StudioContent> = { 
                        framer_cms_id: matchedRemote.id,
                        framer_collection_id: matchedRemote._collectionId
                    }
                    if (item.status !== 'published') updates.status = 'published'
                    if (item.framer_cms_id !== matchedRemote.id || updates.status) await onUpdateContent(item.id, updates)
                } else if (item.framer_cms_id) {
                    await onUpdateContent(item.id, { framer_cms_id: null as any, framer_collection_id: null as any })
                }
            }
        }

        // Reconcile Drafts (Articles)
        const remoteDrafts = remoteItems.filter(it => it._category === 'draft')
        if (onUpdateDraft) {
            for (const item of localDrafts) {
                const targetSlug = slugify(item.title)
                const matchedRemote = remoteDrafts.find(it => it.id === item.framer_cms_id) || remoteDrafts.find(it => it.slug === targetSlug)

                if (matchedRemote) {
                    matchedRemoteIds.add(matchedRemote.id)
                    const updates: any = { 
                        framer_cms_id: matchedRemote.id
                    }
                    if (item.status !== 'completed') updates.status = 'completed'
                    if (item.framer_cms_id !== matchedRemote.id || updates.status) await onUpdateDraft(item.id, updates)
                } else if (item.framer_cms_id) {
                    await onUpdateDraft(item.id, { framer_cms_id: null as any })
                }
            }
        }

        const unmatched = remoteItems.filter(it => !matchedRemoteIds.has(it.id))
        setUnmatchedRemotes(unmatched)
        setIsReconciling(false)
        console.log(`Reconciliation complete. Matched: ${matchedRemoteIds.size}, Unmatched: ${unmatched.length}`)
    }

    const handleSync = async () => {
        if (!selectedId || !selectedItem || !config) return
        
        setIsSyncing(true)
        setError(null)
        setSyncStatus({ status: 'syncing', message: 'Pushing to Framer CMS...' })
        try {
            // Direct Synchronous Push for immediate feedback
            const res = await fetch('/api/studio/framer-sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    localId: selectedId,
                    type: selectedType,
                    siteId: config.siteId,
                    collectionId: config.collectionId,
                    itemId: selectedItem.framer_cms_id,
                    data: selectedItem
                })
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Sync failed')
            }

            const result = await res.json()
            
            // Update Local State Immediately
            if (selectedType === 'project') {
                await onUpdateProject(selectedId, { 
                    framer_cms_id: result.cmsId,
                    framer_collection_id: config.collectionId 
                })
            } else if (onUpdatePress) {
                await onUpdatePress(selectedId, {
                    framer_cms_id: result.cmsId,
                    framer_collection_id: config.collectionId
                })
            }

            setSyncSuccess(true)
            setSyncStatus({ status: 'success', message: 'Successfully Published!' })
            loadRecentJobs()
            
            setTimeout(() => {
                setSyncSuccess(false)
                setSyncStatus(null)
                setSelectedId(null)
                loadCmsItems(config.siteId)
            }, 3000)
        } catch (err: any) {
            setError(err.message)
            setSyncStatus({ status: 'error', message: err.message })
        } finally {
            setIsSyncing(false)
        }
    }

    const handleRemove = async () => {
        if (!selectedId || !selectedItem || !selectedItem.framer_cms_id || !config) return
        
        if (!window.confirm("Are you sure you want to remove this item from the live website?")) return

        setIsSyncing(true)
        setError(null)
        setSyncStatus({ status: 'syncing', message: 'Removing from CMS...' })
        try {
            // Direct Synchronous Delete
            const res = await fetch('/api/studio/framer-sync', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    localId: selectedId,
                    type: selectedType,
                    siteId: config.siteId,
                    collectionId: (selectedItem as any).framer_collection_id || config.collectionId,
                    itemId: selectedItem.framer_cms_id
                })
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Removal failed')
            }

            // Update Local State Immediately
            if (selectedType === 'project') {
                await onUpdateProject(selectedId, { 
                    framer_cms_id: null as any,
                    framer_collection_id: null as any 
                })
            } else if (selectedType === 'press' && onUpdatePress) {
                await onUpdatePress(selectedId, {
                    framer_cms_id: null as any,
                    framer_collection_id: null as any
                })
            } else if (selectedType === 'content' && onUpdateContent) {
                await onUpdateContent(selectedId, {
                    framer_cms_id: null as any,
                    framer_collection_id: null as any
                })
            } else if (selectedType === 'draft' && onUpdateDraft) {
                await onUpdateDraft(selectedId, {
                    framer_cms_id: null as any,
                    article_url: null as any
                })
            }

            // Optional: Cascade delete to Hashnode if it's an article
            if (selectedType === 'draft') {
                setSyncStatus({ status: 'syncing', message: 'Removing from Hashnode...' })
                try {
                    await fetch('/api/studio/hashnode', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ localId: selectedId })
                    })
                } catch (e) {
                    console.error('Failed to remove from Hashnode', e)
                }
            }

            setSyncSuccess(true)
            setSyncStatus({ status: 'success', message: 'Successfully Removed!' })
            loadRecentJobs()
            
            setTimeout(() => {
                setSyncSuccess(false)
                setSyncStatus(null)
                setSyncStatus(null)
                setSelectedId(null)
                loadCmsItems(config.siteId)
            }, 3000)
        } catch (err: any) {
            setError(err.message)
            setSyncStatus({ status: 'error', message: err.message })
        } finally {
            setIsSyncing(false)
        }
    }

    const handleImport = async (item: any) => {
        setPendingImportItem(item)
        if (item._category === 'content') {
            setImportConfig({ type: 'video', category: 'Other' })
        } else if (item._category === 'project') {
            setImportConfig({ type: 'Technology', category: 'General' })
        } else if (item._category === 'press') {
            setImportConfig({ type: 'feature', category: 'Media' })
        } else if (item._category === 'draft') {
            setImportConfig({ type: 'article', category: 'Writing' })
        } else {
            setImportConfig({ type: 'Other', category: 'Imported' })
        }
    }

    const confirmImport = async () => {
        if (!pendingImportItem || !onAddProject || !onAddPress || !onAddContent || !onAddDraft) return
        const item = pendingImportItem
        setIsSyncing(true)
        setSyncStatus({ status: 'syncing', message: `Importing ${item.slug}...` })
        try {
            const category = item._category
            const fd = item.fieldData || {}
            const fields: { id: string, name: string, slug: string, type: string }[] = item._fields || []

            // Build name→value map resolving opaque Framer field IDs
            const nd: Record<string, any> = {}
            for (const f of fields) {
                nd[f.name.toLowerCase()] = fd[f.id]
            }

            // Exact key lookup (case-insensitive)
            const get = (key: string): any => nd[key.toLowerCase()]

            // Plain text from string or formattedText fields
            const getText = (key: string): string | undefined => {
                const v = get(key)
                if (!v) return undefined
                if (typeof v === 'string') return v.trim() || undefined
                // Framer formattedText is usually { html: '...' } — strip tags for plain text
                if (typeof v === 'object') {
                    if (v.html) return v.html.replace(/<[^>]+>/g, '').trim() || undefined
                    if (v.text) return v.text.trim() || undefined
                }
                return undefined
            }

            // Image URL from Framer image field { url }
            const getImage = (key: string): string | undefined => {
                const v = get(key) as any
                if (!v) return undefined
                if (typeof v === 'object' && v.url) return v.url
                if (typeof v === 'string' && v.startsWith('http')) return v
                return undefined
            }

            // URL from Framer link field { url } or plain string
            const getLink = (key: string): string | undefined => {
                const v = get(key) as any
                if (!v) return undefined
                if (typeof v === 'object' && v.url) return v.url
                if (typeof v === 'string' && v.startsWith('http')) return v
                return undefined
            }

            // Confirmed field names from CMS schema
            const title = getText('title') || item.slug
            const tagline = undefined  // 'Inner Title' is a website theme artifact ("Title /"), not content
            const description = getText('body text')
            const cover_url = getImage('bg image')
            const client = getText('client')
            const location = getText('location')

            const baseData: any = {
                title,
                slug: item.slug,
                tagline: tagline || undefined,
                description: description || undefined,
                cover_url: cover_url || undefined,
                client: client || undefined,
                location: location || undefined,
                framer_cms_id: item.id,
                framer_collection_id: item._collectionId
            }

            if (category === 'project') {
                const project_url = getLink('view project')
                const article_url = getLink('view article')
                await onAddProject({ 
                    ...baseData, 
                    project_url: project_url || undefined,
                    article_url: article_url || undefined,
                    status: 'shipped',
                    type: importConfig.type as any,
                    gtv_category: undefined // Could expand this later if needed
                })
            } else if (category === 'press') {
                const organization = getText('featured on')
                const url = getLink('view')
                await onAddPress({ 
                    ...baseData, 
                    organization, 
                    url, 
                    status: 'published',
                    type: importConfig.type as any
                })
            } else if (category === 'content') {
                const url = getText('media link') || getLink('media link')
                await onAddContent({ 
                    ...baseData, 
                    url, 
                    status: 'published',
                    type: importConfig.type,
                    category: importConfig.category as any
                })
            } else if (category === 'draft') {
                const article_url = getLink('view article')
                await onAddDraft({ title: baseData.title, project_id: undefined })
            }

            setSyncStatus({ status: 'success', message: 'Imported successfully!' })
            setPendingImportItem(null)
            setTimeout(() => {
                setSyncStatus(null)
                loadCmsItems(config!.siteId)
            }, 2000)
        } catch (err: any) {
            setError(err.message || 'Import failed. Check the console for details.')
            setSyncStatus({ status: 'error', message: err.message })
        } finally {
            setIsSyncing(false)
        }
    }

    const getCmsItemForSelectedItem = (itemId: string, itemType: string) => {
        const type = itemType as any
        const item = (allItems as any)[type]?.find((p: any) => p.id === itemId)
        if (!item?.framer_cms_id) return null
        return cmsItems.find(cmsItem => cmsItem.id === item.framer_cms_id)
    }

    return (
        <div className="flex flex-col h-[750px] w-full max-w-5xl bg-white rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-black/5">
            {/* Header */}
            <div className="p-8 border-b border-black/[0.05] flex items-center justify-between bg-black/[0.01]">
                <div className="flex items-center gap-6">
                    <div>
                        <h2 className="text-xl font-black text-black">Sync Manager</h2>
                        <p className="text-[12px] font-medium text-black/40">Portfolio-to-Framer integration</p>
                    </div>
                    <div className="h-8 w-px bg-black/5" />
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={testConnection}
                            disabled={isTesting}
                            className={cn(
                                "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                                testResult?.success ? "bg-green-500/10 text-green-600" : 
                                testResult?.success === false ? "bg-red-500/10 text-red-600 border border-red-200" :
                                "bg-black text-white hover:scale-105 active:scale-95 shadow-lg shadow-black/10"
                            )}
                        >
                            {isTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Globe className="w-3 h-3" />}
                            {testResult ? testResult.message : "Test Connection"}
                        </button>

                        <button 
                            onClick={() => {
                                if (config) {
                                    loadCmsItems(config.siteId)
                                } else {
                                    testConnection() // This will also trigger load if successful
                                }
                            }}
                            disabled={isReconciling || isLoading || isTesting}
                            className={cn(
                                "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border",
                                isReconciling || isLoading ? "bg-blue-50 border-blue-100 text-blue-500" : "bg-white border-black/10 text-black/60 hover:bg-black/5"
                            )}
                        >
                            <RefreshCw className={cn("w-3 h-3", (isReconciling || isLoading) && "animate-spin")} />
                            {isReconciling ? "Reconciling..." : isLoading ? "Loading..." : "Refresh Status"}
                        </button>

                        <button 
                            onClick={handleReconcileAll}
                            disabled={isReconciling || isLoading || isTesting || !config}
                            className={cn(
                                "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border shadow-lg shadow-emerald-500/10",
                                isReconciling ? "bg-emerald-500 text-white border-emerald-600" : "bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100"
                            )}
                        >
                            {isReconciling ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                            Sync All
                        </button>

                        <button 
                            onClick={() => setShowFieldDebug(v => !v)}
                            title="Show raw CMS field names for each collection"
                            className={cn(
                                "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border",
                                showFieldDebug ? "bg-amber-500 text-white border-amber-600" : "bg-white border-black/10 text-black/40 hover:bg-black/5"
                            )}
                        >
                            {showFieldDebug ? '🔍 Hide Schema' : '🔍 Field Schema'}
                        </button>

                        <button 
                            onClick={() => setIsAutoRefreshing(!isAutoRefreshing)}
                            title="Auto-refresh every 60s (Auto-off after 10m)"
                            className={cn(
                                "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border",
                                isAutoRefreshing ? "bg-green-500 text-white border-green-600 shadow-lg shadow-green-500/20" : "bg-white border-black/10 text-black/40 hover:bg-black/5"
                            )}
                        >
                            <div className={cn("w-1.5 h-1.5 rounded-full", isAutoRefreshing ? "bg-white animate-pulse" : "bg-black/20")} />
                            {isAutoRefreshing ? "Live ON" : "Live OFF"}
                        </button>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                    <X className="w-5 h-5 text-black/20" />
                </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left Side: Items List */}
                <div className="w-[340px] border-r border-black/[0.05] flex flex-col overflow-hidden bg-black/[0.01]">
                    {showFieldDebug ? (
                        // --- FIELD SCHEMA DEBUG PANEL ---
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                            <p className="text-[9px] font-black uppercase tracking-widest text-amber-600 px-1">CMS Field Schema — copy &amp; share with AI to tune import mapping</p>
                            {(() => {
                                // Group cmsItems by collection, use _fields for human-readable names
                                const byCollection: Record<string, { name: string, fields: { name: string, slug: string, type: string }[] }> = {}
                                for (const item of cmsItems) {
                                    const cName = item._collectionName || 'Unknown'
                                    if (!byCollection[cName]) {
                                        const schema = (item._fields || []) as { id: string, name: string, slug: string, type: string }[]
                                        byCollection[cName] = { name: cName, fields: schema.map(f => ({ name: f.name, slug: f.slug, type: f.type })) }
                                    }
                                }
                                return Object.values(byCollection).map(coll => (
                                    <div key={coll.name} className="p-3 rounded-2xl bg-amber-50 border border-amber-100">
                                        <p className="text-[10px] font-black text-amber-800 mb-2 uppercase tracking-tight">{coll.name}</p>
                                        <div className="space-y-1">
                                            {coll.fields.map(f => (
                                                <div key={f.slug} className="flex justify-between items-center">
                                                    <span className="text-[10px] font-mono text-amber-900 font-bold">{f.name}</span>
                                                    <span className="text-[8px] font-medium text-amber-500 bg-amber-100 px-1.5 py-0.5 rounded">{f.type}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            })()}
                        </div>
                    ) : (
                    <>
                    <div className="p-4 border-b border-black/[0.05] flex flex-wrap gap-2">
                        <button 
                            onClick={() => { setSelectedType('project'); setSelectedId(null); }}
                            className={cn(
                                "flex-1 min-w-[80px] py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all",
                                selectedType === 'project' ? "bg-black text-white" : "bg-black/5 text-black/40 hover:bg-black/10"
                            )}
                        >
                            Projects ({projects.length + unmatchedRemotes.filter(item => item._category === 'project').length})
                        </button>
                        <button 
                            onClick={() => { setSelectedType('press'); setSelectedId(null); }}
                            className={cn(
                                "flex-1 min-w-[80px] py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all",
                                selectedType === 'press' ? "bg-black text-white" : "bg-black/5 text-black/40 hover:bg-black/10"
                            )}
                        >
                            Press ({press.length + unmatchedRemotes.filter(item => item._category === 'press').length})
                        </button>
                        <button 
                            onClick={() => { setSelectedType('content'); setSelectedId(null); }}
                            className={cn(
                                "flex-1 min-w-[80px] py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all",
                                selectedType === 'content' ? "bg-black text-white" : "bg-black/5 text-black/40 hover:bg-black/10"
                            )}
                        >
                            Media ({(content?.length || 0) + unmatchedRemotes.filter(item => item._category === 'content').length})
                        </button>
                        <button 
                            onClick={() => { setSelectedType('draft'); setSelectedId(null); }}
                            className={cn(
                                "flex-1 min-w-[80px] py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all",
                                selectedType === 'draft' ? "bg-black text-white" : "bg-black/5 text-black/40 hover:bg-black/10"
                            )}
                        >
                            Articles ({(drafts?.length || 0) + unmatchedRemotes.filter(item => item._category === 'draft').length})
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                            </div>
                        ) : unmatchedRemotes.filter(item => item._category === selectedType).length === 0 && allItems[selectedType as keyof typeof allItems].length === 0 ? (
                            <div className="text-center py-20 text-black/20 text-[12px] font-medium uppercase tracking-[0.2em]">No Items</div>
                        ) : (
                            <>
                                {unmatchedRemotes.filter(item => item._category === selectedType).map((item: any) => (
                                    <div
                                        key={item.id}
                                        className="w-full p-4 rounded-3xl border border-emerald-100 bg-emerald-50/30 text-left transition-all group relative overflow-hidden flex items-start gap-4"
                                    >
                                        <div className="w-10 h-10 rounded-2xl bg-white border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                                            <Globe className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1 text-[9px] font-black uppercase tracking-[0.1em]">
                                                <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white shadow-sm">Live on Web</span>
                                                <span className="px-2 py-0.5 rounded-md bg-emerald-600/10 text-emerald-700">From: {item._collectionName}</span>
                                            </div>
                                            <h4 className="text-[14px] font-black text-emerald-950 leading-tight mb-1 truncate">{item.slug}</h4>
                                            <p className="text-[11px] font-medium text-emerald-700/60 truncate italic">Ready for import</p>
                                        </div>
                                        <button 
                                            onClick={() => handleImport(item)}
                                            disabled={isSyncing}
                                            className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-colors shrink-0 shadow-lg shadow-emerald-600/20"
                                        >
                                            Import
                                        </button>
                                    </div>
                                ))}
                                {allItems[selectedType as keyof typeof allItems].map((item: any) => {
                                    const isLive = !!item.framer_cms_id
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => setSelectedId(item.id)}
                                            className={cn(
                                                "w-full p-4 rounded-3xl border text-left transition-all group relative overflow-hidden",
                                                selectedId === item.id
                                                    ? "bg-black text-white border-black"
                                                    : "bg-white border-black/[0.05] hover:border-black/20"
                                            )}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider",
                                                        isLive ? "bg-emerald-500 text-white" : "bg-black/5 text-black/40"
                                                    )}>
                                                        {isLive ? "🌐 Live" : "Local"}
                                                    </span>
                                                    {isLive && (
                                                        <span className="text-[9px] font-bold text-emerald-600/60 uppercase">
                                                            Synced
                                                        </span>
                                                    )}
                                                </div>
                                                {isLive && (
                                                    <div className="text-[8px] font-black text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full tracking-tighter">LIVE</div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 mb-1">
                                                {selectedType === 'project' ? <Rocket className="w-3 h-3 opacity-40 shrink-0" /> : <Award className="w-3 h-3 opacity-40 shrink-0" />}
                                                <h4 className="text-[13px] font-black leading-tight line-clamp-1">{item.title}</h4>
                                            </div>
                                            
                                            <p className={cn("text-[10px] line-clamp-1 opacity-60 font-medium", selectedId === item.id ? "text-white/60" : "text-black/60")}>
                                                {(item as any).tagline || (item as any).organization || "No details"}
                                            </p>
                                        </button>
                                    )
                                })}
                            </>
                        )}
                    </div>
                    </>
                    )}
                </div>

                {/* Center: Sync Workspace */}
                <div className="flex-1 flex flex-col overflow-hidden bg-white">
                    {selectedItem ? (
                        <div className="flex-1 flex flex-col p-8 overflow-y-auto custom-scrollbar space-y-8 animate-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[16px] font-black">Sync Preview</h3>
                                <button onClick={() => setSelectedId(null)} className="text-[11px] font-black uppercase tracking-widest text-black/30 hover:text-black">Cancel</button>
                            </div>

                            <div className="p-6 rounded-[32px] bg-blue-50/50 border border-blue-100 space-y-6">
                                <div className="grid grid-cols-1 gap-3">
                                    <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-blue-200/50 group/row">
                                        <div className="flex items-center gap-2">
                                            <Type className="w-3.5 h-3.5 text-black/20" />
                                            <span className="text-[11px] font-bold text-black/40 uppercase tracking-widest">Title</span>
                                        </div>
                                        <span className="text-[12px] font-black">{selectedItem.title}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-blue-200/50 group/row">
                                        <div className="flex items-center gap-2">
                                            <Globe className="w-3.5 h-3.5 text-black/20" />
                                            <span className="text-[11px] font-bold text-black/40 uppercase tracking-widest">Slug (Auto)</span>
                                        </div>
                                        <span className="text-[12px] font-black lowercase opacity-40 italic">
                                            {selectedItem.title.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '')}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-blue-200/50 group/row">
                                        <div className="flex items-center gap-2">
                                            <ImageIcon className="w-3.5 h-3.5 text-black/20" />
                                            <span className="text-[11px] font-bold text-black/40 uppercase tracking-widest">Cover Image</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {selectedItem.cover_url ? (
                                                <div className="flex items-center gap-1.5 text-green-600 bg-green-50 px-2 py-0.5 rounded-full text-[10px] font-black">
                                                    <Check className="w-2.5 h-2.5" />
                                                    READY
                                                </div>
                                            ) : (
                                                <div className="text-[10px] font-black text-black/20 italic">No image found</div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {syncStatus?.status === 'success' ? (
                                    <div className="py-6 flex flex-col items-center justify-center text-center gap-2 animate-in zoom-in duration-300">
                                        <div className="w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center mb-2 shadow-lg shadow-green-500/20">
                                            <Check className="w-6 h-6" />
                                        </div>
                                        <h4 className="text-[14px] font-black text-green-900">{syncStatus.message}</h4>
                                        <p className="text-[12px] font-medium text-green-700/60">The cloud worker has received the request.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4 pt-4 border-t border-blue-200/30">
                                        <div className="space-y-3">
                                            <button
                                                onClick={handleSync}
                                                disabled={isSyncing}
                                                className="w-full py-6 bg-black text-white rounded-[32px] text-[13px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl shadow-black/10"
                                            >
                                                {isSyncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                                                {selectedItem.framer_cms_id ? "Sync Changes to Framer" : "Push to Website"}
                                            </button>

                                            {selectedItem.framer_cms_id && (
                                                <button
                                                    onClick={handleRemove}
                                                    disabled={isSyncing}
                                                    className="w-full py-4 bg-red-50 text-red-600 rounded-[24px] text-[11px] font-black uppercase tracking-widest hover:bg-red-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50 border border-red-100"
                                                >
                                                    {isSyncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                                    Remove from Website
                                                </button>
                                            )}
                                        </div>
                                        {syncStatus?.status === 'syncing' && (
                                            <p className="text-center text-[10px] font-black uppercase tracking-widest text-blue-500/60 animate-pulse">{syncStatus.message}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : pendingImportItem ? (
                        <div className="flex-1 flex flex-col p-8 overflow-y-auto custom-scrollbar space-y-8 animate-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[16px] font-black">Guided Import</h3>
                                <button onClick={() => setPendingImportItem(null)} className="text-[11px] font-black uppercase tracking-widest text-black/30 hover:text-black">Cancel</button>
                            </div>

                            <div className="p-8 rounded-[40px] bg-emerald-50/50 border border-emerald-100 space-y-8">
                                <div className="flex items-start gap-5">
                                    <div className="w-16 h-16 rounded-[24px] bg-white border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0 shadow-sm">
                                        <Globe className="w-8 h-8" />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-xl font-black text-emerald-950 uppercase tracking-tight">{pendingImportItem.slug}</h4>
                                        <p className="text-[11px] font-bold text-emerald-600/60 uppercase tracking-widest">Framer CMS Source: {pendingImportItem._collectionName}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-6">
                                    {pendingImportItem._category === 'project' && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between px-1">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-emerald-900/40">Target Category / Type</label>
                                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full uppercase">Project</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {['Technology', 'Architectural Design', 'Fashion', 'Product Design', 'Media', 'Other'].map(type => (
                                                    <button
                                                        key={type}
                                                        onClick={() => setImportConfig(prev => ({ ...prev, type }))}
                                                        className={cn(
                                                            "px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-wider border transition-all text-left",
                                                            importConfig.type === type 
                                                                ? "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-500/20" 
                                                                : "bg-white border-emerald-100 text-emerald-900/40 hover:border-emerald-200"
                                                        )}
                                                    >
                                                        {type}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {pendingImportItem._category === 'press' && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between px-1">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-emerald-900/40">Target Category / Type</label>
                                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full uppercase">Press & Media</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {['competition', 'grant', 'award', 'feature', 'accelerator', 'other'].map(type => (
                                                    <button
                                                        key={type}
                                                        onClick={() => setImportConfig(prev => ({ ...prev, type }))}
                                                        className={cn(
                                                            "px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-wider border transition-all text-left capitalize",
                                                            importConfig.type === type 
                                                                ? "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-500/20" 
                                                                : "bg-white border-emerald-100 text-emerald-900/40 hover:border-emerald-200"
                                                        )}
                                                    >
                                                        {type.replace('_', ' ')}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {pendingImportItem._category === 'content' && (
                                        <div className="space-y-6">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-emerald-900/40 ml-1">Format Type</label>
                                                    <div className="px-5 py-4 bg-emerald-100/50 border border-emerald-200 rounded-2xl flex items-center gap-3">
                                                        <Video className="w-4 h-4 text-emerald-600" />
                                                        <span className="text-[12px] font-black text-emerald-800 uppercase tracking-widest">{importConfig.type}</span>
                                                    </div>
                                                </div>
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-emerald-900/40 ml-1">Category</label>
                                                    <div className="px-5 py-4 bg-emerald-100/50 border border-emerald-200 rounded-2xl flex items-center gap-3">
                                                        <Layout className="w-4 h-4 text-emerald-600" />
                                                        <span className="text-[12px] font-black text-emerald-800 uppercase tracking-widest">{importConfig.category}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="text-[10px] font-bold text-emerald-900/40 italic px-2 uppercase tracking-tight">Auto-configured for bulk Content migration</p>
                                        </div>
                                    )}

                                    {pendingImportItem._category === 'draft' && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between px-1">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-emerald-900/40">Import Status</label>
                                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full uppercase">Article</span>
                                            </div>
                                            <div className="p-6 rounded-3xl border border-emerald-100 bg-white/50 space-y-2">
                                                <p className="text-[13px] font-black text-emerald-950 uppercase tracking-tight">Standard Article Import</p>
                                                <p className="text-[11px] font-medium text-emerald-700/60 leading-relaxed italic">Articles will be imported as editable drafts. You can add project links and rich content after import.</p>
                                            </div>
                                        </div>
                                    )}

                                    {!['project', 'press', 'content', 'draft'].includes(pendingImportItem._category) && (
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-emerald-900/40 ml-1">Unknown Collection Structure</label>
                                            <div className="p-6 rounded-3xl border border-orange-100 bg-orange-50/30 text-orange-700">
                                                <p className="text-[11px] font-bold mb-1">Found in: {pendingImportItem._collectionName}</p>
                                                <p className="text-[10px] font-medium leading-relaxed opacity-80">This collection doesn't match standard Studio categories. It will be imported with generic settings.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-6 border-t border-emerald-200/30">
                                    <button
                                        onClick={confirmImport}
                                        disabled={isSyncing || (pendingImportItem._category === 'project' && !importConfig.type)}
                                        className="w-full py-6 bg-emerald-600 text-white rounded-[32px] text-[13px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl shadow-emerald-600/20"
                                    >
                                        {isSyncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Rocket className="w-5 h-5" />}
                                        Confirm & Import to Studio
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-6">
                            <div className="w-24 h-24 bg-black/[0.02] border border-black/[0.05] rounded-full flex items-center justify-center">
                                <ArrowRight className="w-8 h-8 text-black/10" />
                            </div>
                            <div>
                                <h3 className="text-[15px] font-black text-black">Workspace Idle</h3>
                                <p className="text-[12px] font-medium text-black/30 mt-1 max-w-[200px]">Select local items to sync, or click Import on web items to pull them in.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Side: Activity Log */}
                <div className="w-[300px] border-l border-black/[0.05] flex flex-col overflow-hidden bg-black/[0.01]">
                    <div className="p-4 border-b border-black/[0.05] flex items-center justify-between">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-black/30 px-2">Pipeline Feed</h3>
                        <button onClick={loadRecentJobs} className="p-1 hover:bg-black/5 rounded-full transition-colors">
                            <RefreshCw className={cn("w-3 h-3 text-black/20", isLoading && "animate-spin")} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {recentJobs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
                                <AlignLeft className="w-8 h-8 text-black/5" />
                                <p className="text-[10px] font-bold text-black/10 uppercase tracking-widest">Queue Empty</p>
                            </div>
                        ) : (
                            recentJobs.map(job => (
                                <div key={job.id} className="p-3 bg-white rounded-2xl border border-black/[0.03] space-y-1">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black uppercase tracking-tighter opacity-40">{job.item_type}</span>
                                        <span className={cn(
                                            "text-[8px] font-black uppercase px-2 py-0.5 rounded-full",
                                            job.status === 'done' ? "bg-green-500/10 text-green-600" :
                                            job.status === 'error' ? "bg-red-500/10 text-red-600" :
                                            "bg-blue-500/10 text-blue-600 animate-pulse"
                                        )}>
                                            {job.status}
                                        </span>
                                    </div>
                                    <p className="text-[11px] font-bold text-black/80 line-clamp-1">Syncing to {job.collection_name}</p>
                                    {job.error_msg && (
                                        <p className="text-[9px] font-medium text-red-500 leading-tight border-t border-red-100 pt-1 mt-1">{job.error_msg}</p>
                                    )}
                                    <p className="text-[8px] font-medium text-black/20">{new Date(job.updated_at || job.created_at).toLocaleTimeString()}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border-t border-red-100 flex items-center justify-between px-8">
                    <div className="flex items-center gap-3 text-red-600">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <p className="text-[12px] font-bold">{error}</p>
                    </div>
                    <button onClick={() => setError(null)} className="text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-600">Dismiss</button>
                </div>
            )}
        </div>
    )
}
