import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    experimental: {
        // @ts-ignore
        allowedDevOrigins: ['192.168.0.27', 'localhost:3000']
    }
};

export default nextConfig;
