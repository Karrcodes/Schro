import { createServiceClient } from '@/lib/supabase/service'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'

// Lazy initialize Resend to prevent build-time crashes with "output: export"
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function POST(request: Request) {
    try {
        const { email } = await request.json()

        if (!email || !email.includes('@')) {
            return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 })
        }

        const supabase = createServiceClient()

        // 1. Save to Supabase
        const { error: dbError } = await supabase
            .from('waitlist')
            .upsert([{ email, status: 'pending' }], { onConflict: 'email' })

        if (dbError) {
            console.error('Waitlist DB Error:', dbError)
            // Continue to email even if DB fails for demo/resilience
        }

        if (!resend) {
            return NextResponse.json({ error: 'Resend is not configured' }, { status: 500 })
        }

        // 2. Send Email via Resend
        const { data, error: mailError } = await resend.emails.send({
            from: 'Schrö <erwin@schro.app>',
            to: [email],
            subject: "You're on the list | Schrö",
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #fafafa; margin: 0; padding: 0; color: #000; }
                        .container { max-width: 600px; margin: 40px auto; padding: 48px; background-color: #ffffff; border: 1px solid rgba(0,0,0,0.06); border-radius: 32px; box-shadow: 0 4px 24px rgba(0,0,0,0.02); }
                        .logo { font-family: "Georgia", serif; font-style: italic; font-size: 26px; font-weight: 500; margin-bottom: 48px; color: #000; }
                        h1 { font-size: 28px; font-weight: 800; margin-bottom: 24px; letter-spacing: -0.03em; line-height: 1.1; }
                        .intro { font-size: 16px; line-height: 1.6; color: rgba(0,0,0,0.7); margin-bottom: 32px; font-weight: 500; }
                        
                        .feature-grid { margin: 40px 0; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 32px; }
                        .feature-item { margin-bottom: 24px; }
                        .feature-title { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #000; margin-bottom: 4px; }
                        .feature-desc { font-size: 13px; color: rgba(0,0,0,0.4); line-height: 1.5; }
                        
                        .erwin-note { background: #fcfcfc; border: 1px solid rgba(0,0,0,0.03); padding: 24px; border-radius: 20px; margin-top: 32px; }
                        .erwin-label { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; color: rgba(0,0,0,0.2); margin-bottom: 12px; display: block; }
                        .erwin-text { font-size: 14px; font-style: italic; color: rgba(0,0,0,0.6); line-height: 1.6; }
                        
                        .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid rgba(0,0,0,0.05); font-size: 10px; font-weight: 700; color: rgba(0,0,0,0.15); text-transform: uppercase; letter-spacing: 0.2em; text-align: center; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="logo">Schrö</div>
                        <h1>Evolution Pending.</h1>
                        <p class="intro">Your identity has been logged into the neural network. We are carefully managing access to ensure every node in the Schrö ecosystem operates at peak fidelity.</p>
                        
                        <div class="feature-grid">
                            <div class="feature-item">
                                <div class="feature-title">Neural Operations</div>
                                <div class="feature-desc">A unified flow for tasks, reminders, and daily rhythm optimization.</div>
                            </div>
                            <div class="feature-item">
                                <div class="feature-title">Ecosystem Sync</div>
                                <div class="feature-desc">Deep integration with your finances, wellbeing metrics, and physical environment.</div>
                            </div>
                            <div class="feature-item">
                                <div class="feature-title">Studio Production</div>
                                <div class="feature-desc">End-to-end management for your creative projects and digital releases.</div>
                            </div>
                        </div>

                        <div class="erwin-note">
                            <span class="erwin-label">Message from Erwin</span>
                            <p class="erwin-text">"I am currently calibrating your environment. Once the system balance is optimal, I will initiate your synchronization. You are 1 of 50 in this specific expansion cycle."</p>
                        </div>

                        <div class="footer">A Singular Intelligence. Always With You.</div>
                    </div>
                </body>
                </html>
            `,
        })

        if (mailError) {
            console.error('Resend Error:', mailError)
            return NextResponse.json({ error: mailError.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, id: data?.id })
    } catch (err: any) {
        console.error('Unexpected Waitlist Error:', err)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
