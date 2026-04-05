import * as React from 'react'
import { useState } from 'react'
import { useWellbeing } from '../contexts/WellbeingContext'
import { MoodValue } from '../types'
import { Smile, Meh, Frown, Sun, CloudRain, Heart, Briefcase, Dumbbell, Apple, Code, Map, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

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
    const { logMood, moodLogs } = useWellbeing()
    const [selectedMood, setSelectedMood] = React.useState<MoodValue | null>(null)
    const [selectedActivities, setSelectedActivities] = React.useState<string[]>([])

    const today = React.useMemo(() => new Date().toISOString().split('T')[0], [])
    const todayMood = React.useMemo(() => moodLogs.find(m => m.date === today), [moodLogs, today])

    // Sync from global state if local state is empty or when todayMood changes
    React.useEffect(() => {
        if (todayMood) {
            setSelectedMood(todayMood.value)
            setSelectedActivities(todayMood.activities || [])
        }
    }, [todayMood])


    const handleLog = () => {
        if (selectedMood) {
            logMood(selectedMood, todayMood?.note || '', selectedActivities, today)
        }
    }

    const toggleActivity = (id: string) => {
        setSelectedActivities(prev => 
            prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
        )
    }

    return (
        <div className="w-full bg-white border border-black/5 rounded-[32px] p-8 space-y-4 shadow-sm group h-auto overflow-hidden">
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
            </div>

            <div className="grid grid-cols-5 gap-3">
                {MOODS.map((m) => (
                    <button
                        key={m.value}
                        onClick={() => setSelectedMood(m.value)}
                        className={cn(
                            "flex items-center justify-center p-4 rounded-2xl transition-all border",
                            selectedMood === m.value
                                ? "bg-black text-white border-black shadow-lg"
                                : "bg-black/[0.02] border-transparent hover:border-black/10"
                        )}
                        title={m.label}
                    >
                        <m.icon className={cn("w-7 h-7", selectedMood === m.value ? "text-white" : m.color)} />
                    </button>
                ))}
            </div>

            <div className="space-y-3">
                <p className="text-[10px] font-black text-black/20 uppercase tracking-widest px-1">What did you do today?</p>
                <div className={cn(
                    "grid grid-cols-6 gap-2 transition-all duration-500",
                    !selectedMood && "opacity-30 grayscale pointer-events-none"
                )}>
                    {ACTIVITIES.map(activity => (
                        <button
                            key={activity.id}
                            onClick={() => toggleActivity(activity.id)}
                            className={cn(
                                "flex items-center justify-center p-3 rounded-2xl border transition-all aspect-square",
                                selectedActivities.includes(activity.id)
                                    ? "bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm"
                                    : "bg-black/[0.02] border-transparent text-black/40 hover:border-black/10"
                            )}
                            title={activity.label}
                        >
                            <activity.icon className="w-5 h-5" />
                        </button>
                    ))}
                </div>
            </div>

            <div className="pt-0">
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
                    {todayMood ? "Update Entry" : "Complete Entry"}
                </button>
            </div>
        </div>
    )
}
