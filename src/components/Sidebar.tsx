'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
    BarChart3, Activity, ShoppingCart, Bell,
    SlidersHorizontal, Menu, X, RefreshCw,
    Shield, ChevronDown, Check, ChevronLeft, ChevronRight,
    TrendingUp, Calendar, CreditCard, PiggyBank,
    Moon, Sun, Laptop, Target, Briefcase, Heart, Gift, Rocket,
    LayoutDashboard, EyeOff, Receipt, Lock, ClipboardIcon, Key, Brain, Sparkles, Award,
    Video, PenLine, Users, Columns, Square
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMultitasking, Pane } from '@/features/system/contexts/MultitaskingContext'
import { Reorder } from 'framer-motion'
import { useFinanceProfile } from '@/features/finance/contexts/FinanceProfileContext'
import { useSettings } from '@/features/finance/hooks/useSettings'
import { useSystemSettings } from '@/features/system/contexts/SystemSettingsContext'

import { navItems, NavItem, COLOR_MAP, assistantItem } from '@/lib/navConfig'
import { useAuth } from '@/contexts/AuthContext'

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
    const [isSettingsHovered, setIsSettingsHovered] = useState(false)
    return (
        <div className="px-5 py-3 border-t border-black/[0.03] space-y-3">
            <Link
                href="/system/settings"
                onMouseEnter={() => setIsSettingsHovered(true)}
                onMouseLeave={() => setIsSettingsHovered(false)}
                className={cn(
                    "flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-[13px] font-medium outline-none select-none",
                    pathname === '/system/settings'
                        ? 'bg-black/10 text-black'
                        : isSettingsHovered
                            ? 'bg-black/[0.04] text-black/80'
                            : 'text-black/50 active:bg-black/[0.04] active:text-black/80'
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
    const [isRefreshHovered, setIsRefreshHovered] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)
    const { signOut, profile } = useAuth()

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
                <div className="absolute bottom-full left-4 mb-2 w-52 bg-white border border-black/[0.08] rounded-xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-2 duration-200 z-[50]">
                    <div className="p-3">
                        <p className="text-[12px] font-bold text-black">{settings.user_name || profile?.display_name || 'Schrö Admin'}</p>
                        <p className="text-[10px] text-black/40">{profile?.email || settings.user_email || 'admin@schro.app'}</p>
                    </div>
                    <div className="border-t border-black/[0.05] p-1.5">
                        <button
                            onClick={signOut}
                            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12px] text-red-500/80 hover:text-red-600 hover:bg-red-50 transition-colors text-left"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Sign out
                        </button>
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
                    onMouseEnter={() => setIsRefreshHovered(true)}
                    onMouseLeave={() => setIsRefreshHovered(false)}
                    className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0 outline-none select-none",
                        isRefreshHovered
                            ? 'bg-red-500/10 text-red-600'
                            : 'text-black/35 active:bg-red-500/10 active:text-red-600'
                    )}
                    title="Refresh App"
                    disabled={isRefreshing}
                >
                    <RefreshCw className={cn("w-4 h-4 transition-transform", isRefreshing && "animate-spin text-red-500")} />
                </button>
            </div>
        </div>
    )
}

import { useVault } from '@/features/vault/contexts/VaultContext'

