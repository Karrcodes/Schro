import {
    ShoppingCart, Bell, Activity, Wallet, Briefcase,
    Heart, User, Beaker, Factory, Tv, TrendingUp, Zap,
    Shield, Star, Coffee, Utensils, Search, Filter,
    LayoutGrid, LayoutList, Target, Clock, Car, ListTodo,
    Timer, Feather
} from 'lucide-react'

export const CATEGORIES = [
    { id: 'todo', label: 'Tasks', icon: ListTodo },
    { id: 'grocery', label: 'Grocery List', icon: ShoppingCart },
    { id: 'reminder', label: 'Reminders', icon: Bell },
] as const

export const PRIORITIES = [
    { id: 'super', label: 'Super', color: 'bg-purple-50 text-purple-600 border-purple-200', sort: 0 },
    { id: 'high', label: 'High', color: 'bg-red-50 text-red-600 border-red-200', sort: 1 },
    { id: 'mid', label: 'Mid', color: 'bg-yellow-50 text-yellow-600 border-yellow-200', sort: 2 },
    { id: 'low', label: 'Low', color: 'bg-black/5 text-black/60 border-black/10', sort: 3 }
] as const

export const PRIORITY_MAP = {
    super: PRIORITIES[0],
    high: PRIORITIES[1],
    mid: PRIORITIES[2],
    low: PRIORITIES[3]
} as const

export const PERSONAL_CATEGORIES = [
    { id: 'finance', label: 'Finance', icon: Wallet, color: 'text-emerald-600 bg-emerald-50 border-emerald-100', dotBgColor: 'bg-emerald-500 shadow-emerald-500/40' },
    { id: 'career', label: 'Career', icon: Briefcase, color: 'text-blue-600 bg-blue-50 border-blue-200', dotBgColor: 'bg-blue-600 shadow-blue-500/40' },
    { id: 'health', label: 'Health', icon: Heart, color: 'text-rose-600 bg-rose-50 border-rose-100', dotBgColor: 'bg-rose-500 shadow-rose-500/40' },
    { id: 'personal', label: 'Personal', icon: User, color: 'text-amber-600 bg-amber-50 border-amber-200', dotBgColor: 'bg-amber-500 shadow-amber-500/40' },
] as const

export const BUSINESS_CATEGORIES = [
    { id: 'rnd', label: 'R&D', icon: Beaker, color: 'text-purple-600 bg-purple-50 border-purple-100', dotBgColor: 'bg-purple-500 shadow-purple-500/40' },
    { id: 'production', label: 'Production', icon: Factory, color: 'text-orange-600 bg-orange-50 border-orange-100', dotBgColor: 'bg-orange-500 shadow-orange-500/40' },
    { id: 'media', label: 'Media', icon: Tv, color: 'text-rose-600 bg-rose-50 border-rose-100', dotBgColor: 'bg-rose-500 shadow-rose-500/40' },
    { id: 'growth', label: 'Growth', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50 border-emerald-100', dotBgColor: 'bg-emerald-500 shadow-emerald-500/40' },
    { id: 'general', label: 'General', icon: Zap, color: 'text-neutral-600 bg-neutral-50 border-neutral-200', dotBgColor: 'bg-neutral-500 shadow-neutral-500/40' },
] as const

export const STRATEGIC_CATEGORIES = {
    personal: PERSONAL_CATEGORIES,
    business: BUSINESS_CATEGORIES
} as const

export const WORK_MODES = [
    { id: 'light', label: 'Light Work', icon: Feather, color: 'text-orange-900 bg-orange-50 border-orange-100', description: 'Low cognitive load (chores, routine)' },
    { id: 'deep', label: 'Deep Work', icon: Timer, color: 'text-orange-50 bg-orange-950 border-orange-900', description: 'High concentration (business, growth)' }
] as const
