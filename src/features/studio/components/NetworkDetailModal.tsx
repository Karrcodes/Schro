'use client'

import React, { useState, useEffect } from 'react'
import { X, Users, Globe, MapPin, Activity, Calendar, Link as LinkIcon, MessageCircle, Hash, Edit3, Save, Trash2, ExternalLink } from 'lucide-react'
import { useStudio } from '../hooks/useStudio'
import type { NetworkType, NetworkStatus, StudioNetwork } from '../types/studio.types'
import { cn } from '@/lib/utils'
import ConfirmationModal from '@/components/ConfirmationModal'

interface NetworkDetailModalProps {
    isOpen: boolean
    onClose: () => void
    item: StudioNetwork | null
}

const NETWORK_TYPES: { value: NetworkType; label: string; icon: any; color: string }[] = [
    { value: 'person', label: 'Person', icon: Users, color: 'text-orange-600' },
    { value: 'community', label: 'Community', icon: Globe, color: 'text-blue-600' },
    { value: 'event', label: 'Event', icon: MapPin, color: 'text-emerald-600' }
]

const STATUSES: { value: NetworkStatus; label: string; type: NetworkType[] }[] = [
    { value: 'interested', label: 'Interested / Researching', type: ['person', 'community', 'event'] },
    { value: 'contacted', label: 'Contacted / Applied', type: ['person', 'community'] },
    { value: 'connected', label: 'Connected / Member', type: ['person', 'community'] },
    { value: 'attending', label: 'Attending (RSVP)', type: ['event'] },
    { value: 'attended', label: 'Attended (Past)', type: ['event'] }
]

