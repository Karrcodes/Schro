import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X as CloseIcon, User, Clock, ShieldAlert, HeartCrack, FileCode2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PERSONA_QUESTIONS } from '../constants/personaQuestions'
import { supabase } from '@/lib/supabase'

export function PersonaModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const [activeTab, setActiveTab] = useState('demographics')
    const [isSaving, setIsSaving] = useState(false)
    const [formData, setFormData] = useState<Record<string, Record<string, string>>>({
        demographics: {},
        timeline: {},
        citadel: {},
        friction: {},
        axioms: {}
    })

    useEffect(() => {
        const loadPersona = async () => {
            if (!supabase || !isOpen) return
            const { data } = await supabase.from('sys_user_persona').select('*').limit(1).maybeSingle()
            if (data) {
                setFormData({
                    demographics: data.demographics || {},
                    timeline: data.timeline || {},
                    citadel: data.citadel || {},
                    friction: data.friction || {},
                    axioms: data.axioms || {}
                })
            }
        }
        loadPersona()
    }, [isOpen])

    if (!isOpen) return null

    const handleSave = async () => {
        if (!supabase) return onClose()
        setIsSaving(true)
        
        try {
            const { data: existing } = await supabase.from('sys_user_persona').select('id').limit(1).maybeSingle()
            
            if (existing) {
                await supabase.from('sys_user_persona').update({
                    demographics: formData.demographics,
                    timeline: formData.timeline,
                    citadel: formData.citadel,
                    friction: formData.friction,
                    axioms: formData.axioms
                }).eq('id', existing.id)
            } else {
                await supabase.from('sys_user_persona').insert({
                    demographics: formData.demographics,
                    timeline: formData.timeline,
                    citadel: formData.citadel,
                    friction: formData.friction,
                    axioms: formData.axioms
                })
            }
        } catch (e) {
            console.error(e)
        }
        
        setIsSaving(false)
        onClose()
    }

    const handleInputChange = (tab: string, id: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [tab]: {
                ...prev[tab],
                [id]: value
            }
        }))
    }

    const tabs = [
        { id: 'demographics', label: 'Demographics', icon: User, desc: 'The physical and temporal constraints of your existence.' },
        { id: 'timeline', label: 'Timeline & Arcs', icon: Clock, desc: 'The trajectory of your narrative. Past shaping the future.' },
        { id: 'citadel', label: 'Inner Citadel', icon: ShieldAlert, desc: 'Deepest motivations. Used to push you when you are weak.' },
        { id: 'friction', label: 'Friction & Entropy', icon: HeartCrack, desc: 'Self-sabotage loops. Used to detect excuses.' },
        { id: 'axioms', label: 'Immutable Axioms', icon: FileCode2, desc: 'Algorithmic laws the AI must never break.' }
    ]

    const currentQuestions = PERSONA_QUESTIONS[activeTab as keyof typeof PERSONA_QUESTIONS] || []
    const currentTabInfo = tabs.find(t => t.id === activeTab)

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 flex items-center justify-center z-[70] p-4 lg:p-8">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/20 backdrop-blur-md"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-5xl bg-[#FAFAFA] rounded-[32px] shadow-2xl overflow-hidden border border-black/5 flex flex-col md:flex-row h-[85vh] min-h-[600px]"
                    >
                        {/* Sidebar Navigation */}
                        <div className="w-full md:w-72 bg-white border-r border-black/5 shrink-0 flex flex-col p-8 z-30">
                            <div className="flex items-center gap-3 mb-10">
                                <div className="p-3 bg-black rounded-2xl text-white shadow-md">
                                    <User className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-[15px] font-black uppercase tracking-widest text-black">Persona</h3>
                                    <p className="text-[9px] font-bold text-black/40 uppercase tracking-[0.2em] mt-0.5">Alignment Matrix</p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 flex-1 scroll-y-auto">
                                {tabs.map(tab => {
                                    const Icon = tab.icon
                                    const isActive = activeTab === tab.id
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={cn(
                                                "flex items-center gap-3.5 p-3.5 rounded-xl transition-all text-left group",
                                                isActive ? "bg-black text-white shadow-lg shadow-black/10" : "text-black/40 hover:bg-black/[0.03] hover:text-black"
                                            )}
                                        >
                                            <Icon className={cn("w-4 h-4", isActive ? "text-white" : "text-black/30 group-hover:text-black")} />
                                            <span className="text-[10px] font-bold uppercase tracking-[0.15em]">{tab.label}</span>
                                        </button>
                                    )
                                })}
                            </div>

                            <p className="text-[9px] font-bold text-black/30 uppercase tracking-[0.2em] mt-auto leading-relaxed pt-8 border-t border-black/5">
                                This 100-point data architecture forms the unconditional baseline for all AI reasoning protocols. Provide hyper-accurate truth.
                            </p>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 flex flex-col h-full bg-[#FAFAFA] relative overflow-hidden">
                            <div className="h-20 border-b border-black/5 flex items-center justify-end px-8 shrink-0 bg-white/50 backdrop-blur-md absolute top-0 inset-x-0 z-20">
                                <button onClick={onClose} className="p-2.5 hover:bg-black/5 rounded-full transition-colors text-black/30 hover:text-black bg-white shadow-sm border border-black/5">
                                    <CloseIcon className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto pt-28 pb-12 px-8 md:px-12 no-scrollbar relative z-10">
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="mb-8">
                                        <h2 className="text-2xl font-black uppercase tracking-[0.15em] text-black">{currentTabInfo?.label}</h2>
                                        <p className="text-xs font-medium text-black/40 leading-relaxed max-w-xl mt-2">
                                            {currentTabInfo?.desc}
                                        </p>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                        {currentQuestions.map(q => (
                                            <div key={q.id} className={cn("space-y-2.5", q.type === 'textarea' ? "col-span-1 md:col-span-2" : "")}>
                                                <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 ml-1 leading-relaxed block">
                                                    {q.question}
                                                </label>
                                                {q.type === 'input' && (
                                                    <input 
                                                        type="text" 
                                                        value={formData[activeTab]?.[q.id] || ''}
                                                        onChange={e => handleInputChange(activeTab, q.id, e.target.value)}
                                                        className="w-full bg-white border border-black/10 rounded-2xl px-5 py-3.5 text-sm focus:border-black/30 outline-none transition-all shadow-sm focus:shadow-md" 
                                                        placeholder={q.placeholder || ''} 
                                                    />
                                                )}
                                                {q.type === 'textarea' && (
                                                    <textarea 
                                                        value={formData[activeTab]?.[q.id] || ''}
                                                        onChange={e => handleInputChange(activeTab, q.id, e.target.value)}
                                                        className="w-full h-24 bg-white border border-black/10 rounded-2xl px-5 py-4 text-sm focus:border-black/30 outline-none transition-all shadow-sm focus:shadow-md resize-none" 
                                                        placeholder={q.placeholder || ''} 
                                                    />
                                                )}
                                                {q.type === 'select' && (
                                                    <select 
                                                        value={formData[activeTab]?.[q.id] || ''}
                                                        onChange={e => handleInputChange(activeTab, q.id, e.target.value)}
                                                        className="w-full bg-white border border-black/10 rounded-2xl px-5 py-3.5 text-sm focus:border-black/30 outline-none transition-all shadow-sm text-black/60 focus:shadow-md appearance-none"
                                                    >
                                                        <option value="">Select an option...</option>
                                                        {q.options?.map(opt => (
                                                            <option key={opt} value={opt}>{opt}</option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="pt-12 mt-12 border-t border-black/5">
                                        <button disabled={isSaving} onClick={handleSave} className="bg-black hover:bg-black/90 active:scale-[0.98] text-white font-bold text-[11px] uppercase tracking-[0.2em] px-8 py-4 rounded-2xl shadow-xl hover:shadow-2xl transition-all w-full md:w-auto disabled:opacity-50 cursor-pointer disabled:cursor-wait">
                                            {isSaving ? 'Committing Neural Matrix...' : 'Commit Alignment Matrix'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}

