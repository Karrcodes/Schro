
const url = 'https://www.apple.com/iphone-15-pro/'; // Example URL
const title = 'iPhone 15 Pro';
const tagline = 'Personal';

async function testScraper() {
    console.log('Testing scraper for:', url);
    try {
        const response = await fetch(url, { 
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' },
        });
        if (!response.ok) {
            console.error('Fetch failed:', response.status, response.statusText);
            return;
        }
        const html = await response.text();
        console.log('HTML length:', html.length);
        
        const ogMatch = 
            html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
            html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
            html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ||
            html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i) ||
            html.match(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i) ||
            html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']image_src["']/i) ||
            html.match(/<meta[^>]+property=["']og:image:secure_url["'][^>]+content=["']([^"']+)["']/i) ||
            html.match(/<meta[^>]+itemprop=["']image["'][^>]+content=["']([^"']+)["']/i);
            
        if (ogMatch) {
            console.log('Scraper found image:', ogMatch[1]);
        } else {
            console.log('Scraper found nothing.');
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

testScraper();
