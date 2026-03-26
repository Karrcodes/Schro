
import { createServiceClient } from '@/lib/supabase/service';

const FRAMER_API_TOKEN = process.env.FRAMER_API_TOKEN;
const FRAMER_PROJECT_ID = process.env.FRAMER_PROJECT_ID;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export interface FramerSyncResponse {
    success: boolean;
    error?: string;
    itemId?: string;
}

const stageMap: Record<string, string> = {
  todo: "Proposal",
  in_progress: "In Progress",
  done: "Completed",
  archived: "Completed"
}

/**
 * Synchronize a single job to Framer using the REST API
 */
export async function syncJobToFramer(jobId: string): Promise<FramerSyncResponse> {
    const supabase = createServiceClient();
    
    try {
        console.log(`[RemoteSync] Processing job ${jobId}...`);
        
        // Fetch credentials from sys_settings
        const { data: settings } = await supabase
            .from('sys_settings')
            .select('key, value')
            .in('key', ['framer_access_token', 'framer_site_id']);

        const dbToken = settings?.find(s => s.key === 'framer_access_token')?.value;
        const dbProjectId = settings?.find(s => s.key === 'framer_site_id')?.value;

        const token = dbToken || process.env.FRAMER_API_TOKEN;
        const projectId = dbProjectId || process.env.FRAMER_PROJECT_ID;
        
        if (!token || !projectId) {
            throw new Error('Missing Framer API credentials. Please link your project in settings.');
        }

        // 1. Fetch job details
        const { data: job, error: jobError } = await supabase
            .from('framer_sync_jobs')
            .select('*')
            .eq('id', jobId)
            .single();
            
        if (jobError || !job) {
            return { success: false, error: `Job not found: ${jobError?.message}` };
        }

        // 2. Mark as processing
        await supabase
            .from('framer_sync_jobs')
            .update({ status: 'processing', updated_at: new Date().toISOString() })
            .eq('id', jobId);

        // 3. Fetch item data
        const syncUrl = `${APP_URL}/api/studio/sync`;
        console.log(`[RemoteSync] Fetching Studio data from ${syncUrl}...`);
        const syncRes = await fetch(syncUrl);
        if (!syncRes.ok) throw new Error(`Failed to fetch Studio data: ${syncRes.statusText}`);
        
        const syncData = await syncRes.json();
        
        let item: any = null;
        if (job.item_type === 'project') item = syncData.projects?.find((p: any) => p.id === job.item_id);
        else if (job.item_type === 'press') item = syncData.press?.find((p: any) => p.id === job.item_id);
        else if (job.item_type === 'content') item = syncData.content?.find((p: any) => p.id === job.item_id);

        if (!item) {
            throw new Error(`Item ${job.item_id} (${job.item_type}) not found in Studio API response`);
        }

        // 4. Connect to Framer using the official API package
        console.log(`[RemoteSync] Connecting to Framer: ${projectId}...`);
        const { connect } = await import('framer-api');
        const framer = await connect(projectId, token);

        // 5. Find the collection
        console.log(`[RemoteSync] Fetching collections...`);
        const collections = await framer.getCollections();
        const collection = collections.find((c: any) => 
            c.name.toLowerCase().replace(/\s+/g, " ").trim() === 
            job.collection_name.toLowerCase().replace(/\s+/g, " ").trim()
        );
        
        if (!collection) {
            await framer.disconnect();
            throw new Error(`Collection "${job.collection_name}" not found in Framer project.`);
        }

        const slug = slugify(item.title || 'item');
        console.log(`[RemoteSync] Target Slug: ${slug}, Collection: ${collection.id}`);

        // Handle Hide Action
        if (job.action === 'hide') {
            console.log(`[RemoteSync] Hiding item ${slug}...`);
            const items = await collection.getItems();
            const target = items.find((i: any) => i.slug === slug || i.id === job.framer_cms_id);
            
            if (target) {
                const fields = await collection.getFields();
                const visibleField = fields.find((f: any) => f.name.toLowerCase() === 'visible');
                if (visibleField) {
                    await target.setAttributes({
                        fieldData: {
                            [visibleField.id]: { type: "boolean", value: false }
                        }
                    });
                }
            }
            
            await framer.disconnect();
            await supabase
                .from('framer_sync_jobs')
                .update({ status: 'done', updated_at: new Date().toISOString() })
                .eq('id', job.id);
            return { success: true };
        }

        // 6. Build field data Record
        const fields = await collection.getFields();
        const fieldData = buildServerFieldData(fields, item, job.collection_name);
        const collectionId = collection.id;
        
        // Check if item already exists to get ID if missing
        console.log(`[RemoteSync] Checking for existing items in collection ${collectionId}...`);
        const items = await collection.getItems();
        const existingItem = items.find((i: any) => i.slug === slug || i.id === job.framer_cms_id);

        // Handle Actions via Library (WebSocket) for reliability
        const itemId = job.framer_cms_id || existingItem?.id;
        let framerId = itemId;

        if (job.action === 'delete') {
            if (itemId) {
                console.log(`[RemoteSync] Deleting item ${itemId}...`);
                await collection.removeItems([itemId]);
            }
            framerId = null; // Clear ID on delete
        } else {
            // Push/Publish
            if (itemId) {
                // Update existing
                console.log(`[RemoteSync] Updating item ${itemId}...`);
                const itemToUpdate = items.find((i: any) => i.id === itemId);
                if (itemToUpdate) {
                    await itemToUpdate.setAttributes({ fieldData });
                } else {
                    console.warn(`[RemoteSync] Item ${itemId} not found in collection, creating new one.`);
                    await collection.addItems([{ fieldData, slug }]);
                }
            } else {
                // Create new
                console.log(`[RemoteSync] Creating new item with slug ${slug}...`);
                await collection.addItems([{ fieldData, slug }]);
            }

            // Sync again to get the ID if we just created it
            if (!framerId) {
                console.log(`[RemoteSync] Fetching new item ID...`);
                const freshItems = await collection.getItems();
                const newItem = freshItems.find((i: any) => i.slug === slug);
                framerId = newItem?.id;
            }
        }

        await framer.disconnect();

        console.log(`[RemoteSync] Success! Action: ${job.action}, Framer ID: ${framerId}`);

        // 8. Complete job
        await supabase
            .from('framer_sync_jobs')
            .update({ 
                status: 'done', 
                framer_cms_id: framerId,
                updated_at: new Date().toISOString()
            })
            .eq('id', jobId);

        // 9. Update the actual item table (Project/Press/Content)
        const tableMap: Record<string, string> = {
            project: 'studio_projects',
            press: 'studio_press',
            content: 'studio_content'
        };

        if (tableMap[job.item_type]) {
            await supabase
                .from(tableMap[job.item_type])
                .update({ 
                    framer_cms_id: framerId,
                    last_synced_at: new Date().toISOString()
                })
                .eq('id', job.item_id);
        }

        return { success: true, itemId: framerId };

    } catch (err: any) {
        console.error('[RemoteSync] Error:', err.message);
        // Ensure job is marked as error (IMPORTANT: 'error' instead of 'failed')
        const supabase = createServiceClient();
        await supabase
            .from('framer_sync_jobs')
            .update({ 
                status: 'error', 
                error_message: err.message,
                updated_at: new Date().toISOString()
            })
            .eq('id', jobId);
            
        return { success: false, error: err.message };
    }
}

