export const dynamic = (process.env.TAURI_PLATFORM !== undefined || process.env.IS_TAURI === 'true') ? 'force-static' : 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'
import { geminiModel } from '@/lib/gemini'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null

async function buildContext(profile: string): Promise<string> {
    if (!supabase) {
        return '## Schrö Financial Snapshot\nNo database connection — Supabase credentials not configured.'
    }

    const [pocketsRes, recurringRes, goalsRes, settingsRes] = await Promise.all([
        supabase.from('fin_pockets').select('*').eq('profile', profile),
        supabase.from('fin_recurring').select('*').eq('profile', profile),
        supabase.from('fin_goals').select('*').eq('profile', profile),
        supabase.from('fin_settings').select('*').eq('profile', profile),
    ])

    const pockets = pocketsRes.data ?? []
    const recurring = recurringRes.data ?? []
    const goals = goalsRes.data ?? []
    const settingsArr = settingsRes.data ?? []
    const settings: Record<string, string> = {}
    settingsArr.forEach((s: { key: string; value: string }) => { settings[s.key] = s.value })

    const totalLiquid = pockets.reduce((s: number, p: { balance: number }) => s + p.balance, 0)
    let totalDebt = 0
    let monthlyObligations = 0

    recurring.forEach((o: any) => {
        if (o.frequency === 'monthly') monthlyObligations += o.amount
        else if (o.frequency === 'weekly') monthlyObligations += (o.amount * 52) / 12
        else if (o.frequency === 'bi-weekly') monthlyObligations += (o.amount * 26) / 12

        if (o.end_date) {
            const end = new Date(o.end_date)
            const now = new Date()
            if (end > now) {
                const monthsLeft = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth())
                if (monthsLeft > 0) totalDebt += (o.amount * (o.frequency === 'monthly' ? monthsLeft : o.frequency === 'weekly' ? monthsLeft * 4 : 1))
            }
        }
    })

    return `
## Schrö Financial Snapshot: ${profile === 'personal' ? 'Personal' : 'Studio Karrtesian'}
(Live Data as of ${new Date().toLocaleDateString()})

### Summary
- Total Liquid Cash: £${totalLiquid.toFixed(2)}
- Projected Outstanding Debt: £${totalDebt.toFixed(2)}
- Monthly Fixed Obligations: £${monthlyObligations.toFixed(2)}
- Weekly Income Baseline: £${settings['weekly_income_baseline'] ?? 'Not set'}

### Pockets (${pockets.length})
${pockets.map((p: any) => `- ${p.name} [${p.type}]: £${p.balance.toFixed(2)} (target: £${(p.target_budget || 0).toFixed(2)})`).join('\n') || '- No pockets created yet'}

### Recurring Obligations (${recurring.length})
${recurring.map((o: any) => `- ${o.name} (${o.frequency}): £${o.amount.toFixed(2)} | Next: ${o.next_due_date}${o.end_date ? ` (Ends: ${o.end_date})` : ''}`).join('\n') || '- No active recurring obligations'}

### Savings Goals (${goals.length})
${goals.map((g: any) => `- ${g.name}: £${g.current_amount.toFixed(2)} / £${g.target_amount.toFixed(2)}${g.deadline ? ` (deadline: ${g.deadline})` : ''}`).join('\n') || '- No savings goals set'}
`.trim()
}

const tools = [
    {
        functionDeclarations: [
            {
                name: "create_recurring_obligation",
                description: "Creates a new recurring debt, subscription, or obligation.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        name: { type: "STRING", description: "Name (e.g. Netflix, Rent, Klarna)" },
                        amount: { type: "NUMBER" },
                        frequency: { type: "STRING", enum: ["weekly", "bi-weekly", "monthly", "yearly"] },
                        category: { type: "STRING", description: "Category ID (groceries, food_drink, transport, shopping, entertainment, housing, bills, health, travel, business, other)" },
                        emoji: { type: "STRING", description: "A single representative emoji" },
                        next_due_date: { type: "STRING", description: "YYYY-MM-DD" },
                        end_date: { type: "STRING", description: "YYYY-MM-DD (optional)" }
                    },
                    required: ["name", "amount", "frequency", "next_due_date"]
                }
            },
            {
                name: "log_transaction",
                description: "Logs a one-off spend, transfer, or allocation.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        type: { type: "STRING", enum: ["spend", "transfer"] },
                        amount: { type: "NUMBER" },
                        description: { type: "STRING" },
                        pocket_id: { type: "STRING", description: "UUID of the pocket to spend from" },
                        category: { type: "STRING", description: "Category ID" },
                        emoji: { type: "STRING", description: "Emoji" }
                    },
                    required: ["type", "amount", "description", "pocket_id"]
                }
            },
            {
                name: "create_pocket",
                description: "Creates a new financial bucket or pocket for saving or spending.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        name: { type: "STRING", description: "Name of the pocket" },
                        type: { type: "STRING", enum: ["main", "flexible", "debt"], description: "The type of pocket" },
                        target_budget: { type: "NUMBER", description: "The monthly target budget for this pocket" },
                        balance: { type: "NUMBER", description: "Initial balance (default 0)" }
                    },
                    required: ["name", "type"]
                }
            },
            {
                name: "create_goal",
                description: "Creates a new long-term savings goal.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        name: { type: "STRING", description: "Name of the target (e.g. New Macbook)" },
                        target_amount: { type: "NUMBER", description: "The total amount needed" },
                        current_amount: { type: "NUMBER", description: "Amount already saved" },
                        deadline: { type: "STRING", description: "Optional deadline (YYYY-MM-DD)" }
                    },
                    required: ["name", "target_amount"]
                }
            }
        ]
    }
]

