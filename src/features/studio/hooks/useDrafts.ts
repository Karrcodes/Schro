'use client'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { StudioDraft, NodeReference } from '../types/studio.types'

export function useDrafts(projectId?: string) {
    const [drafts, setDrafts] = useState<StudioDraft[]>([])
    const [loading, setLoading] = useState(true)

    const fetchDrafts = useCallback(async () => {
        setLoading(true)
        let query = supabase.from('studio_drafts').select('*').is('is_archived', false)
        if (projectId) query = query.eq('project_id', projectId)

        const { data, error } = await query.order('updated_at', { ascending: false })
        if (error) console.error('Fetch drafts error:', error.message)
        else setDrafts(data as StudioDraft[])
        setLoading(false)
    }, [projectId])

    useEffect(() => {
        fetchDrafts()
    }, [fetchDrafts])

    const createDraft = async (data: { title: string; project_id?: string; content_id?: string }) => {
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
