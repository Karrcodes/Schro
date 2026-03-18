'use client'

import React, { useState } from 'react'
import { navItems, COLOR_MAP } from '@/lib/navConfig'
import { cn } from '@/lib/utils'
import { useMultitasking, Pane } from '@/features/system/contexts/MultitaskingContext'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export function FloatingModulePicker({ pane }: { pane: Pane }) {
    const { isMultitasking, toggleMultitasking, focusedPane, setFocusedPane, setPaneUrl, leftUrl, rightUrl } = useMultitasking()
    const [isExpanded, setIsExpanded] = useState(false)
    const [hoveredModule, setHoveredModule] = useState<string | null>(null)
    const isFocused = focusedPane === pane
    const currentUrl = pane === 'left' ? leftUrl : rightUrl

    const activeItem = navItems.find(item => currentUrl.startsWith(item.href)) || navItems[0]

    return (
        <div 
            className={cn(
                "absolute top-4 right-4 z-[100] flex flex-col items-center gap-2",
                !isFocused && !isExpanded && "opacity-40 grayscale scale-90 transition-all duration-500",
                isFocused && !isExpanded && "opacity-80 hover:opacity-100 transition-all duration-500"
            )}
            onMouseEnter={() => {
                setIsExpanded(true)
                setFocusedPane(pane)
            }}
            onMouseLeave={() => {
                setIsExpanded(false)
                setHoveredModule(null)
            }}
        >
            <motion.div 
                layout
                initial={false}
                animate={{ 
                    height: 'auto',
                    opacity: 1
                }}
                className={cn(
                    "bg-white/70 backdrop-blur-xl border border-black/10 rounded-2xl p-1.5 shadow-2xl flex flex-col transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]",
                    isExpanded ? "gap-1 overflow-visible" : "gap-0 overflow-hidden"
                )}
            >
                <AnimatePresence mode="wait">
                    {!isExpanded ? (
                        <motion.div 
                            key="collapsed"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.3 }}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] text-black"
                        >
                            {(() => {
                                const Icon = activeItem.icon
                                return <Icon className={cn("w-5 h-5", COLOR_MAP[activeItem.color || 'black'] || 'text-black')} />
                            })()}
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="expanded"
                            initial={{ opacity: 0, height: 40 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 40 }}
                            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                            className="flex flex-col gap-1"
                        >
                            {navItems.map(item => {
                                const Icon = item.icon
                                const isActive = currentUrl.startsWith(item.href)
                                return (
                                    <div 
                                        key={item.label}
                                        className="relative group"
                                        onMouseEnter={() => setHoveredModule(item.label)}
                                        onMouseLeave={() => setHoveredModule(null)}
                                    >
                                        <button
                                            onClick={() => setPaneUrl(pane, item.href)}
                                            className={cn(
                                                "w-10 h-10 flex items-center justify-center rounded-xl transition-all relative overflow-hidden",
                                                isActive 
                                                    ? "bg-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] text-black" 
                                                    : "text-black/35 hover:text-black/70 hover:bg-white/50"
                                            )}
                                        >
                                            <Icon className={cn("w-5 h-5 z-10", isActive && (COLOR_MAP[item.color || 'black'] || 'text-black'))} />
                                            {isActive && (
                                                <div className="absolute inset-0 bg-black/[0.03] animate-pulse" />
                                            )}
                                        </button>

                                        {/* Subpages Flyout */}
                                        <AnimatePresence>
                                            {item.sub && hoveredModule === item.label && (
                                                <motion.div 
                                                    initial={{ opacity: 0, x: 10, scale: 0.95 }}
                                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                                    exit={{ opacity: 0, x: 10, scale: 0.95 }}
                                                    transition={{ duration: 0.2, ease: "easeOut" }}
                                                    className="absolute right-full mr-3 top-0 bg-white/95 backdrop-blur-2xl border border-black/10 rounded-2xl p-1.5 shadow-2xl min-w-[180px] z-[120]"
                                                >
                                                    <p className="text-[10px] font-black text-black/20 uppercase tracking-[0.2em] px-3 py-2 mb-1 border-b border-black/[0.03]">{item.label}</p>
                                                    <div className="space-y-0.5">
                                                        {item.sub.map(sub => {
                                                            const SubIcon = sub.icon
                                                            const isSubActive = currentUrl === sub.href
                                                            return (
                                                                <button
                                                                    key={sub.label}
                                                                    onClick={() => {
                                                                        setPaneUrl(pane, sub.href)
                                                                        setHoveredModule(null)
                                                                    }}
                                                                    className={cn(
                                                                        "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[12px] font-medium transition-all text-left",
                                                                        isSubActive 
                                                                            ? "bg-black/5 text-black font-bold" 
                                                                            : "text-black/40 hover:text-black/80 hover:bg-black/[0.04]"
                                                                    )}
                                                                >
                                                                    <SubIcon className={cn("w-3.5 h-3.5", isSubActive && (COLOR_MAP[item.color || 'black'] || 'text-black'))} />
                                                                    {sub.label}
                                                                </button>
                                                            )
                                                        })}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Tooltip for no-sub modules */}
                                        <AnimatePresence>
                                            {!item.sub && hoveredModule === item.label && (
                                                <motion.div 
                                                    initial={{ opacity: 0, x: 5 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: 5 }}
                                                    className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-black text-white text-[11px] font-bold rounded-lg whitespace-nowrap shadow-xl z-[120]"
                                                >
                                                    {item.label}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )
                            })}

                            <div className="w-8 h-px bg-black/5 mx-auto my-1.5" />

                            <button
                                onClick={() => toggleMultitasking()}
                                className="w-10 h-10 flex items-center justify-center rounded-xl text-black/20 hover:text-red-500 hover:bg-red-50 transition-all group"
                                title="Exit Multitasking"
                            >
                                <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    )
}
