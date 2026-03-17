"use client"

import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    X, Wand2, Type, Image as ImageIcon, Upload, Loader2, Plus, Trash2, 
    AlertCircle, CheckCircle2, ChevronRight, Sparkles 
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { aiService, ExtractedTask } from '../services/aiService'

interface ParsedTask {
    id: string
    title: string
    priority?: 'urgent' | 'high' | 'mid' | 'low'
    notes?: string
    selected: boolean
}

interface QuickImportModalProps {
    isOpen: boolean
    onClose: () => void
    onImport: (tasks: { title: string, priority: string, notes?: string }[]) => Promise<void>
}

export function QuickImportModal({ isOpen, onClose, onImport }: QuickImportModalProps) {
    const [mode, setMode] = useState<'text' | 'image'>('text')
    const [inputText, setInputText] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)
    const [parsedTasks, setParsedTasks] = useState<ParsedTask[]>([])
    const [error, setError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const mapExtractedToParsed = (tasks: ExtractedTask[]): ParsedTask[] => {
        return tasks.map(t => ({
            id: Math.random().toString(36).substr(2, 9),
            title: t.title,
            priority: t.priority,
            notes: t.notes,
            selected: true
        }))
    }

    const handleProcessText = async () => {
        if (!inputText.trim()) return
        
        setIsProcessing(true)
        setError(null)
        
        try {
            const extracted = await aiService.processQuickList(inputText)
            setParsedTasks(mapExtractedToParsed(extracted))
        } catch (err: any) {
            setError(err.message || 'Failed to process text. Please try again.')
        } finally {
            setIsProcessing(false)
        }
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsProcessing(true)
        setError(null)

        try {
            const extracted = await aiService.processQuickList(file)
            setParsedTasks(mapExtractedToParsed(extracted))
        } catch (err: any) {
            setError(err.message || 'Failed to process image. Make sure the text is clear.')
        } finally {
            setIsProcessing(false)
        }
    }

    const handleImportSubmit = async () => {
        const selectedTasks = parsedTasks
            .filter(t => t.selected && t.title.trim())
            .map(t => ({
                title: t.title,
                priority: t.priority || 'mid',
                notes: t.notes
            }))

        if (selectedTasks.length === 0) return

        try {
            await onImport(selectedTasks)
            onClose()
            // Reset state
            setParsedTasks([])
            setInputText('')
            setMode('text')
        } catch (err) {
            setError('Failed to create tasks. Please try again.')
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
                {/* Header */}
                <div className="p-6 border-b border-black/5 flex items-center justify-between bg-gradient-to-r from-purple-50 to-blue-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center shadow-lg">
                            <Wand2 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-black uppercase tracking-tight">Magic Import</h2>
                            <p className="text-xs font-bold text-black/40 uppercase tracking-widest">AI Task Extraction</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-black/5 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-black/40" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {parsedTasks.length === 0 ? (
                        <div className="space-y-6">
                            {/* Mode Toggle */}
                            <div className="flex p-1 bg-black/[0.03] rounded-2xl border border-black/5 w-fit mx-auto">
                                <button
                                    onClick={() => setMode('text')}
                                    className={cn(
                                        "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                                        mode === 'text' ? "bg-white text-black shadow-sm" : "text-black/30 hover:text-black/50"
                                    )}
                                >
                                    <Type className="w-4 h-4" /> Text
                                </button>
                                <button
                                    onClick={() => setMode('image')}
                                    className={cn(
                                        "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                                        mode === 'image' ? "bg-white text-black shadow-sm" : "text-black/30 hover:text-black/50"
                                    )}
                                >
                                    <ImageIcon className="w-4 h-4" /> Image
                                </button>
                            </div>

                            {mode === 'text' ? (
                                <div className="space-y-4">
                                    <div className="relative group">
                                        <textarea
                                            value={inputText}
                                            onChange={(e) => setInputText(e.target.value)}
                                            placeholder="Paste your list here...&#10;Example:&#10;• Buy groceries&#10;• Call the bank tomorrow&#10;• Finish project presentation"
                                            className="w-full h-48 p-5 bg-black/[0.02] border border-black/5 rounded-3xl text-sm font-medium text-black outline-none focus:border-purple-500/30 focus:bg-white transition-all resize-none"
                                        />
                                        <div className="absolute bottom-4 right-4 text-[10px] font-bold text-black/20 uppercase tracking-widest">
                                            {inputText.length} characters
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleProcessText}
                                        disabled={!inputText.trim() || isProcessing}
                                        className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2 shadow-xl shadow-black/10"
                                    >
                                        {isProcessing ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Processing with AI...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-4 h-4" />
                                                Extract Tasks
                                            </>
                                        )}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full h-64 border-2 border-dashed border-black/10 rounded-3xl flex flex-col items-center justify-center gap-4 hover:border-purple-500/30 hover:bg-purple-50/30 transition-all cursor-pointer group"
                                    >
                                        <div className="w-16 h-16 rounded-2xl bg-black/[0.03] flex items-center justify-center group-hover:scale-110 group-hover:bg-purple-100 transition-all">
                                            <Upload className="w-8 h-8 text-black/20 group-hover:text-purple-500 transition-colors" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-black text-black uppercase tracking-tight">Upload a Photo</p>
                                            <p className="text-xs font-bold text-black/30 uppercase tracking-widest mt-1">Sticky notes, sketches, or screenshots</p>
                                        </div>
                                        <input 
                                            type="file" 
                                            ref={fileInputRef}
                                            onChange={handleImageUpload}
                                            accept="image/*"
                                            className="hidden" 
                                        />
                                    </div>
                                    {isProcessing && (
                                        <div className="flex flex-col items-center gap-3 py-4">
                                            <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                                            <p className="text-[10px] font-black uppercase text-black/40 tracking-widest animate-pulse">Reading Image with Vision AI...</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center justify-between px-2">
                                <p className="text-[10px] font-black text-black/40 uppercase tracking-widest">
                                    {parsedTasks.length} Suggested Tasks
                                </p>
                                <button 
                                    onClick={() => setParsedTasks([])}
                                    className="text-[10px] font-black text-purple-600 uppercase tracking-widest hover:underline"
                                >
                                    Reset
                                </button>
                            </div>
                            
                            <div className="space-y-2">
                                {parsedTasks.map((task, idx) => (
                                    <div 
                                        key={task.id}
                                        className={cn(
                                            "group flex items-center gap-3 p-3 rounded-2xl border transition-all",
                                            task.selected ? "bg-black/[0.02] border-black/10" : "bg-transparent border-transparent opacity-50"
                                        )}
                                    >
                                        <button 
                                            onClick={() => setParsedTasks(prev => prev.map(t => t.id === task.id ? { ...t, selected: !t.selected } : t))}
                                            className={cn(
                                                "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all",
                                                task.selected ? "bg-black border-black" : "border-black/10"
                                            )}
                                        >
                                            {task.selected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                        </button>
                                        <input 
                                            value={task.title}
                                            onChange={(e) => setParsedTasks(prev => prev.map(t => t.id === task.id ? { ...t, title: e.target.value } : t))}
                                            className="flex-1 bg-transparent text-sm font-bold text-black outline-none border-b border-transparent focus:border-black/10"
                                        />
                                        <button 
                                            onClick={() => setParsedTasks(prev => prev.filter(t => t.id !== task.id))}
                                            className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 rounded-lg transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={handleImportSubmit}
                                className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xl shadow-black/10 mt-6"
                            >
                                <Plus className="w-4 h-4" />
                                Add {parsedTasks.filter(t => t.selected).length} Tasks to List
                            </button>
                        </div>
                    )}

                    {error && (
                        <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 animate-in fade-in zoom-in-95">
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            <p className="text-xs font-bold text-red-600 uppercase tracking-tight">{error}</p>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-black/[0.02] border-t border-black/5 text-center">
                    <p className="text-[9px] font-bold text-black/20 uppercase tracking-[0.2em]">Powered by Gemini AI Vision & Language</p>
                </div>
            </motion.div>
        </div>
    )
}
