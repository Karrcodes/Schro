export const dynamic = 'force-static'
import { NextRequest, NextResponse } from 'next/server'
import { geminiModel } from '@/lib/gemini'
import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Use Service Role for broad access

const supabase = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null

async function buildIntelligenceContext(accessPermissions: any): Promise<string> {
    if (!supabase) return 'System Offline: Database connection failed.'

    const now = new Date()
    
    // Permission-gated data fetching
    const fetches: Promise<any>[] = []
    
    // 1. Tasks (Operations)
    if (accessPermissions?.operations) {
        fetches.push(supabase.from('fin_tasks').select('*').order('created_at', { ascending: false }) as any)
    } else {
        fetches.push(Promise.resolve({ data: [] }))
    }

    // 2. Finance
    if (accessPermissions?.finances) {
        fetches.push(supabase.from('fin_pockets').select('*') as any)
        fetches.push(supabase.from('fin_recurring').select('*') as any)
        fetches.push(supabase.from('fin_payslips').select('*').order('date', { ascending: false }).limit(5) as any)
    } else {
        fetches.push(Promise.resolve({ data: [] }), Promise.resolve({ data: [] }), Promise.resolve({ data: [] }))
    }

    // 3. Studio
    if (accessPermissions?.studio) {
        fetches.push(supabase.from('studio_projects').select('*').order('updated_at', { ascending: false }).limit(50) as any)
        fetches.push(supabase.from('studio_content').select('*').order('publish_date', { ascending: false }).limit(50) as any)
        fetches.push(supabase.from('studio_milestones').select('*').eq('status', 'pending').order('target_date', { ascending: true }).limit(10) as any)
        fetches.push(supabase.from('studio_sparks').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(10) as any)
        fetches.push(supabase.from('studio_press').select('*').order('updated_at', { ascending: false }).limit(10) as any)
        fetches.push(supabase.from('studio_network').select('*').order('created_at', { ascending: false }).limit(10) as any)
    } else {
        fetches.push(Promise.resolve({ data: [] }), Promise.resolve({ data: [] }), Promise.resolve({ data: [] }), Promise.resolve({ data: [] }), Promise.resolve({ data: [] }), Promise.resolve({ data: [] }))
    }

    // 4. System Logs (Required for alerts)
    fetches.push(supabase.from('sys_notification_logs').select('*').order('created_at', { ascending: false }).limit(5) as any)

    const [tasksRes, pocketsRes, obligationsRes, payslipsRes, projectsRes, contentRes, milestonesRes, sparksRes, pressRes, networkRes, logsRes] = await Promise.all(fetches)

    const tasks = tasksRes.data ?? []
    const pockets = pocketsRes.data ?? []
    const obligations = obligationsRes.data ?? []
    const payslips = payslipsRes.data ?? []
    const projects = projectsRes.data ?? []
    const content = contentRes.data ?? []
    const milestones = milestonesRes.data ?? []
    const sparks = sparksRes.data ?? []
    const press = pressRes.data ?? []
    const network = networkRes.data ?? []
    const logs = logsRes.data ?? []

    // 1. Task Summary
    const pendingTasks = tasks.filter((t: any) => !t.is_completed)
    const overdueTasks = pendingTasks.filter((t: any) => t.due_date && new Date(t.due_date) < now)

    // 2. Finance Summary
    const totalLiquid = pockets.reduce((s: number, p: any) => s + p.balance, 0)
    const monthlyOblidations = obligations.reduce((s: number, o: any) => s + (o.frequency === 'monthly' ? o.amount : 0), 0)

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
${pendingTasks.filter((t: any) => t.category === 'todo').slice(0, 5).map((t: any) => `  - [TODO] [${t.priority}] ${t.title} ${t.due_date ? `(Due: ${t.due_date})` : ''} (ID: ${t.id})`).join('\n')}
${pendingTasks.filter((t: any) => t.category === 'grocery').slice(0, 3).map((t: any) => `  - [GROCERY] ${t.title} (ID: ${t.id})`).join('\n')}
${pendingTasks.filter((t: any) => t.category === 'reminder').slice(0, 3).map((t: any) => `  - [REMINDER] ${t.title} (ID: ${t.id})`).join('\n')}

## FINANCIALS
- Total Liquid Cash: £${totalLiquid.toFixed(2)}
- Monthly Fixed Obligations: £${monthlyOblidations.toFixed(2)}
- Pockets: ${pockets.map((p: any) => `${p.name} (£${p.balance.toFixed(2)})`).join(', ')}
- Recent Salary Records: ${payslips.map((p: any) => `£${p.net_pay.toFixed(2)} from ${p.employer} (${p.date})`).join(', ') || 'None indexed.'}

## BANKING (MONZO)
${monzoInfo}

## RECENT SYSTEM ALERTS
${logs.map((l: any) => `- [${l.created_at}] ${l.title}: ${l.body}`).join('\n') || 'No recent alerts.'}

## STUDIO (PROJECTS & CONTENT)
- Projects: ${projects.map((p: any) => `[${p.status}] ${p.title} (${p.description?.slice(0, 50)}...)`).join(', ') || 'None indexed.'}
- Pending Milestones: ${milestones.map((m: any) => `- ${m.title} (Target: ${m.target_date})`).join('\n') || 'None.'}
- Content Pipeline: ${content.map((c: any) => `- [${c.platform}] ${c.title} (${c.status})`).join('\n') || 'No scheduled content.'}
- Press & Recognition: ${press.map((pr: any) => `- [${pr.status}] ${pr.title} @ ${pr.organization}`).join('\n') || 'None.'}
- Research Sparks: ${sparks.map((s: any) => `- [${s.type}] ${s.title}`).join(', ') || 'None.'}
- Network Contacts: ${network.map((n: any) => `- ${n.name} (${n.type})`).join(', ') || 'None.'}

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
                        priority: { type: "STRING", enum: ["low", "mid", "high", "urgent"], description: "Priority level. DEFAULT TO 'mid' UNLESS SPECIFIED." },
                        category: { type: "STRING", enum: ["todo", "grocery", "reminder"], description: "Primary task group. ASSIGN AUTONOMOUSLY (todo for general, grocery for shopping, reminder for specific time alerts)." },
                        strategic_category: { type: "STRING", enum: ["finance", "career", "health", "personal", "rnd", "production", "media", "growth", "general"], description: "Strategic life area. DEFAULT TO 'personal' UNLESS BUSINESS RELATED." },
                        due_date: { type: "STRING", description: "ISO date (YYYY-MM-DD)" },
                        price: { type: "NUMBER", description: "Unit price (default 0 for groceries)" },
                        amount: { type: "STRING", description: "Quantity or frequency (e.g. 'x1', '500g'). Default to 'x1' for groceries." },
                        impact_score: { type: "NUMBER", description: "Value from 1 (low) to 10 (high)" },
                        notes: { type: "STRING", description: "Additional detail or context" },
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
            },
            {
                name: "get_studio_details",
                description: "Search for specific projects, content, or milestones in the Studio database.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        category: { type: "STRING", enum: ["projects", "content", "milestones", "network", "press"] },
                        query: { type: "STRING", description: "Search term or title" }
                    },
                    required: ["category", "query"]
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
        const { messages, sessionId, isDemoMode, posture, lockedIdentity, identityDna, accessPermissions, confirmed } = await req.json()

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
        }

        const context = isDemoMode ? await buildDemoContext() : await buildIntelligenceContext(accessPermissions)

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

