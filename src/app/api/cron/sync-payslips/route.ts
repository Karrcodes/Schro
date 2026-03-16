import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'
import { geminiModel } from '@/lib/gemini'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl!, supabaseServiceKey!)

// Convert base64url (from Gmail API) to standard base64 (for Gemini)
function cleanBase64Url(base64String: string) {
    return base64String.replace(/-/g, '+').replace(/_/g, '/')
}

export async function GET(req: Request) {
    // 1. Optional security check: Ensure this is called via Vercel Cron or a secret key
    const authHeader = req.headers.get('authorization')
    const isManual = req.headers.get('x-karr-manual') === 'true'
    if (!isManual && authHeader !== `Bearer ${process.env.KARR_OS_WEBHOOK_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    try {
        console.log('[Payslip Sync] Starting job...')

        // 2. Fetch User Tokens (Assuming Karr's user_id is 'karr' as established in previous modules)
        const { data: tokenData, error: tokenError } = await supabase
            .from('sys_auth_tokens')
            .select('*')
            .eq('user_id', 'karr')
            .single()

        if (tokenError || !tokenData) {
            console.error('[Payslip Sync] No auth tokens found', tokenError)
            return NextResponse.json({ error: 'OAuth tokens not found. Please reconnect Gmail.' }, { status: 400 })
        }

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        )

        oauth2Client.setCredentials({
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expiry_date: tokenData.expiry_date
        })

        // If the token is expired, this will handle emitting new tokens
        oauth2Client.on('tokens', async (tokens) => {
            console.log('[Payslip Sync] Refreshing tokens...')
            await supabase.from('sys_auth_tokens').upsert({
                user_id: 'karr',
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token || tokenData.refresh_token,
                expiry_date: tokens.expiry_date,
                updated_at: new Date().toISOString()
            })
        })

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

        // 3. Search for recent payslip emails
        // We look for emails with 'payslip' in subject, from the last 31 days just to be safe. Idempotency protects us from duplicates.
        const query = 'subject:payslip newer_than:31d'
        console.log(`[Payslip Sync] Searching Gmail with query: ${query}`)

        const res = await gmail.users.messages.list({
            userId: 'me',
            q: query,
            maxResults: 10 // Up to 10 recent matching payslips
        })

        const messages = res.data.messages

        if (!messages || messages.length === 0) {
            console.log('[Payslip Sync] No new payslips found.')
            return NextResponse.json({ status: 'No new payslips found' })
        }

        const processedPayslips = []
        const skippedPayslips = []
        const debugLogs = []

        // 4. Process each message
        for (const msg of messages) {
            if (!msg.id) continue

            debugLogs.push(`Processing message ${msg.id}`)

            const messageData = await gmail.users.messages.get({
                userId: 'me',
                id: msg.id
            })

            const parts = messageData.data.payload?.parts || []
            
            // Look for PDF attachments recursively
            let pdfAttachment = null
            
            const findAttachment = (partsList: any[]) => {
                for (const part of partsList) {
                    const isPdf = part.mimeType === 'application/pdf' || (part.filename && part.filename.toLowerCase().endsWith('.pdf'))
                    if (isPdf && part.body?.attachmentId) {
                        pdfAttachment = part
                        break
                    }
                    if (part.parts) {
                        findAttachment(part.parts)
                    }
                }
            }
            
            findAttachment(parts)

            if (!pdfAttachment) {
                debugLogs.push(`${msg.id}: No PDF attachment found`)
                continue
            }

            // 5. Download the Attachment
            debugLogs.push(`${msg.id}: Found attachment, downloading...`)
            const attachmentResponse = await gmail.users.messages.attachments.get({
                userId: 'me',
                messageId: msg.id,
                id: (pdfAttachment as any).body.attachmentId
            })

            const attachmentData = attachmentResponse.data.data
            if (!attachmentData) {
                debugLogs.push(`${msg.id}: Attachment data empty`)
                continue
            }

            // 6. Use Gemini to extract data from the PDF visually
            debugLogs.push(`${msg.id}: Sending to Gemini...`)
            
            const prompt = `
                Extract the following financial information from this payslip PDF and return it as a pure JSON object WITHOUT markdown blocks or backticks.
                If a value is not found, use null.
                Required format:
                {
                    "date": "YYYY-MM-DD",
                    "employer": "String",
                    "gross_pay": Number,
                    "net_pay": Number,
                    "tax_paid": Number,
                    "pension_contributions": Number,
                    "student_loan": Number
                }
            `

            try {
                const pdfPart = {
                    inlineData: {
                        data: cleanBase64Url(attachmentData),
                        mimeType: 'application/pdf'
                    }
                }

                const result = await geminiModel.generateContent([prompt, pdfPart])
                const responseText = result.response.text()
                
                debugLogs.push(`${msg.id}: Gemini responded`)

                // Clean the response (sometimes Gemini still wraps it in markdown)
                const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim()
                const extractedData = JSON.parse(cleanedText)

                debugLogs.push(`${msg.id}: Parsed Gemini JSON for ${extractedData.date}`)

                // 7. Check if we already have this payslip (idempotency check)
                const { data: existing, error: queryError } = await supabase
                    .from('fin_payslips')
                    .select('id')
                    .eq('date', extractedData.date)
                    .eq('net_pay', extractedData.net_pay)
                    .single()

                if (existing) {
                    debugLogs.push(`${msg.id}: Skip (already in DB)`)
                    skippedPayslips.push(extractedData.date)
                    continue
                }

                // 8. Save to database
                const { data: lastRecord } = await supabase.from('fin_payslips').select('user_id').not('user_id', 'is', null).limit(1).single()
                const fallbackUserId = '6f516e31-3a17-44a6-b992-d248595fcf83'

                const { error: insertError } = await supabase.from('fin_payslips').insert([{
                    date: extractedData.date,
                    employer: extractedData.employer || 'Unknown',
                    gross_pay: extractedData.gross_pay,
                    net_pay: extractedData.net_pay,
                    tax_paid: extractedData.tax_paid,
                    pension_contributions: extractedData.pension_contributions,
                    student_loan: extractedData.student_loan,
                    profile: 'personal', // Default to personal
                    user_id: lastRecord?.user_id || fallbackUserId
                }])

                if (insertError) {
                    debugLogs.push(`${msg.id}: Insert error ${insertError.message}`)
                } else {
                    debugLogs.push(`${msg.id}: Processed successfully`)
                    processedPayslips.push(extractedData.date)
                }

            } catch (aiError: any) {
                debugLogs.push(`${msg.id}: Error - ${aiError.message}`)
            }
        }

        return NextResponse.json({ 
            status: 'Success', 
            processed: processedPayslips.length,
            skipped: skippedPayslips,
            dates: processedPayslips,
            debug: debugLogs
        })

    } catch (error: any) {
        console.error('[Payslip Sync] Fatal Error', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
