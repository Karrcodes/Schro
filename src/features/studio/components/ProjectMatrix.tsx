'use client'

import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { motion, useMotionValue, animate, AnimatePresence } from 'framer-motion'
import { useStudio } from '../hooks/useStudio'
import { cn } from '@/lib/utils'
import type { StudioMilestone, ProjectMatrixProps, StudioProject, StudioContent } from '../types/studio.types'
import { useTasks } from '@/features/tasks/hooks/useTasks'
import type { Task } from '@/features/tasks/types/tasks.types'
import { TaskDetailModal } from '@/features/tasks/components/TaskDetailModal'
import { RefreshCw, Beaker, Factory, Tv, TrendingUp, Zap, Clock, Edit2, Calendar, Check, X, ArrowRight, Rocket, Video } from 'lucide-react'
import ProjectDetailModal from './ProjectDetailModal'
import ContentDetailModal from './ContentDetailModal'
import { useRota } from '@/features/finance/hooks/useRota'
import { isShiftDay } from '@/features/finance/utils/rotaUtils'

const PRIORITY_COLORS = {
    urgent: 'bg-purple-600 shadow-purple-500/40 text-purple-50',
    high: 'bg-red-500 shadow-red-500/40 text-red-50',
    mid: 'bg-amber-500 shadow-amber-500/40 text-amber-50',
    low: 'bg-neutral-800 shadow-black/40 text-neutral-50'
}

const STRATEGIC_CATEGORIES = [
    { id: 'rnd', label: 'R&D', icon: Beaker, color: 'text-purple-600 bg-purple-50 border-purple-100', dotBgColor: 'bg-purple-500 shadow-purple-500/40' },
    { id: 'production', label: 'Production', icon: Factory, color: 'text-orange-600 bg-orange-50 border-orange-100', dotBgColor: 'bg-orange-500 shadow-orange-500/40' },
    { id: 'media', label: 'Media', icon: Tv, color: 'text-rose-600 bg-rose-50 border-rose-100', dotBgColor: 'bg-rose-500 shadow-rose-500/40' },
    { id: 'growth', label: 'Growth', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50 border-emerald-100', dotBgColor: 'bg-emerald-500 shadow-emerald-500/40' },
] as const

const getPriorityFromImpact = (impactScore: number | undefined): string => {
    if (!impactScore) return 'low'
    if (impactScore >= 9) return 'urgent'
    if (impactScore >= 7) return 'high'
    if (impactScore >= 4) return 'mid'
    return 'low'
}

const getPriorityY = (priority: string | undefined): number => {
    switch (priority) {
        case 'urgent': return 12.5
        case 'high': return 37.5
        case 'mid': return 62.5
        case 'low': default: return 87.5
    }
}

const getImpactFromY = (yPercent: number): number => {
    if (yPercent < 25) return 9 // Urgent
    if (yPercent < 50) return 7 // High
    if (yPercent < 75) return 4 // Mid
    return 1 // Low
}

const getImpactOpacity = (priority: string | undefined, impactScore: number | undefined): number => {
    if (priority === 'urgent') return 1;
    const score = impactScore || 1;
    return 0.4 + (score / 10) * 0.6;
}

const getUrgencyX = (targetDate: string | undefined | null): number => {
    if (!targetDate) return 92
    const due = new Date(targetDate)
    due.setHours(0, 0, 0, 0)
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const diffDays = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    const clamped = Math.max(0, Math.min(14, diffDays))
    return 16 + (clamped / 14) * 68
}

const getTargetDateFromX = (xPercent: number): string | undefined => {
    if (xPercent > 86) return undefined
    const fraction = Math.max(0, (xPercent - 16) / 68)
    const days = Math.round(fraction * 14)
    if (days > 14) return undefined
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() + days)
    return date.toISOString().split('T')[0]
}

