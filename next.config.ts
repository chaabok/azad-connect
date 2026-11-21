import type { NextConfig } from "next";

// ─────────────────────────────────────────────────────────────
// دو حالت ساخت:
//
// 1) حالت استاتیک (برای هاست رایگان: GitHub Pages / Cloudflare Pages):
//      STATIC_EXPORT=true next build
//    خروجی در پوشه out/ قرار می‌گیرد.
//    NEXT_PUBLIC_BASE_PATH فقط برای GitHub Pages لازم است (مثلاً /azad-connect)
//
// 2) حالت عادی (پیش‌نمایش محلی): بدون هیچ متغیر محیطی — دقیقاً مثل قبل.
// ─────────────────────────────────────────────────────────────
const isStaticExport = process.env.STATIC_EXPORT === "true";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const sharedConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

const nextConfig: NextConfig = isStaticExport
  ? {
      ...sharedConfig,
      output: "export",
      basePath,
      images: { unoptimized: true },
    }
  : {
      ...sharedConfig,
      output: "standalone",
    };

export default nextConfig;
