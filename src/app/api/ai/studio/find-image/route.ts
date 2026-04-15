export const dynamic = 'force-dynamic'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(req: NextRequest) {
    try {
        const { text } = await req.json()

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 })
        }

        const prompt = `Text: "${text.substring(0, 800)}".
        Task: Extract exactly 2 visual and conceptual keywords that best represent the overall mood or subject of this text for a high-quality stock photo search.
        Instructions:
        - Output ONLY the keywords separated by a comma (e.g. "minimalist,office" or "nature,tranquil").
        - NO explanation, NO quotes, NO extra text.
        - Prioritize broad, searchable terms like "technology", "nature", "success", "creativity".`

        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" })
        const result = await model.generateContent(prompt)
        const rawResponse = result.response.text().trim().toLowerCase()

        // Extract keywords more robustly
        let keywords = (rawResponse || "")
            .split(',')
            .map(k => k.replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, '-'))
            .filter(k => k.length > 0)
            .slice(0, 2)
            .join(',')

        if (!keywords) keywords = 'nature,minimalist'

        // Fetch the initial redirect from loremflickr to get a permanent URL
        const imageRes = await fetch(`https://loremflickr.com/1200/800/${keywords}?lock=${Math.floor(Math.random() * 1000)}`, {
            redirect: 'manual'
        })

        let finalUrl = `https://loremflickr.com/1200/800/${keywords}` // Fallback

        // Manual redirect handling to get the STABLE static image URL
        if (imageRes.status >= 300 && imageRes.status < 400) {
            const location = imageRes.headers.get('location')
            if (location) {
                finalUrl = location.startsWith('http') ? location : `https://loremflickr.com${location}`
            }
        } else {
            // If it didn't redirect, use the final response URL if available
            finalUrl = imageRes.url || finalUrl
        }

        return NextResponse.json({ url: finalUrl })
    } catch (err: any) {
        console.error('[Studio Find Image Error]', err)
        return NextResponse.json({ error: err.message || 'AI service error' }, { status: 500 })
    }
}
