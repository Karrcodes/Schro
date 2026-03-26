import { useMemo } from 'react'
import { useStudioContext } from '../context/StudioContext'
import type { StudioDraft } from '../types/studio.types'

export function useDrafts(projectId?: string) {
    const { 
        drafts: allDrafts, 
        loading, 
        addDraft, 
        updateDraft, 
        deleteDraft, 
        refresh 
    } = useStudioContext()

    const drafts = useMemo(() => {
        if (!projectId) return allDrafts
        return allDrafts.filter(d => d.project_id === projectId)
    }, [allDrafts, projectId])

    const archiveDraft = async (id: string) => {
        return updateDraft(id, { is_archived: true })
    }

    const togglePin = async (id: string, currentPinned: boolean) => {
        return updateDraft(id, { pinned: !currentPinned })
    }

    return {
        drafts,
        loading,
        createDraft: addDraft,
        updateDraft,
        deleteDraft,
        archiveDraft,
        togglePin,
        refresh
    }
}
