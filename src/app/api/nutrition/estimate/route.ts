import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const { text } = await req.json()

        if (!text) {
            return NextResponse.json({ error: 'Text prompt is required' }, { status: 400 })
        }

        const apiKey = process.env.GEMINI_API_KEY

        if (!apiKey) {
            console.error('GEMINI_API_KEY is missing')
            return NextResponse.json({ error: 'AI configuration error' }, { status: 500 })
        }

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

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.1, // Low temp for more factual/consistent estimation
                    responseMimeType: 'application/json'
                }
            })
        })

        if (!response.ok) {
            const errorData = await response.text()
            console.error('Gemini API Error:', errorData)
            throw new Error(`Gemini API returned status: ${response.status}`)
        }

        const data = await response.json()
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text

        if (!content) {
            throw new Error('No content received from Gemini')
        }

        // The responseMimeType ensures it's JSON, but we parse it safely just in case
        let result
        try {
            result = JSON.parse(content)
        } catch (e) {
            console.error('Failed to parse JSON from Gemini:', content)
            // fallback generic parse if it happens to be wrapped in markdown blocks
            const match = content.match(/```json\n([\s\S]*?)\n```/);
            if (match) {
                result = JSON.parse(match[1]);
            } else {
                throw e;
            }
        }

        return NextResponse.json(result)

    } catch (error: any) {
        console.error('Error in estimate nutrition route:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to analyze meal' },
            { status: 500 }
        )
    }
}
