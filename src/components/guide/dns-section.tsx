"use client";

import { useState } from "react";
import { Copy, Check, Network, Info, ExternalLink, Monitor, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DNS_PROVIDERS } from "@/lib/guide-data";

export function DnsSection() {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (ip: string) => {
    try {
      await navigator.clipboard.writeText(ip);
    } catch {
      // در محیط‌های بدون دسترسی clipboard بی‌صدا رد می‌شویم
    }
    setCopied(ip);
    setTimeout(() => setCopied((c) => (c === ip ? null : c)), 1800);
  };

  return (
    <section id="dns" className="scroll-mt-24 bg-muted/40 py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="mb-8 text-center">
          <Badge variant="outline" className="mb-3 gap-1.5 border-primary/40 bg-primary/5 text-primary">
            <Network className="h-3.5 w-3.5" />
            بدون نصب برنامه
          </Badge>
          <h2 className="text-2xl font-bold sm:text-3xl">DNS ضدتحریم</h2>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            سریع‌ترین راه بازکردن سرویس‌های تحریم‌شده — فقط با تغییر چند عدد.
          </p>
        </div>

        <Alert className="mb-8 border-amber-300 bg-amber-50 text-amber-900 [&>svg]:text-amber-600">
          <Info className="h-4 w-4" />
          <AlertDescription className="leading-6">
            <span className="font-bold">دقت کنید:</span> DNS ضدتحریم فقط محدودیت‌های تحریمی
            سرویس‌های خارجی (مانند گیت‌هاب و داکرهاب) را باز می‌کند و فیلترینگ داخلی را دور
            نمی‌زند. مزیتش: سرعت عالی، بدون نصب هیچ برنامه‌ای و ریسک نزدیک به صفر.
          </AlertDescription>
        </Alert>

        <div className="grid gap-4 sm:grid-cols-2">
          {DNS_PROVIDERS.map((p) => (
            <Card key={p.name}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{p.name}</span>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-normal text-muted-foreground transition-colors hover:text-primary"
                  >
                    <span dir="ltr">{p.site}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </CardTitle>
                <CardDescription>برای کپی، روی هر IP بزنید</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {p.ips.map((ip) => (
                  <button
                    key={ip}
                    type="button"
                    onClick={() => copy(ip)}
                    dir="ltr"
                    className="flex items-center justify-between gap-2 rounded-md border bg-muted/50 px-3 py-2 font-mono text-sm transition-colors hover:bg-accent"
                    aria-label={`کپی ${ip}`}
                  >
                    <span>{ip}</span>
                    {copied === ip ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <Copy className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Monitor className="h-4 w-4 text-primary" />
                تنظیم در ویندوز
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-7 text-muted-foreground">
              Settings سپس Network &amp; Internet و Change adapter options؛ روی اتصال فعال
              راست‌کلیک و Properties، بعد Internet Protocol Version 4 و در گزینه Use the
              following DNS server addresses دو IP سرویس انتخابی را وارد کنید.
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Smartphone className="h-4 w-4 text-primary" />
                تنظیم در اندروید
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-7 text-muted-foreground">
              تنظیمات، Network و بعد Private DNS؛ گزینه Private DNS provider hostname را
              انتخاب و آدرس DNS سرویس را از سایت خودش وارد کنید (برای سرویس‌هایی که DoT
              دارند). در غیر این صورت روی همان شبکه وای‌فای، DNS دستی را با IPها تنظیم کنید.
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
