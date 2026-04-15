export const dynamic = 'force-dynamic'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function GET(req: NextRequest) {
    const url = new URL(req.url)
    const title = url.searchParams.get('title') || ''

    if (!title) {
        return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" })
        const prompt = `You are a shopping assistant for Schrö.
Item Concept: "${title}".
Suggest 3 to 5 realistic specific products that match this concept.

For each product, provide:
- title: Exact Product Title
- price: Realistic Price (GBP)
- description: Compelling 1-sentence description
- url: A REAL working URL. If you don't have a direct product link, ALWAYS use an Amazon search link: https://www.amazon.co.uk/s?k=[encoded-product-name]
- category: (personal, tech, home, wellness, wealth, work)
- priority: (low, mid, high, super)
- image_search_term: 1 or 2 keywords for a clean product photo (e.g. "iphone", "chair")

Return ONLY a JSON array of objects:
[
  {
    "title": string,
    "price": number,
    "description": string,
    "url": string,
    "category": string,
    "priority": string,
    "image_search_term": string
  },
  ...
]
`

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.1,
                responseMimeType: 'application/json'
            }
        })
        const text = result.response.text().trim()
        
        // Strategy 1: Direct parse (most likely with responseMimeType: 'application/json')
        try {
            const suggestion = JSON.parse(text)
            return NextResponse.json(suggestion)
        } catch (e) {
            // Strategy 2: Resilient extractor (search for first [ and last ] or first { and last })
            const startChar = text.includes('[') ? '[' : '{'
            const endChar = startChar === '[' ? ']' : '}'
            
            const firstIndex = text.indexOf(startChar)
            const lastIndex = text.lastIndexOf(endChar)
            
            if (firstIndex === -1 || lastIndex === -1) {
                return NextResponse.json({ error: 'AI failed to produce valid JSON', raw: text }, { status: 500 })
            }

            try {
                const jsonText = text.substring(firstIndex, lastIndex + 1)
                const suggestion = JSON.parse(jsonText)
                return NextResponse.json(suggestion)
            } catch (innerError: any) {
                return NextResponse.json({ error: 'Failed to parse extracted JSON', raw: text, msg: innerError.message }, { status: 500 })
            }
        }
    } catch (error: any) {
        console.error('Wishlist suggest error:', error)
        return NextResponse.json({ error: error.message || 'Failed to generate suggestion' }, { status: 500 })
    }
}
