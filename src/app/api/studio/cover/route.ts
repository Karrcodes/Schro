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

    try {
        const prompt = `Given this project or content piece: Title: "${title}", Tagline: "${tagline}", Type: "${type}". Extract exactly 1 or 2 highest-quality generic visual keywords representing it to find a relevant stock photo on a stock photography site. DO NOT include any punctuation, quotes, or conversational text. ONLY output the keywords separated by a comma. Example: 'finance,office' or 'health' or 'tech,code' or 'fitness,gym'. Keep it broad enough to guarantee a search hit.`

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
        const result = await model.generateContent(prompt)
        const keywords = result.response.text().trim().toLowerCase().replace(/[^a-z0-9,]/g, '')

        if (!keywords) throw new Error('No keywords')

        // Fetch the initial redirect from loremflickr
        const imageRes = await fetch(`https://loremflickr.com/${w}/${h}/${keywords}?lock=${id}`, { redirect: 'manual' })

        let finalUrl = imageRes.url
        if (imageRes.status >= 300 && imageRes.status < 400) {
            const dest = imageRes.headers.get('location')
            if (dest) {
                finalUrl = dest.startsWith('http') ? dest : `https://loremflickr.com${dest}`
            }
        }

        // Save the permanent URL to Supabase so it never changes unless the user explicitly removes it
        if (id && type) {
            const table = type === 'content' ? 'studio_content' : 'studio_projects'
            const { error } = await supabase.from(table).update({ cover_url: finalUrl }).eq('id', id)
            if (error) console.error("Error saving cover_url to database:", error)
        }

        return NextResponse.redirect(finalUrl, 302)
    } catch (e) {
        // Fallback if AI fails or rate limits
        const fallback = encodeURIComponent((title.split(' ')[0] + ',' + (type || 'abstract')).toLowerCase())
        const fallbackRes = await fetch(`https://loremflickr.com/${w}/${h}/${fallback}?lock=${id}`, { redirect: 'manual' })
        let finalUrl = fallbackRes.url
        if (fallbackRes.status >= 300 && fallbackRes.status < 400) {
            const dest = fallbackRes.headers.get('location')
            if (dest) {
                finalUrl = dest.startsWith('http') ? dest : `https://loremflickr.com${dest}`
            }
        }

        if (id && type) {
            const table = type === 'content' ? 'studio_content' : 'studio_projects'
            await supabase.from(table).update({ cover_url: finalUrl }).eq('id', id)
        }

        return NextResponse.redirect(finalUrl, 302)
    }
}
