'use client'

import React, { useState } from 'react'
import { Shield, ExternalLink, Calendar, Award, CheckCircle2, Plus, Rocket, Globe, X, Orbit, Trash2, Eye, Layout, Type, Video, ArrowRight, MoreVertical, RefreshCw, ChevronDown, GraduationCap, Settings, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

import { useStudio } from '@/features/studio/hooks/useStudio'
import { useDrafts } from '@/features/studio/hooks/useDrafts'
import { useSystemSettings } from '@/features/system/contexts/SystemSettingsContext'
import Link from 'next/link'
import type { StudioProject, StudioPress } from '@/features/studio/types/studio.types'
import FramerSyncSettings from '@/features/studio/components/FramerSyncSettings'
import FramerSyncModal from '@/features/studio/components/FramerSyncModal'
import StagingEnrichmentModal from '@/features/studio/components/StagingEnrichmentModal'
import ConfirmationModal from '@/components/ConfirmationModal'
import { Settings as SettingsIcon, FileDown, Loader2, Database } from 'lucide-react'
import { FramerSyncService } from '@/features/studio/services/FramerSyncService'
import PortfolioDetailModal from '@/features/studio/components/PortfolioDetailModal'
import FramerImportGuide from '@/features/studio/components/FramerImportGuide'
import BulkImportModal from '@/features/studio/components/BulkImportModal'

function ScanningLoader() {
    return (
        <div className="col-span-full py-24 bg-white rounded-[40px] border border-dashed border-black/10 flex flex-col items-center justify-center text-center animate-in fade-in duration-500">
            <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 mb-6 relative">
                <Orbit className="w-10 h-10 animate-spin-slow relative z-10" />
                <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-full animate-pulse" />
            </div>
            
            <h3 className="text-xl font-black text-black mb-2 uppercase tracking-tight flex items-center gap-3 justify-center">
                Scanning CMS
                <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
                </span>
            </h3>
            <p className="text-[14px] font-medium text-black/40 max-w-sm mx-auto">
                We're checking your Framer collections for new or orphaned items.
            </p>
        </div>
    )
}

export default function PortfolioPage() {
    const { projects, press, content, updateProject, updatePress, updateContent, addProject, addPress, addContent, addMilestone, stageItem, refresh } = useStudio()
    const { drafts, updateDraft, createDraft, refresh: refreshDrafts } = useDrafts()
    const { settings } = useSystemSettings()
    const [showSettings, setShowSettings] = useState(false)
    const [showSyncModal, setShowSyncModal] = useState(false)
    const [showDocument, setShowDocument] = useState(false)
    const [isSyncing, setIsSyncing] = useState(false)
    const [activeHubTab, setActiveHubTab] = useState<'staged' | 'live' | 'unsynced'>('staged')
    const [selectedImportItem, setSelectedImportItem] = useState<any | null>(null)
    const [selectedStagingItem, setSelectedStagingItem] = useState<{ item: any, type: any } | null>(null)
    const [unstageConfirmItem, setUnstageConfirmItem] = useState<{ id: string, type: any, title: string } | null>(null)
    const [unsyncConfirmItem, setUnsyncConfirmItem] = useState<{ item: any, title: string } | null>(null)
    const [showBulkImportModal, setShowBulkImportModal] = useState(false)
    const [viewMode, setViewMode] = useState<'portfolio' | 'sync'>('sync')
    const [discoveredItems, setDiscoveredItems] = useState<any[]>([])
    const [ghostIds, setGhostIds] = useState<Set<string>>(new Set())
    const [isLoadingDiscovery, setIsLoadingDiscovery] = useState(false)
    const [activeCategoryTab, setActiveCategoryTab] = useState<'all' | 'project' | 'press' | 'media' | 'article'>('all')
    const [activeProjectSubTab, setActiveProjectSubTab] = useState<string>('all')
    const [selectedDetailItem, setSelectedDetailItem] = useState<{ item: any, coverUrl: string | null, displayTitle: string } | null>(null)
    
    // Pagination state
    const [stagedLimit, setStagedLimit] = useState(6)
    const [liveLimit, setLiveLimit] = useState(6)
    const [unsyncedLimit, setUnsyncedLimit] = useState(6)

    const portfolioProjects = projects.filter(p => p.gtv_featured)
    const portfolioPress = press.filter(p => p.is_portfolio_item && (p.status === 'achieved' || p.status === 'published'))
    
    // Staging Hub Filters
    const stagedItems = [
        ...projects.filter(p => p.is_staged && (!p.framer_cms_id || p.framer_cms_id === '')).map(p => ({ ...p, _type: 'project' as const })),
        ...press.filter(p => p.is_staged && (!p.framer_cms_id || p.framer_cms_id === '')).map(p => ({ ...p, _type: 'press' as const })),
        // content uses status='published' as live signal (no framer_cms_id column)
        ...content.filter(c => c.is_staged && c.status !== 'published').map(c => ({ ...c, _type: 'content' as const })),
        ...drafts.filter(d => d.is_staged && (!d.framer_cms_id || d.framer_cms_id === '')).map(d => ({ ...d, _type: 'draft' as const }))
    ]

    const liveItems = [
        ...projects.filter(p => p.framer_cms_id && p.framer_cms_id !== '').map(p => ({ ...p, _type: 'project' as const })),
        ...press.filter(p => p.framer_cms_id && p.framer_cms_id !== '').map(p => ({ ...p, _type: 'press' as const })),
        // content has no framer_cms_id column - use status='published' as live signal
        ...content.filter(c => c.status === 'published').map(c => ({ ...c, _type: 'content' as const })),
        ...drafts.filter(d => d.framer_cms_id && d.framer_cms_id !== '').map(d => ({ ...d, _type: 'draft' as const }))
    ]

    const getProjectCategory = (item: any) => {
        return item.category || item.type || item._collectionName || item.fieldData?.Category || item.stage_data?.fieldData?.Category || 'General'
    }

    const filterBySubcategory = (item: any) => {
        if (item._type !== 'project') return true
        if (activeProjectSubTab === 'all') return true
        return getProjectCategory(item) === activeProjectSubTab
    }

    const filteredStaged = activeCategoryTab === 'all' 
        ? stagedItems 
        : stagedItems.filter(item => {
            if (activeCategoryTab === 'media') return item._type === 'content'
            if (activeCategoryTab === 'article') return item._type === 'draft'
            if (activeCategoryTab === 'project') return item._type === 'project' && filterBySubcategory(item)
            return item._type === activeCategoryTab
        })

    const filteredLive = activeCategoryTab === 'all'
        ? liveItems
        : liveItems.filter(item => {
            if (activeCategoryTab === 'media') return item._type === 'content'
            if (activeCategoryTab === 'article') return item._type === 'draft'
            if (activeCategoryTab === 'project') return item._type === 'project' && filterBySubcategory(item)
            return item._type === activeCategoryTab
        })

    const filteredDiscovered = activeCategoryTab === 'all'
        ? discoveredItems
        : discoveredItems.filter(item => {
            if (activeCategoryTab === 'media') return item._type === 'content'
            if (activeCategoryTab === 'article') return item._type === 'draft'
            if (activeCategoryTab === 'project') return item._type === 'project' && filterBySubcategory(item)
            return item._type === activeCategoryTab
        })

    const projectSubcategories = React.useMemo(() => {
        const categories = new Set<string>()
        const allProjects = [...stagedItems, ...liveItems, ...discoveredItems].filter(i => i._type === 'project')
        allProjects.forEach(p => {
            const cat = getProjectCategory(p)
            if (cat && typeof cat === 'string') categories.add(cat)
        })
        return Array.from(categories).sort()
    }, [stagedItems, liveItems, discoveredItems])

    const evidenceCount = portfolioProjects.length + portfolioPress.length

    // DISCOVERY LOGIC - Fetch unmatched items from Framer (with 5-min cooldown)
    React.useEffect(() => {
        const discover = async () => {
            const lastDiscovery = localStorage.getItem('last_cms_discovery_timestamp')
            const now = Date.now()
            
            // Re-run if never run, or if it's been > 5 minutes (300,000 ms)
            if (lastDiscovery && (now - parseInt(lastDiscovery)) < 300000) {
                console.log('CMS Manager: Skipping auto-discovery (5-min cooldown active)')
                return
            }

            const stored = localStorage.getItem('framer_sync_config')
            if (!stored) return
            const { siteId } = JSON.parse(stored)
            if (!siteId) return

            setIsLoadingDiscovery(true)
            try {
                const [unmatched, ghosts] = await Promise.all([
                    FramerSyncService.getUnmatchedItems(siteId, projects, press, content, drafts),
                    FramerSyncService.getGhostItems(siteId, projects, press, content, drafts)
                ])
                setDiscoveredItems(unmatched)
                setGhostIds(ghosts)
                localStorage.setItem('last_cms_discovery_timestamp', now.toString())
            } catch (e) {
                console.error('Discovery failed', e)
            } finally {
                setIsLoadingDiscovery(false)
            }
        }
        discover()
    }, [projects, press, content, drafts])

    const handleRefreshAll = async () => {
        setIsLoadingDiscovery(true)
        try {
            // 1. Refresh local Studio data
            await refresh()
            await refreshDrafts()

            // 2. Refresh CMS discovery (manual override ignores cooldown)
            const stored = localStorage.getItem('framer_sync_config')
            if (stored) {
                const { siteId } = JSON.parse(stored)
                if (siteId) {
                    const [unmatched, ghosts] = await Promise.all([
                        FramerSyncService.getUnmatchedItems(siteId, projects, press, content, drafts),
                        FramerSyncService.getGhostItems(siteId, projects, press, content, drafts)
                    ])
                    setDiscoveredItems(unmatched)
                    setGhostIds(ghosts)
                    localStorage.setItem('last_cms_discovery_timestamp', Date.now().toString())
                }
            }
        } catch (e) {
            console.error('Global refresh failed', e)
        } finally {
            setIsLoadingDiscovery(false)
        }
    }

    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        if (params.get('framer_sync') === 'success') {
            setShowSettings(true)
            // Clean up the URL
            window.history.replaceState({}, '', window.location.pathname)
        }
    }, [])

    const handleSyncAll = async () => {
        if (stagedItems.length === 0) {
            alert("No items staged for publication.")
            return
        }

        const stored = localStorage.getItem('framer_sync_config')
        if (!stored) {
            setShowSettings(true)
            return
        }

        const { siteId, collectionId } = JSON.parse(stored)
        setIsSyncing(true)

        try {
            let successCount = 0
            for (const item of stagedItems) {
                const res = await fetch('/api/studio/framer-sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        localId: item.id,
                        type: item._type,
                        siteId,
                        collectionId,
                        data: item
                    })
                })
                if (res.ok) successCount++
            }
            refresh()
            alert(`Sync complete! Successfully updated ${successCount} items on the website.`)
        } catch (e) {
            console.error('Batch sync failed', e)
            alert("Something went wrong during sync. Check the console for details.")
        } finally {
            setIsSyncing(false)
        }
    }

    const handleImport = async (remoteItem: any) => {
        setIsSyncing(true)
        try {
            const mapped = FramerSyncService.mapRemoteToLocal(remoteItem)
            const type = remoteItem._type
            
            if (type === 'project') await addProject(mapped)
            else if (type === 'press') await addPress(mapped)
            else if (type === 'content') await addContent(mapped)
            else if (type === 'draft') await createDraft(mapped)
            
            await refresh()
            await handleRefreshAll() // Refresh discovery list
        } catch (e) {
            console.error('Import failed', e)
        } finally {
            setIsSyncing(false)
            // setSelectedImportItem is now handled by the modal close
        }
    }

    const handleImportAll = async () => {
        setShowBulkImportModal(true)
    }

    const executeBulkImport = async () => {
        setIsSyncing(true)
        let successCount = 0
        let failCount = 0
        
        try {
            for (const item of discoveredItems) {
                try {
                    const mapped = FramerSyncService.mapRemoteToLocal(item)
                    const type = item._type
                    let result: any = null
                    if (type === 'project') result = await addProject(mapped)
                    else if (type === 'press') result = await addPress(mapped)
                    else if (type === 'content') result = await addContent(mapped)
                    else if (type === 'draft') result = await createDraft(mapped)

                    if (result) {
                        successCount++
                    } else {
                        // Some hooks return null instead of throwing on certain DB errors
                        throw new Error('Database insert returned no data')
                    }
                } catch (e: any) {
                    console.error(`Failed to import item: ${item.name || item.slug}`, e)
                    failCount++
                }
            }
            await refresh()
            await handleRefreshAll()

            if (failCount > 0) {
                alert(`Bulk import complete with issues.\n\nSuccess: ${successCount}\nFailed: ${failCount}\n\nCheck the browser console (F12) for specific item errors.`)
            } else {
                alert(`Successfully imported all ${successCount} items!`)
            }
        } catch (error) {
            console.error('Critical failure in bulk import loop:', error)
            alert("A critical error occurred during the bulk import process. Please check the console.")
        } finally {
            setIsSyncing(false)
            setShowBulkImportModal(false)
        }
    }

    const handleUnsync = async (item: any) => {
        setUnsyncConfirmItem({ item, title: item.title })
    }

    const executeUnsync = async (item: any) => {
        setIsSyncing(true)
        try {
            const data = { framer_cms_id: null as any, framer_collection_id: null as any }
            if (item._type === 'project') await updateProject(item.id, data)
            else if (item._type === 'press') await updatePress(item.id, data)
            else if (item._type === 'draft') await updateDraft(item.id, data)
            
            await refresh()
            await refreshDrafts()
            // Remove from ghostIds locally
            const nextGhosts = new Set(ghostIds)
            nextGhosts.delete(item.id)
            setGhostIds(nextGhosts)
        } catch (e) {
            console.error('Unsync failed', e)
            alert("Failed to un-sync item.")
        } finally {
            setIsSyncing(false)
        }
    }

    return (
        <main className="pb-20 pt-8 md:pt-10 px-6 md:px-10 flex flex-col flex-1">
            <div className="w-full max-w-7xl mx-auto space-y-8 flex-1">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-1">
                        <h2 className="text-[11px] font-black text-orange-500 uppercase tracking-[0.3em]">Creative Protocol</h2>
                        <h1 className="text-4xl font-black text-black tracking-tighter uppercase grayscale">Portfolio Hub</h1>
                    </div>

                    <div className="flex items-center gap-3 self-start sm:self-auto mb-1">
                        {/* View toggle */}
                        <div className="flex bg-black/[0.03] p-1.5 rounded-2xl border border-black/[0.05] items-center gap-0.5 h-[42px]">
                            {[
                                { label: 'CMS Manager', value: 'sync' as const, icon: RefreshCw },
                                { label: 'Portfolio', value: 'portfolio' as const, icon: Layout, isComingSoon: true },
                            ].map(({ label, value, icon: Icon, isComingSoon }) => (
                                <button
                                    key={value}
                                    onClick={() => !isComingSoon && setViewMode(value)}
                                    disabled={isComingSoon}
                                    className={cn(
                                        "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-tight transition-all h-full relative group",
                                        viewMode === value ? 'bg-white text-black shadow-sm' : 'text-black/30 hover:text-black/60',
                                        isComingSoon && "cursor-not-allowed opacity-50 grayscale"
                                    )}
                                >
                                    {isComingSoon ? (
                                        <Lock className="w-3.5 h-3.5 text-black/20" />
                                    ) : (
                                        <Icon className={cn("w-3.5 h-3.5", viewMode === value ? (value === 'portfolio' ? "text-emerald-500" : "text-blue-500") : "text-black/20")} />
                                    )}
                                    <span>{label}</span>
                                    {isComingSoon && (
                                        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-black/5 text-[8px] font-black tracking-tighter text-black/40">
                                            SOON
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>


                {/* Settings Modal */}
                {showSettings && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
                        <div className="relative bg-white rounded-[40px] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
                            <FramerSyncSettings onClose={() => setShowSettings(false)} />
                        </div>
                    </div>
                )}

                {/* Staging Enrichment Modal */}
                {selectedStagingItem && (
                    <StagingEnrichmentModal 
                        isOpen={!!selectedStagingItem}
                        onClose={() => setSelectedStagingItem(null)}
                        item={selectedStagingItem.item}
                        type={selectedStagingItem.type}
                    />
                )}

                {/* Unstage Confirmation Modal */}
                <ConfirmationModal 
                    isOpen={!!unstageConfirmItem}
                    onClose={() => setUnstageConfirmItem(null)}
                    onConfirm={async () => {
                        if (unstageConfirmItem) {
                            await stageItem(unstageConfirmItem.id, unstageConfirmItem.type, false)
                            await refresh()
                            await refreshDrafts()
                        }
                    }}
                    title="Unstage Item?"
                    message={`Are you sure you want to remove "${unstageConfirmItem?.title}" from the staging hub? It will remain in the Studio but won't be visible here until re-staged.`}
                    confirmText="Remove"
                    type="warning"
                />

                {/* Document Viewer removed */}

                {/* Bulk Import Modal */}
                <BulkImportModal 
                    isOpen={showBulkImportModal}
                    onClose={() => setShowBulkImportModal(false)}
                    onConfirm={executeBulkImport}
                    count={discoveredItems.length}
                    isSyncing={isSyncing}
                />

                {/* Portfolio Hub Tabs */}
                <div className="flex flex-col gap-8">
                    <div className="w-full flex items-center justify-between">
                        {viewMode === 'sync' ? (
                            <div className="flex bg-black/[0.03] p-1.5 rounded-[24px] border border-black/5 shadow-inner">
                                <button
                                    onClick={() => setActiveHubTab('staged')}
                                    className={cn(
                                        "px-6 py-2.5 rounded-[18px] text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                                        activeHubTab === 'staged' 
                                            ? "bg-white text-black shadow-sm ring-1 ring-black/5" 
                                            : "text-black/30 hover:text-black/60"
                                    )}
                                >
                                    <Layout className={cn("w-3.5 h-3.5", activeHubTab === 'staged' ? "text-orange-500" : "text-black/20")} />
                                    Staging Hub
                                    <span className="ml-1 px-1.5 py-0.5 rounded-full bg-black/5 text-[9px]">{stagedItems.length}</span>
                                </button>
                                <button
                                    onClick={() => setActiveHubTab('live')}
                                    className={cn(
                                        "px-6 py-2.5 rounded-[18px] text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                                        activeHubTab === 'live' 
                                            ? "bg-white text-black shadow-sm ring-1 ring-black/5" 
                                            : "text-black/30 hover:text-black/60"
                                    )}
                                >
                                    <Globe className={cn("w-3.5 h-3.5", activeHubTab === 'live' ? "text-emerald-500" : "text-black/20")} />
                                    Synced
                                    <span className="ml-1 px-1.5 py-0.5 rounded-full bg-black/5 text-[9px]">{liveItems.length}</span>
                                </button>
                                <button
                                    onClick={() => setActiveHubTab('unsynced')}
                                    className={cn(
                                        "px-6 py-2.5 rounded-[18px] text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                                        activeHubTab === 'unsynced' 
                                            ? "bg-white text-black shadow-sm ring-1 ring-black/5" 
                                            : "text-black/30 hover:text-black/60"
                                    )}
                                >
                                    <Orbit className={cn("w-3.5 h-3.5", activeHubTab === 'unsynced' ? "text-blue-500" : "text-black/20")} />
                                    Unsynced
                                    {discoveredItems.length > 0 && (
                                        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-500 text-white text-[9px] animate-pulse">
                                            {discoveredItems.length}
                                        </span>
                                    )}
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4">
                                <div className="flex bg-black/[0.03] p-1.5 rounded-[24px] border border-black/5 shadow-inner">
                                    <div className="px-6 py-2.5 rounded-[18px] bg-white text-black shadow-sm ring-1 ring-black/5 text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                                        <Globe className="w-3.5 h-3.5 text-emerald-500" />
                                        Portfolio Items
                                        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-black/5 text-[9px]">{liveItems.length}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-3">
                            {viewMode === 'sync' ? (
                                <>
                                    {activeHubTab === 'unsynced' && discoveredItems.length > 0 && (
                                        <button
                                            onClick={handleImportAll}
                                            disabled={isSyncing}
                                            className="px-6 py-3 bg-blue-600 text-white rounded-[20px] text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2 shadow-xl shadow-blue-500/20"
                                        >
                                            {isSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Orbit className="w-3.5 h-3.5" />}
                                            Mass Import
                                        </button>
                                    )}
                                    <button 
                                        onClick={handleRefreshAll}
                                        disabled={isLoadingDiscovery}
                                        className="px-6 py-3 bg-white border border-black/5 rounded-[20px] text-[10px] font-black uppercase tracking-widest text-black/40 hover:text-black hover:border-black/10 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
                                    >
                                        {isLoadingDiscovery ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <RefreshCw className="w-3.5 h-3.5" />
                                        )}
                                        Refresh Status
                                    </button>
                                    <button 
                                        onClick={() => setShowSettings(true)}
                                        className="p-3 rounded-[20px] bg-black text-white hover:bg-black/80 transition-all flex items-center gap-2 shadow-sm"
                                        title="Framer Integration Settings"
                                    >
                                        <SettingsIcon className="w-4 h-4" />
                                    </button>
                                </>
                            ) : (
                                <div className="p-4 py-2 rounded-2xl bg-black/[0.03] border border-black/5 flex items-center gap-4">
                                    <div className="flex flex-col">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-black/30">Evidence Score</p>
                                        <p className="text-sm font-black text-black">{evidenceCount} / 10</p>
                                    </div>
                                    <div className="w-px h-8 bg-black/5" />
                                    <div className="flex flex-col">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-black/30">Target Date</p>
                                        <p className="text-sm font-black text-black">Sept 2026</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="w-full flex items-center justify-start gap-2">

                        {[
                            { id: 'all', label: 'All Items', icon: Layout },
                            { id: 'project', label: 'Projects', icon: Rocket },
                            { id: 'press', label: 'Press', icon: Globe },
                            { id: 'media', label: 'Media', icon: Video },
                            { id: 'article', label: 'Articles', icon: Type }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveCategoryTab(tab.id as any)
                                    // Reset limits when changing filters for clear view
                                    setStagedLimit(6)
                                    setLiveLimit(6)
                                    setUnsyncedLimit(6)
                                }}
                                className={cn(
                                    "px-5 py-2 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border",
                                    activeCategoryTab === tab.id 
                                        ? "bg-black text-white border-black shadow-lg shadow-black/10" 
                                        : "bg-white text-black/40 border-black/[0.05] hover:border-black/10 hover:text-black/60"
                                )}
                            >
                                <tab.icon className={cn("w-3.5 h-3.5", activeCategoryTab === tab.id ? "text-white" : "text-black/20")} />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {activeCategoryTab === 'project' && projectSubcategories.length > 0 && (
                        <div className="w-full flex flex-wrap items-center justify-start gap-2 pt-2 animate-in fade-in slide-in-from-top-2">
                            <button
                                onClick={() => setActiveProjectSubTab('all')}
                                className={cn(
                                    "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border",
                                    activeProjectSubTab === 'all'
                                        ? "bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20"
                                        : "bg-white text-black/40 border-black/10 hover:border-black/20 hover:text-black/60"
                                )}
                            >
                                All Projects
                            </button>
                            {projectSubcategories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveProjectSubTab(cat)}
                                    className={cn(
                                        "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border",
                                        activeProjectSubTab === cat
                                            ? "bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20"
                                            : "bg-white text-black/40 border-black/10 hover:border-black/20 hover:text-black/60"
                                    )}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    )}
                    
                    {viewMode === 'sync' ? (
                        <div className="w-full">
                            {activeHubTab === 'staged' && (
                                <div className="w-full space-y-8 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="w-full flex items-center justify-between mb-8">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                                <Database className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h2 className="text-[14px] font-black text-black leading-tight uppercase tracking-tight">Staging Hub</h2>
                                                <p className="text-[11px] font-medium text-black/40">Prepare and enrich items for web publication</p>
                                            </div>
                                        </div>
                                    </div>
    
                                    <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-black">
                                        {isLoadingDiscovery ? (
                                            <ScanningLoader />
                                        ) : filteredStaged.length === 0 ? (
                                            <div className="col-span-full py-24 bg-white rounded-[40px] border border-dashed border-black/10 flex flex-col items-center justify-center text-center">
                                                <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 mb-6">
                                                    <Rocket className="w-10 h-10" />
                                                </div>
                                                <h3 className="text-xl font-black text-black mb-2 uppercase tracking-tight">
                                                    {activeCategoryTab === 'all' ? "Staging is empty" : `No staged ${activeCategoryTab} items`}
                                                </h3>
                                                <p className="text-[14px] font-medium text-black/40 max-w-sm">
                                                    {activeCategoryTab === 'all' 
                                                        ? "Stage items from the Studio modules to prepare them for web publication."
                                                        : `Items tagged as ${activeCategoryTab} will appear here once staged.`}
                                                </p>
                                            </div>
                                        ) : (
                                            filteredStaged.slice(0, stagedLimit).map(item => (
                                                <StagedItemCard 
                                                    key={item.id} 
                                                    item={item} 
                                                    onPush={() => setSelectedStagingItem({ item: item, type: item._type })}
                                                    onUnstage={() => setUnstageConfirmItem({ id: item.id, type: item._type, title: item.title })}
                                                    onDetailClick={(item: any, coverUrl: string | null, displayTitle: string) => setSelectedDetailItem({ item, coverUrl, displayTitle })}
                                                />
                                            ))
                                        )}
                                    </div>
                                    
                                    {filteredStaged.length > stagedLimit && (
                                        <div className="flex justify-center pt-4">
                                            <button 
                                                onClick={() => setStagedLimit(prev => prev + 6)}
                                                className="text-[11px] font-black uppercase tracking-[0.2em] text-black/30 hover:text-black transition-all flex items-center gap-2 group"
                                            >
                                                Show More ({filteredStaged.length - stagedLimit})
                                                <ChevronDown className="w-3.5 h-3.5 transition-transform group-hover:translate-y-0.5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeHubTab === 'live' && (
                                <div className="w-full space-y-8 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="w-full flex items-center justify-between mb-8">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                                <Globe className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h2 className="text-[14px] font-black text-black leading-tight uppercase tracking-tight">Synced Items</h2>
                                                <p className="text-[11px] font-medium text-black/40">Active items synchronized with Framer CMS</p>
                                            </div>
                                        </div>
                                    </div>
    
                                    <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-black">
                                       {filteredLive.length === 0 ? (
                                            <div className="col-span-full py-24 bg-white rounded-[40px] border border-dashed border-black/10 flex flex-col items-center justify-center text-center">
                                                <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 mb-6">
                                                    <Globe className="w-10 h-10" />
                                                </div>
                                                <h3 className="text-xl font-black text-black mb-2 uppercase tracking-tight">
                                                    {activeCategoryTab === 'all' ? "No synced items yet" : `No synced ${activeCategoryTab} items`}
                                                </h3>
                                                <p className="text-[14px] font-medium text-black/40 max-w-sm">
                                                    Synchronized items will be listed here for management and updates.
                                                </p>
                                            </div>
                                        ) : (
                                            filteredLive.slice(0, liveLimit).map(item => (
                                                <LiveItemCard 
                                                    key={item.id} 
                                                    item={item} 
                                                    onRefresh={() => handleSyncAll()} 
                                                    onUnsync={() => setUnsyncConfirmItem({ item, title: item.title })}
                                                    isGhost={ghostIds.has(item.id)}
                                                    onDetailClick={(item: any, coverUrl: string | null, displayTitle: string) => setSelectedDetailItem({ item, coverUrl, displayTitle })}
                                                />
                                            ))
                                        )}
                                    </div>
    
                                    {filteredLive.length > liveLimit && (
                                        <div className="flex justify-center pt-4">
                                            <button 
                                                onClick={() => setLiveLimit(prev => prev + 6)}
                                                className="text-[11px] font-black uppercase tracking-[0.2em] text-black/30 hover:text-black transition-all flex items-center gap-2 group"
                                            >
                                                Show More ({filteredLive.length - liveLimit})
                                                <ChevronDown className="w-3.5 h-3.5 transition-transform group-hover:translate-y-0.5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeHubTab === 'unsynced' && (
                                <div className="w-full space-y-8 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="w-full flex items-center justify-between mb-8">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                                <RefreshCw className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h2 className="text-[14px] font-black text-black leading-tight uppercase tracking-tight">Framer Discovery</h2>
                                                <p className="text-[11px] font-medium text-black/40">Sync items identified in Framer CMS collections</p>
                                            </div>
                                        </div>
                                    </div>
    
                                    <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-black">
                                       {filteredDiscovered.length === 0 ? (
                                            <div className="col-span-full py-24 bg-white rounded-[40px] border border-dashed border-black/10 flex flex-col items-center justify-center text-center">
                                                <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 mb-6 relative">
                                                    <Orbit className="w-10 h-10 animate-spin-slow" />
                                                </div>
                                                <h3 className="text-xl font-black text-black mb-2 uppercase tracking-tight">
                                                    {isLoadingDiscovery ? "Scanning CMS..." : "No unsynced items"}
                                                </h3>
                                                <p className="text-[14px] font-medium text-black/40 max-w-sm">
                                                    {isLoadingDiscovery 
                                                        ? "We're checking your Framer collections for new or orphaned items."
                                                        : "Everything in your Framer CMS is currently synced with Studio."}
                                                </p>
                                            </div>
                                        ) : isLoadingDiscovery ? (
                                            <ScanningLoader />
                                        ) : (
                                            filteredDiscovered.slice(0, unsyncedLimit).map(item => (
                                                <LiveItemCard 
                                                    key={item.id} 
                                                    item={{ ...item, title: item.fieldData?.title || item.slug, _type: item._type }} 
                                                    isDiscovered 
                                                    onImport={() => {
                                                        setSelectedImportItem(item)
                                                        setShowSyncModal(true)
                                                    }}
                                                    isSyncing={isSyncing}
                                                    onDetailClick={(item: any, coverUrl: string | null, displayTitle: string) => setSelectedDetailItem({ item, coverUrl, displayTitle })}
                                                />
                                            ))
                                        )}
                                    </div>
    
                                    {filteredDiscovered.length > unsyncedLimit && (
                                        <div className="flex justify-center pt-4">
                                            <button 
                                                onClick={() => setUnsyncedLimit(prev => prev + 6)}
                                                className="text-[11px] font-black uppercase tracking-[0.2em] text-black/30 hover:text-black transition-all flex items-center gap-2 group"
                                            >
                                                Show More ({filteredDiscovered.length - unsyncedLimit})
                                                <ChevronDown className="w-3.5 h-3.5 transition-transform group-hover:translate-y-0.5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : ( 
                        <div className="w-full flex flex-col items-center justify-center py-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
                             <div className="w-24 h-24 rounded-full bg-black/[0.03] border border-dashed border-black/10 flex items-center justify-center mb-8">
                                 <Layout className="w-10 h-10 text-black/10" />
                             </div>
                             <h3 className="text-2xl font-black text-black mb-2 uppercase tracking-tight">Portfolio Workspace</h3>
                             <p className="text-[14px] font-medium text-black/40 max-w-sm text-center">
                                 We'll decide what goes here next. For now, use the CMS Manager to curate your public presence.
                             </p>
                        </div>
                    )}
                </div>
            </div>

            <PortfolioDetailModal
                isOpen={!!selectedDetailItem}
                onClose={() => setSelectedDetailItem(null)}
                item={selectedDetailItem?.item}
                coverUrl={selectedDetailItem?.coverUrl || null}
                displayTitle={selectedDetailItem?.displayTitle || ''}
            />

            {showSyncModal && (
                <FramerSyncModal
                    isOpen={showSyncModal}
                    isFocused={!!selectedImportItem}
                    initialImportItem={selectedImportItem}
                    onClose={() => {
                        setShowSyncModal(false)
                        setSelectedImportItem(null)
                    }}
                    projects={projects}
                    press={press}
                    content={content}
                    drafts={drafts}
                    onUpdateProject={updateProject}
                    onUpdatePress={updatePress}
                    onUpdateContent={updateContent}
                    onUpdateDraft={updateDraft}
                    onAddProject={addProject}
                    onAddPress={addPress}
                    onAddContent={addContent}
                    onAddMilestone={addMilestone}
                    onAddDraft={(data) => createDraft({ 
                        ...data,
                        status: 'completed' 
                    })}
                />
            )}

            {/* Unsync Confirmation Modal */}
            <ConfirmationModal 
                isOpen={!!unsyncConfirmItem}
                onClose={() => setUnsyncConfirmItem(null)}
                onConfirm={async () => {
                    if (unsyncConfirmItem) {
                        await executeUnsync(unsyncConfirmItem.item)
                        setUnsyncConfirmItem(null)
                    }
                }}
                title="Unsync Broken Link?"
                message={`This item "${unsyncConfirmItem?.title}" is missing from Framer. Would you like to remove the sync link and move it back to staged? It will remain in your Studio but will no longer be marked as "Live".`}
                confirmText="Unsync"
                type="warning"
            />

            <ConfirmationModal 
                isOpen={!!unstageConfirmItem}
                onClose={() => setUnstageConfirmItem(null)}
                onConfirm={async () => {
                    if (unstageConfirmItem) {
                        await stageItem(unstageConfirmItem.id, unstageConfirmItem.type, false)
                        await refresh()
                        await refreshDrafts()
                    }
                }}
                title="Unstage Item?"
                message={`Are you sure you want to remove "${unstageConfirmItem?.title}" from the staging hub? It will remain in the Studio but won't be visible here until re-staged.`}
                confirmText="Remove"
                type="warning"
            />
        </main>
    )
}


function StagedItemCard({ item, onPush, onUnstage, onDetailClick }: any) {
    const typeLabel = item._type === 'project' ? 'Project' : 
                      item._type === 'press' ? 'Press' : 
                      item._type === 'content' ? 'Media' : 'Article'
                      
    const Icon = item._type === 'project' ? Rocket :
                 item._type === 'press' ? Globe :
                 item._type === 'content' ? Video : Type

    const colorClass = item._type === 'project' ? "text-orange-600 bg-orange-50" :
                       item._type === 'press' ? "text-emerald-600 bg-emerald-50" :
                       item._type === 'content' ? "text-blue-600 bg-blue-50" : "text-indigo-600 bg-indigo-50"

    const getCoverUrl = () => {
        if (item.cover_url) return item.cover_url;
        if (item.images && item.images.length > 0) return item.images[0];
        if (item.bg_image) return item.bg_image;
        if (item._type === 'draft' && item.body) {
            const match = item.body.match(/<img[^>]+src=["']([^"']+)["']/i);
            if (match && match[1]) return match[1];
        }
        return null;
    }

    const coverUrl = getCoverUrl()

    const getCMSTitle = () => {
        if (item.title && item.title !== item.slug) return item.title;
        const fd = item.fieldData || item.stage_data?.fieldData;
        const fields = item._fields || item.stage_data?._fields;
        if (fd && fields) {
            const titleField = fields.find((f: any) => f.slug === 'title' || f.id === 'title' || f.name.toLowerCase() === 'title');
            if (titleField && fd[titleField.id]) {
                const val = fd[titleField.id];
                if (typeof val === 'string') return val;
                if (val && val.value && typeof val.value === 'string') return val.value;
            }
        }
        return item.title || item.slug;
    }
    const displayTitle = getCMSTitle();

    return (
        <div 
            onClick={() => onDetailClick?.(item, coverUrl, displayTitle)}
            className="group relative bg-white border border-black/[0.05] rounded-3xl hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 overflow-hidden flex flex-col h-full hover:-translate-y-1 cursor-pointer"
        >
            {/* Cover Image */}
            <div className="h-32 w-full overflow-hidden relative select-none shrink-0 bg-black/[0.02]">
                {coverUrl && (
                    <img
                        src={coverUrl}
                        alt=""
                        className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent opacity-60" />
                
                <div className="absolute top-3 right-3 flex gap-2">
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onUnstage?.();
                        }}
                        className="p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-rose-500 hover:border-rose-500 transition-all active:scale-90"
                        title="Unstage"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="absolute top-3 left-3">
                    <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg backdrop-blur-md border border-white/20", colorClass.split(' ')[1], colorClass.split(' ')[0])}>
                        <Icon className="w-5 h-5" />
                    </div>
                </div>
            </div>

            <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center gap-2 mb-3">
                    <span className={cn("text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg", colorClass)}>
                        {typeLabel}
                    </span>
                    {item.gtv_featured && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg flex items-center gap-1.5 border border-amber-100/50">
                            <Award className="w-3 h-3" />
                            GTV Evidence
                        </span>
                    )}
                </div>

                <h3 className="text-xl font-black text-black leading-tight mb-2 group-hover:text-indigo-600 transition-colors line-clamp-2">
                    {displayTitle}
                </h3>
                
                {(item.description || item.tagline) && (
                    <p className="text-[13px] font-medium text-black/40 line-clamp-3 leading-relaxed mb-4">
                        {item.description || item.tagline}
                    </p>
                )}

                <div className="mt-auto pt-6 border-t border-black/[0.05] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="text-[10px] font-black uppercase tracking-widest text-black/20">
                            Ready to Push
                        </div>
                        {item.url && (
                            <a 
                                href={item.url.startsWith('http') ? item.url : `https://${item.url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-2 rounded-xl text-black/20 hover:bg-orange-50 hover:text-orange-600 transition-all border border-transparent hover:border-orange-100"
                                title="View Link"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        )}
                    </div>
                    <button 
                        onClick={onPush}
                        className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-[20px] text-[11px] font-black uppercase tracking-widest hover:scale-[1.05] active:scale-95 transition-all shadow-xl shadow-indigo-500/20 flex items-center gap-2 group/push"
                    >
                        Push to Web
                        <ArrowRight className="w-4 h-4 transition-transform group-hover/push:translate-x-1" />
                    </button>
                </div>
            </div>
        </div>
    )
}

function LiveItemCard({ 
    item, 
    isDiscovered, 
    onImport, 
    onRefresh,
    onUnsync,
    isSyncing,
    isGhost,
    onDetailClick
}: any) {
    const typeLabel = item._type === 'project' ? 'Project' : 
                      item._type === 'press' ? 'Press' : 
                      item._type === 'content' ? 'Media' : 'Article'
                      
    const Icon = item._type === 'project' ? Rocket :
                 item._type === 'press' ? Globe :
                 item._type === 'content' ? Video : Type

    // Extract Framer image for items coming from or discovered on CMS
    const getCMSImage = () => {
        // 1. Primary: Check mapped Studio data (Imported CMS items)
        if (item.cover_url) return item.cover_url;
        if (item.images && item.images.length > 0) return item.images[0];
        if (item.bg_image) return item.bg_image;
        if (item._type === 'draft' && item.body) {
            const match = item.body.match(/<img[^>]+src=["']([^"']+)["']/i);
            if (match && match[1]) return match[1];
        }
        
        // 2. Secondary: Check for raw Framer data (Discovered or Passed-through)
        // We check stage_data as well in case it was cached there during enrichment
        const fd = item.fieldData || item.stage_data?.fieldData;
        const fields = item._fields || item.stage_data?._fields;

        if (fd && fields) {
            const bgField = fields.find((f: any) => 
                f.name === 'BG Image' || 
                f.name.toLowerCase() === 'bg image' ||
                f.slug.toLowerCase() === 'bg-image' ||
                f.slug === 'bg-image'
            );
            if (bgField) {
                const val = fd[bgField.id];
                if (typeof val === 'string' && val.startsWith('http')) return val;
                if (val && typeof val === 'object') {
                    if (val.url) return val.url;
                    if (val.value?.url) return val.value.url;
                    if (typeof val.value === 'string' && val.value.startsWith('http')) return val.value;
                }
            }
            
            // Fallback to Image 1
            const img1Field = fields.find((f: any) => f.name === 'Image 1');
            if (img1Field) {
                const val = fd[img1Field.id];
                if (typeof val === 'string' && val.startsWith('http')) return val;
                if (val && typeof val === 'object') {
                    if (val.url) return val.url;
                    if (val.value?.url) return val.value.url;
                    if (typeof val.value === 'string' && val.value.startsWith('http')) return val.value;
                }
            }
        }
        
        return null;
    }

    const coverUrl = getCMSImage()

    const getCMSTitle = () => {
        if (item.title && item.title !== item.slug) return item.title;
        const fd = item.fieldData || item.stage_data?.fieldData;
        const fields = item._fields || item.stage_data?._fields;
        if (fd && fields) {
            const titleField = fields.find((f: any) => f.slug === 'title' || f.id === 'title' || f.name.toLowerCase() === 'title');
            if (titleField && fd[titleField.id]) {
                const val = fd[titleField.id];
                if (typeof val === 'string') return val;
                if (val && val.value && typeof val.value === 'string') return val.value;
            }
        }
        return item.title || item.slug;
    }
    const displayTitle = getCMSTitle();

    return (
        <div 
            onClick={() => onDetailClick?.(item, coverUrl, displayTitle)}
            className={cn(
                "group relative bg-white border border-black/[0.05] rounded-3xl transition-all duration-300 overflow-hidden flex flex-col h-full hover:-translate-y-1 cursor-pointer",
                isDiscovered ? "border-emerald-200 bg-emerald-50/20 shadow-xl shadow-emerald-500/5" : "hover:shadow-2xl hover:shadow-emerald-500/10"
            )}
        >
            {/* Cover Image */}
            <div className="h-32 w-full overflow-hidden relative select-none shrink-0 bg-black/[0.02]">
                {coverUrl && (
                    <img
                        src={coverUrl}
                        alt=""
                        className={cn(
                            "w-full h-full object-cover transition-all duration-700 group-hover:scale-110",
                            isDiscovered && "grayscale-0 opacity-80 group-hover:grayscale-0 group-hover:opacity-100"
                        )}
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent opacity-60" />
                
                <div className="absolute top-3 left-3">
                    <div className={cn(
                        "w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg backdrop-blur-md border border-white/20",
                        isDiscovered ? "bg-emerald-500 text-white" : "bg-emerald-50 text-emerald-600"
                    )}>
                        {isDiscovered ? <Globe className="w-5 h-5" /> : isGhost ? <Orbit className="w-5 h-5 animate-spin-slow" /> : <CheckCircle2 className="w-5 h-5" />}
                    </div>
                </div>

                <div className="absolute top-3 right-3">
                    <button className="p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-black/20 transition-all">
                        <MoreVertical className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center gap-2 mb-3">
                    <span className={cn(
                        "text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg",
                        isDiscovered ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-600"
                    )}>
                        {typeLabel}
                    </span>
                    {isDiscovered ? (
                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-900 bg-emerald-100/50 px-2.5 py-1 rounded-lg flex items-center gap-1.5 border border-emerald-200/50">
                            Ready for Import
                        </span>
                    ) : (
                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg flex items-center gap-1.5 border border-emerald-100/50">
                        Live on Website
                        </span>
                    )}
                    {isGhost && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg flex items-center gap-1.5 border border-orange-100/50 animate-pulse">
                            <Orbit className="w-3 h-3" />
                            Missing in Framer
                        </span>
                    )}
                </div>

                <h3 className="text-xl font-black text-black leading-tight mb-2 group-hover:text-emerald-600 transition-colors line-clamp-2">
                    {displayTitle}
                </h3>
                
                {(item.description || item.tagline) && (
                    <p className="text-[13px] font-medium text-black/40 line-clamp-3 leading-relaxed mb-4">
                        {item.description || item.tagline}
                    </p>
                )}

                <div className="mt-auto pt-6 border-t border-black/[0.05] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="text-[9px] font-black uppercase tracking-widest text-black/20">
                            {isDiscovered ? "New Web Source" : isGhost ? "Status: Orphaned" : "Sync Status: OK"}
                        </div>
                        {item.url && (
                            <a 
                                href={item.url.startsWith('http') ? item.url : `https://${item.url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-2 rounded-xl text-black/20 hover:bg-emerald-50 hover:text-emerald-600 transition-all border border-transparent hover:border-emerald-100"
                                title="View Link"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        )}
                    </div>
                            {isDiscovered ? (
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onImport?.();
                                    }}
                                    disabled={isSyncing}
                                    className="px-6 py-3 bg-emerald-600 text-white rounded-[20px] text-[11px] font-black uppercase tracking-widest hover:scale-[1.05] active:scale-95 transition-all shadow-xl shadow-emerald-500/20 flex items-center gap-2 group/import disabled:opacity-50"
                                >
                                    {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                    Import
                                </button>
                            ) : isGhost ? (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onUnsync?.();
                            }}
                            className="px-6 py-3 bg-orange-500 text-white hover:bg-orange-600 rounded-[20px] text-[11px] font-black uppercase tracking-widest transition-all shadow-xl shadow-orange-500/20 flex items-center gap-2"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Unsync
                        </button>
                    ) : (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onRefresh?.();
                            }}
                            className="px-6 py-3 bg-black/[0.03] text-black hover:bg-black/[0.08] rounded-[20px] text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                        >
                            <Globe className="w-4 h-4" />
                            Refresh
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
