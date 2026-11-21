"use client";

import { useState } from "react";
import {
  Globe,
  Zap,
  RotateCw,
  X,
  ExternalLink,
  Loader2,
  Info,
  Search,
  CloudOff,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

// در ساخت استاتیک (GitHub Pages) سرور و درگاه داخلی وجود ندارد.
// روی Cloudflare Pages (نسخه کامل) و پیش‌نمایش محلی، درگاه فعال است.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const PROXY_ENABLED = process.env.NEXT_PUBLIC_PROXY_ENABLED !== "false";

const PORTAL_SITES = [
  { label: "بی‌بی‌سی فارسی", url: "https://www.bbc.com/persian" },
  { label: "رادیو فردا", url: "https://www.radiofarda.com/" },
  { label: "دویچه‌وله فارسی", url: "https://www.dw.com/fa-ir/" },
  { label: "خبر مستقل", url: "https://www.independentpersian.com/" },
  { label: "الجزیره", url: "https://www.aljazeera.net/" },
];

function toUrl(v: string): string {
  if (/^https?:\/\//i.test(v)) return v;
  if (v.includes(" ") || !v.includes(".")) {
    return `https://www.bing.com/search?q=${encodeURIComponent(v)}`;
  }
  return `https://${v}`;
}

export function Portal() {
  const [input, setInput] = useState("");
  const [target, setTarget] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [nonce, setNonce] = useState(0);

  const openDirect = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const open = (url: string) => {
    if (!PROXY_ENABLED) {
      openDirect(url);
      return;
    }
    setTarget(url);
    setLoading(true);
    setNonce((n) => n + 1);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = input.trim();
    if (!v) return;
    open(toUrl(v));
  };

  const reload = () => setNonce((n) => n + 1);

  return (
    <section id="portal" className="scroll-mt-24 py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mb-8 text-center">
          <Badge
            variant="outline"
            className={
              PROXY_ENABLED
                ? "mb-3 gap-1.5 border-primary/40 bg-primary/5 text-primary"
                : "mb-3 gap-1.5 border-muted-foreground/30 bg-muted text-muted-foreground"
            }
          >
            {PROXY_ENABLED ? <Zap className="h-3.5 w-3.5" /> : <CloudOff className="h-3.5 w-3.5" />}
            {PROXY_ENABLED ? "کلیک کن و وصل شو" : "نسخه سبک"}
          </Badge>
          <h2 className="text-2xl font-bold sm:text-3xl">درگاه یک‌کلیکی به وب بین‌الملل</h2>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            {PROXY_ENABLED
              ? "روی هر میانبر بزنید تا صفحه واقعی سایت، همین‌جا و بدون نصب هیچ چیز باز شود — درخواست‌ها از سرور خارجی همین اپ عبور می‌کنند."
              : "این نسخه روی هاست استاتیک است و سرور داخلی ندارد؛ دکمه‌ها سایت را مستقیم در تب جدید باز می‌کنند. برای درگاه یک‌کلیکی، نسخه Cloudflare را به‌کار ببرید."}
          </p>
        </div>

        <Card className="mb-5">
          <CardContent className="p-4 sm:p-5">
            <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="آدرس سایت یا هر جمله برای جستجو..."
                dir="ltr"
                className="h-12 flex-1 text-left"
                aria-label="آدرس سایت یا عبارت جستجو"
              />
              <Button type="submit" size="lg" className="h-12 gap-2">
                <Search className="h-4 w-4" />
                {PROXY_ENABLED ? "باز کن" : "جستجو"}
              </Button>
            </form>
            <div className="mt-4 flex flex-wrap gap-2">
              {PORTAL_SITES.map((s) => (
                <Button
                  key={s.url}
                  type="button"
                  variant="secondary"
                  className="gap-1.5"
                  onClick={() => open(s.url)}
                >
                  <Globe className="h-3.5 w-3.5 text-primary" />
                  {s.label}
                  {!PROXY_ENABLED && <ExternalLink className="h-3 w-3 text-muted-foreground" />}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {!PROXY_ENABLED && (
          <Alert className="mb-5 border-amber-300 bg-amber-50 text-amber-900 [&>svg]:text-amber-600">
            <CloudOff className="h-4 w-4" />
            <AlertDescription className="leading-6">
              <span className="font-bold">چرا صفحه‌ای داخل اپ باز نمی‌شود؟</span> این نسخه از سایت
              روی هاست استاتیک رایگان قرار دارد و سروری برای درگاه ندارد. لینک‌ها مستقیم در تب جدید
              باز می‌شوند؛ اگر سایتی باز نشد یعنی بدون فیلترشکن به آن دسترسی نیست — و این طبیعی است.
              راه اصلی و دائمی همان بخش‌های بعدی است: WARP، سایفون و تور.
            </AlertDescription>
          </Alert>
        )}

        {PROXY_ENABLED && target && (
          <Card className="overflow-hidden">
            <CardContent className="border-b bg-muted/40 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p dir="ltr" className="min-w-0 flex-1 truncate text-left font-mono text-xs text-muted-foreground">
                  {target}
                </p>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button variant="ghost" size="sm" onClick={reload} className="gap-1.5" aria-label="بارگذاری مجدد">
                    <RotateCw className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">تازه‌سازی</span>
                  </Button>
                  <Button variant="ghost" size="sm" asChild className="gap-1.5">
                    <a href={target} target="_blank" rel="noopener noreferrer" aria-label="باز کردن مستقیم سایت">
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">مستقیم</span>
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTarget(null)}
                    className="gap-1.5"
                    aria-label="بستن درگاه"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">بستن</span>
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardContent className="relative p-0">
              {loading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/80">
                  <Loader2 className="h-7 w-7 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">در حال باز کردن از مسیر سرور خارجی...</p>
                </div>
              )}
              <iframe
                key={nonce}
                src={`${BASE_PATH}/api/proxy?url=${encodeURIComponent(target)}`}
                onLoad={() => setLoading(false)}
                title="نمای وب بین‌الملل"
                className="h-[65vh] min-h-[420px] w-full bg-white"
              />
            </CardContent>
          </Card>
        )}

        {PROXY_ENABLED && (
          <Alert className="mt-5 border-amber-300 bg-amber-50 text-amber-900 [&>svg]:text-amber-600">
            <Info className="h-4 w-4" />
            <AlertDescription className="leading-6">
              <span className="font-bold">محدودیت‌های درگاه را بدانید:</span> این درگاه برای وب‌گردی
              ساده (خبر، جستجو، ویکی‌پدیا) مناسب است؛ ویدیو، ورود به حساب‌ها و اپ‌های دیگر را پوشش
              نمی‌دهد و بعضی سایت‌های سنگین ساده‌شده نمایش داده می‌شوند. برای اتصال دائمی به کل
              اینترنت همان راه اصلی — WARP و سایفون — ملاک است.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </section>
  );
}
