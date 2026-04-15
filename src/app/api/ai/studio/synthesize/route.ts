export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { geminiModel } from '@/lib/gemini'

export async function POST(req: NextRequest) {
    try {
        const { node, currentBody, draftTitle, action = 'synthesize' } = await req.json()

        if (!node) {
            return NextResponse.json({ error: 'Node data is required' }, { status: 400 })
        }

        const typeLabel = node.node_type === 'entry' ? 'Note' : node.node_type === 'project' ? 'Project' : 'Content'
        const bodyContent = node.node_type === 'entry' ? (node.body || '') : (node.tagline || node.description || '')

        const systemPrompt = `You are a professional writing assistant built into Studio Karrtesian. 
Your goal is to help the user integrate research nodes into their long-form draft intelligently.

RULES:
- Do NOT just quote the research. Synthesize it.
- Maintain the user's tone (if detectable from the current body).
- If currentBody is short/empty, write a solid introductory paragraph.
- If currentBody has content, write a paragraph that naturally flows from the last section.
- Use Markdown for formatting if helpful.
- Keep output concise but high-quality (2-4 sentences).
- Context: Researching for a draft titled "${draftTitle || 'Untitled'}".

RESEARCH NODE TO INTEGRATE:
Type: ${typeLabel}
Title: ${node.title}
Content: ${bodyContent}

${currentBody ? `CURRENT DRAFT CONTENT:\n${currentBody.slice(-1000)}` : 'DRAFT IS JUST STARTING.'}`

        const result = await geminiModel.generateContent(systemPrompt)
        const response = result.response
        const text = response.text()

        return NextResponse.json({ text })
    } catch (err: any) {
        console.error('[Studio Synthesize Error]', err)
        return NextResponse.json({ error: err.message || 'AI service error' }, { status: 500 })
    }
}