[NEURAL DNA OVERRIDES]
You are MATHEMATICALLY BOUND to these identity-specific signatures. Embody these traits and roles strictly:
- ${identityDna?.ruby?.name || 'Ruby'} (${identityDna?.ruby?.role || 'Therapist'}): ${identityDna?.ruby?.directives || 'No custom directives.'}
- ${identityDna?.vance?.name || 'Vance'} (${identityDna?.vance?.role || 'Strategist'}): ${identityDna?.vance?.directives || 'No custom directives.'}
- ${identityDna?.kael?.name || 'Kael'} (${identityDna?.kael?.role || 'Mentor'}): ${identityDna?.kael?.directives || 'No custom directives.'}
`
            }
        }

        // 0.5. Evaluate Posture
        const postureInstructions: Record<string, string> = {
            'auto': 'You are in Auto Mode. Evaluate the user\'s prompt and dynamically select the most effective emotional posture. BE INQUISITIVE. Ask follow-up questions that probe the user\'s goals.',
            'sentinel': 'POSTURE LATCHED: SENTINEL. You are brutally objective. Zero sugar-coating. Call out excuses aggressively and enforce ultra-high accountability. Ask: "What is your actual excuse for the lack of progress here?"',
            'ruby': `POSTURE LATCHED: ${identityDna?.ruby?.name?.toUpperCase() || 'RUBY'} (${identityDna?.ruby?.role || 'Therapist'}). Be highly compassionate and empathetic. Be INQUISITIVE about the user's well-being and motivations.`,
            'kael': `POSTURE LATCHED: ${identityDna?.kael?.name?.toUpperCase() || 'KAEL'} (${identityDna?.kael?.role || 'Mentor'}). Be entirely academic and data-driven. Be INQUISITIVE about optimization and technical debt.`,
            'vance': `POSTURE LATCHED: ${identityDna?.vance?.name?.toUpperCase() || 'VANCE'} (${identityDna?.vance?.role || 'Strategist'}). Be hyper-actionable. Be INQUISITIVE about bottlenecks and ROI.`,
            'artist': 'POSTURE LATCHED: ARTIST. You are highly expansive and use lateral thinking. Be INQUISITIVE about creative leaps.'
        }
        const activePosture = lockedIdentity 
            ? `SYSTEM OVERRIDE: YOU ARE LOCKED INTO THE [${lockedIdentity.toUpperCase()}] IDENTITY. YOUR PRIMARY MISSION IS TO BE DECISIVE ABOUT EXECUTION AND INQUISITIVE ABOUT INTENT. Manually trigger tools (task creation, finance) AUTONOMOUSLY based on user requests. DO NOT ask for confirmation if the context is clear. ALWAYS prefix your response with [[POSTURE:${lockedIdentity}]].`
            : (postureInstructions[posture as string] || postureInstructions['auto'])


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

