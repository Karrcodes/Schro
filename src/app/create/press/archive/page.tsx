'use client'

import React, { useState } from 'react'
import { Award, Globe, Shield, Target, Zap, ArrowLeft, ArchiveRestore, Trash2, Calendar, Rocket } from 'lucide-react'
import { useStudio } from '@/features/studio/hooks/useStudio'
import ConfirmationModal from '@/components/ConfirmationModal'
import type { StudioPress, PressType } from '@/features/studio/types/studio.types'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const TYPE_ICONS: Record<PressType, any> = {
    competition: Award,
    grant: Target,
    award: Zap,
    feature: Globe,
    accelerator: Shield,
    other: Award
}

const TYPE_COLORS: Record<PressType, string> = {
    competition: 'text-orange-600 bg-orange-50',
    grant: 'text-emerald-600 bg-emerald-50',
    award: 'text-yellow-600 bg-yellow-50',
    feature: 'text-blue-600 bg-blue-50',
    accelerator: 'text-purple-600 bg-purple-50',
    other: 'text-slate-600 bg-slate-50'
}

export default function PressArchivePage() {
    const { press, loading, updatePress, deletePress, projects } = useStudio()
    const [itemToDelete, setItemToDelete] = useState<StudioPress | null>(null)

    const archivedPress = press.filter(item => item.is_archived).sort((a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )

    const handleRestore = async (id: string) => {
        try {
            await updatePress(id, { is_archived: false, is_pinned: false })
        } catch (err) {
            console.error('Failed to restore press entry:', err)
        }
    }

    return (
        <main className="pb-24 pt-4 px-4 md:px-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                    <Link href="/create/press" className="flex items-center justify-center w-10 h-10 rounded-full bg-black/[0.03] hover:bg-black/[0.06] transition-colors shrink-0">
                        <ArrowLeft className="w-5 h-5 text-black/40" />
                    </Link>
                    <div>
                        <h1 className="text-[22px] font-bold text-black tracking-tight">Press Archive</h1>
                        <p className="text-[12px] text-black/35 mt-0.5">Archived and hidden entries ({archivedPress.length})</p>
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 min-h-[400px]">
                    {archivedPress.map(item => {
                        const Icon = TYPE_ICONS[item.type]
                        const project = projects.find(p => p.id === item.project_id)

                        return (
                            <div
                                key={item.id}
                                className="p-4 bg-white border border-black/[0.05] rounded-[32px] group flex flex-col h-full overflow-hidden opacity-70 hover:opacity-100 transition-opacity"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div className={cn("px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 grayscale", TYPE_COLORS[item.type])}>
                                        <Icon className="w-3 h-3" />
                                        {item.type}
                                    </div>
                                </div>

                                <h3 className="text-[15px] font-black text-black leading-tight mb-0.5">{item.title}</h3>
                                <p className="text-[12px] font-bold text-black/40 mb-3">{item.organization}</p>

                                <div className="mt-auto pt-3 border-t border-black/[0.05]">
                                    <div className="flex items-center justify-between mb-4">
                                        {project && (
                                            <div className="flex items-center gap-2 text-[10px] font-black text-black/40">
                                                <Rocket className="w-3 h-3" />
                                                {project.title}
                                            </div>
                                        )}
                                        {item.deadline && (
                                            <div className="flex items-center gap-2 text-[10px] font-black text-black/40 ml-auto">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(item.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleRestore(item.id)}
                                            className="flex-1 py-2.5 bg-black/[0.03] hover:bg-black/[0.06] text-black/60 rounded-xl text-[11px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                                        >
                                            <ArchiveRestore className="w-3.5 h-3.5" />
                                            Restore
                                        </button>
                                        <button
                                            onClick={() => setItemToDelete(item)}
                                            className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"
                                            title="Permanently Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                    {archivedPress.length === 0 && !loading && (
                        <div className="col-span-full py-20 bg-black/[0.015] border-2 border-dashed border-black/[0.05] rounded-[40px] flex flex-col items-center justify-center text-center px-6">
                            <ArchiveRestore className="w-12 h-12 text-black/10 mb-4" />
                            <p className="text-[14px] font-bold text-black/40 tracking-tight">Archive is empty</p>
                        </div>
                    )}
                </div>
            </div>

            <ConfirmationModal
                isOpen={!!itemToDelete}
                onClose={() => setItemToDelete(null)}
                onConfirm={async () => {
                    if (itemToDelete) {
                        try {
                            await deletePress(itemToDelete.id)
                        } catch (err: any) {
                            alert(`Failed to delete: ${err.message}`)
                        }
                        setItemToDelete(null)
                    }
                }}
                title="Permanently Delete"
                message={`Are you sure you want to permanently delete "${itemToDelete?.title}"? This cannot be undone.`}
                confirmText="Delete Forever"
                type="danger"
            />
        </main>
    )
}
