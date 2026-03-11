'use client'

import React, { useState } from 'react'
import { useWellbeing } from '../contexts/WellbeingContext'
import { ExerciseLibrary } from './ExerciseLibrary'
import type { Exercise, WorkoutRoutine } from '../types'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Save, Trash2, Dumbbell, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RoutineBuilderProps {
    initialRoutine?: WorkoutRoutine
    onSave?: () => void
}

export function RoutineBuilder({ initialRoutine, onSave }: RoutineBuilderProps) {
    const { addRoutine, updateRoutine } = useWellbeing()
    const [name, setName] = useState(initialRoutine?.name || '')
    const [day, setDay] = useState(initialRoutine?.day || '')
    const [selectedExercises, setSelectedExercises] = useState<Exercise[]>(initialRoutine?.exercises || [])
    const [showLibrary, setShowLibrary] = useState(false)

    const handleAddExercise = (exercise: Exercise) => {
        if (selectedExercises.find(e => e.id === exercise.id)) {
            setSelectedExercises(selectedExercises.filter(e => e.id !== exercise.id))
        } else {
            setSelectedExercises([...selectedExercises, exercise])
        }
    }

    const handleSave = async () => {
        if (!name || selectedExercises.length === 0) return

        if (initialRoutine) {
            await updateRoutine(initialRoutine.id, {
                name,
                day,
                exercises: selectedExercises
            })
        } else {
            const routine: WorkoutRoutine = {
                id: Math.random().toString(36).substr(2, 9),
                name,
                day,
                exercises: selectedExercises
            }
            await addRoutine(routine)
        }

        onSave?.()
        
        // Reset form if not in a modal context (though usually it will be)
        if (!initialRoutine) {
            setName('')
            setDay('')
            setSelectedExercises([])
        }
    }

    return (
        <div className="bg-white border border-black/5 rounded-[40px] p-8 space-y-8 shadow-xl">
            <header className="flex items-center justify-between">
                <div className="space-y-1">
                    <h3 className="text-[11px] font-black text-black/30 uppercase tracking-[0.3em]">Protocol Designer</h3>
                    <h2 className="text-3xl font-black text-black uppercase tracking-tighter">Build Your Routine</h2>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleSave} disabled={!name || selectedExercises.length === 0} className="px-6 py-3 bg-black text-white rounded-2xl text-[12px] font-black uppercase tracking-widest hover:scale-105 transition-transform disabled:opacity-20 flex items-center gap-2">
                        <Save className="w-4 h-4" />
                        Save Routine
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-8">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-black/30 uppercase tracking-widest ml-1">Routine Name</label>
                            <input
                                type="text"
                                placeholder="e.g. Push Day"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full bg-black/[0.03] border border-black/5 rounded-2xl px-6 py-4 text-[13px] font-black outline-none focus:ring-4 focus:ring-black/5 transition-all"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-black/30 uppercase tracking-widest ml-1">Assigned Day (Optional)</label>
                            <input
                                type="text"
                                placeholder="e.g. Monday"
                                value={day}
                                onChange={e => setDay(e.target.value)}
                                className="w-full bg-black/[0.03] border border-black/5 rounded-2xl px-6 py-4 text-[13px] font-black outline-none focus:ring-4 focus:ring-black/5 transition-all"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-[10px] font-black text-black/40 uppercase tracking-widest">Selected Exercises ({selectedExercises.length})</h4>
                            <button onClick={() => setShowLibrary(!showLibrary)} className="flex items-center gap-2 text-rose-500 text-[10px] font-black uppercase tracking-widest bg-rose-50 px-3 py-2 rounded-xl">
                                {showLibrary ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                                {showLibrary ? 'Close Library' : 'Add Exercise'}
                            </button>
                        </div>

                        <div className="space-y-3">
                            <AnimatePresence>
                                {selectedExercises.length === 0 && !showLibrary && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-[200px] border-2 border-dashed border-black/5 rounded-[32px] flex flex-col items-center justify-center p-8 text-center bg-black/[0.01]">
                                        <Dumbbell className="w-8 h-8 text-black/10 mb-3" />
                                        <p className="text-[11px] font-black text-black/20 uppercase tracking-widest leading-relaxed">No exercises selected.<br />Open the library to begin building.</p>
                                    </motion.div>
                                )}
                                {selectedExercises.map((exercise, i) => (
                                    <motion.div
                                        key={exercise.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className="flex items-center justify-between p-4 bg-white border border-black/5 rounded-2xl shadow-sm group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-black/5 flex items-center justify-center text-[11px] font-black">
                                                {i + 1}
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-[13px] font-black uppercase tracking-tight">{exercise.name}</p>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[9px] font-black uppercase text-black/20 tracking-widest">{exercise.muscleGroup}</span>
                                                    <div className="w-1 h-1 rounded-full bg-black/10" />
                                                    <span className="text-[9px] font-black uppercase text-rose-500 tracking-widest">{exercise.suggestedSets}x{exercise.suggestedReps}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => handleAddExercise(exercise)} className="opacity-0 group-hover:opacity-100 p-2 text-black/20 hover:text-rose-500 transition-all">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <AnimatePresence>
                        {showLibrary ? (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 20 }}
                                className="h-full"
                            >
                                <div className="bg-black/[0.02] border border-black/5 rounded-[32px] p-6 h-full flex flex-col">
                                    <div className="flex items-center gap-2 mb-6">
                                        <Calendar className="w-4 h-4 text-rose-500" />
                                        <h4 className="text-[12px] font-black text-black uppercase tracking-widest">Exercise Catalog</h4>
                                    </div>
                                    <ExerciseLibrary
                                        onSelect={handleAddExercise}
                                        selectedIds={selectedExercises.map(e => e.id)}
                                    />
                                </div>
                            </motion.div>
                        ) : (
                            <div className="bg-black text-white rounded-[32px] p-10 h-full flex flex-col justify-center text-center space-y-6">
                                <div className="w-20 h-20 bg-white/10 rounded-[32px] flex items-center justify-center mx-auto">
                                    <Dumbbell className="w-10 h-10 text-rose-500" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black uppercase tracking-tighter leading-tight">Elite Splits Only</h3>
                                    <p className="text-white/40 text-[13px] font-medium leading-relaxed">
                                        Design your workout split to maximize gains. The system will track your progressive overload automatically once the routine is active.
                                    </p>
                                </div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}
