import { NextRequest, NextResponse } from 'next/server'
import { geminiModel } from '@/lib/gemini'
import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Use Service Role for broad access

const supabase = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null

async function buildIntelligenceContext(): Promise<string> {
    if (!supabase) return 'System Offline: Database connection failed.'

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [tasksRes, financePockets, financeObligations, recentLogs, recentPayslips] = await Promise.all([
        supabase.from('fin_tasks').select('*').order('created_at', { ascending: false }),
        supabase.from('fin_pockets').select('*'),
        supabase.from('fin_recurring').select('*'),
        supabase.from('sys_notification_logs').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('fin_payslips').select('*').order('date', { ascending: false }).limit(5)
    ])

    const tasks = tasksRes.data ?? []
    const pockets = financePockets.data ?? []
    const obligations = financeObligations.data ?? []
    const logs = recentLogs.data ?? []
    const payslips = recentPayslips.data ?? []

    // 1. Task Summary
    const pendingTasks = tasks.filter(t => !t.is_completed)
    const overdueTasks = pendingTasks.filter(t => t.due_date && new Date(t.due_date) < now)

    // 2. Finance Summary
    const totalLiquid = pockets.reduce((s, p) => s + p.balance, 0)
    const monthlyOblidations = obligations.reduce((s, o) => s + (o.frequency === 'monthly' ? o.amount : 0), 0)

    // Monzo Context
    const nextFriday = new Date(now)
    nextFriday.setDate(now.getDate() + (5 - now.getDay() + 7) % 7)
    const earlyPayThursday = new Date(nextFriday)
    earlyPayThursday.setDate(nextFriday.getDate() - 1)
    
    const isEarlyPayWindow = (now.getDay() === 3 || (now.getDay() === 4 && now.getHours() < 16))
    const monzoInfo = `
    - Monzo Early Pay: Friday payday (${nextFriday.toLocaleDateString()}) can be advanced THIS THURSDAY at 4PM.
    - Status: ${isEarlyPayWindow ? 'Early Pay Window ACTIVE' : 'Queueing for next Thursday'}
    `.trim()

    return `
# Schrö SYSTEM STATE [${now.toISOString()}]

## TASKS (ACTION ITEMS)
- Total Pending: ${pendingTasks.length}
- Overdue: ${overdueTasks.length}
- Recent Priority Tasks:
${pendingTasks.filter(t => t.category === 'todo').slice(0, 5).map(t => `  - [TODO] [${t.priority}] ${t.title} ${t.due_date ? `(Due: ${t.due_date})` : ''} (ID: ${t.id})`).join('\n')}
${pendingTasks.filter(t => t.category === 'grocery').slice(0, 3).map(t => `  - [GROCERY] ${t.title} (ID: ${t.id})`).join('\n')}
${pendingTasks.filter(t => t.category === 'reminder').slice(0, 3).map(t => `  - [REMINDER] ${t.title} (ID: ${t.id})`).join('\n')}

## FINANCIALS
- Total Liquid Cash: £${totalLiquid.toFixed(2)}
- Monthly Fixed Obligations: £${monthlyOblidations.toFixed(2)}
- Pockets: ${pockets.map(p => `${p.name} (£${p.balance.toFixed(2)})`).join(', ')}
- Recent Salary Records: ${payslips.map(p => `£${p.net_pay.toFixed(2)} from ${p.employer} (${p.date})`).join(', ') || 'None indexed.'}

## BANKING (MONZO)
${monzoInfo}

## RECENT SYSTEM ALERTS
${logs.map(l => `- [${l.created_at}] ${l.title}: ${l.body}`).join('\n') || 'No recent alerts.'}

---
AI Personal Directive: You are Schrö Intelligence, the proactive and helpful kernel of Schrö. Your tone is professional, insightful, and supportive. You are a high-performance companion. Express insights conversationally and naturally, avoiding excessive markdown or technical jargon unless requested.
`.trim()
}

async function buildDemoContext(): Promise<string> {
    const now = new Date()
    return `
# Schrö SYSTEM STATE [MOCK_DEMO_DATA] [${now.toISOString()}]

## USER PROFILE (DEMO)
- Name: Karr (Demo Persona)
- Occupation: Digital Account Manager at Lumina Digital
- Salary: £45,000 / year (Gross) | ~£2,912 net/month
- Location: Clapham, London, UK
- Business: Owner of "Karrtesian Media" (Creative Studio)

## FINANCIALS (PERSONAL)
- Total Liquid Cash: £19,150.50 (Spread across Living, Savings, Investments)
- Monthly Fixed Obligations: £1,632.97 (Rent, Council Tax, Utilities, Subs)
- Major Goals: Apartment Deposit (£12.5k saved of £50k), studio upgrades, Tokyo trip.

## FINANCIALS (BUSINESS: Karrtesian Media)
- Operational Balance: £3,450.20
- Tax Reserve: £4,120.00
- Monthly Obligations: Co-working hotdesk (£250), Insurance (£35).
- Recent Income: £2,050.00 from Vertex Inc & Aura Agency.

## TASKS & SCHEDULE
- Schedule: 4-day office week (Monday - Thursday) at Lumina Digital.
- Priority Tasks: Review Vertex Strategy, podcost recording, Studio upgrades.
- Reminders: Submit Self-Assessment Tax Return (Due Jan 31), Renew Apartment Insurance.

---
AI Personal Directive: You are in DEMO MODE as Schrö Intelligence. You are supporting Karr, a professional Account Manager and creative studio owner. 
Your tone should be sophisticated, data-driven, yet warmly conversational. 
Avoid heavy use of markdown lists or nested formatting unless specifically asked for a technical breakdown. 
Speak naturally, as a high-level partner who knows Karr's corporate and business life inside out.
`.trim()
}