function slugify(text: string): string {
  return text.toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

function buildServerFieldData(fields: any[], item: any, collectionName: string): Record<string, any> {
  const fieldData: Record<string, any> = {}
  const innerTitle = `${item.title || 'Untitled'} /`
  const safeTitle = item.title || "Untitled"

  fields.forEach((f: any) => {
    const key = f.name.toLowerCase().replace(/\s+/g, "")
    if (key === "slug") return 
    
    let value: any = null
    if (key === "title") value = safeTitle
    else if (key === "visible") value = true
    else if (key === "innertitle") value = innerTitle
    else if (key === "bodytext") value = item.description || item.notes || item.body || ""
    else if (key === "bgimage") value = item.cover_url
    else if (key === "image1") value = item.images?.[0]
    else if (key === "image2") value = item.images?.[1]
    else if (key === "image3") value = item.images?.[2]
    else if (key === "image4") value = item.images?.[3]
    else if (key === "date") value = item.target_date || item.date_achieved || item.publish_date || item.created_at
    else if (key === "client") value = item.client
    else if (key === "location") value = item.location
    else if (key === "stage") value = stageMap[item.status] || "Proposal"
    else if (key === "showdate") value = item.show_date ?? false
    else if (key === "featuredon") value = item.organization
    else if (key === "view" || key === "medialink") value = item.url
    else if (key === "viewproject") value = item.project_url
    else if (key === "viewarticle") value = item.article_url
    else if (key === "file") value = item.file_url
    else if (key === "category") value = item.type || item.category || collectionName
    
    if (value !== null && value !== undefined) {
      if (typeof value === "string" && !value.trim() && (f.type === "image" || f.type === "date" || f.type === "formattedText" || f.type === "link")) {
        return
      }
      fieldData[f.id] = { type: f.type, value }
    }
  })

  return fieldData
}
