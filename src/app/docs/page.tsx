'use client'

import { useState, useEffect } from 'react'
import { 
    BookOpen, Sparkles, Activity, Shield, Wallet, 
    Palette, Compass, Heart, Menu, X, ArrowRight,
    Zap, Rocket, Target, Brain, ShieldAlert, Clock,
    ChevronRight, CheckCircle2, Info, Lock, Eye,
    Mic, Database, Network, TrendingUp, Gauge, Wand2,
    SlidersHorizontal, Dumbbell, Key
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Outfit } from 'next/font/google'
import Link from 'next/link'

const outfit = Outfit({ subsets: ['latin'] })

const DOCS_STRUCTURE = [
    {
        id: 'getting-started',
        title: 'Foundations',
        icon: BookOpen,
        items: [
            { id: 'introduction', title: 'Philosophy of Schrö' },
            { id: 'interface', title: 'The Interface Engine' },
            { id: 'multitasking', title: 'Multitasking & Split View' },
            { id: 'gqa', title: 'Global Quick Actions' },
        ]
    },
    {
        id: 'intelligence',
        title: 'Intelligence',
        icon: Sparkles,
        items: [
            { id: 'personas', title: 'Neural Personas' },
            { id: 'identity-dna', title: 'Identity DNA' },
            { id: 'voice-system', title: 'Neural HD Voice' },
        ]
    },
    {
        id: 'operations',
        title: 'Operations',
        icon: Activity,
        items: [
            { id: 'day-planner', title: 'Day Planner Algorithm' },
            { id: 'focus-map', title: 'Focus Map (Matrix)' },
            { id: 'deployment', title: 'Task Deployment' },
        ]
    },
    {
        id: 'financials',
        title: 'Financials',
        icon: Wallet,
        items: [
            { id: 'advisor', title: '3-Phase Payday Advisor' },
            { id: 'projections', title: 'Cashflow Projections' },
            { id: 'pockets', title: 'Logical Pockets' },
        ]
    },
    {
        id: 'performance',
        title: 'Performance',
        icon: Gauge,
        items: [
            { id: 'velocity', title: 'Engine Velocity Scoring' },
            { id: 'metrics', title: 'Life Metrics Radar' },
        ]
    },
    {
        id: 'security',
        title: 'Security',
        icon: Shield,
        items: [
            { id: 'vault', title: 'The Vault & Secrets' },
            { id: 'privacy', title: 'Privacy Mode' },
        ]
    }
]