export function Sidebar() {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const isShellFreePage = pathname === '/' || pathname === '/home' || pathname.startsWith('/login') || pathname.startsWith('/waitlist')
    if (isShellFreePage) return null
    const [mobileOpen, setMobileOpen] = useState(false)
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({})
    const [isRefreshing, setIsRefreshing] = useState(false)
    const { isPrivacyEnabled } = useFinanceProfile()
    const { isVaultPrivate, isVaultLocked } = useVault()
    const { isMultitasking, toggleMultitasking, focusedPane, setPaneUrl, setFocusedPane } = useMultitasking()

    // Helper to check if a sub-item is active
    const checkSubActive = (href: string) => {
        if (!href.includes('?')) return pathname === href
        const [basePath, query] = href.split('?')
        if (pathname !== basePath) return false
        const params = new URLSearchParams(query)
        // Check all params in the href
        for (const [key, value] of params.entries()) {
            if (searchParams.get(key) !== value) return false
        }
        return true
    }

    const [orderedTabs, setOrderedTabs] = useState(navItems.map(item => item.label))
    const [orderedSubTabs, setOrderedSubTabs] = useState<Record<string, string[]>>(() => {
        const init: Record<string, string[]> = {}
        navItems.forEach(i => { if (i.sub) init[i.label] = i.sub.map(s => s.label) })
        return init
    })
    const [isMounted, setIsMounted] = useState(false)
    const { settings, setSetting, loading: settingsLoading } = useSettings()
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [hoveredItem, setHoveredItem] = useState<string | null>(null)
    const [hoveredSubItem, setHoveredSubItem] = useState<string | null>(null)
    const [activeTabGap, setActiveTabGap] = useState<{ start: number; end: number } | null>(null)
    const [flyoutY, setFlyoutY] = useState<number>(0)
    const [flyoutOffset, setFlyoutOffset] = useState<number>(0)
    const [subFlyoutY, setSubFlyoutY] = useState<number>(0)
    const sidebarRef = useRef<HTMLElement>(null)
    const collapsedNavRef = useRef<HTMLElement>(null)
    const flyoutRef = useRef<HTMLDivElement>(null)
    const tabRefs = useRef<Record<string, HTMLAnchorElement | null>>({})
    const itemWrapperRefs = useRef<Record<string, HTMLDivElement | null>>({})

    // Clamp flyout to viewport
    useEffect(() => {
        if (hoveredItem && flyoutRef.current) {
            const rect = flyoutRef.current.getBoundingClientRect()
            const viewportHeight = window.innerHeight
            const margin = 12

            let offset = 0
            if (rect.top < margin) {
                offset = margin - rect.top
            } else if (rect.bottom > viewportHeight - margin) {
                offset = (viewportHeight - margin) - rect.bottom
            }

            if (offset !== 0) {
                setFlyoutOffset(prev => prev + offset)
            }
        } else if (!hoveredItem) {
            setFlyoutOffset(0)
        }
    }, [hoveredItem, flyoutY])

    // Update activeTabGap whenever pathname or collapsed state changes
    useEffect(() => {
        if (!isCollapsed || !collapsedNavRef.current || !sidebarRef.current) { setActiveTabGap(null); return }
        const sidebarRect = sidebarRef.current.getBoundingClientRect()
        const activeLabel = orderedTabs.find(label => {
            const item = navItems.find(i => i.label === label)
            return item && pathname.startsWith(item.href)
        })
        if (!activeLabel || !tabRefs.current[activeLabel]) { setActiveTabGap(null); return }
        const tabRect = tabRefs.current[activeLabel]!.getBoundingClientRect()
        setActiveTabGap({
            start: Math.max(0, tabRect.top - sidebarRect.top - 12), // 12px for top curve
            end: tabRect.bottom - sidebarRect.top + 12,             // 12px for bottom curve
        })
    }, [pathname, isCollapsed, orderedTabs])

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
        const isTablet = window.innerWidth <= 1024
        const savedCollapsed = localStorage.getItem('schro_sidebar_collapsed')
        
        // Auto-collapse on iPad-sized screens (<1024px) when app is opened
        const collapsed = isTablet ? true : savedCollapsed === 'true'
        
        setIsCollapsed(collapsed)
        document.documentElement.style.setProperty('--sidebar-w', collapsed ? '64px' : '220px')
        
        // Save the tablet auto-collapsed state if it wasn't already true
        if (isTablet && savedCollapsed !== 'true') {
            localStorage.setItem('schro_sidebar_collapsed', 'true')
        }

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

        // Load sub-tabs order
        const savedSubOrder = localStorage.getItem('schro_sidebar_sub_order')

        if (savedSubOrder) {
            try {
                const parsed = JSON.parse(savedSubOrder) as Record<string, string[]>
                setOrderedSubTabs(prev => {
                    const next = { ...prev }
                    navItems.forEach(item => {
                        if (item.sub) {
                            const defaultLabels = item.sub.map(s => s.label)
                            const parsedLabels = parsed[item.label] || []
                            const validParsed = parsedLabels.filter(l => defaultLabels.includes(l))
                            const missing = defaultLabels.filter(l => !validParsed.includes(l))
                            next[item.label] = [...validParsed, ...missing]
                        }
                    })
                    return next
                })
            } catch (e) { }
        } else {
            // Migrate legacy finance order
            const legacyFinanceOrder = localStorage.getItem('schro_finance_subtabs_order')
            if (legacyFinanceOrder) {
                try {
                    const parsed = JSON.parse(legacyFinanceOrder)
                    const financeItem = navItems.find(i => i.label === 'Finances')
                    if (financeItem && financeItem.sub) {
                        const defaultLabels = financeItem.sub.map(s => s.label)
                        const validParsed = parsed.filter((l: string) => defaultLabels.includes(l))
                        const missing = defaultLabels.filter(l => !validParsed.includes(l))
                        setOrderedSubTabs(prev => ({ ...prev, Finances: [...validParsed, ...missing] }))
                    }
                } catch(e) {}
            }
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

        const dbSubOrder = settings['schro_sidebar_sub_order']

        if (dbSubOrder) {
            try {
                const parsed = JSON.parse(dbSubOrder) as Record<string, string[]>
                const finalSubOrder: Record<string, string[]> = {}
                navItems.forEach(item => {
                    if (item.sub) {
                        const defaultLabels = item.sub.map(s => s.label)
                        const parsedLabels = parsed[item.label] || []
                        const validParsed = parsedLabels.filter(l => defaultLabels.includes(l))
                        const missing = defaultLabels.filter(l => !validParsed.includes(l))
                        finalSubOrder[item.label] = [...validParsed, ...missing]
                    }
                })

                if (JSON.stringify(finalSubOrder) !== localStorage.getItem('schro_sidebar_sub_order')) {
                    setOrderedSubTabs(finalSubOrder)
                    localStorage.setItem('schro_sidebar_sub_order', JSON.stringify(finalSubOrder))
                }
            } catch (e) { }
        }
    }, [settingsLoading, settings])

    const handleReorder = (newOrder: string[]) => {
        setOrderedTabs(newOrder)
        localStorage.setItem('schro_sidebar_order', JSON.stringify(newOrder))
        setSetting('schro_sidebar_order', JSON.stringify(newOrder))
    }

    const handleSubReorder = (moduleLabel: string, newOrder: string[]) => {
        setOrderedSubTabs(prev => {
            const next = { ...prev, [moduleLabel]: newOrder }
            localStorage.setItem('schro_sidebar_sub_order', JSON.stringify(next))
            setSetting('schro_sidebar_sub_order', JSON.stringify(next))
            return next
        })
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

    const handleNavClick = (href: string, e: React.MouseEvent) => {
        if (isMultitasking) {
            e.preventDefault()
            setPaneUrl(focusedPane, href)
        }
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
                            onClick={(e) => handleNavClick(item.href, e)}
                            draggable={false}
                            className={cn(
                                'flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all duration-150 relative group',
                                isActive ? 'bg-black/10 text-black' : 'text-black/50 hover:text-black/80 hover:bg-black/[0.04]'
                            )}
                        >
                            <Icon className={cn('w-4 h-4', isActive ? (COLOR_MAP[item.color || 'black'] || 'text-black') : 'text-black/35')} />
                            <span className="text-[13px] font-medium pointer-events-none">{item.label}</span>

                            {item.label === 'Vault' && isVaultPrivate && (
                                <EyeOff className="w-3.5 h-3.5 text-blue-500 ml-1.5 animate-pulse" />
                            )}

                            {item.label === 'Vault' && isVaultLocked && (
                                <Lock className="w-3.5 h-3.5 text-orange-500 ml-1.5" />
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

                        {'sub' in item && item.sub && expandedFolders[item.href] && (() => {
                            const subItemsArr = orderedSubTabs[label] || item.sub.map(s => s.label)
                            return (
                                <div className="ml-5 mt-0.5 space-y-0.5 border-l border-black/[0.07] pl-3">
                                    {isReorderable ? (
                                        <Reorder.Group
                                            axis="y"
                                            values={subItemsArr}
                                            onReorder={(newOrder) => handleSubReorder(label, newOrder)}
                                            className="list-none m-0 p-0 space-y-0.5"
                                        >
                                            {subItemsArr.map((subLabel) => {
                                                const subItem = item.sub?.find(s => s.label === subLabel)
                                                if (!subItem) return null
                                                const SubIcon = subItem.icon
                                                const subActive = checkSubActive(subItem.href)
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
                                                                onClick={(e) => handleNavClick(subItem.href, e)}
                                                                draggable={false}
                                                                className={cn(
                                                                    'flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] transition-colors group/sub',
                                                                    subActive ? 'text-black bg-black/5 font-semibold' : 'text-black/35 hover:text-black/60'
                                                                )}
                                                            >
                                                                <SubIcon className={cn("w-3 h-3 shrink-0", subActive ? (COLOR_MAP[item.color || 'black'] || 'text-black') : "text-current")} />
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
                                            {subItemsArr.map((subLabel) => {
                                                const subItem = item.sub?.find(s => s.label === subLabel)
                                                if (!subItem) return null
                                                const SubIcon = subItem.icon
                                                const subActive = checkSubActive(subItem.href)
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
                                                                onClick={(e) => handleNavClick(subItem.href, e)}
                                                                draggable={false}
                                                                className={cn(
                                                                    'flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] transition-colors group/sub',
                                                                    subActive ? 'text-black bg-black/5 font-semibold' : 'text-black/35 hover:text-black/60'
                                                                )}
                                                            >
                                                                <SubIcon className={cn("w-3 h-3 shrink-0", subActive ? (COLOR_MAP[item.color || 'black'] || 'text-black') : "text-current")} />
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
                            )
                        })()}
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

    if (isMultitasking && isMounted) {
        return null
    }

    return (
        <>
            {/* ── Desktop sidebar (always visible ≥ md) ─────────────────── */}
            <aside
                ref={sidebarRef as React.RefObject<HTMLElement>}
                className={cn(
                    "hidden md:flex fixed left-0 top-0 h-full flex-col z-[40] bg-white transition-[width] duration-300",
                    isCollapsed ? "w-[64px]" : "w-[220px] overflow-visible"
                )}
                style={isCollapsed ? { overflowX: 'clip', overflowY: 'visible' } as React.CSSProperties : undefined}
            >
                {/* Dynamic separator — transparent gap curves around the active tab */}
                <div
                    className="absolute right-0 top-0 w-px h-full pointer-events-none z-[5]"
                    style={{
                        background: isCollapsed && activeTabGap
                            ? `linear-gradient(to bottom, rgba(0,0,0,0.07) ${activeTabGap.start}px, transparent ${activeTabGap.start}px, transparent ${activeTabGap.end}px, rgba(0,0,0,0.07) ${activeTabGap.end}px)`
                            : 'rgba(0,0,0,0.07)',
                    }}
                />
                {/* Logo area */}
                <div className={cn(
                    "border-b border-black/[0.06] flex items-center h-[96px] shrink-0",
                    isCollapsed ? "justify-center" : "px-4 justify-between"
                )}>
                    <Link href="/system/control-centre" className={cn(
                        "flex items-center justify-center relative -top-[1px]",
                        isCollapsed && "left-[2px]"
                    )}>
                        {isCollapsed ? (
                            <img src="/schro-logo-svg.svg" alt="Schro" className="w-7 h-7 select-none" />
                        ) : (
                            <span className="text-2xl font-serif italic font-medium tracking-tight leading-none">Schrö</span>
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
                                <div
                                    key={item.label}
                                    ref={el => { itemWrapperRefs.current[item.label] = el }}
                                    className="w-full flex justify-end relative mb-1 z-10"
                                    onMouseEnter={() => {
                                        setHoveredItem(item.label)
                                        const el = itemWrapperRefs.current[item.label]
                                        if (el) {
                                            const rect = el.getBoundingClientRect()
                                            setFlyoutY(rect.top + rect.height / 2)
                                        }
                                    }}
                                    onMouseLeave={() => setHoveredItem(null)}
                                >
                                    {/* Main Tab */}
                                    <div className="relative group">
                                        {/* Folder-tab box — absolutely positioned, independent from icon */}
                                        {isActive && (
                                            <div className="absolute top-0 right-0 w-[56px] h-11 bg-[#fafafa] rounded-l-xl rounded-r-none border border-black/[0.1] border-r-transparent z-0 pointer-events-none before:content-[''] before:absolute before:-top-3 before:right-0 before:w-3 before:h-3 before:rounded-br-xl before:shadow-[3px_3px_0_3px_#fafafa] before:border-b before:border-black/[0.07] before:pointer-events-none after:content-[''] after:absolute after:-bottom-3 after:right-0 after:w-3 after:h-3 after:rounded-tr-xl after:shadow-[3px_-3px_0_3px_#fafafa] after:border-t after:border-black/[0.07] after:pointer-events-none" />
                                        )}
                                        <Link
                                            ref={el => { tabRefs.current[item.label] = el }}
                                            href={item.href}
                                            onClick={(e) => handleNavClick(item.href, e)}
                                            className={cn(
                                                'w-11 h-11 mr-2 flex items-center justify-center transition-colors duration-150 transform-gpu cursor-pointer relative z-20 rounded-xl',
                                                isActive
                                                    ? 'text-black'
                                                    : hoveredItem === item.label
                                                        ? 'text-black bg-black/[0.05]'
                                                        : 'text-black/35'
                                            )}
                                        >
                                            <div className="relative">
                                                <Icon className={cn(
                                                    "w-4.5 h-4.5",
                                                    isActive && (COLOR_MAP[item.color || 'black'] || 'text-black')
                                                )} />
                                                {item.label === 'Vault' && isVaultLocked && (
                                                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white" />
                                                )}
                                            </div>
                                        </Link>
                                    </div>

                                    {/* Tooltip (fixed position, no sub) */}
                                    {isMounted && hoveredItem === item.label && !('sub' in item && item.sub) && createPortal(
                                        <div
                                            ref={flyoutRef}
                                            className="pointer-events-none fixed px-2.5 py-1.5 bg-black text-white text-[11px] font-bold rounded-lg whitespace-nowrap z-[300] shadow-xl max-h-[calc(100vh-24px)] overflow-y-auto custom-scrollbar"
                                            style={{ left: 72, top: flyoutY + flyoutOffset, transform: 'translateY(-50%)' }}
                                        >
                                            {item.label}
                                        </div>,
                                        document.body
                                    )}

                                    {/* Sub-items flyout (fixed position) */}
                                    {isMounted && 'sub' in item && item.sub && hoveredItem === item.label && createPortal(
                                        <div
                                            ref={flyoutRef}
                                            className="fixed flex flex-col gap-1 p-1.5 bg-white border border-black/[0.08] rounded-2xl shadow-xl z-[300] animate-in fade-in zoom-in-95 duration-200 max-h-[calc(100vh-24px)] overflow-y-auto custom-scrollbar"
                                            style={{ left: 56, top: flyoutY + flyoutOffset, transform: 'translateY(-50%)' }}
                                        >
                                            {(() => {
                                                const subItemsArr = orderedSubTabs[item.label] || item.sub.map((s: any) => s.label)
                                                return subItemsArr.map(subLabel => {
                                                    const subItem = item.sub?.find((s: any) => s.label === subLabel)
                                                    if (!subItem) return null
                                                    const SubIcon = subItem.icon || ((props: any) => <div className={cn("w-1.5 h-1.5 rounded-full bg-current", props.className)} />)
                                                    const isSubActive = checkSubActive(subItem.href)
                                                    return (
                                                        <div key={subItem.href} className="relative group/sub">
                                                            <Link
                                                                href={subItem.href}
                                                                onClick={(e) => handleNavClick(subItem.href, e)}
                                                                onMouseEnter={(e) => {
                                                                    setHoveredSubItem(subItem.label)
                                                                    const rect = e.currentTarget.getBoundingClientRect()
                                                                    setSubFlyoutY(rect.top + rect.height / 2)
                                                                }}
                                                                onMouseLeave={() => setHoveredSubItem(null)}
                                                                className={cn(
                                                                    'w-8 h-8 flex items-center justify-center rounded-xl transition-all',
                                                                    isSubActive
                                                                        ? 'bg-black/5 text-black shadow-sm'
                                                                        : hoveredSubItem === subItem.label
                                                                            ? 'text-black/70 bg-black/[0.04]'
                                                                            : 'text-black/30'
                                                                )}
                                                            >
                                                                <SubIcon className={cn("w-4 h-4", isSubActive && (COLOR_MAP[item.color || 'black'] || 'text-black'))} />
                                                            </Link>
                                                            {isMounted && hoveredSubItem === subItem.label && createPortal(
                                                                <div
                                                                    className="pointer-events-none fixed px-2.5 py-1.5 bg-black text-white text-[11px] font-bold rounded-lg whitespace-nowrap z-[310] shadow-xl"
                                                                    style={{ left: 56 + 44 + 12, top: subFlyoutY, transform: 'translateY(-50%)' }}
                                                                >
                                                                    {subItem.label}
                                                                </div>,
                                                                document.body
                                                            )}
                                                        </div>
                                                    )
                                                })
                                            })()}
                                        </div>,
                                        document.body
                                    )}
                                </div>
                            )

                        })}
                    </nav>
                ) : (
                    renderNav(false)
                )}

                {/* Footer + Profile – hide in collapsed state */}
                {!isCollapsed && (
                    <div className="px-5 py-3 border-t border-black/[0.03] space-y-1">
                        <Link
                            href={assistantItem.href}
                            onClick={(e) => handleNavClick(assistantItem.href, e)}
                            className={cn(
                                "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-[13px] font-medium outline-none select-none",
                                pathname.startsWith(assistantItem.href)
                                    ? 'bg-black/10 text-black'
                                    : 'text-black/50 hover:bg-black/[0.04] hover:text-black/80'
                            )}
                        >
                            <assistantItem.icon className={cn("w-4 h-4", pathname.startsWith(assistantItem.href) ? (COLOR_MAP[assistantItem.color || 'black'] || 'text-black') : 'text-black/35')} />
                            {assistantItem.label}
                            {pathname.startsWith(assistantItem.href) && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-black animate-pulse" />}
                        </Link>
                        <button
                            onClick={() => toggleMultitasking(pathname)}
                            className={cn(
                                "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-[13px] font-medium outline-none select-none",
                                isMultitasking
                                    ? 'bg-blue-50 text-blue-600'
                                    : 'text-black/50 hover:bg-black/[0.04] hover:text-black/80'
                            )}
                        >
                            <Columns className="w-4 h-4" />
                            Multitasking
                            {isMultitasking && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
                        </button>
                        <Link
                            href="/schrolink"
                            onClick={(e) => handleNavClick('/schrolink', e)}
                            className={cn(
                                "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-[13px] font-medium outline-none select-none",
                                pathname.startsWith('/schrolink')
                                    ? 'bg-indigo-50 text-indigo-600'
                                    : 'text-black/50 hover:bg-black/[0.04] hover:text-black/80'
                            )}
                        >
                            <div
                                className={cn('w-4 h-4 shrink-0', pathname.startsWith('/schrolink') ? 'bg-indigo-500' : 'bg-black/35')}
                                style={{
                                    WebkitMaskImage: 'url(/schro-logo-svg.svg)',
                                    maskImage: 'url(/schro-logo-svg.svg)',
                                    WebkitMaskRepeat: 'no-repeat',
                                    maskRepeat: 'no-repeat',
                                    WebkitMaskSize: 'contain',
                                    maskSize: 'contain',
                                    WebkitMaskPosition: 'center',
                                    maskPosition: 'center',
                                }}
                            />
                            Schrö
                            {pathname.startsWith('/schrolink') && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />}
                        </Link>
                        <SidebarFooter pathname={pathname} />
                    </div>
                )}

                {/* Pane Focus Selector for Collapsed state */}
                {isCollapsed && isMultitasking && (
                    <div className="flex flex-col items-center gap-1 py-2 border-t border-black/[0.06]">
                        <button
                            onClick={() => {
                                const next: Pane = focusedPane === 'left' ? 'right' : 'left'
                                setFocusedPane(next)
                            }}
                            className={cn(
                                "w-10 h-10 flex items-center justify-center rounded-xl transition-all",
                                "bg-blue-50 text-blue-600 border border-blue-100 shadow-sm"
                            )}
                            title={`Focusing ${focusedPane} pane`}
                        >
                            {focusedPane === 'left' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                    </div>
                )}

                {/* Expand / Profile row */}
                {isCollapsed ? (
                    <div className="pb-4 flex flex-col items-center gap-1 shrink-0 px-2">
                        <Link
                            href={assistantItem.href}
                            onClick={(e) => handleNavClick(assistantItem.href, e)}
                            onMouseEnter={(e) => {
                                setHoveredItem('assistant_manual')
                                const rect = e.currentTarget.getBoundingClientRect()
                                setFlyoutY(rect.top + rect.height / 2)
                            }}
                            onMouseLeave={() => setHoveredItem(null)}
                            className={cn(
                                "relative w-10 h-10 flex items-center justify-center rounded-xl transition-all outline-none select-none mb-1",
                                pathname.startsWith(assistantItem.href)
                                    ? 'bg-black/10 text-black shadow-sm'
                                    : hoveredItem === 'assistant_manual'
                                        ? 'bg-black/[0.04] text-black/80'
                                        : 'text-black/35 active:bg-black/[0.04] active:text-black/80'
                            )}
                        >
                            <assistantItem.icon className={cn("w-4.5 h-4.5", pathname.startsWith(assistantItem.href) && (COLOR_MAP[assistantItem.color || 'black'] || 'text-black'))} />
                            {isMounted && hoveredItem === 'assistant_manual' && createPortal(
                                <div
                                    ref={flyoutRef}
                                    className="pointer-events-none fixed px-2.5 py-1.5 bg-black text-white text-[11px] font-bold rounded-lg whitespace-nowrap z-[300] shadow-xl"
                                    style={{ left: 56 + 12, top: flyoutY + flyoutOffset, transform: 'translateY(-50%)' }}
                                >
                                    {assistantItem.label}
                                </div>,
                                document.body
                            )}
                        </Link>

                        <button
                            onClick={() => toggleMultitasking(pathname)}
                            onMouseEnter={(e) => {
                                setHoveredItem('multitasking')
                                const rect = e.currentTarget.getBoundingClientRect()
                                setFlyoutY(rect.top + rect.height / 2)
                            }}
                            onMouseLeave={() => setHoveredItem(null)}
                            className={cn(
                                "relative w-10 h-10 flex items-center justify-center rounded-xl transition-all outline-none select-none",
                                isMultitasking
                                    ? 'bg-blue-50 text-blue-600'
                                    : hoveredItem === 'multitasking'
                                        ? 'bg-black/[0.04] text-black/80'
                                        : 'text-black/35 active:bg-black/[0.04] active:text-black/80'
                            )}
                        >
                            <Columns className="w-4 h-4" />
                            {isMounted && hoveredItem === 'multitasking' && createPortal(
                                <div
                                    ref={flyoutRef}
                                    className="pointer-events-none fixed px-2.5 py-1.5 bg-black text-white text-[11px] font-bold rounded-lg whitespace-nowrap z-[300] shadow-xl"
                                    style={{ left: 56 + 12, top: flyoutY + flyoutOffset, transform: 'translateY(-50%)' }}
                                >
                                    {isMultitasking ? 'Exit Multitasking' : 'Enter Multitasking'}
                                </div>,
                                document.body
                            )}
                        </button>

                        <Link
                            href="/schrolink"
                            onClick={(e) => handleNavClick('/schrolink', e)}
                            onMouseEnter={(e) => {
                                setHoveredItem('schrolink')
                                const rect = e.currentTarget.getBoundingClientRect()
                                setFlyoutY(rect.top + rect.height / 2)
                            }}
                            onMouseLeave={() => setHoveredItem(null)}
                            className={cn(
                                "relative w-10 h-10 flex items-center justify-center rounded-xl transition-all outline-none select-none",
                                pathname.startsWith('/schrolink')
                                    ? 'bg-indigo-50 text-indigo-600'
                                    : hoveredItem === 'schrolink'
                                        ? 'bg-black/[0.04] text-black/80'
                                        : 'text-black/35 active:bg-black/[0.04] active:text-black/80'
                            )}
                        >
                            <div
                                className={cn('w-4 h-4', pathname.startsWith('/schrolink') ? 'bg-indigo-500' : 'bg-black/35')}
                                style={{
                                    WebkitMaskImage: 'url(/schro-logo-svg.svg)',
                                    maskImage: 'url(/schro-logo-svg.svg)',
                                    WebkitMaskRepeat: 'no-repeat',
                                    maskRepeat: 'no-repeat',
                                    WebkitMaskSize: 'contain',
                                    maskSize: 'contain',
                                    WebkitMaskPosition: 'center',
                                    maskPosition: 'center',
                                }}
                            />
                            {isMounted && hoveredItem === 'schrolink' && createPortal(
                                <div
                                    ref={flyoutRef}
                                    className="pointer-events-none fixed px-2.5 py-1.5 bg-black text-white text-[11px] font-bold rounded-lg whitespace-nowrap z-[300] shadow-xl"
                                    style={{ left: 56 + 12, top: flyoutY + flyoutOffset, transform: 'translateY(-50%)' }}
                                >
                                    Schrö
                                </div>,
                                document.body
                            )}
                        </Link>

                        <Link
                            href="/system/settings"
                            onMouseEnter={(e) => {
                                setHoveredItem('settings')
                                const rect = e.currentTarget.getBoundingClientRect()
                                setFlyoutY(rect.top + rect.height / 2)
                            }}
                            onMouseLeave={() => setHoveredItem(null)}
                            className={cn(
                                "relative w-10 h-10 flex items-center justify-center rounded-xl transition-all outline-none select-none",
                                pathname === '/system/settings'
                                    ? 'bg-black/10 text-black'
                                    : hoveredItem === 'settings'
                                        ? 'bg-black/[0.04] text-black/80'
                                        : 'text-black/35 active:bg-black/[0.04] active:text-black/80'
                            )}
                        >
                            <SlidersHorizontal className="w-4 h-4" />
                            {isMounted && hoveredItem === 'settings' && createPortal(
                                <div
                                    ref={flyoutRef}
                                    className="pointer-events-none fixed px-2.5 py-1.5 bg-black text-white text-[11px] font-bold rounded-lg whitespace-nowrap z-[300] shadow-xl"
                                    style={{ left: 56 + 12, top: flyoutY + flyoutOffset, transform: 'translateY(-50%)' }}
                                >
                                    System Settings
                                </div>,
                                document.body
                            )}
                        </Link>

                        <button
                            onClick={() => {
                                setIsRefreshing(true)
                                setTimeout(() => window.location.reload(), 600)
                            }}
                            onMouseEnter={(e) => {
                                setHoveredItem('refresh')
                                const rect = e.currentTarget.getBoundingClientRect()
                                setFlyoutY(rect.top + rect.height / 2)
                            }}
                            onMouseLeave={() => setHoveredItem(null)}
                            disabled={isRefreshing}
                            className={cn(
                                "relative w-10 h-10 flex items-center justify-center rounded-xl transition-all outline-none select-none",
                                hoveredItem === 'refresh'
                                    ? 'bg-red-500/10 text-red-600'
                                    : 'text-black/35 active:bg-red-500/10 active:text-red-600'
                            )}
                        >
                            <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin text-red-500")} />
                            {isMounted && hoveredItem === 'refresh' && createPortal(
                                <div
                                    ref={flyoutRef}
                                    className="pointer-events-none fixed px-2.5 py-1.5 bg-black text-white text-[11px] font-bold rounded-lg whitespace-nowrap z-[300] shadow-xl"
                                    style={{ left: 56 + 12, top: flyoutY + flyoutOffset, transform: 'translateY(-50%)' }}
                                >
                                    Sync Database
                                </div>,
                                document.body
                            )}
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
