'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import {
    Plus,
    Search,
    Calendar,
    Clock,
    ChevronDown,
    ChevronUp,
    MoreVertical,
    Trash2,
    Edit2,
    GripVertical,
    Zap,
    Briefcase,
    User,
    CheckSquare,
    AlertCircle,
    ArrowRight,
    Activity,
    ShoppingCart,
    Bell,
    X,
    RefreshCw,
    LayoutList,
    Type,
    List,
    ListChecks,
    Wallet,
    Heart,
    Filter,
    LayoutGrid,
    Settings2,
    Car,
    MapPin,
    Rocket,
    Video
} from 'lucide-react'
import { useTasksProfile } from '../contexts/TasksProfileContext'
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion'
import { useTasks } from '../hooks/useTasks'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { Task, TaskTemplate } from '../types/tasks.types'
import { TaskDetailModal } from './TaskDetailModal'
import { TaskSettingsModal } from './TaskSettingsModal'
import { getNextOffPeriod, isShiftDay } from '@/features/finance/utils/rotaUtils'
import { Beaker, Factory, Tv, TrendingUp, Shield } from 'lucide-react'
import { useStudio } from '@/features/studio/hooks/useStudio'
import type { StudioMilestone } from '@/features/studio/types/studio.types'
import ProjectDetailModal from '@/features/studio/components/ProjectDetailModal'
import ContentDetailModal from '@/features/studio/components/ContentDetailModal'

const PRIORITY_CONFIG = {
    urgent: { label: 'Urgent', color: 'bg-purple-50 text-purple-600 border-purple-200', sort: 0 },
    high: { label: 'High', color: 'bg-red-50 text-red-600 border-red-200', sort: 1 },
    mid: { label: 'Mid', color: 'bg-yellow-50 text-yellow-600 border-yellow-200', sort: 2 },
    low: { label: 'Low', color: 'bg-black/5 text-black/60 border-black/10', sort: 3 }
} as const

