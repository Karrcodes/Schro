'use client'

import React, { useState } from 'react'
import { Shield, ExternalLink, Calendar, Award, CheckCircle2, Plus, Rocket, Globe, X, Orbit, Trash2, Eye, Layout, Type, Video, ArrowRight, MoreVertical, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

import { useStudio } from '@/features/studio/hooks/useStudio'
import { useDrafts } from '@/features/studio/hooks/useDrafts'
import { useSystemSettings } from '@/features/system/contexts/SystemSettingsContext'
import Link from 'next/link'
import type { StudioProject, StudioPress } from '@/features/studio/types/studio.types'
import FramerSyncSettings from '@/features/studio/components/FramerSyncSettings'
import FramerSyncModal from '@/features/studio/components/FramerSyncModal'
import PortfolioDocument from '@/features/studio/components/PortfolioDocument'
import StagingEnrichmentModal from '@/features/studio/components/StagingEnrichmentModal'
import ConfirmationModal from '@/components/ConfirmationModal'
import { Settings as SettingsIcon, FileDown, Loader2 } from 'lucide-react'
import { FramerSyncService } from '@/features/studio/services/FramerSyncService'
import PortfolioDetailModal from '@/features/studio/components/PortfolioDetailModal'
import FramerImportGuide from '@/features/studio/components/FramerImportGuide'

export default function PortfolioPage() {
    const { projects, press, content, updateProject, updatePress, updateContent, addProject, addPress, addContent, stageItem, refresh } = useStudio()
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
    const [discoveredItems, setDiscoveredItems] = useState<any[]>([])
    const [isLoadingDiscovery, setIsLoadingDiscovery] = useState(false)
    const [activeCategoryTab, setActiveCategoryTab] = useState<'all' | 'project' | 'press' | 'media' | 'article'>('all')
    const [activeProjectSubTab, setActiveProjectSubTab] = useState<string>('all')
    const [selectedDetailItem, setSelectedDetailItem] = useState<{ item: any, coverUrl: string | null, displayTitle: string } | null>(null)

    const portfolioProjects = projects.filter(p => p.gtv_featured)
    const portfolioPress = press.filter(p => p.is_portfolio_item && (p.status === 'achieved' || p.status === 'published'))
    
    // Staging Hub Filters
    const stagedItems = [
        ...projects.filter(p => p.is_staged && (!p.framer_cms_id || p.framer_cms_id === '')).map(p => ({ ...p, _type: 'project' as const })),
        ...press.filter(p => p.is_staged && (!p.framer_cms_id || p.framer_cms_id === '')).map(p => ({ ...p, _type: 'press' as const })),
        ...content.filter(c => c.is_staged && (!c.framer_cms_id || c.framer_cms_id === '')).map(c => ({ ...c, _type: 'content' as const })),
        ...drafts.filter(d => d.is_staged && (!d.framer_cms_id || d.framer_cms_id === '')).map(d => ({ ...d, _type: 'draft' as const }))
    ]

    const liveItems = [
        ...projects.filter(p => p.framer_cms_id && p.framer_cms_id !== '').map(p => ({ ...p, _type: 'project' as const })),
        ...press.filter(p => p.framer_cms_id && p.framer_cms_id !== '').map(p => ({ ...p, _type: 'press' as const })),
        ...content.filter(c => c.framer_cms_id && c.framer_cms_id !== '').map(c => ({ ...c, _type: 'content' as const })),
        ...drafts.filter(d => d.framer_cms_id && d.framer_cms_id !== '').map(d => ({ ...d, _type: 'draft' as const }))
    ]

    const getProjectCategory = (item: any) => {
        return item.category || item._collectionName || item.fieldData?.Category || item.stage_data?.fieldData?.Category || 'General'
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

    // DISCOVERY LOGIC - Fetch unmatched items from Framer
    React.useEffect(() => {
        const discover = async () => {
            const stored = localStorage.getItem('framer_sync_config')
            if (!stored) return
            const { siteId } = JSON.parse(stored)
            if (!siteId) return

            setIsLoadingDiscovery(true)
            try {
                const unmatched = await FramerSyncService.getUnmatchedItems(siteId, projects, press, content, drafts)
                setDiscoveredItems(unmatched)
            } catch (e) {
                console.error('Discovery failed', e)
            } finally {
                setIsLoadingDiscovery(false)
            }
        }
        discover()
    }, [projects, press, content, drafts])

    const handleRefreshFromCMS = async () => {
        const stored = localStorage.getItem('framer_sync_config')
        if (!stored) {
            setShowSettings(true)
            return
        }
        const { siteId } = JSON.parse(stored)
        if (!siteId) {
            setShowSettings(true)
            return
        }

        setIsLoadingDiscovery(true)
        try {
            const unmatched = await FramerSyncService.getUnmatchedItems(siteId, projects, press, content, drafts)
            setDiscoveredItems(unmatched)
        } catch (e) {
            console.error('Manual refresh failed', e)
            alert("Failed to refresh items from Framer. Check settings and console.")
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
            await handleRefreshFromCMS() // Refresh discovery list
        } catch (e) {
            console.error('Import failed', e)
        } finally {
            setIsSyncing(false)
            setSelectedImportItem(null)
        }
    }

    const handleImportAll = async () => {
        if (!window.confirm(`Are you sure you want to import all ${discoveredItems.length} items?`)) return
        setIsSyncing(true)
        try {
            for (const item of discoveredItems) {
                const mapped = FramerSyncService.mapRemoteToLocal(item)
                const type = item._type
                if (type === 'project') await addProject(mapped)
                else if (type === 'press') await addPress(mapped)
                else if (type === 'content') await addContent(mapped)
                else if (type === 'draft') await createDraft(mapped)
            }
            await refresh()
            await handleRefreshFromCMS()
        } catch (error) {
            console.error('Bulk import failed:', error)
        } finally {
            setIsSyncing(false)
        }
    }

    return (
        <main className="pb-24 pt-4 px-4 md:px-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* GTV Status Header */}
                <div className="p-8 rounded-[40px] bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12">
                        <Shield className="w-64 h-64" />
                    </div>

                    <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-400/20 w-fit text-blue-200 border border-blue-400/20 text-[10px] font-bold uppercase tracking-widest">
                                    <Shield className="w-3 h-3" />
                                    {settings.is_demo_mode ? "Showcase Portfolio" : "GTV Portfolio Mode"}
                                </div>
                                <button 
                                    onClick={() => setShowSettings(true)}
                                    className="p-1 px-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all"
                                >
                                    <SettingsIcon className="w-2.5 h-2.5" />
                                    Framer Integration
                                </button>
                            </div>
                            <h1 className="text-4xl font-black tracking-tight leading-none">
                                {settings.is_demo_mode ? (
                                    <>Professional<br /><span className="text-blue-300/80">Project Portfolio</span></>
                                ) : (
                                    <>Global Talent Visa<br /><span className="text-blue-300/80">Evidence Storage</span></>
                                )}
                            </h1>
                            <p className="text-[14px] font-medium text-blue-200/60 max-w-xl">
                                {settings.is_demo_mode ? (
                                    "A curated selection of high-impact projects and media recognition, showcasing expertise in digital technology and innovation."
                                ) : (
                                    "Your curated evidence for the September 2026 application. Everything here represents your case for Exceptional Promise under Tech Nation's Digital Technology criteria."
                                )}
                            </p>
                        </div>

                        <div className="flex flex-col md:items-end gap-4 min-w-[320px]">
                            <div className="flex gap-4 w-full">
                                {!settings.is_demo_mode && (
                                    <div className="flex-1 p-4 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-300 mb-1">Application Target</p>
                                        <div className="items-center gap-2 text-xl font-bold flex">
                                            <Calendar className="w-5 h-5 text-blue-400" />
                                            Sept 2026
                                        </div>
                                    </div>
                                )}
                                <div className="flex-1 p-4 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-300 mb-1">{settings.is_demo_mode ? "Featured Items" : "Evidence Count"}</p>
                                    <div className="flex items-center gap-2 text-xl font-bold">
                                        <Award className="w-5 h-5 text-blue-400" />
                                        {evidenceCount} {settings.is_demo_mode ? "" : "/ 10"}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 w-full">


                                <button 
                                    onClick={() => setShowDocument(true)}
                                    className="flex-1 px-4 py-4 bg-white/10 hover:bg-white/20 text-white rounded-[24px] text-[11px] font-black uppercase tracking-widest border border-white/10 transition-all flex items-center justify-center gap-2"
                                >
                                    <FileDown className="w-4 h-4" />
                                    Generate PDF
                                </button>
                                <button 
                                    onClick={handleSyncAll}
                                    disabled={isSyncing}
                                    className="flex-[1.5] px-6 py-4 bg-white text-blue-900 rounded-[24px] text-[11px] font-black uppercase tracking-widest shadow-xl shadow-black/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                                    Sync Staged Items
                                </button>
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

                {/* Document Viewer */}
                {showDocument && (
                    <PortfolioDocument 
                        projects={portfolioProjects}
                        press={portfolioPress} 
                        onClose={() => setShowDocument(false)} 
                    />
                )}

                {/* Portfolio Hub Tabs */}
                <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between">
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
                                Live on Website
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

                        <div className="flex items-center gap-3">
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
                                onClick={handleRefreshFromCMS}
                                disabled={isLoadingDiscovery}
                                className="px-6 py-3 bg-white border border-black/5 rounded-[20px] text-[10px] font-black uppercase tracking-widest text-black/40 hover:text-black hover:border-black/10 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
                            >
                                {isLoadingDiscovery ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <RefreshCw className="w-3.5 h-3.5" />
                                )}
                                Refresh from CMS
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 px-1">

                        {[
                            { id: 'all', label: 'All Items', icon: Layout },
                            { id: 'project', label: 'Projects', icon: Rocket },
                            { id: 'press', label: 'Press', icon: Globe },
                            { id: 'media', label: 'Media', icon: Video },
                            { id: 'article', label: 'Articles', icon: Type }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveCategoryTab(tab.id as any)}
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
                        <div className="flex flex-wrap items-center gap-2 px-1 pt-2 animate-in fade-in slide-in-from-top-2">
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

                    {activeHubTab === 'staged' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 text-black">
                             {filteredStaged.length === 0 ? (
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
                                filteredStaged.map(item => (
                                    <StagedItemCard 
                                        key={item.id} 
                                        item={item} 
                                        onPush={() => setSelectedStagingItem({ item: item, type: item._type })}
                                        onUnstage={() => setUnstageConfirmItem({ id: item.id, type: item._type, title: item.title })}
                                        onDetailClick={(item, coverUrl, displayTitle) => setSelectedDetailItem({ item, coverUrl, displayTitle })}
                                        isLoading={isLoadingDiscovery}
                                    />
                                ))
                            )}
                        </div>
                    ) : activeHubTab === 'live' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 text-black">
                           {filteredLive.length === 0 ? (
                                <div className="col-span-full py-24 bg-white rounded-[40px] border border-dashed border-black/10 flex flex-col items-center justify-center text-center">
                                    <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 mb-6">
                                        <Globe className="w-10 h-10" />
                                    </div>
                                    <h3 className="text-xl font-black text-black mb-2 uppercase tracking-tight">
                                        {activeCategoryTab === 'all' ? "No live items yet" : `No live ${activeCategoryTab} items`}
                                    </h3>
                                    <p className="text-[14px] font-medium text-black/40 max-w-sm">
                                        {activeCategoryTab === 'all'
                                            ? "Items published to Framer will appear here for management and updates."
                                            : `Synchronized ${activeCategoryTab} items will be listed here.`}
                                    </p>
                                </div>
                            ) : (
                                filteredLive.map(item => (
                                    <LiveItemCard 
                                        key={item.id} 
                                        item={item} 
                                        onRefresh={() => handleSyncAll()} 
                                        onDetailClick={(item, coverUrl, displayTitle) => setSelectedDetailItem({ item, coverUrl, displayTitle })}
                                        isLoading={isLoadingDiscovery}
                                    />
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 text-black">
                           {filteredDiscovered.length === 0 ? (
                                <div className="col-span-full py-24 bg-white rounded-[40px] border border-dashed border-black/10 flex flex-col items-center justify-center text-center">
                                    <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 mb-6">
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
                            ) : (
                                filteredDiscovered.map(item => (
                                    <LiveItemCard 
                                        key={item.id} 
                                        item={{ ...item, title: item.fieldData?.title || item.slug, _type: item._type }} 
                                        isDiscovered 
                                        onImport={() => setSelectedImportItem(item)}
                                        isSyncing={isSyncing}
                                        onDetailClick={(item, coverUrl, displayTitle) => setSelectedDetailItem({ item, coverUrl, displayTitle })}
                                        isLoading={isLoadingDiscovery}
                                    />
                                ))
                            )}
                        </div>
                    )}
                </div>

                <div className="h-px bg-black/5" />

                {/* Portfolio Sections */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {['Innovation', 'Impact', 'Recognition'].map(category => {
                        const isInnovation = category.toLowerCase() === 'innovation';
                        const activeProjects = isInnovation ? portfolioProjects : [];
                        const activePress = portfolioPress.filter(p => p.gtv_category === category.toLowerCase());
                        const totalCount = activeProjects.length + activePress.length;

                        return (
                            <div key={category} className="space-y-4">
                                <div className="flex items-center justify-between px-2">
                                    <h2 className="text-[12px] font-black text-black/40 uppercase tracking-[0.2em]">{category}</h2>
                                    <span className="text-[11px] font-bold text-black/20">{totalCount} pieces</span>
                                </div>
                                <div className="rounded-[32px] bg-white border border-black/[0.05] p-3 flex flex-col min-h-[500px] h-[600px] overflow-hidden">
                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
                                        {totalCount === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-center">
                                                <div className="w-16 h-16 rounded-full bg-black/[0.02] border-2 border-dashed border-black/[0.05] flex items-center justify-center mb-6">
                                                    <Plus className="w-8 h-8 text-black/10" />
                                                </div>
                                                <h3 className="text-[13px] font-bold text-black/30">Add {category} Items</h3>
                                                <p className="text-[11px] text-black/20 mt-2 px-4">{settings.is_demo_mode ? "Tag projects to feature them in your professional showcase." : "Tag active projects as 'gtv_featured' to curate your portfolio."}</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {activeProjects.map(project => (
                                                    <div key={project.id} className="p-4 bg-black/[0.02] rounded-[24px] border border-black/[0.05] flex justify-between items-start gap-3 hover:border-blue-200 transition-colors group">
                                                        <div className="flex gap-3">
                                                            <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                                                                <Rocket className="w-4 h-4" />
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="text-[9px] font-black uppercase tracking-widest text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">Project</span>
                                                                </div>
                                                                <h3 className="text-[13px] font-black text-black group-hover:text-blue-600 transition-colors leading-tight mb-1">{project.title}</h3>
                                                                {project.description && <p className="text-[11px] font-medium text-black/60 line-clamp-2">{project.description}</p>}
                                                            </div>
                                                        </div>
                                                        <Link href="/create/projects" className="p-2 rounded-xl text-black/20 hover:text-black hover:bg-black/5 bg-white shrink-0 transition-colors shadow-sm">
                                                            <ExternalLink className="w-3.5 h-3.5" />
                                                        </Link>
                                                    </div>
                                                ))}

                                                {activePress.map(p => (
                                                    <div key={p.id} className="p-4 bg-black/[0.02] rounded-[24px] border border-black/[0.05] flex justify-between items-start gap-3 hover:border-blue-200 transition-colors group">
                                                        <div className="flex gap-3">
                                                            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                                                <Globe className="w-4 h-4" />
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Press & Media</span>
                                                                </div>
                                                                <h3 className="text-[13px] font-black text-black group-hover:text-blue-600 transition-colors leading-tight mb-1">{p.title}</h3>
                                                                <p className="text-[11px] font-bold text-black/40">{p.organization} • {p.type}</p>
                                                            </div>
                                                        </div>
                                                        <Link href="/create/press" className="p-2 rounded-xl text-black/20 hover:text-black hover:bg-black/5 bg-white shrink-0 transition-colors shadow-sm">
                                                            <ExternalLink className="w-3.5 h-3.5" />
                                                        </Link>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Resources */}
                {!settings.is_demo_mode && (
                    <div className="p-6 rounded-3xl bg-blue-50 border border-blue-200/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="text-[14px] font-black text-blue-900">Tech Nation Guidelines</h4>
                                <p className="text-[12px] font-medium text-blue-800/60">Review the official criteria for Exceptional Promise endorsement.</p>
                            </div>
                        </div>
                        <a
                            href="https://technation.io/visa/digital-technology-exceptional-promise-criteria/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-6 py-3 bg-blue-900 text-white rounded-2xl text-[12px] font-bold hover:bg-blue-800 transition-all"
                        >
                            View Official Guide
                            <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                    </div>
                )}
            </div>

            <PortfolioDetailModal
                isOpen={!!selectedDetailItem}
                onClose={() => setSelectedDetailItem(null)}
                item={selectedDetailItem?.item}
                coverUrl={selectedDetailItem?.coverUrl || null}
                displayTitle={selectedDetailItem?.displayTitle || ''}
            />

            <FramerImportGuide
                isOpen={!!selectedImportItem}
                onClose={() => setSelectedImportItem(null)}
                onConfirm={handleImport}
                item={selectedImportItem}
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


function StagedItemCard({ item, onPush, onUnstage, onDetailClick, isLoading }: { item: any, onPush: () => void, onUnstage?: () => void, onDetailClick?: (item: any, coverUrl: string | null, displayTitle: string) => void, isLoading?: boolean }) {
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
            onClick={() => !isLoading && onDetailClick?.(item, coverUrl, displayTitle)}
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
                    <div className="text-[10px] font-black uppercase tracking-widest text-black/20">
                        Ready to Push
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

            {isLoading && (
                <div className="absolute inset-0 bg-white z-10 flex flex-col p-6 animate-in fade-in duration-300">
                    <div className="h-32 -mx-6 -mt-6 bg-black/[0.03] animate-pulse mb-6" />
                    <div className="flex gap-2 mb-4">
                        <div className="w-16 h-4 bg-black/[0.05] rounded animate-pulse" />
                        <div className="w-20 h-4 bg-black/[0.05] rounded animate-pulse" />
                    </div>
                    <div className="w-full h-8 bg-black/[0.05] rounded-xl animate-pulse mb-3" />
                    <div className="w-3/4 h-8 bg-black/[0.05] rounded-xl animate-pulse mb-6" />
                    <div className="space-y-2 mb-6">
                        <div className="w-full h-3 bg-black/[0.03] rounded animate-pulse" />
                        <div className="w-full h-3 bg-black/[0.03] rounded animate-pulse" />
                        <div className="w-2/3 h-3 bg-black/[0.03] rounded animate-pulse" />
                    </div>
                    <div className="mt-auto pt-6 border-t border-black/[0.05] flex items-center justify-between">
                        <div className="w-20 h-3 bg-black/[0.03] rounded animate-pulse" />
                        <div className="w-32 h-10 bg-black/[0.05] rounded-[20px] animate-pulse" />
                    </div>
                </div>
            )}
        </div>
    )
}

function LiveItemCard({ 
    item, 
    isDiscovered, 
    onImport, 
    onRefresh,
    isSyncing,
    onDetailClick,
    isLoading
}: { 
    item: any, 
    isDiscovered?: boolean, 
    onImport?: () => void, 
    onRefresh?: () => void,
    isSyncing?: boolean,
    onDetailClick?: (item: any, coverUrl: string | null, displayTitle: string) => void,
    isLoading?: boolean
}) {
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
            onClick={() => !isLoading && onDetailClick?.(item, coverUrl, displayTitle)}
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
                        {isDiscovered ? <Globe className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
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
                    <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-black/20">
                        {isDiscovered ? "New Web Source" : "Sync Status: OK"}
                    </div>
                    {isDiscovered ? (
                        <button 
                            onClick={onImport}
                            disabled={isSyncing}
                            className="px-6 py-3 bg-emerald-600 text-white rounded-[20px] text-[11px] font-black uppercase tracking-widest hover:scale-[1.05] active:scale-95 transition-all shadow-xl shadow-emerald-500/20 flex items-center gap-2 group/import disabled:opacity-50"
                        >
                            {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Import
                        </button>
                    ) : (
                        <button 
                            onClick={onRefresh}
                            className="px-6 py-3 bg-black/[0.03] text-black hover:bg-black/[0.08] rounded-[20px] text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                        >
                            <Globe className="w-4 h-4" />
                            Refresh
                        </button>
                    )}
                </div>
            </div>

            {isLoading && (
                <div className="absolute inset-0 bg-white z-10 flex flex-col p-6 animate-in fade-in duration-300">
                    <div className="h-32 -mx-6 -mt-6 bg-black/[0.03] animate-pulse mb-6" />
                    <div className="flex gap-2 mb-4">
                        <div className="w-16 h-4 bg-black/[0.05] rounded animate-pulse" />
                    </div>
                    <div className="w-full h-8 bg-black/[0.05] rounded-xl animate-pulse mb-3" />
                    <div className="w-3/4 h-8 bg-black/[0.05] rounded-xl animate-pulse mb-6" />
                    <div className="space-y-2 mb-6">
                        <div className="w-full h-3 bg-black/[0.03] rounded animate-pulse" />
                        <div className="w-full h-3 bg-black/[0.03] rounded animate-pulse" />
                    </div>
                    <div className="mt-auto pt-6 border-t border-black/[0.05] flex items-center justify-between">
                        <div className="w-20 h-3 bg-black/[0.03] rounded animate-pulse" />
                        <div className="w-32 h-10 bg-black/[0.05] rounded-[20px] animate-pulse" />
                    </div>
                </div>
            )}
        </div>
    )
}
