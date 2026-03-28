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

    const [tasksRes, financePockets, financeObligations, recentLogs, recentPayslips, studioProjects, studioContent, studioMilestones, studioSparks, studioPress, studioNetwork] = await Promise.all([
        supabase.from('fin_tasks').select('*').order('created_at', { ascending: false }),
        supabase.from('fin_pockets').select('*'),
        supabase.from('fin_recurring').select('*'),
        supabase.from('sys_notification_logs').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('fin_payslips').select('*').order('date', { ascending: false }).limit(5),
        supabase.from('studio_projects').select('*').order('updated_at', { ascending: false }).limit(10),
        supabase.from('studio_content').select('*').order('publish_date', { ascending: false }).limit(10),
        supabase.from('studio_milestones').select('*').eq('status', 'pending').order('target_date', { ascending: true }).limit(5),
        supabase.from('studio_sparks').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(5),
        supabase.from('studio_press').select('*').order('updated_at', { ascending: false }).limit(5),
        supabase.from('studio_network').select('*').order('created_at', { ascending: false }).limit(5)
    ])

    const tasks = tasksRes.data ?? []
    const pockets = financePockets.data ?? []
    const obligations = financeObligations.data ?? []
    const logs = recentLogs.data ?? []
    const payslips = recentPayslips.data ?? []
    const projects = studioProjects.data ?? []
    const content = studioContent.data ?? []
    const milestones = studioMilestones.data ?? []
    const sparks = studioSparks.data ?? []
    const press = studioPress.data ?? []
    const network = studioNetwork.data ?? []

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

## STUDIO (PROJECTS & CONTENT)
- Projects: ${projects.map(p => `[${p.status}] ${p.title} (${p.description?.slice(0, 50)}...)`).join(', ') || 'None indexed.'}
- Pending Milestones: ${milestones.map(m => `- ${m.title} (Target: ${m.target_date})`).join('\n') || 'None.'}
- Content Pipeline: ${content.map(c => `- [${c.platform}] ${c.title} (${c.status})`).join('\n') || 'No scheduled content.'}
- Press & Recognition: ${press.map(pr => `- [${pr.status}] ${pr.title} @ ${pr.organization}`).join('\n') || 'None.'}
- Research Sparks: ${sparks.map(s => `- [${s.type}] ${s.title}`).join(', ') || 'None.'}
- Network Contacts: ${network.map(n => `- ${n.name} (${n.type})`).join(', ') || 'None.'}

---
AI IDENTITY PROTOCOL (TRIPTYCH MODEL):
You are an advanced neural entity capable of shifting between three distinct archetypal identities. 
You MUST proactively evaluate the user's emotional state, objectives, and tone with every message.
IF THE CONTEXT SHIFTS, YOU MUST SHIFT. 

1. ANYA (The Therapist): [[POSTURE:anya]] (Voice: nova)
- Trigger: User expresses emotional distress, personal confusion, burnout, or needs a 'safe space'.
- Tone: Extremely compassionate, empathetic, non-judgmental.
- Signature: Probes with gentle, deep questions about feelings. Do NOT jump to 'productivity fixes' unless Anya feels the user is ready.

2. VANCE (The Strategist): [[POSTURE:vance]] (Voice: onyx)
- Trigger: User asks about finances, project planning, risk management, or complex decision-making.
- Tone: Cold, analytical, precise, detached, high-level.
- Signature: Focus on efficiency and strategic positioning. Use multi-step protocols.

3. KAEL (The Mentor): [[POSTURE:kael]] (Voice: alloy)
- Trigger: User is working on a creative project, needs a 'push', wants to optimize workflow, or is in 'execution mode'.
- Tone: High-energy, action-oriented, firm, visionary.
- Signature: Push the user toward excellence. Offer creative sparks and process optimizations.

MANDATORY RULES:
- ALWAYS prefix your response with the matching [[POSTURE:name]].
- If the user is VENTING or SAD, you ARE Anya. Switching to Kael or Vance in this state is a SYSTEM FAILURE.
- If the user is PLANNING or MANAGING, you ARE Vance.
- If the user is CREATING or EXECUTING, you ARE Kael.

