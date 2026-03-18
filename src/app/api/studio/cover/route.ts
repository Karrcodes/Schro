import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function GET(req: NextRequest) {
    const url = new URL(req.url)
    const title = url.searchParams.get('title') || ''
    const tagline = url.searchParams.get('tagline') || ''
    const type = url.searchParams.get('type') || ''
    const id = url.searchParams.get('id') || '1'
    const w = url.searchParams.get('w') || '1200'
    const h = url.searchParams.get('h') || '630'

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
                    
                    // Use Gemini to extract the most appropriate image URL from the header/HTML
                    // Increase snippet size to handle sites with large <head> sections like Amazon
                    const extractorModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
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
                    
                    // Fallback regex if AI didnt return a clean URL - search the WHOLE HTML for og:image if snippet failed
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
            const prompt = `Given this project or content piece: Title: "${title}", Tagline: "${tagline}", Type: "${type}". Extract exactly 1 or 2 highest-quality generic visual keywords representing it to find a relevant stock photo on a stock photography site. DO NOT include any punctuation, quotes, or conversational text. ONLY output the keywords separated by a comma. Example: 'finance,office' or 'health' or 'tech,code' or 'fitness,gym'. Keep it broad enough to guarantee a search hit.`

            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
            const result = await model.generateContent(prompt)
            const keywords = result.response.text().trim().toLowerCase().replace(/[^a-z0-9,]/g, '')

            if (!keywords) throw new Error('No keywords')

            // Fetch the initial redirect from loremflickr
            const imageRes = await fetch(`https://loremflickr.com/${w}/${h}/${keywords}?lock=${id}`, { redirect: 'manual' })

            finalImageUrl = imageRes.url
            if (imageRes.status >= 300 && imageRes.status < 400) {
                const dest = imageRes.headers.get('location')
                if (dest) {
                    finalImageUrl = dest.startsWith('http') ? dest : `https://loremflickr.com${dest}`
                }
            }
        }

        // Save the permanent URL to Supabase so it never changes unless the user explicitly removes it
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

            if (table) {
                const { error } = await supabase.from(table).update({ [column]: finalImageUrl }).eq('id', id)
                if (error) console.error(`Error saving ${column} to ${table}:`, error)
            }
        }

        return NextResponse.redirect(new URL(finalImageUrl), 302)
    } catch (e) {
        // Fallback if AI fails or rate limits
        const fallback = encodeURIComponent((title.split(' ')[0] + ',' + (type || 'abstract')).toLowerCase())
        const fallbackRes = await fetch(`https://loremflickr.com/${w}/${h}/${fallback}?lock=${id}`, { redirect: 'manual' })
        let finalImageUrlFallback = fallbackRes.url
        if (fallbackRes.status >= 300 && fallbackRes.status < 400) {
            const dest = fallbackRes.headers.get('location')
            if (dest) {
                finalImageUrlFallback = dest.startsWith('http') ? dest : `https://loremflickr.com${dest}`
            }
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

            if (table) {
                await supabase.from(table).update({ [column]: finalImageUrlFallback }).eq('id', id)
            }
        }

        return NextResponse.redirect(new URL(finalImageUrlFallback), 302)
    }
}
