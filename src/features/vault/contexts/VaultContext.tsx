'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface VaultContextType {
    isVaultPrivate: boolean
    toggleVaultPrivacy: () => void
    isVaultLocked: boolean
    vaultPin: string | null
    isVaultAuthenticated: boolean
    setVaultLocked: (locked: boolean) => void
    updateVaultPin: (pin: string) => void
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
    const [isVaultPrivate, setIsVaultPrivate] = useState(false)
    const [isVaultLocked, setIsVaultLocked] = useState(false)
    const [vaultPin, setVaultPin] = useState<string | null>(null)
    const [isVaultAuthenticated, setIsVaultAuthenticated] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        const savedPrivacy = localStorage.getItem('schro_vault_privacy')
        const savedLocked = localStorage.getItem('schro_vault_locked')
        const savedPin = localStorage.getItem('schro_vault_pin')

        if (savedPrivacy === 'true') setIsVaultPrivate(true)
        if (savedLocked === 'true') setIsVaultLocked(true)
        if (savedPin) setVaultPin(savedPin)

        setMounted(true)
    }, [])

    const toggleVaultPrivacy = () => {
        setIsVaultPrivate(prev => {
            const next = !prev
            localStorage.setItem('schro_vault_privacy', String(next))
            return next
        })
    }

    const setVaultLocked = (locked: boolean) => {
        setIsVaultLocked(locked)
        localStorage.setItem('schro_vault_locked', String(locked))
        // Always reset authentication session when changing lock status
        setIsVaultAuthenticated(false)
    }

    const updateVaultPin = (newPin: string) => {
        setVaultPin(newPin)
        localStorage.setItem('schro_vault_pin', newPin)
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
