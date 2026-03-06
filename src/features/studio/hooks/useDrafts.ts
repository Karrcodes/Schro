'use client'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useSystemSettings } from '@/features/system/contexts/SystemSettingsContext'
import { MOCK_STUDIO } from '@/lib/demoData'
import type { StudioDraft, NodeReference } from '../types/studio.types'

const LOCAL_STORAGE_KEY = 'schrö_demo_drafts_v1'

export function useDrafts(projectId?: string) {
    const [drafts, setDrafts] = useState<StudioDraft[]>([])
    const [loading, setLoading] = useState(true)
    const { settings } = useSystemSettings()

    const getSessionDrafts = useCallback(() => {
        if (typeof window === 'undefined') return null
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
        return stored ? JSON.parse(stored) : null
    }, [])

    const saveSessionDrafts = useCallback((data: StudioDraft[]) => {
        if (typeof window === 'undefined') return
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data))
    }, [])

    const fetchDrafts = useCallback(async () => {
        setLoading(true)
        if (settings.is_demo_mode) {
            let session = getSessionDrafts()
            if (!session) {
                session = MOCK_STUDIO.drafts || []
                saveSessionDrafts(session)
            }
            if (projectId) session = session.filter((d: any) => d.project_id === projectId)
            setDrafts(session)
            setLoading(false)
            return
        }
        let query = supabase.from('studio_drafts').select('*').is('is_archived', false)
        if (projectId) query = query.eq('project_id', projectId)

        const { data, error } = await query.order('updated_at', { ascending: false })
        if (error) console.error('Fetch drafts error:', error.message)
        else setDrafts(data as StudioDraft[])
        setLoading(false)
    }, [projectId, settings.is_demo_mode, getSessionDrafts, saveSessionDrafts])

    useEffect(() => {
        fetchDrafts()
    }, [fetchDrafts])

    const createDraft = async (data: { title: string; project_id?: string; content_id?: string }) => {
        if (settings.is_demo_mode) {
            const newDraft = {
                id: `demo-dr-${Date.now()}`,
                title: data.title,
                project_id: data.project_id,
                content_id: data.content_id,
                body: '',
                node_references: [],
                status: 'draft',
                is_archived: false,
                pinned: false,
                last_snapshot_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            } as StudioDraft

            const session = getSessionDrafts() || []
            const updated = [newDraft, ...session]
            saveSessionDrafts(updated)
            setDrafts(prev => [newDraft, ...prev])
            return newDraft
        }
        const { data: inserted, error } = await supabase
            .from('studio_drafts')
            .insert([{
                title: data.title,
                project_id: data.project_id,
                content_id: data.content_id,
                body: '',
                node_references: [],
                status: 'draft'
            }])
            .select()

        if (error) {
            console.error('Create draft error:', error.message)
            return null
        }
        const newDraft = inserted?.[0] as StudioDraft
        if (newDraft) setDrafts(prev => [newDraft, ...prev])
        return newDraft
    }

    const updateDraft = async (id: string, updates: Partial<StudioDraft>) => {
        if (settings.is_demo_mode) {
            const session = getSessionDrafts() || []
            const updated = session.map((d: any) => d.id === id ? { ...d, ...updates, updated_at: new Date().toISOString() } : d)
            saveSessionDrafts(updated)
            setDrafts(prev => prev.map(d => d.id === id ? updated.find((ud: any) => ud.id === id) : d))
            return updated.find((ud: any) => ud.id === id) as StudioDraft
        }
        const { data, error } = await supabase
            .from('studio_drafts')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()

        if (error) {
            console.error('Update draft error:', error.message)
            return null
        }
        const updated = data?.[0] as StudioDraft
        if (updated) setDrafts(prev => prev.map(d => d.id === id ? updated : d))
        return updated
    }

    const deleteDraft = async (id: string) => {
        if (settings.is_demo_mode) {
            const session = getSessionDrafts() || []
            const updated = session.filter((d: any) => d.id !== id)
            saveSessionDrafts(updated)
            setDrafts(prev => prev.filter(d => d.id !== id))
            return true
        }
        const { error } = await supabase.from('studio_drafts').delete().eq('id', id)
        if (error) {
            console.error('Delete draft error:', error.message)
            return false
        }
        setDrafts(prev => prev.filter(d => d.id !== id))
        return true
    }

    const archiveDraft = async (id: string) => {
        return updateDraft(id, { is_archived: true })
    }

    const togglePin = async (id: string, currentPinned: boolean) => {
        return updateDraft(id, { pinned: !currentPinned })
    }

    return {
        drafts,
        loading,
        createDraft,
        updateDraft,
        deleteDraft,
        archiveDraft,
        togglePin,
        refresh: fetchDrafts
    }
}
