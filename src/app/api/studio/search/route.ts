export const dynamic = 'force-static'
import { NextRequest, NextResponse } from 'next/server'
import { geminiModel } from '@/lib/gemini'

export async function POST(req: NextRequest) {
    try {
        const { query, type } = await req.json()

        if (!query) {
            return NextResponse.json({ results: [] })
        }

        const prompt = `
            You are a high-performance research assistant for Schrö Studio.
            The user is typing the name of a "${type || 'tool'}" and needs to find the official website and a high-quality logo/icon URL.
            
            Query: "${query}"
            
            Return exactly 3 suggested matches in a JSON array. 
            Each object must have:
            - name: The clean name of the tool/resource.
            - url: The official website URL (absolute).
            - icon_url: A direct link to the official logo or a high-quality favicon. (Try to use Clearbit logos if possible: https://logo.clearbit.com/[domain])
            - description: A very short tagline (max 60 chars).

            Do not include any markdown formatting or extra text. Only the JSON array.
        `

        const result = await geminiModel.generateContent(prompt)
        const response = result.response
        const text = response.text()

        // Clean the response if Gemini wraps it in markdown
        const cleanedJson = text.replace(/```json/g, '').replace(/```/g, '').trim()
        const results = JSON.parse(cleanedJson)

        return NextResponse.json({ results })
    } catch (err: any) {
        console.error('[Studio Search API Error]', err)
        return NextResponse.json({ error: 'Failed to fetch suggestions', results: [] }, { status: 500 })
    }
}
