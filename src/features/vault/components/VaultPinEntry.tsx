'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Delete, ArrowRight, ShieldAlert, Key } from 'lucide-react'
import { useVault } from '../contexts/VaultContext'
import { cn } from '@/lib/utils'

export function VaultPinEntry() {
    const { authenticateVault } = useVault()
    const [pin, setPin] = useState('')
    const [status, setStatus] = useState<'idle' | 'error' | 'success'>('idle')

    const handleInput = (val: string | number) => {
        if (status === 'success') return
        if (status === 'error') setStatus('idle')
        
        if (typeof val === 'number' || !isNaN(Number(val))) {
            if (pin.length < 4) {
                const newPin = pin + val
                setPin(newPin)
                
                if (newPin.length === 4) {
                    const isValid = authenticateVault(newPin)
                    if (isValid) {
                        setStatus('success')
                    } else {
                        setStatus('error')
                        setTimeout(() => {
                            setPin('')
                            setStatus('idle')
                        }, 1000)
                    }
                }
            }
        }
    }

    const handleDelete = () => {
        if (status === 'success') return
        setPin(prev => prev.slice(0, -1))
        setStatus('idle')
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-12">
            <div className="text-center space-y-4">
                <motion.div 
                    animate={status === 'error' ? { 
                        x: [0, -10, 10, -10, 10, 0],
                        transition: { duration: 0.4 }
                    } : {}}
                    className={cn(
                        "w-20 h-20 rounded-3xl flex items-center justify-center mx-auto border shadow-sm transition-colors duration-500",
                        status === 'idle' ? "bg-white border-black/[0.05] text-black/20" :
                        status === 'error' ? "bg-red-50 border-red-100 text-red-500" :
                        "bg-green-50 border-green-100 text-green-500"
                    )}
                >
                    {status === 'success' ? <ShieldAlert className="w-10 h-10" /> : <Lock className="w-10 h-10" />}
                </motion.div>
                
                <div className="space-y-1">
                    <h2 className="text-2xl font-black text-black uppercase tracking-tight">Vault Locked</h2>
                    <p className="text-[11px] font-bold text-black/40 uppercase tracking-widest">Neural Identity Check Required</p>
                </div>
            </div>

            <div className="flex gap-4">
                {[0, 1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className={cn(
                            "w-4 h-4 rounded-full transition-all duration-300",
                            pin.length > i 
                                ? (status === 'error' ? "bg-red-500 scale-125" : "bg-black scale-125")
                                : "bg-black/10"
                        )}
                    />
                ))}
            </div>

            <div className="grid grid-cols-3 gap-x-8 gap-y-6">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'del'].map((val, i) => (
                    <button
                        key={i}
                        onClick={() => val === 'del' ? handleDelete() : val !== '' && handleInput(val as string)}
                        className={cn(
                            "w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-90",
                            val === '' ? "pointer-events-none" : "hover:bg-black/5 active:bg-black/10"
                        )}
                    >
                        {val === 'del' ? (
                            <Delete className="w-6 h-6 text-black/40" />
                        ) : (
                            <span className="text-2xl font-black text-black/80">{val}</span>
                        )}
                    </button>
                ))}
            </div>
            
            <div className="pt-8 flex items-center gap-2 text-[10px] font-black text-black/20 uppercase tracking-[0.2em]">
                <Key className="w-3.5 h-3.5" />
                Schrö Security Vector v2.0
            </div>
        </div>
    )
}
