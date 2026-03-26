'use client'

import React, { useState, useEffect } from 'react'
import { X, Globe, Check, AlertCircle, Rocket, Award, Loader2, ArrowRight, Image as ImageIcon, Type, Video, MapPin, User, Link as LinkIcon, FileText, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { useStudio } from '../hooks/useStudio'
import { useDrafts } from '../hooks/useDrafts'
import { FramerSyncService } from '../services/FramerSyncService'

interface Props {
    isOpen: boolean
    onClose: () => void
    item: any
    type: 'project' | 'press' | 'content' | 'draft'
}

export default function StagingEnrichmentModal({ isOpen, onClose, item, type }: Props) {
    const { updateProject, updatePress, updateContent, updateDraft, stageItem, refresh } = useStudio()
    const [isSaving, setIsSaving] = useState(false)
    const [isPushing, setIsPushing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [isUploading, setIsUploading] = useState<Record<string, boolean>>({})
    const supabase = createClient()

    // Form states
    const [formData, setFormData] = useState<any>({
        client: item.client || '',
        location: item.location || '',
        organization: item.organization || '',
        url: item.url || '',
        image_1: '',
        image_2: '',
        image_3: '',
        image_4: '',
        inner_title: '',
        hashnode_subtitle: '',
        cms_description: '',
        cms_date: new Date().toISOString().split('T')[0],
        ...(item.stage_data || {})
    })

    useEffect(() => {
        if (item) {
            setFormData({
                client: item.client || '',
                location: item.location || '',
                organization: item.organization || '',
                url: item.url || '',
                image_1: '',
                image_2: '',
                image_3: '',
                image_4: '',
                inner_title: item.title ? `${item.title} /` : '',
                ...(item.stage_data || {})
            })
        }
    }, [item])

    if (!isOpen || !item) return null

    const handleSave = async () => {
        setIsSaving(true)
        setError(null)
        try {
            let updates: any = { stage_data: formData }

            if (type === 'project') {
                updates.client = formData.client
                updates.location = formData.location
                await updateProject(item.id, updates)
            } else if (type === 'press') {
                updates.organization = formData.organization
                updates.url = formData.url
                await updatePress(item.id, updates)
            } else if (type === 'content') {
                updates.url = formData.url
                await updateContent(item.id, updates)
            } else if (type === 'draft') {
                await updateDraft(item.id, updates)
            }

            await refresh()
            return true
        } catch (err: any) {
            setError(err.message)
            return false
        } finally {
            setIsSaving(false)
        }
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, num: number) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading((prev: any) => ({ ...prev, [`image_${num}`]: true }))
        setError(null)
        
        try {
            const formDataObj = new FormData()
            formDataObj.append('file', file)
            formDataObj.append('folder', `staging/${item.id}`)

            const res = await fetch('/api/studio/upload', {
                method: 'POST',
                body: formDataObj,
            })

            const result = await res.json()

            if (!res.ok) throw new Error(result.error || 'Upload failed')

            setFormData((prev: any) => ({ ...prev, [`image_${num}`]: result.url }))
        } catch (err: any) {
            console.error('Upload failed:', err)
            setError(`Image ${num} upload failed: ${err.message}`)
        } finally {
            setIsUploading((prev: any) => ({ ...prev, [`image_${num}`]: false }))
        }
    }

    const handlePush = async () => {
        const saved = await handleSave()
        if (!saved) return

        setIsPushing(true)
        setError(null)
        try {
            // Get Framer config
            const stored = localStorage.getItem('framer_sync_config')
            if (!stored) throw new Error("Framer integration not configured. Please use 'Framer Integration' settings.")
            const config = JSON.parse(stored)

            let articleUrl = item.article_url || ''

            // STEP 1: For articles/drafts, publish to Hashnode first
            if (type === 'draft') {
                const hnRes = await fetch('/api/studio/hashnode', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: item.title,
                        body: item.body || '',
                        coverUrl: item.cover_url || null,
                        localId: item.id,
                        hashnodePostId: item.hashnode_post_id || null,
                        subtitle: formData.hashnode_subtitle || undefined,
                    })
                })
                const hnData = await hnRes.json()
                if (!hnRes.ok) {
                    throw new Error(hnData.error || 'Hashnode publish failed')
                }
                articleUrl = hnData.url
                // Update draft locally so Framer gets the URL
                await updateDraft(item.id, { article_url: articleUrl })
            }

            // Prepare merged data for sync
            const syncData = {
                ...item,
                ...formData,
                cover_url: item.cover_url || '',
                title: item.title,
                _explicit_cms_date: formData.cms_date || '',
                _explicit_cms_description: formData.cms_description || '',
                description: formData.cms_description || item.description || item.notes || '',
                article_url: articleUrl,
            }

            // STEP 2: Sync to Framer CMS
            const res = await fetch('/api/studio/framer-sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    localId: item.id,
                    type: type,
                    siteId: config.siteId,
                    collectionId: config.collectionId,
                    data: syncData
                })
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Sync failed')
            }

            setSuccess(true)
            await stageItem(item.id, type, false)
            await refresh()
            setTimeout(() => {
                onClose()
                setSuccess(false)
            }, 2000)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsPushing(false)
        }
    }

    const typeLabel = type === 'project' ? 'Project' : 
                      type === 'press' ? 'Press' : 
                      type === 'content' ? 'Media' : 'Article'

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
            <div className="relative w-full max-w-5xl bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col h-[85vh]">
                {/* Header */}
                <div className="p-8 border-b border-black/[0.05] flex items-center justify-between bg-black/[0.01] shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20">
                            <Rocket className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">Staging Phase</span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-black/20">Ready to Publish</span>
                            </div>
                            <h2 className="text-xl font-black text-black">{item.title}</h2>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                        <X className="w-5 h-5 text-black/20" />
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Left Pane: Settings */}
                    <div className="w-[45%] border-r border-black/[0.05] overflow-y-auto p-10 space-y-10 custom-scrollbar">
                        {error && (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-[13px] font-medium">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-600 text-[13px] font-medium">
                                <Check className="w-4 h-4 shrink-0" />
                                Successfully published to Framer!
                            </div>
                        )}

                        {/* Common Details */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-3 px-1">
                                <div className="p-1.5 rounded-lg bg-black/[0.03] text-black/40">
                                    <Type className="w-4 h-4" />
                                </div>
                                <h3 className="text-[11px] font-black text-black/40 uppercase tracking-widest">Configuration</h3>
                            </div>
                            <div className="grid grid-cols-1 gap-6">
                                {(type === 'project' || type === 'content') && (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-black/30 uppercase tracking-widest px-1">Client</label>
                                            <div className="relative">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                                                <input 
                                                    value={formData.client}
                                                    onChange={e => setFormData({ ...formData, client: e.target.value })}
                                                    placeholder="e.g. Google Europe"
                                                    className="w-full pl-12 pr-4 py-4 bg-black/[0.02] border border-black/5 rounded-2xl text-[14px] font-medium focus:bg-white focus:border-indigo-500/30 transition-all outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-black/30 uppercase tracking-widest px-1">Location</label>
                                            <div className="relative">
                                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                                                <input 
                                                    value={formData.location}
                                                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                                                    placeholder="e.g. London, UK"
                                                    className="w-full pl-12 pr-4 py-4 bg-black/[0.02] border border-black/5 rounded-2xl text-[14px] font-medium focus:bg-white focus:border-indigo-500/30 transition-all outline-none"
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}
                                {type === 'press' && (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-black/30 uppercase tracking-widest px-1">Featured On</label>
                                            <div className="relative">
                                                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                                                <input 
                                                    value={formData.organization}
                                                    onChange={e => setFormData({ ...formData, organization: e.target.value })}
                                                    placeholder="e.g. Wired Magazine"
                                                    className="w-full pl-12 pr-4 py-4 bg-black/[0.02] border border-black/5 rounded-2xl text-[14px] font-medium focus:bg-white focus:border-indigo-500/30 transition-all outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-black/30 uppercase tracking-widest px-1">Media Link</label>
                                            <div className="relative">
                                                <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                                                <input 
                                                    value={formData.url}
                                                    onChange={e => setFormData({ ...formData, url: e.target.value })}
                                                    placeholder="https://wired.com/..."
                                                    className="w-full pl-12 pr-4 py-4 bg-black/[0.02] border border-black/5 rounded-2xl text-[14px] font-medium focus:bg-white focus:border-indigo-500/30 transition-all outline-none"
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}
                                {type === 'draft' && (
                                    <div className="p-6 bg-indigo-50/60 border border-indigo-100 rounded-[24px] space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/20">
                                                <Globe className="w-4 h-4 text-white" />
                                            </div>
                                            <div>
                                                <h4 className="text-[13px] font-black text-indigo-900">Hashnode Network</h4>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600/60 mt-0.5">Automated Publishing</p>
                                            </div>
                                        </div>
                                        {item.article_url ? (
                                            <div className="p-4 bg-white/60 rounded-xl border border-indigo-50">
                                                <a href={item.article_url} target="_blank" rel="noopener noreferrer"
                                                    className="flex items-center gap-2 text-[12px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors break-all">
                                                    <Check className="w-4 h-4 shrink-0 text-emerald-500" />
                                                    {item.article_url}
                                                </a>
                                            </div>
                                        ) : (
                                            <div className="pt-2">
                                                <p className="text-[12px] font-medium text-indigo-800/70 leading-relaxed">
                                                    Pushing this article will automatically publish it to your connected Hashnode publication and embed the interactive reading experience everywhere on your Portfolio site.
                                                </p>
                                            </div>
                                        )}
                                        <div className="pt-2">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-indigo-900/60 uppercase tracking-widest px-1">Hashnode Subtitle (Optional)</label>
                                                <input 
                                                    value={formData.hashnode_subtitle || ''}
                                                    onChange={e => setFormData({ ...formData, hashnode_subtitle: e.target.value })}
                                                    placeholder="A short punchy preview"
                                                    className="w-full px-4 py-3 bg-white/60 border border-indigo-100 rounded-xl text-[13px] font-medium focus:bg-white focus:border-indigo-400/40 transition-all outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {type === 'draft' && (
                                    <div className="space-y-4 mt-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-black/30 uppercase tracking-widest px-1">Framer CMS Date</label>
                                            <input 
                                                type="date"
                                                value={formData.cms_date || ''}
                                                onChange={e => setFormData({ ...formData, cms_date: e.target.value })}
                                                className="w-full px-4 py-3 bg-black/[0.02] border border-black/5 rounded-2xl text-[13px] font-medium focus:bg-white focus:border-indigo-500/30 transition-all outline-none"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-black/30 uppercase tracking-widest px-1">Framer CMS Description (Optional)</label>
                                            <textarea 
                                                value={formData.cms_description || ''}
                                                onChange={e => setFormData({ ...formData, cms_description: e.target.value })}
                                                placeholder="Leave empty to use no description"
                                                rows={3}
                                                className="w-full px-4 py-3 bg-black/[0.02] border border-black/5 rounded-2xl text-[13px] font-medium focus:bg-white focus:border-indigo-500/30 transition-all outline-none resize-none custom-scrollbar"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Enrichment Media (Left Pane for Drafts) */}
                        {type === 'draft' && (
                            <section className="space-y-6 pt-4 border-t border-black/[0.05]">
                                <div className="flex items-center gap-3 px-1">
                                    <div className="p-1.5 rounded-lg bg-black/[0.03] text-black/40">
                                        <ImageIcon className="w-4 h-4" />
                                    </div>
                                    <h3 className="text-[11px] font-black text-black/40 uppercase tracking-widest">Enrichment Media</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    {[1, 2, 3, 4].map(num => (
                                        <div key={num} className="space-y-2">
                                            <label className="text-[10px] font-black text-black/30 uppercase tracking-widest px-1">Image {num}</label>
                                            <div className="h-40 bg-black/[0.02] border border-black/[0.05] rounded-[24px] flex flex-col items-center justify-center p-4 relative group hover:border-indigo-200 transition-all">
                                                {formData[`image_${num}`] ? (
                                                    <>
                                                        <img src={formData[`image_${num}`]} alt="" className="absolute inset-0 w-full h-full object-cover rounded-[22px]" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-[22px] flex items-center justify-center">
                                                            <button onClick={() => setFormData({ ...formData, [`image_${num}`]: '' })} className="p-3 bg-white text-red-500 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all">
                                                                <X className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer rounded-[22px]">
                                                        {isUploading[`image_${num}`] ? (
                                                            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                                                        ) : (
                                                            <>
                                                                <Plus className="w-6 h-6 text-black/10 group-hover:text-indigo-400 group-hover:scale-110 transition-all" />
                                                                <p className="text-[11px] font-black text-black/10 mt-2 uppercase tracking-widest group-hover:text-indigo-400 transition-colors">Upload</p>
                                                            </>
                                                        )}
                                                        <input 
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={(e) => handleImageUpload(e, num)}
                                                            disabled={isUploading[`image_${num}`]}
                                                        />
                                                    </label>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>

                    {/* Right Pane: Preview */}
                    <div className="flex-1 bg-black/[0.01] overflow-y-auto p-10 custom-scrollbar relative">
                        {type === 'draft' ? (
                            <div className="h-full flex flex-col">
                                <div className="flex items-center justify-between mb-6 shrink-0">
                                    <div className="flex items-center gap-3 px-1">
                                        <div className="p-1.5 rounded-lg bg-black/[0.03] text-black/40">
                                            <FileText className="w-4 h-4" />
                                        </div>
                                        <h3 className="text-[11px] font-black text-black/40 uppercase tracking-widest">Article Render Preview</h3>
                                    </div>
                                    <span className="px-3 py-1 bg-white border border-black/5 rounded-full text-[10px] font-black text-black/30 uppercase tracking-widest shadow-sm">
                                        Live Appearance
                                    </span>
                                </div>
                                <div className="flex-1 bg-white border border-black/[0.05] rounded-[32px] p-8 overflow-y-auto custom-scrollbar shadow-sm">
                                    <div 
                                        className="text-[15px] leading-relaxed text-black/80 [&>p]:mb-5 last:[&>p]:mb-0 [&>h1]:text-[28px] [&>h1]:font-black [&>h1]:mb-6 [&>h1]:mt-10 first:[&>h1]:mt-0 [&>h1]:tracking-tight [&>h2]:text-[22px] [&>h2]:font-bold [&>h2]:mb-4 [&>h2]:mt-8 [&>h2]:tracking-tight [&>h3]:text-[18px] [&>h3]:font-bold [&>h3]:mb-3 [&>h3]:mt-6 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-6 [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-6 [&>li]:mb-2 [&>blockquote]:border-l-4 [&>blockquote]:border-indigo-200 [&>blockquote]:pl-5 [&>blockquote]:py-1 [&>blockquote]:my-6 [&>blockquote]:italic [&>blockquote]:text-black/60 [&>blockquote]:bg-indigo-50/30 [&>blockquote]:rounded-r-xl [&>img]:rounded-[24px] [&>img]:my-8 [&>img]:shadow-xl [&>img]:border [&>img]:border-black/5 [&>pre]:bg-[#0d0d0d] [&>pre]:text-white/90 [&>pre]:p-5 [&>pre]:rounded-2xl [&>pre]:my-6 [&>pre]:shadow-xl [&>code]:bg-black/5 [&>code]:px-1.5 [&>code]:py-0.5 [&>code]:rounded-md [&>code]:text-[13px] [&>code]:font-mono [&>code]:text-indigo-600"
                                        dangerouslySetInnerHTML={{ __html: item.body || '<p class="text-black/40 italic">No content written yet...</p>' }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 px-1 mb-2">
                                    <div className="p-1.5 rounded-lg bg-black/[0.03] text-black/40">
                                        <ImageIcon className="w-4 h-4" />
                                    </div>
                                    <h3 className="text-[11px] font-black text-black/40 uppercase tracking-widest">Enrichment Media</h3>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-6">
                                    {[1, 2, 3, 4].map(num => (
                                        <div key={num} className="space-y-2">
                                            <label className="text-[10px] font-black text-black/30 uppercase tracking-widest px-1">Image {num}</label>
                                            <div className="h-44 bg-white border border-black/[0.05] rounded-[32px] flex flex-col items-center justify-center p-4 relative group hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 transition-all">
                                                {formData[`image_${num}`] ? (
                                                    <>
                                                        <img src={formData[`image_${num}`]} alt="" className="absolute inset-0 w-full h-full object-cover rounded-[30px]" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-[30px] flex items-center justify-center">
                                                            <button onClick={() => setFormData({ ...formData, [`image_${num}`]: '' })} className="p-3 bg-white text-red-500 rounded-full shadow-lg transform active:scale-95 transition-all">
                                                                <X className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="w-12 h-12 rounded-2xl bg-black/[0.02] flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-indigo-50 transition-all">
                                                            <Plus className="w-5 h-5 text-black/20 group-hover:text-indigo-500 transition-colors" />
                                                        </div>
                                                        <p className="text-[10px] font-black text-black/20 uppercase tracking-widest group-hover:text-indigo-500 transition-colors">Select Asset</p>
                                                    </>
                                                )}
                                                <input 
                                                    type="text"
                                                    value={formData[`image_${num}`]}
                                                    onChange={e => setFormData({ ...formData, [`image_${num}`]: e.target.value })}
                                                    placeholder="Image URL"
                                                    className="absolute bottom-4 left-4 right-4 px-4 py-2.5 bg-white/90 backdrop-blur-md border border-black/5 rounded-xl text-[11px] font-medium outline-none focus:border-indigo-500/30 shadow-lg opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-black/[0.05] bg-black/[0.01] flex items-center justify-between">
                    <button 
                        onClick={onClose}
                        className="px-8 py-4 text-[11px] font-black uppercase tracking-widest text-black/30 hover:text-black transition-colors"
                    >
                        Skip for now
                    </button>
                    <div className="flex gap-4">
                        <button 
                            onClick={handleSave}
                            disabled={isSaving || isPushing}
                            className="px-8 py-4 bg-black/[0.03] text-black/40 rounded-[24px] text-[11px] font-black uppercase tracking-widest hover:bg-black/[0.06] hover:text-black transition-all disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Draft"}
                        </button>
                        <button 
                            onClick={handlePush}
                            disabled={isSaving || isPushing}
                            className="px-10 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-[24px] text-[11px] font-black uppercase tracking-widest hover:scale-[1.05] active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2 group/push shadow-xl shadow-indigo-500/20"
                        >
                            {isPushing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Rocket className="w-4 h-4 transition-transform group-hover/push:-rotate-12" />
                            )}
                            Push to Web
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
