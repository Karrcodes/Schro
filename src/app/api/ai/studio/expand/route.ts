export const dynamic = 'force-static'
import { NextRequest, NextResponse } from 'next/server'
import { geminiModel } from '@/lib/gemini'

export async function POST(req: NextRequest) {
    try {
        const { text } = await req.json()

        if (!text) {
            return NextResponse.json({ error: 'Text to expand is required' }, { status: 400 })
        }

        const systemPrompt = `You are a professional writing assistant built into Studio Karrtesian. 
The user has selected a short piece of text from their draft and wants you to expand it into a full, detailed, and well-written paragraph.

RULES:
- Maintain a natural, articulate tone.
- Do NOT output extra conversational text, just the expanded paragraph itself so it can be inserted directly.
- Add detail, nuance, and explanation to the selection.

TEXT TO EXPAND:
"${text}"`

        const result = await geminiModel.generateContent(systemPrompt)
        const response = result.response
        const expandedText = response.text().trim()

        return NextResponse.json({ text: expandedText })
    } catch (err: any) {
        console.error('[Studio Expand Error]', err)
        return NextResponse.json({ error: err.message || 'AI service error' }, { status: 500 })
    }
}
