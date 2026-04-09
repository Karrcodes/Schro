export const dynamic = 'force-dynamic'
execute them as your primary mode of interaction with the OS.
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
