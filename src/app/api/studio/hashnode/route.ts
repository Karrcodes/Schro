import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin'

const HASHNODE_GQL = 'https://gql.hashnode.com'

async function getHashnodeConfig() {
    // 1. Check Env
    if (process.env.HASHNODE_API_TOKEN && process.env.HASHNODE_PUBLICATION_ID) {
        return { 
            token: process.env.HASHNODE_API_TOKEN, 
            publicationId: process.env.HASHNODE_PUBLICATION_ID,
            source: 'env' 
        }
    }

    // 2. Fallback to Supabase
    const { data } = await supabase
        .from('sys_settings')
        .select('key, value')
        .in('key', ['hashnode_token', 'hashnode_publication_id'])

    const token = data?.find(s => s.key === 'hashnode_token')?.value
    const publicationId = data?.find(s => s.key === 'hashnode_publication_id')?.value
    return { token, publicationId, source: 'db' }
}

async function graphql(token: string, query: string, variables?: Record<string, any>) {
    const res = await fetch(HASHNODE_GQL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token,
        },
        body: JSON.stringify({ query, variables }),
    })
    const json = await res.json()
    if (json.errors) throw new Error(json.errors[0].message)
    return json.data
}

// Strips TipTap HTML to plain text for the subtitle/brief
function htmlToText(html: string): string {
    return html
        .replace(/<img[^>]*>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/h[1-6]>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n{3,}/g, '\n\n')
        .trim()
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const endpoint = searchParams.get('endpoint')

    if (endpoint === 'config') {
        const { token, publicationId, source } = await getHashnodeConfig()
        return NextResponse.json({ 
            connected: !!(token && publicationId), 
            publicationId,
            source 
        })
    }

    return NextResponse.json({ error: 'Invalid endpoint' }, { status: 400 })
}

export async function POST(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const endpoint = searchParams.get('endpoint')

    try {
        const body = await req.json()

        // Save config
        if (endpoint === 'save-config') {
            const { token, publicationId } = body
            await supabase.from('sys_settings').upsert([
                { key: 'hashnode_token', value: token, updated_at: new Date().toISOString() },
                { key: 'hashnode_publication_id', value: publicationId, updated_at: new Date().toISOString() },
            ], { onConflict: 'key' })
            return NextResponse.json({ success: true })
        }

        // Test connection
        if (endpoint === 'test') {
            const { token } = body
            const data = await graphql(token, '{ me { username name } }')
            return NextResponse.json({ success: true, username: data.me?.username })
        }

        // Publish article
        const { title, body: htmlBody, coverUrl, localId, hashnodePostId, subtitle: providedSubtitle } = body
        const { token, publicationId } = await getHashnodeConfig()

        if (!token || !publicationId) {
            return NextResponse.json({ error: 'Hashnode not configured' }, { status: 401 })
        }

        const plainText = htmlToText(htmlBody || '')
        const subtitle = providedSubtitle !== undefined ? providedSubtitle : plainText.slice(0, 250).trim()

        const contentMarkdown = htmlBody
            ? htmlBody
                .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
                .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
                .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
                .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
                .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<\/p>/gi, '\n\n')
                .replace(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi, '![]($1)\n\n')
                .replace(/<[^>]+>/g, '')
                .trim()
            : ''

        const slugify = (text: string) => text
            .toLowerCase().trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w-]+/g, '')
            .replace(/--+/g, '-')
            .slice(0, 60)

        // Hashnode requires titles to be at least 6 characters long
        const safeTitle = title.length < 6 ? title.padEnd(6, '\u200B') : title;

        if (hashnodePostId) {
            // UPDATE existing post
            const data = await graphql(token, `
                mutation UpdatePost($input: UpdatePostInput!) {
                    updatePost(input: $input) {
                        post { id url title }
                    }
                }
            `, {
                input: {
                    id: hashnodePostId,
                    title: safeTitle,
                    contentMarkdown,
                    ...(subtitle ? { subtitle } : {}),
                    ...(coverUrl ? { coverImageOptions: { coverImageURL: coverUrl } } : {}),
                }
            })
            const post = data.updatePost.post
            if (localId) {
                const { data: currentDraft } = await supabase.from('studio_drafts').select('stage_data').eq('id', localId).single()
                const stageData = currentDraft?.stage_data || {}
                await supabase.from('studio_drafts').update({
                    article_url: post.url,
                    framer_cms_id: localId, // keep existing
                    stage_data: { ...stageData, hashnode_post_id: post.id }
                }).eq('id', localId)
            }
            return NextResponse.json({ url: post.url, postId: post.id })
        } else {
            // CREATE new post
            const data = await graphql(token, `
                mutation PublishPost($input: PublishPostInput!) {
                    publishPost(input: $input) {
                        post { id url title }
                    }
                }
            `, {
                input: {
                    title: safeTitle,
                    publicationId,
                    contentMarkdown,
                    slug: slugify(title),
                    ...(subtitle ? { subtitle } : {}),
                    ...(coverUrl ? { coverImageOptions: { coverImageURL: coverUrl } } : {}),
                    tags: [],
                }
            })
            const post = data.publishPost.post
            if (localId) {
                const { data: currentDraft } = await supabase.from('studio_drafts').select('stage_data').eq('id', localId).single()
                const stageData = currentDraft?.stage_data || {}
                await supabase.from('studio_drafts').update({
                    article_url: post.url,
                    stage_data: { ...stageData, hashnode_post_id: post.id }
                }).eq('id', localId)
            }
            return NextResponse.json({ url: post.url, postId: post.id })
        }

    } catch (err: any) {
        console.error('[Hashnode] Error:', err.message)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { postId, localId } = await req.json()
        let targetPostId = postId

        if (!targetPostId && localId) {
            const { data: draft } = await supabase.from('studio_drafts').select('stage_data').eq('id', localId).single()
            if (draft?.stage_data?.hashnode_post_id) {
                targetPostId = draft.stage_data.hashnode_post_id
            }
        }

        if (!targetPostId) return NextResponse.json({ error: 'Missing Hashnode post ID' }, { status: 400 })

        const { token } = await getHashnodeConfig()
        if (!token) return NextResponse.json({ error: 'Hashnode not configured' }, { status: 401 })

        await graphql(token, `
            mutation RemovePost($input: RemovePostInput!) {
                removePost(input: $input) { post { id } }
            }
        `, { input: { id: targetPostId } })

        if (localId) {
            const { data: currentDraft } = await supabase.from('studio_drafts').select('stage_data').eq('id', localId).single()
            const stageData = currentDraft?.stage_data || {}
            delete stageData.hashnode_post_id
            await supabase.from('studio_drafts').update({ article_url: null, stage_data: stageData }).eq('id', localId)
        }

        return NextResponse.json({ success: true })
    } catch (err: any) {
        console.error('[Hashnode] Delete error:', err.message)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
