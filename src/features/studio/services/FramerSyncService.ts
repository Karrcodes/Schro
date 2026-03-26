'use client'

import type { StudioProject, StudioPress } from '../types/studio.types'

// Note: In a production app, the Framer API Key would be handled via a secure proxy/API route
// to avoid exposing it in the client. For this implementation, we'll assume the client
// can hit an API route /api/studio/framer-sync

export interface FramerSite {
    id: string
    name: string
}

export interface FramerCollection {
    id: string
    name: string
    slug: string
    fields: FramerField[]
}

export interface FramerField {
    id: string
    name: string
    slug: string
    type: string
}

export class FramerSyncService {
    private static API_BASE = '/api/studio/framer-sync'
/* 
    static getAuthUrl(): string {
        const clientId = process.env.NEXT_PUBLIC_FRAMER_CLIENT_ID || ''
        const redirectUri = encodeURIComponent(`${window.location.origin}${this.API_BASE}?endpoint=callback`)
        const scope = encodeURIComponent('read_collections write_collections read_items write_items')
        return `https://framer.com/projects/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code`
    }
*/

    static async getSites(): Promise<FramerSite[]> {
        const res = await fetch(`${this.API_BASE}?endpoint=sites`)
        if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            throw new Error(data.error || 'Failed to fetch Framer sites')
        }
        return res.json()
    }

    static async getCollections(siteId: string): Promise<FramerCollection[]> {
        const res = await fetch(`${this.API_BASE}?endpoint=collections&siteId=${encodeURIComponent(siteId)}`)
        if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            throw new Error(data.error || 'Failed to fetch Framer collections')
        }
        return res.json()
    }

    static async getCollectionItems(siteId: string, collectionId: string): Promise<any[]> {
        const res = await fetch(`${this.API_BASE}?endpoint=items&siteId=${encodeURIComponent(siteId)}&collectionId=${encodeURIComponent(collectionId)}`)
        if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            throw new Error(data.error || 'Failed to fetch Framer collection items')
        }
        return res.json()
    }

    static async syncProject(siteId: string, collectionId: string, project: StudioProject, fieldMapping: Record<string, string>) {
        const body = {
            siteId,
            collectionId,
            itemId: project.framer_cms_id,
            localId: project.id,
            type: 'project',
            data: project,
            mapping: fieldMapping
        }
        
        const res = await fetch(`${this.API_BASE}`, {
            method: 'POST',
            body: JSON.stringify(body),
            headers: { 'Content-Type': 'application/json' }
        })
        
        if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            throw new Error(data.error || 'Failed to sync project to Framer')
        }
        return res.json()
    }

    static async syncPress(siteId: string, collectionId: string, press: StudioPress, fieldMapping: Record<string, string>) {
        const body = {
            siteId,
            collectionId,
            itemId: press.framer_cms_id,
            localId: press.id,
            type: 'press',
            data: press,
            mapping: fieldMapping
        }
        
        const res = await fetch(`${this.API_BASE}`, {
            method: 'POST',
            body: JSON.stringify(body),
            headers: { 'Content-Type': 'application/json' }
        })
        
        if (!res.ok) throw new Error('Failed to sync press item to Framer')
        return res.json()
    }

    static async testConnection() {
        const res = await fetch('/api/studio/sync/test')
        return res.json()
    }

    static async getRecentJobs() {
        const res = await fetch('/api/studio/framer-jobs?status=all')
        if (!res.ok) return []
        return res.json()
    }

    static async deleteItem(collectionId: string, itemId: string, localId: string, type: 'project' | 'press') {
        const res = await fetch(`${this.API_BASE}?collectionId=${encodeURIComponent(collectionId)}&itemId=${encodeURIComponent(itemId)}&localId=${localId}&type=${type}`, {
            method: 'DELETE'
        })
        if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            throw new Error(data.error || 'Failed to remove item from Framer')
        }
        return res.json()
    }

    static async getUnmatchedItems(siteId: string, localProjects: any[], localPress: any[], localContent: any[], localDrafts: any[] = []) {
        const collections = await this.getCollections(siteId)
        const typeMapping: Record<string, string[]> = {
            project: ['technology', 'projects', 'work', 'design', 'fashion', 'architecture', 'product', 'creative'],
            press: ['press', 'awards', 'recognition'],
            content: ['content', 'video', 'media', 'learning', 'talks'],
            draft: ['articles', 'blog', 'journal', 'drafts', 'writing', 'post', 'stories', 'news', 'publications']
        }

        const relevantCollections = collections.filter(coll => {
            const name = coll.name.toLowerCase()
            return Object.values(typeMapping).some(keywords => 
                keywords.some(k => name.includes(k))
            )
        })

        const allRemoteItems: any[] = []
        for (const coll of relevantCollections) {
            const items = await this.getCollectionItems(siteId, coll.id)
            const type = Object.keys(typeMapping).find(t => 
                typeMapping[t].some(k => coll.name.toLowerCase().includes(k))
            )
            allRemoteItems.push(...items.map(it => ({ ...it, _type: type, _collectionId: coll.id, _collectionName: coll.name, _fields: coll.fields })))
        }

        const localCmsIds = new Set([
            ...localProjects.map(p => p.framer_cms_id),
            ...localPress.map(p => p.framer_cms_id),
            ...localContent.map(c => c.framer_cms_id),
            ...localDrafts.map(d => d.framer_cms_id)
        ].filter(Boolean))

        return allRemoteItems.filter(it => !localCmsIds.has(it.id))
    }

    static mapRemoteToLocal(item: any): any {
        const fd = item.fieldData || {}
        const fields: { id: string, name: string, slug: string, type: string }[] = item._fields || []

        // Build name→value map
        const nd: Record<string, any> = {}
        for (const f of fields) {
            if (f.name) nd[f.name.toLowerCase()] = fd[f.id]
            if (f.slug) nd[f.slug.toLowerCase()] = fd[f.id]
            if (f.id) nd[f.id.toLowerCase()] = fd[f.id]
        }

        const get = (key: string): any => nd[key.toLowerCase()]
        
        const getText = (key: string): string | undefined => {
            const v = get(key)
            if (!v) return undefined
            if (typeof v === 'string') return v.trim() || undefined
            if (typeof v === 'object') {
                if (typeof v.value === 'string') return v.value.trim() || undefined
                if (v.html) return v.html.replace(/<[^>]+>/g, '').trim() || undefined
                if (v.text) return v.text.trim() || undefined
                if (v.value?.html) return v.value.html.replace(/<[^>]+>/g, '').trim() || undefined
                if (v.value?.text) return v.value.text.trim() || undefined
            }
            return undefined
        }

        const getImage = (key: string): string | undefined => {
            const v = get(key) as any
            if (!v) return undefined
            if (typeof v === 'string' && v.startsWith('http')) return v
            if (typeof v === 'object') {
                if (v.url) return v.url
                if (v.value?.url) return v.value.url
                if (typeof v.value === 'string' && v.value.startsWith('http')) return v.value
            }
            return undefined
        }

        const getLink = (key: string): string | undefined => {
            const v = get(key) as any
            if (!v) return undefined
            if (typeof v === 'string' && v.startsWith('http')) return v
            if (typeof v === 'object') {
                if (v.url) return v.url
                if (v.value?.url) return v.value.url
                if (typeof v.value === 'string' && v.value.startsWith('http')) return v.value
            }
            return undefined
        }

        const title = getText('title') || item.slug
        const description = getText('body text')
        const cover_url = getImage('bg image')

        if (item._type === 'project') {
            return {
                title,
                slug: item.slug,
                description,
                cover_url,
                client: getText('client'),
                location: getText('location'),
                project_url: getLink('view project'),
                article_url: getLink('view article'),
                status: 'shipped',
                framer_cms_id: item.id,
                framer_collection_id: item._collectionId
            }
        } 
        
        if (item._type === 'press') {
            return {
                title,
                organization: getText('featured on') || getText('client') || 'Unknown',
                url: getLink('view'),
                notes: description,
                cover_url,
                status: 'published',
                type: 'feature',
                is_portfolio_item: true,
                is_strategy_goal: false,
                framer_cms_id: item.id,
                framer_collection_id: item._collectionId
            }
        } 
        
        if (item._type === 'content') {
            return {
                title,
                url: getText('media link') || getLink('media link'),
                status: 'published',
                category: 'Other',
                notes: description,
                cover_url,
                framer_cms_id: item.id,
                framer_collection_id: item._collectionId
            }
        }

        if (item._type === 'draft') {
            return {
                title,
                body: getText('body') || getText('text') || getText('content') || description || '',
                description,
                cover_url,
                status: 'completed',
                framer_cms_id: item.id,
                framer_collection_id: item._collectionId
            }
        }

        return {
            title,
            framer_cms_id: item.id,
            framer_collection_id: item._collectionId
        }
    }

    static getMappingMetadata(item: any): { label: string, framerField: string, value: any, targetField: string }[] {
        const fd = item.fieldData || {}
        const fields: FramerField[] = item._fields || []
        const type = item._type
        const metadata: { label: string, framerField: string, value: any, targetField: string }[] = []

        const getFieldName = (slugOrId: string) => {
            const f = fields.find(f => f.slug === slugOrId || f.id === slugOrId)
            return f ? f.name : slugOrId
        }

        const mapped = this.mapRemoteToLocal(item)

        // Title is universal
        metadata.push({ 
            label: 'Title', 
            framerField: getFieldName('title'), 
            value: mapped.title, 
            targetField: 'title' 
        })

        if (type === 'project') {
            metadata.push({ label: 'Client', framerField: getFieldName('client'), value: mapped.client, targetField: 'client' })
            metadata.push({ label: 'Location', framerField: getFieldName('location'), value: mapped.location, targetField: 'location' })
            metadata.push({ label: 'Website', framerField: getFieldName('view-project'), value: mapped.project_url, targetField: 'project_url' })
            metadata.push({ label: 'Cover Image', framerField: getFieldName('bg-image'), value: mapped.cover_url, targetField: 'cover_url' })
        } else if (type === 'press') {
            metadata.push({ label: 'Source', framerField: getFieldName('featured-on') || getFieldName('client'), value: mapped.organization, targetField: 'organization' })
            metadata.push({ label: 'Link', framerField: getFieldName('view'), value: mapped.url, targetField: 'url' })
            metadata.push({ label: 'Cover Image', framerField: getFieldName('bg-image'), value: mapped.cover_url, targetField: 'cover_url' })
        } else if (type === 'content') {
            metadata.push({ label: 'Media Link', framerField: getFieldName('media-link'), value: mapped.url, targetField: 'url' })
            metadata.push({ label: 'Thumbnail', framerField: getFieldName('bg-image'), value: mapped.cover_url, targetField: 'cover_url' })
        } else if (type === 'draft') {
            metadata.push({ label: 'Content Body', framerField: getFieldName('body') || getFieldName('content'), value: 'Rich Text Content', targetField: 'body' })
            metadata.push({ label: 'Cover Image', framerField: getFieldName('bg-image'), value: mapped.cover_url, targetField: 'cover_url' })
        }

        return metadata.filter(m => m.value !== undefined)
    }
}