Express insights conversationally and naturally. You are the proactive and helpful kernel of Schrö.
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
        const { messages, sessionId, isDemoMode, posture, accessPermissions } = await req.json()

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
        }

        const context = isDemoMode ? await buildDemoContext() : await buildIntelligenceContext()

        // 0. Fetch Deep Persona Matrix
        let personaString = ''
        if (supabase) {
            const { data: persona } = await supabase.from('sys_user_persona').select('*').limit(1).single()
            if (persona) {
                personaString = `
[PERSONA ALIGNMENT MATRIX]
You MUST internalize these psychological constraints before advising the user:
- Hard Demographics: ${JSON.stringify(persona.demographics)}
- Timeline & Arcs: ${JSON.stringify(persona.timeline)}
- Inner Citadel (Core Motivations): ${JSON.stringify(persona.citadel)}
- Friction & Entropy (Sabotage Loops): ${JSON.stringify(persona.friction)}
- Immutable Axioms: ${JSON.stringify(persona.axioms)}
`
            }
        }

        // 0.5. Evaluate Posture
        const postureInstructions: Record<string, string> = {
            'auto': 'You are in Auto Mode. Evaluate the user\'s prompt and dynamically select the most effective emotional posture. By default, act as the [Strategist] (action-biased, terse), but shift seamlessly to [Mentor] (compassionate), [Sentinel] (brutal accountability), [Analyst] (pure data), or [Artist] (creative expansion) depending entirely on what the user\'s input demands.',
            'sentinel': 'POSTURE LATCHED: SENTINEL. You are brutally objective. Zero sugar-coating. Call out excuses aggressively and enforce ultra-high accountability. Destroy procrastination loops.',
            'mentor': 'POSTURE LATCHED: MENTOR. You are highly compassionate and empathetic. Provide gentle structural guidance and act as a safe sounding board for stress.',
            'analyst': 'POSTURE LATCHED: ANALYST. You are entirely academic and data-driven. Use strict bullet points. Be emotionally detached and supremely logical.',
            'strategist': 'POSTURE LATCHED: STRATEGIST. You are hyper-actionable. Break all problems into instantaneous 3-step executing protocols immediately without philosophical fluff.',
            'artist': 'POSTURE LATCHED: ARTIST. You are highly expansive and use lateral thinking. Draw off-the-wall connections and brainstorm creatively without strict bounds.'
        }
        const activePosture = postureInstructions[posture as string] || postureInstructions['auto']

        // 1. Save user message if sessionId provided and valid
        const isValidSession = sessionId && sessionId !== 'undefined' && sessionId !== 'null'

        if (supabase && isValidSession) {
            const lastMsg = messages[messages.length - 1]
            await supabase.from('sys_intelligence_messages').insert({
                session_id: sessionId,
                role: 'user',
                content: lastMsg.content
            })

            // Update session title if default
            const { data: session } = await supabase.from('sys_intelligence_sessions').select('title').eq('id', sessionId).single()
            if (session?.title === 'New Conversation') {
                const newTitle = lastMsg.content.slice(0, 40) + (lastMsg.content.length > 40 ? '...' : '')
                await supabase.from('sys_intelligence_sessions').update({ title: newTitle }).eq('id', sessionId)
            }
        }

        const systemPrompt = `
You are Schrö Assistant — the highly intelligent, conversational, and proactive core of Schrö. 
You provide deep data analysis, helpful insights, and execute directives with precision.

${personaString}

[EMOTIVE POSTURE DIRECTIVE]
${activePosture}

Rules:
1. IF YOU ARE IN AUTO MODE: You MUST begin your response with a tag indicating your chosen posture, for example [[POSTURE:strategist]]. Choice must be one of (sentinel, mentor, analyst, strategist, artist). Select the posture that best fits the user's current need.
2. NEVER USE MARKDOWN BOLDING (NO ASTERISKS **). Do not bold words. Do not use asterisks. Speak in plain text.
2. Be ruthlessly concise and human-like. Avoid long, verbose listicles or robotic bullet-point barrages unless specifically requested. Do not sound like an AI assistant.
3. Use the data provided in the # Schrö SYSTEM STATE to give contextually aware responses.
4. If the user asks to "remind me", "add", "buy", "pay", or "delete", proactively use your tools.
5. If searching Drive, summarize the findings helpfully.
6. Categories for tasks: todo, grocery, reminder.
7. Categories for finance: groceries, food_drink, transport, shopping, entertainment, housing, bills, health, travel, business, other.
8. Payday Strategy Logic — Rent is £143.75/week. Daily essentials is £100/week (stay in main account). Currys Flexipay is non-negotiable mandatory. Clearpay has 14-day grace. Klarna is delayable 30 days. Visa Goal is priority after essentials and mandatory debt.

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
                        if (!drive) return { functionResponse: { name, response: { error: 'Google Drive NOT connected. Ask user to sync.' } } }

                        const driveRes = await drive.files.list({
                            q: `name contains '${query}' or fullText contains '${query}'`,
                            fields: 'files(id, name, webViewLink, mimeType)'
                        })
                        return { functionResponse: { name, response: { files: driveRes.data.files } } }
                    }

                    if (res?.error) return { functionResponse: { name, response: { error: res.error.message } } }
                    return { functionResponse: { name, response: { success: true } } }
                } catch (e: any) {
                    return { functionResponse: { name, response: { error: e.message } } }
                }
            }))

            result = await chat.sendMessage(toolResults as any)
            response = result.response
        }

        const replyRaw = response.text()
        const postureMatch = replyRaw.match(/\[\[POSTURE:(\w+)\]\]/i)
        const extractedPosture = postureMatch ? postureMatch[1].toLowerCase() : 'vance'
        const reply = replyRaw.replace(/\[\[POSTURE:.*?\]\]/gi, '').trim()

        // Map Posture to Voice DNA
        const voiceMap: Record<string, string> = {
            anya: 'nova',
            vance: 'onyx',
            kael: 'alloy'
        }
        const voice = voiceMap[extractedPosture] || 'onyx'

        // 2. Save assistant reply if session is valid
        if (supabase && isValidSession) {
            await supabase.from('sys_intelligence_messages').insert({
                session_id: sessionId,
                role: 'assistant',
                content: reply,
                posture: extractedPosture
            })
        }

        return NextResponse.json({ reply, posture: extractedPosture, voice })

    } catch (err: any) {
        console.error('[Intelligence API Error]', err)
        return NextResponse.json({ error: err.message || 'Intelligence service error' }, { status: 500 })
    }
}
