/**
 * Single source of truth for the application's navigation structure.
 * The Sidebar and Control Centre both derive from this config, so
 * reordering here automatically updates both.
 */

import {
    BarChart3, Activity, Shield, Brain, Target, Heart,
    LayoutDashboard, SlidersHorizontal, Calendar, CreditCard,
    PiggyBank, Receipt, Sparkles, Rocket, Video, PenLine,
    Users, Award, ClipboardIcon, Key, TrendingUp
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

export const navItems: NavItem[] = [
    { label: 'Control Centre', href: '/system/control-centre', icon: LayoutDashboard },
    { label: 'Intelligence', href: '/intelligence', icon: Brain, color: 'black' },
    {
        label: 'Operations',
        href: '/tasks',
        icon: Activity,
        color: 'blue',
        sub: [
            { label: 'Planner', href: '/tasks/planner', icon: LayoutDashboard, disabled: true },
            { label: 'Matrix', href: '/tasks/matrix', icon: SlidersHorizontal },
            { label: 'Calendar', href: '/tasks/calendar', icon: Calendar }
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
        icon: BarChart3,
        color: 'emerald',
        sub: [
            { label: 'Projections', href: '/finances/projections', icon: Calendar, caps: ['P'] },
            { label: 'Transactions', href: '/finances/transactions', icon: Receipt, caps: ['P', 'B'], disabled: true },
            { label: 'Analytics', href: '/finances/analytics', icon: TrendingUp, caps: ['P'] },
            { label: 'Liabilities', href: '/finances/liabilities', icon: CreditCard, caps: ['P', 'B'] },
            { label: 'Savings', href: '/finances/savings', icon: PiggyBank, caps: ['P', 'B'] },
            { label: 'Pots', href: '/finances/pots', icon: SlidersHorizontal, caps: ['P', 'B'] }
        ]
    },
    {
        label: 'Studio',
        href: '/create',
        icon: Sparkles,
        color: 'orange',
        sub: [
            { label: 'Projects', href: '/create/projects', icon: Rocket },
            { label: 'Content', href: '/create/content', icon: Video },
            { label: 'Canvas', href: '/create/canvas', icon: PenLine },
            { label: 'Sparks', href: '/create/sparks', icon: Target },
            { label: 'Network', href: '/create/network', icon: Users },
            { label: 'Press', href: '/create/press', icon: Award },
            { label: 'Portfolio', href: '/create/portfolio', icon: Shield }
        ]
    },
    { label: 'Manifest', href: '/goals', icon: Target, color: 'amber' },
    { label: 'Wellbeing', href: '/health', icon: Heart, disabled: true, color: 'rose' },
]

/**
 * Top-level modules suitable for display in the Control Centre quick actions.
 * Excludes Control Centre itself from the list.
 */
export const moduleNav = navItems.filter(n => n.href !== '/system/control-centre')