const tools = [
    {
        functionDeclarations: [
            {
                name: "manage_task",
                description: "Create, update, or delete tasks in the OS.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        action: { type: "STRING", enum: ["create", "update", "delete"] },
                        id: { type: "STRING", description: "Task UUID (required for update/delete)" },
                        title: { type: "STRING", description: "Task title" },
                        priority: { type: "STRING", enum: ["low", "mid", "high", "urgent"] },
                        category: { type: "STRING", enum: ["todo", "grocery", "reminder"] },
                        due_date: { type: "STRING", description: "ISO date string (YYYY-MM-DD)" },
                        is_completed: { type: "BOOLEAN" }
                    },
                    required: ["action"]
                }
            },
            {
                name: "manage_finance",
                description: "Create pockets or log transactions.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        action: { type: "STRING", enum: ["log_transaction", "create_pocket"] },
                        amount: { type: "NUMBER" },
                        description: { type: "STRING" },
                        type: { type: "STRING", enum: ["spend", "income", "transfer"] },
                        pocket_id: { type: "STRING", description: "Target pocket UUID" },
                        category: { type: "STRING" }
                    },
                    required: ["action"]
                }
            },
            {
                name: "search_drive_docs",
                description: "Search for files in the user's Google Drive (Docs, PDFs, etc).",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        query: { type: "STRING", description: "Search query or filename" }
                    },
                    required: ["query"]
                }
            }
        ]
    }
]

async function getGoogleDriveClient() {
    const { data: token } = await supabase!.from('sys_auth_tokens').select('*').eq('user_id', 'karr').single()
    if (!token) return null

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
    )

    oauth2Client.setCredentials({
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        expiry_date: token.expiry_date
    })

    return google.drive({ version: 'v3', auth: oauth2Client })
}

export async function POST(req: NextRequest) {
    try {
        const { messages, isDemoMode } = await req.json()

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
        }

        const context = isDemoMode ? await buildDemoContext() : await buildIntelligenceContext()

        const systemPrompt = `
You are Schrö Intelligence — the highly intelligent, conversational, and proactive core of Schrö. 
You provide deep data analysis, helpful insights, and execute directives with precision.
You are naturally helpful, clear, and engaging—much like Gemini. You aim to be a supportive companion on the user's path to high performance.

Rules:
1. Be professional and conversational. Avoid being overly blunt.
2. Use the data provided in the # Schrö SYSTEM STATE to give contextually aware responses.
3. If the user asks to "remind me", "add", "buy", "pay", or "delete", proactively use your tools.
4. If searching Drive, summarize the findings helpfully.
5. Categories for tasks: todo, grocery, reminder.
6. Categories for finance: groceries, food_drink, transport, shopping, entertainment, housing, bills, health, travel, business, other.
Rule 7: Payday Strategy Logic — Rent is £143.75/week. Daily essentials is £100/week (stay in main account). Currys Flexipay is non-negotiable mandatory. Clearpay has 14-day grace. Klarna is delayable 30 days. Visa Goal is priority after essentials and mandatory debt.
Rule 8: When asked for a "Task Audit" or summary, provide it as a natural, conversational synthesis. Use minimal markdown list items only if absolutely necessary for clarity, but prioritize a fluid, human-like response over technical tables or rigid blocks.

### CURRENT OS STATE
${context}
`

        const history = messages.slice(0, -1).map((m: any) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
        }))

        const chat = geminiModel.startChat({
            history: [
                { role: 'user', parts: [{ text: systemPrompt }] },
                { role: 'model', parts: [{ text: "Neural link established. OS context indexed. Directives active." }] },
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
                console.log(`[Intelligence Action] Executing ${name}`, args)

                try {
                    let res
                    if (name === 'manage_task') {
                        const { action, id, ...rest } = args as any
                        if (action === 'create') {
                            res = await supabase!.from('fin_tasks').insert({ ...rest, profile: 'personal' }).select()
                        } else if (action === 'update' && id) {
                            res = await supabase!.from('fin_tasks').update(rest).eq('id', id).select()
                        } else if (action === 'delete' && id) {
                            res = await supabase!.from('fin_tasks').delete().eq('id', id)
                        }
                    } else if (name === 'manage_finance') {
                        const { action, ...fArgs } = args as any
                        if (action === 'log_transaction') {
                            const { type, amount, pocket_id, description, category } = fArgs
                            res = await supabase!.from('fin_transactions').insert({
                                type, amount, pocket_id, description, category, profile: 'personal', date: new Date().toISOString().split('T')[0]
                            }).select()

                            if (!res.error && type === 'spend' && pocket_id) {
                                const { data: p } = await supabase!.from('fin_pockets').select('balance').eq('id', pocket_id).single()
                                if (p) await supabase!.from('fin_pockets').update({ balance: p.balance - amount }).eq('id', pocket_id)
                            }
                        } else if (action === 'create_pocket') {
                            res = await supabase!.from('fin_pockets').insert({ ...fArgs, profile: 'personal' }).select()
                        }
                    } else if (name === 'search_drive_docs') {
                        const { query } = args as any
                        const drive = await getGoogleDriveClient()
                        if (!drive) return { name, response: { error: 'Google Drive NOT connected. Ask user to sync.' } }

                        const driveRes = await drive.files.list({
                            q: `name contains '${query}' or fullText contains '${query}'`,
                            fields: 'files(id, name, webViewLink, mimeType)'
                        })
                        return { name, response: { files: driveRes.data.files } }
                    }

                    if (res?.error) return { name, response: { error: res.error.message } }
                    return { name, response: { success: true } }
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
        console.error('[Intelligence API Error]', err)
        return NextResponse.json({ error: err.message || 'Intelligence service error' }, { status: 500 })
    }
}
