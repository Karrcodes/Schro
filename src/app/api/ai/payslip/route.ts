export const dynamic = (process.env.TAURI_PLATFORM !== undefined || process.env.IS_TAURI === 'true') ? 'force-static' : 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'
import { geminiModel } from '@/lib/gemini'

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData()
        const file = formData.get('file') as Blob | null

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const mimeType = file.type

        const prompt = `You are a financial data extractor. Analyze this payslip image and extract the following information strictly as a JSON object:
- employer: The name of the employer or company issuing the payslip.
- date: The date of the payslip or payment date, formatted strictly as YYYY-MM-DD.
- netPay: The final net pay or take-home pay amount as a number.
- grossPay: The total gross pay before any deductions.
- tax: The total income tax deducted.
- pension: The total pension contribution deducted.
- studentLoan: The total student loan repayment deducted (if any).

Return ONLY the JSON object, with no markdown formatting or other text. All amounts should be numbers (no currency symbols).
Example format:
{
  "employer": "Tech Corp",
  "date": "2023-10-25",
  "netPay": 2450.50,
  "grossPay": 3500.00,
  "tax": 600.00,
  "pension": 150.00,
  "studentLoan": 50.00
}`

        const imagePart = {
            inlineData: {
                data: buffer.toString('base64'),
                mimeType
            }
        }

        const result = await geminiModel.generateContent([prompt, imagePart])
        const text = result.response.text()

        // Clean up potential markdown formatting from the response
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim()

        try {
            const parsed = JSON.parse(cleanedText)
            return NextResponse.json(parsed)
        } catch (e) {
            console.error('Failed to parse Gemini response:', cleanedText)
            return NextResponse.json({ error: 'Failed to parse payslip data' }, { status: 500 })
        }

    } catch (err: any) {
        console.error('[Payslip Parse Error]', err)
        return NextResponse.json({ error: err.message || 'AI processing failed' }, { status: 500 })
    }
}
