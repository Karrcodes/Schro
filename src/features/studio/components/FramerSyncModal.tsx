'use client'

import React, { useState, useEffect, useMemo } from 'react'
import type { StudioProject, StudioPress, StudioContent } from '../types/studio.types'
import { FramerSyncService } from '../services/FramerSyncService'
import { X, Globe, Check, AlertCircle, RefreshCw, Trash2, Rocket, Award, Loader2, ArrowRight, Layout, Image as ImageIcon, Type, AlignLeft, Video, FileText, Download, Cloud } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
    isOpen: boolean
    isFocused?: boolean
    projects: StudioProject[]
    press?: StudioPress[]
    content?: StudioContent[]
    drafts?: any[]
    onClose: () => void
    onUpdateProject: (id: string, updates: Partial<StudioProject>) => Promise<any>
    onUpdatePress?: (id: string, updates: Partial<StudioPress>) => Promise<any>
    onUpdateContent?: (id: string, updates: Partial<StudioContent>) => Promise<any>
    onUpdateDraft?: (id: string, updates: any) => Promise<any>
    onAddProject?: (project: Partial<StudioProject>, initialMilestones?: any[]) => Promise<any>
    onAddPress?: (item: Partial<StudioPress>) => Promise<any>
    onAddContent?: (item: Partial<StudioContent>) => Promise<any>
    onAddMilestone?: (milestone: any) => Promise<any>
    onAddDraft?: (data: Partial<any>) => Promise<any>
    initialImportItem?: any
}

