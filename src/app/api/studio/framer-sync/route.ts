import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin'

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const endpoint = searchParams.get('endpoint') || 'sites'
    const siteId = searchParams.get('siteId')
    const collectionId = searchParams.get('collectionId')
    const itemId = searchParams.get('itemId')

    // Retrieve Stored Config
    const { data: settings } = await supabase.from('sys_settings').select('key, value').in('key', ['framer_access_token', 'framer_site_id'])
    const accessToken = settings?.find(s => s.key === 'framer_access_token')?.value
    let siteIdSetting = settings?.find(s => s.key === 'framer_site_id')?.value
    
    // AUTO-MIGRATE: Clean Site ID if it's a URL or contains suffix (Allow hyphens)
    const idMatch = siteIdSetting?.match(/([a-zA-Z0-9\-]{20,})/)
    if (idMatch && idMatch[1] !== siteIdSetting && !siteIdSetting?.startsWith('http')) {
        siteIdSetting = idMatch[1]
        await supabase.from('sys_settings').update({ value: siteIdSetting }).eq('key', 'framer_site_id')
    }

    console.log('GET /framer-sync:', { 
        endpoint, 
        siteIdParam: siteId, 
        siteIdSetting, 
        hasToken: !!accessToken 
    });

    const targetSiteId = siteId || siteIdSetting

    if (!accessToken || !targetSiteId) {
        if (endpoint === 'sites' && !targetSiteId) return NextResponse.json([]) // Return empty list if no site selected yet
        if (endpoint === 'config') return NextResponse.json({ connected: false })
        return NextResponse.json({ error: 'Framer not connected' }, { status: 401 })
    }

    try {
        const { connect } = await import('framer-api')
        const framer = await connect(targetSiteId, accessToken)

        if (endpoint === 'sites') {
            const info = await framer.getProjectInfo()
            await framer.disconnect()
            return NextResponse.json([{ id: targetSiteId, name: info.name }])
        }

        if (endpoint === 'collections') {
            const collections = await framer.getCollections()
            const result = await Promise.all(collections.map(async (c: any) => {
                let fields = []
                try {
                    const rawFields = await c.getFields()
                    fields = rawFields.map((f: any) => ({
                        id: f.id,
                        name: f.name || f.displayName || f.label || f.slug || f.id,
                        slug: f.slug || (f.name || f.displayName || '').toLowerCase().replace(/\s+/g, '-'),
                        type: f.type
                    }))
                } catch (fieldErr: any) {
                    console.error(`[Framer] Failed to get fields for collection ${c.name}:`, fieldErr.message)
                }
                return { id: c.id, name: c.name, slug: c.slug, fields }
            }))
            await framer.disconnect()
            return NextResponse.json(result)
        }

        if (endpoint === 'config') {
            const collections = await framer.getCollections()
            const info = await framer.getProjectInfo()
            console.log('Framer Project Info:', JSON.stringify(info, null, 2))
            await framer.disconnect()

            // The best identifier for connect() is either the full URL or the slug.
            // info.id (64-char hash) is NOT compatible with connect()!
            const siteIdToUse = (targetSiteId.startsWith('http') ? targetSiteId : (info as any).slug) || targetSiteId

            // PERSIST: Automatically update the stored Site ID if we found a better/canonical one
            if (siteIdToUse !== siteIdSetting && siteIdToUse) {
                console.log('Sync Config: Auto-updating site ID to canonical version:', siteIdToUse)
                await supabase.from('sys_settings').update({ value: siteIdToUse }).eq('key', 'framer_site_id')
            }

            const defaultColl = 
                collections.find(c => c.name.toLowerCase() === 'projects') || 
                collections.find(c => c.name.toLowerCase().includes('technology')) ||
                collections[0]

            return NextResponse.json({
                connected: true,
                siteId: siteIdToUse,
                projectName: info.name,
                collectionId: defaultColl?.id,
                collectionName: defaultColl?.name,
                availableCollections: collections.map(c => ({ id: c.id, name: c.name }))
            })
        }

        if (endpoint === 'items' && collectionId) {
            const collections = await framer.getCollections()
            const collection = collections.find((c: any) => c.id === collectionId)
            if (!collection) throw new Error('Collection not found')
            
            const items = await collection.getItems()
            const result = items.map((i: any) => ({
                id: i.id,
                slug: i.slug,
                fieldData: i.fieldData
            }))
            await framer.disconnect()
            return NextResponse.json(result)
        }

        if (endpoint === 'verify' && siteId && collectionId && itemId) {
            const url = `https://api.framer.com/cms/v1/sites/${siteId}/collections/${collectionId}/items/${itemId}`
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            })
            await framer.disconnect()
            return NextResponse.json({ exists: res.ok })
        }

        await framer.disconnect()
        return NextResponse.json({ error: 'Invalid endpoint' }, { status: 400 })
    } catch (err: any) {
        console.error('Framer API Error (GET):', err.message)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const endpoint = searchParams.get('endpoint')
        const body = await req.json()

        if (endpoint === 'save-token') {
            const { token, siteId: rawSiteId } = body
            
            // IMPROVED PARSING: Extract ID from URL or segment (min 20 chars)
            let cleanId = rawSiteId || ''
            const match = cleanId.match(/([a-zA-Z0-9]{20,})/)
            if (match) {
                cleanId = match[1]
            } else {
                cleanId = cleanId.split('?')[0].split('#')[0]
            }
            
            let projectTitle = 'Connected Project'
            if (token && cleanId) {
                try {
                    const { connect } = await import('framer-api')
                    const framer = await connect(cleanId, token)
                    const info = await framer.getProjectInfo()
                    projectTitle = info.name
                    await framer.disconnect()
                } catch (e: any) {
                    return NextResponse.json({ error: `Connection failed: ${e.message}` }, { status: 400 })
                }
            }

            await supabase.from('sys_settings').upsert([
                { key: 'framer_access_token', value: token, updated_at: new Date().toISOString() },
                { key: 'framer_site_id', value: cleanId, updated_at: new Date().toISOString() }
            ], { onConflict: 'key' })
            
            return NextResponse.json({ success: true, siteId: cleanId, project: projectTitle })
        }

        let { siteId, collectionId, itemId, data, mapping, localId, type } = body

        // If data is missing (or incomplete) but localId+type are present, fetch the record from Supabase
        if ((!data || !data.title) && localId && type) {
            const tableMap: Record<string, string> = {
                'press': 'studio_press',
                'project': 'studio_projects',
                'draft': 'studio_drafts',
                'content': 'studio_content'
            }
            const table = tableMap[type] || 'studio_projects'
            
            const { data: record, error: fetchErr } = await supabase
                .from(table)
                .select('*')
                .eq('id', localId)
                .single()
            
            if (fetchErr || !record) {
                console.error(`[Route] Could not fetch ${type} record ${localId}:`, fetchErr)
                if (!data) throw new Error(`Could not find ${type} record to sync`)
            } else {
                data = record
                console.log(`[Route] Fetched full ${type} record for sync:`, data.title)
            }
        }

        if (!data) {
            return NextResponse.json({ error: 'Missing sync data' }, { status: 400 })
        }

        // Retrieve Token
        const { data: settings } = await supabase.from('sys_settings').select('key, value').in('key', ['framer_access_token', 'framer_site_id'])
        const accessToken = settings?.find(s => s.key === 'framer_access_token')?.value
        let targetSiteId = siteId || settings?.find(s => s.key === 'framer_site_id')?.value

        if (targetSiteId && !targetSiteId.startsWith('http')) {
            const match = targetSiteId.match(/([a-zA-Z0-9\-]{20,})/)
            if (match) targetSiteId = match[1]
        }

        if (!accessToken || !targetSiteId) {
            return NextResponse.json({ error: 'Framer not connected' }, { status: 401 })
        }

        // Map data
        const fieldData: Record<string, any> = {}
        Object.entries(mapping || {}).forEach(([studioKey, framerSlug]) => {
            if (data[studioKey] !== undefined) {
                fieldData[framerSlug as string] = data[studioKey]
            }
        })

        const slugify = (text: string) => text
            .toString()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w-]+/g, '')
            .replace(/--+/g, '-');

        // Process Article Body: Extract the first image to use as BG Image, then strip all images from body text.
        if (type === 'draft' && data.body) {
            const imgMatch = data.body.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
            if (imgMatch && imgMatch[1]) {
                data.cover_url = imgMatch[1]; // Use the article's first image as the cover/BG Image
            }
            data.body = data.body.replace(/<img[^>]*>/gi, ''); // Strip images from CMS body text
        }

        // Promote enrichment media images (from staging modal) to cover_url if still not set
        if (!data.cover_url) {
            for (const key of ['image_1', 'image_2', 'image_3', 'image_4']) {
                if (data[key] && data[key] !== '') {
                    data.cover_url = data[key];
                    break;
                }
            }
        }

        // Normalize date: Framer requires ISO 8601 datetime, not just YYYY-MM-DD
        if (data._explicit_cms_date && /^\d{4}-\d{2}-\d{2}$/.test(data._explicit_cms_date)) {
            data._explicit_cms_date = new Date(data._explicit_cms_date + 'T12:00:00.000Z').toISOString();
        }

        console.log(`[Route] Resolved payload for Framer:`, {
            title: data.title, cover_url: data.cover_url, date: data._explicit_cms_date,
            description: data._explicit_cms_description?.slice?.(0, 60), article_url: data.article_url
        })

        // Defaults if mapping is empty
        if (Object.keys(fieldData).length === 0) {
            fieldData.title = data.title || data.name
            fieldData.slug = slugify(data.title || data.name || 'untitled')
            if (data._explicit_cms_description !== undefined) fieldData.description = data._explicit_cms_description
            else if (data.description) fieldData.description = data.description
            if (data.cover_url) fieldData.image = data.cover_url
        }

        // Refactored to use library-native methods (WebSocket) for reliability
        const { connect } = await import('framer-api')
        const framer = await connect(targetSiteId, accessToken)
        
        try {
            const collections = await framer.getCollections()
            
            // AUTO-RESOLVE CORRECT COLLECTION BY TYPE
            let resolvedCollectionId = collectionId;
            if (type) {
                const typeMapping: Record<string, string[]> = {
                    project: ['technology', 'projects', 'work', 'design', 'fashion', 'architecture', 'product', 'creative'],
                    press: ['press', 'awards', 'recognition'],
                    content: ['content', 'video', 'media', 'learning', 'talks'],
                    draft: ['articles', 'blog', 'journal', 'drafts', 'writing', 'post']
                };
                
                const keywords = typeMapping[type] || typeMapping.project;
                const matchingCollection = collections.find((c: any) => {
                    const name = c.name.toLowerCase();
                    return keywords.some(k => name.includes(k));
                });
                
                if (matchingCollection && matchingCollection.id !== collectionId) {
                    resolvedCollectionId = matchingCollection.id;
                    console.log(`[Route] Auto-resolved proper collection for type '${type}': ${matchingCollection.name} (${resolvedCollectionId})`);
                }
            }

            const collection = collections.find((c: any) => c.id === resolvedCollectionId)
            if (!collection) throw new Error(`Collection not found (ID: ${resolvedCollectionId})`)

            const fields = await collection.getFields()
            console.log(`[Route] Pushing to collection ${collection.name} with ${fields.length} fields...`)

            // WRAP DATA: The SDK expects { type: string, value: any } for Managed Collections
            const wrappedFieldData: Record<string, any> = {}
            fields.forEach((f: any) => {
                const name = f.name.toLowerCase()
                const slug = name.replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
                
                // Try to find value from fieldData (slug-matched)
                let rawValue = fieldData[slug] || 
                               fieldData[slug.replace(/-/g, "")] || 
                               fieldData[f.name] || 
                               fieldData[f.id]
                
                // Special mappings if not found by slug
                if (rawValue === undefined) {
                    if (slug === 'title' || slug === 'name') rawValue = data.title || data.name
                    else if (slug === 'slug') return // Managed slug
                    else if (slug === 'inner-title') rawValue = data.inner_title || (data.title ? `${data.title} /` : undefined)
                    else if (slug === 'content') rawValue = data.body
                    else if (slug === 'date' || slug === 'publish-date') {
                        if (data._explicit_cms_date !== undefined && data._explicit_cms_date !== '') rawValue = data._explicit_cms_date
                        else rawValue = data.target_date || data.date_achieved || data.publish_date || data.deadline
                    }
                    else if (slug === 'image' || slug === 'bg-image' || slug === 'cover-image') rawValue = data.cover_url
                    else if (slug === 'image-1' || slug === 'image1') rawValue = data.image_1
                    else if (slug === 'image-2' || slug === 'image2') rawValue = data.image_2
                    else if (slug === 'image-3' || slug === 'image3') rawValue = data.image_3
                    else if (slug === 'image-4' || slug === 'image4') rawValue = data.image_4
                    else if (slug === 'description' || slug === 'body-text' || slug === 'tagline') {
                        if (data._explicit_cms_description !== undefined) rawValue = data._explicit_cms_description
                        else rawValue = data.description || data.tagline || data.notes || data.body
                    }
                    else if (slug === 'view-article' || slug === 'article-url' || slug === 'article-link' || slug === 'article') rawValue = data.article_url
                    else if (slug === 'organization' || slug === 'client') rawValue = data.organization || data.client
                }

                // Strict Schema Sanitization for Framer constraints:
                // Framer silently drops the ENTIRE addItems payload if you send "" for images/links.
                if (rawValue === "" && (f.type === 'image' || f.type === 'link' || f.type === 'date')) {
                    rawValue = undefined;
                }

                if (rawValue !== undefined && rawValue !== null) {
                    wrappedFieldData[f.id] = { type: f.type, value: rawValue }
                }
            })

            const slug = fieldData.slug || slugify(data.title || data.name || 'untitled')
            // Helper to prevent infinite hanging
            const withTimeout = <T>(promise: Promise<T>, ms: number, message = 'Sync API timeout'): Promise<T> => {
                return Promise.race([
                    promise,
                    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), ms))
                ])
            }

            let syncedId = itemId;

            if (req.method === 'DELETE') {
                if (itemId) {
                    console.log(`[Route] Deleting item ${itemId}...`)
                    await withTimeout(collection.removeItems([itemId]), 15000, 'Framer delete operation timed out')
                }
                syncedId = null
            } else {
                // Push/Publish
                let targetFramerItem = null;
                const items = await withTimeout(collection.getItems(), 10000);
                
                if (itemId) {
                    targetFramerItem = items.find((i: any) => i.id === itemId);
                }
                
                // Fallback: If no itemId provided or item not found by ID, try finding by slug!
                if (!targetFramerItem) {
                    targetFramerItem = items.find((i: any) => i.slug === slug);
                }

                if (targetFramerItem) {
                    console.log(`[Route] Updating existing item (ID: ${targetFramerItem.id})...`);
                    await withTimeout(targetFramerItem.setAttributes({ fieldData: wrappedFieldData }), 15000, 'Framer update operation timed out');
                    syncedId = targetFramerItem.id;
                } else {
                    console.log(`[Route] Creating new item with slug: ${slug}...`);
                    await withTimeout(collection.addItems([{ fieldData: wrappedFieldData, slug }]), 15000, 'Framer create operation timed out');
                }

                // If we don't have an ID, fetch it (library doesn't return ID on creation)
                if (!syncedId) {
                    const freshItems = await withTimeout(collection.getItems(), 10000)
                    const newItem = freshItems.find((i: any) => i.slug === slug)
                    syncedId = newItem?.id
                }
            }

            // PERSISTENCE: Update the local record in Supabase
            if (localId && type) {
                const tableMap: Record<string, string> = {
                    press: 'studio_press',
                    project: 'studio_projects',
                    draft: 'studio_drafts',
                    content: 'studio_content',
                }
                const table = tableMap[type] || 'studio_projects'
                const { error: updateError } = await supabase
                    .from(table)
                    .update({ 
                        framer_cms_id: syncedId,
                        framer_collection_id: resolvedCollectionId,
                        framer_last_sync: new Date().toISOString()
                    })
                    .eq('id', localId)
                
                if (updateError) console.error('Supabase Update Error:', updateError)
            }

            // Small delay to ensure acknowledgment before disconnect
            await new Promise(r => setTimeout(r, 100))
            await framer.disconnect()

            return NextResponse.json({ 
                success: true, 
                cmsId: syncedId,
                timestamp: new Date().toISOString()
            })
        } catch (e: any) {
            await framer.disconnect()
            if (e.message?.includes('Session expired')) {
                throw new Error('Sync connection dropped. Please try again.')
            }
            throw e
        }
    } catch (err: any) {
        console.error('Framer Sync Error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const body = await req.json()
        const { siteId, collectionId, itemId, localId, type } = body

        if (!collectionId || !itemId) {
            return NextResponse.json({ error: 'Missing IDs (collectionId or itemId)' }, { status: 400 })
        }

        const { data: settings } = await supabase.from('sys_settings').select('key, value').in('key', ['framer_access_token', 'framer_site_id'])
        const accessToken = settings?.find(s => s.key === 'framer_access_token')?.value
        let targetSiteId = siteId || settings?.find(s => s.key === 'framer_site_id')?.value

        if (targetSiteId && !targetSiteId.startsWith('http')) {
            const match = targetSiteId.match(/([a-zA-Z0-9\-]{20,})/)
            if (match) targetSiteId = match[1]
        }

        if (!accessToken || !targetSiteId) {
            return NextResponse.json({ error: 'Framer not connected' }, { status: 401 })
        }

        // Use library-native removal
        const { connect } = await import('framer-api')
        const framer = await connect(targetSiteId, accessToken)
        
        try {
            const collections = await framer.getCollections()
            const collection = collections.find((c: any) => {
                const searchId = collectionId.toLowerCase()
                return c.id.toLowerCase() === searchId || c.name.toLowerCase() === searchId
            })
            if (!collection) throw new Error(`Collection not found (${collectionId})`)

            console.log(`[Route] Deleting item ${itemId} from ${collection.name}...`)
            
            // SDK removeItems is asynchronous and may close the session if returned early?
            // This error "Session expired" is likely from the SDK's internal handle closing.
            try {
                await collection.removeItems([itemId])
            } catch (remErr: any) {
                if (remErr.message?.includes('Missing IDs') || remErr.message?.includes('404')) {
                    // Item already gone or invalid, but we consider this a success for the "Remove" action
                    console.log('[Route] Item already removed or 404.')
                } else {
                    throw remErr
                }
            }

            // PERSISTENCE: Clear the ID in Supabase
            if (localId && type) {
                const tableMap: Record<string, string> = {
                    'project': 'studio_projects',
                    'press': 'studio_press',
                    'content': 'studio_content',
                    'draft': 'studio_drafts'
                }
                const table = tableMap[type]
                
                if (table) {
                    await supabase
                        .from(table)
                        .update({ 
                            framer_cms_id: null as any,
                            framer_collection_id: null as any,
                            framer_last_sync: null
                        })
                        .eq('id', localId)
                }
            }

            // Small delay to ensure acknowledgment before disconnect
            await new Promise(r => setTimeout(r, 100))
            await framer.disconnect()
            return NextResponse.json({ success: true })
        } catch (e: any) {
            await framer.disconnect()
            if (e.message?.includes('Session expired')) {
                throw new Error('Sync connection dropped. Please try again.')
            }
            throw e
        }
    } catch (err: any) {
        console.error('Framer Delete Error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
