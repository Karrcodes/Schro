import type { NextConfig } from "next";

const isTauri = process.env.TAURI_PLATFORM !== undefined;

const nextConfig: NextConfig = {
    output: isTauri ? 'export' : undefined,
    images: {
        unoptimized: isTauri,
    },
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'Content-Security-Policy',
                        value: "frame-ancestors 'self' https://usepastel.com https://www.bugherd.com https://bugherd.com",
                    },
                    {
                        key: 'X-Frame-Options',
                        value: '', // Suppress Next.js default SAMEORIGIN to allow IFrames
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
