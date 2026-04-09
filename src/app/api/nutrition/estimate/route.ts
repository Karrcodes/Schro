export const dynamic = (process.env.TAURI_PLATFORM !== undefined || process.env.IS_TAURI === 'true') ? 'force-static' : 'force-dynamic';
import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(req: Request) {
    try {
        const { text } = await req.json()

        if (!text) {
            return NextResponse.json({ error: 'Text prompt is required' }, { status: 400 })
        }

        if (!process.env.GEMINI_API_KEY) {
            console.error('GEMINI_API_KEY is missing from environment')
            return NextResponse.json({ error: 'AI configuration error (Key Missing)' }, { status: 500 })
        }

        console.log('Analyzing meal:', text)

        const model = genAI.getGenerativeModel({
            model: 'gemini-flash-latest',
        })

        const prompt = `You are an expert nutritionist. Analyze the following meal description and estimate its macros.
Respond strictly in valid JSON format matching this schema:
{
    "name": "A short, descriptive name for the meal",
    "emoji": "A single suitable emoji character representing the meal (e.g. 🍔, 🥗, ☕)",
    "type": "breakfast" | "lunch" | "dinner" | "snack",
    "calories": number (total calories),
    "protein": number (total protein in grams),
    "carbs": number (total carbs in grams),
    "fat": number (total fat in grams),
    "ingredients": [
        {
            "name": "Ingredient name",
            "amount": "Quantity and unit (e.g., 2 slices, 100g)",
            "calories": number,
            "protein": number,
            "carbs": number,
            "fat": number
        }
    ]
}

Meal description: "${text}"`

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.1,
                responseMimeType: 'application/json'
            }
        })

        const content = result.response.text()

        if (!content) {
            throw new Error('No content received from Gemini')
        }

        let nutritionResult
        try {
            nutritionResult = JSON.parse(content)
        } catch (e) {
            console.error('Failed to parse JSON from Gemini:', content)
            // fallback generic parse if it happens to be wrapped in markdown blocks
            const match = content.match(/```json\n([\s\S]*?)\n```/)
            if (match) {
                nutritionResult = JSON.parse(match[1])
            } else {
                throw e
            }
        }

        return NextResponse.json(nutritionResult)

    } catch (error: any) {
        console.error('Error in estimate nutrition route:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to analyze meal' },
            { status: 500 }
        )
    }
}
