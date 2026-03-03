'use client'

import React, { useState } from 'react'
import { Activity, Plus, Search, Users, Globe, MapPin, ExternalLink, MessageCircle, Hash, Calendar } from 'lucide-react'
import { useStudio } from '@/features/studio/hooks/useStudio'
import CreateNetworkModal from '@/features/studio/components/CreateNetworkModal'
import NetworkDetailModal from '@/features/studio/components/NetworkDetailModal'
import type { StudioNetwork, NetworkType } from '@/features/studio/types/studio.types'
import { cn } from '@/lib/utils'

const TYPE_ICONS: Record<NetworkType, any> = {
    person: Users,
    community: Globe,
    event: MapPin
}

const TYPE_COLORS: Record<NetworkType, string> = {
    person: 'text-orange-600 bg-orange-50',
    community: 'text-blue-600 bg-blue-50',
    event: 'text-emerald-600 bg-emerald-50'
}

export default function NetworkPage() {
    const { networks, loading } = useStudio()
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [selectedItem, setSelectedItem] = useState<StudioNetwork | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterType, setFilterType] = useState<NetworkType | 'all'>('all')

    const filteredNetworks = networks.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.platform && item.platform.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (item.tags && item.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())))
        const matchesType = filterType === 'all' || item.type === filterType
        return matchesSearch && matchesType
    })

    return (
        <main className="pb-24 pt-4 px-4 md:px-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-[22px] font-bold text-black tracking-tight">Creative Network</h1>
                        <p className="text-[12px] text-black/35 mt-0.5">Studio Module · People, communities, and events</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20 group-focus-within:text-purple-500 transition-colors" />
                            <input
                                placeholder="Search network..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-11 pr-4 py-2.5 bg-white border border-black/[0.05] rounded-2xl text-[13px] font-bold focus:outline-none focus:border-purple-200 w-full md:w-64 shadow-sm"
                            />
                        </div>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded-2xl text-[13px] font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-lg shadow-black/10 shrink-0"
                        >
                            <Plus className="w-4 h-4" />
                            Add Contact
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-2 border-b border-black/[0.05] overflow-x-auto pb-4">
                    <button
                        onClick={() => setFilterType('all')}
                        className={cn(
                            "px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
                            filterType === 'all' ? "bg-black text-white" : "bg-white border border-black/[0.05] text-black/40 hover:border-black/20"
                        )}
                    >
                        All Entries
                    </button>
                    {(Object.keys(TYPE_ICONS) as NetworkType[]).map(type => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all border",
                                filterType === type
                                    ? "bg-black text-white border-black"
                                    : "bg-white border-black/[0.05] text-black/40 hover:border-black/20"
                            )}
                        >
                            <span className={cn(filterType === type ? "text-white" : TYPE_COLORS[type].split(' ')[0])}>
                                {React.createElement(TYPE_ICONS[type], { className: "w-3.5 h-3.5" })}
                            </span>
                            {type} ({networks.filter(n => n.type === type).length})
                        </button>
                    ))}
                </div>

                {/* Network List Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 min-h-[400px]">
                    {filteredNetworks.map(item => (
                        <NetworkCard key={item.id} item={item} onClick={() => setSelectedItem(item)} />
                    ))}
                    {filteredNetworks.length === 0 && !loading && (
                        <div className="col-span-full py-20 bg-black/[0.015] border-2 border-dashed border-black/[0.05] rounded-[40px] flex flex-col items-center justify-center text-center px-6">
                            <Activity className="w-12 h-12 text-black/10 mb-4" />
                            <p className="text-[13px] font-bold text-black/20 italic">No network entries found in this category.</p>
                        </div>
                    )}
                </div>
            </div>

            <CreateNetworkModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />
            <NetworkDetailModal
                isOpen={!!selectedItem}
                onClose={() => setSelectedItem(null)}
                item={selectedItem}
            />
        </main>
    )
}

function NetworkCard({ item, onClick }: { item: StudioNetwork; onClick: () => void }) {
    const Icon = TYPE_ICONS[item.type]

    return (
        <div
            onClick={onClick}
            className="p-5 bg-white border border-black/[0.05] rounded-[32px] hover:border-purple-200 hover:shadow-xl transition-all group cursor-pointer flex flex-col h-full"
        >
            <div className="flex justify-between items-start mb-4">
                <div className={cn("px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5", TYPE_COLORS[item.type])}>
                    <Icon className="w-3 h-3" />
                    {item.type}
                </div>
                {item.platform && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-black/30">
                        <MessageCircle className="w-3 h-3" />
                        {item.platform}
                    </div>
                )}
            </div>

            <h3 className="text-[16px] font-black text-black group-hover:text-purple-600 transition-colors leading-tight mb-3">{item.name}</h3>

            {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                    {item.tags.slice(0, 3).map((tag, i) => (
                        <span key={i} className="px-2 py-0.5 bg-black/[0.02] text-black/50 rounded-md text-[9px] font-bold flex items-center gap-0.5">
                            <Hash className="w-2.5 h-2.5" />
                            {tag}
                        </span>
                    ))}
                    {item.tags.length > 3 && (
                        <span className="px-2 py-0.5 bg-black/[0.02] text-black/30 rounded-md text-[9px] font-bold">
                            +{item.tags.length - 3}
                        </span>
                    )}
                </div>
            )}

            <div className="mt-auto pt-4 border-t border-black/[0.05] flex items-center justify-between">
                <span className={cn(
                    "text-[9px] font-black uppercase px-2 py-1 rounded-lg",
                    item.status === 'connected' || item.status === 'attended' || item.status === 'attending'
                        ? "bg-purple-50 text-purple-600"
                        : "bg-black/[0.04] text-black/30"
                )}>
                    {item.status.replace('_', ' ')}
                </span>

                <div className="flex items-center gap-2">
                    {item.event_date && item.type === 'event' && (
                        <div className="flex items-center gap-1 text-[10px] font-black text-black/40">
                            <Calendar className="w-3 h-3" />
                            {new Date(item.event_date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                        </div>
                    )}
                    {item.url && <ExternalLink className="w-3.5 h-3.5 text-black/20" />}
                </div>
            </div>
        </div>
    )
}
