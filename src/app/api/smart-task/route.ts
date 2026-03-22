import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(req: Request) {
    try {
        const { title, openTasksCount, priorityDistribution } = await req.json()

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 })
        }

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: 'Gemini API Key missing' }, { status: 500 })
        }

        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            systemInstruction: `You are an AI assistant in Schrö, a powerful life management system.
Your job is to classify the priority of a new task the user is creating.
The priority levels are:
- 'super': Critical, urgent, blocker. Must be done immediately.
- 'high': Important, should be done soon.
- 'mid': Standard task, neither urgent nor trivial.
- 'low': Backlog, trivial, "nice to have" when time permits.

Respond ONLY with a JSON object in this exact format:
{
  "priority": "urgent" | "high" | "mid" | "low",
  "reason": "A very short, 3-6 word reason why"
}`
        })

        const prompt = `Task title: "${title}"
Context: The user currently has ${openTasksCount} open tasks.
Priority distribution: ${JSON.stringify(priorityDistribution || {})}

Determine the best priority for this new task.`

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.1,
                responseMimeType: 'application/json'
            }
        })

        let priorityResponse
        try {
            priorityResponse = JSON.parse(result.response.text())
        } catch {
            priorityResponse = { priority: 'mid', reason: 'Fallback standard priority' }
        }

        return NextResponse.json({
            priority: priorityResponse.priority || 'mid',
            reason: priorityResponse.reason || 'Calculated based on context'
        })
    } catch (error: any) {
        console.error('Smart task generation failed:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
