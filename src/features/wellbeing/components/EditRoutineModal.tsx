'use client'

import React from 'react'
import { RoutineBuilder } from './RoutineBuilder'
import { X, Edit3 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { WorkoutRoutine } from '../types'

interface EditRoutineModalProps {
    isOpen: boolean
    onClose: () => void
    routine: WorkoutRoutine
}

export function EditRoutineModal({ isOpen, onClose, routine }: EditRoutineModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999]"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl bg-white rounded-[40px] z-[1000] shadow-2xl border border-black/5 max-h-[90vh] overflow-hidden flex flex-col"
                    >
                        <header className="p-8 pb-0 flex items-center justify-between bg-white relative z-20">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center">
                                    <Edit3 className="w-6 h-6" />
                                </div>
                                <div className="space-y-0.5">
                                    <h2 className="text-3xl font-black uppercase tracking-tighter">Edit Protocol</h2>
                                    <p className="text-[11px] font-black text-black/30 uppercase tracking-[0.3em]">Modify your active routine</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-3 hover:bg-black/5 rounded-2xl transition-colors">
                                <X className="w-6 h-6 text-black/20" />
                            </button>
                        </header>

                        <div className="flex-1 overflow-y-auto no-scrollbar p-0">
                            <div className="p-8 pt-4">
                                <RoutineBuilder 
                                    initialRoutine={routine} 
                                    onSave={onClose} 
                                />
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
