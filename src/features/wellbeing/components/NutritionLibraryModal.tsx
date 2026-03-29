'use client'

import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ComboEmojiStack } from './ComboEmojiStack'
import { X, Flame, Database, Plus, Trash2, GripVertical, Coffee, UtensilsCrossed, Moon, Apple, Zap, Refrigerator, BookMarked, Pencil } from 'lucide-react'
import { useWellbeing } from '../contexts/WellbeingContext'
import { cn } from '@/lib/utils'
import type { LibraryMeal } from '../types'
import ConfirmationModal from '@/components/ConfirmationModal'
import { EditLibraryMealModal } from './EditLibraryMealModal'

interface NutritionLibraryModalProps {
    isOpen: boolean
    onClose: () => void
}

export function NutritionLibraryModal({ isOpen, onClose }: NutritionLibraryModalProps) {
    const [activeTab, setActiveTab] = useState<'library' | 'combos'>('library')
    const [selectedType, setSelectedType] = useState<'dewbit' | 'breakfast' | 'lunch' | 'dinner' | 'snack'>('dewbit')
    const [draggingId, setDraggingId] = useState<string | null>(null)
    const [dragOverType, setDragOverType] = useState<string | null>(null)
    const [mealToDelete, setMealToDelete] = useState<LibraryMeal | null>(null)
    const [mealToPrep, setMealToPrep] = useState<LibraryMeal | null>(null)
    const [tagToRemove, setTagToRemove] = useState<{ meal: LibraryMeal, tag: string } | null>(null)
    const [mealToLog, setMealToLog] = useState<LibraryMeal | null>(null)
    const [mealToEdit, setMealToEdit] = useState<LibraryMeal | null>(null)
    const [selectedLogType, setSelectedLogType] = useState<'dewbit' | 'breakfast' | 'lunch' | 'dinner' | 'snack'>('snack')
    const [isComboMode, setIsComboMode] = useState(false)
    const [selectedComboItems, setSelectedComboItems] = useState<Record<string, number>>({})
    const [comboName, setComboName] = useState('')
    const [isSavingCombo, setIsSavingCombo] = useState(false)
    const [showSaveSuccess, setShowSaveSuccess] = useState(false)
    const [prepPortions, setPrepPortions] = useState(4)
    const { library, logMeal, updateLibraryMeal, removeMealFromLibrary, addPrepToFridge, createCombo } = useWellbeing()

    if (!isOpen) return null

    const filteredLibrary = library.filter((m: LibraryMeal) => {
            if (activeTab === 'combos') return m.isCombo;
            if (m.isCombo) return false; // Hide combos in category views
            const types = Array.isArray(m.type) ? m.type : (typeof m.type === 'string' ? [m.type] : []);
            return types.includes(selectedType);
        })

    const handleQuickLog = (meal: LibraryMeal) => {
        setMealToLog(meal)
        // Default to first tag of the meal if available
        const currentTypes = Array.isArray(meal.type) ? meal.type : (typeof meal.type === 'string' ? [meal.type] : [])
        if (currentTypes.length > 0) {
            setSelectedLogType(currentTypes[0] as any)
        } else {
            setSelectedLogType('snack')
        }
    }

    const confirmLogMeal = async () => {
        if (!mealToLog) return
        await logMeal({
            ...mealToLog,
            type: selectedLogType, 
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            date: new Date().toISOString().split('T')[0]
        })
        setMealToLog(null)
        onClose() // Close the library modal
    }

    const handlePointerDrop = async (mealId: string, x: number, y: number) => {
        const elements = document.elementsFromPoint(x, y)
        let targetType: string | null = null
        for (const el of elements) {
            if (el instanceof HTMLElement && el.dataset.categoryType) {
                targetType = el.dataset.categoryType
                break
            }
        }
        setDraggingId(null)
        setDragOverType(null)
        if (targetType) {
            // Find the meal
            const meal = library.find(m => m.id === mealId)
            if (meal) {
                // If the user holds 'Shift' during drag, they want to APPEND the category. We unfortunately can't accurately read the Shift key state natively during the `onPointerUp` event easily without managing global state or doing a hack.
                // An elegant alternative is to assume if they dragged it to a new category, they meant to *move* it, and maybe we can add a context menu/toggle later to append.
                // Based on user prompt "I want a smart way to accomodate multi tagging" + "drag a meal... goes to that category" -> drag to move, toggle/click to append.
                
                // For now, let's keep the core move logic:
                await updateLibraryMeal(mealId, { type: [targetType as any] })
            }
        }
    }

    const handlePrepMeal = async (meal: LibraryMeal) => {
        await addPrepToFridge(meal.id, prepPortions)
        setPrepPortions(4) // Reset for next time
    }

    const handlePointerDragOver = (x: number, y: number) => {
        const elements = document.elementsFromPoint(x, y)
        for (const el of elements) {
            if (el instanceof HTMLElement && el.dataset.categoryType) {
                setDragOverType(el.dataset.categoryType)
                return
            }
        }
        setDragOverType(null)
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ touchAction: draggingId ? 'none' : 'auto' }}>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-[40px] w-full max-w-2xl overflow-hidden relative shadow-2xl flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="p-8 pb-6 flex items-center justify-between shrink-0 border-b border-black/5">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-black/[0.03] rounded-2xl flex items-center justify-center">
                            <BookMarked className="w-6 h-6 text-black/60" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tighter">Nutrition Library</h2>
                            <p className="text-[11px] font-bold text-black/40 uppercase tracking-widest mt-1">
                                {library.length} Saved Meals
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex bg-black/[0.03] p-1 rounded-2xl border border-black/5 mr-2">
                             {(['library', 'combos'] as const).map(tab => (
                                 <button
                                     key={tab}
                                     onClick={() => setActiveTab(tab)}
                                     className={cn(
                                         "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                         activeTab === tab ? "bg-white text-black shadow-sm" : "text-black/30 hover:text-black/50"
                                     )}
                                 >
                                     {tab}
                                 </button>
                             ))}
                        </div>
                        <button
                            onClick={() => setIsComboMode(!isComboMode)}
                            className={cn(
                                "w-10 h-10 rounded-2xl transition-all flex items-center justify-center",
                                isComboMode 
                                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200" 
                                    : "bg-black/[0.03] text-black/40 hover:bg-black/10"
                            )}
                            title={isComboMode ? "Cancel" : "Create Combo"}
                        >
                            <Zap className={cn("w-5 h-5", isComboMode ? "fill-white" : "")} />
                        </button>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center hover:bg-black/10 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Filters / Drop Zones */}
                {activeTab === 'library' && (
                    <div className="px-8 py-4 border-b border-black/5 flex items-center overflow-x-auto no-scrollbar shrink-0">
                        <div className="flex items-center gap-2 bg-black/[0.03] p-1.5 rounded-[24px] w-fit border border-black/5">
                            {(['dewbit', 'breakfast', 'lunch', 'dinner', 'snack'] as const).map(type => {
                            const isOver = dragOverType === type
                            // Use consistent color coding
                            const typeStyle = type === 'breakfast' ? "bg-amber-50 text-amber-600 border-amber-200" :
                                type === 'lunch' ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                                    type === 'dinner' ? "bg-blue-50 text-blue-600 border-blue-200" :
                                        type === 'dewbit' ? "bg-purple-50 text-purple-600 border-purple-200" :
                                            type === 'snack' ? "bg-rose-50 text-rose-600 border-rose-200" : ""

                            return (
                                <button
                                    key={type}
                                    data-category-type={type}
                                    onClick={() => setSelectedType(type)}
                                    className={cn(
                                        "px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                                        selectedType === type
                                            ? "bg-white text-black shadow-sm border border-black/5"
                                            : "text-black/40 hover:text-black hover:bg-white/50 border border-transparent",
                                        isOver && typeStyle,
                                        isOver && "scale-105 shadow-sm border"
                                    )}
                                >
                                    {type}
                                </button>
                            )
                        })}
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar bg-black/[0.01]">
                    {filteredLibrary.length === 0 ? (
                        <div className="text-center py-12">
                            <BookMarked className="w-12 h-12 text-black/10 mx-auto mb-4" />
                            <h3 className="text-sm font-black text-black/60 uppercase tracking-widest mb-1">Library Empty</h3>
                            <p className="text-xs font-bold text-black/40 uppercase tracking-wider">No meals found in this category</p>
                        </div>
                    ) : (
                        <div className="grid gap-3 pb-24">
                            {filteredLibrary.map((meal: LibraryMeal) => (
                                <LibraryMealCard
                                    key={meal.id}
                                    meal={meal}
                                    isDragging={draggingId === meal.id}
                                    isSelected={!!selectedComboItems[meal.id]}
                                    isComboMode={isComboMode}
                                    onSelect={() => {
                                        setSelectedComboItems(prev => {
                                            const newItems = { ...prev }
                                            if (newItems[meal.id]) delete newItems[meal.id]
                                            else newItems[meal.id] = 1
                                            return newItems
                                        })
                                    }}
                                    onLog={() => handleQuickLog(meal)}
                                    onPrep={() => setMealToPrep(meal)}
                                    onEdit={() => setMealToEdit(meal)}
                                    onDelete={() => setMealToDelete(meal)}
                                    onUpdateTags={(newTypes) => updateLibraryMeal(meal.id, { type: newTypes })}
                                    onRemoveTagRequest={(tag) => setTagToRemove({ meal, tag })}
                                    onPointerDragStart={() => setDraggingId(meal.id)}
                                    onPointerDragOver={handlePointerDragOver}
                                    onPointerDrop={handlePointerDrop}
                                    onPointerDragEnd={() => { setDraggingId(null); setDragOverType(null) }}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Combo Builder Bar */}
                <AnimatePresence>
                    {isComboMode && Object.keys(selectedComboItems).length > 0 && (
                        <motion.div
                            initial={{ y: 100 }}
                            animate={{ y: 0 }}
                            exit={{ y: 200 }}
                            className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-20"
                        >
                            <div className="bg-black text-white rounded-[32px] p-4 flex items-center gap-4 shadow-2xl ring-1 ring-white/10">
                                <div className="flex-1 min-w-0">
                                    <input 
                                        type="text"
                                        placeholder="Meal Combo Name..."
                                        value={comboName}
                                        onChange={(e) => setComboName(e.target.value)}
                                        className="bg-transparent border-none focus:ring-0 text-sm font-black uppercase tracking-widest w-full placeholder:text-white/20"
                                    />
                                    <div className="flex gap-2 mt-1">
                                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                                            {Object.keys(selectedComboItems).length} Items Selected
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={async (e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        if (!comboName || isSavingCombo) return
                                        
                                        setIsSavingCombo(true)
                                        try {
                                            const items = Object.entries(selectedComboItems).map(([id, quantity]) => ({ id, quantity }))
                                            // Combos are now category-agnostic, save as empty array
                                            await createCombo(comboName, items, [])
                                            setIsComboMode(false)
                                            setSelectedComboItems({})
                                            setComboName('')
                                            setShowSaveSuccess(true)
                                        } catch (e) {
                                            console.error('Failed to save combo:', e)
                                        } finally {
                                            setIsSavingCombo(false)
                                        }
                                    }}
                                    className="px-6 py-3 bg-white text-black rounded-2xl font-black text-[11px] uppercase tracking-widest hover:scale-105 transition-transform active:scale-95 disabled:opacity-50 flex items-center gap-2"
                                    disabled={!comboName || isSavingCombo}
                                >
                                    {isSavingCombo ? (
                                        <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                    ) : null}
                                    Save Combo
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            <ConfirmationModal
                isOpen={!!mealToDelete}
                onClose={() => setMealToDelete(null)}
                onConfirm={async () => {
                    if (mealToDelete) {
                        await removeMealFromLibrary(mealToDelete.id)
                        setMealToDelete(null)
                    }
                }}
                title="Remove from Library"
                message={`Are you sure you want to remove "${mealToDelete?.name}" from your saved meals library?`}
                confirmText="Remove"
                type="danger"
            />

            <ConfirmationModal
                isOpen={!!mealToPrep}
                onClose={() => setMealToPrep(null)}
                onConfirm={async () => {
                    if (mealToPrep) {
                        await handlePrepMeal(mealToPrep)
                        setMealToPrep(null)
                    }
                }}
                title="Add to Fridge"
                message={`How many portions of "${mealToPrep?.name}" are you adding to your Fridge?`}
                confirmText="Add to Fridge"
                type="success"
            >
                <div className="mt-8 pt-8 border-t border-black/5 flex flex-col items-center mb-8">
                    <span className="text-[10px] font-black uppercase tracking-widest text-black/30 mb-6 px-1">Portions to Add</span>
                    <div className="flex items-center gap-10">
                        <button 
                            onClick={() => setPrepPortions(Math.max(1, prepPortions - 1))}
                            className="w-14 h-14 rounded-2xl bg-black/5 flex items-center justify-center text-2xl font-black hover:bg-black/10 transition-all active:scale-95"
                        >
                            -
                        </button>
                        <div className="flex flex-col items-center min-w-[80px]">
                            <span className="text-5xl font-black tabular-nums tracking-tighter">{prepPortions}</span>
                            <span className="text-[10px] font-black text-black/20 uppercase tracking-widest mt-1">Portions</span>
                        </div>
                        <button 
                            onClick={() => setPrepPortions(prepPortions + 1)}
                            className="w-14 h-14 rounded-2xl bg-black/5 flex items-center justify-center text-2xl font-black hover:bg-black/10 transition-all active:scale-95"
                        >
                            +
                        </button>
                    </div>
                </div>
            </ConfirmationModal>

            <ConfirmationModal
                isOpen={!!tagToRemove}
                onClose={() => setTagToRemove(null)}
                onConfirm={async () => {
                    if (tagToRemove) {
                        const { meal, tag } = tagToRemove
                        const currentTypes = Array.isArray(meal.type) ? meal.type : (typeof meal.type === 'string' ? [meal.type] : [])
                        const newTypes = currentTypes.filter(t => t !== tag)
                        await updateLibraryMeal(meal.id, { type: newTypes.length > 0 ? newTypes : ['snack'] })
                        setTagToRemove(null)
                    }
                }}
                title="Remove Category"
                message={`Are you sure you want to remove "${tagToRemove?.tag}" from "${tagToRemove?.meal.name}"?`}
                confirmText="Remove"
                type="danger"
            />

            <ConfirmationModal
                isOpen={!!mealToLog}
                onClose={() => setMealToLog(null)}
                onConfirm={confirmLogMeal}
                title="Log Meal"
                message={`Log "${mealToLog?.name}" to Today's Meals?`}
                confirmText="Log Meal"
                type="info"
                maxWidth="max-w-xl"
            >
                <div className="mt-4 pt-6 border-t border-black/5">
                    <div className="grid grid-cols-5 gap-3 mb-8">
                        {(['dewbit', 'breakfast', 'lunch', 'dinner', 'snack'] as const).map(type => {
                            const Icon = 
                                type === 'breakfast' ? Coffee :
                                type === 'lunch' ? UtensilsCrossed :
                                type === 'dinner' ? Moon :
                                type === 'snack' ? Apple : Zap
                            
                            return (
                                <button
                                    key={type}
                                    onClick={() => setSelectedLogType(type)}
                                    className={cn(
                                        "flex flex-col items-center justify-center p-4 rounded-[24px] gap-3 transition-all",
                                        selectedLogType === type 
                                            ? "bg-black text-white shadow-2xl" 
                                            : "bg-black/5 text-black/40 hover:bg-black/10"
                                    )}
                                >
                                    <Icon className={cn("w-4 h-4", selectedLogType === type ? "text-white" : "text-black/20")} />
                                    <span className="text-[10px] font-black uppercase tracking-[0.1em]">{type}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            </ConfirmationModal>

            <ConfirmationModal
                isOpen={showSaveSuccess}
                onClose={() => setShowSaveSuccess(false)}
                onConfirm={() => setShowSaveSuccess(false)}
                title="Combo Saved!"
                message="Your new meal combo has been successfully created and added to your library."
                confirmText="Great!"
                type="success"
            />

            {mealToEdit && (
                <EditLibraryMealModal
                    isOpen={!!mealToEdit}
                    onClose={() => setMealToEdit(null)}
                    meal={mealToEdit}
                />
            )}
        </div>
    )
}

function LibraryMealCard({ 
    meal, 
    isDragging, 
    isSelected,
    isComboMode,
    onSelect,
    onLog, 
    onPrep, 
    onEdit,
    onDelete, 
    onUpdateTags, 
    onRemoveTagRequest, 
    onPointerDragStart, 
    onPointerDragOver, 
    onPointerDrop, 
    onPointerDragEnd 
}: {
    meal: LibraryMeal;
    isDragging: boolean;
    isSelected: boolean;
    isComboMode: boolean;
    onSelect: () => void;
    onLog: () => void;
    onPrep: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onUpdateTags: (newTypes: LibraryMeal['type']) => void;
    onRemoveTagRequest: (tag: string) => void;
    onPointerDragStart: () => void;
    onPointerDragOver: (x: number, y: number) => void;
    onPointerDrop: (mealId: string, x: number, y: number) => void;
    onPointerDragEnd: () => void;
}) {
    const isDraggingRef = useRef(false)
    const startPos = useRef({ x: 0, y: 0 })
    const [isEditingTags, setIsEditingTags] = useState(false)

    const handlePointerDown = (e: React.PointerEvent) => {
        // Only allow dragging from the main card area, not buttons
        if ((e.target as HTMLElement).closest('button')) return
        // Combos are not draggable (category-agnostic)
        if (meal.isCombo) return

        e.preventDefault()
        startPos.current = { x: e.clientX, y: e.clientY }
        isDraggingRef.current = false

        let ghost: HTMLDivElement | null = null

        const handleMove = (ev: PointerEvent) => {
            const dx = ev.clientX - startPos.current.x
            const dy = ev.clientY - startPos.current.y
            if (!isDraggingRef.current && Math.sqrt(dx * dx + dy * dy) > 8) {
                isDraggingRef.current = true
                onPointerDragStart()

                const primaryType = Array.isArray(meal.type) && meal.type.length > 0 ? meal.type[0] : (typeof meal.type === 'string' ? meal.type : 'snack')
                const typeColor = primaryType === 'breakfast' ? "#d97706" :
                    primaryType === 'lunch' ? "#059669" :
                        primaryType === 'dinner' ? "#2563eb" : 
                            primaryType === 'dewbit' ? "#9333ea" : "#e11d48"

                ghost = document.createElement('div')
                ghost.style.cssText = [
                    'position:fixed',
                    'pointer-events:none',
                    'z-index:9999',
                    'width:280px',
                    'background:white',
                    'border-radius:24px',
                    'box-shadow:0 24px 48px rgba(0,0,0,0.18),0 0 0 1px rgba(0,0,0,0.06)',
                    'padding:16px',
                    'transform:rotate(-2deg) scale(0.95)',
                    'opacity:0.96',
                ].join(';')
                const emojiContent = meal.isCombo && meal.contents 
                    ? `<div style="display:flex;align-items:center;margin-right:12px;margin-left:-4px;">
                        ${meal.contents.slice(0, 3).map((c, i) => `
                            <div style="width:28px;height:28px;border-radius:10px;background:#fff;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,0.1);display:flex;align-items:center;justify-center:center;font-size:16px;margin-left:${i === 0 ? '0' : '-12px'};z-index:${3 - i};">
                                ${c.meal?.emoji || '🍽️'}
                            </div>
                        `).join('')}
                    </div>`
                    : `<span style="font-size:20px;margin-right:8px;">${meal.emoji || '🍽️'}</span>`

                ghost.innerHTML = `
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                        ${(Array.isArray(meal.type) ? meal.type : (typeof meal.type === 'string' ? [meal.type] : ['SNACK'])).map(t => 
                            `<span style="padding:2px 8px;border-radius:6px;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:1px;background:rgba(0,0,0,0.05);color:${typeColor};">
                                ${typeof t === 'string' ? t.toUpperCase() : 'SNACK'}
                            </span>`
                        ).join('')}
                    </div>
                    <div style="font-size:16px;font-weight:700;line-height:1;margin-bottom:10px;color:#000;display:flex;align-items:center;">
                        ${emojiContent}
                        ${meal.name}
                    </div>
                    <div style="font-size:12px;font-weight:700;color:rgba(0,0,0,0.4); display:flex; gap: 8px;">
                        <span>${meal.calories} kcal</span>
                    </div>
                `
                document.body.appendChild(ghost)
            }
            if (isDraggingRef.current) {
                onPointerDragOver(ev.clientX, ev.clientY)
                if (ghost) {
                    // Calculate distance to nearest category drop zone
                    const targets = document.querySelectorAll('[data-category-type]')
                    let minDistance = 1000
                    targets.forEach(t => {
                        const rect = t.getBoundingClientRect()
                        const cx = rect.left + rect.width / 2
                        const cy = rect.top + rect.height / 2
                        const dist = Math.sqrt(Math.pow(ev.clientX - cx, 2) + Math.pow(ev.clientY - cy, 2))
                        if (dist < minDistance) minDistance = dist
                    })

                    // Smart scaling based on proximity
                    const startShrink = 350 // px
                    const minScaleDist = 40  // px
                    const factor = Math.max(0, Math.min(1, (minDistance - minScaleDist) / (startShrink - minScaleDist)))
                    
                    // Scale from 0.95 (far) to 0.4 (close)
                    const targetScale = 0.4 + (factor * 0.55)
                    // Opacity from 1.0 (far) to 0.5 (close)
                    const targetOpacity = 0.5 + (factor * 0.5)

                    ghost.style.left = `${ev.clientX - 140}px`
                    ghost.style.top = `${ev.clientY - 40}px`
                    ghost.style.transform = `rotate(-2deg) scale(${targetScale})`
                    ghost.style.opacity = `${targetOpacity}`
                }
            }
        }

        const handleUp = (ev: PointerEvent) => {
            window.removeEventListener('pointermove', handleMove)
            window.removeEventListener('pointerup', handleUp)
            if (ghost) { ghost.remove(); ghost = null }
            if (isDraggingRef.current) {
                onPointerDrop(meal.id, ev.clientX, ev.clientY)
                isDraggingRef.current = false
            }
            onPointerDragEnd()
        }

        window.addEventListener('pointermove', handleMove)
        window.addEventListener('pointerup', handleUp)
    }

    return (
        <div
            onPointerDown={handlePointerDown}
            onClick={() => isComboMode && onSelect()}
            className={cn(
                "bg-white border rounded-[24px] p-5 flex items-center justify-between group transition-all",
                !meal.isCombo && "cursor-grab active:cursor-grabbing",
                isDragging ? "opacity-30 scale-95 shadow-none pointer-events-none" : "hover:border-black/10",
                isSelected && "border-emerald-500 bg-emerald-50/30 ring-4 ring-emerald-500/10 scale-[0.98]",
                isComboMode && !isSelected && "hover:border-emerald-200 hover:bg-emerald-50/10"
            )}
        >
            <div className="flex items-center gap-4">
                {!meal.isCombo && (
                    <div className="text-black/20 group-hover:text-black/40 cursor-grab active:cursor-grabbing">
                        <GripVertical className="w-5 h-5" />
                    </div>
                )}
                <div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {(() => {
                            if (meal.isCombo) return null;
                            const types = Array.isArray(meal.type) ? meal.type : (typeof meal.type === 'string' ? [meal.type] : []);
                            return types.map((t) => (
                                <span key={t} className={cn(
                                    "pl-2 pr-1 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1 group/tag",
                                    t === 'breakfast' ? "bg-amber-50 text-amber-600" :
                                        t === 'lunch' ? "bg-emerald-50 text-emerald-600" :
                                            t === 'dinner' ? "bg-blue-50 text-blue-600" :
                                                t === 'dewbit' ? "bg-purple-50 text-purple-600" :
                                                    "bg-rose-50 text-rose-600"
                                )}>
                                    {t}
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onRemoveTagRequest(t); }} 
                                        className="hover:bg-black/10 rounded-full p-0.5 opacity-50 hover:opacity-100 transition-opacity"
                                    >
                                        <X className="w-2.5 h-2.5" />
                                    </button>
                                </span>
                            ));
                        })()}
                        {(!meal.type || (Array.isArray(meal.type) && meal.type.length === 0)) && (
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-rose-50 text-rose-600">
                                SNACK
                            </span>
                        )}

                        {meal.isCombo && (
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-black text-white flex items-center gap-1">
                                <Zap className="w-2.5 h-2.5 fill-current" />
                                COMBO
                            </span>
                        )}

                        {meal.isCombo && meal.contents && (
                            <span className="text-[10px] font-extrabold text-black/20 uppercase tracking-widest ml-1">
                                {meal.contents.length} Items
                            </span>
                        )}

                        {/* Interactive Edit Tags Button */}
                        <div className="relative ml-1">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setIsEditingTags(!isEditingTags)
                                }}
                                className="w-5 h-5 rounded-full bg-black/5 flex items-center justify-center hover:bg-black/10 transition-colors"
                            >
                                <Plus className="w-3 h-3 text-black/40" />
                            </button>

                            {/* Dropdown menu */}
                            <AnimatePresence>
                                {isEditingTags && (
                                    <>
                                        <div 
                                            className="fixed inset-0 z-[40]" 
                                            onClick={(e) => { e.stopPropagation(); setIsEditingTags(false) }} 
                                        />
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                            transition={{ duration: 0.15 }}
                                            className="absolute left-0 top-full mt-2 w-32 bg-white border border-black/5 rounded-xl shadow-xl overflow-hidden origin-top-left z-[50] p-1"
                                        >
                                            {(['dewbit', 'breakfast', 'lunch', 'dinner', 'snack'] as const).map(t => {
                                                const currentTypes = Array.isArray(meal.type) ? meal.type : (typeof meal.type === 'string' ? [meal.type] : [])
                                                const isSelected = currentTypes.includes(t)
                                                return (
                                                    <button
                                                        key={t}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            if (isSelected) {
                                                                setIsEditingTags(false)
                                                                onRemoveTagRequest(t)
                                                            } else {
                                                                const newTypes = [...currentTypes, t]
                                                                onUpdateTags(newTypes)
                                                            }
                                                        }}
                                                        className={cn(
                                                            "w-full text-left px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-colors rounded-lg flex items-center justify-between",
                                                            isSelected ? "bg-black/5 text-black" : "text-black/40 hover:bg-black/5"
                                                        )}
                                                    >
                                                        {t}
                                                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                                                    </button>
                                                )
                                            })}
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
                        
                        {meal.ingredients?.length > 0 && (
                            <span className="text-[10px] font-bold text-black/30 ml-2">
                                {meal.ingredients.length} Ingredients
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-lg leading-none flex items-center">
                            <ComboEmojiStack 
                                isCombo={meal.isCombo}
                                contents={meal.contents}
                                fallbackEmoji={meal.emoji}
                                size="md"
                                className="mr-3"
                            />
                            {meal.name}
                        </h4>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-bold text-black/40">
                        <span className="text-black flex items-center gap-1">
                            <Flame className="w-3 h-3" /> {meal.calories} kcal
                        </span>
                        <span className="text-rose-500">{meal.protein}g P</span>
                        <span className="text-emerald-500">{meal.carbs}g C</span>
                        <span className="text-amber-500">{meal.fat}g F</span>
                    </div>
                </div>
            </div>
            <div className={cn("flex items-center gap-2", isComboMode && "opacity-0 scale-90 pointer-events-none transition-all")}>
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onPrep()
                    }}
                    className="w-10 h-10 rounded-xl bg-black/[0.03] text-black border border-black/5 hover:bg-black/5 hover:scale-105 active:scale-95 transition-all flex items-center justify-center shrink-0"
                    title="Prep 4 portions into Fridge"
                >
                    <Refrigerator className="w-4 h-4" />
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onEdit()
                    }}
                    className="w-10 h-10 rounded-xl bg-black/[0.03] text-black/60 border border-black/5 hover:bg-black/5 hover:scale-105 active:scale-95 transition-all flex items-center justify-center shrink-0"
                    title="Edit Library Item"
                >
                    <Pencil className="w-4 h-4" />
                </button>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation()
                        onLog()
                    }}
                    className="w-10 h-10 rounded-xl bg-black text-white hover:scale-105 active:scale-95 transition-all flex items-center justify-center shrink-0"
                    title="Log Meal"
                >
                    <Plus className="w-5 h-5" />
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onDelete()
                    }}
                    className="h-10 w-10 ml-2 rounded-xl bg-black/5 flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white transition-all shrink-0"
                    title="Remove from Library"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}
