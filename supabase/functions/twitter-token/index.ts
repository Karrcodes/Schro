import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const TWITTER_CLIENT_ID = Deno.env.get("TWITTER_CLIENT_ID") || "T3pSM253d1p1eERqNUVzVnpxbjM6MTpjaQ"
const TWITTER_CLIENT_SECRET = Deno.env.get("TWITTER_CLIENT_SECRET") || ""

serve(async (req: Request) => {
    // Enable CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
        })
    }

    const { code, code_verifier, redirect_uri } = await req.json()

    // Exchange code for token
    const tokenUrl = "https://api.twitter.com/2/oauth2/token"
    
    // Auth header for confidential client if secret provided
    const headers: Record<string, string> = {
        "Content-Type": "application/x-www-form-urlencoded"
    }

    if (TWITTER_CLIENT_SECRET) {
        const auth = btoa(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`)
        headers["Authorization"] = `Basic ${auth}`
    }

    const body = new URLSearchParams({
        client_id: TWITTER_CLIENT_ID,
        grant_type: "authorization_code",
        code,
        redirect_uri,
        code_verifier,
    })

    try {
        const response = await fetch(tokenUrl, {
            method: "POST",
            headers,
            body: body.toString()
        })

        const data = await response.json()
        
        return new Response(JSON.stringify(data), {
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            status: response.ok ? 200 : 400
        })
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            status: 500
        })
    }
})
