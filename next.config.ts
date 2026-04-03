import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
