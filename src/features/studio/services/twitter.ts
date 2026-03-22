'use client'

/**
 * Twitter OAuth 2.0 PKCE implementation for Schro.
 * Requires TWITTER_CLIENT_ID to be set in environment.
 */

const TWITTER_CLIENT_ID = process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID || 'T3pSM253d1p1eERqNUVzVnpxbjM6MTpjaQ' // Default or placeholder
const REDIRECT_URI = typeof window !== 'undefined' ? `${window.location.origin}/create/canvas` : ''

// --- PKCE Helpers ---

function generateRandomString(length: number) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
    let result = ''
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
}

async function sha256(plain: string) {
    if (!window.crypto || !window.crypto.subtle) {
        throw new Error('Web Crypto API is not available. Ensure you are using a secure context (HTTPS or localhost).')
    }
    const encoder = new TextEncoder()
    const data = encoder.encode(plain)
    return window.crypto.subtle.digest('SHA-256', data)
}

function base64urlencode(a: ArrayBuffer) {
    const uint8 = new Uint8Array(a)
    let str = ''
    for (let i = 0; i < uint8.byteLength; i++) {
        str += String.fromCharCode(uint8[i])
    }
    return btoa(str)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')
}

export async function initiateTwitterAuth() {
    const state = generateRandomString(32)
    const codeVerifier = generateRandomString(128)
    const codeChallengeBuffer = await sha256(codeVerifier)
    const codeChallenge = base64urlencode(codeChallengeBuffer)

    // Store verifier and state for the callback
    localStorage.setItem('twitter_oauth_state', state)
    localStorage.setItem('twitter_oauth_verifier', codeVerifier)

    const url = new URL('https://twitter.com/i/oauth2/authorize')
    url.searchParams.append('response_type', 'code')
    url.searchParams.append('client_id', TWITTER_CLIENT_ID)
    url.searchParams.append('redirect_uri', REDIRECT_URI)
    url.searchParams.append('scope', 'tweet.read tweet.write users.read offline.access')
    url.searchParams.append('state', state)
    url.searchParams.append('code_challenge', codeChallenge)
    url.searchParams.append('code_challenge_method', 'S256')

    window.location.href = url.toString()
}

export async function handleTwitterCallback(code: string, state: string) {
    const savedState = localStorage.getItem('twitter_oauth_state')
    const codeVerifier = localStorage.getItem('twitter_oauth_verifier')

    console.log('Verifying State:', { received: state, saved: savedState, hasVerifier: !!codeVerifier })

    if (state !== savedState || !codeVerifier) {
        throw new Error(`Invalid OAuth state or missing verifier. Received: ${state}, Saved: ${savedState}`)
    }

    // We MUST use a backend proxy for this part to avoid CORS and hide CLIENT_SECRET (if used)
    // For now, I'll call a hypothetical Supabase Edge function
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/twitter-token`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
            code,
            code_verifier: codeVerifier,
            redirect_uri: REDIRECT_URI,
            client_id: TWITTER_CLIENT_ID
        })
    })

    if (!response.ok) {
        const err = await response.json()
        const message = err.message || err.error || (err.errors?.[0]?.message) || 'Failed to exchange token'
        throw new Error(message)
    }

    const tokens = await response.json()
    localStorage.setItem('schro_twitter_tokens', JSON.stringify(tokens))
    localStorage.setItem('schro_twitter_connected', 'true')
    
    // Clear temporary data
    localStorage.removeItem('twitter_oauth_state')
    localStorage.removeItem('twitter_oauth_verifier')

    return tokens
}

export async function postTweet(text: string) {
    const tokensStr = localStorage.getItem('schro_twitter_tokens')
    if (!tokensStr) throw new Error('Twitter not connected')
    
    const tokens = JSON.parse(tokensStr)

    // Use backend proxy to post tweet securely
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/post-tweet`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
            text,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token
        })
    })

    if (!response.ok) {
        // Handle token refresh if token expired
        if (response.status === 401) {
            // Logic for refresh token...
        }
        const err = await response.json()
        console.log('Twitter API Error full response:', err)
        const message = err.message || err.error || (err.errors?.[0]?.message) || err.detail || 'Failed to post tweet'
        throw new Error(message)
    }

    return response.json()
}
