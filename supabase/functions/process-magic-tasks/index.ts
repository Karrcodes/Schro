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
    const { text, image, type } = await req.json()

    if (!GEMINI_API_KEY) {
      throw new Error('Missing GEMINI_API_KEY')
    }

    let contents = []

    if (type === 'image' && image) {
      contents = [
        {
          role: "user",
          parts: [
            { text: "Extract actionable to-do items from this image. Return a JSON array of objects with keys: title, priority (urgent, high, mid, low), notes. Do not include markdown formatting." },
            {
              inline_data: {
                mime_type: "image/jpeg",
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
            { text: `Extract actionable to-do items from this text: "${text}". Return a JSON array of objects with keys: title, priority (urgent, high, mid, low), notes. Do not include markdown formatting.` },
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
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]"
    
    // Clean up potential markdown formatting if the model ignored the instruction
    const cleanedContent = content.replace(/```json/g, '').replace(/```/g, '').trim()
    
    let tasks = []
    try {
      tasks = JSON.parse(cleanedContent)
    } catch (e) {
      console.error('Failed to parse AI response:', cleanedContent)
      tasks = []
    }

    return new Response(JSON.stringify({ tasks }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
