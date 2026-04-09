export const dynamic = 'force-static'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const url = searchParams.get('url')

    if (!url) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
            },
            next: { revalidate: 3600 } // Cache for 1 hour
        })

        if (!response.ok) {
            throw new Error('Failed to fetch URL')
        }

        const html = await response.text()

        const getMetaContent = (selectors: string[]) => {
            for (const selector of selectors) {
                // Handle property="...", name="..." and various orders
                const patterns = [
                    new RegExp(`<meta[^>]+(?:property|name)=["']${selector}["'][^>]+content=["']([^"']+)["']`, 'i'),
                    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${selector}["']`, 'i'),
                    new RegExp(`<meta[^>]+itemprop=["']${selector}["'][^>]+content=["']([^"']+)["']`, 'i'),
                    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+itemprop=["']${selector}["']`, 'i')
                ]

                for (const pattern of patterns) {
                    const match = html.match(pattern)
                    if (match && match[1]) return match[1]
                }
            }
            return null
        }

        const title = getMetaContent(['og:title', 'twitter:title', 'title']) || html.match(/<title>([^<]+)<\/title>/i)?.[1]
        const description = getMetaContent(['og:description', 'twitter:description', 'description'])
        const image = getMetaContent(['og:image', 'twitter:image:src', 'twitter:image', 'thumbnailUrl', 'image'])
        const siteName = getMetaContent(['og:site_name', 'twitter:site']) || new URL(url).hostname

        return NextResponse.json({
            title: title || url,
            description: description || '',
            image: image || null,
            siteName: siteName,
            url: url
        })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
