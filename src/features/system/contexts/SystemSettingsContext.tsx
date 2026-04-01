'use client'

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

interface SystemSettings {
    user_name: string
    user_email: string
    profile_picture_url: string
    notification_low_balance: boolean
    notification_large_transaction: boolean
    notification_bank_sync: boolean
    notification_goal_milestone: boolean
    notification_reminders: boolean
    notification_transactions: boolean
    off_days: string[]
    last_reminder_sent: string
    schedule_type: 'mon-fri' | 'shift'
    shift_on_days: number
    shift_off_days: number
    shift_start_date: string
    is_demo_mode: boolean
    network_reach_out_days: number
    dashboard_widgets: Record<string, boolean>
    [key: string]: any
}

interface SystemSettingsContextType {
    settings: SystemSettings
    loading: boolean
    updateSetting: (key: keyof SystemSettings, value: any) => Promise<void>
    refreshSettings: () => Promise<void>
}

const defaultSettings: SystemSettings = {
    user_name: 'Karr',
    user_email: 'karr@studiokarrtesian.com',
    profile_picture_url: '',
    notification_low_balance: true,
    notification_large_transaction: true,
    notification_bank_sync: true,
    notification_goal_milestone: true,
    notification_reminders: true,
    notification_transactions: true,
    off_days: [],
    last_reminder_sent: '',
    schedule_type: 'mon-fri',
    shift_on_days: 3,
    shift_off_days: 3,
    shift_start_date: '',
    is_demo_mode: false,
    network_reach_out_days: 30,
    dashboard_widgets: {
        intelligence: true,
        timeline: true,
        studio: true,
        finance: true,
        focus: true,
        curation: true,
        routine: true
    }
}

const SystemSettingsContext = createContext<SystemSettingsContextType | undefined>(undefined)

export function SystemSettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<SystemSettings>(defaultSettings)
    const [loading, setLoading] = useState(true)

    const fetchSettings = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('sys_settings')
                .select('*')

            if (error) {
                console.error('Error fetching system settings:', error)
                return
            }

            if (data && data.length > 0) {
                const newSettings = { ...defaultSettings }
                data.forEach((item: { key: string, value: string }) => {
                    let value: any = item.value
                    // Try to parse booleans and numbers
                    if (value === 'true') value = true
                    else if (value === 'false') value = false
                    else if (!isNaN(Number(value)) && value !== '') value = Number(value)
                    else {
                        // Try parsing as JSON for arrays/objects
                        try {
                            if (value.startsWith('[') || value.startsWith('{')) {
                                value = JSON.parse(value)
                            }
                        } catch (e) {
                            // Leave as string if not valid JSON
                        }
                    }

                    newSettings[item.key as keyof SystemSettings] = value
                })
                setSettings(newSettings)
            }
        } finally {
            setLoading(false)
        }
    }, [])

    const updateSetting = async (key: keyof SystemSettings, value: any) => {
        const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value)
        const { error } = await supabase
            .from('sys_settings')
            .upsert({ key, value: stringValue, updated_at: new Date().toISOString() })

        if (error) {
            console.error(`Error updating setting ${key}:`, error)
            throw error
        }

        setSettings(prev => ({ ...prev, [key]: value }))
    }

    useEffect(() => {
        fetchSettings()
    }, [fetchSettings])

    // Demo Mode Overrides
    const effectiveSettings = settings.is_demo_mode ? {
        ...settings,
        user_name: 'Karr',
        user_email: 'karr@karrtesian.com',
        // Preserve real profile picture if it exists, otherwise use a high-quality placeholder
        profile_picture_url: settings.profile_picture_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&q=80',
        schedule_type: 'mon-fri' as const,
        off_days: ['Friday', 'Saturday', 'Sunday'], // 4-day week
        shift_start_date: '2026-02-23'
    } : settings

    const contextValue = useMemo(() => ({
        settings: effectiveSettings,
        loading,
        updateSetting,
        refreshSettings: fetchSettings
    }), [effectiveSettings, loading, updateSetting, fetchSettings])

    return (
        <SystemSettingsContext.Provider value={contextValue}>
            {children}
        </SystemSettingsContext.Provider>
    )
}

export function useSystemSettings() {
    const context = useContext(SystemSettingsContext)
    if (context === undefined) {
        throw new Error('useSystemSettings must be used within a SystemSettingsProvider')
    }
    return context
}
