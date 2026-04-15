export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { geminiModel } from '@/lib/gemini'

const VALID_CATEGORIES = ['food', 'transport', 'housing', 'shopping', 'entertainment', 'utilities', 'health', 'other']

// Batch-categorise up to 30 transactions at once using Gemini
export async function POST(req: NextRequest) {
    try {
        const { descriptions } = await req.json()

        if (!Array.isArray(descriptions) || descriptions.length === 0) {
            return NextResponse.json({ error: 'No descriptions provided' }, { status: 400 })
        }

        const prompt = `You are a financial transaction categoriser. Categorise each of the following transaction descriptions into exactly one of these categories:
${VALID_CATEGORIES.join(', ')}

Rules:
- food: restaurants, cafes, supermarkets, takeaways, groceries, coffee shops
- transport: Uber, trains, buses, petrol stations, parking, flights, car services
- housing: rent, mortgage, council tax, estate agents
- shopping: clothing, Amazon, eBay, online retail, electronics (not Currys finance)
- entertainment: Netflix, Spotify, cinema, games, streaming, Disney, subscriptions for media
- utilities: energy, gas, water, electric, broadband, phone bills, boiler
- health: pharmacy, gym, dentist, optician, NHS, medical
- other: transfers, bank fees, ATM, unknown, anything that doesn't clearly fit

Return ONLY a JSON array of category strings, one per input, in the same order. No markdown, no explanation.
Example input: ["TESCO METRO", "UBER *TRIP", "NETFLIX.COM"]
Example output: ["food","transport","entertainment"]

Input descriptions:
${JSON.stringify(descriptions)}`

        const result = await geminiModel.generateContent(prompt)
        const text = result.response.text().trim()

        // Strip any markdown code fences
        const cleaned = text.replace(/```json?/g, '').replace(/```/g, '').trim()
        const categories = JSON.parse(cleaned)

        if (!Array.isArray(categories) || categories.length !== descriptions.length) {
            throw new Error('Response length mismatch')
        }

        // Validate each category
        const validated = categories.map((c: string) =>
            VALID_CATEGORIES.includes(c?.toLowerCase()) ? c.toLowerCase() : 'other'
        )

        return NextResponse.json({ categories: validated })

    } catch (err: any) {
        console.error('[AI Categorise Error]', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
