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

    const { text, access_token, refresh_token } = await req.json()

    // Post tweet
    const tweetUrl = "https://api.twitter.com/2/tweets"

    try {
        const response = await fetch(tweetUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${access_token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ text })
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
