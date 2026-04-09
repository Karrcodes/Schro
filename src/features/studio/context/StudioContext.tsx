'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { StudioProject, StudioSpark, StudioMilestone, StudioContent, StudioPress, StudioNetwork, StudioDraft, NodeReference } from '../types/studio.types'
import { useSystemSettings } from '@/features/system/contexts/SystemSettingsContext'
import { MOCK_STUDIO } from '@/lib/demoData'
import { isTauri } from '@/lib/utils'
import { LocalStudioService } from '../services/localStudioService'
import { useAuth } from '@/contexts/AuthContext'

interface StudioContextType {
    projects: StudioProject[]
    sparks: StudioSpark[]
    milestones: StudioMilestone[]
    content: StudioContent[]
    drafts: StudioDraft[]
    loading: boolean
    error: string | null
    refresh: () => Promise<{ projects: StudioProject[], sparks: StudioSpark[], milestones: StudioMilestone[], content: StudioContent[], press: StudioPress[], networks: StudioNetwork[], drafts: StudioDraft[] } | null | undefined>
    addProject: (project: Partial<StudioProject>, initialMilestones?: { title: string; impact_score?: number; category?: string; target_date?: string }[], coverFile?: File) => Promise<StudioProject>
    updateProject: (id: string, updates: Partial<StudioProject>, coverFile?: File) => Promise<StudioProject>
    deleteProject: (id: string) => Promise<void>
    addSpark: (spark: Partial<StudioSpark>) => Promise<StudioSpark>
    updateSpark: (id: string, updates: Partial<StudioSpark>) => Promise<StudioSpark>
    deleteSpark: (id: string) => Promise<void>
    addMilestone: (milestone: Partial<StudioMilestone>) => Promise<StudioMilestone>
    updateMilestone: (id: string, updates: Partial<StudioMilestone>) => Promise<StudioMilestone>
    deleteMilestone: (id: string) => Promise<void>
    addContent: (item: Partial<StudioContent>) => Promise<StudioContent>
    updateContent: (id: string, updates: Partial<StudioContent>) => Promise<StudioContent>
    deleteContent: (id: string) => Promise<void>
    press: StudioPress[]
    addPress: (item: Partial<StudioPress>, coverFile?: File) => Promise<StudioPress>
    updatePress: (id: string, updates: Partial<StudioPress>, coverFile?: File) => Promise<StudioPress>
    deletePress: (id: string) => Promise<void>
    networks: StudioNetwork[]
    addNetwork: (item: Partial<StudioNetwork>) => Promise<StudioNetwork>
    updateNetwork: (id: string, updates: Partial<StudioNetwork>) => Promise<StudioNetwork>
    deleteNetwork: (id: string) => Promise<void>
    addDraft: (data: Partial<StudioDraft>) => Promise<StudioDraft | null>
    updateDraft: (id: string, updates: Partial<StudioDraft>) => Promise<StudioDraft | null>
    deleteDraft: (id: string) => Promise<boolean>
    regenerateProjectCover: (id: string) => Promise<void>
    regenerateContentCover: (id: string) => Promise<void>
    regeneratePressCover: (id: string) => Promise<void>
    generatingProjectIds: string[]
    generatingContentIds: string[]
    generatingPressIds: string[]
    debugLogs: { msg: string; type: 'info' | 'error' | 'success'; time: string }[]
    addDebugLog: (msg: string, type?: 'info' | 'error' | 'success') => void
    stageItem: (id: string, type: 'project' | 'press' | 'content' | 'draft', staged: boolean, stageData?: Record<string, any>) => Promise<void>
}

const StudioContext = createContext<StudioContextType | undefined>(undefined)

const LOCAL_STORAGE_KEY = 'schrö_demo_studio_v2'

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = error => reject(error)
    })
}