const PERSONAL_CATEGORIES = [
    { id: 'finance', label: 'Finance', icon: Wallet, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    { id: 'career', label: 'Career', icon: Briefcase, color: 'text-blue-600 bg-blue-50 border-blue-200' },
    { id: 'health', label: 'Health', icon: Heart, color: 'text-rose-600 bg-rose-50 border-rose-100' },
    { id: 'personal', label: 'Personal', icon: User, color: 'text-amber-600 bg-amber-50 border-amber-200' },
] as const

const BUSINESS_CATEGORIES = [
    { id: 'rnd', label: 'R&D', icon: Beaker, color: 'text-purple-600 bg-purple-50 border-purple-100' },
    { id: 'production', label: 'Production', icon: Factory, color: 'text-orange-600 bg-orange-50 border-orange-100' },
    { id: 'media', label: 'Media', icon: Tv, color: 'text-rose-600 bg-rose-50 border-rose-100' },
    { id: 'growth', label: 'Growth', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    { id: 'general', label: 'General', icon: Briefcase, color: 'text-neutral-600 bg-neutral-50 border-neutral-100' },
] as const

export function TaskList({ category }: { category: 'todo' | 'grocery' | 'reminder' }) {
    const { activeProfile } = useTasksProfile()
    const strategicCategories = activeProfile === 'personal' ? PERSONAL_CATEGORIES : BUSINESS_CATEGORIES

    const { tasks, loading: tasksLoading, createTask, toggleTask, deleteTask, clearAllTasks, clearCompletedTasks, editTask, updateTaskPositions } = useTasks(category)
    const { milestones, projects, content, loading: studioLoading } = useStudio()
    const loading = tasksLoading || studioLoading

    // Internalized title and icon logic
    const title = category === 'todo' ? 'Deployment' : category === 'grocery' ? 'Grocery List' : 'Reminders'
    const Icon = category === 'todo' ? Activity : category === 'grocery' ? ShoppingCart : Bell
    const [selectedTaskForModal, setSelectedTaskForModal] = useState<Task | null>(null)
    const [selectedMilestoneForModal, setSelectedMilestoneForModal] = useState<StudioMilestone | null>(null)
    const [selectedProjectForModal, setSelectedProjectForModal] = useState<any>(null)
    const [selectedContentForModal, setSelectedContentForModal] = useState<any>(null)
    const [newTask, setNewTask] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [amount, setAmount] = useState('1')
    const [priority, setPriority] = useState<'urgent' | 'high' | 'mid' | 'low'>('low')
    const [dueDate, setDueDate] = useState('')
    const [dueDateMode, setDueDateMode] = useState<'none' | 'on' | 'before' | 'range' | 'recurring'>('none')
    const [endDate, setEndDate] = useState('')
    const [recurringType, setRecurringType] = useState<'daily' | 'work_days' | 'off_days' | 'custom'>('off_days')
    const [recurringTime, setRecurringTime] = useState('')
    const [recurringDuration, setRecurringDuration] = useState('60')
    const [recurringDays, setRecurringDays] = useState<number[]>([])
    const [lastDeletedTask, setLastDeletedTask] = useState<Task | null>(null)
    const [showUndo, setShowUndo] = useState(false)
    const [showCreateNotes, setShowCreateNotes] = useState(false)
    const [createNotesType, setCreateNotesType] = useState<'text' | 'bullets' | 'checklist'>('text')
    const [createNotesContent, setCreateNotesContent] = useState<any>('')

    const [isAppointment, setIsAppointment] = useState(false)
    const [appointmentTime, setAppointmentTime] = useState('09:00')
    const [isLocationActive, setIsLocationActive] = useState(false)
    const [destination, setDestination] = useState('')
    const [startFrom, setStartFrom] = useState('7 ruby street cardiff CF24 1LP')
    const [isCalculatingTravel, setIsCalculatingTravel] = useState(false)
    const [startFromMode, setStartFromMode] = useState<'home' | 'other'>('home')
    const [travelMode, setTravelMode] = useState<'walking' | 'transit' | 'uber'>('walking')
    const [showSettings, setShowSettings] = useState(false)
    const [templates, setTemplates] = useState<TaskTemplate[]>([])
    const [showAllFields, setShowAllFields] = useState(false)
    const [newCreateChecklistItem, setNewCreateChecklistItem] = useState('')
    const [selectedStrategicCategory, setSelectedStrategicCategory] = useState<'all' | string>('all')
    const [newStrategicCategory, setNewStrategicCategory] = useState<string | undefined>(undefined)
    const [linkType, setLinkType] = useState<'none' | 'project' | 'content'>('none')
    const [newProjectId, setNewProjectId] = useState<string | undefined>(undefined)
    const [newContentId, setNewContentId] = useState<string | undefined>(undefined)
    const [estimatedDuration, setEstimatedDuration] = useState('30')
    const [travelDuration, setTravelDuration] = useState('15')
    const [impactScore, setImpactScore] = useState('5')
    const [locationSuggestions, setLocationSuggestions] = useState<{ display_name: string, name: string, place_id: string }[]>([])
    const [showLocationSuggestions, setShowLocationSuggestions] = useState(false)
    const locationSuggestionsRef = useRef<HTMLDivElement>(null)
    const autocompleteService = useRef<any>(null)
    const sessionToken = useRef<any>(null)

    // Confirmation Modal States
    const [confirmModal, setConfirmModal] = useState<{
        open: boolean;
        title: string;
        message: string;
        action: () => Promise<void>;
        confirmText: string;
        type: 'danger' | 'warning' | 'info';
    }>({
        open: false,
        title: '',
        message: '',
        action: async () => { },
        confirmText: 'Confirm',
        type: 'danger'
    })

    const handleModalToggleSubtask = async (taskId: string, idx: number) => {
        const t = tasks.find(item => item.id === taskId)
        if (!t?.notes || t.notes.type !== 'checklist') return

        const newContent = [...(t.notes.content as any[])]
        newContent[idx] = { ...newContent[idx], completed: !newContent[idx].completed }

        await editTask(taskId, {
            notes: {
                type: t.notes.type,
                content: newContent
            }
        })
        setSelectedTaskForModal(prev => {
            if (prev?.id === taskId && prev.notes && prev.notes.type === 'checklist') {
                return {
                    ...prev,
                    notes: {
                        type: prev.notes.type,
                        content: newContent
                    }
                }
            }
            return prev
        })
    }

    const handleModalToggleComplete = async (taskId: string, completed: boolean) => {
        await toggleTask(taskId, completed)
        setSelectedTaskForModal(prev => prev?.id === taskId ? { ...prev, is_completed: completed } : prev)
    }

    // Intelligent Task System states
    const [isAnalyzingPriority, setIsAnalyzingPriority] = useState(false)
    const [suggestedPriority, setSuggestedPriority] = useState<{ level: 'urgent' | 'high' | 'mid' | 'low', reason: string } | null>(null)
    const [showSuggestions, setShowSuggestions] = useState(false)

    // Derived autocomplete from history + Templates
    const autocompleteTitles = useMemo(() => {
        const lowerInput = newTask.toLowerCase()

        // Template matches (prioritized)
        const templateMatches = templates
            .filter(t => t.category === category && t.title.toLowerCase().includes(lowerInput))
            .map(t => ({ title: t.title, template: t }))

        if (!newTask.trim() || newTask.length < 2) {
            // Suggest templates even without typing if showAllFields is on
            return showAllFields ? templateMatches.slice(0, 5) : []
        }

        // History matches
        const historyMatches = Array.from(new Set(tasks.map(t => t.title)))
            .filter(t => t.toLowerCase().includes(lowerInput) && t.toLowerCase() !== lowerInput)
            .map(t => ({ title: t, template: null }))

        return [...templateMatches, ...historyMatches].slice(0, 5)
    }, [newTask, tasks, templates, category, showAllFields])

    useEffect(() => {
        const fetchTemplates = async () => {
            const { data } = await supabase.from('fin_task_templates').select('*')
            if (data) setTemplates(data)
        }
        fetchTemplates()
    }, [showSettings])

    // Debounced Smart Priority Analysis
    useEffect(() => {
        if (!newTask.trim() || newTask.length < 3 || category !== 'todo') {
            setSuggestedPriority(null)
            setIsAnalyzingPriority(false)
            return
        }

        setIsAnalyzingPriority(true)
        const timeout = setTimeout(async () => {
            try {
                // Get current workload context
                const openCount = tasks.filter(t => !t.is_completed).length
                const dist = tasks.reduce((acc, t) => {
                    if (!t.is_completed && t.priority) {
                        acc[t.priority] = (acc[t.priority] || 0) + 1
                    }
                    return acc
                }, {} as Record<string, number>)

                const res = await fetch('/api/smart-task', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: newTask,
                        openTasksCount: openCount,
                        priorityDistribution: dist
                    })
                })

                if (res.ok) {
                    const data = await res.json()
                    // Only show suggestion if it's different to current selected
                    if (data.priority && data.priority !== priority) {
                        setSuggestedPriority({ level: data.priority, reason: data.reason })
                    } else {
                        setSuggestedPriority(null)
                    }
                }
            } catch (err) {
                console.error('Smart priority failed', err)
                setSuggestedPriority(null)
            } finally {
                setIsAnalyzingPriority(false)
            }
        }, 800) // 800ms debounce

        return () => clearTimeout(timeout)
    }, [newTask, priority, category, tasks])

    useEffect(() => {
        // Load Google Maps Script if not present
        if (typeof window !== 'undefined' && !(window as any).google && process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
            const script = document.createElement('script')
            script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`
            script.async = true
            script.defer = true
            document.head.appendChild(script)
        }
    }, [])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (locationSuggestionsRef.current && !locationSuggestionsRef.current.contains(event.target as Node)) {
                setShowLocationSuggestions(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        if (!isLocationActive || !destination || destination.length < 3) {
            setLocationSuggestions([])
            setShowLocationSuggestions(false)
            return
        }

        const timer = setTimeout(async () => {
            if (typeof window !== 'undefined' && (window as any).google) {
                if (!autocompleteService.current) {
                    autocompleteService.current = new (window as any).google.maps.places.AutocompleteService()
                }
                if (!sessionToken.current) {
                    sessionToken.current = new (window as any).google.maps.places.AutocompleteSessionToken()
                }

                autocompleteService.current.getPlacePredictions(
                    {
                        input: destination,
                        sessionToken: sessionToken.current,
                        componentRestrictions: { country: 'gb' },
                        locationBias: { radius: 10000, center: { lat: 51.4816, lng: -3.1791 } }
                    },
                    (predictions: any, status: any) => {
                        if (status === 'OK' && predictions) {
                            setLocationSuggestions(predictions.map((p: any) => ({
                                display_name: p.description,
                                name: p.structured_formatting.main_text,
                                place_id: p.place_id
                            })))
                            setShowLocationSuggestions(true)
                        }
                    }
                )
                return
            }

            try {
                // Focus search on Cardiff/UK for better relevance
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destination)}&limit=10&addressdetails=1&countrycodes=gb&viewbox=-3.3,51.55,-3.0,51.4&bounded=0`)
                if (res.ok) {
                    const data = await res.json()
                    setLocationSuggestions(data.map((item: any) => ({
                        display_name: item.display_name,
                        name: item.name || item.display_name.split(',')[0],
                        place_id: item.place_id
                    })))
                    setShowLocationSuggestions(true)
                }
            } catch (e) {
                console.error('Location search failed', e)
            }
        }, 300)

        return () => clearTimeout(timer)
    }, [destination, isLocationActive])

    const calculateTravelTime = async () => {
        if (!destination.trim()) return
        setIsCalculatingTravel(true)
        try {
            // If we have Google Maps loaded, we can use Distance Matrix
            if (typeof window !== 'undefined' && (window as any).google) {
                const service = new (window as any).google.maps.DistanceMatrixService()
                const origin = startFrom || '7 Ruby Street, Cardiff, CF24 1LP'

                const gmTravelMode = travelMode === 'walking'
                    ? (window as any).google.maps.TravelMode.WALKING
                    : travelMode === 'transit'
                        ? (window as any).google.maps.TravelMode.TRANSIT
                        : (window as any).google.maps.TravelMode.DRIVING

                const request: any = {
                    origins: [origin],
                    destinations: [destination],
                    travelMode: gmTravelMode,
                }

                if (travelMode === 'transit') {
                    // Transit queries require a departure time
                    request.transitOptions = { departureTime: new Date() }
                }

                const response: any = await new Promise((resolve, reject) => {
                    service.getDistanceMatrix(
                        request,
                        (res: any, status: any) => {
                            if (status === 'OK') resolve(res)
                            else reject(status)
                        }
                    )
                })

                if (response.rows[0].elements[0].status === 'OK') {
                    const rawMins = Math.round(response.rows[0].elements[0].duration.value / 60)
                    // Round to nearest 15 to match the select dropdown options
                    const rounded = Math.max(15, Math.round(rawMins / 15) * 15)
                    setTravelDuration(rounded.toString())
                    setIsCalculatingTravel(false)
                    return
                }
            }

            // High-quality Heuristic Fallback
            let duration = 15;
            const lowerDest = destination.toLowerCase();

            // Base driving times
            if (lowerDest.includes('london') || lowerDest.includes('manchester')) duration = 180;
            else if (lowerDest.includes('bristol') || lowerDest.includes('bath')) duration = 60;
            else if (lowerDest.includes('swansea') || lowerDest.includes('newport')) duration = 45;
            else if (lowerDest.includes('cardiff')) duration = 20;

            // Apply mode multipliers
            if (travelMode === 'walking') duration = Math.round(duration * 4.5);
            else if (travelMode === 'transit') duration = Math.round(duration * 1.5);

            const [hours, mins] = appointmentTime.split(':').map(Number);
            const totalMins = hours * 60 + mins;
            const morningPeak = totalMins >= 450 && totalMins <= 570;
            const eveningPeak = totalMins >= 990 && totalMins <= 1110;
            if (morningPeak || eveningPeak) duration = Math.round(duration * 1.3);

            // Round heuristic to nearest 15 too
            const roundedDuration = Math.max(15, Math.round(duration / 15) * 15)
            await new Promise(r => setTimeout(r, 600));
            setTravelDuration(roundedDuration.toString());
        } catch (err) {
            console.error('Travel calculation failed', err)
            setTravelDuration('30')
        } finally {
            setIsCalculatingTravel(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newTask.trim()) return

        try {
            let finalTitle = newTask.trim()
            let finalAmount = amount.trim()
            if ((category as string) === 'grocery' && finalAmount && !finalAmount.startsWith('x')) {
                finalAmount = `x${finalAmount}`
            }

            // Default logic for unlinked business tasks
            let finalCategory = newStrategicCategory
            let finalPriority = priority
            let finalImpact = impactScore ? parseInt(impactScore) : undefined

            if (activeProfile === 'business' && linkType === 'none') {
                if (!finalCategory) finalCategory = 'general'
                if (finalPriority === 'low') finalPriority = 'mid' // default to mid if not changed from low
                if (!impactScore || impactScore === '5') finalImpact = 2 // default to 2 if not changed
            }

            await createTask({
                title: finalTitle,
                priority: finalPriority,
                due_date: dueDateMode !== 'none' && dueDateMode !== 'recurring' ? dueDate || undefined : undefined,
                amount: (category as string) === 'grocery' ? finalAmount : undefined,
                due_date_mode: dueDateMode !== 'none' && dueDateMode !== 'recurring' ? (dueDateMode as 'on' | 'before' | 'range') : undefined,
                end_date: endDate || undefined,
                recurrence_config: dueDateMode === 'recurring' ? {
                    type: recurringType,
                    time: recurringTime || undefined,
                    duration_minutes: recurringDuration ? parseInt(recurringDuration) : undefined,
                    days_of_week: recurringType === 'custom' ? recurringDays : undefined
                } : null,
                notes: showCreateNotes ? { type: createNotesType, content: createNotesContent } : undefined,
                strategic_category: finalCategory as any,
                estimated_duration: estimatedDuration ? parseInt(estimatedDuration) : undefined,
                impact_score: finalImpact,
                travel_to_duration: parseInt(travelDuration),
                travel_from_duration: parseInt(travelDuration),
                start_time: isAppointment ? appointmentTime : undefined,
                location: isLocationActive ? destination : undefined,
                origin_location: isLocationActive ? startFrom : undefined,
                project_id: linkType === 'project' ? newProjectId : undefined,
                content_id: linkType === 'content' ? newContentId : undefined
            })
            setNewTask('')
            setAmount('1')
            setPriority('low')
            setDueDate('')
            setDueDateMode('none')
            setEndDate('')
            setRecurringType('off_days')
            setRecurringTime('')
            setRecurringDuration('60')
            setRecurringDays([])
            setEstimatedDuration('30')
            setTravelDuration('15')
            setImpactScore('5')
            setShowAllFields(false)
            setShowCreateNotes(false)
            setCreateNotesContent('')
            setCreateNotesType('text')
            setNewStrategicCategory(undefined)
            setLinkType('none')
            setNewProjectId(undefined)
            setNewContentId(undefined)
        } catch (err: any) {
            console.error('Operation creation failed:', err)
            alert(err.message || 'Failed to create operation. Please check your connection.')
        }
    }

    const handleClearAll = () => {
        const itemType = category === 'todo' ? 'operations' : category === 'grocery' ? 'groceries' : 'reminders'
        setConfirmModal({
            open: true,
            title: `Clear All ${category === 'todo' ? 'Operations' : category === 'grocery' ? 'Groceries' : 'Reminders'}?`,
            message: `Are you sure you want to delete every item in this list? This action cannot be undone.`,
            confirmText: 'Yes, Clear All',
            type: 'danger',
            action: async () => {
                await clearAllTasks()
                setConfirmModal(prev => ({ ...prev, open: false }))
            }
        })
    }

    const handleClearCompleted = () => {
        const itemType = category === 'todo' ? 'completed operations' : category === 'grocery' ? 'completed groceries' : 'completed reminders'
        setConfirmModal({
            open: true,
            title: 'Clear Completed?',
            message: `Are you sure you want to remove all ${itemType}?`,
            confirmText: 'Yes, Clear Completed',
            type: 'danger',
            action: async () => {
                await clearCompletedTasks()
                setConfirmModal(prev => ({ ...prev, open: false }))
            }
        })
    }

    const handleDeleteWithSafety = (task: Task) => {
        setConfirmModal({
            open: true,
            title: 'Delete Operation?',
            message: `Are you sure you want to delete "${task.title}"?`,
            confirmText: 'Yes, Delete',
            type: 'danger',
            action: async () => {
                setLastDeletedTask(task)
                setShowUndo(true)
                await deleteTask(task.id)
                setConfirmModal(prev => ({ ...prev, open: false }))
                setTimeout(() => setShowUndo(false), 5000)
            }
        })
    }

    const handleUndo = async () => {
        if (lastDeletedTask) {
            const t = lastDeletedTask
            await createTask(t)
            setLastDeletedTask(null)
            setShowUndo(false)
        }
    }

    const filteredItems = useMemo(() => {
        const taskItems = tasks.map(t => ({ id: t.id, type: 'task' as const, data: t }))
        // Milestones only for business profile and todo category
        const milestoneItems = (category === 'todo' && activeProfile === 'business')
            ? milestones
                .filter(m => {
                    if (m.project_id) {
                        const parent = projects.find(p => p.id === m.project_id)
                        if (!parent || parent.is_archived) return false
                    }
                    if (m.content_id) {
                        const parent = content.find(c => c.id === m.content_id)
                        if (!parent || parent.is_archived) return false
                    }
                    return true
                })
                .map(m => ({ id: m.id, type: 'milestone' as const, data: m }))
            : []


        const combined = [...taskItems, ...milestoneItems]

        return combined.filter(item => {
            const project = item.type === 'milestone' ? projects.find(p => p.id === item.data.project_id) : null
            const contentItem = item.type === 'milestone' ? content.find(c => c.id === item.data.content_id) : null

            const strategicCategory = item.type === 'task'
                ? item.data.strategic_category
                : (project?.strategic_category || contentItem?.category) // Use content category as fallback

            const title = item.data.title
            const matchesSearch = title?.toLowerCase().includes(searchQuery.toLowerCase())
            const matchesCategory = selectedStrategicCategory === 'all' || strategicCategory === selectedStrategicCategory
            return matchesSearch && matchesCategory
        })
    }, [tasks, milestones, content, projects, searchQuery, selectedStrategicCategory, category, activeProfile])

    // Sort: Uncompleted first, Completed last. Tasks use position, Milestones are mixed in.
    const sortedItems = [...filteredItems].sort((a, b) => {
        const aCompleted = a.type === 'task' ? a.data.is_completed : a.data.status === 'completed'
        const bCompleted = b.type === 'task' ? b.data.is_completed : b.data.status === 'completed'

        if (aCompleted !== bCompleted) {
            return aCompleted ? 1 : -1
        }

        const aPos = a.type === 'task' ? (a.data.position || 0) : 0
        const bPos = b.type === 'task' ? (b.data.position || 0) : 0

        return bPos - aPos
    })

    // Expand recurring "off-day" tasks: one virtual entry per off-day in the current off period
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const currentOffPeriod = getNextOffPeriod(today) // finds current block if today is off-day too
    const offDays: Date[] = []
    if (currentOffPeriod.start.getTime() !== currentOffPeriod.end.getTime() || !isShiftDay(currentOffPeriod.start)) {
        let d = new Date(currentOffPeriod.start)
        while (d <= currentOffPeriod.end) {
            offDays.push(new Date(d))
            d.setDate(d.getDate() + 1)
        }
    }

    // Expand recurring tasks: Only include if the task's recurrence rule applies to TODAY.
    // It will show up once on the list for today.
    const dateStr = today.toISOString().split('T')[0]
    const dayOfWeek = today.getDay()
    const expandedItems: ((any) & { _recurringDate?: string })[] = []

    sortedItems.forEach(item => {
        if (item.type === 'task') {
            const task = item.data
            if (task.recurrence_config && task.recurrence_config.type && task.recurrence_config.type !== 'none') {
                const type = task.recurrence_config.type
                const daysOfWeek = task.recurrence_config.days_of_week || []
                let shouldInclude = false

                if (type === 'daily') shouldInclude = true
                else if (type === 'work_days' && isShiftDay(today)) shouldInclude = true
                else if (type === 'off_days' && !isShiftDay(today)) shouldInclude = true
                else if (type === 'custom' && daysOfWeek.includes(dayOfWeek)) shouldInclude = true

                if (shouldInclude) {
                    expandedItems.push({ ...item, id: `${item.id}__${dateStr}`, _recurringDate: dateStr })
                }
            } else {
                expandedItems.push(item)
            }
        } else {
            expandedItems.push(item)
        }
    })

    return (
        <div className="bg-white rounded-xl border border-black/[0.08] p-4 sm:p-5 shadow-sm flex flex-col min-h-[500px] relative">
            {/* Confirmation Modal */}
            {confirmModal.open && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setConfirmModal(prev => ({ ...prev, open: false }))} />
                    <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col p-6 text-center animate-in zoom-in-95 duration-200">
                        <div className={cn(
                            "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4",
                            confirmModal.type === 'danger' ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"
                        )}>
                            <Trash2 className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-black mb-2">{confirmModal.title}</h3>
                        <p className="text-[14px] text-black/60 mb-6 leading-relaxed">
                            {confirmModal.message}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmModal(prev => ({ ...prev, open: false }))}
                                className="flex-1 py-3 rounded-xl border border-black/[0.1] text-black/60 font-bold text-[14px] hover:bg-black/[0.05] transition-colors"
                            >
                                Back
                            </button>
                            <button
                                onClick={confirmModal.action}
                                className={cn(
                                    "flex-1 py-3 rounded-xl text-white font-bold text-[14px] transition-colors shadow-lg",
                                    confirmModal.type === 'danger' ? "bg-red-600 hover:bg-red-700 shadow-red-200" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
                                )}
                            >
                                {confirmModal.confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-black/5 border border-black/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-black" />
                    </div>
                    <div>
                        <h2 className="text-[16px] font-bold text-black tracking-tight">{title}</h2>
                        <p className="text-[12px] text-black/50">{pendingData.count} pending</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {tasks.some(t => t.is_completed) && (
                        <button
                            onClick={handleClearCompleted}
                            className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 transition-colors px-2 py-1 rounded hover:bg-emerald-50 bg-emerald-50/50"
                        >
                            Clear Completed
                        </button>
                    )}
                    {tasks.length > 0 && (
                        <button
                            onClick={handleClearAll}
                            className="text-[11px] font-medium text-black/40 hover:text-red-500 transition-colors px-2 py-1 rounded hover:bg-red-50"
                        >
                            All
                        </button>
                    )}
                    <button
                        onClick={() => setShowSettings(true)}
                        className="w-8 h-8 rounded-lg bg-black/5 hover:bg-black/10 flex items-center justify-center text-black/40 hover:text-black transition-all"
                    >
                        <Settings2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <TaskSettingsModal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
            />

            {/* Strategic Category Filter */}
            <div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">
                <div className="flex items-center gap-1.5 px-2 py-1.5 text-[9px] font-bold uppercase tracking-widest text-black/30 border-r border-black/5 mr-1 shrink-0">
                    <Filter className="w-3 h-3" />
                    Filter
                </div>
                <button
                    onClick={() => setSelectedStrategicCategory('all')}
                    className={cn(
                        "whitespace-nowrap px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border shrink-0",
                        selectedStrategicCategory === 'all'
                            ? "bg-black text-white border-black shadow-sm"
                            : "bg-black/[0.03] text-black/40 border-transparent hover:bg-black/5"
                    )}
                >
                    <LayoutGrid className="w-3 h-3 inline-block mr-1.5 -mt-0.5" />
                    All
                </button>
                {strategicCategories.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => setSelectedStrategicCategory(cat.id)}
                        className={cn(
                            "whitespace-nowrap px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border shrink-0 flex items-center gap-1.5",
                            selectedStrategicCategory === cat.id
                                ? "bg-black text-white border-black shadow-sm"
                                : "bg-black/[0.03] text-black/40 border-transparent hover:bg-black/5"
                        )}
                    >
                        <cat.icon className={cn("w-3 h-3", selectedStrategicCategory === cat.id ? "text-white" : "text-black/30")} />
                        {cat.label}
                    </button>
                ))}
            </div>

            {showUndo && (
                <div className="mb-4 p-3 bg-black text-white rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                    <span className="text-[12px] font-medium">Operation deleted</span>
                    <button
                        onClick={handleUndo}
                        className="text-[12px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors px-2 py-1"
                    >
                        Undo
                    </button>
                </div>
            )}

            <form onSubmit={handleSubmit} className="mb-5 flex flex-col gap-2">
                <div className="flex gap-1.5 sm:gap-2">
                    {category === 'grocery' && (
                        <input
                            type="text"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="x1"
                            className="w-12 sm:w-16 bg-black/[0.03] border border-black/[0.08] rounded-xl px-1 sm:px-2 py-2.5 text-[13px] text-center text-black placeholder-black/30 outline-none focus:border-black/40 transition-colors shrink-0"
                        />
                    )}
                    <input
                        type="text"
                        value={newTask}
                        onFocus={() => setShowAllFields(true)}
                        onClick={() => setShowAllFields(true)}
                        onChange={(e) => setNewTask(e.target.value)}
                        placeholder={`Add new ${category === 'todo' ? 'operation' : 'item'}...`}
                        className="flex-1 min-w-0 bg-black/[0.03] border border-black/[0.08] rounded-xl px-3 sm:px-4 py-2.5 text-[13px] text-black placeholder-black/30 outline-none focus:border-black/40 transition-colors"
                    />
                    <button
                        type="submit"
                        disabled={!newTask.trim() || loading}
                        className="w-11 h-11 rounded-xl bg-black flex items-center justify-center text-white hover:bg-neutral-800 transition-all shrink-0 disabled:opacity-50 shadow-sm"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                    {(newTask.trim().length > 0 || dueDateMode !== 'none') && (
                        <button
                            type="button"
                            onClick={() => {
                                setNewTask('')
                                setAmount('1')
                                setPriority('low')
                                setDueDate('')
                                setDueDateMode('none')
                                setEndDate('')
                                setRecurringType('off_days')
                                setRecurringTime('')
                                setRecurringDuration('60')
                                setRecurringDays([])
                                setTravelDuration('0') // Clear single travelDuration
                                setShowSuggestions(false)
                                setShowAllFields(false)
                            }}
                            className="w-11 h-11 rounded-xl bg-black/5 hover:bg-black/10 flex items-center justify-center text-black/40 hover:text-red-500 transition-colors shrink-0"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Tier 1: Local Autocomplete Suggestions */}
                {autocompleteTitles.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 px-1 animate-in slide-in-from-top-1 fade-in duration-200">
                        {autocompleteTitles.map(item => (
                            <button
                                key={item.title}
                                type="button"
                                onClick={() => {
                                    setNewTask(item.title)
                                    if (item.template) {
                                        setPriority(item.template.priority)
                                        if (item.template.strategic_category) setNewStrategicCategory(item.template.strategic_category)
                                        if (item.template.estimated_duration !== undefined) setEstimatedDuration(item.template.estimated_duration.toString())
                                        // Use travel_to_duration as the single travelDuration for templates
                                        if (item.template.travel_to_duration !== undefined) setTravelDuration(item.template.travel_to_duration.toString())
                                        if (item.template.impact_score !== undefined) setImpactScore(item.template.impact_score.toString())
                                        if (item.template.amount) setAmount(item.template.amount)
                                        // Auto-expand fields if using a template
                                        setShowAllFields(true)
                                    }
                                }}
                                className={cn(
                                    "px-2 py-1 border rounded-lg text-[11px] font-bold transition-colors tracking-tight text-left truncate max-w-[200px] flex items-center gap-1.5",
                                    item.template
                                        ? "bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100"
                                        : "bg-black/[0.03] hover:bg-black/[0.06] border-black/[0.05] text-black/60"
                                )}
                            >
                                {item.template && <Zap className="w-2.5 h-2.5" />}
                                {item.title}
                            </button>
                        ))}
                    </div>
                )}

                {/* Main Form Fields (expanded when typing or date set or focused) */}
                {(newTask.trim().length > 0 || dueDateMode !== 'none' || showAllFields) && (
                    <div className="flex flex-col gap-2 animate-in slide-in-from-top-1 fade-in duration-200">

                        {/* Tier 2: AI Priority Suggestion Badge */}
                        {category === 'todo' && (
                            <div className="h-[24px] flex items-center px-1">
                                {isAnalyzingPriority ? (
                                    <div className="flex items-center gap-1.5 text-black/30">
                                        <RefreshCw className="w-3 h-3 animate-spin" />
                                        <span className="text-[10px] uppercase font-bold tracking-widest">Analyzing priority...</span>
                                    </div>
                                ) : suggestedPriority ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPriority(suggestedPriority.level)
                                            setSuggestedPriority(null)
                                        }}
                                        className={cn(
                                            "flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wide transition-all hover:scale-[1.02] active:scale-95 group",
                                            (PRIORITY_CONFIG[suggestedPriority.level as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.urgent).color,
                                            "shadow-sm ring-2 ring-offset-1 ring-black/5"
                                        )}
                                    >
                                        <span className="opacity-70 group-hover:opacity-100">✨ Make {suggestedPriority.level === 'urgent' ? 'Urgent' : suggestedPriority.level} Priority</span>
                                        <div className="w-px h-2.5 bg-current opacity-20" />
                                        <span className="opacity-50 text-[9px] lowercase tracking-normal font-medium">{suggestedPriority.reason}</span>
                                    </button>
                                ) : null}
                            </div>
                        )}

                        {/* Priority row */}
                        <div className="flex gap-1.5 p-1 bg-black/[0.03] rounded-xl border border-black/5 w-fit">
                            {(['urgent', 'high', 'mid', 'low'] as const).map(p => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setPriority(p)}
                                    className={cn(
                                        "px-2.5 py-1.5 text-[10px] font-bold rounded-lg border transition-all uppercase tracking-tight",
                                        priority === p
                                            ? PRIORITY_CONFIG[p].color + " shadow-sm scale-105"
                                            : "bg-transparent text-black/30 border-transparent hover:text-black/50 hover:bg-black/5"
                                    )}
                                >
                                    {PRIORITY_CONFIG[p].label}
                                </button>
                            ))}
                        </div>

                        {/* Date mode selector */}
                        <div className="flex flex-wrap gap-1.5">
                            {(['none', 'on', 'before', 'range', 'recurring'] as const).map(mode => (
                                <button
                                    key={mode}
                                    type="button"
                                    onClick={() => setDueDateMode(mode)}
                                    className={cn(
                                        "px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all uppercase tracking-tight flex items-center gap-1",
                                        dueDateMode === mode
                                            ? mode === 'recurring' ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-black text-white border-black'
                                            : 'bg-black/[0.03] border-black/5 text-black/40 hover:text-black/60'
                                    )}
                                >
                                    {mode === 'none' && '✕ None'}
                                    {mode === 'on' && '📅 On'}
                                    {mode === 'before' && '⏰ By'}
                                    {mode === 'range' && '↔ Range'}
                                    {mode === 'recurring' && '🔁 Recurring'}
                                </button>
                            ))}
                        </div>

                        {/* Date fields — hidden when None or Recurring */}
                        {dueDateMode !== 'none' && dueDateMode !== 'recurring' && (
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-1.5 bg-black/[0.03] border border-black/5 rounded-xl px-3 py-1.5">
                                    <Calendar className="w-3 h-3 text-black/30 shrink-0" />
                                    <input
                                        type="date"
                                        value={dueDate}
                                        onChange={(e) => setDueDate(e.target.value)}
                                        className="bg-transparent text-[11px] font-bold text-black/60 outline-none uppercase tracking-tight w-full"
                                    />
                                </div>
                                {dueDateMode === 'range' && (
                                    <div className="flex items-center gap-2 bg-black/[0.03] border border-black/5 rounded-xl px-3 py-1.5">
                                        <span className="text-[10px] font-bold text-black/20 uppercase tracking-tighter">to</span>
                                        <Calendar className="w-3 h-3 text-black/30 shrink-0" />
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="bg-transparent text-[11px] font-bold text-black/60 outline-none uppercase tracking-tight w-full"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Recurring sub-panel */}
                        {dueDateMode === 'recurring' && (
                            <div className="flex flex-col gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                                <div className="flex flex-wrap gap-1.5">
                                    {([
                                        { value: 'daily', label: 'Daily' },
                                        { value: 'work_days', label: 'Work Days' },
                                        { value: 'off_days', label: 'Days Off' },
                                        { value: 'custom', label: 'Custom' },
                                    ] as const).map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setRecurringType(opt.value)}
                                            className={cn(
                                                "px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all uppercase tracking-tight",
                                                recurringType === opt.value
                                                    ? 'bg-emerald-600 text-white border-emerald-700'
                                                    : 'bg-white text-black/40 border-emerald-200 hover:text-black/60'
                                            )}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Weekly day picker */}
                                {(recurringType === 'custom') && (
                                    <div className="flex gap-1.5 animate-in fade-in zoom-in-95 duration-200">
                                        {[
                                            { d: 'M', v: 1 },
                                            { d: 'T', v: 2 },
                                            { d: 'W', v: 3 },
                                            { d: 'Th', v: 4 },
                                            { d: 'F', v: 5 },
                                            { d: 'Sa', v: 6 },
                                            { d: 'Su', v: 0 }
                                        ].map((day) => (
                                            <button
                                                key={day.v}
                                                type="button"
                                                onClick={() => {
                                                    setRecurringDays(prev =>
                                                        prev.includes(day.v)
                                                            ? prev.filter(d => d !== day.v)
                                                            : [...prev, day.v]
                                                    )
                                                }}
                                                className={cn(
                                                    "w-8 h-8 rounded-lg text-[11px] font-bold border transition-all",
                                                    recurringDays.includes(day.v)
                                                        ? "bg-emerald-600 border-emerald-700 text-white shadow-sm"
                                                        : "bg-white border-emerald-200 text-black/40 hover:bg-emerald-50 hover:border-emerald-300"
                                                )}
                                            >
                                                {day.d}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Time + Duration */}
                                <div className="flex flex-wrap gap-2">
                                    <div className="flex items-center gap-1.5 bg-white border border-emerald-200 rounded-lg px-2.5 py-1.5">
                                        <span className="text-[10px] font-bold text-black/40 uppercase">Time</span>
                                        <input
                                            type="time"
                                            value={recurringTime}
                                            onChange={e => setRecurringTime(e.target.value)}
                                            className="bg-transparent text-[11px] font-bold text-black/60 outline-none"
                                        />
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-white border border-emerald-200 rounded-lg px-2.5 py-1.5">
                                        <span className="text-[10px] font-bold text-black/40 uppercase">Duration</span>
                                        <select
                                            value={recurringDuration}
                                            onChange={e => setRecurringDuration(e.target.value)}
                                            className="bg-transparent text-[11px] font-bold text-black/60 outline-none"
                                        >
                                            {[30, 60, 90, 120, 150, 180, 240, 300, 360].map(mins => {
                                                const hrs = mins / 60
                                                const label = hrs >= 1 ? `${hrs}${hrs % 1 === 0 ? '' : '.5'}h` : `${mins}m`
                                                return <option key={mins} value={mins}>{label}</option>
                                            })}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Strategic Category Selection */}
                        <div className="flex flex-col gap-2 mt-1">
                            <span className="text-[9px] font-bold text-black/30 uppercase tracking-widest px-1">Tactical Tag</span>
                            <div className="flex flex-wrap gap-1.5">
                                {strategicCategories.map(cat => (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => setNewStrategicCategory(newStrategicCategory === cat.id ? undefined : cat.id)}
                                        className={cn(
                                            "flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all",
                                            newStrategicCategory === cat.id
                                                ? "bg-black text-white border-black shadow-md scale-[1.02]"
                                                : "bg-white text-black/40 border-black/[0.08] hover:border-black/20"
                                        )}
                                    >
                                        <cat.icon className={cn("w-3.5 h-3.5", newStrategicCategory === cat.id ? "text-white" : "text-black/20")} />
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Algorithmic Params: Duration & Impact */}
                        {newStrategicCategory !== 'reminder' && (
                            <div className="flex gap-4 mt-2 transition-all animate-in fade-in slide-in-from-top-1">
                                <div className="flex-1 flex flex-col gap-1.5">
                                    <span className="text-[9px] font-bold text-black/30 uppercase tracking-widest px-1 flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> Duration (mins)
                                    </span>
                                    <select
                                        value={estimatedDuration}
                                        onChange={(e) => setEstimatedDuration(e.target.value)}
                                        className="bg-black/[0.03] border border-black/[0.08] rounded-xl px-3 py-2 text-[12px] text-black outline-none focus:border-black/40 transition-colors appearance-none cursor-pointer"
                                    >
                                        {Array.from({ length: 16 }, (_, i) => (i + 1) * 15).map(mins => (
                                            <option key={mins} value={mins}>
                                                {mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60 > 0 ? `${mins % 60}m` : ''}` : `${mins}m`}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex-1 flex flex-col gap-1.5">
                                    <span className="text-[9px] font-bold text-black/30 uppercase tracking-widest px-1 flex items-center gap-1">
                                        <Car className="w-3 h-3" /> Travel (mins)
                                    </span>
                                    <select
                                        value={travelDuration}
                                        onChange={(e) => setTravelDuration(e.target.value)}
                                        className="bg-black/[0.03] border border-black/[0.08] rounded-xl px-3 py-2 text-[12px] text-black outline-none focus:border-black/40 transition-colors appearance-none cursor-pointer"
                                    >
                                        <option value="0">None</option>
                                        {Array.from({ length: 8 }, (_, i) => (i + 1) * 15).map(mins => (
                                            <option key={mins} value={mins}>
                                                {mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60 > 0 ? `${mins % 60}m` : ''}` : `${mins}m`}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex gap-4 mt-2">
                                    <div className="flex-1 flex flex-col gap-1.5">
                                        <span className="text-[9px] font-bold text-black/30 uppercase tracking-widest px-1 flex items-center gap-1">
                                            <Zap className="w-3 h-3" /> Impact (1-10)
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="range"
                                                min="1"
                                                max="10"
                                                value={impactScore}
                                                onChange={(e) => setImpactScore(e.target.value)}
                                                className="flex-1 accent-black h-1 bg-black/10 rounded-lg appearance-none cursor-pointer mt-2"
                                            />
                                            <span className="text-[11px] font-black text-black w-4 text-center">{impactScore}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Studio Linking Row */}
                                {activeProfile === 'business' && (
                                    <div className="flex flex-col gap-2 mt-2 pt-4 border-t border-black/[0.05]">
                                        <span className="text-[9px] font-bold text-black/30 uppercase tracking-widest px-1 flex items-center gap-1">
                                            <Rocket className="w-3 h-3 text-orange-500" /> Studio Linking
                                        </span>
                                        <div className="grid grid-cols-2 gap-2">
                                            <select
                                                value={linkType}
                                                onChange={(e) => setLinkType(e.target.value as any)}
                                                className="bg-black/[0.03] border border-black/[0.08] rounded-xl px-3 py-2 text-[12px] text-black outline-none focus:border-black/40 transition-colors appearance-none cursor-pointer"
                                            >
                                                <option value="none">General Task</option>
                                                <option value="project">Project Linked</option>
                                                <option value="content">Content Linked</option>
                                            </select>
                                            <select
                                                disabled={linkType === 'none'}
                                                value={linkType === 'project' ? (newProjectId || '') : linkType === 'content' ? (newContentId || '') : ''}
                                                onChange={(e) => {
                                                    if (linkType === 'project') setNewProjectId(e.target.value)
                                                    else setNewContentId(e.target.value)
                                                }}
                                                className="bg-black/[0.03] border border-black/[0.08] rounded-xl px-3 py-2 text-[12px] text-black outline-none focus:border-black/40 transition-colors appearance-none cursor-pointer disabled:opacity-30"
                                            >
                                                <option value="">Select Item...</option>
                                                {linkType === 'project' ? (
                                                    projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)
                                                ) : linkType === 'content' ? (
                                                    content.map(c => <option key={c.id} value={c.id}>{c.title}</option>)
                                                ) : null}
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Toggles: Appointment & Location */}
                        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-black/[0.05]">
                            <div className="flex items-center justify-between px-1">
                                <span className="text-[9px] font-bold text-black/30 uppercase tracking-widest">Fixed Time</span>
                                <button
                                    type="button"
                                    onClick={() => setIsAppointment(!isAppointment)}
                                    className={cn(
                                        "w-10 h-5 rounded-full transition-all relative",
                                        isAppointment ? "bg-black" : "bg-black/10"
                                    )}
                                >
                                    <div className={cn(
                                        "absolute top-1 w-3 h-3 rounded-full bg-white transition-all",
                                        isAppointment ? "left-6" : "left-1"
                                    )} />
                                </button>
                            </div>
                            <div className="flex items-center justify-between px-1">
                                <span className="text-[9px] font-bold text-black/30 uppercase tracking-widest">Location</span>
                                <button
                                    type="button"
                                    onClick={() => setIsLocationActive(!isLocationActive)}
                                    className={cn(
                                        "w-10 h-5 rounded-full transition-all relative",
                                        isLocationActive ? "bg-black" : "bg-black/10"
                                    )}
                                >
                                    <div className={cn(
                                        "absolute top-1 w-3 h-3 rounded-full bg-white transition-all",
                                        isLocationActive ? "left-6" : "left-1"
                                    )} />
                                </button>
                            </div>
                        </div>

                        {/* Conditional Inputs: Time & Location */}
                        {(isAppointment || isLocationActive) && (
                            <div className="space-y-3 mt-3 animate-in fade-in slide-in-from-top-1">
                                {isAppointment && (
                                    <div className="bg-black/[0.03] border border-black/[0.08] rounded-xl px-3 py-2 flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-black/40 uppercase">Start Time</span>
                                        <input
                                            type="time"
                                            value={appointmentTime}
                                            onChange={(e) => setAppointmentTime(e.target.value)}
                                            className="bg-transparent text-[13px] font-black text-black outline-none"
                                        />
                                    </div>
                                )}
                                {isLocationActive && (
                                    <div className="space-y-2">
                                        <div className="bg-black/[0.03] border border-black/[0.08] rounded-xl px-3 py-2 flex flex-col gap-1">
                                            <span className="text-[9px] font-bold text-black/30 uppercase">Destination</span>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Haircut Place..."
                                                    value={destination}
                                                    onChange={(e) => setDestination(e.target.value)}
                                                    onFocus={() => destination.length >= 3 && setShowLocationSuggestions(true)}
                                                    className="bg-transparent text-[13px] font-bold text-black outline-none w-full"
                                                />
                                                <AnimatePresence>
                                                    {showLocationSuggestions && locationSuggestions.length > 0 && (
                                                        <motion.div
                                                            ref={locationSuggestionsRef}
                                                            initial={{ opacity: 0, y: -10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: -10 }}
                                                            className="absolute left-0 right-0 top-full mt-2 bg-white border border-black/10 rounded-xl shadow-xl z-[100] max-h-[200px] overflow-y-auto no-scrollbar"
                                                        >
                                                            {locationSuggestions.map((suggestion, idx) => (
                                                                <button
                                                                    key={idx}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setDestination(suggestion.display_name)
                                                                        setShowLocationSuggestions(false)
                                                                        sessionToken.current = null // Reset token after selection
                                                                    }}
                                                                    className="w-full text-left px-3 py-2 hover:bg-black/5 transition-all border-b border-black/[0.03] last:border-0 group"
                                                                >
                                                                    <div className="text-[12px] font-bold text-black group-hover:text-blue-600 transition-colors">{suggestion.name}</div>
                                                                    <div className="text-[10px] text-black/40 truncate">{suggestion.display_name}</div>
                                                                </button>
                                                            ))}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                        <div className="bg-black/[0.03] border border-black/[0.08] rounded-xl px-3 py-2 flex flex-col gap-2">
                                            <span className="text-[9px] font-bold text-black/30 uppercase">Start From</span>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setStartFromMode('home')
                                                        setStartFrom('7 Ruby Street, Cardiff, CF24 1LP')
                                                    }}
                                                    className={cn(
                                                        "flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                                        startFromMode === 'home'
                                                            ? "bg-black text-white"
                                                            : "bg-black/5 text-black/50 hover:bg-black/10"
                                                    )}
                                                >
                                                    🏠 Home
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setStartFromMode('other')}
                                                    className={cn(
                                                        "flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                                        startFromMode === 'other'
                                                            ? "bg-black text-white"
                                                            : "bg-black/5 text-black/50 hover:bg-black/10"
                                                    )}
                                                >
                                                    📍 Other
                                                </button>
                                            </div>
                                            {startFromMode === 'home' && (
                                                <p className="text-[10px] text-black/40 font-medium">7 Ruby Street, Cardiff, CF24 1LP</p>
                                            )}
                                            {startFromMode === 'other' && (
                                                <input
                                                    type="text"
                                                    placeholder="Enter start address..."
                                                    value={startFrom === '7 Ruby Street, Cardiff, CF24 1LP' ? '' : startFrom}
                                                    onChange={(e) => setStartFrom(e.target.value)}
                                                    className="bg-transparent text-[13px] font-bold text-black outline-none w-full border-t border-black/[0.08] pt-2"
                                                    autoFocus
                                                />
                                            )}
                                        </div>
                                        {/* Travel mode selector */}
                                        <div className="bg-black/[0.03] border border-black/[0.08] rounded-xl px-3 py-2 flex flex-col gap-2">
                                            <span className="text-[9px] font-bold text-black/30 uppercase">Travel Mode</span>
                                            <div className="flex gap-2">
                                                {([
                                                    { id: 'walking', label: '🚶 Walk', },
                                                    { id: 'transit', label: '🚌 Bus/Train', },
                                                    { id: 'uber', label: '🚗 Uber', },
                                                ] as const).map(m => (
                                                    <button
                                                        key={m.id}
                                                        type="button"
                                                        onClick={() => setTravelMode(m.id)}
                                                        className={cn(
                                                            "flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                                            travelMode === m.id
                                                                ? "bg-black text-white"
                                                                : "bg-black/5 text-black/50 hover:bg-black/10"
                                                        )}
                                                    >
                                                        {m.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={calculateTravelTime}
                                            className="w-full py-2 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                            disabled={isCalculatingTravel}
                                        >
                                            {isCalculatingTravel ? <RefreshCw className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
                                            Calculate {travelMode === 'walking' ? 'Walk' : travelMode === 'transit' ? 'Transit' : 'Uber'} Time
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Notes Creator */}
                        <div className="flex flex-col gap-2">
                            <button
                                type="button"
                                onClick={() => setShowCreateNotes(!showCreateNotes)}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all w-fit uppercase tracking-wider",
                                    showCreateNotes
                                        ? "bg-black text-white border-black"
                                        : "bg-white text-black/40 border-black/10 hover:border-black/20"
                                )}
                            >
                                <LayoutList className="w-3.5 h-3.5" />
                                {showCreateNotes ? "Hide Notes" : "Add Notes/Checklist"}
                            </button>

                            {showCreateNotes && (
                                <div className="flex flex-col gap-3 p-3 bg-black/[0.03] border border-black/5 rounded-xl animate-in slide-in-from-top-2 duration-200">
                                    <div className="flex gap-1.5">
                                        {([
                                            { type: 'text', icon: Type, label: 'Text' },
                                            { type: 'bullets', icon: List, label: 'Bullets' },
                                            { type: 'checklist', icon: ListChecks, label: 'Checklist' },
                                        ] as const).map(noteType => (
                                            <button
                                                key={noteType.type}
                                                type="button"
                                                onClick={() => {
                                                    setCreateNotesType(noteType.type)
                                                    if (noteType.type === 'checklist' && !Array.isArray(createNotesContent)) {
                                                        setCreateNotesContent([])
                                                    } else if (noteType.type !== 'checklist' && Array.isArray(createNotesContent)) {
                                                        setCreateNotesContent('')
                                                    }
                                                }}
                                                className={cn(
                                                    "px-2 py-1 text-[9px] font-bold rounded-lg border transition-all uppercase tracking-tight flex items-center gap-1",
                                                    createNotesType === noteType.type
                                                        ? 'bg-black text-white border-black'
                                                        : 'bg-white text-black/40 border-black/10 hover:text-black/60'
                                                )}
                                            >
                                                <noteType.icon className="w-3 h-3" />
                                                {noteType.label}
                                            </button>
                                        ))}
                                    </div>

                                    {createNotesType === 'text' && (
                                        <textarea
                                            value={createNotesContent}
                                            onChange={(e) => setCreateNotesContent(e.target.value)}
                                            placeholder="Add some notes..."
                                            className="w-full bg-white border border-black/10 rounded-lg px-3 py-2 text-[12px] text-black outline-none focus:border-black/30 min-h-[60px]"
                                        />
                                    )}

                                    {createNotesType === 'bullets' && (
                                        <textarea
                                            value={createNotesContent}
                                            onChange={(e) => setCreateNotesContent(e.target.value)}
                                            placeholder="Add bullet points, one per line..."
                                            className="w-full bg-white border border-black/10 rounded-lg px-3 py-2 text-[12px] text-black outline-none focus:border-black/30 min-h-[60px]"
                                        />
                                    )}

                                    {createNotesType === 'checklist' && (
                                        <div className="flex flex-col gap-2">
                                            {(createNotesContent as any[]).map((item: any, index: number) => (
                                                <div key={index} className="flex items-center gap-2 bg-white border border-black/10 rounded-lg px-3 py-1.5">
                                                    <input
                                                        type="checkbox"
                                                        checked={item.completed}
                                                        onChange={() => {
                                                            const newC = [...createNotesContent]
                                                            newC[index] = { ...newC[index], completed: !newC[index].completed }
                                                            setCreateNotesContent(newC)
                                                        }}
                                                        className="w-4 h-4 accent-black cursor-pointer shrink-0"
                                                    />
                                                    <span className={cn(
                                                        "flex-1 text-[12px] text-black",
                                                        item.completed && "line-through text-black/40"
                                                    )}>
                                                        {item.text}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setCreateNotesContent(createNotesContent.filter((_: any, i: number) => i !== index))
                                                        }}
                                                        className="text-black/30 hover:text-red-500 transition-colors"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={newCreateChecklistItem}
                                                    onChange={(e) => setNewCreateChecklistItem(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault()
                                                            if (newCreateChecklistItem.trim()) {
                                                                setCreateNotesContent([...createNotesContent, { text: newCreateChecklistItem.trim(), completed: false }])
                                                                setNewCreateChecklistItem('')
                                                            }
                                                        }
                                                    }}
                                                    placeholder="Add new item..."
                                                    className="flex-1 bg-white border border-black/10 rounded-lg px-3 py-1.5 text-[12px] text-black outline-none focus:border-black/30"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (newCreateChecklistItem.trim()) {
                                                            setCreateNotesContent([...createNotesContent, { text: newCreateChecklistItem.trim(), completed: false }])
                                                            setNewCreateChecklistItem('')
                                                        }
                                                    }}
                                                    className="w-8 h-8 flex items-center justify-center bg-black text-white rounded-lg hover:bg-neutral-800 transition-colors"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Form Actions */}
                        <div className="flex gap-2 pt-2 border-t border-black/[0.05] mt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setNewTask('')
                                    setAmount('1')
                                    setPriority('low')
                                    setDueDate('')
                                    setDueDateMode('none')
                                    setEndDate('')
                                    setRecurringType('off_days')
                                    setRecurringTime('')
                                    setRecurringDuration('60')
                                    setRecurringDays([])
                                    setTravelDuration('0')
                                    setShowAllFields(false)
                                    setShowCreateNotes(false)
                                    setCreateNotesContent('')
                                    setNewStrategicCategory(undefined)
                                }}
                                className="flex-1 py-3 rounded-xl bg-black/5 hover:bg-black/10 text-black/60 font-bold text-[12px] uppercase tracking-widest transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!newTask.trim() || loading}
                                className="flex-[2] py-3 rounded-xl bg-black text-white font-bold text-[12px] uppercase tracking-widest hover:bg-neutral-800 transition-all disabled:opacity-50 shadow-lg shadow-black/10"
                            >
                                {loading ? 'Creating...' : 'Create Operation'}
                            </button>
                        </div>
                    </div>
                )}
            </form>

            <Reorder.Group
                axis="y"
                values={expandedItems}
                onReorder={(newOrder) => {
                    const tasksOnly = newOrder.filter(i => i.type === 'task').map(i => i.data)
                    updateTaskPositions(tasksOnly)
                }}
                className="flex-1 pr-1 space-y-2 no-scrollbar"
            >
                {loading && expandedItems.length === 0 ? (
                    <div className="flex items-center justify-center h-32">
                        <RefreshCw className="w-5 h-5 text-black/20 animate-spin" />
                    </div>
                ) : expandedItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-center">
                        <p className="text-[13px] font-medium text-black/40">All caught up.</p>
                        <p className="text-[11px] text-black/30">Add something above to get started.</p>
                    </div>
                ) : (
                    expandedItems.map((item) => (
                        item.type === 'task' ? (
                            <TaskRow
                                key={item.id}
                                task={item.data}
                                toggleTask={toggleTask}
                                deleteTask={handleDeleteWithSafety}
                                editTask={editTask}
                                category={category}
                                setSelectedTaskForModal={setSelectedTaskForModal}
                                projects={projects}
                                content={content}
                            />
                        ) : (
                            <MilestoneRow
                                key={item.id}
                                milestone={item.data}
                                project={projects.find(p => p.id === item.data.project_id)}
                                content={content.find(c => c.id === item.data.content_id)}
                                onSelectItem={(m) => setSelectedMilestoneForModal(m)}
                            />
                        )
                    ))
                )}
            </Reorder.Group>

            <TaskDetailModal
                task={selectedTaskForModal}
                milestone={selectedMilestoneForModal}
                isOpen={!!selectedTaskForModal || !!selectedMilestoneForModal}
                onClose={() => {
                    setSelectedTaskForModal(null)
                    setSelectedMilestoneForModal(null)
                }}
                onToggleSubtask={handleModalToggleSubtask}
                onToggleComplete={handleModalToggleComplete}
                onEditTask={editTask}
                onEditMilestone={updateMilestone}
                projects={projects}
                content={content}
            />

            {selectedProjectForModal && (
                <ProjectDetailModal
                    project={selectedProjectForModal}
                    isOpen={!!selectedProjectForModal}
                    onClose={() => setSelectedProjectForModal(null)}
                />
            )}

            {selectedContentForModal && (
                <ContentDetailModal
                    item={selectedContentForModal}
                    isOpen={!!selectedContentForModal}
                    onClose={() => setSelectedContentForModal(null)}
                />
            )}
        </div>
    )
}


function TaskRow({ task, toggleTask, deleteTask, editTask, category, setSelectedTaskForModal, projects, content }: {
    task: Task,
    toggleTask: any,
    deleteTask: any,
    editTask: any,
    category: string,
    setSelectedTaskForModal: (task: Task) => void,
    projects: any[],
    content: any[]
}) {
    const { activeProfile } = useTasksProfile()
    const strategicCategories = activeProfile === 'personal' ? PERSONAL_CATEGORIES : BUSINESS_CATEGORIES
    const controls = useDragControls()
    const [isEditing, setIsEditing] = useState(false)
    const [isExpanded, setIsExpanded] = useState(false)
    const [editValue, setEditValue] = useState(task.title)
    const [editAmount, setEditAmount] = useState(task.amount || '')
    const [editPriority, setEditPriority] = useState(task.priority || 'low')
    const [editDueDate, setEditDueDate] = useState(task.due_date ? task.due_date.split('T')[0] : '')
    const [editEndDate, setEditEndDate] = useState(task.end_date ? task.end_date.split('T')[0] : '')
    const [editDueDateMode, setEditDueDateMode] = useState<'none' | 'on' | 'before' | 'range' | 'recurring'>(task.recurrence_config?.type && task.recurrence_config.type !== 'none' ? 'recurring' : (task.due_date_mode || 'none'))
    const [editRecurrence, setEditRecurrence] = useState<'daily' | 'work_days' | 'off_days' | 'custom'>(task.recurrence_config?.type && task.recurrence_config.type !== 'none' ? task.recurrence_config.type as any : 'off_days')
    const [editRecurringTime, setEditRecurringTime] = useState(task.recurrence_config?.time || '')
    const [editRecurringDuration, setEditRecurringDuration] = useState(task.recurrence_config?.duration_minutes?.toString() || '60')
    const [editRecurringDays, setEditRecurringDays] = useState<number[]>(task.recurrence_config?.days_of_week || [])
    const [editProfile, setEditProfile] = useState(task.profile)
    const [editNotesType, setEditNotesType] = useState<'text' | 'bullets' | 'checklist'>(task.notes?.type || 'text')
    const [editNotesContent, setEditNotesContent] = useState<any>(task.notes?.content || '')
    const [editStrategicCategory, setEditStrategicCategory] = useState<Task['strategic_category']>(task.strategic_category)
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
    const [editDuration, setEditDuration] = useState(task.estimated_duration?.toString() || '30')
    const [editTravelDuration, setEditTravelDuration] = useState(task.travel_to_duration?.toString() || '0')
    const [editImpact, setEditImpact] = useState(task.impact_score?.toString() || '5')
    const [newChecklistItem, setNewChecklistItem] = useState('')
    const [editProjectId, setEditProjectId] = useState<string | null>(task.project_id || null)
    const [editContentId, setEditContentId] = useState<string | null>(task.content_id || null)
    const [linkType, setLinkType] = useState<'none' | 'project' | 'content'>(
        task.content_id ? 'content' : task.project_id ? 'project' : 'none'
    )

    // Reset edit states to DB truth whenever editing starts
    useEffect(() => {
        if (isEditing) {
            setEditValue(task.title)
            setEditAmount(task.amount || '')
            setEditPriority(task.priority || 'low')
            setEditDueDate(task.due_date ? task.due_date.split('T')[0] : '')
            setEditEndDate(task.end_date ? task.end_date.split('T')[0] : '')
            setEditDueDateMode(task.recurrence_config?.type && task.recurrence_config.type !== 'none' ? 'recurring' : (task.due_date_mode || 'none'))
            setEditRecurrence(task.recurrence_config?.type && task.recurrence_config.type !== 'none' ? task.recurrence_config.type as any : 'off_days')
            setEditRecurringTime(task.recurrence_config?.time || '')
            setEditRecurringDuration(task.recurrence_config?.duration_minutes?.toString() || '60')
            setEditRecurringDays(task.recurrence_config?.days_of_week || [])
            setEditProfile(task.profile)
            setEditNotesType(task.notes?.type || 'text')
            setEditNotesContent(task.notes?.content || (task.notes?.type === 'checklist' ? [] : ''))
            setEditStrategicCategory(task.strategic_category)
            setEditDuration(task.estimated_duration?.toString() || '30')
            setEditTravelDuration(task.travel_to_duration?.toString() || '0')
            setEditImpact(task.impact_score?.toString() || '5')
            setEditProjectId(task.project_id || null)
            setEditContentId(task.content_id || null)
            setLinkType(task.content_id ? 'content' : task.project_id ? 'project' : 'none')
        }
    }, [isEditing, task])

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        if (!editValue.trim()) return

        const updates: Partial<Task> = {
            title: editValue.trim(),
            notes: {
                type: editNotesType,
                content: editNotesContent
            },
            strategic_category: editStrategicCategory,
            estimated_duration: parseInt(editDuration),
            travel_to_duration: parseInt(editTravelDuration),
            travel_from_duration: parseInt(editTravelDuration),
            impact_score: parseInt(editImpact),
            project_id: editProjectId || null,
            content_id: editContentId || null
        }
        if (editAmount.trim() !== (task.amount || '')) {
            let val = editAmount.trim()
            if (category === 'grocery' && val && !val.startsWith('x')) val = `x${val}`
            updates.amount = val
        }
        if (editPriority !== task.priority) updates.priority = editPriority
        if (editProfile !== task.profile) updates.profile = editProfile as any
        if (editDueDate !== (task.due_date ? task.due_date.split('T')[0] : '')) {
            updates.due_date = editDueDate || undefined
            if (!editDueDate) updates.due_date_mode = 'on'
        }

        if (editEndDate !== (task.end_date ? task.end_date.split('T')[0] : '')) {
            updates.end_date = editEndDate || undefined
        }

        if (editDueDateMode === 'recurring') {
            updates.recurrence_config = {
                type: editRecurrence,
                time: editRecurringTime || undefined,
                duration_minutes: editRecurringDuration ? parseInt(editRecurringDuration) : undefined,
                days_of_week: editRecurrence === 'custom' ? editRecurringDays : undefined
            }
            updates.due_date = undefined
            updates.due_date_mode = undefined
        } else if (editDueDateMode === 'none') {
            updates.recurrence_config = null
            updates.due_date = undefined
            updates.due_date_mode = undefined
        } else {
            updates.recurrence_config = null
            if (editDueDateMode !== (task.due_date_mode || 'on')) updates.due_date_mode = editDueDateMode as 'on' | 'before' | 'range'
        }

        if (Object.keys(updates).length > 0) {
            editTask(task.id, updates)
        }
        setIsEditing(false)
    }

    const handleToggleSubtask = async (subindex: number) => {
        if (task.notes?.type !== 'checklist') return
        const newContent = [...(task.notes.content as any[])]
        newContent[subindex] = { ...newContent[subindex], completed: !newContent[subindex].completed }

        await editTask(task.id, {
            notes: {
                ...task.notes,
                content: newContent
            }
        })
    }

    const handleAddChecklistItem = () => {
        if (newChecklistItem.trim()) {
            setEditNotesContent((prev: any[]) => [...prev, { text: newChecklistItem.trim(), completed: false }])
            setNewChecklistItem('')
        }
    }

    const handleToggleChecklistItem = (index: number) => {
        setEditNotesContent((prev: any[]) =>
            prev.map((item, i) => (i === index ? { ...item, completed: !item.completed } : item))
        )
    }

    const handleRemoveChecklistItem = (index: number) => {
        setEditNotesContent((prev: any[]) => prev.filter((_, i) => i !== index))
    }

    if (isEditing) {
        return (
            <div className="flex flex-col gap-3 p-3 rounded-xl border bg-white border-black/[0.15] shadow-lg animate-in fade-in zoom-in-95 duration-200">
                <div className="flex gap-2">
                    {category === 'grocery' && (
                        <input
                            type="text"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            placeholder="x1"
                            className="w-16 bg-black/[0.03] border border-black/[0.08] rounded-lg px-2 py-1.5 text-[13px] text-center text-black font-bold outline-none focus:border-black/30"
                        />
                    )}
                    <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="flex-1 bg-black/[0.03] border border-black/[0.08] rounded-lg px-3 py-1.5 text-[14px] text-black outline-none focus:border-black/30 placeholder:text-black/20"
                        placeholder="Operation title..."
                        autoFocus
                    />
                </div>

                <div className="flex flex-col gap-3">
                    {/* Notes Editor */}
                    <div className="flex flex-col gap-2 p-2.5 bg-black/[0.03] border border-black/5 rounded-xl">
                        <div className="flex gap-1.5">
                            {([
                                { type: 'text', icon: Type, label: 'Text' },
                                { type: 'bullets', icon: List, label: 'Bullets' },
                                { type: 'checklist', icon: ListChecks, label: 'Checklist' },
                            ] as const).map(noteType => (
                                <button
                                    key={noteType.type}
                                    type="button"
                                    onClick={() => {
                                        setEditNotesType(noteType.type)
                                        if (noteType.type === 'checklist' && !Array.isArray(editNotesContent)) {
                                            setEditNotesContent([])
                                        } else if (noteType.type !== 'checklist' && Array.isArray(editNotesContent)) {
                                            setEditNotesContent('')
                                        }
                                    }}
                                    className={cn(
                                        "px-2 py-1 text-[9px] font-bold rounded-lg border transition-all uppercase tracking-tight flex items-center gap-1",
                                        editNotesType === noteType.type
                                            ? 'bg-black text-white border-black'
                                            : 'bg-white text-black/40 border-black/10 hover:text-black/60'
                                    )}
                                >
                                    <noteType.icon className="w-3 h-3" />
                                    {noteType.label}
                                </button>
                            ))}
                        </div>

                        {editNotesType === 'text' && (
                            <textarea
                                value={editNotesContent}
                                onChange={(e) => setEditNotesContent(e.target.value)}
                                placeholder="Add some notes..."
                                className="w-full bg-white border border-black/10 rounded-lg px-3 py-2 text-[12px] text-black outline-none focus:border-black/30 min-h-[60px]"
                            />
                        )}

                        {editNotesType === 'bullets' && (
                            <textarea
                                value={editNotesContent}
                                onChange={(e) => setEditNotesContent(e.target.value)}
                                placeholder="Add bullet points, one per line..."
                                className="w-full bg-white border border-black/10 rounded-lg px-3 py-2 text-[12px] text-black outline-none focus:border-black/30 min-h-[60px]"
                            />
                        )}

                        {editNotesType === 'checklist' && (
                            <div className="flex flex-col gap-2">
                                {editNotesContent.map((item: any, index: number) => (
                                    <div key={index} className="flex items-center gap-2 bg-white border border-black/10 rounded-lg px-3 py-1.5">
                                        <input
                                            type="checkbox"
                                            checked={item.completed}
                                            onChange={() => handleToggleChecklistItem(index)}
                                            className="w-4 h-4 accent-black cursor-pointer shrink-0"
                                        />
                                        <span className={cn(
                                            "flex-1 text-[12px] text-black",
                                            item.completed && "line-through text-black/40"
                                        )}>
                                            {item.text}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveChecklistItem(index)}
                                            className="text-black/30 hover:text-red-500 transition-colors"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={newChecklistItem}
                                        onChange={(e) => setNewChecklistItem(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault()
                                                handleAddChecklistItem()
                                            }
                                        }}
                                        placeholder="Add new item..."
                                        className="flex-1 bg-white border border-black/10 rounded-lg px-3 py-1.5 text-[12px] text-black outline-none focus:border-black/30"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddChecklistItem}
                                        className="w-8 h-8 flex items-center justify-center bg-black text-white rounded-lg hover:bg-neutral-800 transition-colors"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Scheduling Options */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Date/Recurrence mode selector */}
                        <div className="flex flex-wrap gap-1.5">
                            {(['none', 'on', 'before', 'range', 'recurring'] as const).map(mode => (
                                <button
                                    key={mode}
                                    type="button"
                                    onClick={() => setEditDueDateMode(mode)}
                                    className={cn(
                                        "px-2 py-1 text-[9px] font-bold rounded-lg border transition-all uppercase tracking-tight",
                                        editDueDateMode === mode
                                            ? mode === 'recurring' ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-black text-white border-black'
                                            : 'bg-black/[0.03] border-black/5 text-black/40 hover:text-black/60'
                                    )}
                                >
                                    {mode === 'none' && 'None'}
                                    {mode === 'on' && 'On'}
                                    {mode === 'before' && 'By'}
                                    {mode === 'range' && 'Range'}
                                    {mode === 'recurring' && '🔁 Recurring'}
                                </button>
                            ))}
                        </div>

                        {/* Date inputs — hidden when None or Recurring */}
                        {editDueDateMode !== 'none' && editDueDateMode !== 'recurring' && (
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-2 bg-black/[0.03] border border-black/5 rounded-lg px-2.5 py-1 min-w-[110px]">
                                    <Calendar className="w-3 h-3 text-black/30 shrink-0" />
                                    <input
                                        type="date"
                                        value={editDueDate}
                                        onChange={(e) => setEditDueDate(e.target.value)}
                                        className="bg-transparent text-[10px] font-bold text-black/60 outline-none uppercase tracking-tight w-full"
                                    />
                                </div>
                                {editDueDateMode === 'range' && (
                                    <>
                                        <span className="text-[10px] font-bold text-black/20 uppercase tracking-tighter">to</span>
                                        <div className="flex items-center gap-2 bg-black/[0.03] border border-black/5 rounded-lg px-2.5 py-1 min-w-[110px]">
                                            <Calendar className="w-3 h-3 text-black/30 shrink-0" />
                                            <input
                                                type="date"
                                                value={editEndDate}
                                                onChange={(e) => setEditEndDate(e.target.value)}
                                                className="bg-transparent text-[10px] font-bold text-black/60 outline-none uppercase tracking-tight w-full"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Recurring sub-panel */}
                        {editDueDateMode === 'recurring' && (
                            <div className="flex flex-col gap-2 p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl">
                                <div className="flex flex-wrap gap-1">
                                    {(['daily', 'work_days', 'off_days', 'custom'] as const).map(rt => (
                                        <button
                                            key={rt}
                                            type="button"
                                            onClick={() => setEditRecurrence(rt as any)}
                                            className={cn(
                                                "px-2 py-0.5 text-[9px] font-bold rounded-md border transition-all uppercase tracking-tight",
                                                editRecurrence === rt
                                                    ? 'bg-emerald-600 text-white border-emerald-700'
                                                    : 'bg-white text-black/40 border-emerald-200 hover:text-black/60'
                                            )}
                                        >
                                            {rt.replace('_', ' ')}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <div className="flex items-center gap-1 bg-white border border-emerald-200 rounded-md px-2 py-1">
                                        <span className="text-[9px] font-bold text-black/40 uppercase">Time</span>
                                        <input type="time" value={editRecurringTime} onChange={e => setEditRecurringTime(e.target.value)} className="bg-transparent text-[10px] font-bold text-black/60 outline-none" />
                                    </div>
                                    <div className="flex items-center gap-1 bg-white border border-emerald-200 rounded-md px-2 py-1 flex-1">
                                        <span className="text-[9px] font-bold text-black/40 uppercase">Dur.</span>
                                        <select value={editRecurringDuration} onChange={e => setEditRecurringDuration(e.target.value)} className="bg-transparent text-[10px] font-bold text-black/60 outline-none w-full">
                                            <option value="">Duration</option>
                                            {[30, 60, 90, 120, 150, 180, 240, 300, 360].map(mins => {
                                                const hrs = mins / 60
                                                const label = hrs >= 1 ? `${hrs}${hrs % 1 === 0 ? '' : '.5'}h` : `${mins}m`
                                                return <option key={mins} value={mins}>{label}</option>
                                            })}
                                        </select>
                                    </div>
                                </div>
                                {editRecurrence === 'custom' && (
                                    <div className="flex gap-1 mt-1 animate-in fade-in zoom-in-95 duration-200">
                                        {[
                                            { d: 'M', v: 1 },
                                            { d: 'T', v: 2 },
                                            { d: 'W', v: 3 },
                                            { d: 'Th', v: 4 },
                                            { d: 'F', v: 5 },
                                            { d: 'Sa', v: 6 },
                                            { d: 'Su', v: 0 }
                                        ].map((day) => (
                                            <button
                                                key={day.v}
                                                type="button"
                                                onClick={() => {
                                                    setEditRecurringDays(prev =>
                                                        prev.includes(day.v)
                                                            ? prev.filter(d => d !== day.v)
                                                            : [...prev, day.v]
                                                    )
                                                }}
                                                className={cn(
                                                    "w-7 h-7 rounded-md text-[10px] font-bold border transition-all",
                                                    editRecurringDays.includes(day.v)
                                                        ? "bg-emerald-600 border-emerald-700 text-white"
                                                        : "bg-white border-emerald-200 text-black/40 hover:bg-emerald-50"
                                                )}
                                            >
                                                {day.d}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between flex-wrap gap-y-3 gap-x-2 border-t border-black/5 pt-3">
                        <div className="flex gap-1 p-1 bg-black/[0.03] rounded-lg border border-black/5">
                            {(['urgent', 'high', 'mid', 'low'] as const).map(p => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setEditPriority(p)}
                                    className={cn(
                                        "px-2 py-1 text-[9px] font-bold rounded-md border transition-all uppercase tracking-tight whitespace-nowrap",
                                        editPriority === p
                                            ? PRIORITY_CONFIG[p].color + " shadow-sm"
                                            : "bg-transparent text-black/30 border-transparent hover:text-black/50"
                                    )}
                                >
                                    {PRIORITY_CONFIG[p].label}
                                </button>
                            ))}
                        </div>
                        {/* Profile Toggle */}
                        <div className="flex gap-1 p-1 bg-black/[0.03] rounded-lg border border-black/5">
                            {[
                                { id: 'personal', label: 'Personal', icon: User },
                                { id: 'business', label: 'Business', icon: Briefcase }
                            ].map(p => (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => setEditProfile(p.id)}
                                    className={cn(
                                        "px-2 py-1 text-[9px] font-bold rounded-md border transition-all uppercase tracking-tight whitespace-nowrap flex items-center gap-1",
                                        editProfile === p.id
                                            ? "bg-white text-black border-black/[0.08] shadow-sm"
                                            : "bg-transparent text-black/30 border-transparent hover:text-black/50"
                                    )}
                                >
                                    <p.icon className="w-2.5 h-2.5" />
                                    {p.label}
                                </button>
                            ))}
                        </div>
                        {/* Strategic Category selection in Edit Mode */}
                        <div className="flex gap-1 p-1 bg-black/[0.03] rounded-lg border border-black/5">
                            {strategicCategories.map((p: any) => (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => setEditStrategicCategory(editStrategicCategory === p.id ? undefined : p.id)}
                                    className={cn(
                                        "px-2 py-1 text-[9px] font-bold rounded-md border transition-all uppercase tracking-tight whitespace-nowrap flex items-center gap-1",
                                        editStrategicCategory === p.id
                                            ? p.color + " shadow-sm bg-white"
                                            : "bg-transparent text-black/30 border-transparent hover:text-black/50"
                                    )}
                                >
                                    <p.icon className="w-2.5 h-2.5" />
                                    {p.label}
                                </button>
                            ))}
                        </div>
                        {/* Algorithmic Param edits */}
                        <div className="flex gap-4 p-2 bg-black/[0.02] rounded-xl border border-black/5 w-full sm:w-auto mt-2">
                            <div className="flex-1 flex flex-col gap-1">
                                <span className="text-[8px] font-bold text-black/30 uppercase tracking-widest px-1 flex items-center gap-1">
                                    <Clock className="w-2.5 h-2.5" /> Duration
                                </span>
                                <select
                                    value={editDuration}
                                    onChange={(e) => setEditDuration(e.target.value)}
                                    className="bg-black/[0.03] border border-black/[0.08] rounded-xl px-2 py-1 text-[11px] text-black outline-none focus:border-black/40 transition-colors appearance-none cursor-pointer"
                                >
                                    {Array.from({ length: 16 }, (_, i) => (i + 1) * 15).map(mins => (
                                        <option key={mins} value={mins}>
                                            {mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60 > 0 ? `${mins % 60}m` : ''}` : `${mins}m`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-1 flex flex-col gap-1">
                                <span className="text-[8px] font-bold text-black/30 uppercase tracking-widest px-1 flex items-center gap-1">
                                    <Car className="w-2.5 h-2.5" /> Travel
                                </span>
                                <select
                                    value={editTravelDuration}
                                    onChange={(e) => setEditTravelDuration(e.target.value)}
                                    className="bg-black/[0.03] border border-black/[0.08] rounded-xl px-2 py-1 text-[11px] text-black outline-none focus:border-black/40 transition-colors appearance-none cursor-pointer"
                                >
                                    <option value="0">None</option>
                                    {Array.from({ length: 8 }, (_, i) => (i + 1) * 15).map(mins => (
                                        <option key={mins} value={mins}>
                                            {mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60 > 0 ? `${mins % 60}m` : ''}` : `${mins}m`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-1 flex flex-col gap-1">
                                <span className="text-[8px] font-bold text-black/30 uppercase tracking-widest px-1 flex items-center gap-1">
                                    <Zap className="w-2.5 h-2.5" /> Impact ({editImpact})
                                </span>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="range"
                                        min="1"
                                        max="10"
                                        value={editImpact}
                                        onChange={(e) => setEditImpact(e.target.value)}
                                        className="flex-1 accent-black h-1 bg-black/10 rounded-lg appearance-none cursor-pointer mt-1"
                                    />
                                    <span className="text-[10px] font-black text-black w-3 text-center">{editImpact}</span>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Studio Linking in Inline Edit */}
                    {editProfile === 'business' && (
                        <div className="flex flex-col gap-2 p-2.5 bg-orange-50/50 border border-orange-100/50 rounded-xl mt-2">
                            <span className="text-[8px] font-bold text-orange-900/40 uppercase tracking-widest px-1">Studio Linking</span>
                            <div className="flex gap-2">
                                <select
                                    value={linkType}
                                    onChange={(e) => {
                                        const val = e.target.value as any
                                        setLinkType(val)
                                        if (val === 'none') {
                                            setEditProjectId(null)
                                            setEditContentId(null)
                                        } else if (val === 'project') {
                                            setEditContentId(null)
                                        } else {
                                            setEditProjectId(null)
                                        }
                                    }}
                                    className="h-8 flex-1 bg-white border border-orange-200 rounded-lg px-2 py-1 text-[11px] text-black outline-none focus:border-orange-400 appearance-none cursor-pointer"
                                >
                                    <option value="none">None</option>
                                    <option value="project">Project</option>
                                    <option value="content">Content</option>
                                </select>
                                <select
                                    disabled={linkType === 'none'}
                                    value={linkType === 'project' ? (editProjectId || '') : (editContentId || '')}
                                    onChange={(e) => {
                                        if (linkType === 'project') setEditProjectId(e.target.value)
                                        else setEditContentId(e.target.value)
                                    }}
                                    className="h-8 flex-[2] bg-white border border-orange-200 rounded-lg px-2 py-1 text-[11px] text-black outline-none focus:border-orange-400 appearance-none cursor-pointer disabled:opacity-50"
                                >
                                    <option value="">Select Item...</option>
                                    {linkType === 'project' ? (
                                        projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)
                                    ) : (
                                        content.map(c => <option key={c.id} value={c.id}>{c.title}</option>)
                                    )}
                                </select>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-2 ml-auto mt-2">
                        <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 text-black/40 hover:text-black text-[12px] font-bold transition-colors">
                            Cancel
                        </button>
                        <button onClick={handleSave} className="px-4 py-1.5 bg-black text-white text-[12px] font-bold rounded-lg hover:bg-neutral-800 transition-colors shadow-sm">
                            Save
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    const checklistItems = task.notes?.type === 'checklist' ? (task.notes.content as any[]) : []
    const completedSubtasks = checklistItems.filter(i => i.completed).length
    const totalSubtasks = checklistItems.length
    const progress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0

    return (
        <Reorder.Item
            key={task.id}
            value={task}
            dragListener={false}
            dragControls={controls}
            className="touch-none"
        >
            <div className={cn(
                "group flex items-center gap-3 p-3 rounded-xl border transition-all relative overflow-hidden",
                task.is_completed
                    ? "bg-black/[0.02] border-transparent opacity-60"
                    : "bg-white border-black/[0.06] hover:border-black/[0.15] shadow-sm active:scale-[0.98] active:shadow-md"
            )}>
                {/* Drag Handle */}
                {!task.is_completed && (
                    <div
                        onPointerDown={(e) => controls.start(e)}
                        className="cursor-grab active:cursor-grabbing text-black/10 hover:text-black/30 transition-colors shrink-0 -ml-1 py-1"
                    >
                        <GripVertical className="w-4 h-4" />
                    </div>
                )}
                <div
                    className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                    onClick={() => setSelectedTaskForModal(task)}
                >
                    {/* Checkbox — isolated from row click to prevent opening modal */}
                    <div
                        className="shrink-0"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <input
                            type="checkbox"
                            id={`task-${task.id}`}
                            checked={task.is_completed}
                            onChange={(e) => {
                                toggleTask(task.id, e.target.checked)
                            }}
                            className="w-5 h-5 rounded-lg border-2 border-black/10 checked:bg-black checked:border-black transition-all cursor-pointer accent-black shrink-0"
                        />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                        {/* Metadata First Hierarchy */}
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            {task.priority && !task.is_completed && (
                                <span className={cn(
                                    "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-[0.1em] shrink-0",
                                    (PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.urgent).color
                                )}>
                                    {task.priority}
                                </span>
                            )}
                            {task.strategic_category && (
                                <span className={cn(
                                    "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-[0.1em] shrink-0 flex items-center gap-1",
                                    [...PERSONAL_CATEGORIES, ...BUSINESS_CATEGORIES].find(c => c.id === task.strategic_category)?.color || "bg-black/5 text-black/40"
                                )}>
                                    {(() => {
                                        const cat = [...PERSONAL_CATEGORIES, ...BUSINESS_CATEGORIES].find(c => c.id === task.strategic_category)
                                        const Icon = cat?.icon
                                        return Icon ? <Icon className="w-2 h-2" /> : null
                                    })()}
                                    {task.strategic_category}
                                </span>
                            )}
                            {(task.project_id || task.content_id) && (
                                <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-[0.1em] shrink-0 flex items-center gap-1 bg-orange-50 text-orange-600 border border-orange-100/50">
                                    {task.project_id ? <Rocket className="w-2.5 h-2.5" /> : <Video className="w-2.5 h-2.5" />}
                                    {task.content_id
                                        ? content.find(c => c.id === task.content_id)?.title || 'Content'
                                        : projects.find(p => p.id === task.project_id)?.title || 'Project'}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {category === 'grocery' && task.amount && (
                                <span className="text-[12px] font-bold text-black/40 shrink-0">{task.amount}</span>
                            )}
                            <span className={cn(
                                "text-[14px] font-black truncate transition-all tracking-tight",
                                task.is_completed ? "text-black/30 line-through" : "text-black"
                            )}>
                                {task.title}
                            </span>
                            <div className="flex items-center gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                                {task.estimated_duration && (
                                    <span className="text-[10px] font-bold text-black/40 flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-black/20" />
                                        {task.estimated_duration}m
                                    </span>
                                )}
                                {task.impact_score && (
                                    <span className="text-[10px] font-black text-amber-600 flex items-center gap-0.5">
                                        <Zap className="w-3 h-3 fill-current" />
                                        {task.impact_score}
                                    </span>
                                )}
                                {(task.travel_to_duration || 0) > 0 && (
                                    <span className="text-[10px] font-black text-amber-500 flex items-center gap-1">
                                        <Car className="w-3 h-3" />
                                        {(task.travel_to_duration || 0)}{(task.travel_from_duration || 0) !== (task.travel_to_duration || 0) ? `+${task.travel_from_duration || 0}` : ''}m
                                    </span>
                                )}
                            </div>
                        </div>
                        {/* Notes Teaser or Progress Bar */}
                        {!isEditing && (
                            <div className="mt-1 flex flex-col gap-1.5">
                                {task.notes?.type === 'checklist' && totalSubtasks > 0 && (
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-1 bg-black/[0.05] rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-emerald-500 transition-all duration-500 ease-out"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                        <span className="text-[9px] font-bold text-black/30 whitespace-nowrap">
                                            {completedSubtasks}/{totalSubtasks}
                                        </span>
                                    </div>
                                )}
                                {task.notes?.content && (
                                    <div className="relative mt-1">
                                        {!isExpanded ? (
                                            <div className="flex flex-col items-start gap-1">
                                                <p className="text-[11px] text-black/40 leading-relaxed line-clamp-1">
                                                    {task.notes.type === 'checklist'
                                                        ? (task.notes.content as any[]).map(i => (i.completed ? '✓ ' : '○ ') + i.text).join(', ')
                                                        : task.notes.content}
                                                </p>
                                                {(task.notes.content.length > 50 || (task.notes.type === 'checklist' && totalSubtasks > 1)) && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setIsExpanded(true)
                                                        }}
                                                        className="text-[10px] font-bold text-black/20 hover:text-black/40 transition-colors uppercase tracking-tight"
                                                    >
                                                        + Show More
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                                {/* Expanded Checklist View */}
                                                {task.notes.type === 'checklist' && (
                                                    <div className="flex flex-col gap-2 pl-1 border-l-2 border-black/[0.03]">
                                                        {(task.notes.content as any[]).map((item, idx) => (
                                                            <div
                                                                key={idx}
                                                                className="flex items-center gap-2 group/sub cursor-pointer"
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    handleToggleSubtask(idx)
                                                                }}
                                                            >
                                                                <div className={cn(
                                                                    "w-3.5 h-3.5 rounded border flex items-center justify-center transition-all",
                                                                    item.completed ? "bg-emerald-500 border-emerald-500" : "bg-white border-black/10 group-hover/sub:border-black/30"
                                                                )}>
                                                                    {item.completed && <CheckSquare className="w-2.5 h-2.5 text-white" />}
                                                                </div>
                                                                <span className={cn(
                                                                    "text-[11px] transition-all",
                                                                    item.completed ? "text-black/30 line-through" : "text-black/60 font-medium"
                                                                )}>
                                                                    {item.text}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {/* Expanded Bullets/Text View */}
                                                {task.notes.type !== 'checklist' && (
                                                    <div className="text-[11px] text-black/60 whitespace-pre-wrap pl-3 border-l-2 border-black/[0.03] leading-relaxed font-medium">
                                                        {task.notes.content}
                                                    </div>
                                                )}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setIsExpanded(false)
                                                    }}
                                                    className="text-[10px] font-bold text-black/20 hover:text-black/40 transition-colors uppercase tracking-tight w-fit"
                                                >
                                                    - Show Less
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                        {task.due_date && !task.is_completed && (
                            <div className="flex items-center gap-1.5 text-[10px] text-black/30 font-bold uppercase tracking-wider mt-1">
                                <Calendar className="w-2.5 h-2.5" />
                                {task.due_date_mode === 'before' && <span>On or Before </span>}
                                {task.due_date_mode === 'range' && <span>Range </span>}
                                <span>{new Date(task.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                                {task.due_date_mode === 'range' && task.end_date && (
                                    <>
                                        <span className="opacity-40">→</span>
                                        <span>{new Date(task.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 relative">
                    {isConfirmingDelete ? (
                        <div className="flex items-center gap-1 animate-in slide-in-from-right-2 duration-200">
                            <button
                                onClick={() => setIsConfirmingDelete(false)}
                                className="px-2.5 py-1.5 rounded-lg bg-black/[0.03] text-[10px] font-bold text-black/40 hover:bg-black/[0.08]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    deleteTask(task)
                                    setIsConfirmingDelete(false)
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-red-500 text-white text-[10px] font-bold hover:bg-red-600 shadow-lg shadow-red-500/20"
                            >
                                Delete
                            </button>
                        </div>
                    ) : (
                        <>
                            <button
                                onClick={() => setIsEditing(true)}
                                className="w-9 h-9 flex items-center justify-center rounded-xl bg-black/[0.03] sm:bg-transparent text-black/40 hover:text-black hover:bg-black/5 transition-all"
                                aria-label="Edit task"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setIsConfirmingDelete(true)}
                                className="w-9 h-9 flex items-center justify-center rounded-xl bg-black/[0.03] sm:bg-transparent text-black/40 hover:text-red-500 hover:bg-red-50 transition-all"
                                aria-label="Delete task"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </Reorder.Item>
    )
}

function MilestoneRow({ milestone, project, content, onSelectItem }: {
    milestone: StudioMilestone,
    project: any,
    content: any,
    onSelectItem: (milestone: StudioMilestone) => void
}) {
    const statusColor = milestone.status === 'completed' ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-blue-500 shadow-blue-500/20'
    const type = milestone.project_id ? 'Project' : 'Content'
    const parentTitle = project?.title || content?.title || 'Unknown Source'

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="group flex items-center gap-3 p-3 bg-black/[0.02] hover:bg-black/[0.04] border border-black/[0.05] rounded-xl transition-all cursor-pointer"
            onClick={() => onSelectItem(milestone)}
        >
            <div className={cn("w-2 h-2 rounded-full shrink-0 animate-pulse", statusColor)} />

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-[13px] font-black text-black tracking-tight truncate">{milestone.title}</span>
                    <span className={cn(
                        "px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider flex items-center gap-1",
                        type === 'Project' ? "bg-purple-50 text-purple-600 border border-purple-100" : "bg-blue-50 text-blue-600 border border-blue-100"
                    )}>
                        {type === 'Project' ? <Rocket className="w-2 h-2" /> : <Video className="w-2 h-2" />}
                        {type}
                    </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-bold text-black/40 truncate max-w-[150px]">{parentTitle}</span>
                    <div className="w-1 h-1 rounded-full bg-black/10" />
                    <span className="text-[10px] font-bold text-amber-600 flex items-center gap-0.5">
                        <Zap className="w-3 h-3 fill-current" />
                        {milestone.impact_score || 0}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {milestone.target_date && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-white border border-black/5 rounded-lg shadow-sm">
                        <Calendar className="w-3 h-3 text-black/20" />
                        <span className="text-[10px] font-black text-black/40 uppercase tracking-tight">
                            {new Date(milestone.target_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </span>
                    </div>
                )}
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-black/5 text-black/20 group-hover:bg-black group-hover:text-white transition-all shadow-sm">
                    <ArrowRight className="w-4 h-4" />
                </div>
            </div>
        </motion.div>
    )
}
