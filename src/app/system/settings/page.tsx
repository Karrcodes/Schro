'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, User, Bell, Monitor, Shield, Save, Check, RefreshCw, Sun, Moon, Smartphone, Calendar, Upload, X as CloseIcon, Settings, Lock, Eye, EyeOff, Layout } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSystemSettings } from '@/features/system/contexts/SystemSettingsContext'
import { useFinanceProfile } from '@/features/finance/contexts/FinanceProfileContext'
import { KarrFooter } from '@/components/KarrFooter'
import { subscribeToPushNotifications, checkPushSubscription, unsubscribeFromPushNotifications } from '@/lib/notifications'
import { supabase } from '@/lib/supabase'
import DatePickerInput from '@/components/DatePickerInput'

export default function SettingsPage() {
    const router = useRouter()
    const { settings, updateSetting, loading: contextLoading, refreshSettings } = useSystemSettings()
    const { isPrivacyEnabled, togglePrivacy, globalRefresh } = useFinanceProfile()
    const [isSaving, setIsSaving] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [saveSuccess, setSaveSuccess] = useState(false)
    const [isSubscribed, setIsSubscribed] = useState(false)
    const [checkingSubscription, setCheckingSubscription] = useState(true)

    // Local state for form fields
    const [userName, setUserName] = useState(settings.user_name || '')
    const [userEmail, setUserEmail] = useState(settings.user_email || '')
    const [profilePic, setProfilePic] = useState(settings.profile_picture_url || '')
    const [networkReachOutDays, setNetworkReachOutDays] = useState(settings.network_reach_out_days || 30)
    const [offDays, setOffDays] = useState<string[]>(settings.off_days || [])
    const [scheduleType, setScheduleType] = useState<'mon-fri' | 'shift'>(settings.schedule_type || 'mon-fri')
    const [shiftOn, setShiftOn] = useState(settings.shift_on_days || 3)
    const [shiftOff, setShiftOff] = useState(settings.shift_off_days || 3)
    const [shiftStart, setShiftStart] = useState(settings.shift_start_date || '')
    const [authorizedDevices, setAuthorizedDevices] = useState<any[]>([])
    const [fetchingDevices, setFetchingDevices] = useState(false)

    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

    // Sync local state when context settings load
    useEffect(() => {
        setUserName(settings.user_name || '')
        setUserEmail(settings.user_email || '')
        setProfilePic(settings.profile_picture_url || '')
        setNetworkReachOutDays(settings.network_reach_out_days || 30)
        setOffDays(settings.off_days || [])
        setScheduleType(settings.schedule_type || 'mon-fri')
        setShiftOn(settings.shift_on_days || 3)
        setShiftOff(settings.shift_off_days || 3)
        setShiftStart(settings.shift_start_date || '')

        // CHECK PUSH STATUS
        const checkPush = async () => {
            const subscribed = await checkPushSubscription()
            setIsSubscribed(subscribed)
            setCheckingSubscription(false)
        }
        checkPush()
        fetchDevices()
    }, [settings])

    const fetchDevices = async () => {
        setFetchingDevices(true)
        const { data } = await supabase
            .from('fin_authorized_devices')
            .select('*')
            .order('last_used_at', { ascending: false })
        if (data) setAuthorizedDevices(data)
        setFetchingDevices(false)
    }

    const revokeDevice = async (deviceId: string) => {
        const { error } = await supabase
            .from('fin_authorized_devices')
            .delete()
            .eq('device_id', deviceId)

        if (!error) {
            setAuthorizedDevices(prev => prev.filter(d => d.device_id !== deviceId))
            // If current device, force reload
            if (typeof window !== 'undefined' && localStorage.getItem('schro_shield_id') === deviceId) {
                localStorage.removeItem('schro_unlocked')
                localStorage.removeItem('schro_shield_id')
                window.location.reload()
            }
        }
    }

    const handleSaveProfile = async () => {
        setIsSaving(true)
        try {
            await Promise.all([
                updateSetting('user_name', userName),
                updateSetting('user_email', userEmail),
                updateSetting('profile_picture_url', profilePic),
                updateSetting('network_reach_out_days', networkReachOutDays)
            ])

            await refreshSettings()
            setSaveSuccess(true)
            setTimeout(() => setSaveSuccess(false), 2000)
        } catch (error) {
            console.error('Failed to save profile:', error)
            alert('Failed to save profile.')
        } finally {
            setIsSaving(false)
        }
    }

    const handleSaveSchedule = async () => {
        setIsSaving(true)
        try {
            await Promise.all([
                updateSetting('off_days', offDays),
                updateSetting('schedule_type', scheduleType),
                updateSetting('shift_on_days', shiftOn),
                updateSetting('shift_off_days', shiftOff),
                updateSetting('shift_start_date', shiftStart)
            ])

            await refreshSettings()
            setSaveSuccess(true)
            setTimeout(() => setSaveSuccess(false), 2000)
        } catch (error) {
            console.error('Failed to save schedule:', error)
            alert('Failed to save schedule settings.')
        } finally {
            setIsSaving(false)
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `avatar-${Date.now()}.${fileExt}`
            const filePath = `avatars/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('system')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('system')
                .getPublicUrl(filePath)

            setProfilePic(publicUrl)
            await updateSetting('profile_picture_url', publicUrl)
        } catch (error: any) {
            console.error('Upload error:', error)
            alert(`Upload failed: ${error.message}`)
        } finally {
            setIsUploading(false)
        }
    }

    const toggleOffDay = (day: string) => {
        setOffDays(prev =>
            prev.includes(day)
                ? prev.filter(d => d !== day)
                : [...prev, day]
        )
    }

    const toggleNotification = async (key: string, current: boolean) => {
        try {
            const nextValue = !current
            await updateSetting(key as any, nextValue)

            // Auto-disable others if transactions are disabled
            if (key === 'notification_transactions' && nextValue === false) {
                const togglesToDisable = [
                    'notification_low_balance',
                    'notification_large_transaction',
                    'notification_bank_sync',
                    'notification_goal_milestone',
                    'notification_reminders'
                ]
                await Promise.all(togglesToDisable.map(t => updateSetting(t as any, false)))
            }
        } catch (error) {
            console.error(`Failed to toggle ${key}:`, error)
        }
    }

    const toggleDemoMode = async () => {
        const next = !settings.is_demo_mode
        try {
            await updateSetting('is_demo_mode', next)
            globalRefresh()
        } catch (error) {
            console.error('Failed to toggle demo mode:', error)
        }
    }

    const clearPushSubscriptions = async () => {
        if (!confirm('Are you sure? This will stop notifications on ALL your devices until you re-enable them.')) return
        setIsSaving(true)
        try {
            // 1. Unsubscribe from current browser first
            await unsubscribeFromPushNotifications()

            // 2. Wipe from server
            const { error } = await supabase.from('sys_push_subscriptions').delete().eq('user_id', 'karr')
            if (error) throw error

            setIsSubscribed(false)
            alert('All devices cleared. Please click "Enable" to re-register this device.')
        } catch (err: any) {
            alert(`Failed to clear: ${err.message}`)
        } finally {
            setIsSaving(false)
        }
    }

    if (contextLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-[#fafafa]">
                <RefreshCw className="w-6 h-6 text-black/20 animate-spin" />
            </div>
        )
    }

    return (
        <div className="h-screen bg-[#fafafa] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-white border-b border-black/[0.06] px-4 py-4 z-20 shadow-sm flex-shrink-0">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-black/[0.03] flex items-center justify-center hover:bg-black/[0.06] transition-colors">
                            <ArrowLeft className="w-4 h-4 text-black/40" />
                        </button>
                        <div>
                            <h1 className="text-[18px] font-bold text-black tracking-tight">System Settings</h1>
                            <p className="text-[11px] text-black/35 mt-0.5">Manage your Schrö preferences</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-4 sm:p-6">
                <div className="w-full max-w-4xl mx-auto flex-1 space-y-6">

                    {settings.is_demo_mode && (
                        <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center shrink-0">
                                    <Smartphone className="w-5 h-5 text-orange-600" />
                                </div>
                                <div>
                                    <p className="text-[14px] font-bold text-orange-700">Demo Mode Active</p>
                                    <p className="text-[11px] text-orange-700/60 font-medium">Real data is hidden. Showing professional persona for {settings.user_name}.</p>
                                </div>
                            </div>
                            <button
                                onClick={toggleDemoMode}
                                className="px-4 py-2 bg-orange-500 text-white text-[11px] font-bold rounded-lg hover:bg-orange-600 transition-colors"
                            >
                                Disable
                            </button>
                        </div>
                    )}

                    {/* Profile Section */}
                    <section className="bg-white rounded-3xl border border-black/[0.06] shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="px-6 py-4 border-b border-black/[0.04] bg-black/[0.01] flex items-center gap-2">
                            <User className="w-4 h-4 text-black/40" />
                            <h2 className="text-[13px] font-bold text-black uppercase tracking-wider">Profile Management</h2>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                                <div className="w-20 h-20 rounded-3xl bg-black/5 border border-black/10 flex items-center justify-center shrink-0 overflow-hidden relative group">
                                    {profilePic ? (
                                        <>
                                            <img src={profilePic} alt="Avatar" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <label className="cursor-pointer p-2">
                                                    <Upload className="w-5 h-5 text-white" />
                                                    <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={isUploading} />
                                                </label>
                                            </div>
                                        </>
                                    ) : (
                                        <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-black/10 transition-colors">
                                            {isUploading ? <RefreshCw className="w-6 h-6 text-black/20 animate-spin" /> : <Upload className="w-6 h-6 text-black/20" />}
                                            <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={isUploading} />
                                        </label>
                                    )}
                                </div>
                                <div className="flex-1 space-y-4 w-full">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-black/40 ml-1">Display Name</label>
                                            <input
                                                type="text"
                                                value={userName}
                                                onChange={(e) => setUserName(e.target.value)}
                                                className="w-full bg-black/[0.03] border border-black/[0.06] rounded-xl px-4 py-2 text-[13px] outline-none focus:border-black/30 transition-colors"
                                            />
                                        </div>
                                        <div className="space-y-1.5 min-w-0">
                                            <label className="text-[11px] font-bold text-black/40 ml-1">Email Address</label>
                                            <input
                                                type="email"
                                                value={userEmail}
                                                onChange={(e) => setUserEmail(e.target.value)}
                                                className="w-full bg-black/[0.03] border border-black/[0.06] rounded-xl px-4 py-2 text-[13px] outline-none focus:border-black/30 transition-colors"
                                            />
                                        </div>
                                        <div className="space-y-1.5 col-span-1 sm:col-span-2">
                                            <label className="text-[11px] font-bold text-black/40 ml-1">Network Reach Out Threshold (Days)</label>
                                            <input
                                                type="number"
                                                value={networkReachOutDays}
                                                onChange={(e) => setNetworkReachOutDays(parseInt(e.target.value) || 30)}
                                                className="w-full bg-black/[0.03] border border-black/[0.06] rounded-xl px-4 py-2 text-[13px] outline-none focus:border-black/30 transition-colors"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end">
                                        <button
                                            onClick={handleSaveProfile}
                                            disabled={isSaving}
                                            className="bg-black text-white px-6 py-2 rounded-xl text-[13px] font-bold hover:bg-black/80 transition-all flex items-center gap-2 shadow-lg shadow-black/10 active:scale-95"
                                        >
                                            {saveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                                            {saveSuccess ? 'Saved!' : 'Save changes'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Notifications Section */}
                    <section className="bg-white rounded-3xl border border-black/[0.06] shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '100ms' }}>
                        <div className="px-6 py-4 border-b border-black/[0.04] bg-black/[0.01] flex items-center gap-2">
                            <Bell className="w-4 h-4 text-black/40" />
                            <h2 className="text-[13px] font-bold text-black uppercase tracking-wider">Notifications</h2>
                        </div>
                        <div className="divide-y divide-black/[0.04]">
                            <NotificationToggle
                                label="Low Balance Alerts"
                                description="Get notified when a pocket drops below £10."
                                active={settings.notification_low_balance}
                                onToggle={() => toggleNotification('notification_low_balance', settings.notification_low_balance)}
                            />
                            <NotificationToggle
                                label="Large Transactions"
                                description="Alert for any transaction over £500."
                                active={settings.notification_large_transaction}
                                onToggle={() => toggleNotification('notification_large_transaction', settings.notification_large_transaction)}
                            />
                            <NotificationToggle
                                label="Monzo Transactions"
                                description="Real-time alerts for every Monzo spend and income event."
                                active={settings.notification_transactions}
                                onToggle={() => toggleNotification('notification_transactions', settings.notification_transactions)}
                            />
                            <NotificationToggle
                                label="Bank Sync Status"
                                description="Get notified when a bank sync completes or has an issue."
                                active={settings.notification_bank_sync}
                                onToggle={() => toggleNotification('notification_bank_sync', settings.notification_bank_sync)}
                            />
                            <NotificationToggle
                                label="Goal Milestones"
                                description="Alerts when you hit major savings goal progress markers."
                                active={settings.notification_goal_milestone}
                                onToggle={() => toggleNotification('notification_goal_milestone', settings.notification_goal_milestone)}
                            />
                            <NotificationToggle
                                label="Weekend & Daily Reminders"
                                description="Strategic finance check-ins and routine reminders."
                                active={settings.notification_reminders}
                                onToggle={() => toggleNotification('notification_reminders', settings.notification_reminders)}
                            />
                        </div>
                        <div className="p-6 bg-black/[0.02]">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white border border-black/[0.06] flex items-center justify-center shadow-sm">
                                        <Smartphone className="w-5 h-5 text-black/40" />
                                    </div>
                                    <div>
                                        <p className="text-[13px] font-bold text-black">Device Notifications</p>
                                        <p className="text-[11px] text-black/35 font-medium">Receive real-time alerts on this browser.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={async () => {
                                        if (isSubscribed) {
                                            const res = await unsubscribeFromPushNotifications()
                                            if (res.success) setIsSubscribed(false)
                                        } else {
                                            const res = await subscribeToPushNotifications()
                                            if (res.success) setIsSubscribed(true)
                                        }
                                    }}
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-[11px] font-bold transition-all border",
                                        isSubscribed ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-black text-white border-black"
                                    )}
                                >
                                    {isSubscribed ? 'Enabled' : 'Enable'}
                                </button>
                                {isSubscribed && (
                                    <button
                                        onClick={clearPushSubscriptions}
                                        disabled={isSaving}
                                        className="px-4 py-2 rounded-xl text-[11px] font-bold text-red-500 hover:bg-red-50 transition-all border border-transparent"
                                    >
                                        Clear All Devices
                                    </button>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Schedule & Work Section */}
                    <section className="bg-white rounded-3xl border border-black/[0.06] shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '200ms' }}>
                        <div className="px-6 py-4 border-b border-black/[0.04] bg-black/[0.01] flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-black/40" />
                            <h2 className="text-[13px] font-bold text-black uppercase tracking-wider">Schedule Configuration</h2>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="flex bg-black/[0.03] p-1 rounded-xl border border-black/[0.06]">
                                <button
                                    onClick={() => setScheduleType('mon-fri')}
                                    className={cn(
                                        "flex-1 py-2 rounded-lg text-[11px] font-bold transition-all",
                                        scheduleType === 'mon-fri' ? "bg-white text-black shadow-sm" : "text-black/40 hover:text-black/60"
                                    )}
                                >
                                    Fixed (Mon-Fri)
                                </button>
                                <button
                                    onClick={() => setScheduleType('shift')}
                                    className={cn(
                                        "flex-1 py-2 rounded-lg text-[11px] font-bold transition-all",
                                        scheduleType === 'shift' ? "bg-white text-black shadow-sm" : "text-black/40 hover:text-black/60"
                                    )}
                                >
                                    Rotating Shift
                                </button>
                            </div>

                            {scheduleType === 'mon-fri' ? (
                                <div className="space-y-3">
                                    <p className="text-[12px] font-bold text-black/40 ml-1 uppercase tracking-wider">Off-Day Selection</p>
                                    <div className="flex flex-wrap gap-2">
                                        {daysOfWeek.map(day => (
                                            <button
                                                key={day}
                                                onClick={() => toggleOffDay(day)}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border",
                                                    offDays.includes(day) ? "bg-black text-white border-black" : "bg-black/[0.02] text-black/40 border-black/[0.06]"
                                                )}
                                            >
                                                {day.slice(0, 3)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-black/40 ml-1">Days ON</label>
                                            <input
                                                type="number"
                                                value={shiftOn}
                                                onChange={(e) => setShiftOn(parseInt(e.target.value) || 0)}
                                                className="w-full bg-black/[0.03] border border-black/[0.06] rounded-xl px-4 py-2 text-[13px]"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-black/40 ml-1">Days OFF</label>
                                            <input
                                                type="number"
                                                value={shiftOff}
                                                onChange={(e) => setShiftOff(parseInt(e.target.value) || 0)}
                                                className="w-full bg-black/[0.03] border border-black/[0.06] rounded-xl px-4 py-2 text-[13px]"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-black/40 ml-1">Pattern Anchor Date</label>
                                        <DatePickerInput
                                            value={shiftStart}
                                            onChange={val => setShiftStart(val)}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end pt-2">
                                <button
                                    onClick={handleSaveSchedule}
                                    disabled={isSaving}
                                    className="bg-black text-white px-6 py-2 rounded-xl text-[13px] font-bold hover:bg-black/80 transition-all flex items-center gap-2 active:scale-95"
                                >
                                    {saveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                                    {saveSuccess ? 'Saved!' : 'Save Schedule'}
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* App Appearance Section */}
                    <section className="bg-white rounded-3xl border border-black/[0.06] shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '300ms' }}>
                        <div className="px-6 py-4 border-b border-black/[0.04] bg-black/[0.01] flex items-center gap-2">
                            <Monitor className="w-4 h-4 text-black/40" />
                            <h2 className="text-[13px] font-bold text-black uppercase tracking-wider">Appearance & Privacy</h2>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <ThemeOption icon={<Monitor className="w-5 h-5" />} label="System" active={settings.theme === 'system'} onClick={() => updateSetting('theme', 'system')} />
                                <ThemeOption icon={<Sun className="w-5 h-5" />} label="Light" active={settings.theme === 'light'} onClick={() => updateSetting('theme', 'light')} />
                                <ThemeOption icon={<Moon className="w-5 h-5" />} label="Dark" active={settings.theme === 'dark'} onClick={() => updateSetting('theme', 'dark')} />
                                <ThemeOption icon={isPrivacyEnabled ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />} label="Privacy" active={isPrivacyEnabled} onClick={togglePrivacy} />
                            </div>

                            <div className="h-px bg-black/[0.04]" />

                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[14px] font-bold text-black flex items-center gap-2">
                                        <Shield className={cn("w-4 h-4", settings.is_demo_mode ? "text-purple-600" : "text-black/20")} />
                                        Demo Mode
                                    </p>
                                    <p className="text-[11px] text-black/35 font-medium">Scrub sensitive GTV and finance data for presentations.</p>
                                </div>
                                <button
                                    onClick={toggleDemoMode}
                                    className={cn(
                                        "w-11 h-6 rounded-full transition-all duration-300 relative shrink-0",
                                        settings.is_demo_mode ? "bg-purple-600" : "bg-black/10"
                                    )}
                                >
                                    <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm", settings.is_demo_mode ? "left-6" : "left-1")} />
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Security Section */}
                    <section className="bg-white rounded-3xl border border-black/[0.06] shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '400ms' }}>
                        <div className="px-6 py-4 border-b border-black/[0.04] bg-black/[0.01] flex items-center gap-2">
                            <Shield className="w-4 h-4 text-black/40" />
                            <h2 className="text-[13px] font-bold text-black uppercase tracking-wider">Security & Access</h2>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[14px] font-bold text-black">Authorized Terminals</p>
                                    <p className="text-[11px] text-black/35 font-medium">Manage devices that can access your Schrö.</p>
                                </div>
                                <button onClick={fetchDevices} className="p-2 hover:bg-black/5 rounded-lg transition-colors">
                                    <RefreshCw className={cn("w-4 h-4 text-black/20", fetchingDevices && "animate-spin")} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {authorizedDevices.map((device) => {
                                    const isCurrent = typeof window !== 'undefined' && device.device_id === localStorage.getItem('schro_shield_id')
                                    return (
                                        <div key={device.id} className={cn(
                                            "p-4 rounded-2xl border flex items-center justify-between group",
                                            isCurrent ? "bg-black/[0.02] border-black" : "bg-black/5 border-transparent"
                                        )}>
                                            <div className="flex items-center gap-3">
                                                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", isCurrent ? "bg-black text-white" : "bg-black/10")}>
                                                    <Smartphone className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-[12px] font-bold">{device.device_name || 'Generic Terminal'}</p>
                                                    <p className="text-[10px] opacity-40">Last used {new Date(device.last_used_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => revokeDevice(device.device_id)}
                                                className="p-2 text-black/20 hover:text-red-500 transition-colors"
                                            >
                                                <CloseIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>

                            <div className="h-px bg-black/[0.04]" />

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <p className="text-[13px] font-bold text-red-600">Danger Zone</p>
                                    <p className="text-[11px] text-black/35 font-medium">Clear local session and force system relock.</p>
                                </div>
                                <button
                                    onClick={() => {
                                        if (confirm('Force logout and reset session?')) {
                                            localStorage.clear()
                                            window.location.reload()
                                        }
                                    }}
                                    className="px-4 py-2 rounded-xl bg-red-50 text-red-600 text-[11px] font-bold hover:bg-red-600 hover:text-white transition-all border border-red-100"
                                >
                                    Reset Session
                                </button>
                            </div>
                        </div>
                    </section>
                </div>
                <KarrFooter />
            </div >
        </div >
    )
}

function ThemeOption({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all",
                active ? "bg-black text-white border-black shadow-lg" : "bg-black/[0.02] text-black/40 border-black/[0.06] hover:bg-black/[0.05]"
            )}
        >
            {icon}
            <span className="text-[11px] font-bold uppercase tracking-wider">{label}</span>
        </button>
    )
}

function NotificationToggle({ label, description, active, onToggle }: { label: string, description: string, active: boolean, onToggle: () => void }) {
    return (
        <div className="p-6 flex items-center justify-between">
            <div className="min-w-0 pr-4">
                <p className="text-[14px] font-bold text-black">{label}</p>
                <p className="text-[11px] text-black/35 font-medium">{description}</p>
            </div>
            <button
                onClick={onToggle}
                className={cn(
                    "w-11 h-6 rounded-full transition-all duration-300 relative shrink-0",
                    active ? "bg-black" : "bg-black/10"
                )}
            >
                <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm", active ? "left-6" : "left-1")} />
            </button>
        </div>
    )
}
