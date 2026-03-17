import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const MODEL_NAME = "gemini-1.5-flash"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text, image, type, mimeType } = await req.json()

    if (!GEMINI_API_KEY) {
      throw new Error('Missing GEMINI_API_KEY')
    }

    let contents = []

    if (type === 'image' && image) {
      const finalMimeType = mimeType || "image/jpeg"
      console.log(`Processing image with mimeType: ${finalMimeType}`)
      
      contents = [
        {
          role: "user",
          parts: [
            { text: "Extract actionable to-do items from this image. Return a JSON array of objects with keys: title, priority (urgent, high, mid, low), notes. Return ONLY the JSON array, no markdown formatting or preamble." },
            {
              inline_data: {
                mime_type: finalMimeType,
                data: image,
              },
            },
          ],
        },
      ]
    } else if (type === 'text' && text) {
      contents = [
        {
          role: "user",
          parts: [
            { text: `Extract actionable to-do items from this text: "${text}". Return a JSON array of objects with keys: title, priority (urgent, high, mid, low), notes. Return ONLY the JSON array, no markdown formatting.` },
          ],
        },
      ]
    } else {
      throw new Error('Invalid input type or missing data')
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contents }),
      }
    )

    const data = await response.json()
    
    if (data.error) {
      console.error('Gemini API Error:', data.error)
      throw new Error(`Gemini API Error: ${data.error.message || 'Unknown error'}`)
    }

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]"
    console.log('Gemini Raw Content:', content)
    
    // Clean up potential markdown formatting if the model ignored the instruction
    const cleanedContent = content.replace(/```json/g, '').replace(/```/g, '').replace(/\[/m, '[').trim()
    
    let tasks = []
    try {
      // Find the first '[' and last ']' to extract JSON array if there's surrounding text
      const startIdx = cleanedContent.indexOf('[')
      const endIdx = cleanedContent.lastIndexOf(']')
      if (startIdx !== -1 && endIdx !== -1) {
        const jsonStr = cleanedContent.substring(startIdx, endIdx + 1)
        tasks = JSON.parse(jsonStr)
      } else {
        tasks = JSON.parse(cleanedContent)
      }
    } catch (e) {
      console.error('Failed to parse AI response:', cleanedContent)
      // If parsing fails, try to return at least something
      if (cleanedContent.length > 0 && !cleanedContent.startsWith('{') && !cleanedContent.startsWith('[')) {
        tasks = [{ title: cleanedContent.substring(0, 100), priority: 'mid' }]
      } else {
        tasks = []
      }
    }

    return new Response(JSON.stringify({ tasks }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Edge Function Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
