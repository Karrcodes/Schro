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

        const prompt = `Analyze this grocery receipt. Extract all items with their names, prices, and the name of the store (e.g. Lidl, Aldi, Tesco). 
        
        CRITICAL INSTRUCTIONS:
        1. If multiple of the same item are listed (e.g. 3x Milk), consolidate them into ONE entry.
        2. Extract the UNIT PRICE for the item (not the total for that line if there are multiples).
        3. Provide the name of the store.
        
        Return the data strictly as a JSON array of objects with keys: "name", "price" (number), and "store" (string).
        Exclude tax, total, or non-item lines. Clean up item names to be concise.
        
        Example format:
        [
          {"name": "Milk", "price": 1.50, "store": "Lidl"},
          {"name": "Bread", "price": 0.85, "store": "Lidl"}
        ]`

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
            return NextResponse.json({ error: 'Failed to parse receipt data' }, { status: 500 })
        }

    } catch (err: any) {
        console.error('[Receipt Parse Error]', err)
        return NextResponse.json({ error: err.message || 'AI processing failed' }, { status: 500 })
    }
}
