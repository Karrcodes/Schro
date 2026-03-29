'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useWellbeing } from '../contexts/WellbeingContext'
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    AreaChart, Area, PieChart, Pie, Cell, LineChart, Line, Legend,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts'
import { 
    History, BarChart2, TrendingUp, Calendar, 
    ChevronRight, ArrowLeft, Dumbbell, Clock, 
    Zap, Target, Filter, ChevronDown, ChevronUp,
    Trophy, Activity, Percent, Trash2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { format, subDays, isAfter, parseISO, startOfDay } from 'date-fns'
import { EXERCISES } from '../constants/exercises'

interface WorkoutAnalyticsProps {
    onClose?: () => void
}

export function WorkoutAnalytics({ onClose }: WorkoutAnalyticsProps) {
    const router = useRouter()
    const { 
        workoutLogs, routines, logWorkout, 
        bulkAddWorkoutLogs, clearWorkoutLogs, deleteWorkoutLog 
    } = useWellbeing()
    
    const [deletingLogId, setDeletingLogId] = useState<string | null>(null)
    
    const handleDeleteLog = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        setDeletingLogId(id)
    }

    const confirmDelete = async () => {
        if (deletingLogId) {
            await deleteWorkoutLog(deletingLogId)
            setDeletingLogId(null)
        }
    }
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('30d')
    const [selectedRoutineType, setSelectedRoutineType] = useState<'pull' | 'push' | 'legs' | null>('push')
    const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null)
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null)
    const [isGenerating, setIsGenerating] = useState(false)

    // Helper: Calculate total volume for a log
    const calculateVolume = (log: any) => {
        return log.exercises.reduce((total: number, ex: any) => {
            return total + ex.sets.reduce((setTotal: number, set: any) => {
                return setTotal + (set.weight * set.reps)
            }, 0)
        }, 0)
    }

    // Filtered Logs
    const filteredLogs = useMemo(() => {
        const now = new Date()
        let cutoff = new Date(0)
        if (timeRange === '7d') cutoff = subDays(now, 7)
        else if (timeRange === '30d') cutoff = subDays(now, 30)
        
        return workoutLogs
            .filter(log => isAfter(parseISO(log.date), cutoff))
            .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
    }, [workoutLogs, timeRange])

    // Stats
    const stats = useMemo(() => {
        const totalWorkouts = filteredLogs.length
        const totalDuration = filteredLogs.reduce((acc, log) => acc + (log.duration || 0), 0)
        const avgDuration = totalWorkouts > 0 ? Math.round(totalDuration / totalWorkouts) : 0
        
        // PB Counter: Number of times maxWeight was exceeded for any exercise
        let personalBests = 0
        const exerciseMaxes = new Map<string, number>()
        
        // We need chronologically ascending logs for PB calculation
        const chronLogs = [...workoutLogs].sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
        
        chronLogs.forEach(log => {
            log.exercises.forEach(exLog => {
                const maxWeight = Math.max(...(exLog.sets.map(s => s.weight) || [0]))
                const currentMax = exerciseMaxes.get(exLog.exerciseId) || 0
                
                if (maxWeight > currentMax && currentMax > 0) {
                    personalBests++
                }
                
                if (maxWeight > currentMax) {
                    exerciseMaxes.set(exLog.exerciseId, maxWeight)
                }
            })
        })
        
        return { totalWorkouts, avgDuration, personalBests }
    }, [filteredLogs, workoutLogs])

    // Chart Data: Intensity Trend (Avg Weight per Rep)
    const intensityData = useMemo(() => {
        return [...filteredLogs]
            .reverse()
            .map(log => {
                let totalSets = 0
                let avgWeight = 0
                log.exercises.forEach(ex => {
                    ex.sets.forEach(set => {
                        avgWeight += set.weight
                        totalSets++
                    })
                })
                return {
                    date: format(parseISO(log.date), 'MMM d'),
                    intensity: totalSets > 0 ? Math.round(avgWeight / totalSets) : 0
                }
            })
    }, [filteredLogs])

    // Chart Data: Muscle Group Distribution
    const muscleData = useMemo(() => {
        const distribution: Record<string, number> = {}
        
        filteredLogs.forEach(log => {
            log.exercises.forEach(exLog => {
                const exercise = EXERCISES.find(e => e.id === exLog.exerciseId) || 
                                 routines.find(r => r.id === log.routineId)?.exercises.find(e => e.id === exLog.exerciseId)
                
                const group = exercise?.muscleGroup || 'Other'
                distribution[group] = (distribution[group] || 0) + exLog.sets.length
            })
        })

        return Object.entries(distribution).map(([name, value]) => ({ name, value }))
    }, [filteredLogs, routines])

    // Chart Data: Specific Exercise Progress
    const exerciseProgressionData = useMemo(() => {
        if (!selectedExerciseId) return []

        // Chronologically ordered logs that include this exercise
        return [...workoutLogs]
            .filter(log => log.exercises.some(e => e.exerciseId === selectedExerciseId))
            .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
            .map(log => {
                const exLog = log.exercises.find(e => e.exerciseId === selectedExerciseId)
                const maxWeight = Math.max(...(exLog?.sets.map(s => s.weight) || [0]))
                return {
                    date: format(parseISO(log.date), 'MMM d'),
                    maxWeight
                }
            })
    }, [workoutLogs, selectedExerciseId])

    // Filtered Exercises based on Routine Type
    const drillDownExercises = useMemo(() => {
        if (!selectedRoutineType) return []
        const exMap = new Map<string, string>()

        const categoryMap: Record<string, string[]> = {
            'push': ['Chest', 'Shoulders', 'Triceps'],
            'pull': ['Back', 'Biceps'],
            'legs': ['Legs', 'Calves']
        }

        const allowedMuscles = categoryMap[selectedRoutineType] || []

        filteredLogs.forEach(log => {
            log.exercises.forEach(exLog => {
                const ex = EXERCISES.find(e => e.id === exLog.exerciseId) || 
                           routines.find(r => r.id === log.routineId)?.exercises.find(e => e.id === exLog.exerciseId)
                if (ex && allowedMuscles.includes(ex.muscleGroup)) {
                    exMap.set(ex.id, ex.name)
                }
            })
        })

        return Array.from(exMap.entries()).map(([id, name]) => ({ id, name }))
    }, [filteredLogs, selectedRoutineType, routines])

    // Auto-select first exercise when routine type changes
    useMemo(() => {
        if (drillDownExercises.length > 0 && (!selectedExerciseId || !drillDownExercises.some(e => e.id === selectedExerciseId))) {
            setSelectedExerciseId(drillDownExercises[0].id)
        }
    }, [drillDownExercises, selectedExerciseId])

    const COLORS = ['#F43F5E', '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899']

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col space-y-12"
        >
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between z-10 gap-6 w-full flex-shrink-0">
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <button 
                        onClick={() => onClose ? onClose() : router.push('/health/fitness')}
                        className="w-9 h-9 rounded-xl bg-black/[0.03] flex items-center justify-center hover:bg-black/[0.06] transition-colors flex-shrink-0"
                    >
                        <ArrowLeft className="w-4 h-4 text-black/40" />
                    </button>
                    <div className="min-w-0 flex-1 space-y-1">
                        <h2 className="text-[11px] font-black text-rose-500 uppercase tracking-[0.3em] truncate">Performance Matrix</h2>
                        <h1 className="text-3xl sm:text-4xl font-black text-black tracking-tighter uppercase grayscale truncate">Workout History</h1>
                    </div>
                </div>
            </header>

            <div className="w-full space-y-12 pb-12">
                
                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-4">
                    <div className="bg-black text-white p-6 rounded-[32px] shadow-xl">
                        <div className="flex items-center gap-2 mb-4 opacity-50">
                            <Zap className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Total Energy</span>
                        </div>
                        <h4 className="text-4xl font-black leading-none">{stats.totalWorkouts}</h4>
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-2 px-1">Completed Sessions</p>
                    </div>
                    <div className="bg-emerald-500 text-white p-6 rounded-[32px] shadow-xl">
                        <div className="flex items-center gap-2 mb-4 opacity-50">
                            <Clock className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Avg Session</span>
                        </div>
                        <h4 className="text-4xl font-black leading-none">{stats.avgDuration}m</h4>
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-2 px-1">Minutes per Effort</p>
                    </div>
                    <div className="bg-rose-500 text-white p-6 rounded-[32px] shadow-xl">
                        <div className="flex items-center gap-2 mb-4 opacity-50">
                            <Trophy className="w-4 h-4 text-white" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Personal Bests</span>
                        </div>
                        <h4 className="text-4xl font-black leading-none">{stats.personalBests}</h4>
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-2 px-1">Weight milestones hit</p>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="flex items-center justify-between border-b border-black/5 pb-4">
                    <div className="flex gap-2">
                        {(['7d', '30d', 'all'] as const).map(range => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                    timeRange === range ? "bg-black text-white shadow-lg" : "bg-black/5 text-black/40 hover:bg-black/10"
                                )}
                            >
                                {range === 'all' ? 'All Time' : `Last ${range}`}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 text-black/20">
                        <Filter className="w-4 h-4" />
                    </div>
                </div>

                {/* Exercise Specific Progress (Moved to 2nd Row) */}
                <div className="bg-black text-white p-8 rounded-[48px] shadow-2xl overflow-hidden relative border border-white/5">
                    <div className="flex flex-col gap-6 mb-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tighter">Achievement Drill-down</h3>
                                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Deep metrics per routine focus</p>
                            </div>
                            
                            {/* Routine Type Selector */}
                            <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
                                {(['push', 'pull', 'legs'] as const).map(type => (
                                    <button 
                                        key={type}
                                        onClick={() => setSelectedRoutineType(type)}
                                        className={cn(
                                            "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                                            selectedRoutineType === type ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white"
                                        )}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Exercise Tabs (Focus Tab Menu) */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide no-scrollbar -mx-2 px-2">
                            {drillDownExercises.map(ex => (
                                <button
                                    key={ex.id}
                                    onClick={() => setSelectedExerciseId(ex.id)}
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border shrink-0",
                                        selectedExerciseId === ex.id 
                                            ? "bg-rose-500 border-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.3)]" 
                                            : "bg-white/5 border-white/10 text-white/40 hover:border-white/30"
                                    )}
                                >
                                    {ex.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="h-[280px] w-full">
                        {selectedExerciseId ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={exerciseProgressionData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#ffffff40', style: { textTransform: 'uppercase' } }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#ffffff40' }} dx={-10} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#000', borderRadius: '16px', border: '1px solid #ffffff20', fontWeight: 900, fontSize: '11px', textTransform: 'uppercase' }}
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="maxWeight" 
                                        stroke="#F43F5E" 
                                        strokeWidth={6} 
                                        dot={{ r: 6, fill: '#F43F5E', strokeWidth: 4, stroke: '#000' }}
                                        activeDot={{ r: 10, fill: '#fff' }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-20">
                                <TrendingUp className="w-12 h-12" />
                                <p className="text-[11px] font-black uppercase tracking-[0.2em]">Select an exercise focus</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Charts Grid (Moved to 3rd Row) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Intensity Trend Area Chart */}
                    <div className="bg-white border border-black/5 p-6 rounded-[40px] shadow-sm flex flex-col h-[400px]">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-widest">Intensity Flux</h3>
                                <p className="text-[10px] font-bold text-black/30 uppercase tracking-widest">Avg Weight per Rep</p>
                            </div>
                            <Zap className="w-5 h-5 text-rose-500" />
                        </div>
                        <div className="flex-1 w-full min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={intensityData}>
                                    <defs>
                                        <linearGradient id="colorIntensity" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#0000000a" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, style: { textTransform: 'uppercase' } }} dy={10} />
                                    <YAxis hide />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 900, fontSize: '12px' }}
                                        cursor={{ stroke: '#8B5CF6', strokeWidth: 2 }}
                                    />
                                    <Area type="monotone" dataKey="intensity" stroke="#8B5CF6" strokeWidth={4} fillOpacity={1} fill="url(#colorIntensity)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Muscle Balance Radar Chart */}
                    <div className="bg-white border border-black/5 p-6 rounded-[40px] shadow-sm flex flex-col h-[400px]">
                         <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-widest">Bio Symmetry</h3>
                                <p className="text-[10px] font-bold text-black/30 uppercase tracking-widest">Set Volume distribution</p>
                            </div>
                            <Activity className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div className="flex-1 w-full min-h-0 flex items-center justify-center">
                            {muscleData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="80%">
                                    <RadarChart outerRadius="80%" data={muscleData}>
                                        <PolarGrid stroke="#0000000a" />
                                        <PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 800, fill: '#00000066', style: { textTransform: 'uppercase' } }} />
                                        <Radar name="Sets" dataKey="value" stroke="#10B981" fill="#10B981" fillOpacity={0.6} strokeWidth={3} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            ) : (
                                <p className="text-[10px] font-black uppercase text-black/20">No data for this range</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* History Log */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-6">
                        <History className="w-5 h-5 text-black/30" />
                        <h3 className="text-xl font-black uppercase tracking-tighter">Raw History</h3>
                    </div>

                    <div className="space-y-3">
                        {filteredLogs.map(log => {
                            const isExpanded = expandedLogId === log.id
                            const routine = routines.find(r => r.id === log.routineId)
                            const totalVol = calculateVolume(log)

                            return (
                                <div 
                                    key={log.id}
                                    className={cn(
                                        "bg-white border border-black/5 rounded-[32px] overflow-hidden transition-all duration-300",
                                        isExpanded ? "shadow-2xl translate-y-[-4px]" : "hover:border-black/20"
                                    )}
                                >
                                    <button 
                                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                        className="w-full p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-2xl bg-black/5 flex items-center justify-center shrink-0">
                                                <Calendar className="w-4 h-4 text-black/40" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-[12px] font-black uppercase tracking-tight leading-tight">{routine?.name || 'Manual Session'}</h4>
                                                    {log.note && (
                                                        <div className={cn(
                                                            "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1",
                                                            log.note.includes('synced') ? "bg-emerald-500/10 text-emerald-600" : "bg-blue-500/10 text-blue-600"
                                                        )}>
                                                            {log.note.includes('synced') && <Zap className="w-2 h-2" />}
                                                            {log.note}
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-[10px] font-bold text-black/30 uppercase">{format(parseISO(log.date), 'EEEE, MMMM do')}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6 self-start sm:self-center">
                                            <div className="text-right">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-black/20 leading-none mb-1">Total Volume</p>
                                                <p className="text-[13px] font-black uppercase">{totalVol.toLocaleString()}kg</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-black/20 leading-none mb-1">Duration</p>
                                                <p className="text-[13px] font-black uppercase">{log.duration || 0}m</p>
                                            </div>
                                            <div className={cn("transition-transform duration-300", isExpanded && "rotate-180")}>
                                                <ChevronDown className="w-5 h-5 text-black/20" />
                                            </div>
                                            
                                            {(!log.gymVisitId && !log.note?.includes('synced')) && (
                                                <button 
                                                    onClick={(e) => handleDeleteLog(e, log.id)}
                                                    className="w-10 h-10 rounded-2xl bg-rose-500/5 flex items-center justify-center text-rose-500 hover:bg-rose-500/10 transition-colors ml-2"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </button>

                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div 
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="border-t border-black/5 bg-black/5 p-6 space-y-4"
                                            >
                                                {log.exercises.map(exLog => {
                                                    const exercise = routine?.exercises.find(e => e.id === exLog.exerciseId)
                                                    return (
                                                        <div key={exLog.exerciseId} className="bg-white p-4 rounded-2xl shadow-sm">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <h5 className="text-[11px] font-black uppercase tracking-widest">{exercise?.name || exLog.exerciseId}</h5>
                                                                <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest bg-rose-500/10 px-2 py-0.5 rounded-lg">
                                                                    {exercise?.muscleGroup}
                                                                </span>
                                                            </div>
                                                            <div className="flex flex-wrap gap-2">
                                                                {exLog.sets.map((set, idx) => (
                                                                    <div key={idx} className="bg-black/5 px-3 py-1.5 rounded-xl border border-black/5">
                                                                        <span className="text-[9px] font-black text-black/30 uppercase mr-2.5">S{idx+1}</span>
                                                                        <span className="text-[11px] font-black uppercase">
                                                                            {set.weight}kg <span className="opacity-20 ml-1">×</span> {set.reps}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )
                        })}

                        {filteredLogs.length === 0 && (
                            <div className="py-20 text-center space-y-4 opacity-20">
                                <History className="w-12 h-12 mx-auto" />
                                <p className="text-[11px] font-black uppercase tracking-[0.2em]">No performance records found</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* Deletion Confirmation Modal */}
            <AnimatePresence>
                {deletingLogId && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-md z-[1100] flex items-center justify-center p-6"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-[32px] p-8 w-full max-w-sm shadow-2xl space-y-6"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center">
                                <Trash2 className="w-7 h-7 text-rose-500" />
                            </div>
                            <div className="space-y-2 text-left">
                                <h3 className="text-xl font-black uppercase tracking-tight text-black">Delete Session?</h3>
                                <p className="text-[13px] font-medium text-black/40 leading-relaxed uppercase tracking-tight">
                                    This action cannot be undone. Are you sure you want to remove this record?
                                </p>
                            </div>
                            <div className="flex flex-col gap-3">
                                <button 
                                    onClick={confirmDelete}
                                    className="w-full py-4 bg-rose-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-rose-500/20"
                                >
                                    Confirm Delete
                                </button>
                                <button 
                                    onClick={() => setDeletingLogId(null)}
                                    className="w-full py-4 bg-black/5 text-black rounded-2xl text-[10px] font-black uppercase tracking-widest"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}
