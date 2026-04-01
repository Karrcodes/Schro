'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SlidersHorizontal, Check, X, Eye, EyeOff } from 'lucide-react'
import { useSystemSettings } from '@/features/system/contexts/SystemSettingsContext'

interface DashboardManagerProps {
    isOpen: boolean
    onClose: () => void
}

export function DashboardManager({ isOpen, onClose }: DashboardManagerProps) {
    const { settings, updateSetting } = useSystemSettings()
    const widgets = settings.dashboard_widgets || {}

    const toggleWidget = (id: string) => {
        const newWidgets = { ...widgets, [id]: !widgets[id] }
        updateSetting('dashboard_widgets', newWidgets)
    }

    const widgetLabels: Record<string, string> = {
        intelligence: 'Intelligence Command',
        timeline: 'Timeline Status',
        studio: 'Studio Ops',
        finance: 'Finance Pulse',
        focus: 'Strategic Focus',
        curation: 'Smart Curation',
        routine: 'Daily Routine'
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100]"
                    />
                    <motion.div
                        initial={{ opacity: 0, x: 20, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 10, scale: 0.98 }}
                        className="fixed top-24 right-10 w-72 bg-white border border-black/[0.08] rounded-2xl shadow-2xl z-[101] overflow-hidden"
                    >
                        <div className="p-4 border-b border-black/[0.05] bg-black/[0.02] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <SlidersHorizontal className="w-4 h-4 text-black/40" />
                                <h3 className="text-[12px] font-black uppercase tracking-widest text-black/60">Configure Dashboard</h3>
                            </div>
                            <button onClick={onClose} className="p-1 hover:bg-black/5 rounded-lg transition-colors">
                                <X className="w-4 h-4 text-black/20" />
                            </button>
                        </div>

                        <div className="p-2">
                            {Object.entries(widgetLabels).map(([id, label]) => (
                                <button
                                    key={id}
                                    onClick={() => toggleWidget(id)}
                                    className="w-full flex items-center justify-between p-3 hover:bg-black/[0.02] rounded-xl transition-all group"
                                >
                                    <span className="text-[13px] font-bold text-black/70 group-hover:text-black">{label}</span>
                                    <div className="flex items-center gap-2">
                                        {widgets[id] !== false ? (
                                            <div className="flex items-center gap-1.5 text-blue-500 bg-blue-50 px-2 py-1 rounded-lg">
                                                <Eye className="w-3.5 h-3.5" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Active</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-black/20 bg-black/[0.03] px-2 py-1 rounded-lg">
                                                <EyeOff className="w-3.5 h-3.5" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Hidden</span>
                                            </div>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className="p-4 bg-black/[0.02] border-t border-black/[0.05]">
                            <p className="text-[10px] font-bold text-black/30 text-center uppercase tracking-widest">Settings persist across sessions</p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
