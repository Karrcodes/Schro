'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

interface VaultContextType {
    isVaultPrivate: boolean
    toggleVaultPrivacy: () => void
    isVaultLocked: boolean
    vaultPin: string | null
    isVaultAuthenticated: boolean
    setVaultLocked: (locked: boolean) => Promise<void>
    updateVaultPin: (pin: string) => Promise<void>
    authenticateVault: (pin: string) => boolean
    logoutVault: () => void
}

const VaultContext = createContext<VaultContextType | undefined>(undefined)

function VaultAutoLock() {
    const pathname = usePathname()
    const { logoutVault, isVaultAuthenticated, isVaultLocked } = useVault()

    useEffect(() => {
        // Automatically logout vault sessions when navigating away from /vault
        if (isVaultAuthenticated && isVaultLocked && !pathname.startsWith('/vault')) {
            logoutVault()
        }
    }, [pathname, isVaultAuthenticated, isVaultLocked, logoutVault])

    return null
}

export function VaultProvider({ children }: { children: React.ReactNode }) {
    const { profile, user } = useAuth()
    const [isVaultPrivate, setIsVaultPrivate] = useState(false)
    const [isVaultLocked, setIsVaultLocked] = useState(false)
    const [vaultPin, setVaultPin] = useState<string | null>(null)
    const [isVaultAuthenticated, setIsVaultAuthenticated] = useState(false)
    const [mounted, setMounted] = useState(false)

    // Load initial state from profile AND localStorage fallback
    useEffect(() => {
        if (profile) {
            if (profile.vault_locked !== undefined) setIsVaultLocked(profile.vault_locked)
            if (profile.vault_pin) setVaultPin(profile.vault_pin)
        } else {
            const savedLocked = localStorage.getItem('schro_vault_locked')
            const savedPin = localStorage.getItem('schro_vault_pin')
            if (savedLocked === 'true') setIsVaultLocked(true)
            if (savedPin) setVaultPin(savedPin)
        }

        const savedPrivacy = localStorage.getItem('schro_vault_privacy')
        if (savedPrivacy === 'true') setIsVaultPrivate(true)

        setMounted(true)
    }, [profile])

    // Real-time sync for cross-device locking
    useEffect(() => {
        if (!user) return

        const channel = supabase
            .channel('vault-profile-sync')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'user_profiles',
                    filter: `id=eq.${user.id}`
                },
                (payload) => {
                    const newProfile = payload.new as any
                    if (newProfile.vault_locked !== undefined) setIsVaultLocked(newProfile.vault_locked)
                    if (newProfile.vault_pin) setVaultPin(newProfile.vault_pin)
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [user])

    const toggleVaultPrivacy = () => {
        setIsVaultPrivate(prev => {
            const next = !prev
            localStorage.setItem('schro_vault_privacy', String(next))
            return next
        })
    }

    const setVaultLocked = async (locked: boolean) => {
        setIsVaultLocked(locked)
        localStorage.setItem('schro_vault_locked', String(locked))
        // Always reset authentication session when changing lock status
        setIsVaultAuthenticated(false)

        // Sync to cloud
        if (user) {
            await supabase
                .from('user_profiles')
                .update({ vault_locked: locked })
                .eq('id', user.id)
        }
    }

    const updateVaultPin = async (newPin: string) => {
        setVaultPin(newPin)
        localStorage.setItem('schro_vault_pin', newPin)

        // Sync to cloud
        if (user) {
            await supabase
                .from('user_profiles')
                .update({ vault_pin: newPin })
                .eq('id', user.id)
        }
    }

    const authenticateVault = (inputPin: string) => {
        if (inputPin === vaultPin) {
            setIsVaultAuthenticated(true)
            return true
        }
        return false
    }

    const logoutVault = () => {
        setIsVaultAuthenticated(false)
    }

    return (
        <VaultContext.Provider value={{
            isVaultPrivate,
            toggleVaultPrivacy,
            isVaultLocked,
            vaultPin,
            isVaultAuthenticated,
            setVaultLocked,
            updateVaultPin,
            authenticateVault,
            logoutVault
        }}>
            <VaultAutoLock />
            <div className={cn(
                isVaultPrivate && 'privacy-enabled',
                !isVaultAuthenticated && isVaultLocked && 'vault-locked'
            )}>
                {children}
            </div>
        </VaultContext.Provider>
    )
}

export function useVault() {
    const context = useContext(VaultContext)
    if (context === undefined) {
        throw new Error('useVault must be used within a VaultProvider')
    }
    return context
}
