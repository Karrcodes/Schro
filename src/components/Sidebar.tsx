'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import {
    BarChart3, Activity, ShoppingCart, Bell,
    SlidersHorizontal, Menu, X, RefreshCw,
    Shield, ChevronDown, Check, ChevronLeft, ChevronRight,
    TrendingUp, Calendar, CreditCard, PiggyBank,
    Moon, Sun, Laptop, Target, Briefcase, Heart, Gift,
    LayoutDashboard, EyeOff, Receipt, Lock, ClipboardIcon, Key, Brain, Sparkles, Award,
    Video
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Reorder } from 'framer-motion'
import { useFinanceProfile } from '@/features/finance/contexts/FinanceProfileContext'
import { useSettings } from '@/features/finance/hooks/useSettings'
import { useSystemSettings } from '@/features/system/contexts/SystemSettingsContext'

const navItems = [
    { label: 'Control Centre', href: '/system/control-centre', icon: LayoutDashboard },
    { label: 'Intelligence', href: '/intelligence', icon: Brain },
    {
        label: 'Operations',
        href: '/tasks',
        icon: Activity,
        sub: [
            { label: 'Planner', href: '/tasks/planner', icon: LayoutDashboard },
            { label: 'Matrix', href: '/tasks/matrix', icon: SlidersHorizontal },
            { label: 'Calendar', href: '/tasks/calendar', icon: Calendar }
        ]
    },
    {
        label: 'Vault',
        href: '/vault',
        icon: Shield,
        sub: [
            { label: 'Clipboard', href: '/vault/clipboard', icon: ClipboardIcon },
            { label: 'Secrets Manager', href: '/vault/secrets', icon: Key }
        ]
    },
    {
        label: 'Finances',
        href: '/finances',
        icon: BarChart3,
        sub: [
            { label: 'Projections', href: '/finances/projections', icon: Calendar, caps: ['P'] },
            { label: 'Transactions', href: '/finances/transactions', icon: Receipt, caps: ['P', 'B'], disabled: true },
            { label: 'Analytics', href: '/finances/analytics', icon: TrendingUp, caps: ['P'] },
            { label: 'Liabilities', href: '/finances/liabilities', icon: CreditCard, caps: ['P', 'B'] },
            { label: 'Savings', href: '/finances/savings', icon: PiggyBank, caps: ['P', 'B'] },
            { label: 'Settings', href: '/finances/settings', icon: SlidersHorizontal, caps: ['P', 'B'] }
        ],
    },
    {
        label: 'Studio',
        href: '/create',
        icon: Sparkles,
        sub: [
            { label: 'Projects', href: '/create/projects', icon: Briefcase },
            { label: 'Content', href: '/create/content', icon: Video },
            { label: 'Sparks', href: '/create/sparks', icon: Target },
            { label: 'Network', href: '/create/network', icon: Activity },
            { label: 'Press', href: '/create/press', icon: Award },
            { label: 'Portfolio', href: '/create/portfolio', icon: Shield }
        ]
    },
    { label: 'Manifest', href: '/goals', icon: Target },
    { label: 'Wellbeing', href: '/health', icon: Heart, disabled: true },
]

function CapBadge({ cap }: { cap: 'P' | 'B' }) {
    return (
        <span className={cn(
            "w-3.5 h-3.5 flex items-center justify-center rounded-[2px] text-[8px] font-bold border shrink-0 select-none",
            cap === 'P'
                ? "bg-blue-50 text-blue-600 border-blue-200/50"
                : "bg-emerald-50 text-emerald-600 border-emerald-200/50"
        )}>
            {cap}
        </span>
    )
}

function SidebarFooter({ pathname }: { pathname: string }) {
    return (
        <div className="px-5 py-3 border-t border-black/[0.03] space-y-3">
            <Link
                href="/system/settings"
                className={cn(
                    "flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-[13px] font-medium",
                    pathname === '/system/settings' ? 'bg-black/10 text-black' : 'text-black/50 hover:text-black/80 hover:bg-black/[0.04]'
                )}
            >
                <SlidersHorizontal className={cn("w-4 h-4", pathname === '/system/settings' ? 'text-black' : 'text-black/35')} />
                Settings
            </Link>

            <Link
                href="/system/roadmap"
                className="flex items-center gap-2 text-[10px] font-bold text-black/20 hover:text-black/40 transition-colors group px-2.5"
            >
                <span className="w-1.5 h-1.5 rounded-full bg-black/10 group-hover:bg-black/20" />
                v1.2.0
            </Link>
        </div>
    )
}

