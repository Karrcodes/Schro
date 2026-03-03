'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { StudioProject, StudioSpark, StudioMilestone, StudioContent, StudioPress, StudioNetwork } from '../types/studio.types'

interface StudioContextType {
    projects: StudioProject[]
    sparks: StudioSpark[]
    milestones: StudioMilestone[]
    content: StudioContent[]
    loading: boolean
    error: string | null
    refresh: () => Promise<void>
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
    addPress: (item: Partial<StudioPress>) => Promise<StudioPress>
    updatePress: (id: string, updates: Partial<StudioPress>) => Promise<StudioPress>
    deletePress: (id: string) => Promise<void>
    networks: StudioNetwork[]
    addNetwork: (item: Partial<StudioNetwork>) => Promise<StudioNetwork>
    updateNetwork: (id: string, updates: Partial<StudioNetwork>) => Promise<StudioNetwork>
    deleteNetwork: (id: string) => Promise<void>
}

const StudioContext = createContext<StudioContextType | undefined>(undefined)

export function StudioProvider({ children }: { children: React.ReactNode }) {
    const [projects, setProjects] = useState<StudioProject[]>([])
    const [sparks, setSparks] = useState<StudioSpark[]>([])
    const [milestones, setMilestones] = useState<StudioMilestone[]>([])
    const [content, setContent] = useState<StudioContent[]>([])
    const [press, setPress] = useState<StudioPress[]>([])
    const [networks, setNetworks] = useState<StudioNetwork[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            const [projectsRes, sparksRes, milestonesRes, contentRes, pressRes, networksRes] = await Promise.all([
                supabase.from('studio_projects').select('*').order('created_at', { ascending: false }),
                supabase.from('studio_sparks').select('*').order('created_at', { ascending: false }),
                supabase.from('studio_milestones').select('*').order('created_at', { ascending: true }),
                supabase.from('studio_content').select('*').order('created_at', { ascending: false }),
                supabase.from('studio_press').select('*').order('created_at', { ascending: false }),
                supabase.from('studio_networks').select('*').order('created_at', { ascending: false })
            ])

            if (projectsRes.error) throw projectsRes.error
            if (sparksRes.error) throw sparksRes.error
            if (milestonesRes.error) throw milestonesRes.error
            if (contentRes.error) throw contentRes.error
            if (pressRes.error) throw pressRes.error
            if (networksRes.error) throw networksRes.error

            setProjects(projectsRes.data || [])
            setSparks(sparksRes.data || [])
            setMilestones(milestonesRes.data || [])
            setContent(contentRes.data || [])
            setPress(pressRes.data || [])
            setNetworks(networksRes.data || [])
            setError(null)
        } catch (err: any) {
            console.error('Error fetching studio data:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const addProject = async (project: Partial<StudioProject>, initialMilestones?: { title: string; impact_score?: number; category?: string; target_date?: string }[], coverFile?: File) => {
        let finalCoverUrl = project.cover_url;

        // Handle Image Upload if file provided
        if (coverFile) {
            const fileExt = coverFile.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2, 11)}_${Date.now()}.${fileExt}`;
            const filePath = `project-covers/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('studio-assets')
                .upload(filePath, coverFile);

            if (uploadError) {
                console.error('Error uploading cover:', uploadError);
                // Continue without image or throw? Let's throw for now to be safe
                throw new Error(`Failed to upload cover image: ${uploadError.message}`);
            }

            const { data: urlData } = supabase.storage.from('studio-assets').getPublicUrl(filePath);
            finalCoverUrl = urlData.publicUrl;
        }

        // Insert Project
        const { data: projectData, error: projectError } = await supabase
            .from('studio_projects')
            .insert([{ ...project, cover_url: finalCoverUrl }])
            .select()
            .single();

        if (projectError) throw projectError;
        if (!projectData) throw new Error('No data returned from project creation');

        // Insert Milestones if provided
        if (initialMilestones && initialMilestones.length > 0) {
            const milestonesToInsert = initialMilestones.map(m => ({
                project_id: projectData.id,
                title: m.title,
                impact_score: m.impact_score || 5,
                category: m.category,
                target_date: m.target_date,
                status: 'pending' as const
            }));

            const { data: msData, error: msError } = await supabase
                .from('studio_milestones')
                .insert(milestonesToInsert)
                .select();

            if (msError) console.error('Error inserting initial milestones:', msError);
            if (msData) setMilestones(prev => [...prev, ...msData]);
        }

        setProjects(prev => [projectData, ...prev]);
        return projectData;
    };

    const updateProject = async (id: string, updates: Partial<StudioProject>, coverFile?: File) => {
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

        if (!finalUpdates || Object.keys(finalUpdates).length === 0) return projects.find(p => p.id === id)!;
        const { data, error } = await supabase.from('studio_projects').update(finalUpdates).eq('id', id).select();
        if (error) throw error;
        const updated = data?.[0];
        if (!updated) throw new Error('Update failed');
        setProjects(prev => prev.map(p => p.id === id ? updated : p));
        return updated;
    };

    const deleteProject = async (id: string) => {
        const { error } = await supabase.from('studio_projects').delete().eq('id', id)
        if (error) throw error
        setProjects(prev => prev.filter(p => p.id !== id))
    }

    const addSpark = async (spark: Partial<StudioSpark>) => {
        const { data, error } = await supabase.from('studio_sparks').insert([spark]).select()
        if (error) throw error
        const inserted = data?.[0]
        if (!inserted) throw new Error('No data returned')
        setSparks(prev => [inserted, ...prev])
        return inserted
    }

    const updateSpark = async (id: string, updates: Partial<StudioSpark>) => {
        if (!updates || Object.keys(updates).length === 0) return sparks.find(s => s.id === id)!
        const { data, error } = await supabase.from('studio_sparks').update(updates).eq('id', id).select()
        if (error) throw error
        const updated = data?.[0]
        if (!updated) throw new Error('Update failed')
        setSparks(prev => prev.map(s => s.id === id ? updated : s))
        return updated
    }

    const deleteSpark = async (id: string) => {
        const { error } = await supabase.from('studio_sparks').delete().eq('id', id)
        if (error) throw error
        setSparks(prev => prev.filter(s => s.id !== id))
    }

    const addMilestone = async (milestone: Partial<StudioMilestone>) => {
        const { data, error } = await supabase.from('studio_milestones').insert([milestone]).select()
        if (error) {
            console.warn('addMilestone select error (schema cache), falling back:', error.message)
            const { error: insertError } = await supabase.from('studio_milestones').insert([milestone])
            if (insertError) throw insertError
            await fetchData() // Refresh to get the record
            return milestone as StudioMilestone
        }
        const inserted = data?.[0]
        if (!inserted) throw new Error('No data returned')
        setMilestones(prev => [...prev, inserted])
        return inserted
    }

    const updateMilestone = async (id: string, updates: Partial<StudioMilestone>) => {
        if (!updates || Object.keys(updates).length === 0) return milestones.find(m => m.id === id)!
        const { data, error } = await supabase.from('studio_milestones').update(updates).eq('id', id).select()
        if (error) {
            console.warn('updateMilestone select error (schema cache), applying optimistic update:', error.message)
            setMilestones(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m))
            return { ...milestones.find(m => m.id === id)!, ...updates }
        }
        const updated = data?.[0]
        if (!updated) throw new Error('Update failed')
        setMilestones(prev => prev.map(m => m.id === id ? updated : m))
        return updated
    }


    const deleteMilestone = async (id: string) => {
        const { error } = await supabase.from('studio_milestones').delete().eq('id', id)
        if (error) throw error
        setMilestones(prev => prev.filter(m => m.id !== id))
    }

    const addContent = async (item: Partial<StudioContent>) => {
        const { data, error } = await supabase.from('studio_content').insert([item]).select()
        if (error) {
            // Schema cache may not have new columns yet — do an insert-only and refresh
            console.warn('addContent select error (schema cache), falling back:', error.message)
            const { error: insertError } = await supabase.from('studio_content').insert([item])
            if (insertError) throw insertError
            // Refresh to get the newly created record
            await fetchData()
            return item as StudioContent
        }
        const inserted = data?.[0]
        if (!inserted) throw new Error('No data returned')
        setContent(prev => [inserted, ...prev])
        return inserted
    }

    const updateContent = async (id: string, updates: Partial<StudioContent>) => {
        if (!updates || Object.keys(updates).length === 0) return content.find(c => c.id === id)!
        const { data, error } = await supabase.from('studio_content').update(updates).eq('id', id).select()
        if (error) {
            // Schema cache may not have new columns yet — fall back to optimistic local update
            console.warn('updateContent select error (schema cache), applying optimistic update:', error.message)
            setContent(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
            return { ...content.find(c => c.id === id)!, ...updates }
        }
        const updated = data?.[0]
        if (!updated) throw new Error('Update failed')
        setContent(prev => prev.map(c => c.id === id ? updated : c))
        return updated
    }


    const deleteContent = async (id: string) => {
        const { error } = await supabase.from('studio_content').delete().eq('id', id)
        if (error) throw error
        setContent(prev => prev.filter(c => c.id !== id))
    }

    const addPress = async (item: Partial<StudioPress>) => {
        const { data, error } = await supabase.from('studio_press').insert([item]).select()
        if (error) throw error
        const inserted = data?.[0]
        if (!inserted) throw new Error('No data returned')
        setPress(prev => [inserted, ...prev])
        return inserted
    }

    const updatePress = async (id: string, updates: Partial<StudioPress>) => {
        if (!updates || Object.keys(updates).length === 0) return press.find(p => p.id === id)!
        const { data, error } = await supabase.from('studio_press').update(updates).eq('id', id).select()
        if (error) throw error
        const updated = data?.[0]
        if (!updated) throw new Error('Update failed')
        setPress(prev => prev.map(p => p.id === id ? updated : p))
        return updated
    }

    const deletePress = async (id: string) => {
        const { error } = await supabase.from('studio_press').delete().eq('id', id)
        if (error) throw error
        setPress(prev => prev.filter(p => p.id !== id))
    }

    const addNetwork = async (item: Partial<StudioNetwork>) => {
        const { data, error } = await supabase.from('studio_networks').insert([item]).select()
        if (error) throw error
        const inserted = data?.[0]
        if (!inserted) throw new Error('No data returned')
        setNetworks(prev => [inserted, ...prev])
        return inserted
    }

    const updateNetwork = async (id: string, updates: Partial<StudioNetwork>) => {
        if (!updates || Object.keys(updates).length === 0) return networks.find(n => n.id === id)!
        const { data, error } = await supabase.from('studio_networks').update(updates).eq('id', id).select()
        if (error) throw error
        const updated = data?.[0]
        if (!updated) throw new Error('Update failed')
        setNetworks(prev => prev.map(n => n.id === id ? updated : n))
        return updated
    }

    const deleteNetwork = async (id: string) => {
        const { error } = await supabase.from('studio_networks').delete().eq('id', id)
        if (error) throw error
        setNetworks(prev => prev.filter(n => n.id !== id))
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
            addNetwork, updateNetwork, deleteNetwork
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