export default function NetworkDetailModal({ isOpen, onClose, item }: NetworkDetailModalProps) {
    const { updateNetwork, deleteNetwork, networks } = useStudio()
    const [isEditing, setIsEditing] = useState(false)
    const [editedData, setEditedData] = useState<Partial<StudioNetwork>>({})
    const [tagsInput, setTagsInput] = useState('')
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    const allUniqueTags = Array.from(new Set(networks.flatMap((n: StudioNetwork) => n.tags || []))).sort()
    const currentTags = tagsInput.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
    const suggestedTags = allUniqueTags.filter(tag => !currentTags.includes(tag.toLowerCase())).slice(0, 10)

    useEffect(() => {
        if (item) {
            setEditedData({})
            setIsEditing(false)
            setTagsInput(item.tags?.join(', ') || '')
        }
    }, [item])

    if (!isOpen || !item) return null

    const handleSave = async () => {
        try {
            const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean)
            const submissionData = {
                ...editedData,
                tags: tags.length > 0 ? tags : null as any
            }

            await updateNetwork(item.id, submissionData)
            setIsEditing(false)
        } catch (err: any) {
            alert(`Failed to save: ${err.message}`)
        }
    }

    const handleDelete = async () => {
        try {
            await deleteNetwork(item.id)
            onClose()
        } catch (err: any) {
            alert(`Failed to delete: ${err.message}`)
        }
    }

    const currentType = NETWORK_TYPES.find(t => t.value === (editedData.type ?? item.type)) || NETWORK_TYPES[0]
    const currentTypeVal = editedData.type ?? item.type
    const availableStatuses = STATUSES.filter(s => s.type.includes(currentTypeVal))

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl border border-black/[0.05] overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh] font-outfit">
                {/* Header */}
                <div className="p-8 pb-6 flex items-center justify-between border-b border-black/[0.05]">
                    <div className="flex items-center gap-4">
                        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", currentType.color.replace('text-', 'bg-').split('-')[0] + '-50')}>
                            <currentType.icon className={cn("w-6 h-6", currentType.color)} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                {isEditing ? (
                                    <select
                                        value={editedData.type ?? item.type}
                                        onChange={e => {
                                            const newType = e.target.value as NetworkType;
                                            const defaultStatus = newType === 'event' ? 'interested' : 'interested';
                                            setEditedData(prev => ({ ...prev, type: newType, status: defaultStatus }))
                                        }}
                                        className="text-[10px] font-black uppercase tracking-widest text-black/40 bg-black/[0.05] rounded px-1 -ml-1 focus:outline-none"
                                    >
                                        <option value="person">Person</option>
                                        <option value="community">Community</option>
                                        <option value="event">Event</option>
                                    </select>
                                ) : (
                                    <span className="text-[10px] font-black uppercase tracking-widest text-black/30">
                                        {currentType.label}
                                    </span>
                                )}
                            </div>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editedData.name ?? item.name}
                                    onChange={e => setEditedData(prev => ({ ...prev, name: e.target.value }))}
                                    className="text-2xl font-black text-black bg-black/[0.02] border border-black/[0.1] rounded-lg px-2 py-0.5 focus:outline-none w-full"
                                />
                            ) : (
                                <h2 className="text-2xl font-black text-black tracking-tight">{item.name}</h2>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isEditing ? (
                            <button
                                onClick={handleSave}
                                className="p-2.5 bg-black text-white rounded-xl hover:scale-105 transition-all shadow-lg shadow-black/20"
                            >
                                <Save className="w-5 h-5" />
                            </button>
                        ) : (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="p-2.5 bg-black/[0.03] text-black/40 rounded-xl hover:bg-black/[0.05] hover:text-black transition-colors"
                            >
                                <Edit3 className="w-5 h-5" />
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                            <X className="w-6 h-6 text-black/20" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                    {/* Status & Platform Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-2">Current Status</label>
                            <div className="relative">
                                <select
                                    disabled={!isEditing}
                                    value={editedData.status ?? item.status}
                                    onChange={e => setEditedData(prev => ({ ...prev, status: e.target.value as NetworkStatus }))}
                                    className="w-full px-5 py-3.5 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-[13px] font-bold focus:outline-none focus:border-purple-200 appearance-none disabled:opacity-100 cursor-pointer"
                                >
                                    {availableStatuses.map(s => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {currentTypeVal !== 'person' && (
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-2">Category</label>
                                <div className="relative">
                                    <select
                                        disabled={!isEditing}
                                        value={editedData.category ?? item.category ?? ''}
                                        onChange={e => setEditedData(prev => ({ ...prev, category: e.target.value }))}
                                        className="w-full px-5 py-3.5 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-[13px] font-bold focus:outline-none focus:border-purple-200 appearance-none disabled:opacity-100 cursor-pointer"
                                    >
                                        <option value="" disabled>Select Category...</option>
                                        <option value="Startups">Startups</option>
                                        <option value="Tech">Tech</option>
                                        <option value="Creatives">Creatives</option>
                                        <option value="Design">Design</option>
                                        <option value="Finance">Finance</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-2">Platform / Source</label>
                            <div className="relative">
                                <MessageCircle className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                                <input
                                    readOnly={!isEditing}
                                    placeholder="e.g. LinkedIn, General"
                                    value={editedData.platform ?? item.platform ?? ''}
                                    onChange={e => setEditedData(prev => ({ ...prev, platform: e.target.value }))}
                                    className="w-full pl-12 pr-4 py-3.5 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-[13px] font-bold focus:outline-none focus:border-purple-200"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Dates & URL */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {currentTypeVal === 'event' ? (
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-2">Event Date</label>
                                <div className="flex items-center gap-3 w-full px-4 py-3 bg-black/[0.02] border border-black/[0.05] rounded-2xl h-[46px] focus-within:border-purple-200 transition-colors">
                                    <Calendar className="w-4 h-4 text-black/20 shrink-0" />
                                    <input
                                        readOnly={!isEditing}
                                        type="date"
                                        value={editedData.event_date ?? item.event_date ?? ''}
                                        onChange={e => setEditedData(prev => ({ ...prev, event_date: e.target.value }))}
                                        className="flex-1 text-[13px] font-bold bg-transparent focus:outline-none cursor-pointer appearance-none min-w-0"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-2">Last Contact Date</label>
                                <div className="flex items-center gap-3 w-full px-4 py-3 bg-black/[0.02] border border-black/[0.05] rounded-2xl h-[46px] focus-within:border-purple-200 transition-colors">
                                    <Calendar className="w-4 h-4 text-black/20 shrink-0" />
                                    <input
                                        readOnly={!isEditing}
                                        type="date"
                                        value={editedData.last_contact ?? item.last_contact ?? ''}
                                        onChange={e => setEditedData(prev => ({ ...prev, last_contact: e.target.value }))}
                                        className="flex-1 text-[13px] font-bold bg-transparent focus:outline-none cursor-pointer appearance-none min-w-0"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-2">Profile / Link</label>
                            <div className="relative flex gap-2">
                                <LinkIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                                <input
                                    readOnly={!isEditing}
                                    type="url"
                                    placeholder="Add URL..."
                                    value={editedData.url ?? item.url ?? ''}
                                    onChange={e => setEditedData(prev => ({ ...prev, url: e.target.value }))}
                                    className="flex-1 pl-12 pr-4 py-3.5 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-[13px] font-bold focus:outline-none focus:border-purple-200"
                                />
                                {item.url && (
                                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="p-3.5 bg-purple-50 text-purple-600 rounded-2xl hover:bg-purple-100 transition-colors shrink-0 flex items-center justify-center">
                                        <ExternalLink className="w-5 h-5" />
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Tags */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-2">Tags / Keywords</label>

                        {isEditing && suggestedTags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-2 px-1">
                                <span className="text-[9px] font-black uppercase tracking-tighter text-black/25 w-full mb-0.5">Quick Select</span>
                                {suggestedTags.map((tag: string) => (
                                    <button
                                        key={tag}
                                        type="button"
                                        onClick={() => {
                                            const current = tagsInput ? `${tagsInput}, ` : ''
                                            setTagsInput(`${current}${tag}`)
                                        }}
                                        className="text-[10px] font-bold text-black/40 bg-black/[0.03] hover:bg-black/[0.06] border border-transparent px-2 py-0.5 rounded-lg transition-all"
                                    >
                                        + {tag}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="relative">
                            <Hash className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                            <input
                                readOnly={!isEditing}
                                placeholder="Add tags separated by commas..."
                                value={tagsInput}
                                onChange={e => setTagsInput(e.target.value)}
                                className="w-full pl-12 pr-4 py-3.5 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-[13px] font-bold focus:outline-none focus:border-purple-200"
                            />
                        </div>
                        {!isEditing && item.tags && item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {item.tags.map((tag: string, i: number) => (
                                    <span key={i} className="px-3 py-1 bg-black/[0.03] text-black/60 rounded-lg text-[11px] font-bold">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Notes */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-2">Notes & Context</label>
                        <textarea
                            readOnly={!isEditing}
                            placeholder="Add notes..."
                            value={editedData.notes ?? item.notes ?? ''}
                            onChange={e => setEditedData(prev => ({ ...prev, notes: e.target.value }))}
                            className="w-full px-5 py-5 bg-black/[0.02] border border-black/[0.05] rounded-[32px] text-[15px] font-medium min-h-[140px] focus:outline-none focus:border-purple-200 resize-none transition-all"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 pt-4 flex items-center justify-between bg-black/[0.01] border-t border-black/[0.05]">
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="flex items-center gap-2 px-5 py-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all font-bold text-[13px]"
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete Contact
                    </button>
                    <div className="text-[11px] font-bold text-black/20 uppercase tracking-widest flex flex-col items-end">
                        <span>Added {new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>

            <ConfirmationModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDelete}
                title="Remove Contact"
                message={`Are you sure you want to remove "${item.name}" from your network? This action cannot be undone.`}
                confirmText="Remove"
                type="danger"
            />
        </div>
    )
}