export default function DocsPage() {
    const [activeSection, setActiveSection] = useState('introduction')
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [isScrolled, setIsScrolled] = useState(false)

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 20)
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen)

    return (
        <div className={cn(
            "min-h-screen bg-[#fafafa] flex flex-col md:flex-row",
            outfit.className
        )}>
            {/* Mobile Header */}
            <header className={cn(
                "sticky top-0 z-[60] w-full px-6 py-4 flex items-center justify-between transition-all duration-300 md:hidden",
                isScrolled ? "bg-white/80 backdrop-blur-xl border-b border-black/[0.05] shadow-sm" : "bg-transparent"
            )}>
                <div className="flex items-center gap-3">
                    <Link href="/home" className="p-2 border border-black/5 bg-white rounded-xl shadow-sm">
                         <div className="w-5 h-5 bg-black rounded-[6px]" />
                    </Link>
                    <span className="text-sm font-black uppercase tracking-widest">Docs</span>
                </div>
                <button 
                    onClick={toggleSidebar}
                    className="p-3 bg-black text-white rounded-2xl shadow-xl active:scale-90 transition-all"
                >
                    {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            </header>

            {/* Sidebar Navigation */}
            <aside className={cn(
                "fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-black/[0.05] shadow-2xl transition-transform duration-500 ease-in-out md:translate-x-0 md:sticky md:top-0 md:h-screen md:shadow-none",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="h-full flex flex-col p-8 overflow-y-auto mt-16 md:mt-0">
                    <div className="mb-10 hidden md:flex items-center gap-4">
                        <Link href="/home" className="w-10 h-10 bg-black rounded-2xl flex items-center justify-center hover:scale-105 transition-transform">
                             <div className="w-4 h-4 bg-white rounded-[4px]" />
                        </Link>
                        <div>
                            <h2 className="text-sm font-black tracking-tighter uppercase leading-none">Schrö Documentation</h2>
                            <p className="text-[10px] text-black/40 font-bold uppercase tracking-widest mt-1">v4.0 // Neural Protocol</p>
                        </div>
                    </div>

                    <nav className="space-y-8">
                        {DOCS_STRUCTURE.map((group) => (
                            <div key={group.id} className="space-y-3">
                                <div className="flex items-center gap-2 px-1">
                                    <group.icon className="w-3.5 h-3.5 text-black/30" />
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-black/30">{group.title}</h3>
                                </div>
                                <div className="space-y-1">
                                    {group.items.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => {
                                                setActiveSection(item.id)
                                                setIsSidebarOpen(false)
                                            }}
                                            className={cn(
                                                "w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between group",
                                                activeSection === item.id 
                                                    ? "bg-black text-white shadow-lg translate-x-1" 
                                                    : "text-black/50 hover:bg-black/5 hover:text-black"
                                            )}
                                        >
                                            {item.title}
                                            <ChevronRight className={cn(
                                                "w-3.5 h-3.5 transition-transform duration-300",
                                                activeSection === item.id ? "opacity-100" : "opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0"
                                            )} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </nav>

                    <div className="mt-auto pt-10">
                        <div className="p-4 bg-black/[0.03] border border-black/[0.05] rounded-2xl">
                            <p className="text-[9px] font-black uppercase tracking-widest text-black/40 mb-2">Internal Status</p>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[11px] font-bold text-black/60">Core Engine Online</span>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 min-w-0 bg-white">
                <div className="max-w-4xl mx-auto px-6 py-12 md:px-16 md:py-24">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeSection}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="pros-container"
                        >
                            <ContentRenderer sectionId={activeSection} />
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
        </div>
    )
}

function ContentRenderer({ sectionId }: { sectionId: string }) {
    switch (sectionId) {
        case 'introduction':
            return (
                <div className="space-y-10">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-black/[0.03] border border-black/[0.08] rounded-full">
                            <Sparkles className="w-3.5 h-3.5 text-black/40" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">Introduction // Philosophy</span>
                        </div>
                        <h1 className="text-5xl md:text-6xl font-black text-black tracking-tighter italic">Philosophy of Schrö.</h1>
                        <p className="text-xl text-black/50 leading-relaxed font-medium">
                            Schrö is not a set of tools; it is a singular intelligence layer. 
                            Built for those who manage high-complexity lives, it treats your time, 
                            capital, and wellbeing as a unified operating system.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-10">
                        <div className="p-8 bg-black/[0.02] border border-black/[0.05] rounded-[32px] space-y-4 hover:shadow-xl transition-all duration-300">
                            <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center shadow-lg">
                                <Brain className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-black">Unified Context</h3>
                            <p className="text-sm text-black/50 leading-relaxed font-medium">
                                Traditionally, your tasks and finances are miles apart. In Schrö, your budget integrity directly powers your productivity analytics.
                            </p>
                        </div>
                        <div className="p-8 bg-black/[0.02] border border-black/[0.05] rounded-[32px] space-y-4 hover:shadow-xl transition-all duration-300">
                            <div className="w-12 h-12 bg-emerald-500 text-black rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                <Activity className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-black">Velocity First</h3>
                            <p className="text-sm text-black/50 leading-relaxed font-medium">
                                Management is useless without speed. Every feature in Schrö is designed to minimize friction between intention and execution.
                            </p>
                        </div>
                    </div>

                    <div className="p-10 bg-black text-white rounded-[40px] shadow-2xl space-y-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform duration-700">
                             <ShieldAlert className="w-40 h-40" />
                        </div>
                        <div className="relative z-10 space-y-6">
                            <h2 className="text-3xl font-black italic tracking-tight">The Neural Promise</h2>
                            <p className="text-lg text-white/60 leading-relaxed font-medium max-w-lg">
                                Your data is your property. Schrö operates on a strictly audited Supabase architecture with hardware-level PIN locking for your most sensitive secrets.
                            </p>
                            <Link href="/login" className="inline-flex items-center gap-3 px-8 py-4 bg-white text-black rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all">
                                Initialize System <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </div>
            )
        
        case 'interface':
            return (
                <div className="space-y-12">
                     <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-black/[0.03] border border-black/[0.08] rounded-full">
                            <SlidersHorizontal className="w-3.5 h-3.5 text-black/40" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">Foundations // Interface</span>
                        </div>
                        <h1 className="text-5xl font-black text-black tracking-tighter italic">Interface Engine.</h1>
                        <p className="text-xl text-black/50 leading-relaxed font-medium">
                            The Schrö interface is designed for spatial management. It moves beyond traditional windows into a fluid, responsive deck.
                        </p>
                    </div>

                    <div className="space-y-8">
                        <section className="space-y-4">
                            <h3 className="text-2xl font-black">The Sidebar</h3>
                            <p className="font-medium text-black/60 leading-relaxed">
                                Your primary navigation hub. It is reorderable and presence-aware. Modules can be expanded for full-screen focus or pinned as active pillars.
                            </p>
                        </section>
                        <section className="space-y-4 border-t border-black/[0.05] pt-8">
                            <h3 className="text-2xl font-black">Command Hubs</h3>
                            <p className="font-medium text-black/60 leading-relaxed">
                                Every module features a consistent "Module Header" with rapid-access tabs and local settings. The standard layout keeps navigation at the top-right and actions at the top-left for muscle memory.
                            </p>
                        </section>
                    </div>
                </div>
            )
        
        case 'multitasking':
            return (
                <div className="space-y-12">
                     <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-black/[0.03] border border-black/[0.08] rounded-full">
                            <Compass className="w-3.5 h-3.5 text-black/40" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">Foundations // Multitasking</span>
                        </div>
                        <h1 className="text-5xl font-black text-black tracking-tighter italic">Split View.</h1>
                        <p className="text-xl text-black/50 leading-relaxed font-medium">
                            Schrö native **Split View** allows for true dual-module operation. Intelligence can sit alongside Operations, or Financials next to the Studio.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-8 bg-black/[0.02] border border-black/[0.05] rounded-[32px] space-y-4">
                            <h3 className="text-xl font-black">Native Resizer</h3>
                            <p className="text-sm text-black/50 leading-relaxed font-medium">
                                Grab the central divider and drag to redistribute screen real estate. The system automatically switches panes to "Minimal UI" mode when they lack horizontal space.
                            </p>
                        </div>
                        <div className="p-8 bg-black/[0.02] border border-black/[0.05] rounded-[32px] space-y-4">
                            <h3 className="text-xl font-black">Module Picker</h3>
                            <p className="text-sm text-black/50 leading-relaxed font-medium">
                                Hover over the dual-grid icon at the top of either pane to rapidly switch that specific side without affecting the other.
                            </p>
                        </div>
                    </div>
                </div>
            )

        case 'gqa':
            return (
                <div className="space-y-12">
                     <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-black/[0.03] border border-black/[0.08] rounded-full">
                            <Zap className="w-3.5 h-3.5 text-black/40" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">Foundations // GQA</span>
                        </div>
                        <h1 className="text-5xl font-black text-black tracking-tighter italic">Global Quick Actions.</h1>
                        <p className="text-xl text-black/50 leading-relaxed font-medium">
                            The **Global Quick Action (GQA)** is your capture-everything hub. Accessible from anywhere via the floating persistent button.
                        </p>
                    </div>

                    <div className="space-y-6">
                        {[
                            { title: 'Tasks', desc: 'Add to Todo, Reminders, or Shopping lists instantly.', icon: Activity },
                            { title: 'Vault', desc: 'Securely sync clipboard assets or save encryption keys.', icon: Lock },
                            { title: 'Mood', desc: 'Log your emotional state and correlate it with active tasks.', icon: Heart },
                            { title: 'Notes', desc: 'Direct capture into your Studio R&D sparks.', icon: Palette },
                            { title: 'Wellbeing', desc: 'Log gym sessions or meals without leaving your focus.', icon: Dumbbell }
                        ].map((q) => (
                            <div key={q.title} className="flex items-center gap-6 p-6 border border-black/[0.05] rounded-3xl hover:bg-black/[0.01]">
                                <q.icon className="w-6 h-6 text-black/40 shrink-0" />
                                <div>
                                    <h4 className="text-lg font-black">{q.title}</h4>
                                    <p className="text-sm text-black/50 font-medium">{q.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )

        case 'identity-dna':
            return (
                <div className="space-y-12">
                     <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-black/[0.03] border border-black/[0.08] rounded-full">
                            <Database className="w-3.5 h-3.5 text-black/40" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">Intelligence // DNA</span>
                        </div>
                        <h1 className="text-5xl font-black text-black tracking-tighter italic">Identity DNA.</h1>
                        <p className="text-xl text-black/50 leading-relaxed font-medium">
                            Unlike generic AI, Schrö Intelligence learns your specific axioms, friction points, and strategic goals.
                        </p>
                    </div>

                    <div className="space-y-8">
                        <div className="p-8 bg-black text-white rounded-[32px] space-y-4 shadow-xl">
                            <h3 className="text-xl font-black italic">The Axiom Protocol</h3>
                            <p className="text-white/60 font-medium">
                                By defining your core "Axioms" in the Persona Modal, you give Vance and the other personas a list of non-negotiable rules for how they should advise you.
                            </p>
                        </div>
                        <div className="p-8 border border-black/[0.1] rounded-[32px] space-y-4">
                            <h3 className="text-xl font-black">Data Access Permissions</h3>
                            <p className="text-black/50 font-medium leading-relaxed">
                                You can selectively grant or revoke read-access for the assistant across Finances, Tasks, Wellbeing, and Google Drive. If a permission is toggled off, the assistant literally cannot "see" that data.
                            </p>
                        </div>
                    </div>
                </div>
            )

        case 'voice-system':
            return (
                <div className="space-y-12">
                     <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-black/[0.03] border border-black/[0.08] rounded-full">
                             <Mic className="w-3.5 h-3.5 text-black/40" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">Intelligence // Audio</span>
                        </div>
                        <h1 className="text-5xl font-black text-black tracking-tighter italic">Neural HD Voice.</h1>
                        <p className="text-xl text-black/50 leading-relaxed font-medium">
                            Schrö features high-fidelity voice interaction powered by a low-latency neural pipeline.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-8 border border-black/[0.08] rounded-[32px] space-y-3">
                            <h3 className="text-xl font-black">Hands-Free Mode</h3>
                            <p className="text-sm font-medium text-black/50">Auto-send and auto-vocalize enabled. The assistant listens for your end-of-thought and replies instantly without you touching a key.</p>
                        </div>
                        <div className="p-8 border border-black/[0.08] rounded-[32px] space-y-3">
                            <h3 className="text-xl font-black">HD Neural Voices</h3>
                            <p className="text-sm font-medium text-black/50">Switch between Standard and HD Cloud voices. HD voices use advanced generative models for near-human prosody and emotion.</p>
                        </div>
                    </div>
                </div>
            )

        case 'focus-map':
            return (
                <div className="space-y-12">
                     <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-black/[0.03] border border-black/[0.08] rounded-full">
                            <Target className="w-3.5 h-3.5 text-black/40" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">Operations // Visualization</span>
                        </div>
                        <h1 className="text-5xl font-black text-black tracking-tighter italic">The Focus Map.</h1>
                        <p className="text-xl text-black/50 leading-relaxed font-medium">
                            The **Matrix** is a spatial X/Y plot for all operational items. It eliminates the "flat list" problem by forcing you to visualize importance.
                        </p>
                    </div>

                    <div className="space-y-8">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-6 border-l-4 border-purple-500 bg-purple-50/50 rounded-r-2xl">
                                <h4 className="font-black text-purple-900">Y-Axis: Impact</h4>
                                <p className="text-xs font-medium text-purple-900/60 mt-2">Vertical position denotes the strategic value. Super Priority (9+) sits at the top, Low Impact at the bottom.</p>
                            </div>
                            <div className="p-6 border-l-4 border-amber-500 bg-amber-50/50 rounded-r-2xl">
                                <h4 className="font-black text-amber-900">X-Axis: Urgency</h4>
                                <p className="text-xs font-medium text-amber-900/60 mt-2">Horizontal position represents time. Left is "Today", far right is "Next 14 Days". No due date? It sits at the absolute right boundary.</p>
                            </div>
                         </div>

                         <div className="p-8 bg-black/[0.02] border border-black/5 rounded-[32px]">
                            <h3 className="text-xl font-black mb-4 italic">Drag & Drop Prioritization</h3>
                            <p className="text-sm font-medium text-black/50 leading-relaxed">
                                Simply drag any item on the map to update it. Moving it vertically changes its priority in the database; moving it horizontally updates its due date across the entire system.
                            </p>
                         </div>
                    </div>
                </div>
            )

        case 'projections':
            return (
                <div className="space-y-12">
                     <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-black/[0.03] border border-black/[0.08] rounded-full">
                            <TrendingUp className="w-3.5 h-3.5 text-black/40" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">Financials // Forecasting</span>
                        </div>
                        <h1 className="text-5xl font-black text-black tracking-tighter italic">Cashflow Projections.</h1>
                        <p className="text-xl text-black/50 leading-relaxed font-medium">
                            Schrö predicts your balance into the future by cross-referencing your Rota (income) with your Liabilities (spending).
                        </p>
                    </div>

                    <div className="space-y-6">
                        <section className="space-y-3">
                            <h3 className="text-xl font-black">Rota-Aware Income</h3>
                            <p className="font-medium text-black/50 leading-relaxed">
                                By inputting your shift patterns and hourly rates, the engine calculates precisely when money lands and how much of it is truly disposable.
                            </p>
                        </section>
                        <section className="space-y-3 border-t border-black/[0.05] pt-8">
                            <h3 className="text-xl font-black">Liabilities & Obligations</h3>
                            <p className="font-medium text-black/50 leading-relaxed">
                                All recurring bills—even Pay-in-3/BNPL installments—are tracked as "Mandatory Obligations". The projector will show you a "Danger Zone" if your spending exceeds your guaranteed income floor.
                            </p>
                        </section>
                    </div>
                </div>
            )

        case 'vault':
            return (
                <div className="space-y-12">
                     <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-black/[0.03] border border-black/[0.08] rounded-full">
                            <Lock className="w-3.5 h-3.5 text-black/40" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">Security // Encryption</span>
                        </div>
                        <h1 className="text-5xl font-black text-black tracking-tighter italic">The Vault.</h1>
                        <p className="text-xl text-black/50 leading-relaxed font-medium">
                            Your most sensitive data—Credential secrets and Clipboard history—is protected behind a secondary encryption layer.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                             <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center text-white"><Key className="w-5 h-5" /></div>
                             <h4 className="text-xl font-black">PIN-Locked Layer</h4>
                             <p className="text-sm font-medium text-black/50 leading-relaxed">
                                Accessing the Clipboard or Secrets Manager requires a custom-pattern PIN. This layer stays locked even if the primary session is authenticated.
                             </p>
                        </div>
                        <div className="space-y-4">
                             <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-black shadow-lg shadow-emerald-500/20"><Eye className="w-5 h-5" /></div>
                             <h4 className="text-xl font-black">Privacy Mode</h4>
                             <p className="text-sm font-medium text-black/50 leading-relaxed">
                                Toggle **Privacy Mode** (Eye icon in sidebar) to instantly blur all sensitive financial and personal data across every screen. Perfect for public environments.
                             </p>
                        </div>
                    </div>
                </div>
            )

        case 'velocity':
            return (
                <div className="space-y-12">
                     <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-black/[0.03] border border-black/[0.08] rounded-full">
                            <Gauge className="w-3.5 h-3.5 text-black/40" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">Performance // Mechanics</span>
                        </div>
                        <h1 className="text-5xl font-black text-black tracking-tighter italic">Engine Velocity.</h1>
                        <p className="text-xl text-black/50 leading-relaxed font-medium">
                            The Velocity Engine is the heart of Schrö performance monitoring. It translates every action into a point-based score across five primary life pillars.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <PillarCard title="Finance" points="300" rules={[
                            "50 Points: 100% Budget Adherence",
                            "10% of Weekly Income as Bonus",
                            "Penalty: Essentials Overspend (50% of delta)",
                            "Bonus: Debt Payoff (15 pts per payment)"
                        ]} />
                        <PillarCard title="Operations" points="400" rules={[
                            "3x Multiplier: Super Priority Tasks",
                            "10 Point Bonus: Deep Work sessions",
                            "5 Point Bonus: <24h Completion time",
                            "Penalty: -1 pt per day for stale tasks"
                        ]} />
                        <PillarCard title="Studio" points="200" rules={[
                            "50 Points: Shipped to Production",
                            "15 Points: Milestone Conquered",
                            "2 Points: Item/Idea Capture"
                        ]} />
                        <PillarCard title="Wellbeing" points="350" rules={[
                            "30 Points: Gym Attendance",
                            "1 Point per 200kg: Volume Intensity",
                            "10 Points: Macro Tracking",
                            "5 Points: Mood & Journaling"
                        ]} />
                    </div>

                    <div className="p-8 bg-amber-500/[0.03] border border-amber-500/20 rounded-[32px] space-y-4">
                        <div className="flex items-center gap-3">
                             <Info className="w-5 h-5 text-amber-600" />
                             <h4 className="text-[13px] font-black uppercase tracking-widest text-amber-700">The Weekly Pulse</h4>
                        </div>
                        <p className="text-sm text-amber-900/60 leading-relaxed font-medium italic">
                            The system resets every **Thursday at 17:00** (Payday). All metrics are aggregated weekly to ensure your radar charts show true growth over time, not just daily spikes.
                        </p>
                    </div>
                </div>
            )

        case 'advisor':
            return (
                <div className="space-y-12">
                     <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-black/[0.03] border border-black/[0.08] rounded-full">
                            <Wallet className="w-3.5 h-3.5 text-black/40" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">Financials // Strategy</span>
                        </div>
                        <h1 className="text-5xl font-black text-black tracking-tighter italic">3-Phase Payday.</h1>
                        <p className="text-xl text-black/50 leading-relaxed font-medium">
                            Schrö does not handle money like a bank; it manages capital like a war chest. The Payday Advisor uses a rigorous 3-phase strategic allocation.
                        </p>
                    </div>

                    <div className="space-y-8">
                        {[
                            { 
                                phase: '01', 
                                title: 'Foundations (Fixed)', 
                                icon: Lock,
                                desc: 'Automatic allocation toward survival. Mandatory bills, rent, and pre-calculated recurring obligations. This is the non-negotiable floor.' 
                            },
                            { 
                                phase: '02', 
                                title: 'Pillars (Strategic)', 
                                icon: Network,
                                desc: 'Long-term capital deployment. This includes your GTV goal allocation (defaulting to 40% of surplus) and savings pots. This is where wealth is built.' 
                            },
                            { 
                                phase: '03', 
                                title: 'Aspirations (Surplus)', 
                                icon: Rocket,
                                desc: 'Guilt-free deployment. The system queries your Manifest Wishlist and calculates exactly which Dreams are affordable without compromising Phases 1 or 2.' 
                            }
                        ].map((p) => (
                            <div key={p.phase} className="relative pl-12 border-l-2 border-black/[0.05] pb-10 last:pb-0">
                                <div className="absolute top-0 -left-[13px] w-6 h-6 rounded-full bg-white border-4 border-black flex items-center justify-center text-[8px] font-black">{p.phase}</div>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <p.icon className="w-5 h-5 text-black/40" />
                                        <h3 className="text-2xl font-black">{p.title}</h3>
                                    </div>
                                    <p className="text-black/60 leading-relaxed font-medium text-base tracking-tight">{p.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-10 bg-black text-white rounded-[40px] space-y-6">
                        <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-white/30 italic">Strategic Advice</h4>
                        <p className="text-2xl font-black tracking-tighter italic leading-snug">
                            "Treat every pound as a soldier. If they aren't dying for your safety, they should be dying for your future."
                        </p>
                    </div>
                </div>
            )

        case 'day-planner':
            return (
                <div className="space-y-12">
                     <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-black/[0.03] border border-black/[0.08] rounded-full">
                            <Activity className="w-3.5 h-3.5 text-black/40" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">Operations // Logistics</span>
                        </div>
                        <h1 className="text-5xl font-black text-black tracking-tighter italic">Day Planner.</h1>
                        <p className="text-xl text-black/50 leading-relaxed font-medium">
                            The Day Planner is an algorithmic timeline. It doesn't just show tasks; it creates an operational window for your entire life.
                        </p>
                    </div>

                    <div className="space-y-12">
                        <section className="space-y-4">
                            <h3 className="text-2xl font-black flex items-center gap-3">
                                <Clock className="w-6 h-6 text-emerald-500" />
                                Rota Integration
                            </h3>
                            <p className="font-medium text-black/60 leading-relaxed">
                                The scheduler core automatically pulls your work shifts from the Finance module. On shift days, personal task windows are compressed or shifted to "Deep Work" zones after-hours.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h3 className="text-2xl font-black flex items-center gap-3">
                                <Wand2 className="w-6 h-6 text-blue-500" />
                                Smart Slots
                            </h3>
                            <p className="font-medium text-black/60 leading-relaxed">
                                Tasks are slotted based on their **Priority** and **Energy Cost**. "Deep Work" happens in your peak morning window, while "Light Maintenance" is pushed to afternoon troughs.
                            </p>
                        </section>

                        <div className="grid grid-cols-3 gap-3 p-2 bg-black/[0.02] border border-black/10 rounded-3xl h-12 items-center px-4">
                             <div className="text-[9px] font-black uppercase tracking-widest text-black/30 text-center border-r border-black/5">Sleep Protocol</div>
                             <div className="text-[9px] font-black uppercase tracking-widest text-black/30 text-center border-r border-black/5">Peak Operation</div>
                             <div className="text-[9px] font-black uppercase tracking-widest text-black/30 text-center">Recharge Window</div>
                        </div>
                    </div>
                </div>
            )

        default:
            return (
                <div className="py-20 text-center space-y-6">
                    <div className="w-16 h-16 bg-black/[0.03] border border-black/[0.08] rounded-3xl flex items-center justify-center mx-auto animate-pulse">
                         <Info className="w-6 h-6 text-black/20" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-black">Decrypting Module...</h2>
                        <p className="text-sm font-medium text-black/40">This protocol guide is still being synchronized with the core engine.</p>
                    </div>
                </div>
            )
    }
}

function PillarCard({ title, points, rules }: { title: string, points: string, rules: string[] }) {
    return (
        <div className="p-6 bg-white border border-black/[0.08] rounded-[32px] space-y-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
                <h4 className="text-lg font-black">{title}</h4>
                <div className="px-2 py-1 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-lg">Max {points}</div>
            </div>
            <ul className="space-y-2">
                {rules.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-[11px] font-bold text-black/50 leading-tight">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                        {r}
                    </li>
                ))}
            </ul>
        </div>
    )
}
