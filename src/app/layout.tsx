import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

// در ساخت استاتیک (GitHub Pages) آدرس‌ها باید زیرمسیر مخزن را داشته باشند؛
// در Cloudflare و پیش‌نمایش محلی این مقدار خالی است.
const BP = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "اتصال آزاد — راهنمای اتصال به اینترنت بین‌الملل بدون هزینه",
  description:
    "راهنمای فارسی و قدم‌به‌قدم ابزارهای رایگان و رسمی اتصال به اینترنت آزاد برای ویندوز و اندروید: Cloudflare WARP، تور با پل، سایفون، لانترن و Hiddify — به‌همراه مشاور اپراتور، DNS ضدتحریم و نکات امنیتی.",
  keywords: ["اینترنت آزاد", "فیلترشکن", "WARP", "تور", "سایفون", "DNS شکن", "راهنمای فارسی"],
  manifest: `${BP}/manifest.webmanifest`,
  icons: {
    icon: `${BP}/icon.svg`,
    apple: `${BP}/icon.svg`,
  },
};

export const viewport: Viewport = {
  themeColor: "#059669",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css"
        />
      </head>
      <body className="antialiased bg-background text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
