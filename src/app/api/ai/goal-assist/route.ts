export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { geminiModel } from '@/lib/gemini'

export async function POST(req: NextRequest) {
    try {
        const { title } = await req.json()

        if (!title?.trim()) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 })
        }

        const prompt = `You are KarrAI, a strategic life-OS assistant. A user wants to create a goal with the title: "${title}".

If the title starts with "I want...", treat this as a "Manifestation" goal—focus on the emotional and identity-based transformation. Otherwise, treat it as a standard strategic goal.

Generate intelligent suggestions for this goal in exactly this JSON format (no markdown, no code blocks, just raw JSON):
{
  "description": "A clear, motivating 1-2 sentence description of what achieving this goal would look like in practice, written in a visionary and inspiring tone",
  "category": "one of: finance, health, career, personal",
  "priority": "one of: low, mid, high, urgent",
  "timeframe": "one of: short, medium, long (short=3-6 months, medium=1-2 years, long=strategic/legacy)",
  "target_date": "a realistic YYYY-MM-DD date string based on the timeframe",
  "milestones": ["3-5 concise, actionable milestone titles that break this goal down", "each one should be a specific, measurable step"],
  "vision_search_query": "a short image search query (2-4 words) for an inspirational image for this goal e.g. 'apartment interior design'"
}`

        const result = await geminiModel.generateContent(prompt)
        const text = result.response.text().trim()

        // Strip any markdown code fences if present
        const clean = text.replace(/^```json\s*|^```\s*|\s*```$/g, '').trim()
        const data = JSON.parse(clean)

        return NextResponse.json(data)
    } catch (err: any) {
        console.error('[Goal Assist API Error]', err)
        return NextResponse.json({ error: err.message || 'AI service error' }, { status: 500 })
    }
}
