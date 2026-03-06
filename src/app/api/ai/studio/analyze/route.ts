import { NextRequest, NextResponse } from 'next/server'
import { geminiModel } from '@/lib/gemini'

export async function POST(req: NextRequest) {
    try {
        const { body, title } = await req.json()

        if (!body) {
            return NextResponse.json({ error: 'Draft body is empty' }, { status: 400 })
        }

        const systemPrompt = `You are a professional writing assistant built into Studio Karrtesian.
The user wants you to analyze their current draft and provide ONE highly actionable suggestion to improve or expand it, along with a concrete blurb of text they could insert.

DRAFT TITLE: ${title || 'Untitled'}
DRAFT CONTENT:
${body}

OUTPUT FORMAT:
Return a JSON object with exactly two keys:
{
  "suggestion": "A 1-2 sentence suggestion, e.g. 'You should expand on the concept of X.'",
  "insertable_text": "A full paragraph that actually writes the suggested expansion."
}`

        const result = await geminiModel.generateContent(systemPrompt)
        let text = result.response.text()

        // clean up markdown json formatting if needed
        text = text.replace(/```json/g, '').replace(/```/g, '').trim()

        const data = JSON.parse(text)

        return NextResponse.json(data)
    } catch (err: any) {
        console.error('[Studio Analyze Error]', err)
        return NextResponse.json({ error: err.message || 'AI service error' }, { status: 500 })
    }
}