export async function POST(req: NextRequest) {
    try {
        const { messages, clientContext, activeProfile = 'personal' } = await req.json()

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
        }

        const context = await buildContext(activeProfile)

        const systemPrompt = `You are KarrAI — a direct, highly analytical financial advisor built into Schrö. You have real-time access to his financial data.
Current Profile: ${activeProfile === 'personal' ? 'Personal' : 'Studio Karrtesian (Business)'}

Key rules:
- When asked "Can I buy X for £Y?", check the Main Buffer pocket balance.
- Use tools to create obligations, pockets, goals, or log one-off transactions.
- Categories: groceries, food_drink, transport, shopping, entertainment, housing, bills, health, travel, business, other.
- When logging a spend, ALWAYS provide a category and a fun, relevant emoji.
- If a user says "I just spent £10 on a burger", use log_transaction with category 'food_drink' and emoji '🍔'.
- Always cite actual numbers from his data when giving advice.
- Keep responses concise — 2-4 sentences max.
- Use GBP (£) for all amounts.

${clientContext ? `\n### LIVE UI STATE\n${clientContext}\n` : ''}

${context}`

        const history = messages.slice(0, -1).map((m: { role: string; content: string }) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
        }))

        const chat = geminiModel.startChat({
            history: [
                { role: 'user', parts: [{ text: systemPrompt }] },
                { role: 'model', parts: [{ text: "Understood. I have your financial data loaded and I'm ready to advise or take actions." }] },
                ...history,
            ],
            tools: tools as any
        })

        const lastMessage = messages[messages.length - 1]
        let result = await chat.sendMessage(lastMessage.content)
        let response = result.response

        // Handle tool calls loop
        let callCount = 0
        while (response.functionCalls()?.length && callCount < 5) {
            callCount++
            const toolResults = await Promise.all(response.functionCalls()!.map(async (call) => {
                const { name, args } = call
                console.log(`[AI Action] Calling ${name}`, args)

                try {
                    let data, error
                    if (name === 'create_recurring_obligation') {
                        ({ data, error } = await supabase!.from('fin_recurring').insert({ ...args as any, profile: activeProfile }).select())
                    } else if (name === 'create_pocket') {
                        ({ data, error } = await supabase!.from('fin_pockets').insert({ ...args as any, profile: activeProfile }).select())
                    } else if (name === 'create_goal') {
                        ({ data, error } = await supabase!.from('fin_goals').insert({ ...args as any, profile: activeProfile }).select())
                    } else if (name === 'log_transaction') {
                        const { type, amount, pocket_id, description, category, emoji } = args as any
                        // 1. Log transaction
                        ({ data, error } = await supabase!.from('fin_transactions').insert({
                            type, amount, pocket_id, description, category, emoji, profile: activeProfile, date: new Date().toISOString().split('T')[0]
                        }).select())

                        // 2. Decrement pocket balance if it's a spend
                        if (!error && type === 'spend' && pocket_id) {
                            const { data: pocket } = await supabase!.from('fin_pockets').select('balance').eq('id', pocket_id).single()
                            if (pocket) {
                                await supabase!.from('fin_pockets').update({ balance: pocket.balance - amount }).eq('id', pocket_id)
                            }
                        }
                    }

                    if (error) return { name, response: { error: error.message } }
                    return { name, response: { success: true, data } }
                } catch (e: any) {
                    return { name, response: { error: e.message } }
                }
            }))

            result = await chat.sendMessage(toolResults as any)
            response = result.response
        }

        const reply = response.text()
        return NextResponse.json({ reply })
    } catch (err: any) {
        console.error('[Aikin API Error]', err)
        return NextResponse.json({ error: err.message || 'AI service error' }, { status: 500 })
    }
}
