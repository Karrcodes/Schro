'use client'

import React, { useState } from 'react'
import {
    Sparkles,
    Shield,
    TrendingUp,
    Brain,
    CheckCircle2,
    ArrowRight,
    Github,
    Twitter,
    Instagram,
    ChevronRight
} from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

export default function LandingPage() {
    const [email, setEmail] = useState('')
    const [isSubmitted, setIsSubmitted] = useState(false)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (email) {
            setIsSubmitted(true)
            setEmail('')
        }
    }

    return (
        <div className="min-h-screen bg-white text-black selection:bg-purple-100 font-outfit overflow-x-hidden">
            {/* Navigation */}
            <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-black/[0.03] px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white font-black italic">
                            S
                        </div>
                        <span className="text-xl font-black tracking-tight">Schrö</span>
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-sm font-bold text-black/60">
                        <a href="#features" className="hover:text-purple-600 transition-colors">Features</a>
                        <a href="#showcase" className="hover:text-purple-600 transition-colors">Showcase</a>
                        <a href="#waitlist" className="px-5 py-2.5 bg-black text-white rounded-full hover:scale-105 transition-transform">Join Waitlist</a>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 px-6 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-purple-50/50 to-transparent -z-10" />
                <div className="max-w-5xl mx-auto text-center space-y-8">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-50 border border-purple-100 text-purple-600 text-[12px] font-black uppercase tracking-widest animate-fade-in">
                        <Sparkles className="w-3.5 h-3.5" />
                        The Future of Personal OS
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.1] animate-slide-up">
                        Your life, <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">orchestrated</span><br />
                        by intelligence.
                    </h1>
                    <p className="text-lg md:text-xl text-black/50 font-medium max-w-2xl mx-auto leading-relaxed animate-slide-up delay-100">
                        Schrö is the premium life management system designed to harmonize your finances, creativity, and legacy in one unified workspace.
                    </p>

                    <form onSubmit={handleSubmit} className="max-w-md mx-auto relative group animate-slide-up delay-200" id="waitlist">
                        <div className="flex gap-2 p-1.5 bg-white border border-black/10 rounded-2xl shadow-xl shadow-purple-500/5 group-focus-within:border-purple-300 transition-all">
                            <input
                                type="email"
                                required
                                placeholder="Enter your email"
                                className="flex-1 px-4 py-3 bg-transparent text-[14px] font-bold focus:outline-none"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            <button className="px-6 py-3 bg-purple-600 text-white rounded-xl text-[14px] font-black hover:bg-purple-700 transition-colors flex items-center gap-2">
                                Join Waitlist
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                        {isSubmitted && (
                            <p className="mt-4 text-emerald-600 font-bold text-sm flex items-center justify-center gap-2">
                                <CheckCircle2 className="w-4 h-4" /> You're on the list!
                            </p>
                        )}
                    </form>

                    {/* Hero Image Mockup */}
                    <div className="mt-20 relative rounded-[40px] border border-black/[0.05] p-2 bg-black/[0.02] shadow-2xl animate-float">
                        <Image
                            src="/schro_dashboard_mockup.png"
                            alt="Schrö Dashboard"
                            width={1200}
                            height={800}
                            className="rounded-[36px]"
                            priority
                        />
                    </div>
                </div>
            </section>

            {/* Features Overview */}
            <section id="features" className="py-24 px-6 bg-[#FAFAFA]">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16 space-y-4">
                        <h2 className="text-3xl md:text-5xl font-black tracking-tight">One platform. Infinite possibilities.</h2>
                        <p className="text-black/40 font-bold">Four pillars of personal excellence.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { icon: Sparkles, title: 'Creative Studio', desc: 'Manage projects, content, and recognition with professional precision.', color: 'text-orange-600 bg-orange-50' },
                            { icon: Shield, title: 'Secure Vault', desc: 'Military-grade storage for your most sensitive data and portfolios.', color: 'text-blue-600 bg-blue-50' },
                            { icon: TrendingUp, title: 'Financial Intelligence', desc: 'Track net worth, budgets, and investments in real-time.', color: 'text-emerald-600 bg-emerald-50' },
                            { icon: Brain, title: 'System Intelligence', desc: 'AI-driven insights that help you optimize your daily life.', color: 'text-purple-600 bg-purple-50' }
                        ].map((f, i) => (
                            <div key={i} className="p-8 bg-white border border-black/[0.03] rounded-[40px] hover:shadow-xl transition-all group">
                                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6", f.color)}>
                                    <f.icon className="w-7 h-7" />
                                </div>
                                <h3 className="text-xl font-black mb-3">{f.title}</h3>
                                <p className="text-[14px] text-black/40 font-medium leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Detailed Showcase */}
            <section id="showcase" className="py-24 px-6">
                <div className="max-w-7xl mx-auto space-y-32">
                    {/* Showcase 1 */}
                    <div className="flex flex-col lg:flex-row items-center gap-16">
                        <div className="flex-1 space-y-6">
                            <div className="px-4 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest w-fit">The Vault</div>
                            <h3 className="text-4xl font-black tracking-tight">Security that evolves with you.</h3>
                            <p className="text-lg text-black/50 font-medium leading-relaxed">
                                From confidential documents to your GTV Portfolio evidence, the Vault provides a secure, organized sanctuary for your digital life.
                            </p>
                            <ul className="space-y-3">
                                {['AES-256 Encryption', 'Biometric Lock Support', 'Multi-device Sync'].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-sm font-bold text-black/70">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500" /> {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="flex-1 relative rounded-[40px] overflow-hidden shadow-2xl skew-y-1 hover:skew-y-0 transition-transform duration-700">
                            <Image
                                src="/schro_vault_mockup.png"
                                alt="Vault Showcase"
                                width={800}
                                height={600}
                            />
                        </div>
                    </div>

                    {/* Showcase 2 */}
                    <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
                        <div className="flex-1 space-y-6">
                            <div className="px-4 py-1 rounded-full bg-purple-50 text-purple-600 text-[10px] font-black uppercase tracking-widest w-fit">Intelligence</div>
                            <h3 className="text-4xl font-black tracking-tight">Data turned into wisdom.</h3>
                            <p className="text-lg text-black/50 font-medium leading-relaxed">
                                Stop guessing and start knowing. Schrö analyzes your financial and productivity trends to offer actionable advice.
                            </p>
                            <button className="flex items-center gap-2 text-purple-600 font-black tracking-widest uppercase text-[12px] group">
                                Learn how it works
                                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                        <div className="flex-1 relative rounded-[40px] overflow-hidden shadow-2xl -skew-y-1 hover:skew-y-0 transition-transform duration-700">
                            <Image
                                src="/schro_intelligence_mockup.png"
                                alt="Intelligence Showcase"
                                width={800}
                                height={600}
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-20 px-6 border-t border-black/[0.05]">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
                    <div className="space-y-6 max-w-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white font-black italic">
                                S
                            </div>
                            <span className="text-xl font-black tracking-tight">Schrö</span>
                        </div>
                        <p className="text-black/40 text-sm font-medium leading-relaxed">
                            Designed and built by Studio Karrtesian. A new standard for personal management and digital legacy.
                        </p>
                        <div className="flex items-center gap-4 text-black/20">
                            <Twitter className="w-5 h-5 hover:text-black cursor-pointer transition-colors" />
                            <Instagram className="w-5 h-5 hover:text-black cursor-pointer transition-colors" />
                            <Github className="w-5 h-5 hover:text-black cursor-pointer transition-colors" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-20">
                        <div className="space-y-4">
                            <h4 className="text-[12px] font-black uppercase tracking-widest text-black/30">Product</h4>
                            <ul className="space-y-2 text-[14px] font-bold text-black/60">
                                <li className="hover:text-purple-600 cursor-pointer">Changelog</li>
                                <li className="hover:text-purple-600 cursor-pointer">Security</li>
                                <li className="hover:text-purple-600 cursor-pointer">Waitlist</li>
                            </ul>
                        </div>
                        <div className="space-y-4">
                            <h4 className="text-[12px] font-black uppercase tracking-widest text-black/30">Legal</h4>
                            <ul className="space-y-2 text-[14px] font-bold text-black/60">
                                <li className="hover:text-purple-600 cursor-pointer">Privacy</li>
                                <li className="hover:text-purple-600 cursor-pointer">Terms</li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-black/[0.03] flex justify-between items-center text-[12px] font-bold text-black/20 uppercase tracking-widest">
                    <span>&copy; 2026 Schrö. All rights reserved.</span>
                    <span>v1.0.0-alpha</span>
                </div>
            </footer>

            {/* Global Styles for Animations */}
            <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        .animate-fade-in { animation: fade-in 0.8s ease-out forwards; }
        .animate-slide-up { opacity: 0; animation: slide-up 0.8s ease-out forwards; }
        .animate-float { animation: float 5s ease-in-out infinite; }
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
      `}</style>
        </div>
    )
}