function ProfileMenu() {
    const [isOpen, setIsOpen] = useState(false)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        if (isOpen) document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isOpen])

    const { settings } = useSystemSettings()

    return (
        <div className="relative px-5 py-4 border-t border-black/[0.06]" ref={menuRef}>
            {isOpen && (
                <div className="absolute bottom-full left-4 mb-2 w-52 bg-white border border-black/[0.08] rounded-xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-2 duration-200 z-[60]">
                    <div className="p-3">
                        <p className="text-[12px] font-bold text-black">{settings.user_name || 'Schrö Admin'}</p>
                        <p className="text-[10px] text-black/40">{settings.user_email || 'karr@studiokarrtesian.com'}</p>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2.5 p-1 -ml-1 rounded-xl hover:bg-black/5 transition-colors text-left"
                >
                    <div className="w-8 h-8 rounded-full bg-black/10 border border-black/20 flex items-center justify-center shrink-0 overflow-hidden">
                        {settings.profile_picture_url ? (
                            <img src={settings.profile_picture_url} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-[12px] text-black font-bold">{(settings.user_name?.[0] || 'K').toUpperCase()}</span>
                        )}
                    </div>
                    <div>
                        <p className="text-[13px] text-black font-bold tracking-tight">{settings.user_name || 'Karr'}</p>
                        <p className="text-[11px] text-black/40 font-medium">Personal OS</p>
                    </div>
                </button>
                <button
                    onClick={() => {
                        setIsRefreshing(true)
                        window.location.reload()
                    }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-black/35 hover:text-black/80 hover:bg-black/[0.05] transition-colors shrink-0"
                    title="Refresh App"
                    disabled={isRefreshing}
                >
                    <RefreshCw className={cn("w-4 h-4 transition-transform", isRefreshing && "animate-spin")} />
                </button>
            </div>
        </div>
    )
}

import { useVault } from '@/features/vault/contexts/VaultContext'

export function Sidebar() {
    const pathname = usePathname()
    if (pathname === '/home') return null
    const [mobileOpen, setMobileOpen] = useState(false)
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({})
    const [isRefreshing, setIsRefreshing] = useState(false)
    const { isPrivacyEnabled } = useFinanceProfile()
    const { isVaultPrivate } = useVault()

    const [orderedTabs, setOrderedTabs] = useState(navItems.map(item => item.label))
    const [orderedFinanceSubTabs, setOrderedFinanceSubTabs] = useState<string[]>([])
    const [isMounted, setIsMounted] = useState(false)
    const { settings, setSetting, loading: settingsLoading } = useSettings()
    const [isCollapsed, setIsCollapsed] = useState(false)

    // Touch handlers for swipe to close on mobile
    const [touchStartX, setTouchStartX] = useState<number | null>(null)
    const [touchEndX, setTouchEndX] = useState<number | null>(null)

    const minSwipeDistance = 50

    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEndX(null)
        setTouchStartX(e.targetTouches[0].clientX)
    }

    const onTouchMove = (e: React.TouchEvent) => {
        setTouchEndX(e.targetTouches[0].clientX)
    }

    const onTouchEnd = () => {
        if (!touchStartX || !touchEndX) return
        const distance = touchStartX - touchEndX
        const isLeftSwipe = distance > minSwipeDistance
        if (isLeftSwipe) {
            setMobileOpen(false)
        }
    }

    useEffect(() => {
        setIsMounted(true)
        // Load collapse state
        const savedCollapsed = localStorage.getItem('schro_sidebar_collapsed')
        const collapsed = savedCollapsed === 'true'
        setIsCollapsed(collapsed)
        document.documentElement.style.setProperty('--sidebar-w', collapsed ? '64px' : '220px')

        // Load main tabs order
        const savedOrder = localStorage.getItem('schro_sidebar_order')
        if (savedOrder) {
            try {
                const parsed = JSON.parse(savedOrder)
                const existingLabels = navItems.map(i => i.label)
                const validParsed = parsed.filter((label: string) => existingLabels.includes(label))
                const missing = existingLabels.filter(label => !validParsed.includes(label))
                setOrderedTabs([...validParsed, ...missing])
            } catch (e) { }
        }

        // Load finance sub-tabs order
        const savedSubOrder = localStorage.getItem('schro_finance_subtabs_order')
        const financeItem = navItems.find(i => i.label === 'Finances')
        const defaultSubLabels = financeItem?.sub?.map(s => s.label) || []

        if (savedSubOrder) {
            try {
                const parsed = JSON.parse(savedSubOrder)
                const validParsed = parsed.filter((label: string) => defaultSubLabels.includes(label))
                const missing = defaultSubLabels.filter(label => !validParsed.includes(label))
                setOrderedFinanceSubTabs([...validParsed, ...missing])
            } catch (e) { }
        } else {
            setOrderedFinanceSubTabs(defaultSubLabels)
        }
    }, [])

    // Sync from Supabase once settings are loaded
    useEffect(() => {
        if (settingsLoading) return

        const dbOrder = settings['schro_sidebar_order']
        if (dbOrder) {
            try {
                const parsed = JSON.parse(dbOrder)
                const existingLabels = navItems.map(i => i.label)
                const validParsed = parsed.filter((label: string) => existingLabels.includes(label))
                const missing = existingLabels.filter(label => !validParsed.includes(label))
                const finalOrder = [...validParsed, ...missing]

                // Only update if different
                if (JSON.stringify(finalOrder) !== localStorage.getItem('schro_sidebar_order')) {
                    setOrderedTabs(finalOrder)
                    localStorage.setItem('schro_sidebar_order', JSON.stringify(finalOrder))
                }
            } catch (e) { }
        }

        const dbSubOrder = settings['schro_finance_subtabs_order']
        const financeItem = navItems.find(i => i.label === 'Finances')
        const defaultSubLabels = financeItem?.sub?.map(s => s.label) || []

        if (dbSubOrder) {
            try {
                const parsed = JSON.parse(dbSubOrder)
                const validParsed = parsed.filter((label: string) => defaultSubLabels.includes(label))
                const missing = defaultSubLabels.filter(label => !validParsed.includes(label))
                const finalSubOrder = [...validParsed, ...missing]

                if (JSON.stringify(finalSubOrder) !== localStorage.getItem('schro_finance_subtabs_order')) {
                    setOrderedFinanceSubTabs(finalSubOrder)
                    localStorage.setItem('schro_finance_subtabs_order', JSON.stringify(finalSubOrder))
                }
            } catch (e) { }
        }
    }, [settingsLoading, settings])

    const handleReorder = (newOrder: string[]) => {
        setOrderedTabs(newOrder)
        localStorage.setItem('schro_sidebar_order', JSON.stringify(newOrder))
        setSetting('schro_sidebar_order', JSON.stringify(newOrder))
    }

    const handleSubReorder = (newOrder: string[]) => {
        setOrderedFinanceSubTabs(newOrder)
        localStorage.setItem('schro_finance_subtabs_order', JSON.stringify(newOrder))
        setSetting('schro_finance_subtabs_order', JSON.stringify(newOrder))
    }


    const toggleCollapse = () => {
        setIsCollapsed(prev => {
            const next = !prev
            localStorage.setItem('schro_sidebar_collapsed', String(next))
            document.documentElement.style.setProperty('--sidebar-w', next ? '64px' : '220px')
            return next
        })
    }

    // Close drawer and clean up irrelevant flyouts on route change
    useEffect(() => {
        setMobileOpen(false)
        // Clean up expanded folders that are not related to the current path
        setExpandedFolders(prev => {
            const next = { ...prev }
            Object.keys(next).forEach(key => {
                if (!pathname.startsWith(key)) {
                    delete next[key]
                }
            })
            return next
        })
    }, [pathname])

    const toggleFolder = (href: string, e: React.MouseEvent) => {
        e.preventDefault()
        setExpandedFolders(prev => {
            const isCurrentlyExpanded = prev[href]
            // Auto-collapse others when opening one
            if (!isCurrentlyExpanded) {
                return { [href]: true }
            }
            return { ...prev, [href]: false }
        })
    }

    const renderContent = (itemsToRender: string[], isReorderable: boolean) =>
        itemsToRender.map((label) => {
            const item = navItems.find((i) => i.label === label)
            if (!item) return null

            const isActive = !('disabled' in item && item.disabled) && pathname.startsWith(item.href)
            const Icon = item.icon

            let content

            if ('disabled' in item && item.disabled) {
                content = (
                    <div className="flex items-center justify-between gap-3 px-2.5 py-2 rounded-lg cursor-not-allowed opacity-30 select-none grayscale bg-black/[0.02] border border-transparent hover:border-black/[0.05] transition-all">
                        <div className="flex items-center gap-2.5">
                            <Icon className="w-4 h-4 text-black/40" />
                            <span className="text-[13px] text-black/50 font-medium tracking-tight">{item.label}</span>
                        </div>
                        <Lock className="w-3 h-3 text-black/20" />
                    </div>
                )
            } else {
                content = (
                    <div className="select-none">
                        <Link
                            href={item.href}
                            draggable={false}
                            className={cn(
                                'flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all duration-150 relative group',
                                isActive ? 'bg-black/10 text-black' : 'text-black/50 hover:text-black/80 hover:bg-black/[0.04]'
                            )}
                        >
                            <Icon className={cn('w-4 h-4', isActive ? 'text-black' : 'text-black/35')} />
                            <span className="text-[13px] font-medium pointer-events-none">{item.label}</span>

                            {item.label === 'Vault' && isVaultPrivate && (
                                <EyeOff className="w-3.5 h-3.5 text-blue-500 ml-1.5 animate-pulse" />
                            )}

                            {item.label === 'Finances' && isPrivacyEnabled && (
                                <EyeOff className="w-3.5 h-3.5 text-emerald-500 ml-1.5 animate-pulse" />
                            )}

                            {'sub' in item && item.sub && (
                                <button
                                    type="button"
                                    onClick={(e) => toggleFolder(item.href, e)}
                                    className="ml-auto p-1 rounded hover:bg-black/5 text-black/40 hover:text-black/70 transition-colors z-10 relative"
                                    draggable={false}
                                >
                                    <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", expandedFolders[item.href] ? "rotate-180" : "")} />
                                </button>
                            )}
                        </Link>

                        {'sub' in item && item.sub && expandedFolders[item.href] && (label === 'Finances' || label === 'Studio') && (
                            <div className="ml-5 mt-0.5 space-y-0.5 border-l border-black/[0.07] pl-3">
                                {isReorderable ? (
                                    <Reorder.Group
                                        axis="y"
                                        values={label === 'Finances' ? orderedFinanceSubTabs : item.sub.map(s => s.label)}
                                        onReorder={label === 'Finances' ? handleSubReorder : () => { }}
                                        className="list-none m-0 p-0 space-y-0.5"
                                    >
                                        {(label === 'Finances' ? orderedFinanceSubTabs : item.sub.map(s => s.label)).map((subLabel) => {
                                            const subItem = item.sub?.find(s => s.label === subLabel)
                                            if (!subItem) return null
                                            const SubIcon = subItem.icon
                                            const subActive = pathname === subItem.href
                                            const isDisabled = (subItem as any).disabled
                                            return (
                                                <Reorder.Item key={subLabel} value={subLabel} className={cn("cursor-grab active:cursor-grabbing", isDisabled && "cursor-not-allowed")}>
                                                    {isDisabled ? (
                                                        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] opacity-35 cursor-not-allowed grayscale select-none">
                                                            <SubIcon className="w-3 h-3 shrink-0" />
                                                            <span className="flex-1 truncate">{subItem.label}</span>
                                                            <Lock className="w-2.5 h-2.5" />
                                                        </div>
                                                    ) : (
                                                        <Link
                                                            href={subItem.href}
                                                            draggable={false}
                                                            className={cn(
                                                                'flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] transition-colors group/sub',
                                                                subActive ? 'text-black bg-black/5 font-semibold' : 'text-black/35 hover:text-black/60'
                                                            )}
                                                        >
                                                            <SubIcon className="w-3 h-3 shrink-0" />
                                                            <span className="flex-1 truncate">{subItem.label}</span>
                                                            <div className="flex items-center gap-1">
                                                                {(subItem as any).caps?.map((c: string) => (
                                                                    <CapBadge key={c} cap={c as 'P' | 'B'} />
                                                                ))}
                                                            </div>
                                                        </Link>
                                                    )}
                                                </Reorder.Item>
                                            )
                                        })}
                                    </Reorder.Group>
                                ) : (
                                    <div className="list-none m-0 p-0 space-y-0.5">
                                        {item.sub.map((subItem) => {
                                            const SubIcon = subItem.icon
                                            const subActive = pathname === subItem.href
                                            const isDisabled = (subItem as any).disabled
                                            return (
                                                <div key={subItem.label}>
                                                    {isDisabled ? (
                                                        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] opacity-35 cursor-not-allowed grayscale select-none">
                                                            <SubIcon className="w-3 h-3 shrink-0" />
                                                            <span className="flex-1 truncate">{subItem.label}</span>
                                                            <Lock className="w-2.5 h-2.5" />
                                                        </div>
                                                    ) : (
                                                        <Link
                                                            href={subItem.href}
                                                            draggable={false}
                                                            className={cn(
                                                                'flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] transition-colors group/sub',
                                                                subActive ? 'text-black bg-black/5 font-semibold' : 'text-black/35 hover:text-black/60'
                                                            )}
                                                        >
                                                            <SubIcon className="w-3 h-3 shrink-0" />
                                                            <span className="flex-1 truncate">{subItem.label}</span>
                                                            <div className="flex items-center gap-1">
                                                                {(subItem as any).caps?.map((c: string) => (
                                                                    <CapBadge key={c} cap={c as 'P' | 'B'} />
                                                                ))}
                                                            </div>
                                                        </Link>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Fallback for other potential sub-tabs that aren't 'Finances' */}
                        {'sub' in item && item.sub && expandedFolders[item.href] && label !== 'Finances' && label !== 'Studio' && (
                            <div className="ml-5 mt-0.5 space-y-0.5 border-l border-black/[0.07] pl-3">
                                {item.sub.map((subItem) => {
                                    const SubIcon = subItem.icon
                                    const subActive = pathname === subItem.href
                                    return (
                                        <Link
                                            key={subItem.href}
                                            href={subItem.href}
                                            draggable={false}
                                            className={cn(
                                                'flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] transition-colors',
                                                subActive ? 'text-black bg-black/5 font-semibold' : 'text-black/35 hover:text-black/60'
                                            )}
                                        >
                                            <SubIcon className="w-3 h-3 shrink-0" />
                                            <span className="flex-1 truncate">{subItem.label}</span>
                                            <div className="flex items-center gap-1">
                                                {(subItem as any).caps?.map((c: string) => (
                                                    <CapBadge key={c} cap={c as 'P' | 'B'} />
                                                ))}
                                            </div>
                                        </Link>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )
            }

            if (isReorderable) {
                return (
                    <Reorder.Item
                        key={item.label}
                        value={item.label}
                        className="relative cursor-grab active:cursor-grabbing"
                        layout="position"
                    >
                        {content}
                    </Reorder.Item>
                )
            }

            return <div key={item.label}>{content}</div>
        })

    const renderNav = (isMobile: boolean) => (
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
            <p className="text-[9px] tracking-[0.2em] text-black/25 uppercase font-semibold px-2 mb-3">Modules</p>
            {isMounted ? (
                !isMobile ? (
                    <Reorder.Group axis="y" values={orderedTabs} onReorder={handleReorder} className="space-y-0.5 list-none m-0 p-0">
                        {renderContent(orderedTabs, true)}
                    </Reorder.Group>
                ) : (
                    <div className="space-y-0.5">
                        {renderContent(orderedTabs, false)}
                    </div>
                )
            ) : (
                <div className="space-y-0.5">
                    {renderContent(navItems.map(i => i.label), false)}
                </div>
            )}
        </nav>
    )

    return (
        <>
            {/* ── Desktop sidebar (always visible ≥ md) ─────────────────── */}
            <aside className={cn(
                "hidden md:flex fixed left-0 top-0 h-full flex-col z-[200] bg-white border-r border-black/[0.07] shadow-[1px_0_0_0_rgba(0,0,0,0.04)] transition-[width] duration-300 overflow-visible",
                isCollapsed ? "w-[64px]" : "w-[220px]"
            )}>
                {/* Logo area */}
                <div className="px-4 pt-5 pb-4 border-b border-black/[0.06] flex items-center justify-between h-[72px] shrink-0">
                    <Link href="/system/control-centre">
                        {isCollapsed ? (
                            <span className="text-3xl font-serif italic font-medium tracking-tight leading-none select-none">ö</span>
                        ) : (
                            <span className="text-2xl font-serif italic font-medium tracking-tight">Schrö</span>
                        )}
                    </Link>
                    {!isCollapsed && (
                        <button
                            onClick={toggleCollapse}
                            className="w-6 h-6 rounded-md flex items-center justify-center text-black/20 hover:text-black/60 hover:bg-black/[0.04] transition-colors"
                            title="Collapse sidebar"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Nav */}
                {isCollapsed ? (
                    /* Collapsed: icon-only nav with tooltips */
                    <nav className="flex-1 flex flex-col items-center py-4 gap-0.5">
                        {orderedTabs.map(label => {
                            const item = navItems.find(i => i.label === label)
                            if (!item) return null
                            const Icon = item.icon
                            const isActive = !('disabled' in item && item.disabled) && pathname.startsWith(item.href)
                            const isExpanded = !!expandedFolders[item.label]

                            return (
                                <div key={item.label} className="w-full flex justify-center relative mb-1 z-10">
                                    {/* Main Tab */}
                                    <div className="relative group">
                                        <Link
                                            href={item.href}
                                            onClick={(e) => {
                                                if ('sub' in item && item.sub) {
                                                    if (isActive) {
                                                        e.preventDefault()
                                                        setExpandedFolders(prev => {
                                                            const next = { ...prev, [item.label]: !prev[item.label] }
                                                            localStorage.setItem('schro_sidebar_expanded', JSON.stringify(next))
                                                            return next
                                                        })
                                                    }
                                                }
                                            }}
                                            className={cn(
                                                'w-10 h-10 flex items-center justify-center rounded-xl transition-all',
                                                isActive ? 'bg-black/10 text-black shadow-sm' : 'text-black/35 hover:text-black/80 hover:bg-black/[0.04]'
                                            )}
                                        >
                                            <Icon className="w-4.5 h-4.5" />
                                        </Link>
                                        <div className="pointer-events-none absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-black text-white text-[11px] font-bold rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-[200] shadow-xl">
                                            {item.label}
                                        </div>
                                    </div>

                                    {/* Sub-items flyout */}
                                    {'sub' in item && item.sub && isExpanded && (
                                        <div className="absolute left-[calc(100%-8px)] top-1/2 -translate-y-1/2 flex flex-col gap-1 p-1.5 bg-white border border-black/[0.08] rounded-2xl shadow-xl z-[100] animate-in fade-in zoom-in-95 duration-200">
                                            {item.sub.map(subItem => {
                                                const SubIcon = subItem.icon || ((props: any) => <div className={cn("w-1.5 h-1.5 rounded-full bg-current", props.className)} />)
                                                const isSubActive = pathname === subItem.href
                                                return (
                                                    <div key={subItem.href} className="relative group/sub">
                                                        <Link
                                                            href={subItem.href}
                                                            className={cn(
                                                                'w-8 h-8 flex items-center justify-center rounded-xl transition-all',
                                                                isSubActive ? 'bg-black/5 text-black shadow-sm' : 'text-black/30 hover:text-black/70 hover:bg-black/[0.04]'
                                                            )}
                                                        >
                                                            <SubIcon className="w-4 h-4" />
                                                        </Link>
                                                        <div className="pointer-events-none absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-black text-white text-[11px] font-bold rounded-lg whitespace-nowrap opacity-0 group-hover/sub:opacity-100 transition-opacity z-[200] shadow-xl">
                                                            {subItem.label}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            )

                        })}
                    </nav>
                ) : (
                    renderNav(false)
                )}

                {/* Footer + Profile – hide in collapsed state */}
                {!isCollapsed && <SidebarFooter pathname={pathname} />}

                {/* Expand / Profile row */}
                {isCollapsed ? (
                    <div className="pb-4 flex flex-col items-center gap-1 shrink-0 px-2">
                        <Link href="/system/settings" className="relative group w-10 h-10 flex items-center justify-center rounded-xl text-black/35 hover:text-black/80 hover:bg-black/[0.04] transition-all">
                            <SlidersHorizontal className="w-4 h-4" />
                            <div className="pointer-events-none absolute left-full ml-2 px-2.5 py-1.5 bg-black text-white text-[11px] font-bold rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-[200] shadow-xl">
                                System Settings
                            </div>
                        </Link>

                        <button
                            onClick={() => {
                                setIsRefreshing(true)
                                setTimeout(() => window.location.reload(), 600)
                            }}
                            disabled={isRefreshing}
                            className="relative group w-10 h-10 flex items-center justify-center rounded-xl text-black/35 hover:text-black/80 hover:bg-black/[0.04] transition-all"
                        >
                            <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin text-orange-500")} />
                            <div className="pointer-events-none absolute left-full ml-2 px-2.5 py-1.5 bg-black text-white text-[11px] font-bold rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-[200] shadow-xl">
                                Sync Database
                            </div>
                        </button>

                        <div className="w-6 h-px bg-black/[0.06] my-2 rounded-full" />

                        <button
                            onClick={toggleCollapse}
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-black/25 hover:text-black/70 hover:bg-black/[0.04] transition-colors"
                            title="Expand sidebar"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <ProfileMenu />
                )}
            </aside>

            {/* ── Mobile top bar ─────────────────────────────────────────── */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-black/[0.07] flex items-center px-4 z-40">
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setMobileOpen(true)}
                        className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-black/[0.05] transition-colors"
                    >
                        <Menu className="w-5 h-5 text-black/60" />
                    </button>
                    <button
                        onClick={() => {
                            window.location.reload()
                        }}
                        className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-black/[0.05] transition-colors group"
                        title="Refresh App"
                    >
                        <RefreshCw className="w-5 h-5 text-black/60 group-active:animate-spin" />
                    </button>
                </div>

                <div className="flex-1" />

                <div className="flex items-center pr-2">
                    <Link href="/system/control-centre" className="flex items-center" onClick={() => setMobileOpen(false)}>
                        <div className="flex items-center">
                            <span className="text-xl font-serif italic font-medium tracking-tight">Schrö</span>
                        </div>
                    </Link>
                </div>
            </div>

            {/* ── Mobile drawer overlay ──────────────────────────────────── */}
            {mobileOpen && (
                <div className="md:hidden fixed inset-0 z-50 flex">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                        onClick={() => setMobileOpen(false)}
                    />
                    {/* Drawer panel */}
                    <aside
                        className="relative w-[260px] bg-white h-full flex flex-col shadow-2xl"
                        onTouchStart={onTouchStart}
                        onTouchMove={onTouchMove}
                        onTouchEnd={onTouchEnd}
                    >
                        <div className="px-5 pt-5 pb-4 border-b border-black/[0.06] flex items-center justify-between h-[72px]">
                            <Link href="/system/control-centre" onClick={() => setMobileOpen(false)}>
                                <span className="text-xl font-serif italic font-medium tracking-tight">Schrö</span>
                            </Link>
                            <button
                                onClick={() => setMobileOpen(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/[0.05] transition-colors"
                            >
                                <X className="w-4 h-4 text-black/40" />
                            </button>
                        </div>
                        {renderNav(true)}
                        <SidebarFooter pathname={pathname} />
                        <ProfileMenu />
                    </aside>
                </div>
            )}

            {/* ── Mobile top-bar spacer (pushes content below the bar) ───── */}
            <div className="md:hidden h-14" />
        </>
    )
}
