import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Clock, Coffee, ShowerHead as ShowerHeadIcon, Bed, Dumbbell, Utensils, Zap, Settings2,
    Activity, Play, CheckCircle2, AlertCircle, Bus, MapPin, Footprints, Moon, Star,
    Sparkles, AlertTriangle, RefreshCw, Bell, Check, Pause, BedDouble, Calendar, X,
    CalendarDays, UtensilsCrossed, ChevronRight, Hourglass
} from 'lucide-react'
import { usePlannerEngine, PlannerItem } from '../hooks/usePlannerEngine'
import { getNextOffPeriod, isShiftDay } from '@/features/finance/utils/rotaUtils'
import { cn } from '@/lib/utils'
import DatePickerInput from '@/components/DatePickerInput'

function getIcon(id: string, type: string, isStalled?: boolean) {
    const iconProps = { className: "w-4 h-4" }
    if (isStalled) return <AlertTriangle {...iconProps} className="w-4 h-4 text-white" />
    if (type === 'shift') return <Zap {...iconProps} />
    if (type === 'transit') return <Bus {...iconProps} />
    if (type === 'task') return <Activity {...iconProps} />
    if (type === 'sleep') return <Moon {...iconProps} />
    if (type === 'meal') return <Utensils {...iconProps} />

    const lowerId = id.toLowerCase()
    if (lowerId.includes('wake')) return <Coffee {...iconProps} />
    if (lowerId.includes('shower')) return <ShowerHeadIcon {...iconProps} />
    if (lowerId.includes('meal') || lowerId.includes('break') || lowerId.includes('oats')) return <Utensils {...iconProps} />
    if (lowerId.includes('sleep')) return <Moon {...iconProps} />
    if (lowerId.includes('gym') || lowerId.includes('workout')) return <Dumbbell {...iconProps} />

    return <Clock {...iconProps} />
}

const isPast = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number)
    const now = new Date()
    const itemTime = new Date()
    itemTime.setHours(hours, minutes, 0, 0)
    return now > itemTime
}

const addMinsToTime = (timeStr: string, mins: number): string => {
    const [h, m] = timeStr.split(':').map(Number)
    const total = h * 60 + m + mins
    const hh = Math.floor(total / 60) % 24
    const mm = total % 60
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

const PRIORITY_PILL: Record<string, string> = {
    urgent: 'bg-rose-100 text-rose-700',
    high: 'bg-amber-100 text-amber-700',
    mid: 'bg-blue-100 text-blue-700',
    low: 'bg-black/5 text-black/40',
}

function TaskBubble({ task, onClick }: { task: PlannerItem, onClick: () => void }) {
    return (
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            className={cn(
                "group relative flex flex-col items-center gap-2 p-3 rounded-3xl transition-all border-2",
                task.is_active
                    ? "bg-black border-black text-white shadow-xl shadow-black/20"
                    : "bg-white border-black/5 hover:border-black/10 text-black shadow-sm"
            )}
        >
            <div className={cn(
                "w-10 h-10 rounded-2xl flex items-center justify-center transition-colors",
                task.is_active ? "bg-white/20 text-white" : "bg-black/5 text-black/40 group-hover:bg-black/10"
            )}>
                {getIcon(task.id, task.type)}
            </div>
            <div className="text-center">
                <div className="text-[11px] font-bold leading-tight line-clamp-2 px-1">{task.title}</div>
                <div className="text-[9px] font-black opacity-40 mt-1 uppercase tracking-widest">{task.duration}m</div>
            </div>
            {task.is_active && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-black animate-pulse" />
            )}
        </motion.button>
    )
}

