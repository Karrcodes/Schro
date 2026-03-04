import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function GET(req: NextRequest) {
    const url = new URL(req.url)
    const title = url.searchParams.get('title') || ''
    const tagline = url.searchParams.get('tagline') || ''
    const type = url.searchParams.get('type') || ''
    const id = url.searchParams.get('id') || '1'
    const w = url.searchParams.get('w') || '800'
    const h = url.searchParams.get('h') || '600'

    try {
        const prompt = `Given this project or content piece: Title: "${title}", Tagline: "${tagline}", Type: "${type}". Extract exactly 1 or 2 highest-quality generic visual keywords representing it to find a relevant stock photo on a stock photography site. DO NOT include any punctuation, quotes, or conversational text. ONLY output the keywords separated by a comma. Example: 'finance,office' or 'health' or 'tech,code' or 'fitness,gym'. Keep it broad enough to guarantee a search hit.`

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
        const result = await model.generateContent(prompt)
        const keywords = result.response.text().trim().toLowerCase().replace(/[^a-z0-9,]/g, '')

        if (!keywords) throw new Error('No keywords')

        // Fetch the image from loremflickr (which redirects to a real image)
        // By fetching server-side, we follow the redirect, get the real image buffer, and cache it!
        const imageRes = await fetch(`https://loremflickr.com/${w}/${h}/${keywords}?lock=${id}`)

        if (!imageRes.ok) throw new Error('Flickr fetch failed')

        return new NextResponse(imageRes.body, {
            headers: {
                'Content-Type': imageRes.headers.get('Content-Type') || 'image/jpeg',
                'Cache-Control': 'public, max-age=31536000, immutable',
            }
        })
    } catch (e) {
        // Fallback if AI fails or rate limits
        const fallback = encodeURIComponent((title.split(' ')[0] + ',' + (type || 'abstract')).toLowerCase())
        const fallbackRes = await fetch(`https://loremflickr.com/${w}/${h}/${fallback}?lock=${id}`)

        return new NextResponse(fallbackRes.body, {
            headers: {
                'Content-Type': fallbackRes.headers.get('Content-Type') || 'image/jpeg',
                'Cache-Control': 'public, max-age=86400',
            }
        })
    }
}
