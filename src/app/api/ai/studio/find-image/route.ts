import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(req: NextRequest) {
    try {
        const { text } = await req.json()

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 })
        }

        const prompt = `Given this text snippet: "${text.substring(0, 500)}". Extract exactly 1 or 2 highest-quality generic visual keywords representing it to find a relevant stock photo on a stock photography site. DO NOT include any punctuation, quotes, or conversational text. ONLY output the keywords separated by a comma. Example: 'nature,mountain' or 'urban,night' or 'minimalist,office'. Keep it broad enough to guarantee a search hit.`

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
        const result = await model.generateContent(prompt)
        const keywords = result.response.text().trim().toLowerCase().replace(/[^a-z0-9,]/g, '')

        if (!keywords) throw new Error('No keywords')

        // Using LoremFlickr for a high-quality random stock photo based on AI keywords
        const imageUrl = `https://loremflickr.com/1200/800/${keywords}?lock=${Math.floor(Math.random() * 1000)}`

        return NextResponse.json({ url: imageUrl })
    } catch (err: any) {
        console.error('[Studio Find Image Error]', err)
        return NextResponse.json({ error: err.message || 'AI service error' }, { status: 500 })
    }
}