function NowIndicator({ anchors }: { anchors: PlannerItem[] }) {
    const [now, setNow] = useState(new Date())

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000)
        return () => clearInterval(timer)
    }, [])

    const currentTimeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

    const calculateTopOffset = () => {
        let totalHeight = 32 // Initial padding
        const currentMins = now.getHours() * 60 + now.getMinutes()

        for (let i = 0; i < anchors.length; i++) {
            const item = anchors[i]
            const [h, m] = item.time.split(':').map(Number)
            const itemStartMins = h * 60 + m

            if (currentMins >= itemStartMins + item.duration) {
                // Item in past: Card (flexible height, min 80) + Gap/Zone (160)
                totalHeight += Math.max(80, item.duration * 1.5) + 160
            } else if (currentMins >= itemStartMins) {
                // Item current
                const itemHeight = Math.max(80, item.duration * 1.5)
                const progress = (currentMins - itemStartMins) / item.duration
                totalHeight += (itemHeight * progress) + 16
                break
            } else {
                break
            }
        }
        return totalHeight
    }

    const topOffset = calculateTopOffset()

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, y: topOffset }}
            className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
            style={{ top: 0 }}
        >
            {/* Push pill fully right, outside item cards */}
            <div className="flex items-center w-full justify-end gap-2 pr-2">
                <div className="flex-1 h-[1.5px] bg-gradient-to-l from-rose-400 to-transparent opacity-40" />
                <span className="text-[10px] font-black text-rose-500 tabular-nums bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 shadow-sm z-10 shrink-0">
                    {currentTimeStr}
                </span>
            </div>
        </motion.div>
    )
}

