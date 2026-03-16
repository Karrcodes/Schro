import * as React from 'react'
import { useState } from 'react'
import { useWellbeing } from '../contexts/WellbeingContext'
import { MoodEntry, MoodValue } from '../types'
import { Smile, Meh, Frown, Sun, CloudRain, Heart, MessageSquare, History, Briefcase, Dumbbell, Apple, Code, Map, MessageCircle, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

const MOODS: { value: MoodValue; label: string; icon: any; color: string; bg: string }[] = [
    { value: 'excellent', label: 'Excellent', icon: Sun, color: 'text-yellow-500', bg: 'bg-yellow-50' },
    { value: 'good', label: 'Good', icon: Smile, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { value: 'neutral', label: 'Neutral', icon: Meh, color: 'text-blue-500', bg: 'bg-blue-50' },
    { value: 'low', label: 'Low', icon: CloudRain, color: 'text-amber-500', bg: 'bg-amber-50' },
    { value: 'bad', label: 'Bad', icon: Frown, color: 'text-rose-500', bg: 'bg-rose-50' },
]

const ACTIVITIES = [
    { id: 'work', label: 'Work', icon: Briefcase },
    { id: 'workout', label: 'Workout', icon: Dumbbell },
    { id: 'macros', label: 'Macros', icon: Apple },
    { id: 'project', label: 'Project', icon: Code },
    { id: 'walk', label: 'Walk', icon: Map },
    { id: 'conversation', label: 'Talk', icon: MessageCircle },
]

export function MoodTracker() {
    const { moodLogs, logMood } = useWellbeing()
    const [selectedMood, setSelectedMood] = useState<MoodValue | null>(null)
    const [selectedActivities, setSelectedActivities] = useState<string[]>([])
    const [isExpanded, setIsExpanded] = useState(false)

    const today = new Date().toISOString().split('T')[0]
    const todayMood = moodLogs.find((m: MoodEntry) => m.date === today)

    const handleLog = () => {
        if (selectedMood) {
            logMood(selectedMood, '', selectedActivities)
            setSelectedMood(null)
            setSelectedActivities([])
            setIsExpanded(false)
        }
    }

    const toggleActivity = (id: string) => {
        setSelectedActivities(prev => 
            prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
        )
    }

    return (
        <div className="bg-white border border-black/5 rounded-[32px] p-8 space-y-6 shadow-sm group h-[420px] overflow-hidden">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center">
                        <Heart className="w-5 h-5 text-rose-500" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-black uppercase tracking-tighter leading-none">Mood Tracker</h3>
                        <p className="text-[10px] font-black text-black/30 uppercase tracking-widest mt-0.5">Emotional Protocol</p>
                    </div>
                </div>
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-2 hover:bg-black/5 rounded-xl transition-colors"
                >
                    <History className="w-5 h-5 text-black/20 group-hover:text-black/40" />
                </button>
            </div>

            <div className="grid grid-cols-5 gap-3">
                {MOODS.map((m) => (
                    <button
                        key={m.value}
                        onClick={() => setSelectedMood(m.value)}
                        className={cn(
                            "flex flex-col items-center gap-2 p-3 rounded-2xl transition-all border",
                            selectedMood === m.value
                                ? "bg-black text-white border-black"
                                : "bg-black/[0.02] border-transparent hover:border-black/10"
                        )}
                    >
                        <m.icon className={cn("w-6 h-6", selectedMood === m.value ? "text-white" : m.color)} />
                        <span className="text-[9px] font-black uppercase tracking-wider">{m.label}</span>
                    </button>
                ))}
            </div>

            <div className="space-y-3">
                <p className="text-[10px] font-black text-black/20 uppercase tracking-widest px-1">What did you do today?</p>
                <div className={cn(
                    "grid grid-cols-3 gap-2 transition-all duration-500",
                    !selectedMood && "opacity-30 grayscale pointer-events-none"
                )}>
                    {ACTIVITIES.map(activity => (
                        <button
                            key={activity.id}
                            onClick={() => toggleActivity(activity.id)}
                            className={cn(
                                "flex items-center justify-center gap-2 p-3 rounded-2xl border transition-all",
                                selectedActivities.includes(activity.id)
                                    ? "bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm"
                                    : "bg-black/[0.02] border-transparent text-black/40 hover:border-black/10"
                            )}
                        >
                            <activity.icon className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-wider">{activity.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="pt-2">
                <button
                    onClick={handleLog}
                    disabled={!selectedMood}
                    className={cn(
                        "w-full py-4 rounded-2xl text-[12px] font-black uppercase tracking-[0.2em] transition-all duration-500",
                        selectedMood
                            ? "bg-black text-white shadow-lg shadow-black/10 hover:scale-[1.01] active:scale-[0.98]"
                            : "bg-black/[0.05] text-black/20 cursor-not-allowed"
                    )}
                >
                    Complete Entry
                </button>
            </div>

            {!selectedMood && !isExpanded && todayMood && (
                <div className="pt-4 border-t border-black/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {(() => {
                            const mood = MOODS.find(m => m.value === todayMood.value)
                            return mood && <mood.icon className={cn("w-5 h-5", mood.color)} />
                        })()}
                        <div>
                            <p className="text-[12px] font-black uppercase text-black">Today's Flow</p>
                            <p className="text-[10px] font-bold text-black/40 uppercase">{todayMood.time}</p>
                        </div>
                    </div>
                    {todayMood.note && (
                        <div className="bg-black/[0.03] px-3 py-1.5 rounded-lg">
                            <p className="text-[11px] font-medium text-black/60 italic truncate max-w-[120px]">"{todayMood.note}"</p>
                        </div>
                    )}
                </div>
            )}

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-4 pt-4 border-t border-black/5"
                    >
                        <h4 className="text-[10px] font-black text-black/30 uppercase tracking-widest px-1">Recent History</h4>
                        <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                            {moodLogs.length === 0 ? (
                                <p className="text-[11px] font-bold text-black/20 text-center py-4 uppercase">No logs yet</p>
                            ) : (
                                moodLogs.map((log) => {
                                    const m = MOODS.find(mood => mood.value === log.value)
                                    return (
                                        <div key={log.id} className="flex items-center justify-between p-3 bg-black/[0.02] rounded-2xl border border-black/5">
                                            <div className="flex items-center gap-3">
                                                {m && <m.icon className={cn("w-4 h-4", m.color)} />}
                                                <div>
                                                    <p className="text-[11px] font-black uppercase text-black">{m?.label}</p>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <p className="text-[9px] font-bold text-black/30 uppercase">{log.date} • {log.time}</p>
                                                        {log.activities && log.activities.length > 0 && (
                                                            <div className="flex items-center gap-1">
                                                                <span className="w-1 h-1 rounded-full bg-black/10" />
                                                                {log.activities.map(actId => {
                                                                    const act = ACTIVITIES.find(a => a.id === actId)
                                                                    return act && <act.icon key={actId} className="w-2.5 h-2.5 text-indigo-500/50" />
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            {log.note && (
                                                <div className="group/note relative">
                                                    <MessageSquare className="w-3 h-3 text-black/20" />
                                                    <div className="absolute bottom-full right-0 mb-2 w-48 p-3 bg-white border border-black/5 rounded-xl shadow-xl opacity-0 group-hover/note:opacity-100 transition-opacity pointer-events-none z-50">
                                                        <p className="text-[11px] font-medium text-black/70 leading-relaxed italic">"{log.note}"</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
