export const dynamic = (process.env.TAURI_PLATFORM !== undefined || process.env.IS_TAURI === 'true') ? 'force-static' : 'force-dynamic';
import { NextResponse } from 'next/server';
import { geminiModel } from '@/lib/gemini';

export async function POST(req: Request) {
    try {
        const { text, image, type, mimeType } = await req.json();

        let prompt = "";
        let parts: any[] = [];

        if (type === 'image' && image) {
            prompt = "Extract actionable to-do items from this image. Return a JSON array of objects with keys: title, priority (super, high, mid, low), notes. Return ONLY the JSON array, no markdown formatting or preamble.";
            parts = [
                prompt,
                {
                    inlineData: {
                        data: image,
                        mimeType: mimeType || "image/jpeg"
                    }
                }
            ];
        } else if (type === 'text' && text) {
            prompt = `Extract actionable to-do items from this text: "${text}". Return a JSON array of objects with keys: title, priority (super, high, mid, low), notes. Return ONLY the JSON array, no markdown formatting.`;
            parts = [prompt];
        } else {
            return NextResponse.json({ error: 'Invalid input type or missing data' }, { status: 400 });
        }

        const result = await geminiModel.generateContent(parts);
        const content = result.response.text() || "[]";
        
        // Clean up markdown formatting if the model ignored instructions
        const cleanedContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
        
        let tasks = [];
        try {
            // Find the first '[' and last ']' to extract JSON array if there's surrounding text
            const startIdx = cleanedContent.indexOf('[');
            const endIdx = cleanedContent.lastIndexOf(']');
            if (startIdx !== -1 && endIdx !== -1) {
                const jsonStr = cleanedContent.substring(startIdx, endIdx + 1);
                tasks = JSON.parse(jsonStr);
            } else {
                tasks = JSON.parse(cleanedContent);
            }
        } catch (e) {
            console.error('Failed to parse AI response:', cleanedContent);
            if (cleanedContent.length > 0 && !cleanedContent.startsWith('{') && !cleanedContent.startsWith('[')) {
                tasks = [{ title: cleanedContent.substring(0, 100), priority: 'mid' }];
            } else {
                tasks = [];
            }
        }

        return NextResponse.json({ tasks });
    } catch (error: any) {
        console.error('API Route Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