export function StudioProvider({ children }: { children: React.ReactNode }) {
    const { settings } = useSystemSettings()
    const { user } = useAuth()
    const [projects, setProjects] = useState<StudioProject[]>([])
    const [sparks, setSparks] = useState<StudioSpark[]>([])
    const [milestones, setMilestones] = useState<StudioMilestone[]>([])
    const [content, setContent] = useState<StudioContent[]>([])
    const [press, setPress] = useState<StudioPress[]>([])
    const [networks, setNetworks] = useState<StudioNetwork[]>([])
    const [drafts, setDrafts] = useState<StudioDraft[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [generatingProjectIds, setGeneratingProjectIds] = useState<string[]>([])
    const [generatingContentIds, setGeneratingContentIds] = useState<string[]>([])
    const [generatingPressIds, setGeneratingPressIds] = useState<string[]>([])
    const [debugLogs, setDebugLogs] = useState<{ msg: string; type: 'info' | 'error' | 'success'; time: string }[]>([])

    const addDebugLog = (msg: string, type: 'info' | 'error' | 'success' = 'info') => {
        setDebugLogs(prev => [{ msg, type, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 50))
    }

    const getSessionStudio = useCallback(() => {
        try {
            if (typeof window === 'undefined') return null
            const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
            if (stored) return JSON.parse(stored)
        } catch (e) {
            console.error('Failed to load studio from local storage', e)
        }
        return null
    }, [])

    const saveSessionStudio = useCallback((data: any) => {
        try {
            if (typeof window === 'undefined') return
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data))
        } catch (e) {
            console.error('Failed to save studio to local storage', e)
        }
    }, [])

    const fetchData = useCallback(async () => {
        if (settings.is_demo_mode) {
            let sessionData = getSessionStudio()
            if (!sessionData) {
                sessionData = {
                    projects: MOCK_STUDIO.projects,
                    content: MOCK_STUDIO.content,
                    press: MOCK_STUDIO.press,
                    sparks: [],
                    milestones: [],
                    networks: [],
                    drafts: MOCK_STUDIO.drafts || []
                }
                saveSessionStudio(sessionData)
            }

            setProjects(sessionData.projects as any)
            setContent(sessionData.content as any)
            setPress(sessionData.press as any)
            setMilestones(sessionData.milestones as any)
            setNetworks(sessionData.networks as any)
            setDrafts(sessionData.drafts || [])
            setSparks(sessionData.sparks || [])

            setLoading(false)
            return
        }

        // --- LOCAL FIRST STRATEGY (TAURI) ---
        if (isTauri()) {
            const [locP, locS, locM, locD, locN, locC, locPr] = await Promise.all([
                LocalStudioService.getProjects(),
                LocalStudioService.getSparks(),
                LocalStudioService.getMilestones(),
                LocalStudioService.getDrafts(),
                LocalStudioService.getNetworks(),
                LocalStudioService.getContent(),
                LocalStudioService.getPress()
            ])
            if (locP.length > 0) setProjects(locP)
            if (locS.length > 0) setSparks(locS)
            if (locM.length > 0) setMilestones(locM)
            if (locD.length > 0) setDrafts(locD)
            if (locN.length > 0) setNetworks(locN)
            if (locC.length > 0) setContent(locC)
            if (locPr.length > 0) setPress(locPr)
            
            if (locP.length === 0) setLoading(true)
            
            // Background Sync
            const [projectsRes, sparksRes, milestonesRes, contentRes, pressRes, networksRes, draftsRes] = await Promise.all([
                supabase.from('studio_projects').select('*').order('created_at', { ascending: false }),
                supabase.from('studio_sparks').select('*').order('created_at', { ascending: false }),
                supabase.from('studio_milestones').select('*').order('created_at', { ascending: true }),
                supabase.from('studio_content').select('*').order('created_at', { ascending: false }),
                supabase.from('studio_press').select('*').order('created_at', { ascending: false }),
                supabase.from('studio_networks').select('*').order('created_at', { ascending: false }),
                supabase.from('studio_drafts').select('*').is('is_archived', false).order('updated_at', { ascending: false })
            ])

            if (!projectsRes.error && projectsRes.data) {
                await LocalStudioService.syncProjects(projectsRes.data)
                setProjects(projectsRes.data)
            }
            if (!sparksRes.error && sparksRes.data) {
                await LocalStudioService.syncSparks(sparksRes.data)
                setSparks(sparksRes.data)
            }
            if (!milestonesRes.error && milestonesRes.data) {
                await LocalStudioService.syncMilestones(milestonesRes.data)
                setMilestones(milestonesRes.data)
            }
            if (!draftsRes.error && draftsRes.data) {
                await LocalStudioService.syncDrafts(draftsRes.data)
                setDrafts(draftsRes.data)
            }
            if (!networksRes.error && networksRes.data) {
                await LocalStudioService.syncNetworks(networksRes.data)
                setNetworks(networksRes.data)
            }
            if (!contentRes.error && contentRes.data) {
                await LocalStudioService.syncContent(contentRes.data)
                setContent(contentRes.data)
            }
            if (!pressRes.error && pressRes.data) {
                await LocalStudioService.syncPress(pressRes.data)
                setPress(pressRes.data)
            }
            if (!draftsRes.error && draftsRes.data) {
                setDrafts(draftsRes.data)
            }

            setLoading(false)
            return
        }

        // --- STANDARD WEB STRATEGY ---
        try {
            setLoading(true)
            const [projectsRes, sparksRes, milestonesRes, contentRes, pressRes, networksRes, draftsRes] = await Promise.all([
                supabase.from('studio_projects').select('*').order('created_at', { ascending: false }),
                supabase.from('studio_sparks').select('*').order('created_at', { ascending: false }),
                supabase.from('studio_milestones').select('*').order('created_at', { ascending: true }),
                supabase.from('studio_content').select('*').order('created_at', { ascending: false }),
                supabase.from('studio_press').select('*').order('created_at', { ascending: false }),
                supabase.from('studio_networks').select('*').order('created_at', { ascending: false }),
                supabase.from('studio_drafts').select('*').is('is_archived', false).order('updated_at', { ascending: false })
            ])

            if (projectsRes.error) throw projectsRes.error
            if (sparksRes.error) throw sparksRes.error
            if (milestonesRes.error) throw milestonesRes.error
            if (contentRes.error) throw contentRes.error
            if (pressRes.error) throw pressRes.error
            if (networksRes.error) throw networksRes.error
            if (draftsRes.error) throw draftsRes.error

            setProjects(projectsRes.data || [])
            setSparks(sparksRes.data || [])
            setMilestones(milestonesRes.data || [])
            setContent(contentRes.data || [])
            setPress(pressRes.data || [])
            setNetworks(networksRes.data || [])
            setDrafts(draftsRes.data || [])
            setError(null)
            return {
                projects: projectsRes.data || [],
                sparks: sparksRes.data || [],
                milestones: milestonesRes.data || [],
                content: contentRes.data || [],
                press: pressRes.data || [],
                networks: networksRes.data || [],
                drafts: draftsRes.data || []
            }
        } catch (err: any) {
            console.error('Error fetching studio data:', err)
            setError(err.message)
            return null
        } finally {
            setLoading(false)
        }
    }, [settings.is_demo_mode, getSessionStudio, saveSessionStudio, user?.id])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const addProject = async (project: Partial<StudioProject>, initialMilestones?: { title: string; impact_score?: number; category?: string; target_date?: string }[], coverFile?: File) => {
        if (settings.is_demo_mode) {
            let cover_url = project.cover_url
            if (coverFile) {
                try {
                    cover_url = await fileToBase64(coverFile)
                } catch (e) {
                    console.error('Failed to convert cover image', e)
                }
            }

            const newProject: StudioProject = {
                ...project,
                id: `demo-p-${Date.now()}`,
                created_at: new Date().toISOString(),
                status: project.status || 'active',
                type: project.type || 'Technology',
                cover_url: cover_url || project.cover_url
            } as StudioProject
            const session = getSessionStudio()
            const updated = { ...session, projects: [newProject, ...(session.projects || [])] }
            saveSessionStudio(updated)
            setProjects(updated.projects)
            return newProject
        }

        let finalCoverUrl = project.cover_url;

        if (coverFile) {
            const fileExt = coverFile.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2, 11)}_${Date.now()}.${fileExt}`;
            const filePath = `project-covers/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('studio-assets')
                .upload(filePath, coverFile);

            if (uploadError) throw new Error(`Failed to upload cover image: ${uploadError.message}`);

            const { data: urlData } = supabase.storage.from('studio-assets').getPublicUrl(filePath);
            finalCoverUrl = urlData.publicUrl;
        }

        const sanitizedProject = { ...project, cover_url: finalCoverUrl }
        if (sanitizedProject.target_date === '') sanitizedProject.target_date = null as any

        const { data: projectData, error: projectError } = await supabase
            .from('studio_projects')
            .insert([sanitizedProject])
            .select()
            .single();

        if (projectError) throw projectError;
        if (!projectData) throw new Error('No data returned from project creation');

        if (initialMilestones && initialMilestones.length > 0) {
            const milestonesToInsert = initialMilestones.map(m => ({
                project_id: projectData.id,
                title: m.title,
                impact_score: m.impact_score || 5,
                category: m.category,
                target_date: m.target_date,
                status: (m as any).status || 'pending',
            }));

            const { data: msData, error: msError } = await supabase
                .from('studio_milestones')
                .insert(milestonesToInsert)
                .select();

            if (msError) console.error('Error inserting initial milestones:', msError);
            if (msData) setMilestones(prev => [...prev, ...msData]);
        }

        setProjects(prev => [projectData, ...prev]);

        // Trigger AI cover generation if no image provided
        if (!finalCoverUrl && projectData.id) {
            const newId = projectData.id;
            setGeneratingProjectIds(prev => [...prev, newId]);
            
            fetch(`/api/studio/cover?title=${encodeURIComponent(projectData.title)}&tagline=${encodeURIComponent(projectData.tagline || '')}&type=project&id=${newId}&json=true`)
                .finally(() => {
                    fetchData().finally(() => {
                        setGeneratingProjectIds(prev => prev.filter(id => id !== newId));
                    });
                });
        }

        return projectData;
    };

    const updateProject = async (id: string, updates: Partial<StudioProject>, coverFile?: File) => {
        if (settings.is_demo_mode) {
            let cover_url = updates.cover_url
            if (coverFile) {
                try {
                    cover_url = await fileToBase64(coverFile)
                } catch (e) {
                    console.error('Failed to convert cover image', e)
                }
            }
            const session = getSessionStudio()
            const updatedProjects = session.projects.map((p: any) => p.id === id ? {
                ...p,
                ...updates,
                cover_url: cover_url !== undefined ? cover_url : p.cover_url
            } : p)
            const updated = { ...session, projects: updatedProjects }
            saveSessionStudio(updated)
            setProjects(updatedProjects)
            return updatedProjects.find((p: any) => p.id === id)
        }

        let finalUpdates = { ...updates };

        if (coverFile) {
            const fileExt = coverFile.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2, 11)}_${Date.now()}.${fileExt}`;
            const filePath = `project-covers/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('studio-assets')
                .upload(filePath, coverFile);

            if (!uploadError) {
                const { data: urlData } = supabase.storage.from('studio-assets').getPublicUrl(filePath);
                finalUpdates.cover_url = urlData.publicUrl;
            }
        }

        if (finalUpdates.target_date === '') finalUpdates.target_date = null as any

        if (!finalUpdates || Object.keys(finalUpdates).length === 0) return projects.find(p => p.id === id)!;
        const { data, error } = await supabase.from('studio_projects').update(finalUpdates).eq('id', id).select();
        if (error) throw error;
        const updated = data?.[0];
        if (!updated) throw new Error('Update failed');
        setProjects(prev => prev.map(p => p.id === id ? updated : p));

        // Trigger AI cover generation if content that informs the visual changed,
        // and we still don't have an image.
        const isContentUpdate = updates.title !== undefined || updates.type !== undefined || updates.tagline !== undefined;
        if (!updated.cover_url && isContentUpdate) {
            setGeneratingProjectIds(prev => [...prev, id]);
            fetch(`/api/studio/cover?title=${encodeURIComponent(updated.title)}&tagline=${encodeURIComponent(updated.tagline || '')}&type=project&id=${id}&json=true`)
                .finally(() => {
                    fetchData().finally(() => {
                        setGeneratingProjectIds(prev => prev.filter(gid => gid !== id));
                    });
                });
        }

        return updated;
    };

    const deleteProject = async (id: string) => {
        if (settings.is_demo_mode) {
            const session = getSessionStudio()
            const updatedProjects = session.projects.filter((p: any) => p.id !== id)
            const updated = { ...session, projects: updatedProjects }
            saveSessionStudio(updated)
            setProjects(updatedProjects)
            return
        }
        const { error } = await supabase.from('studio_projects').delete().eq('id', id)
        if (error) throw error
        setProjects(prev => prev.filter(p => p.id !== id))
    }

    const addSpark = async (spark: Partial<StudioSpark>) => {
        if (settings.is_demo_mode) {
            const newSpark = {
                ...spark,
                id: `demo-s-${Date.now()}`,
                created_at: new Date().toISOString()
            } as StudioSpark
            const session = getSessionStudio()
            const updated = { ...session, sparks: [newSpark, ...(session.sparks || [])] }
            saveSessionStudio(updated)
            setSparks(updated.sparks)
            return newSpark
        }
        const { data, error } = await supabase.from('studio_sparks').insert([spark]).select()
        if (error) throw error
        const inserted = data?.[0]
        if (!inserted) throw new Error('No data returned')
        setSparks(prev => [inserted, ...prev])
        return inserted
    }

    const updateSpark = async (id: string, updates: Partial<StudioSpark>) => {
        if (settings.is_demo_mode) {
            const session = getSessionStudio()
            const updatedSparks = session.sparks.map((s: any) => s.id === id ? { ...s, ...updates } : s)
            const updated = { ...session, sparks: updatedSparks }
            saveSessionStudio(updated)
            setSparks(updatedSparks)
            return updatedSparks.find((s: any) => s.id === id)
        }
        if (!updates || Object.keys(updates).length === 0) return sparks.find(s => s.id === id)!
        const { data, error } = await supabase.from('studio_sparks').update(updates).eq('id', id).select()
        if (error) throw error
        const updated = data?.[0]
        if (!updated) throw new Error('Update failed')
        setSparks(prev => prev.map(s => s.id === id ? updated : s))
        return updated
    }

    const deleteSpark = async (id: string) => {
        if (settings.is_demo_mode) {
            const session = getSessionStudio()
            const updatedSparks = session.sparks.filter((s: any) => s.id !== id)
            const updated = { ...session, sparks: updatedSparks }
            saveSessionStudio(updated)
            setSparks(updatedSparks)
            return
        }
        const { error } = await supabase.from('studio_sparks').delete().eq('id', id)
        if (error) throw error
        setSparks(prev => prev.filter(s => s.id !== id))
    }

    const addMilestone = async (milestone: Partial<StudioMilestone>) => {
        if (settings.is_demo_mode) {
            const newMilestone = { ...milestone, id: `demo-ms-${Date.now()}` } as StudioMilestone
            const session = getSessionStudio()
            const updated = { ...session, milestones: [...(session.milestones || []), newMilestone] }
            saveSessionStudio(updated)
            setMilestones(updated.milestones)
            return newMilestone
        }
        const { data, error } = await supabase.from('studio_milestones').insert([milestone]).select()
        if (error) {
            const { error: insertError } = await supabase.from('studio_milestones').insert([milestone])
            if (insertError) throw insertError
            await fetchData()
            return milestone as StudioMilestone
        }
        const inserted = data?.[0]
        if (!inserted) throw new Error('No data returned')
        setMilestones(prev => [...prev, inserted])
        return inserted
    }

    const updateMilestone = async (id: string, updates: Partial<StudioMilestone>) => {
        if (settings.is_demo_mode) {
            const session = getSessionStudio()
            const updatedMilestones = session.milestones.map((m: any) => m.id === id ? { ...m, ...updates } : m)
            const updated = { ...session, milestones: updatedMilestones }
            saveSessionStudio(updated)
            setMilestones(updatedMilestones)
            return updatedMilestones.find((m: any) => m.id === id)
        }
        if (!updates || Object.keys(updates).length === 0) return milestones.find(m => m.id === id)!
        const { data, error } = await supabase.from('studio_milestones').update(updates).eq('id', id).select()
        if (error) {
            setMilestones(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m))
            return { ...milestones.find(m => m.id === id)!, ...updates }
        }
        const updated = data?.[0]
        if (!updated) throw new Error('Update failed')
        setMilestones(prev => prev.map(m => m.id === id ? updated : m))
        return updated
    }

    const deleteMilestone = async (id: string) => {
        if (settings.is_demo_mode) {
            const session = getSessionStudio()
            const updatedMilestones = session.milestones.filter((m: any) => m.id !== id)
            const updated = { ...session, milestones: updatedMilestones }
            saveSessionStudio(updated)
            setMilestones(updatedMilestones)
            return
        }
        const { error } = await supabase.from('studio_milestones').delete().eq('id', id)
        if (error) throw error
        setMilestones(prev => prev.filter(m => m.id !== id))
    }

    const addContent = async (item: Partial<StudioContent>) => {
        if (settings.is_demo_mode) {
            const newItem = { ...item, id: `demo-c-${Date.now()}`, created_at: new Date().toISOString() }
            const session = getSessionStudio()
            const updated = { ...session, content: [newItem, ...(session.content || [])] }
            saveSessionStudio(updated)
            setContent(updated.content)
            return newItem as StudioContent
        }
        const sanitizedItem = { ...item }
        if (sanitizedItem.deadline === '') sanitizedItem.deadline = null as any

        const { data, error } = await supabase.from('studio_content').insert([sanitizedItem]).select()
        if (error) {
            const { error: insertError } = await supabase.from('studio_content').insert([item])
            if (insertError) throw insertError
            await fetchData()
            return item as StudioContent
        }
        const inserted = data?.[0]
        if (!inserted) throw new Error('No data returned')
        setLoading(false)
        setContent(prev => [inserted, ...prev])

        // Trigger AI cover generation if no image provided
        if (!inserted.cover_url && inserted.id) {
            const newId = inserted.id;
            setGeneratingContentIds(prev => [...prev, newId]);
            
            fetch(`/api/studio/cover?title=${encodeURIComponent(inserted.title)}&tagline=${encodeURIComponent(inserted.category || 'Content')}&type=content&id=${newId}&json=true`)
                .finally(() => {
                    fetchData().finally(() => {
                        setGeneratingContentIds(prev => prev.filter(id => id !== newId));
                    });
                });
        }

        return inserted
    }

    const updateContent = async (id: string, updates: Partial<StudioContent>) => {
        if (settings.is_demo_mode) {
            const session = getSessionStudio()
            const updatedContent = session.content.map((c: any) => c.id === id ? { ...c, ...updates } : c)
            const updated = { ...session, content: updatedContent }
            saveSessionStudio(updated)
            setContent(updatedContent)
            return updatedContent.find((c: any) => c.id === id)
        }
        const sanitizedUpdates = { ...updates }
        if (sanitizedUpdates.deadline === '') sanitizedUpdates.deadline = null as any

        if (!sanitizedUpdates || Object.keys(sanitizedUpdates).length === 0) return content.find(c => c.id === id)!
        const { data, error } = await supabase.from('studio_content').update(sanitizedUpdates).eq('id', id).select()
        if (error) {
            setContent(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
            return { ...content.find(c => c.id === id)!, ...updates }
        }
        const updated = data?.[0];
        if (!updated) throw new Error('Update failed');
        setContent(prev => prev.map(c => c.id === id ? updated : c))

        // Trigger AI cover generation if content that informs the visual changed,
        // and we still don't have an image.
        const isContentUpdate = updates.title !== undefined || updates.category !== undefined;
        if (!updated.cover_url && isContentUpdate) {
            setGeneratingContentIds(prev => [...prev, id]);
            fetch(`/api/studio/cover?title=${encodeURIComponent(updated.title)}&tagline=${encodeURIComponent(updated.category || 'Content')}&type=content&id=${id}&json=true`)
                .finally(() => {
                    fetchData().finally(() => {
                        setGeneratingContentIds(prev => prev.filter(gid => gid !== id));
                    });
                });
        }

        return updated
    };

    const deleteContent = async (id: string) => {
        if (settings.is_demo_mode) {
            const session = getSessionStudio()
            const updatedContent = session.content.filter((c: any) => c.id !== id)
            const updated = { ...session, content: updatedContent }
            saveSessionStudio(updated)
            setContent(updatedContent)
            return
        }
        const { error } = await supabase.from('studio_content').delete().eq('id', id)
        if (error) throw error
        setContent(prev => prev.filter(c => c.id !== id))
    }

    const addPress = async (item: Partial<StudioPress>, coverFile?: File) => {
        let cover_url = item.cover_url

        if (coverFile) {
            const fileExt = coverFile.name.split('.').pop()
            const fileName = `press_${Date.now()}.${fileExt}`
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('studio-assets')
                .upload(`press-covers/${fileName}`, coverFile)
            if (uploadError) throw uploadError
            const { data: urlData } = supabase.storage.from('studio-assets').getPublicUrl(uploadData.path)
            cover_url = urlData.publicUrl
        }

        if (settings.is_demo_mode) {
            const newItem = { ...item, cover_url, id: `demo-pr-${Date.now()}` }
            const session = getSessionStudio()
            const updated = { ...session, press: [newItem, ...(session.press || [])] }
            saveSessionStudio(updated)
            setPress(updated.press)
            return newItem as StudioPress
        }
        const { data, error } = await supabase.from('studio_press').insert([{ ...item, cover_url }]).select()
        if (error) throw error
        const inserted = data?.[0]
        if (!inserted) throw new Error('No data returned')
        setPress(prev => [inserted, ...prev])

        // Trigger AI cover generation if no image provided
        if (!cover_url && inserted.id) {
            const newId = inserted.id;
            setGeneratingPressIds(prev => [...prev, newId]);
            fetch(`/api/studio/cover?title=${encodeURIComponent(inserted.title)}&tagline=${encodeURIComponent(inserted.organization)}&type=press&id=${newId}&json=true`)
                .finally(() => {
                    fetchData().finally(() => {
                        setGeneratingPressIds(prev => prev.filter(id => id !== newId));
                    });
                });
        }

        return inserted
    }

    const updatePress = async (id: string, updates: Partial<StudioPress>, coverFile?: File) => {
        let cover_url = updates.cover_url

        if (coverFile) {
            const fileExt = coverFile.name.split('.').pop()
            const fileName = `press_${id}_${Date.now()}.${fileExt}`
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('studio-assets')
                .upload(`press-covers/${fileName}`, coverFile, { upsert: true })
            if (uploadError) throw uploadError
            const { data: urlData } = supabase.storage.from('studio-assets').getPublicUrl(uploadData.path)
            cover_url = urlData.publicUrl
        }

        const finalUpdates = { ...updates, ...(cover_url ? { cover_url } : {}) }

        if (settings.is_demo_mode) {
            const session = getSessionStudio()
            const updatedPress = session.press.map((p: any) => p.id === id ? { ...p, ...finalUpdates } : p)
            const updated = { ...session, press: updatedPress }
            saveSessionStudio(updated)
            setPress(updatedPress)
            return updatedPress.find((p: any) => p.id === id)
        }
        if (!finalUpdates || Object.keys(finalUpdates).length === 0) return press.find(p => p.id === id)!
        const { data, error } = await supabase.from('studio_press').update(finalUpdates).eq('id', id).select()
        if (error) throw error
        const updated = data?.[0]
        if (!updated) throw new Error('Update failed')
        setPress(prev => prev.map(p => p.id === id ? updated : p))
        return updated
    }

    const deletePress = async (id: string) => {
        if (settings.is_demo_mode) {
            const session = getSessionStudio()
            const updatedPress = session.press.filter((p: any) => p.id !== id)
            const updated = { ...session, press: updatedPress }
            saveSessionStudio(updated)
            setPress(updatedPress)
            return
        }
        const { error } = await supabase.from('studio_press').delete().eq('id', id)
        if (error) throw error
        setPress(prev => prev.filter(p => p.id !== id))
    }

    const addNetwork = async (item: Partial<StudioNetwork>) => {
        if (settings.is_demo_mode) {
            const newItem = { ...item, id: `demo-n-${Date.now()}` } as StudioNetwork
            const session = getSessionStudio()
            const updated = { ...session, networks: [newItem, ...(session.networks || [])] }
            saveSessionStudio(updated)
            setNetworks(updated.networks)
            return newItem
        }
        const { data, error } = await supabase.from('studio_networks').insert([item]).select()
        if (error) throw error
        const inserted = data?.[0]
        if (!inserted) throw new Error('No data returned')
        setNetworks(prev => [inserted, ...prev])
        return inserted
    }

    const updateNetwork = async (id: string, updates: Partial<StudioNetwork>) => {
        if (settings.is_demo_mode) {
            const session = getSessionStudio()
            const updatedNetworks = session.networks.map((n: any) => n.id === id ? { ...n, ...updates } : n)
            const updated = { ...session, networks: updatedNetworks }
            saveSessionStudio(updated)
            setNetworks(updatedNetworks)
            return updatedNetworks.find((n: any) => n.id === id)
        }
        if (!updates || Object.keys(updates).length === 0) return networks.find(n => n.id === id)!
        const { data, error } = await supabase.from('studio_networks').update(updates).eq('id', id).select()
        if (error) throw error
        const updated = data?.[0]
        if (!updated) throw new Error('Update failed')
        setNetworks(prev => prev.map(n => n.id === id ? updated : n))
        return updated
    }

    const deleteNetwork = async (id: string) => {
        if (settings.is_demo_mode) {
            const session = getSessionStudio()
            const updatedNetworks = session.networks.filter((n: any) => n.id !== id)
            const updated = { ...session, networks: updatedNetworks }
            saveSessionStudio(updated)
            setNetworks(updatedNetworks)
            return
        }
        const { error } = await supabase.from('studio_networks').delete().eq('id', id)
        if (error) throw error
        setNetworks(prev => prev.filter(n => n.id !== id))
    }
 
    const addDraft = async (data: Partial<StudioDraft>) => {
        if (settings.is_demo_mode) {
            const newDraft = {
                id: `demo-dr-${Date.now()}`,
                ...data,
                status: data.status || 'draft',
                is_archived: data.is_archived || false,
                pinned: data.pinned || false,
                last_snapshot_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            } as StudioDraft
 
            const session = getSessionStudio()
            const updated = { ...session, drafts: [newDraft, ...(session.drafts || [])] }
            saveSessionStudio(updated)
            setDrafts(prev => [newDraft, ...prev])
            return newDraft
        }
        const { data: inserted, error } = await supabase
            .from('studio_drafts')
            .insert([{
                ...data,
                status: data.status || 'draft'
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
            const session = getSessionStudio()
            const updatedDrafts = session.drafts.map((d: any) => d.id === id ? { ...d, ...updates, updated_at: new Date().toISOString() } : d)
            const updated = { ...session, drafts: updatedDrafts }
            saveSessionStudio(updated)
            setDrafts(prev => prev.map(d => d.id === id ? updatedDrafts.find((ud: any) => ud.id === id) : d))
            return updatedDrafts.find((ud: any) => ud.id === id) as StudioDraft
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
            const session = getSessionStudio()
            const updatedDrafts = session.drafts.filter((d: any) => d.id !== id)
            const updated = { ...session, drafts: updatedDrafts }
            saveSessionStudio(updated)
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
 
    const regenerateProjectCover = async (projectId: string) => {
        setGeneratingProjectIds(prev => [...prev, projectId])
        try {
            const project = projects.find(p => p.id === projectId)
            if (project) {
                addDebugLog(`Starting AI Cover Generation for: "${project.title}"...`, 'info')
                const timestamp = Date.now()
                const res = await fetch(`/api/studio/cover?title=${encodeURIComponent(project.title)}&tagline=${encodeURIComponent(project.tagline || '')}&type=project&id=${projectId}&w=1200&h=630&json=true&t=${timestamp}`)
                
                if (res.ok) {
                    const data = await res.json()
                    const { url, debug } = data
                    
                    if (debug && Array.isArray(debug)) {
                        debug.forEach((msg: string) => addDebugLog(msg, msg.includes('❌') || msg.includes('⚠️') ? 'error' : 'success'))
                    }

                    if (url) {
                        const cacheBustedUrl = `${url}${url.includes('?') ? '&' : '?' }v=${Date.now()}`
                        setProjects(prev => prev.map(p => p.id === projectId ? { ...p, cover_url: cacheBustedUrl } : p))
                        if (settings.is_demo_mode) {
                            const session = getSessionStudio()
                            if (session && session.projects) {
                                const updated = { ...session, projects: session.projects.map((p: any) => p.id === projectId ? { ...p, cover_url: cacheBustedUrl } : p) }
                                saveSessionStudio(updated)
                            }
                        }
                    }
                }
            }
        } catch (e: any) {
            console.error('Project regeneration error:', e)
        } finally {
            setGeneratingProjectIds(prev => prev.filter(id => id !== projectId))
        }
    }

    const regenerateContentCover = async (contentId: string) => {
        setGeneratingContentIds(prev => [...prev, contentId])
        try {
            const item = content.find(c => c.id === contentId)
            if (item) {
                const res = await fetch(`/api/studio/cover?title=${encodeURIComponent(item.title)}&tagline=${encodeURIComponent(item.category || '')}&type=content&id=${contentId}&w=1200&h=630&json=true`)
                if (res.ok) {
                    const { url } = await res.json()
                    if (url) {
                        const cacheBustedUrl = `${url}${url.includes('?') ? '&' : '?' }v=${Date.now()}`
                        setContent(prev => prev.map(c => c.id === contentId ? { ...c, cover_url: cacheBustedUrl } : c))
                        if (settings.is_demo_mode) {
                            const session = getSessionStudio()
                            if (session && session.content) {
                                const updated = { ...session, content: session.content.map((c: any) => c.id === contentId ? { ...c, cover_url: cacheBustedUrl } : c) }
                                saveSessionStudio(updated)
                            }
                        }
                    }
                }
            }
        } catch (e: any) {
            console.error('Content regeneration error:', e)
        } finally {
            setGeneratingContentIds(prev => prev.filter(id => id !== contentId))
        }
    }

    const regeneratePressCover = async (pressId: string) => {
        setGeneratingPressIds(prev => [...prev, pressId])
        try {
            const item = press.find(p => p.id === pressId)
            if (item) {
                const res = await fetch(`/api/studio/cover?title=${encodeURIComponent(item.title)}&tagline=${encodeURIComponent(item.organization)}&type=press&id=${pressId}&w=1200&h=630&json=true`)
                if (res.ok) {
                    const { url } = await res.json()
                    if (url) {
                        const cacheBustedUrl = `${url}${url.includes('?') ? '&' : '?' }v=${Date.now()}`
                        setPress(prev => prev.map(p => p.id === pressId ? { ...p, cover_url: cacheBustedUrl } : p))
                        if (settings.is_demo_mode) {
                            const session = getSessionStudio()
                            if (session && session.press) {
                                const updated = { ...session, press: session.press.map((p: any) => p.id === pressId ? { ...p, cover_url: cacheBustedUrl } : p) }
                                saveSessionStudio(updated)
                            }
                        }
                    }
                }
            }
        } catch (e: any) {
            console.error('Press regeneration error:', e)
        } finally {
            setGeneratingPressIds(prev => prev.filter(id => id !== pressId))
        }
    }

    const stageItem = async (id: string, type: 'project' | 'press' | 'content' | 'draft', staged: boolean, stageData?: Record<string, any>) => {
        const tableMap = { project: 'studio_projects', press: 'studio_press', content: 'studio_content', draft: 'studio_drafts' }
        const table = tableMap[type]
        const updates: any = { is_staged: staged }
        if (stageData !== undefined) updates.stage_data = stageData
        const { error } = await supabase.from(table).update(updates).eq('id', id)
        if (error) throw error
        // Refresh local state
        if (type === 'project') setProjects(prev => prev.map(p => p.id === id ? { ...p, is_staged: staged, ...(stageData ? { stage_data: stageData } : {}) } as any : p))
        else if (type === 'press') setPress(prev => prev.map(p => p.id === id ? { ...p, is_staged: staged, ...(stageData ? { stage_data: stageData } : {}) } as any : p))
        else if (type === 'content') setContent(prev => prev.map(p => p.id === id ? { ...p, is_staged: staged, ...(stageData ? { stage_data: stageData } : {}) } as any : p))
        else if (type === 'draft') setDrafts(prev => prev.map(p => p.id === id ? { ...p, is_staged: staged, ...(stageData ? { stage_data: stageData } : {}) } as any : p))
    }

    return (
        <StudioContext.Provider value={{
            projects, sparks, milestones, content, press, networks, loading, error,
            refresh: fetchData,
            addProject, updateProject, deleteProject,
            addSpark, updateSpark, deleteSpark,
            addMilestone, updateMilestone, deleteMilestone,
            addContent, updateContent, deleteContent,
            addPress, updatePress, deletePress,
            addNetwork, updateNetwork, deleteNetwork,
            drafts, addDraft, updateDraft, deleteDraft,
            regenerateProjectCover, regenerateContentCover, regeneratePressCover,
            generatingProjectIds, generatingContentIds, generatingPressIds,
            debugLogs, addDebugLog,
            stageItem
        }}>
            {children}
        </StudioContext.Provider>
    )
}

export function useStudioContext() {
    const context = useContext(StudioContext)
    if (context === undefined) {
        throw new Error('useStudioContext must be used within a StudioProvider')
    }
    return context
}
