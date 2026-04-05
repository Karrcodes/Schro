/**
 * Single source of truth for the application's navigation structure.
 * The Sidebar and Control Centre both derive from this config, so
 * reordering here automatically updates both.
 */

import {
    BarChart3, Activity, Shield, Brain, Target, Heart,
    LayoutDashboard, SlidersHorizontal, Calendar, CreditCard,
    PiggyBank, Receipt, Sparkles, Rocket, Video, PenLine, Bell, ShoppingCart,
    Users, Award, ClipboardIcon, Key, TrendingUp, Utensils, Dumbbell, Star, Compass, Images, ListTodo, Search, Wand2, Package, Wrench, Coffee, Gauge, Wallet, Palette
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavSubItem {
    label: string
    href: string
    icon: LucideIcon
    caps?: string[]
    disabled?: boolean
}

export interface NavItem {
    label: string
    href: string
    icon: LucideIcon
    sub?: NavSubItem[]
    disabled?: boolean
    color?: string
}

export const assistantItem: NavItem = { label: 'Assistant', href: '/intelligence', icon: Sparkles, color: 'black' }

export const navItems: NavItem[] = [
    { 
        label: 'Control Centre', 
        href: '/system/control-centre', 
        icon: LayoutDashboard,
        color: 'blue',
        sub: [
            { label: 'Daily Brief', href: '/system/control-centre?tab=brief', icon: Coffee },
            { label: 'Schedule', href: '/system/control-centre?tab=calendar', icon: Calendar },
            { label: 'Performance', href: '/system/control-centre?tab=intelligence', icon: Gauge }
        ]
    },
    {
        label: 'Operations',
        href: '/tasks',
        icon: Activity,
        color: 'blue',
        sub: [
            { label: 'Tasks', href: '/tasks?tab=todo', icon: ListTodo },
            { label: 'Reminders', href: '/tasks?tab=reminder', icon: Bell },
            { label: 'Shopping', href: '/tasks?tab=shopping&shop=grocery', icon: ShoppingCart },
        ]
    },
    {
        label: 'Vault',
        href: '/vault',
        icon: Shield,
        color: 'purple',
        sub: [
            { label: 'Clipboard', href: '/vault/clipboard', icon: ClipboardIcon },
            { label: 'Secrets Manager', href: '/vault/secrets', icon: Key }
        ]
    },
    {
        label: 'Finances',
        href: '/finances',
        icon: Wallet,
        color: 'emerald',
        sub: [
            { label: 'Projections', href: '/finances/projections', icon: TrendingUp, caps: ['P'] },
            { label: 'Transactions', href: '/finances/transactions', icon: Receipt, caps: ['P', 'B'] },
            { label: 'Analytics', href: '/finances/analytics', icon: BarChart3, caps: ['P', 'B'] },
            { label: 'Liabilities', href: '/finances/liabilities', icon: CreditCard, caps: ['P', 'B'] },
            { label: 'Savings', href: '/finances/savings', icon: PiggyBank, caps: ['P', 'B'] },
            { label: 'Pot Settings', href: '/finances/pot-settings', icon: SlidersHorizontal, caps: ['P', 'B'] }
        ]
    },

    {
        label: 'Studio',
        href: '/create',
        icon: Palette,
        color: 'orange',
        sub: [
            { label: 'Projects', href: '/create/projects', icon: Rocket },
            { label: 'Content', href: '/create/content', icon: Video },
            { label: 'Canvas', href: '/create/canvas', icon: PenLine },
            { label: 'Tools', href: '/create/sparks', icon: Wrench },
            { label: 'Network', href: '/create/network', icon: Users },
            { label: 'Press', href: '/create/press', icon: Award },
            { label: 'Portfolio', href: '/create/portfolio', icon: Images }
        ]
    },
    { 
        label: 'Manifest', 
        href: '/goals', 
        icon: Compass, 
        color: 'amber',
        sub: [
            { label: 'Targets', href: '/goals/mission', icon: Target },
            { label: 'Dreams', href: '/goals/dreams', icon: Wand2 },
            { label: 'Wishlist', href: '/goals/wishlist', icon: Star }
        ]
    },
    {
        label: 'Wellbeing',
        href: '/health',
        icon: Heart,
        color: 'rose',
        sub: [
            { label: 'Fitness', href: '/health/fitness', icon: Dumbbell },
            { label: 'Nutrition', href: '/health/nutrition', icon: Utensils },
            { label: 'Mind', href: '/health/mind', icon: Brain },
            { label: 'Settings', href: '/health/settings', icon: SlidersHorizontal }
        ]
    },
]

export const COLOR_MAP: Record<string, string> = {
    black: 'text-black',
    blue: 'text-blue-500',
    purple: 'text-purple-500',
    emerald: 'text-emerald-500',
    orange: 'text-orange-500',
    amber: 'text-amber-500',
    rose: 'text-rose-500',
    indigo: 'text-indigo-500',
    pink: 'text-pink-500'
}

/**
 * Top-level modules suitable for display in the Control Centre quick actions.
 * Excludes Control Centre itself from the list.
 */
export const moduleNav = [
    assistantItem,
    ...navItems.filter(n => n.href !== '/system/control-centre')
]
