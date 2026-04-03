'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Shield, Key, X, Check, AlertCircle } from 'lucide-react'
import { useVault } from '../contexts/VaultContext'
import { cn } from '@/lib/utils'

interface VaultPinModalProps {
    isOpen: boolean
    onClose: () => void
}

export function VaultPinModal({ isOpen, onClose }: VaultPinModalProps) {
    const { isVaultLocked, vaultPin, setVaultLocked, updateVaultPin, isVaultAuthenticated, authenticateVault } = useVault()
    const [step, setStep] = useState<'menu' | 'set-pin' | 'verify-old' | 'verify-pin'>('menu')
    const [isConfirming, setIsConfirming] = useState(false)
    const [pinInput, setPinInput] = useState('')
    const [pinConfirm, setPinConfirm] = useState('')
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!isOpen) {
            setStep('menu')
            setIsConfirming(false)
            setPinInput('')
            setPinConfirm('')
            setError(null)
        } else {
            // ONLY check for bootstrap authentication ON INITIAL OPEN
            // This prevents the modal from jumping to 'verify-pin' when the user manually toggles the lock from Standby to Active.
            setStep(prevStep => {
                if (isVaultLocked && !isVaultAuthenticated) {
                    return 'verify-pin'
                }
                return prevStep === 'verify-pin' ? 'menu' : prevStep
            })
        }
    }, [isOpen]) // Only react to isOpen

    const handleSetPin = async () => {
        if (pinInput.length !== 4) {
            setError('PIN must be 4 digits')
            setIsConfirming(false)
            setPinConfirm('')
            return
        }
        if (pinInput !== pinConfirm) {
            setError('PINs do not match')
            setPinConfirm('')
            return
        }
        await updateVaultPin(pinInput)
        setStep('menu')
        setIsConfirming(false)
        setPinInput('')
        setPinConfirm('')
        setError(null)
    }

    const handleVerifyPin = () => {
        const isValid = authenticateVault(pinInput)
        if (isValid) {
            setStep('menu')
            setPinInput('')
            setError(null)
        } else {
            setError('Incorrect Security Vector')
            setPinInput('')
        }
    }

    const handleToggleLock = async () => {
        if (!vaultPin && !isVaultLocked) {
            setStep('set-pin')
            return
        }
        await setVaultLocked(!isVaultLocked)
    }

    if (!isOpen) return null

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                />
                
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-black/5"
                >
                    <div className="p-6 space-y-6">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center border border-orange-100">
                                    <Lock className="w-5 h-5 text-orange-500" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-black uppercase tracking-tight">Vault Security</h3>
                                    <p className="text-[11px] font-bold text-black/40 uppercase tracking-widest">Access Protocol</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-xl transition-colors">
                                <X className="w-5 h-5 text-black/20" />
                            </button>
                        </div>

                        {step === 'menu' && (
                            <div className="space-y-3">
                                <button
                                    onClick={handleToggleLock}
                                    className={cn(
                                        "w-full flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-[0.98]",
                                        isVaultLocked 
                                            ? "bg-orange-50 border-orange-100 text-orange-700"
                                            : "bg-black/[0.02] border-black/[0.05] text-black hover:bg-black/[0.04]"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <Shield className={cn("w-5 h-5", isVaultLocked ? "text-orange-500" : "text-black/40")} />
                                        <div className="text-left">
                                            <p className="text-[13px] font-bold">PIN Lock Status</p>
                                            <p className="text-[11px] font-medium opacity-60">
                                                {isVaultLocked ? "Protocol Active" : "Protocol Standby"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={cn(
                                        "w-10 h-5 rounded-full p-1 transition-colors relative",
                                        isVaultLocked ? "bg-orange-500" : "bg-black/10"
                                    )}>
                                        <div className={cn(
                                            "w-3 h-3 bg-white rounded-full transition-transform",
                                            isVaultLocked ? "translate-x-5" : "translate-x-0"
                                        )} />
                                    </div>
                                </button>

                                <button
                                    onClick={() => setStep('set-pin')}
                                    className="w-full flex items-center gap-3 p-4 rounded-2xl bg-black/[0.02] border border-black/[0.05] text-black hover:bg-black/[0.04] transition-all active:scale-[0.98]"
                                >
                                    <Key className="w-5 h-5 text-black/40" />
                                    <div className="text-left">
                                        <p className="text-[13px] font-bold">{vaultPin ? "Update PIN" : "Set Access PIN"}</p>
                                        <p className="text-[11px] font-medium text-black/40 lowercase">4-Digit Security Vector</p>
                                    </div>
                                </button>
                            </div>
                        )}

                        {(step === 'verify-pin' || step === 'set-pin') && (
                            <div className="space-y-4">
                                <div className="space-y-2 text-center">
                                    <p className="text-[11px] font-black text-black/40 uppercase tracking-widest animate-in fade-in duration-500">
                                        {step === 'verify-pin' ? 'Verify Access PIN' : (isConfirming ? "Confirm New PIN" : "Enter New PIN")}
                                    </p>
                                    <div className="flex justify-center gap-3">
                                        {[0, 1, 2, 3].map((i) => (
                                            <div
                                                key={i}
                                                className={cn(
                                                    "w-12 h-14 rounded-2xl border-2 flex items-center justify-center text-xl font-black transition-all",
                                                    (isConfirming ? pinConfirm[i] : pinInput[i])
                                                        ? "border-orange-500 bg-orange-50 text-orange-600"
                                                        : "border-black/5 bg-black/[0.02] text-black/10"
                                                )}
                                            >
                                                {(isConfirming ? pinConfirm[i] : pinInput[i]) ? '●' : ''}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {error && (
                                    <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl border border-red-100 animate-in slide-in-from-top-1">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        <p className="text-[11px] font-bold uppercase">{error}</p>
                                    </div>
                                )}

                                <div className="grid grid-cols-3 gap-2">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'OK'].map((val) => (
                                        <button
                                            key={val}
                                            onClick={() => {
                                                if (val === 'C') {
                                                    setError(null)
                                                    if (isConfirming) {
                                                        if (pinConfirm.length > 0) setPinConfirm('')
                                                        else setIsConfirming(false)
                                                    } else {
                                                        setPinInput('')
                                                    }
                                                } else if (val === 'OK') {
                                                    if (step === 'verify-pin') {
                                                        handleVerifyPin()
                                                    } else if (!isConfirming) {
                                                        if (pinInput.length === 4) {
                                                            setIsConfirming(true)
                                                            setError(null)
                                                        } else {
                                                            setError('Enter 4 digits')
                                                        }
                                                    } else {
                                                        handleSetPin()
                                                    }
                                                } else {
                                                    if (isConfirming) {
                                                        if (pinConfirm.length < 4) setPinConfirm(pinConfirm + val)
                                                    } else {
                                                        if (pinInput.length < 4) setPinInput(pinInput + val)
                                                    }
                                                }
                                            }}
                                            className={cn(
                                                "h-12 rounded-xl text-sm font-black transition-all active:scale-95",
                                                val === 'OK' ? "bg-black text-white col-span-1" : "bg-black/5 text-black hover:bg-black/10"
                                            )}
                                        >
                                            {val}
                                        </button>
                                    ))}
                                </div>
                                
                                <button
                                    onClick={() => step === 'verify-pin' ? onClose() : setStep('menu')}
                                    className="w-full py-3 text-[11px] font-black text-black/40 uppercase tracking-widest hover:text-black/60 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