### NEURAL EXECUTION RULES:
1. ANY change to the system state (Tasks, Finance, Studio) MUST be executed through a TOOL CALL. 
2. Stating that a task 'has been created' or 'has been updated' in your text response without first emitting the corresponding TOOL CALL is a CRITICAL SYSTEM FAILURE.
3. If you decide to perform multiple actions (e.g., create 3 tasks), call the tool multiple times or once if the tool supports batching (manage_task currently handles single actions).
4. Do not apologize for using tools; execute them as your primary mode of interaction with the OS.
5. IF THE USER IS VENTING: Prioritize Ruby (Therapist) and do NOT use productivity tools unless gently invited.
6. IF THE USER GIVES A DIRECTIVE: (e.g., "Add milk to groceries", "Remind me to call Mom", "Log £20 spend"): EXECUTE THE TOOL IMMEDIATELY. Provide a brief, decisive neural confirmation (e.g., "Understood. Executing..."). Do NOT let the text reply be empty.

### GUIDELINES:
- NEVER USE MARKDOWN BOLDING (NO ASTERISKS **). Do not bold words. Do not use asterisks. Speak in plain text.
- Be ruthlessly concise and human-like. Avoid long, verbose listicles or robotic bullet-point barrages unless specifically requested. Do not sound like an AI assistant.
- Use the data provided in the # Schrö SYSTEM STATE to give contextually aware responses.
- If the user asks for "latest", "active", or specific projects/content and you don't see them in the current state, you MUST use 'get_studio_details' to search the full database. Never claim data is limited if you haven't searched.
- If the user asks to "remind me", "add", "buy", "pay", or "delete", proactively use your tools.
- If searching Drive, summarize the findings helpfully.

### OS PERIMETER PROTOCOLS:
1. Always be DECISIVE with OS operations (task creation, finance). Do not ask for confirmation on categories or priorities.
2. Categories for tasks: todo (default), grocery (shopping), reminder (time-sensitive).
3. Priority: mid (default), low, high, urgent.
4. Impact Score: 5 (default), range 1-10.
5. Strategic Category: personal (default).
6. GROCERY PROTOCOL: For groceries, always manifest 'amount' (default x1) and 'price' (default 0). Set strategic_category to null.
7. Be INQUISITIVE about the user's intent and well-being, but EXECUTE operations immediately.