function ItemDot({
    item,
    containerRef,
    editItem,
    finalPosition,
    onSelectItem,
    isMoveApplied,
    setHoveredDayIndex,
    isConfirmingMove,
    safeZoneRef,
    projects,
    content
}: {
    item: { id: string, type: 'task' | 'milestone', data: any },
    containerRef: React.RefObject<HTMLDivElement | null>,
    editItem: (id: string, updates: any, callback: any) => void,
    finalPosition: { x: number, y: number, density?: 'full' | 'compact' | 'minimal' },
    onSelectItem: (item: any) => void,
    isMoveApplied: boolean,
    setHoveredDayIndex: (index: number | null) => void,
    isConfirmingMove: boolean,
    safeZoneRef: React.RefObject<HTMLDivElement | null>,
    projects: StudioProject[],
    content: StudioContent[]
}) {
    const [isDragging, setIsDragging] = useState(false)
    const dotRef = useRef<HTMLDivElement>(null)
    const dragStartPos = useRef<{ x: number, y: number } | null>(null)
    const mvX = useMotionValue(0)
    const mvY = useMotionValue(0)

    const data = item.data
    const priority = item.type === 'task' ? data.priority : getPriorityFromImpact(data.impact_score)
    const dueDate = item.type === 'task' ? data.due_date : data.target_date

    const syncKey = `${item.id}-${priority}-${dueDate}-${finalPosition.x}-${finalPosition.y}`
    useEffect(() => {
        if (!isDragging && !isConfirmingMove) {
            mvX.set(0)
            mvY.set(0)
        }
    }, [syncKey, isDragging, isConfirmingMove])

    const categoryId = item.type === 'task' ? data.strategic_category : data.category
    const categoryConfig = STRATEGIC_CATEGORIES.find(c => c.id === categoryId || c.label.toLowerCase() === categoryId?.toLowerCase())
    const dotColorClass = categoryConfig ? categoryConfig.dotBgColor : 'bg-neutral-800 shadow-black/40'
    const opacity = getImpactOpacity(priority, data.impact_score)

    return (
        <motion.div
            key={`${item.type}-${item.id}`}
            drag
            dragListener={!isMoveApplied}
            dragConstraints={containerRef}
            dragElastic={0}
            dragMomentum={false}
            dragPropagation={false}
            onDragStart={() => {
                setIsDragging(true)
                dragStartPos.current = { x: finalPosition.x, y: finalPosition.y }
            }}
            onDrag={(e, info) => {
                if (!dotRef.current || !containerRef.current) return
                const dotRect = dotRef.current.getBoundingClientRect()
                const containerRect = containerRef.current.getBoundingClientRect()
                const dotCenterX = dotRect.left + dotRect.width / 2
                const dotCenterY = dotRect.top + dotRect.height / 2
                const dropX = dotCenterX - containerRect.left
                const dropY = dotCenterY - containerRect.top
                let xPercent = (dropX / containerRect.width) * 100
                let yPercent = (dropY / containerRect.height) * 100
                xPercent = Math.max(16, Math.min(84, xPercent))
                yPercent = Math.max(5, Math.min(95, yPercent))
                const daysFraction = (xPercent - 16) / 68 * 14
                const snappedDays = Math.round(Math.max(0, Math.min(14, daysFraction)))
                const snappedX = 16 + (snappedDays / 14) * 68
                setHoveredDayIndex(snappedDays)
                editItem(item.id, { x: snappedX, y: yPercent }, null)
            }}
            onDragEnd={(e, info) => {
                setIsDragging(false)
                setHoveredDayIndex(null)
                if (!dotRef.current || !containerRef.current) return
                const dotRect = dotRef.current.getBoundingClientRect()
                const containerRect = containerRef.current.getBoundingClientRect()
                const dotCenterX = dotRect.left + dotRect.width / 2
                const dotCenterY = dotRect.top + dotRect.height / 2
                const dropX = dotCenterX - containerRect.left
                const dropY = dotCenterY - containerRect.top
                let xPercent = (dropX / containerRect.width) * 100
                let yPercent = (dropY / containerRect.height) * 100
                xPercent = Math.max(16, Math.min(84, xPercent))
                yPercent = Math.max(15, Math.min(85, yPercent))
                const daysFraction = (xPercent - 16) / 68 * 14
                const snappedDays = Math.round(Math.max(0, Math.min(14, daysFraction)))
                const snappedX = 16 + (snappedDays / 14) * 68
                editItem(item.id, { x: snappedX, y: yPercent }, (_confirmed: boolean) => {
                    animate(mvX, 0, { type: 'spring', damping: 30, stiffness: 300 })
                    animate(mvY, 0, { type: 'spring', damping: 30, stiffness: 300 })
                })
                const endOffsetXPercent = xPercent - snappedX
                mvX.set(endOffsetXPercent * (containerRect.width / 100))
                mvY.set(0)
            }}
            whileDrag={{ scale: 1.4, zIndex: 100 }}
            whileHover={{ scale: isMoveApplied ? 1 : 1.25 }}
            animate={{
                scale: isDragging ? 1.4 : (data.impact_score && data.impact_score > 7 ? 1.1 : 1),
                zIndex: isDragging ? 100 : 10,
                opacity: opacity
            }}
            style={{
                x: mvX,
                y: mvY,
                left: `${(isDragging && dragStartPos.current) ? dragStartPos.current.x : finalPosition.x}%`,
                top: `${(isDragging && dragStartPos.current) ? dragStartPos.current.y : finalPosition.y}%`,
                position: 'absolute',
                marginTop: finalPosition.density === 'full' ? '-24px' : '-12px',
                marginLeft: '-12px',
                touchAction: 'none'
            }}
            className={cn(
                "group flex items-center cursor-grab active:cursor-grabbing",
                "backdrop-blur-[2px] shadow-sm hover:shadow-md",
                isDragging ? "shadow-2xl ring-4 ring-black/10 scale-110 z-[100] select-none" : "z-10",
                item.type === 'milestone' && "border-2",
                finalPosition.density === 'full' ? cn(
                    "border items-center p-2 pr-4 h-auto min-h-[44px] rounded-xl",
                    priority === 'urgent' ? "bg-purple-50/90 border-purple-200" :
                        priority === 'high' ? "bg-red-50/90 border-red-200" :
                            priority === 'mid' ? "bg-amber-50/90 border-amber-200" :
                                "bg-black/[0.04] border-black/[0.05]"
                ) :
                    finalPosition.density === 'compact' ? cn(
                        "border rounded-lg p-1.5 pr-3 h-6",
                        priority === 'urgent' ? "bg-purple-50/90 border-purple-100" :
                            priority === 'high' ? "bg-red-50/90 border-red-100" :
                                priority === 'mid' ? "bg-amber-50/90 border-amber-100" :
                                    "bg-black/[0.04] border-black/[0.05]"
                    ) : "p-1.5 w-6 h-6 justify-center",
                data.impact_score && data.impact_score >= 8 && "ring-2 ring-amber-400/30 shadow-[0_0_15px_rgba(251,191,36,0.2)]"
            )}
            onClick={(e) => {
                if (!isDragging) {
                    e.stopPropagation()
                    onSelectItem(item)
                }
            }}
        >
            <div
                ref={dotRef}
                className={cn(
                    "w-3 h-3 rounded-full flex-shrink-0 shadow-sm",
                    dotColorClass,
                    isDragging && "scale-110",
                    item.type === 'milestone' && "ring-2 ring-white ring-inset"
                )}
            />
            {finalPosition.density !== 'minimal' && (
                <div className="flex flex-col items-start ml-2.5 overflow-hidden">
                    <div className="flex items-center gap-1.5">
                        <span className={cn(
                            "text-[10px] font-semibold tracking-tight leading-none whitespace-nowrap text-black/80 flex items-center gap-1",
                            data.impact_score && data.impact_score >= 8 && "font-black text-[11px]"
                        )}>
                            {item.type === 'milestone' ? (
                                data.content_id ? <Video className="w-2.5 h-2.5 opacity-40 shrink-0" /> : <Rocket className="w-2.5 h-2.5 opacity-40 shrink-0" />
                            ) : (
                                <>
                                    {data.project_id && <Rocket className="w-3 h-3 text-orange-500 shrink-0" />}
                                    {data.content_id && <Video className="w-3 h-3 text-blue-500 shrink-0" />}
                                </>
                            )}
                            {data.title}
                        </span>
                        {data.impact_score && finalPosition.density === 'compact' && (
                            <span className="flex items-center gap-0.5 text-[8px] font-black text-amber-600 flex-shrink-0">
                                <Zap className="w-2 h-2 fill-current" />
                                {data.impact_score}
                            </span>
                        )}
                        {item.type === 'task' && data.estimated_duration && finalPosition.density === 'compact' && (
                            <span className="flex items-center gap-0.5 text-[8px] font-bold text-black/30 flex-shrink-0">
                                <Clock className="w-2 h-2" />
                                {data.estimated_duration}m
                            </span>
                        )}
                    </div>
                    {finalPosition.density === 'full' && (data.content_id || data.project_id) && (
                        <div className="mt-[-3px]">
                            <span className="text-[7px] font-bold text-black/30 bg-black/[0.03] border border-black/5 rounded px-1 py-0.5 w-fit">
                                {data.content_id
                                    ? content.find((c: any) => c.id === data.content_id)?.title || 'Content'
                                    : projects.find((p: StudioProject) => p.id === data.project_id)?.title || 'Project'}
                            </span>
                        </div>
                    )}
                    {finalPosition.density === 'full' && (
                        <div className="flex items-center gap-2 mt-1">
                            {data.impact_score && (
                                <span className="flex items-center gap-0.5 text-[8px] font-black text-amber-600 flex-shrink-0">
                                    <Zap className="w-2 h-2 fill-current" />
                                    {data.impact_score}
                                </span>
                            )}
                            {item.type === 'task' && data.estimated_duration && (
                                <span className="flex items-center gap-0.5 text-[8px] font-bold text-black/30 flex-shrink-0">
                                    <Clock className="w-2 h-2" />
                                    {data.estimated_duration}m
                                </span>
                            )}
                            {dueDate && (
                                <span className="flex items-center gap-0.5 text-[8px] font-bold text-black/25 uppercase tracking-tighter whitespace-nowrap">
                                    <Calendar className="w-2 h-2" />
                                    {new Date(dueDate).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            )}
            <div className={cn(
                "absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-max max-w-[220px] bg-white border border-black/10 text-black p-3 rounded-2xl shadow-2xl pointer-events-auto transition-all duration-200 z-[200] space-y-2",
                isDragging ? "opacity-0 invisible" : "opacity-0 invisible group-hover:opacity-100 group-hover:visible"
            )}>
                <p className="text-[12px] font-bold tracking-tight leading-tight">{data.title}</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={cn(
                        "text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider text-white",
                        (PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS] || PRIORITY_COLORS.low).split(' ')[0]
                    )}>{priority}</span>
                    {data.impact_score && (
                        <span className="flex items-center gap-1 text-[9px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">
                            <Zap className="w-2.5 h-2.5 fill-current" />{data.impact_score}
                        </span>
                    )}
                    {dueDate && (
                        <span className="text-[8px] font-bold text-black/25 bg-black/[0.03] px-1.5 py-0.5 rounded-md uppercase tracking-tighter">
                            {new Date(dueDate).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                        </span>
                    )}
                </div>
            </div>
        </motion.div>
    )
}

export default function ProjectMatrix({ searchQuery = '', filterType = null, showArchived = false }: ProjectMatrixProps) {
    const { projects, sparks, content, milestones, updateMilestone, refresh, loading: studioLoading } = useStudio()
    const { tasks, loading: tasksLoading, editTask, toggleTask } = useTasks('todo', 'all')
    const { overrides } = useRota('all')
    const loading = studioLoading || tasksLoading

    const containerRef = useRef<HTMLDivElement>(null)
    const safeZoneRef = useRef<HTMLDivElement>(null)
    const [selectedParentId, setSelectedParentId] = useState<string | null>(null)
    const [parentType, setParentType] = useState<'project' | 'spark' | 'content' | null>(null)
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
    const selectedTaskForModal = tasks.find(t => t.id === selectedTaskId) || null
    const [hoveredDayIndex, setHoveredDayIndex] = useState<number | null>(null)
    const [selectedStrategicCategory, setSelectedStrategicCategory] = useState<'all' | string>('all')
    const [isPlottingAI, setIsPlottingAI] = useState(false)

    // Move Confirmation State
    const [movingItem, setMovingItem] = useState<{ id: string, type: 'task' | 'milestone', data: any } | null>(null)
    const [newMovePos, setNewMovePos] = useState<{ x: number, y: number } | null>(null)
    const [isConfirmingMove, setIsConfirmingMove] = useState(false)
    const [onMoveSettled, setOnMoveSettled] = useState<((confirmed: boolean) => void) | null>(null)
    const lastStablePositions = useRef<Record<string, any>>({})
    const wasConfirmingRef = useRef(false)

    const checkIsWorkDay = useCallback((date: Date) => {
        const dateStr = date.toISOString().split('T')[0]
        const override = overrides.find(o => o.date === dateStr)
        if (override) {
            if (override.type === 'overtime') return true
            if (override.type === 'holiday' || override.type === 'absence') return false
        }
        return isShiftDay(date)
    }, [overrides])

    const filteredItems = useMemo(() => {
        const activeProjects = projects.filter(p => showArchived || !p.is_archived)
        const activeProjectIds = new Set(activeProjects.map(p => p.id))

        const milest = milestones.filter(m => {
            const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase())
            const matchesCategory = selectedStrategicCategory === 'all' || m.category === selectedStrategicCategory
            // Include orphan milestones (content milestones with no project_id) + milestones from active projects
            const isVisible = !m.project_id || activeProjectIds.has(m.project_id)

            // Only show milestones with a target date and within roadmap range
            if (!m.target_date) return false
            const diff = (new Date(m.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            if (diff < -1 || diff > 15) return false

            return matchesSearch && matchesCategory && isVisible
        }).map(m => ({ id: m.id, type: 'milestone' as const, data: m }))


        const tsk = tasks.filter(t => {
            if (t.is_completed) return false
            if (t.profile !== 'business') return false
            const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase())
            const matchesCategory = selectedStrategicCategory === 'all' || t.strategic_category === selectedStrategicCategory

            // Always include tasks linked to projects/content, even without a due date
            const isLinked = !!(t.project_id || t.content_id)

            if (!isLinked) {
                // For general unlinked tasks, require a due_date within the 15-day window
                if (!t.due_date) return false
                const diff = (new Date(t.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                if (diff < -1 || diff > 15) return false
            } else {
                // For linked tasks, allow those with or without a due_date
                // But still filter out if due_date is set but very far out (> 30 days)
                if (t.due_date) {
                    const diff = (new Date(t.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                    if (diff < -1 || diff > 30) return false
                }
            }

            return matchesSearch && matchesCategory
        }).map(t => ({ id: t.id, type: 'task' as const, data: t }))

        return [...milest, ...tsk]
    }, [milestones, tasks, projects, searchQuery, selectedStrategicCategory, showArchived])

    const finalPositions = useMemo(() => {
        if (isConfirmingMove && wasConfirmingRef.current) {
            return lastStablePositions.current
        }

        const positions = filteredItems.map((item, idx) => {
            const isMovingThisItem = movingItem?.id === item.id;
            const isAnchored = isMovingThisItem && (isConfirmingMove || !!newMovePos);
            const targetPos = isAnchored && newMovePos ? newMovePos : null;

            let x: number;
            let y: number;

            if (item.type === 'task') {
                const task = item.data;
                x = targetPos ? targetPos.x : getUrgencyX(task.due_date);
                y = targetPos ? targetPos.y : getPriorityY(task.priority as any);
            } else {
                const milestone = item.data;
                x = targetPos ? targetPos.x : getUrgencyX(milestone.target_date);
                y = targetPos ? targetPos.y : getPriorityY(getPriorityFromImpact(milestone.impact_score));
            }

            // Dynamic Width Calculation
            const titleLen = Math.min(item.data.title.length, 25);
            const impactBonus = (item.data as any).impact_score ? 2 : 0;
            const width = 3 + (titleLen * 0.8) + impactBonus;
            const height = 3;

            return {
                id: item.id,
                x,
                y,
                width,
                height,
                priority: item.type === 'task' ? (item.data.priority === 'urgent' ? 10 : item.data.priority === 'high' ? 8 : 5) : (item.data.impact_score || 5)
            };
        });

        // Resolve Overlaps (Vertical Only)
        const iterations = 60;
        const topWall = 5;
        const bottomWall = 95;

        for (let i = 0; i < iterations; i++) {
            let totalShift = 0;
            for (let j = 0; j < positions.length; j++) {
                for (let k = j + 1; k < positions.length; k++) {
                    const a = positions[j];
                    const b = positions[k];

                    // Only check tasks on the same approximate X-axis (colliding labels)
                    const xOverlap = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x - 3, b.x - 3);

                    if (xOverlap > 0) {
                        const dy = a.y - b.y;
                        const distance = Math.abs(dy);
                        const minSpacing = 5.5;

                        if (distance < minSpacing) {
                            const force = (minSpacing - distance) / 2;
                            const shift = dy >= 0 ? force : -force;

                            const isAMoving = movingItem?.id === a.id;
                            const isBMoving = movingItem?.id === b.id;

                            if (isAMoving) {
                                positions[k].y -= shift * 1.2;
                            } else if (isBMoving) {
                                positions[j].y += shift * 1.2;
                            } else {
                                positions[j].y += shift;
                                positions[k].y -= shift;
                            }
                            totalShift += Math.abs(shift);
                        }
                    }
                }
            }

            // Global Boundary Pass
            positions.forEach(p => {
                if (p.y < topWall) {
                    const delta = topWall - p.y;
                    positions.forEach(other => {
                        if (Math.abs(other.x - p.x) < 5) other.y += delta;
                    });
                }
                if (p.y > bottomWall) {
                    const delta = p.y - bottomWall;
                    positions.forEach(other => {
                        if (Math.abs(other.x - p.x) < 5) other.y -= delta;
                    });
                }
            });

            if (totalShift < 0.01) break;
        }

        // Density Analysis: Determine labels visibility based on neighborhood density
        const result = positions.reduce((acc, pos, idx) => {
            const neighbors = positions.filter((p, i) => i !== idx && Math.abs(p.x - pos.x) < 5);
            const closeNeighbors = neighbors.filter(p => Math.abs(p.y - pos.y) < 10);
            const veryCloseNeighbors = neighbors.filter(p => Math.abs(p.y - pos.y) < 5);

            let density: 'full' | 'compact' | 'minimal' = 'full';
            if (veryCloseNeighbors.length > 0 || neighbors.length > 5) density = 'minimal';
            else if (closeNeighbors.length > 0) density = 'compact';

            acc[pos.id] = { x: pos.x, y: pos.y, density };
            return acc;
        }, {} as Record<string, { x: number, y: number, density: 'full' | 'compact' | 'minimal' }>);

        lastStablePositions.current = result;
        wasConfirmingRef.current = isConfirmingMove;

        return result
    }, [filteredItems, movingItem, newMovePos, isConfirmingMove])

    const handleInitiateMove = useCallback((id: string, pos: { x: number, y: number }, callback: ((confirmed: boolean) => void) | null) => {
        const item = filteredItems.find(x => x.id === id)
        if (item) {
            setMovingItem(item)
            setNewMovePos(pos)
            if (callback) {
                setIsConfirmingMove(true)
                setOnMoveSettled(() => callback)
            }
        }
    }, [filteredItems])

    const handleConfirmMove = async () => {
        if (!movingItem || !newMovePos) return
        const currentCallback = onMoveSettled
        const pos = { ...newMovePos }
        const newImpact = getImpactFromY(pos.y)
        const newDate = getTargetDateFromX(pos.x)

        try {
            if (movingItem.type === 'milestone') {
                await updateMilestone(movingItem.id, {
                    impact_score: newImpact,
                    target_date: newDate,
                })
            } else {
                const priority = getPriorityFromImpact(newImpact)
                await editTask(movingItem.id, {
                    priority: priority as any,
                    due_date: newDate,
                    ai_position_x: pos.x,
                    ai_position_y: pos.y
                })
            }
            await refresh()
            if (currentCallback) currentCallback(true)
        } catch (err) {
            console.error('Failed to update item position:', err)
            if (currentCallback) currentCallback(false)
        } finally {
            setMovingItem(null)
            setNewMovePos(null)
            setIsConfirmingMove(false)
            setOnMoveSettled(null)
        }
    }

    const handleCancelMove = () => {
        const currentCallback = onMoveSettled
        setMovingItem(null)
        setNewMovePos(null)
        setIsConfirmingMove(false)
        setOnMoveSettled(null)
        if (currentCallback) currentCallback(false)
    }

    const timelineDates = useMemo(() => {
        const dates = []
        for (let i = 0; i < 15; i++) {
            const d = new Date()
            d.setHours(0, 0, 0, 0)
            d.setDate(d.getDate() + i)
            dates.push(d)
        }
        return dates
    }, [])

    const workDayBlocks = useMemo(() => {
        const blocks: { start: number, end: number }[] = [];
        let currentBlock: { start: number, end: number } | null = null;
        timelineDates.forEach((date, i) => {
            if (checkIsWorkDay(date)) {
                if (!currentBlock) currentBlock = { start: i, end: i }
                else currentBlock.end = i
            } else {
                if (currentBlock) { blocks.push(currentBlock); currentBlock = null; }
            }
        });
        if (currentBlock) blocks.push(currentBlock);
        return blocks;
    }, [timelineDates, checkIsWorkDay]);

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const diffTime = nextMonth.getTime() - now.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    const showMonthMarker = diffDays >= 0 && diffDays <= 14;
    const monthMarkerX = showMonthMarker ? 16 + (diffDays / 14) * 68 : null;
    const monthLabel = nextMonth.toLocaleDateString('en-GB', { month: 'long' }).toUpperCase() + ' 1ST';

    // Modal Helpers
    const handleModalToggleSubtask = async (id: string, index: number) => {
        const t = tasks.find(x => x.id === id)
        if (!t?.notes?.content) return
        const newC = [...(t.notes.content as any[])]
        newC[index] = { ...newC[index], completed: !newC[index].completed }
        await editTask(id, { notes: { ...t.notes, content: newC } })
    }

    const handleModalToggleComplete = async (id: string, completed: boolean) => {
        await toggleTask(id, completed)
        setSelectedTaskId(null)
    }

    return (
        <div className="flex flex-col h-full space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-2 px-2">
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => setSelectedStrategicCategory('all')}
                        className={cn("px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all border", selectedStrategicCategory === 'all' ? "bg-black text-white border-black" : "bg-white text-black/40 border-black/[0.08] hover:border-black/20")}
                    >
                        All
                    </button>
                    {STRATEGIC_CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedStrategicCategory(cat.id)}
                            className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all border", selectedStrategicCategory === cat.id ? `${cat.color} border-current ring-1 ring-current/20` : "bg-white text-black/40 border-black/[0.08] hover:border-black/20")}
                        >
                            <cat.icon className="w-3.5 h-3.5" />
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            <div
                ref={containerRef}
                className={cn(
                    "relative w-full bg-white border border-black/[0.08] rounded-[32px] overflow-hidden shadow-sm",
                    "min-h-[600px]",
                    "md:portrait:min-h-[850px]",
                    "2xl:min-h-[850px]"
                )}
            >
                {/* Axis Grid Lines */}
                <div className="absolute inset-x-0 top-1/2 h-px bg-black/[0.04] -translate-y-1/2 pointer-events-none" />
                <div className="absolute inset-y-0 left-1/2 w-px bg-black/[0.04] -translate-x-1/2 pointer-events-none" />

                {/* Vertical Date Grid Lines (Every Day) */}
                <div className="absolute inset-0 pointer-events-none z-0">
                    {timelineDates.map((_, i) => (
                        <div
                            key={`grid-${i}`}
                            className={cn(
                                "absolute inset-y-0 w-px border-l transition-all duration-300",
                                hoveredDayIndex === null
                                    ? "border-black/[0.03]"
                                    : hoveredDayIndex === i
                                        ? "border-black/20 z-10 scale-x-125"
                                        : "border-black/[0.01]"
                            )}
                            style={{ left: `${16 + (i / 14) * 68}%` }}
                        />
                    ))}
                </div>

                {/* Physical Drag Constraint Zone (Hidden) */}
                <div
                    ref={safeZoneRef}
                    className="absolute inset-0 pointer-events-none z-0"
                    style={{ left: '16%', right: '16%', top: '5%', bottom: '5%' }}
                />

                {/* Curved Quadrant Labels */}
                <div className="absolute inset-0 pointer-events-none z-0">
                    <svg viewBox="0 0 200 200" className="absolute top-0 left-0 w-[200px] h-[200px] overflow-visible">
                        <path id="path-pm-tl" d="M 40 160 A 120 120 0 0 1 160 40" fill="none" />
                        <text className="fill-purple-600/10 text-[10px] font-black uppercase tracking-[0.2em]">
                            <textPath href="#path-pm-tl" startOffset="50%" textAnchor="middle">Urgent &amp; Important</textPath>
                        </text>
                    </svg>
                    <svg viewBox="0 0 200 200" className="absolute top-0 right-0 w-[200px] h-[200px] overflow-visible">
                        <path id="path-pm-tr" d="M 40 40 A 120 120 0 0 1 160 160" fill="none" />
                        <text className="fill-red-600/10 text-[10px] font-black uppercase tracking-[0.2em]">
                            <textPath href="#path-pm-tr" startOffset="50%" textAnchor="middle">High Importance</textPath>
                        </text>
                    </svg>
                    <svg viewBox="0 0 200 200" className="absolute bottom-0 left-0 w-[200px] h-[200px] overflow-visible">
                        <path id="path-pm-bl" d="M 40 40 A 120 120 0 0 0 160 160" fill="none" />
                        <text className="fill-amber-600/10 text-[10px] font-black uppercase tracking-[0.2em]">
                            <textPath href="#path-pm-bl" startOffset="50%" textAnchor="middle">Standard Focus</textPath>
                        </text>
                    </svg>
                    <svg viewBox="0 0 200 200" className="absolute bottom-0 right-0 w-[200px] h-[200px] overflow-visible">
                        <path id="path-pm-br" d="M 40 160 A 120 120 0 0 0 160 40" fill="none" />
                        <text className="fill-black/10 text-[10px] font-black uppercase tracking-[0.2em]">
                            <textPath href="#path-pm-br" startOffset="50%" textAnchor="middle">Backlog</textPath>
                        </text>
                    </svg>
                </div>

                {/* Priority Backlight Gradients */}
                <div
                    className="absolute left-0 inset-y-0 w-16 pointer-events-none opacity-60 z-0"
                    style={{
                        background: 'linear-gradient(to right, rgba(252,252,252,0) 0%, rgba(252,252,252,1) 100%), linear-gradient(to bottom, #a855f730 0%, #a855f730 25%, #ef444430 25%, #ef444430 50%, #f59e0b30 50%, #f59e0b30 75%, #26262615 75%, #26262610 100%)',
                        maskImage: 'linear-gradient(to right, black 0%, transparent 100%)'
                    }}
                />
                <div
                    className="absolute right-0 inset-y-0 w-16 pointer-events-none opacity-60 z-0"
                    style={{
                        background: 'linear-gradient(to left, rgba(252,252,252,0) 0%, rgba(252,252,252,1) 100%), linear-gradient(to bottom, #a855f730 0%, #a855f730 25%, #ef444430 25%, #ef444430 50%, #f59e0b30 50%, #f59e0b30 75%, #26262615 75%, #26262610 100%)',
                        maskImage: 'linear-gradient(to left, black 0%, transparent 100%)'
                    }}
                />

                {/* Working Day Highlights */}
                <div className="absolute inset-x-0 inset-y-0 pointer-events-none z-0 overflow-hidden">
                    {workDayBlocks.map((block, i) => {
                        const colWidth = 68 / 14;
                        const startX = 16 + (block.start / 14) * 68;
                        const width = (block.end - block.start) / 14 * 68 + colWidth;
                        return (
                            <div
                                key={`work-block-${i}`}
                                className="absolute inset-y-0 bg-black/[0.015] border-x border-dashed border-black/[0.12]"
                                style={{ left: `${startX - colWidth / 2}%`, width: `${width}%` }}
                            />
                        );
                    })}
                </div>

                {/* Month Marker */}
                {showMonthMarker && monthMarkerX !== null && (
                    <div
                        className="absolute inset-y-0 w-px pointer-events-none z-[1]"
                        style={{ left: `${monthMarkerX}%`, borderLeft: '1px dashed rgba(239, 68, 68, 0.4)' }}
                    >
                        <div className="absolute top-0 left-0 -translate-x-1/2 flex items-center justify-center pt-14">
                            <span className="text-[7px] font-black text-white bg-red-600/80 backdrop-blur-md px-2 py-0.5 rounded-full whitespace-nowrap shadow-md border border-white/20 uppercase tracking-[0.2em] -rotate-90 origin-center">
                                {monthLabel}
                            </span>
                        </div>
                    </div>
                )}

                {/* Date Scale Markers (Top) */}
                <div className="absolute top-0 inset-x-0 h-4 pointer-events-none z-10">
                    {timelineDates.map((date, i) => (
                        <div
                            key={`top-${i}`}
                            className="absolute top-0 flex flex-col items-center"
                            style={{ left: `${16 + (i / 14) * 68}%`, transform: 'translateX(-50%)' }}
                        >
                            <div className={cn("w-px bg-black/40", i % 2 === 0 ? "h-1.5" : "h-1 opacity-50")} />
                            <span className={cn("text-[7px] font-black mt-0.5 whitespace-nowrap tracking-tighter", i === 0 ? "text-purple-600" : "text-black/40", i % 2 !== 0 && "opacity-60")}>
                                {i === 0 ? 'TODAY' : date.getDate()}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Date Scale Markers (Bottom) */}
                <div className="absolute bottom-0 inset-x-0 h-4 pointer-events-none z-10">
                    {timelineDates.map((date, i) => (
                        <div
                            key={`bot-${i}`}
                            className="absolute bottom-0 flex flex-col items-center"
                            style={{ left: `${16 + (i / 14) * 68}%`, transform: 'translateX(-50%)' }}
                        >
                            <span className={cn("text-[7px] font-black mb-0.5 whitespace-nowrap tracking-tighter", i === 0 ? "text-purple-600" : "text-black/40", i % 2 !== 0 && "opacity-60")}>
                                {i === 0 ? 'TODAY' : date.getDate()}
                            </span>
                            <div className={cn("w-px bg-black/40", i % 2 === 0 ? "h-1.5" : "h-1 opacity-50")} />
                        </div>
                    ))}
                </div>

                {/* Axis Labels */}
                <div className="absolute top-1/2 left-6 text-[9px] font-black text-black/25 uppercase tracking-[0.3em] -translate-y-1/2 -translate-x-1/2 -rotate-90 origin-center pointer-events-none border-b border-black/5 pb-1">
                    Impact
                </div>
                <div className="absolute bottom-6 left-1/2 text-[9px] font-black text-black/25 uppercase tracking-[0.3em] -translate-x-1/2 pointer-events-none border-t border-black/5 pt-1">
                    Urgency
                </div>

                {/* Items Rendering */}
                {filteredItems.map(item => (
                    <ItemDot
                        key={item.id}
                        item={item}
                        containerRef={containerRef}
                        safeZoneRef={safeZoneRef}
                        editItem={handleInitiateMove}
                        finalPosition={finalPositions[item.id] || { x: 50, y: 50, density: 'full' }}
                        onSelectItem={(selected) => {
                            if (selected.type === 'milestone') {
                                if (selected.data.content_id) {
                                    setSelectedParentId(selected.data.content_id)
                                    setParentType('content')
                                } else {
                                    setSelectedParentId(selected.data.project_id || selected.data.spark_id || null)
                                    setParentType(selected.data.project_id ? 'project' : 'spark')
                                }
                            } else {
                                setSelectedTaskId(selected.data.id)
                            }
                        }}
                        isMoveApplied={isConfirmingMove && movingItem?.id !== item.id}
                        setHoveredDayIndex={setHoveredDayIndex}
                        isConfirmingMove={isConfirmingMove}
                        projects={projects}
                        content={content}
                    />
                ))}

                {/* Move Confirmation Overlay */}
                {movingItem && newMovePos && isConfirmingMove && (
                    <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/5 flex-col backdrop-blur-[2px] animate-in fade-in duration-300">
                        <motion.div initial={{ opacity: 0, scale: 0.9, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="w-[320px] bg-white rounded-3xl shadow-2xl border border-black/[0.08] p-6 flex flex-col gap-5">
                            <div className="flex flex-col gap-1">
                                <h3 className="text-[17px] font-black tracking-tight text-black">Update {movingItem.type === 'task' ? 'Operation' : 'Milestone'}?</h3>
                                <p className="text-[12px] text-black/40 font-medium leading-relaxed">You are changing the strategic focus of <b>"{movingItem.data.title}"</b>.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mt-1">
                                <button onClick={handleCancelMove} className="h-10 rounded-xl border border-black/[0.08] bg-white text-[13px] font-black text-black/40 hover:bg-black/[0.02] transition-colors uppercase">Cancel</button>
                                <button onClick={handleConfirmMove} className="h-10 rounded-xl bg-black text-white text-[13px] font-black hover:bg-neutral-800 transition-colors shadow-lg shadow-black/10 uppercase">Confirm</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </div>

            {/* Bottom Legend Bar */}
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 pt-4 pb-2 border-t border-black/[0.05]">
                <div className="flex flex-wrap items-center justify-center gap-6">
                    {STRATEGIC_CATEGORIES.map((cat) => (
                        <div key={cat.id} className="flex items-center gap-2.5">
                            <div className={cn("w-3 h-3 rounded-full shadow-sm", cat.dotBgColor)} />
                            <span className="text-[11px] font-black text-black/30 uppercase tracking-widest">{cat.label}</span>
                        </div>
                    ))}
                </div>
                <div className="hidden sm:block w-px h-4 bg-black/[0.08]" />
                <div className="flex flex-wrap items-center justify-center gap-6">
                    <div className="flex items-center gap-2.5">
                        <div className="w-4 h-3 bg-black/[0.04] border-x border-dashed border-black/10 rounded-sm" />
                        <span className="text-[10px] font-black text-black/30 uppercase tracking-widest">Working Day</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-4 h-3 bg-white border border-black/5 rounded-sm" />
                        <span className="text-[10px] font-black text-black/30 uppercase tracking-widest">Off Day</span>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <TaskDetailModal
                task={selectedTaskForModal}
                isOpen={!!selectedTaskId}
                onClose={() => setSelectedTaskId(null)}
                onToggleSubtask={handleModalToggleSubtask}
                onToggleComplete={handleModalToggleComplete}
                onEditTask={editTask}
                projects={projects}
                content={content}
            />

            {selectedParentId && parentType === 'project' && (
                <ProjectDetailModal
                    isOpen={!!selectedParentId}
                    onClose={() => { setSelectedParentId(null); setParentType(null); }}
                    project={projects.find(x => x.id === selectedParentId) || null}
                />
            )}

            {selectedParentId && parentType === 'content' && (
                <ContentDetailModal
                    isOpen={!!selectedParentId}
                    onClose={() => { setSelectedParentId(null); setParentType(null); }}
                    item={content.find(x => x.id === selectedParentId) || null}
                />
            )}
        </div>
    )
}