function RescheduleModal({ task, onClose, onConfirm }: { task: PlannerItem, onClose: () => void, onConfirm: (date: Date) => void }) {
    // Generate tomorrow's date to ensure "Next Available" is strictly in the future
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)

    const nextOff = getNextOffPeriod(tomorrow).start
    const [selectedDateStr, setSelectedDateStr] = useState(
        nextOff.toISOString().split('T')[0]
    )

    const targetDate = new Date(selectedDateStr)
    const isTargetWorkday = isShiftDay(targetDate)

    // Check if it's deep work or long duration
    const isDeepWork = task.strategic_category?.toLowerCase().includes('deep') || task.duration > 60

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative w-full max-w-sm bg-white rounded-[32px] p-6 shadow-2xl overflow-hidden"
            >
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 w-8 h-8 rounded-full bg-black/5 flex items-center justify-center hover:bg-black/10 transition-colors"
                >
                    <X className="w-4 h-4 text-black/50" />
                </button>

                <h3 className="text-xl font-bold text-black mb-1 pr-10">Reschedule</h3>
                <p className="text-[13px] text-black/40 font-medium mb-6 truncate">{task.title}</p>

                <div className="space-y-4">
                    <button
                        onClick={() => setSelectedDateStr(nextOff.toISOString().split('T')[0])}
                        className={cn(
                            "w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left",
                            selectedDateStr === nextOff.toISOString().split('T')[0]
                                ? "border-blue-500 bg-blue-50/50"
                                : "border-black/5 hover:border-black/10 hover:bg-black/[0.02]"
                        )}
                    >
                        <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                            selectedDateStr === nextOff.toISOString().split('T')[0]
                                ? "bg-blue-100 text-blue-600"
                                : "bg-black/5 text-black/40"
                        )}>
                            <CalendarDays className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-[13px] font-bold text-black">Next Available Off-Day</div>
                            <div className="text-[11px] text-black/40 uppercase tracking-widest font-black mt-0.5">
                                {nextOff.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                            </div>
                        </div>
                    </button>

                    <div className="p-4 rounded-2xl border-2 border-black/5 bg-black/[0.01]">
                        <div className="text-[11px] font-black text-black/40 uppercase tracking-widest mb-3">Custom Date</div>
                        <DatePickerInput
                            value={selectedDateStr}
                            onChange={val => setSelectedDateStr(val)}
                        />
                    </div>

                    <AnimatePresence>
                        {isTargetWorkday && isDeepWork && (
                            <motion.div
                                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex gap-3">
                                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                    <div className="text-[12px] leading-relaxed text-amber-800">
                                        <span className="font-bold block mb-1">High Workload Warning</span>
                                        This is a work day. For tasks of this size ({task.duration}m), consider chunking or moving to your next available day off to prevent burnout.
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="mt-8 pt-6 border-t border-black/5">
                    <button
                        onClick={() => onConfirm(targetDate)}
                        className="w-full py-4 bg-black text-white rounded-2xl text-[12px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-black/10"
                    >
                        Confirm Reschedule
                    </button>
                </div>
            </motion.div>
        </div>
    )
}

export function DayPlanner() {
    const { settings, loading, anchors, fluidTasks, zones, reminders, initializeDay, reinitializeDay, endDay, initialization, isWorkDay, startTask, completeTask, rescheduleTask, isFlowActive, toggleFlow, updateSettings } = usePlannerEngine()
    const [activeTab, setActiveTab] = useState<'timeline' | 'settings'>('timeline')
    const [rescheduleData, setRescheduleData] = useState<PlannerItem | null>(null)

    if (loading) {
        return (
            <div className="p-12 flex flex-col items-center justify-center space-y-4">
                <div className="w-8 h-8 border-4 border-black/10 border-t-black rounded-full animate-spin" />
                <p className="text-[12px] font-bold text-black/40 uppercase tracking-widest">Plotting your optimal day...</p>
            </div>
        )
    }

    // Allow rendering the timeline even without formal initialization so the user sees the anchor skeleton

    return (
        <div className="space-y-6">
            <div className="mb-6">
                <h1 className="text-lg font-bold text-black flex items-center gap-2">
                    <span>📅</span> Day Planner
                </h1>
                <p className="text-[12px] text-black/40 font-medium">Strategic execution timeline</p>
            </div>

            <div className="flex items-center justify-between px-2 mb-8">
                <div className="flex bg-black/5 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('timeline')}
                        className={cn(
                            "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                            activeTab === 'timeline' ? "bg-white text-black shadow-sm" : "text-black/40"
                        )}
                    >
                        Timeline
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={cn(
                            "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                            activeTab === 'settings' ? "bg-white text-black shadow-sm" : "text-black/40"
                        )}
                    >
                        Rules
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    {initialization && !isWorkDay && (
                        <button
                            onClick={reinitializeDay}
                            className="p-2 rounded-xl bg-black/5 hover:bg-black hover:text-white text-black/40 transition-all group"
                            title="Re-initialize from now"
                        >
                            <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                        </button>
                    )}
                    {initialization && (
                        <button
                            onClick={endDay}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-[10px] font-black uppercase tracking-widest transition-all border border-indigo-100"
                            title="End Day — go to sleep"
                        >
                            <BedDouble className="w-3.5 h-3.5" />
                            End Day
                        </button>
                    )}
                    {!settings?.chill_mode_active && (
                        <button
                            onClick={toggleFlow}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2",
                                isFlowActive
                                    ? "bg-black text-white border-black animate-pulse ring-4 ring-black/10"
                                    : "bg-white text-black/40 border-black/5 hover:border-black/20"
                            )}
                        >
                            <Zap className={cn("w-3.5 h-3.5", isFlowActive && "fill-current")} />
                            {isFlowActive ? 'In Flow' : 'Flow Mode'}
                        </button>
                    )}
                </div>
            </div>

            {activeTab === 'timeline' ? (
                <div className="space-y-0 relative">
                    {/* Vertical timeline line */}
                    <div className="absolute left-[55px] top-6 bottom-6 w-px bg-gradient-to-b from-black/5 via-black/[0.06] to-black/5" />

                    {/* Now Indicator */}
                    <NowIndicator anchors={anchors} />

                    {/* Reminders section restored */}
                    {reminders && reminders.length > 0 && (
                        <div className="px-3 mb-8 relative z-10">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 shadow-sm">
                                        <Bell className="w-5 h-5 border-none" />
                                    </div>
                                    <div>
                                        <h3 className="text-[14px] font-black text-black uppercase tracking-tight">Focus List</h3>
                                        <p className="text-[10px] font-bold text-black/30">Priority tasks for today</p>
                                    </div>
                                </div>
                                <span className="px-3 py-1 bg-black/5 rounded-full text-[10px] font-black text-black/40 uppercase tracking-widest">{reminders.length} Pending</span>
                            </div>
                            <div className="grid gap-3">
                                {reminders.map(reminder => (
                                    <div key={reminder.id} className="group flex items-center gap-4 p-4 bg-white border border-black/[0.06] rounded-[24px] hover:border-black/10 transition-all shadow-sm">
                                        <button
                                            onClick={() => completeTask(reminder.id)}
                                            className="w-8 h-8 rounded-xl border-2 border-black/10 hover:border-black/30 transition-all flex items-center justify-center text-transparent hover:text-black/20 shrink-0"
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[14px] font-bold text-black truncate">{reminder.title}</span>
                                                {reminder.priority && (
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest",
                                                        PRIORITY_PILL[reminder.priority] || "bg-black/5 text-black/40"
                                                    )}>
                                                        {reminder.priority}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Interleaved Anchors and Fluid Zones */}
                    {anchors.map((item, idx) => {
                        const endTime = item.end_time || addMinsToTime(item.time, item.duration)
                        const zone = zones.find(z => z.id === `zone-${item.id}-${anchors[idx + 1]?.id}`)

                        return (
                            <div key={item.id}>
                                {/* Anchor Card */}
                                <div className="flex gap-3 group mb-0">
                                    <div className="w-14 shrink-0 flex flex-col justify-between items-end pr-3">
                                        <span className={cn(
                                            "text-[10px] font-black tabular-nums transition-colors duration-500 pt-1.5",
                                            isPast(item.time) && !item.is_completed ? "text-black/15" : "text-black/25"
                                        )}>{item.time}</span>
                                        <span className={cn(
                                            "text-[10px] font-black tabular-nums transition-colors duration-500 pb-1.5",
                                            isPast(item.time) && !item.is_completed ? "text-black/10" : "text-black/15"
                                        )}>{endTime}</span>
                                    </div>

                                    <div className="relative flex-1 pb-4">
                                        <div className={cn(
                                            "p-5 rounded-[24px] border border-black/[0.06] bg-white shadow-sm transition-all duration-500 relative overflow-hidden",
                                            item.type === 'sleep' && "bg-black text-white border-black ring-4 ring-black/5",
                                            item.type === 'shift' && "bg-blue-50/30 border-blue-100",
                                            item.is_active && "border-rose-400 bg-rose-50/10 ring-2 ring-rose-500/20 shadow-lg shadow-rose-500/10",
                                            item.is_current && !item.is_active && "border-rose-200 ring-1 ring-rose-200",
                                            isPast(item.time) && !item.is_completed && !item.is_active && !item.is_current && "opacity-35 grayscale-[0.5]"
                                        )}>
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-4 min-w-0">
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-colors shadow-sm",
                                                        item.type === 'sleep' ? "bg-white/10 text-white" : "bg-black text-white"
                                                    )}>
                                                        {getIcon(item.id, item.type, item.is_stalled)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className={cn("text-[15px] font-bold tracking-tight leading-tight", item.type === 'sleep' && "text-white")}>{item.title}</h3>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className={cn("text-[10px] font-bold tabular-nums opacity-30", item.type === 'sleep' && "text-white")}>
                                                                {item.time} — {endTime}
                                                            </span>
                                                            {item.class === 'A' && <span className="text-[8px] px-1.5 py-0.5 bg-black text-white rounded-md font-black ring-1 ring-white/10">FIXED</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Fluid Zone if exists */}
                                {zone && (
                                    <div className="flex gap-3 h-[180px] overflow-hidden">
                                        <div className="w-14 shrink-0 flex flex-col items-center justify-center">
                                            <div className="w-px h-full bg-dashed border-l border-dashed border-black/10" />
                                        </div>
                                        <div className="flex-1 py-4">
                                            <div className="h-full rounded-[32px] bg-black/[0.02] border-2 border-dashed border-black/5 flex flex-col relative group/zone">
                                                <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1 bg-white border border-black/5 rounded-full shadow-sm">
                                                    <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-black/40">
                                                        Fluid {zone.duration}m
                                                    </span>
                                                </div>

                                                <div className="flex-1 flex items-center justify-center gap-4 px-6 mt-4">
                                                    {fluidTasks
                                                        .filter(t => t.duration <= zone.duration)
                                                        .slice(0, 3) // Show top 3 fitting bubbles
                                                        .map(task => (
                                                            <TaskBubble
                                                                key={task.id}
                                                                task={task}
                                                                onClick={() => startTask(task.id)}
                                                            />
                                                        ))
                                                    }
                                                    {fluidTasks.filter(t => t.duration <= zone.duration).length === 0 && (
                                                        <div className="text-[10px] font-bold text-black/20 italic">No tasks fit this gap</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
                    {/* Mode Toggle */}
                    <div className="px-2">
                        <button
                            onClick={() => {/* Update Chill Mode Logic */ }}
                            className={cn(
                                "w-full p-6 rounded-[32px] border-2 flex items-center justify-between transition-all",
                                settings?.chill_mode_active
                                    ? "bg-amber-500 border-amber-600 shadow-lg shadow-amber-500/20"
                                    : "bg-white border-black/5 hover:border-black/10"
                            )}
                        >
                            <div className="flex items-center gap-4 text-left">
                                <div className={cn(
                                    "w-12 h-12 rounded-2xl flex items-center justify-center",
                                    settings?.chill_mode_active ? "bg-white/20 text-white" : "bg-amber-50 text-amber-500"
                                )}>
                                    <Coffee className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className={cn("text-[16px] font-black tracking-tight", settings?.chill_mode_active ? "text-white" : "text-black")}>Chill Mode</h3>
                                    <p className={cn("text-[12px] font-bold opacity-60", settings?.chill_mode_active ? "text-white" : "text-black/40")}>Suspends algorithmic scaling today</p>
                                </div>
                            </div>
                            <div className={cn(
                                "w-12 h-6 rounded-full relative transition-colors",
                                settings?.chill_mode_active ? "bg-white/40" : "bg-black/10"
                            )}>
                                <div className={cn(
                                    "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                                    settings?.chill_mode_active ? "left-7" : "left-1"
                                )} />
                            </div>
                        </button>
                    </div>

                    {/* Section: Routines */}
                    <div className="space-y-4 px-2">
                        <div className="flex items-center gap-2 px-4">
                            <Star className="w-4 h-4 text-black/40" />
                            <h3 className="text-[12px] font-black text-black uppercase tracking-widest">Routine Defaults</h3>
                        </div>
                        <div className="space-y-3">
                            {[
                                { id: 'gym', label: 'Gym Session', duration: settings?.routine_defaults?.gym.duration || 90, icon: <Dumbbell className="w-4 h-4" /> },
                                { id: 'walk', label: 'Recovery Walk', duration: settings?.routine_defaults?.walk.duration || 30, icon: <Footprints className="w-4 h-4" /> },
                                { id: 'meal', label: 'Meal Prep', duration: settings?.routine_defaults?.meal_prep.duration || 45, icon: <Utensils className="w-4 h-4" /> }
                            ].map((routine) => (
                                <div key={routine.id} className="p-6 rounded-[32px] bg-white border border-black/5 shadow-sm flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-2xl bg-black/[0.03] flex items-center justify-center text-black/40">
                                            {routine.icon}
                                        </div>
                                        <span className="text-[14px] font-bold text-black">{routine.label}</span>
                                    </div>
                                    <div className="flex items-center gap-3 bg-black/5 p-1 rounded-xl">
                                        <input
                                            type="number"
                                            value={routine.duration}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value) || 0;
                                                const routineKey = routine.id === 'meal' ? 'meal_prep' : routine.id;
                                                updateSettings({
                                                    routine_defaults: {
                                                        ...settings?.routine_defaults!,
                                                        [routineKey]: {
                                                            ...(settings?.routine_defaults as any)[routineKey],
                                                            duration: val
                                                        }
                                                    } as any
                                                });
                                            }}
                                            className="w-12 text-center bg-transparent text-[14px] font-black focus:outline-none"
                                        />
                                        <span className="text-[10px] font-black text-black/20 uppercase pr-2">Min</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <AnimatePresence>
                {rescheduleData && (
                    <RescheduleModal
                        task={rescheduleData}
                        onClose={() => setRescheduleData(null)}
                        onConfirm={(date: Date) => {
                            rescheduleTask(rescheduleData.id, date)
                            setRescheduleData(null)
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}