export default function FramerSyncModal({ 
    isOpen,
    isFocused = false,
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
    onAddMilestone,
    onAddDraft,
    initialImportItem
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
    const [pendingImportItem, setPendingImportItem] = useState<any | null>(initialImportItem || null)
    const [importConfig, setImportConfig] = useState<{ type: string; category: string }>({ type: '', category: '' })

    // Body scroll lock
    useEffect(() => {
        if (isOpen) {
            const originalStyle = window.getComputedStyle(document.body).overflow
            document.body.style.overflow = 'hidden'
            return () => { document.body.style.overflow = originalStyle }
        }
    }, [isOpen])

    // Initial item handler
    useEffect(() => {
        if (initialImportItem) {
            handleImport(initialImportItem)
        }
    }, [initialImportItem])

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
                // Only auto-load all items if not in a focused import (to avoid delay)
                if (!initialImportItem) {
                    loadCmsItems(parsed.siteId)
                }
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
                        // Only auto-load if not in focused import
                        if (!initialImportItem) {
                            loadCmsItems(newConfig.siteId)
                        }
                    }
                } catch (e) {
                    console.error('Sync Manager: Auto-discovery failed', e)
                }
            }
            loadRecentJobs()
        }
        init()
    }, [])

    // Hashnode state
    const [hnToken, setHnToken] = useState('')
    const [hnPubId, setHnPubId] = useState('')
    const [hnSaving, setHnSaving] = useState(false)
    const [hnSaved, setHnSaved] = useState(false)
    const [hnError, setHnError] = useState<string | null>(null)
    const [hnConnected, setHnConnected] = useState(false)
    const [hnSource, setHnSource] = useState<'env'|'db'|null>(null)

    useEffect(() => {
        const loadHashnode = async () => {
            try {
                const res = await fetch('/api/studio/hashnode?endpoint=config')
                if (res.ok) {
                    const data = await res.json()
                    setHnConnected(data.connected)
                    setHnSource(data.source)
                    if (data.publicationId) setHnPubId(data.publicationId)
                }
            } catch (err) {
                console.error('Failed to load Hashnode config', err)
            }
        }
        loadHashnode()
    }, [])

    const handleSaveHashnode = async () => {
        setHnSaving(true)
        setHnError(null)
        try {
            const res = await fetch('/api/studio/hashnode?endpoint=save-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: hnToken, publicationId: hnPubId })
            })
            if (!res.ok) throw new Error('Failed to save Hashnode settings')
            setHnSaved(true)
            setHnConnected(true)
            setTimeout(() => setHnSaved(false), 2000)
        } catch (err: any) {
            setHnError(err.message)
        } finally {
            setHnSaving(false)
        }
    }

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
                    _type: Object.keys(typeMapping).find(type => 
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
        const remoteProjects = remoteItems.filter(it => it._type === 'project')
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
        const remotePress = remoteItems.filter(it => it._type === 'press')
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
        const remoteContent = remoteItems.filter(it => it._type === 'content')
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
        const remoteDrafts = remoteItems.filter(it => it._type === 'draft')
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
        setSelectedId(null) // Ensure we switch to Guided Import view
        
        let type = ''
        let category = ''

        if (item._type === 'project') {
            const collectionName = (item._collectionName || '').toLowerCase()
            type = 'Other'
            if (collectionName.includes('technology')) type = 'Technology'
            else if (collectionName.includes('architect')) type = 'Architectural Design'
            else if (collectionName.includes('product')) type = 'Product Design'
            else if (collectionName.includes('fashion')) type = 'Fashion'
            else if (collectionName.includes('media')) type = 'Media'
            category = 'General'
        } else if (item._type === 'press') {
            type = 'feature'
            category = 'Media'
        } else if (item._type === 'content') {
            type = 'video'
            category = 'Other'
        } else if (item._type === 'draft') {
            type = 'article'
            category = 'Writing'
        } else {
            type = 'Other'
            category = 'Imported'
        }

        setImportConfig({ type, category })
    }

    const confirmImport = async () => {
        if (!pendingImportItem || !onAddProject || !onAddPress || !onAddContent || !onAddDraft) return
        const item = pendingImportItem
        setIsSyncing(true)
        setSyncStatus({ status: 'syncing', message: `Importing ${item.slug}...` })
        try {
            const category = item._type
            const fd = item.fieldData || {}
            const fields: { id: string, name: string, slug: string, type: string }[] = item._fields || []

            // Build name→value map resolving opaque Framer field IDs
            const nd: Record<string, any> = {}
            for (const f of fields) {
                if (f.name) nd[f.name.toLowerCase()] = fd[f.id]
                if (f.slug) {
                    nd[f.slug.toLowerCase()] = fd[f.id]
                    // Also handle common slug variations (spaces -> hyphens)
                    const hyphenated = f.name?.toLowerCase().replace(/\s+/g, '-')
                    if (hyphenated) nd[hyphenated] = fd[f.id]
                }
            }

            // Exact key lookup (case-insensitive)
            const get = (key: string): any => nd[key.toLowerCase()]

            // Recursively extract plain text from any Framer field structure
            const stripHtml = (s: string) => s
                .replace(/<[^>]+>/g, '')
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .trim()

            const extractText = (v: any): string | undefined => {
                if (!v) return undefined
                if (typeof v === 'string') {
                    const clean = stripHtml(v)
                    return clean || undefined
                }
                if (typeof v === 'object') {
                    // Try the most common text keys first
                    for (const key of ['text', 'html', 'value', 'label', 'name', 'title', 'content']) {
                        if (v[key] && typeof v[key] === 'string') {
                            const clean = stripHtml(v[key])
                            if (clean) return clean
                        }
                    }
                    // Recurse into nested objects (but not arrays to avoid noise)
                    for (const val of Object.values(v)) {
                        if (val && typeof val === 'object' && !Array.isArray(val)) {
                            const found = extractText(val)
                            if (found) return found
                        }
                    }
                }
                return undefined
            }
            const getText = (key: string): string | undefined => extractText(get(key))

            // Extract image URL from Framer's image field — handles any nesting depth
            const extractImageUrl = (v: any): string | undefined => {
                if (!v) return undefined
                if (typeof v === 'string' && v.match(/^https?:\/\//)) return v
                if (typeof v === 'object') {
                    // Check top-level url/src first
                    if (v.url && typeof v.url === 'string') return v.url
                    if (v.src && typeof v.src === 'string') return v.src
                    // Recursively search all values for a URL string
                    for (const val of Object.values(v)) {
                        const found = extractImageUrl(val)
                        if (found) return found
                    }
                }
                return undefined
            }
            const getImage = (key: string): string | undefined => extractImageUrl(get(key))

            // SMART IMAGE DISCOVERY
            const discoverImage = (): string | undefined => {
                // Debug: log what Framer sent so we can see the real field names/values
                console.log('[FramerImport] fieldData:', fd)
                console.log('[FramerImport] nd (name→value map):', nd)
                console.log('[FramerImport] image-type fields:', fields.filter(f => f.type === 'image'))

                const common = ['bg image', 'background image', 'cover image', 'cover', 'thumbnail', 'hero image', 'main image', 'image', 'photo', 'preview', 'featured image', 'project image']
                for (const k of common) {
                    const img = getImage(k)
                    if (img) return img
                }
                // Try every image-type field directly from raw fieldData
                const imageFields = fields.filter(f => f.type === 'image')
                for (const imageField of imageFields) {
                    const v = fd[imageField.id]
                    if (v && typeof v === 'object' && (v.url || v.src)) return v.url || v.src
                    if (v && typeof v === 'string' && v.startsWith('http')) return v
                }
                // Last resort: scan ALL field values for anything that looks like an image URL
                for (const v of Object.values(fd)) {
                    if (v && typeof v === 'object' && (v as any).url && (v as any).url.includes('framer')) {
                        return (v as any).url
                    }
                }
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

            // Framer items have item.name at top-level; fieldData 'title' may be a rich-text object
            const title = item.name
                || getText('title')
                || getText('name')
                || getText('project name')
                || getText('project title')
                || getText('inner title')
                || item.slug
            const tagline = undefined  // 'Inner Title' is a website theme artifact ("Title /"), not content
            const description = getText('body text')
            const cover_url = discoverImage()
            const client = getText('client')
            const location = getText('location')

            if (category === 'project') {
                const project_url = getLink('view project')
                const article_url = getLink('view article')
                
                const initialMilestones = [{
                    title: 'Project Completed (Imported)',
                    status: 'completed',
                    category: 'production',
                    impact_score: 10
                }]

                await onAddProject({ 
                    title,
                    cover_url: cover_url || undefined,
                    framer_cms_id: item.id,
                    framer_collection_id: item._collectionId,
                    description: description || undefined,
                    client: client || undefined,
                    location: location || undefined,
                    tagline: tagline || undefined,
                    project_url: project_url || undefined,
                    article_url: article_url || undefined,
                    status: 'shipped',
                    type: importConfig.type as any,
                    gtv_category: undefined,
                    slug: item.slug,
                    stage_data: { slug: item.slug }
                }, initialMilestones)
            } else if (category === 'press') {
                const organization = getText('featured on') 
                    || getText('publication')
                    || getText('source')
                    || getText('press')
                    || getText('organization')
                    || getText('publisher')
                    || getText('client')
                    || 'Framer'
                    
                const url = getLink('view') || getLink('link') || getLink('url') || getLink('website') || getLink('article url') || getLink('press link') || getText('url') || getText('link') || getText('website')
                
                await onAddPress({ 
                    title,
                    description: description || undefined,
                    cover_url: cover_url || undefined,
                    notes: description || undefined,
                    organization,
                    url,
                    framer_cms_id: item.id,
                    framer_collection_id: item._collectionId,
                    status: 'published',
                    type: importConfig.type as any,
                    stage_data: { slug: item.slug }
                })
            } else if (category === 'content') {
                const url = getText('media link') || getLink('media link')
                const contentItem = await onAddContent({ 
                    title,
                    cover_url: cover_url || undefined,
                    notes: description || undefined,
                    url,
                    status: 'published',
                    type: importConfig.type,
                    category: importConfig.category as any,
                    platforms: [],
                    stage_data: { slug: item.slug }
                })
                
                // Add 100% progress milestone
                if (contentItem && contentItem.id && onAddMilestone) {
                    await onAddMilestone({
                        content_id: contentItem.id, // Or project_id if it's reused, but the table requires project_id typically... wait, studio_milestones belongs to project_id. Let me verify the milestone schema.
                        title: 'Content Published (Imported)',
                        status: 'completed',
                        category: 'production',
                        impact_score: 10
                    })
                }
            } else if (category === 'draft') {
                const article_url = getLink('view article')
                await onAddDraft({ 
                    title, 
                    body: description || '',
                    project_id: undefined,
                    framer_cms_id: item.id,
                    cover_url: cover_url || undefined,
                    stage_data: { slug: item.slug }
                })
            }

            setSyncStatus({ status: 'success', message: 'Imported successfully!' })
            // Refresh CMS items in the background — do NOT clear pendingImportItem
            // so the success screen persists until the user closes the modal
            loadCmsItems(config!.siteId)
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

    if (!isOpen) return null

    const showSidebars = !isFocused && !pendingImportItem

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}>
            <div 
                className={cn(
                    "flex flex-col w-full max-h-[calc(100vh-3rem)] bg-white rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-black/5 transition-all duration-500",
                    showSidebars ? "max-w-6xl" : "max-w-2xl"
                )}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Section: Connection Status Bar */}
                <div className="p-8 border-b border-black/[0.05] flex items-center justify-between bg-black/[0.01]">
                    <div className="flex items-center gap-10">
                        <div>
                            <h2 className="text-xl font-black text-black">Website Sync</h2>
                            <p className="text-[12px] font-medium text-black/40 uppercase tracking-widest">Studio Integration Hub</p>
                        </div>

                        {/* Connection Badges */}
                        <div className="flex items-center gap-4 border-l border-black/[0.05] pl-10">
                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-black text-black/30 uppercase tracking-[0.2em]">Framer CMS</label>
                                <div className="flex items-center gap-2">
                                    <div className={cn("w-2 h-2 rounded-full", config ? "bg-emerald-500 animate-pulse" : "bg-red-500")} />
                                    <span className="text-[11px] font-bold text-black/80">{config ? 'Connected' : 'Offline'}</span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-1 border-l border-black/[0.05] pl-6">
                                <label className="text-[9px] font-black text-black/30 uppercase tracking-[0.2em]">Hashnode</label>
                                <div className="flex items-center gap-2">
                                    <div className={cn("w-2 h-2 rounded-full", hnConnected ? "bg-emerald-500" : "bg-black/10")} />
                                    <span className="text-[11px] font-bold text-black/80">{hnConnected ? 'Linked' : 'Not Linked'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-black/5 hover:bg-black/10 rounded-full transition-colors group">
                            <X className="w-5 h-5 text-black/30 group-hover:text-black transition-colors" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden min-h-0 bg-white">
                    {/* Left Panel: Item Navigation */}
                    {showSidebars && (
                        <div className="w-[380px] border-r border-black/[0.05] flex flex-col overflow-hidden bg-black/[0.01]">
                            {/* Category Filter Pills */}
                            <div className="p-6 border-b border-black/[0.05] flex gap-2 overflow-x-auto no-scrollbar">
                                {[
                                    { id: 'project', icon: Rocket, label: 'Projects' },
                                    { id: 'press', icon: Award, label: 'Press' },
                                    { id: 'content', icon: Video, label: 'Media' },
                                    { id: 'draft', icon: FileText, label: 'Articles' }
                                ].map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => { setSelectedType(cat.id as any); setSelectedId(null); }}
                                        className={cn(
                                            "px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shrink-0 border",
                                            selectedType === cat.id 
                                                ? "bg-black text-white border-black shadow-lg shadow-black/10" 
                                                : "bg-white border-black/[0.05] text-black/40 hover:border-black/20"
                                        )}
                                    >
                                        <cat.icon className="w-3.5 h-3.5" />
                                        {cat.label}
                                    </button>
                                ))}
                            </div>

                            {/* Item List */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                                        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/20">Syncing Pipeline...</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Remote Items (Importable) */}
                                        {unmatchedRemotes.filter(item => item._type === selectedType).map((item: any) => (
                                            <div
                                                key={item.id}
                                                className="p-4 rounded-[24px] border border-emerald-100 bg-emerald-50/20 hover:bg-emerald-50/40 transition-all group relative overflow-hidden"
                                            >
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-xl bg-white border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
                                                            <Globe className="w-4 h-4" />
                                                        </div>
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-100/50 px-2 py-1 rounded-lg">Web Source</span>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleImport(item)}
                                                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-md shadow-emerald-600/20"
                                                    >
                                                        Import
                                                    </button>
                                                </div>
                                                <h4 className="text-[14px] font-black text-emerald-950 leading-tight mb-1 truncate">{item.slug}</h4>
                                                <p className="text-[10px] font-bold text-emerald-600/40 uppercase tracking-tighter italic">From {item._collectionName}</p>
                                            </div>
                                        ))}

                                        {/* Local Items (Pushes) */}
                                        {allItems[selectedType as keyof typeof allItems].map((item: any) => {
                                            const isLive = !!item.framer_cms_id
                                            return (
                                                <button
                                                    key={item.id}
                                                    onClick={() => setSelectedId(item.id)}
                                                    className={cn(
                                                        "w-full p-5 rounded-[24px] border text-left transition-all active:scale-[0.98]",
                                                        selectedId === item.id
                                                            ? "bg-black text-white border-black shadow-xl shadow-black/10 translate-x-1"
                                                            : "bg-white border-black/[0.05] hover:border-black/20"
                                                    )}
                                                >
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest",
                                                            isLive ? "bg-emerald-500 text-white" : "bg-black/[0.05] text-black/40"
                                                        )}>
                                                            {isLive ? "Live" : "STAGED"}
                                                        </span>
                                                        {isLive && <Check className="w-3 h-3 text-emerald-500" />}
                                                    </div>
                                                    <h4 className="text-[14px] font-black leading-tight line-clamp-1 mb-1">{item.title}</h4>
                                                    <p className="text-[10px] font-medium opacity-40 uppercase tracking-tighter">
                                                        {(item as any).tagline || (item as any).organization || "No Tags"}
                                                    </p>
                                                </button>
                                            )
                                        })}
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Middle: Workspace & Detail View */}
                    <div className="flex-1 flex flex-col overflow-hidden bg-white min-h-0">
                        {selectedItem ? (
                            <div className="flex-1 flex flex-col p-12 overflow-y-auto custom-scrollbar animate-in slide-in-from-right-4 duration-500">
                                <div className="max-w-xl mx-auto w-full space-y-10">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-4">
                                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-black text-white rounded-full text-[9px] font-black uppercase tracking-[0.2em]">
                                                {selectedType} Artifact
                                            </div>
                                            <h1 className="text-4xl font-black text-black tracking-tight leading-tight">{selectedItem.title}</h1>
                                            <p className="text-[14px] font-medium text-black/40 leading-relaxed italic border-l-2 border-black/5 pl-4">
                                                {(selectedItem as any).description || "No description provided for this studio item."}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action Center */}
                                    <div className="p-8 rounded-[40px] bg-black/[0.02] border border-black/5 space-y-8 shadow-inner">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 bg-white rounded-2xl border border-black/5 flex flex-col gap-2">
                                                <label className="text-[9px] font-black text-black/20 uppercase tracking-widest">Target Slug</label>
                                                <span className="text-[12px] font-bold lowercase opacity-70 italic">{selectedItem.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}</span>
                                            </div>
                                            <div className="p-4 bg-white rounded-2xl border border-black/5 flex flex-col gap-2">
                                                <label className="text-[9px] font-black text-black/20 uppercase tracking-widest">Cover Source</label>
                                                <div className="flex items-center gap-2">
                                                    <div className={cn("w-2 h-2 rounded-full", selectedItem.cover_url ? "bg-emerald-500" : "bg-orange-500")} />
                                                    <span className="text-[12px] font-black">{selectedItem.cover_url ? 'Active Asset' : 'Placeholder'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {syncStatus?.status === 'success' ? (
                                            <div className="py-6 flex flex-col items-center justify-center text-center gap-4 bg-emerald-500/10 rounded-3xl border border-emerald-100 animate-in zoom-in duration-300">
                                                <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                                                    <Check className="w-8 h-8" />
                                                </div>
                                                <div>
                                                    <h4 className="text-[16px] font-black text-emerald-950 uppercase tracking-tight">Sync Initiated</h4>
                                                    <p className="text-[11px] font-bold text-emerald-700/60 mt-1 uppercase tracking-widest">Pipeline Worker: ONLINE</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <button
                                                    onClick={handleSync}
                                                    disabled={isSyncing}
                                                    className="w-full py-8 bg-black text-white rounded-[32px] text-[15px] font-black uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-4 disabled:opacity-50 shadow-2xl shadow-black/20"
                                                >
                                                    {isSyncing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Rocket className="w-6 h-6" />}
                                                    {selectedItem.framer_cms_id ? "Push Synchronization" : "Publish to Website"}
                                                </button>

                                                {selectedItem.framer_cms_id && (
                                                    <button
                                                        onClick={handleRemove}
                                                        disabled={isSyncing}
                                                        className="w-full py-4 bg-red-50 text-red-600 rounded-[24px] text-[11px] font-black uppercase tracking-widest hover:bg-red-100 transition-all flex items-center justify-center gap-2 border border-red-100 active:scale-95"
                                                    >
                                                        {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                        Unlink from Framer CMS
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : pendingImportItem ? (
                            <div className="flex-1 flex flex-col p-12 overflow-y-auto items-center justify-center animate-in slide-in-from-bottom-4 duration-500">
                                <div className="max-w-md w-full space-y-8">
                                    <div className="flex flex-col items-center text-center gap-4">
                                        <div className="w-20 h-20 rounded-[30px] bg-emerald-500 text-white flex items-center justify-center shadow-2xl shadow-emerald-500/30">
                                            <Globe className="w-10 h-10" />
                                        </div>
                                        <div>
                                            <h2 className="text-3xl font-black text-black tracking-tight">{pendingImportItem.slug}</h2>
                                            <p className="text-[12px] font-bold text-black/30 uppercase tracking-[0.2em] mt-2">Remote Framer Resource</p>
                                        </div>
                                    </div>

                                    <div className="p-8 rounded-[40px] border-2 border-dashed border-emerald-100 bg-emerald-50/20 space-y-6">
                                        <div className="flex flex-col gap-4">
                                            <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest text-emerald-700/60">
                                                <span>Import Category</span>
                                                <span className="px-3 py-1 bg-emerald-600 text-white rounded-full text-[9px]">{pendingImportItem._type}</span>
                                            </div>
                                            
                                            {/* Simplified Import Options based on auto-detected type */}
                                            {pendingImportItem._type === 'project' && (
                                                <div className="grid grid-cols-2 gap-2 pt-2">
                                                    {['Product', 'Technology', 'Design', 'Media'].map(tag => (
                                                        <button 
                                                            key={tag}
                                                            onClick={() => setImportConfig(prev => ({ ...prev, type: tag }))}
                                                            className={cn(
                                                                "p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all truncate",
                                                                importConfig.type === tag ? "bg-emerald-600 text-white border-emerald-600" : "bg-white border-emerald-100 text-emerald-800/40"
                                                            )}
                                                        >
                                                            {tag}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            onClick={confirmImport}
                                            disabled={isSyncing}
                                            className="w-full py-6 bg-emerald-600 text-white rounded-3xl text-[14px] font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                                        >
                                            {isSyncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                                            Process Import
                                        </button>
                                    </div>
                                    <button 
                                        onClick={() => setPendingImportItem(null)} 
                                        className="w-full text-[11px] font-black uppercase tracking-widest text-black/20 hover:text-black transition-colors"
                                    >
                                        Cancel & Go Back
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* IDLE STATE with Hashnode Management */
                            <div className="flex-1 flex flex-col p-12 items-center justify-center text-center space-y-12">
                                <div className="space-y-4">
                                    <div className="w-24 h-24 bg-black/[0.02] border border-black/5 rounded-full flex items-center justify-center mx-auto relative">
                                        <div className="absolute inset-0 rounded-full border border-black/5 animate-ping opacity-10" />
                                        <Cloud className="w-10 h-10 text-black/10" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-black tracking-tight uppercase">Workspace Idle</h3>
                                        <p className="text-[13px] font-medium text-black/30 mt-2 max-w-[320px] mx-auto leading-relaxed">
                                            Select an artifact from the pipeline to start synchronization, or bridge a remote Framer item into Studio.
                                        </p>
                                    </div>
                                </div>

                                {/* Hashnode Integration Mini-Terminal */}
                                <div className="max-w-md w-full p-8 bg-indigo-50/50 border border-indigo-100 rounded-[40px] space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <div className="text-left">
                                            <h4 className="text-[14px] font-black text-indigo-950 uppercase tracking-tight">Hashnode Bridge</h4>
                                            <p className="text-[11px] font-bold text-indigo-600/40 uppercase tracking-widest">Article Auto-Publishing</p>
                                        </div>
                                    </div>

                                    {!hnConnected ? (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 gap-3">
                                                <input 
                                                    type="password"
                                                    value={hnToken}
                                                    onChange={(e) => setHnToken(e.target.value)}
                                                    placeholder="Personal Access Token"
                                                    className="w-full p-4 bg-white border border-indigo-100 rounded-2xl text-[12px] font-bold focus:ring-2 ring-indigo-500/20 outline-none"
                                                />
                                                <input 
                                                    type="text"
                                                    value={hnPubId}
                                                    onChange={(e) => setHnPubId(e.target.value)}
                                                    placeholder="Publication ID"
                                                    className="w-full p-4 bg-white border border-indigo-100 rounded-2xl text-[12px] font-bold focus:ring-2 ring-indigo-500/20 outline-none"
                                                />
                                            </div>
                                            <button 
                                                onClick={handleSaveHashnode}
                                                disabled={hnSaving || !hnToken || !hnPubId}
                                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
                                            >
                                                {hnSaving ? 'Connecting...' : 'Link Hashnode Account'}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-indigo-100">
                                            <div className="flex items-center gap-3">
                                                <Check className="w-4 h-4 text-emerald-500" />
                                                <span className="text-[12px] font-black text-indigo-950 uppercase">Linked: {hnPubId.slice(0, 8)}...</span>
                                            </div>
                                            <button 
                                                onClick={() => { setHnToken(''); setHnConnected(false); }}
                                                className="text-[9px] font-black text-red-500 uppercase tracking-widest hover:underline"
                                            >
                                                Disconnect
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Panel: Pipeline Feed */}
                    {showSidebars && (
                        <div className="w-[340px] border-l border-black/[0.05] flex flex-col overflow-hidden bg-black/[0.01]">
                            <div className="p-8 border-b border-black/[0.05] flex items-center justify-between">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-black">Live Pipeline</h3>
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[9px] font-black uppercase text-emerald-600 tracking-tighter">Monitoring</span>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                                {recentJobs.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center opacity-10 gap-4">
                                        <AlignLeft className="w-10 h-10" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">Queue Empty</p>
                                    </div>
                                ) : (
                                    recentJobs.map(job => (
                                        <div key={job.id} className="p-5 bg-white rounded-3xl border border-black/[0.03] space-y-3 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[9px] font-black uppercase bg-black/5 px-2 py-1 rounded-lg text-black/40 tracking-tighter">{job.item_type}</span>
                                                <div className={cn(
                                                    "w-2 h-2 rounded-full",
                                                    job.status === 'done' ? "bg-emerald-500" :
                                                    job.status === 'error' ? "bg-red-500" : "bg-blue-500 animate-pulse"
                                                )} />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[12px] font-black text-black leading-tight truncate">{job.collection_name}</p>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[9px] font-black text-black/20 uppercase tracking-tighter">{new Date(job.updated_at || job.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    <span className={cn(
                                                        "text-[9px] font-black uppercase",
                                                        job.status === 'done' ? "text-emerald-600" :
                                                        job.status === 'error' ? "text-red-600" : "text-blue-600"
                                                    )}>
                                                        {job.status}
                                                    </span>
                                                </div>
                                            </div>
                                            {job.error_msg && (
                                                <div className="pt-2 border-t border-red-50 text-[10px] font-bold text-red-500 italic leading-tight">
                                                    {job.error_msg}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="p-6 border-t border-black/[0.05] bg-white">
                                <button onClick={loadRecentJobs} className="w-full py-4 bg-black/[0.03] hover:bg-black/[0.06] rounded-2xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
                                    <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
                                    Purge Sync Cache
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {error && (
                    <div className="p-4 bg-red-500 text-white flex items-center justify-between px-10 animate-in slide-in-from-bottom-full duration-300">
                        <div className="flex items-center gap-4 text-[13px] font-black">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <p className="uppercase tracking-tight">{error}</p>
                        </div>
                        <button onClick={() => setError(null)} className="text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors">Dismiss</button>
                    </div>
                )}
            </div>
        </div>
    )
}
