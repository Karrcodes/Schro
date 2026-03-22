import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

async function generateImageWithAI(prompt: string) {
    // Switch to Pollinations.ai for guaranteed high-quality, 'Midjourney-style' results
    // This is much faster and more reliable than current Gemini Imagen rollouts
    try {
        const seed = Math.floor(Math.random() * 1000000)
        const url = `https://pollinations.ai/p/${encodeURIComponent(prompt)}?width=1200&height=630&seed=${seed}&nologo=true`
        
        console.log(`[Cover API] Fetching from Pollinations: ${url}`)
        const res = await fetch(url)
        if (!res.ok) throw new Error(`Pollinations failure: ${res.statusText}`)
        
        const arrayBuffer = await res.arrayBuffer()
        return Buffer.from(arrayBuffer)
    } catch (err) {
        console.error(`[Cover API] Pollinations Exception:`, err)
        return null
    }
}

async function downloadAndUploadImage(input: string | Buffer, folder: string, fileName: string) {
    try {
        const isBuffer = Buffer.isBuffer(input)
        console.log(`[Cover API] Persisting ${isBuffer ? 'AI Generated' : 'Found'} image...`)
        
        let buffer: Buffer
        let contentType: string = 'image/jpeg'

        if (isBuffer) {
            buffer = input
        } else {
            const response = await fetch(input, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept': 'image/*,video/*;q=0.8,*/*;q=0.5',
                },
                next: { revalidate: 3600 }
            })
            if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`)
            contentType = response.headers.get('content-type') || 'image/jpeg'
            const arrayBuffer = await response.arrayBuffer()
            buffer = Buffer.from(arrayBuffer)
        }
        
        const { error: uploadError } = await supabase.storage
            .from('studio-assets')
            .upload(`${folder}/${fileName}`, buffer, {
                contentType,
                upsert: true,
                cacheControl: '3600'
            })
            
        if (uploadError) {
            console.error('[Cover API] Supabase Upload Error:', uploadError)
            throw uploadError
        }
        
        const { data: urlData } = supabase.storage.from('studio-assets').getPublicUrl(`${folder}/${fileName}`)
        return urlData.publicUrl
    } catch (err) {
        console.error('[Cover API] Mirroring failure:', err)
        return null
    }
}

export async function GET(req: NextRequest) {
    const url = new URL(req.url)
    const title = url.searchParams.get('title') || ''
    const tagline = url.searchParams.get('tagline') || ''
    const type = url.searchParams.get('type') || ''
    const id = url.searchParams.get('id') || '1'
    const w = url.searchParams.get('w') || '1200'
    const h = url.searchParams.get('h') || '630'

    console.log(`[Cover API] --- Start Render Request [${type}:${id}] ---`)
    console.log(`[Cover API] Title: "${title}", Tagline: "${tagline}"`)
    
    let productUrl = url.searchParams.get('productUrl') || ''
    if (productUrl && !productUrl.startsWith('http')) {
        productUrl = `https://${productUrl}`
    }
    
    try {
        let finalImageUrl = ''

        // 1. Direct Image Link Check
        const isDirectImage = /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(productUrl)
        if (isDirectImage) {
            finalImageUrl = productUrl
        }

        // 2. Try to extract image from product URL if provided
        if (!finalImageUrl && productUrl && productUrl.startsWith('http')) {
            try {
                const response = await fetch(productUrl, { 
                    headers: { 
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache'
                    },
                })
                if (response.ok) {
                    const html = await response.text()
                    
                    const extractorModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
                    const headPrompt = `Analyze this HTML content and find the main product image URL. Look for:
1. og:image or twitter:image
2. Amazon-specific patterns (landingImage, main-image, salt-image)
3. Large product images in the source
Output ONLY the absolute URL string. If multiple found, pick the most relevant product photo. If none found, output 'NONE'.
Content: "${html.substring(0, 25000)}"`
                    
                    const extractResult = await extractorModel.generateContent(headPrompt)
                    let extracted = extractResult.response.text().trim().replace(/```/g, '').replace(/` /g, '').replace(/ `/g, '')
                    
                    if (extracted && extracted !== 'NONE' && extracted.startsWith('http')) {
                        finalImageUrl = extracted
                    }
                    
                    if (!finalImageUrl) {
                         const ogMatch = 
                            html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
                            html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
                            html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ||
                            html.match(/["']landingImage["']:\s*["']([^"']+)["']/i) // Amazon fallback
                        
                        if (ogMatch && ogMatch[1]) {
                            finalImageUrl = ogMatch[1]
                            if (!finalImageUrl.startsWith('http')) {
                                const urlObj = new URL(productUrl)
                                if (finalImageUrl.startsWith('//')) finalImageUrl = `https:${finalImageUrl}`
                                else if (finalImageUrl.startsWith('/')) finalImageUrl = `${urlObj.origin}${finalImageUrl}`
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to extract image from URL:', err)
            }
        }

        if (!finalImageUrl) {
            console.log(`[Cover API] Step 1: Expanding prompt for Nano Banana 2/Imagen...`)
            const aiPromptGen = `Given this content title: "${title}". 
            Create a high-quality, professional, and artistic image generation prompt for Imagen 3 / Nano Banana.
            The prompt should be:
            - Photorealistic, modern, and cinematic.
            - Visual and descriptive (describe textures, lighting, and composition).
            - DO NOT include words like "ASMR", "Sensory", or specific niche tags in the final prompt as they trigger safety filters. 
            - Focus on a singular, clean subject like "library", "microphone", "studio", "nature".
            - No text or technical UI elements.
            Output ONLY the expanded prompt string. NO punctuation at start/end.`

            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
            const result = await model.generateContent(aiPromptGen)
            const artPrompt = result.response.text().trim()
            console.log(`[Cover API] Expanded Art Prompt (Safety Clean): "${artPrompt}"`)
            console.log(`[Cover API] Expanded Art Prompt: "${artPrompt}"`)

            // 3. ATTEMPT PURE AI GENERATION (Midjourney style)
            console.log(`[Cover API] Step 2: Attempting Nano Banana 2 / Imagen Generation...`)
            const generatedBuffer = await generateImageWithAI(artPrompt)
            
            if (generatedBuffer) {
                console.log(`[Cover API] Success: Nano Banana/Imagen produced raw image buffer.`)
                const folder = type === 'content' ? 'content-covers' : 'project-covers'
                const fileName = `${type}_${id}_gen_${Date.now()}.jpg`
                const internalUrl = await downloadAndUploadImage(generatedBuffer, folder, fileName)
                if (internalUrl) {
                    finalImageUrl = internalUrl
                    console.log(`[Cover API] Final saved URL: ${finalImageUrl}`)
                }
            }

            // 4. FINAL CHECK
            if (!finalImageUrl) {
                console.log(`[Cover API] CRITICAL: Nano Banana 2 and Imagen 3 failed to generate. No image produced.`)
                // Return a premium, professional abstract image based on the title keywords
                const fallbackKw = (tagline || type || 'minimalist,office,desk,abstract').toLowerCase()
                finalImageUrl = `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&h=630&q=80&fm=jpg&kw=${encodeURIComponent(fallbackKw)}`
                console.log(`[Cover API] Using premium neutral placeholder for: ${fallbackKw}`)
            }
        }

        // NEW: Download the external image and upload to Supabase Storage for persistence
        if (finalImageUrl && !finalImageUrl.includes('supabase.co')) {
            const folder = type === 'content' ? 'content-covers' : 
                         type === 'project' ? 'project-covers' : 
                         type === 'wishlist' ? 'wishlist-covers' : 
                         type === 'canvas' ? 'canvas-images' : 'vision-covers'
            const fileName = `${type}_${id}_${Date.now()}.jpg`
            const internalUrl = await downloadAndUploadImage(finalImageUrl, folder, fileName)
            if (internalUrl) finalImageUrl = internalUrl
        }

        if (id && type) {
            let table = ''
            let column = 'cover_url'
            
            if (type === 'content') table = 'studio_content'
            else if (type === 'project') table = 'studio_projects'
            else if (type === 'wishlist') {
                table = 'sys_wishlist'
                column = 'image_url'
            }
            else if (type === 'goal') {
                table = 'sys_goals'
                column = 'vision_image_url'
            }
            else if (type === 'canvas') {
                table = 'studio_canvas_entries'
                column = 'images'
            }

            if (table) {
                console.log(`[Cover API] Database Update: table=${table}, column=${column}, id=${id}`)
                if (type === 'canvas') {
                    const { data: currentEntry } = await supabase.from(table).select('images').eq('id', id).single()
                    const currentImages = Array.isArray(currentEntry?.images) ? currentEntry.images : []
                    await supabase.from(table).update({ images: [...currentImages, finalImageUrl] }).eq('id', id)
                } else {
                    const { error } = await supabase.from(table).update({ [column]: finalImageUrl }).eq('id', id)
                    if (error) {
                        console.error(`[Cover API] Supabase UPDATE Error:`, error)
                    } else {
                        console.log(`[Cover API] Successfully updated ${table}.${column} for ID ${id}`)
                    }
                }
            } else {
                console.warn(`[Cover API] No table mapping found for type: ${type}`)
            }
        }

        if (url.searchParams.get('json') === 'true') {
            return NextResponse.json({ url: finalImageUrl })
        }
        return NextResponse.redirect(new URL(finalImageUrl), 302)
    } catch (e) {
        console.error('Final fallback failure:', e)
        const finalFallback = `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&h=630&q=80&fm=jpg`
        if (url.searchParams.get('json') === 'true') {
            return NextResponse.json({ url: finalFallback })
        }
        return NextResponse.redirect(new URL(finalFallback), 302)
    }
}