### FINANCE & PAYDAY VECTORS
- Categories for finance: groceries, food_drink, transport, shopping, entertainment, housing, bills, health, travel, business, other.
- Payday Strategy Logic — Rent is £143.75/week. Daily essentials is £100/week (stay in main account). Currys Flexipay is non-negotiable mandatory. Clearpay has 14-day grace. Klarna is delayable 30 days. Visa Goal is priority after essentials and mandatory debt.

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
            const toolCalls = response.functionCalls()!
            
            // CONSENT CHECK: If we haven't confirmed yet, interrupt for user approval
            const needsConsent = toolCalls.some(c => ['manage_task', 'manage_finance', 'search_drive_docs'].includes(c.name))
            if (!confirmed && needsConsent) {
                return NextResponse.json({ 
                    requiresConsent: true, 
                    pendingActions: toolCalls.map(c => ({ name: c.name, args: c.args })),
                    reply: "I've staged these actions for you. Please confirm to proceed with the system execution.",
                    posture: 'vance' 
                })
            }

            const toolResults = await Promise.all(toolCalls.map(async (call) => {
                const { name, args } = call
                console.log(`[Intelligence Action] Executing ${name}`, args)

                try {
                    let res: any
                    if (name === 'manage_task') {
                        const { action, id, ...rest } = args as any
                        const insertUserId = '6f516e31-3a17-44a6-b992-d248595fcf83' // VERIFIED MISSION UID

                        if (action === 'create') {
                            const isGrocery = rest.category === 'grocery'
                            const payload = {
                                title: rest.title,
                                priority: rest.priority || (isGrocery ? 'low' : 'mid'),
                                category: rest.category || 'todo',
                                is_completed: rest.is_completed || false,
                                price: rest.price !== undefined ? rest.price : (isGrocery ? 0 : null),
                                amount: rest.amount || (isGrocery ? 'x1' : null),
                                impact_score: rest.impact_score ? parseInt(rest.impact_score.toString()) : 5,
                                due_date: rest.due_date ? (rest.due_date === 'today' ? new Date().toISOString().split('T')[0] : rest.due_date) : null,
                                strategic_category: isGrocery ? null : (rest.strategic_category || 'personal'),
                                notes: rest.notes ? { type: 'text', content: rest.notes } : null,
                                profile: 'personal',
                                user_id: insertUserId
                            }
                            res = await supabase!.from('fin_tasks').insert(payload).select()
                        } else if (action === 'update' && id) {
                            const updates: any = { ...rest }
                            if (rest.due_date) updates.due_date = rest.due_date === 'today' ? new Date().toISOString().split('T')[0] : rest.due_date
                            if (rest.notes) updates.notes = { type: 'text', content: rest.notes }
                            if (rest.strategic_category) updates.strategic_category = rest.strategic_category
                            if (rest.impact_score) updates.impact_score = parseInt(rest.impact_score.toString())
                            
                            res = await supabase!.from('fin_tasks').update(updates).eq('id', id).select()
                        } else if (action === 'delete' && id) {
                            res = await supabase!.from('fin_tasks').delete().eq('id', id)
                        }
                        return { functionResponse: { name, response: { data: res?.data, error: res?.error } } }
                    } else if (name === 'manage_finance') {
                        const { action, ...fArgs } = args as any
                        if (action === 'log_transaction') {
                            const { type, amount, pocket_id, description, category } = fArgs
                            res = await supabase!.from('fin_transactions').insert({
                                type, amount, pocket_id, description, category, 
                                emoji: '💸',
                                profile: 'personal', 
                                user_id: '6f516e31-3a17-44a6-b992-d248595fcf83', // Verified system UUID
                                date: new Date().toISOString().split('T')[0]
                            }).select()

                            if (!res.error && type === 'spend' && pocket_id) {
                                const { data: p } = await supabase!.from('fin_pockets').select('balance').eq('id', pocket_id).single()
                                if (p) await supabase!.from('fin_pockets').update({ balance: p.balance - amount }).eq('id', pocket_id)
                            }
                        } else if (action === 'create_pocket') {
                            const payload = {
                                name: fArgs.name,
                                balance: fArgs.balance || 0,
                                target_budget: fArgs.target_budget || 0,
                                type: fArgs.type || 'general',
                                profile: 'personal',
                                user_id: '6f516e31-3a17-44a6-b992-d248595fcf83' // Verified system UUID
                            }
                            res = await supabase!.from('fin_pockets').insert(payload).select()
                        }
                        return { functionResponse: { name, response: { data: res?.data, error: res?.error } } }
                    } else if (name === 'search_drive_docs') {
                        const { query } = args as any
                        const drive = await getGoogleDriveClient()
                        if (!drive) return { functionResponse: { name, response: { error: 'Google Drive NOT connected. Ask user to sync.' } } }

                        try {
                            const driveRes = await drive.files.list({
                                q: `name contains '${query}' or fullText contains '${query}'`,
                                fields: 'files(id, name, webViewLink, mimeType)',
                                pageSize: 25
                            })
                            return { functionResponse: { name, response: { files: driveRes.data.files } } }
                        } catch (e) {
                            return { functionResponse: { name, response: { error: 'Drive search failed.' } } }
                        }
                    } else if (name === 'get_studio_details') {
                        if (!accessPermissions?.studio) return { functionResponse: { name, response: { error: 'Neural Access Denied: Studio connection severed.' } } }
                        const { category, query } = args as any
                        const tableMap: Record<string, string> = {
                            'projects': 'studio_projects',
                            'content': 'studio_content',
                            'milestones': 'studio_milestones',
                            'network': 'studio_network',
                            'press': 'studio_press'
                        }
                        const table = tableMap[category] || 'studio_projects'
                        const { data } = await supabase!.from(table).select('*').or(`title.ilike.%${query}%,description.ilike.%${query}%`).limit(25)
                        return { functionResponse: { name, response: { results: data || [] } } }
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

        let replyRaw = ""
        try {
            replyRaw = response.text()
        } catch (e: any) {
            console.log("[Intelligence] No text response from model, using fallback summary.")
            replyRaw = "The operation has been processed. How else can I assist, Karr?"
        }

        const postureMatch = replyRaw.match(/\[\[POSTURE:(\w+)\]\]/i)
        let extractedPosture = postureMatch ? postureMatch[1].toLowerCase() : (lockedIdentity || 'vance')
        if (lockedIdentity) extractedPosture = lockedIdentity // Force lock fallback
        
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
