import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function generateWithImagen(prompt: string, debug: string[]): Promise<Buffer | null> {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict?key=${process.env.GEMINI_API_KEY}`
        
        debug.push(`✨ Hitting Google Imagen 4.0 API...`)
        
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                instances: [{ prompt: prompt }],
                parameters: { sampleCount: 1 }
            })
        })
        
        if (!res.ok) {
            const errBody = await res.text()
            debug.push(`❌ Imagen API Error: ${res.status} - ${errBody.substring(0, 100)}`)
            return null
        }

        const data = await res.json()
        if (data.predictions && data.predictions.length > 0) {
            const base64str = data.predictions[0].bytesBase64Encoded
            debug.push(`✅ Imagen 4.0 Success: Retrieved ${base64str.length} chars of base64 data.`)
            return Buffer.from(base64str, 'base64')
        } else {
            debug.push(`❌ Imagen payload missing predictions.`)
            return null
        }
    } catch (err: any) {
        debug.push(`❌ Imagen Crash: ${err.message}`)
        return null
    }
}

async function downloadAndUploadImage(buffer: Buffer, folder: string, fileName: string) {
    try {
        const { data, error } = await supabase.storage
            .from('studio-assets')
            .upload(`${folder}/${fileName}`, buffer, {
                contentType: 'image/jpeg',
                upsert: true
            })
        if (error) throw error
        const { data: urlData } = supabase.storage.from('studio-assets').getPublicUrl(data.path)
        return urlData.publicUrl
    } catch (err) {
        return null
    }
}

export async function GET(req: NextRequest) {
    const url = new URL(req.url)
    const title = url.searchParams.get('title') || 'Schrö Project'
    const type = url.searchParams.get('type') || 'project'
    const id = url.searchParams.get('id')
    const tagline = url.searchParams.get('tagline') || ''
    
    const absoluteFallback = `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&h=630&q=80&fm=jpg`
    let debug: string[] = [`Engine start for: ${title}`]
    let finalImageUrl = ''

    try {
        // 1. Expand Prompt - Fix for Gemini 404 Model Error
        let artPrompt = `Vivid cinematic photography of ${title}${tagline ? ` (${tagline})` : ''}, professional lighting, 8k.`
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" }) 
            const context = tagline ? `context: ${tagline}. ` : ''
            const result = await model.generateContent(`Create a 30-word vivid cinematic image prompt for: "${title}". ${context}Focus on the core essence and high-impact visual style.`)
            artPrompt = result.response.text().trim().replace(/\n/g, ' ')
            debug.push(`✅ Gemini 2.5 Expansion: ${artPrompt.substring(0, 50)}...`)
        } catch (e: any) { 
            debug.push(`⚠️ Gemini Skip: ${e.message}`)
        }

        // 2. Try Image Generation (Imagen 4.0)
        debug.push(`🚀 Rendering with Imagen 4.0...`)
        let buffer = await generateWithImagen(artPrompt, debug)
        
        if (buffer) {
            debug.push(`✅ Image Buffer Received (${buffer.length} bytes)`)
            const folder = type === 'content' ? 'content-covers' : 
                           type === 'goal' ? 'goal-covers' :
                           type === 'wishlist' ? 'wishlist-covers' :
                           type === 'press' ? 'press-covers' : 
                           type === 'aspiration' ? 'aspiration-covers' : 'project-covers'
            const fileName = `${type}_${id || 'anon'}_${Date.now()}.png`
            
            debug.push(`📤 Uploading to Supabase Storage...`)
            const internalUrl = await downloadAndUploadImage(buffer, folder, fileName)
            
            if (internalUrl) {
                finalImageUrl = internalUrl
                debug.push(`✅ Storage Success: ${internalUrl}`)
                if (id && type && id !== 'null') {
                    let table = ''
                    let column = 'cover_url'
                    
                    if (type === 'content') table = 'studio_content'
                    else if (type === 'project') table = 'studio_projects'
                    else if (type === 'press') table = 'studio_press'
                    else if (type === 'goal') { table = 'sys_goals'; column = 'vision_image_url' }
                    else if (type === 'wishlist') { table = 'sys_wishlist'; column = 'image_url' }
                    else if (type === 'aspiration') { table = 'sys_aspirations'; column = 'vision_image_url' }
                    
                    if (table) {
                        await supabase.from(table).update({ [column]: internalUrl }).eq('id', id)
                        debug.push(`✅ Database Updated (${table}.${column})`)
                    }
                }
            } else {
                debug.push(`⚠️ Storage Fail. Returning fallback.`)
                finalImageUrl = absoluteFallback
            }
        } else {
            debug.push(`❌ Image Generation Failed. Falling back.`)
            finalImageUrl = absoluteFallback
        }

        if (url.searchParams.get('json') === 'true') {
            return NextResponse.json({ url: finalImageUrl, debug })
        }
        return NextResponse.redirect(new URL(finalImageUrl), 302)

    } catch (e: any) {
        return NextResponse.json({ url: absoluteFallback, error: e.message, debug })
    }
}
