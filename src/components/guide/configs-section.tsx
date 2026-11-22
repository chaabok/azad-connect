"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Copy,
  Check,
  Server,
  Info,
  Loader2,
  Clock,
  ShieldAlert,
  ListChecks,
  Activity,
  Gauge,
  ExternalLink,
  ArrowUpDown,
  BadgeCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// در نسخه استاتیک (GitHub Pages) مسیر پایه زیرپوشه است
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

type SourceInfo = { key: string; name: string; url: string };

type CountryEntry = {
  cc: string;
  name: string;
  flag: string;
  count: number;
  verifiedCount: number;
  file: string;
};

type RichConfig = {
  uri: string;
  proto: string;
  net: string;
  security: string;
  country: string;
  org: string;
  ping: number | null;
  speed: number | null;
  source: string;
  name: string;
  host: string;
  port: number;
  verified: boolean;
};

type LatestData = {
  generated: string;
  sources: SourceInfo[];
  countries: CountryEntry[];
  configs: RichConfig[];
};

const PROTO_LABEL: Record<string, string> = {
  vless: "VLESS",
  vmess: "VMess",
  trojan: "Trojan",
  ss: "Shadowsocks",
};

const COUNTRY_ORDER = [
  "TR", "AE", "GE", "AM", "AZ", "DE", "NL", "FI", "SE", "GB", "FR", "CH", "AT",
  "CZ", "PL", "UA", "IT", "ES", "RO", "BG", "MD", "HU", "DK", "NO", "IE", "EE",
  "LV", "LT", "US", "CA", "JP", "SG", "HK", "KR", "AU", "BR", "IN", "AR", "MX",
];

function pingClass(ping: number | null): string {
  if (ping === null) return "border-muted-foreground/30 bg-muted text-muted-foreground";
  if (ping <= 300) return "border-emerald-400/50 bg-emerald-50 text-emerald-700";
  if (ping <= 800) return "border-amber-400/50 bg-amber-50 text-amber-700";
  return "border-rose-400/50 bg-rose-50 text-rose-700";
}

function speedLabel(speed: number | null): string {
  if (speed === null) return "—";
  return `${speed.toFixed(1)} Mbps`;
}

function secBadge(security: string): string | null {
  const s = security?.toLowerCase();
  if (s === "reality") return "REALITY";
  if (s === "tls") return "TLS";
  return null;
}

export function ConfigsSection() {
  const [data, setData] = useState<LatestData | null>(null);
  const [dataError, setDataError] = useState(false);
  const [country, setCountry] = useState<string>("all");
  const [proto, setProto] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("ping");
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  const copyText = useCallback(async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // بدون دسترسی کلیپ‌بورد بی‌صدا رد می‌شویم
    }
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 1800);
  }, []);

  useEffect(() => {
    let alive = true;
    fetch(`${BASE_PATH}/configs/latest.json`, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((d: LatestData) => {
        if (alive) setData(d);
      })
      .catch(() => {
        if (alive) setDataError(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const sourceMap = useMemo(() => {
    const m = new Map<string, SourceInfo>();
    for (const s of data?.sources || []) m.set(s.key, s);
    return m;
  }, [data]);

  const protocolCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of data?.configs || []) {
      if (verifiedOnly && !c.verified) continue;
      m.set(c.proto, (m.get(c.proto) || 0) + 1);
    }
    return m;
  }, [data, verifiedOnly]);

  const filtered = useMemo(() => {
    const list = (data?.configs || []).filter((c) => {
      if (verifiedOnly && !c.verified) return false;
      if (country !== "all" && c.country !== country) return false;
      if (proto !== "all" && c.proto !== proto) return false;
      return true;
    });
    const ccRank = (cc: string) => {
      const i = COUNTRY_ORDER.indexOf(cc);
      return i === -1 ? 999 : i;
    };
    const nullsLastAsc = (v: number | null) => (v === null ? Number.MAX_SAFE_INTEGER : v);
    const nullsLastDesc = (v: number | null) => (v === null ? -1 : v);
    const sorted = [...list];
    if (sortBy === "ping") {
      sorted.sort(
        (a, b) =>
          nullsLastAsc(a.ping) - nullsLastAsc(b.ping) || ccRank(a.country) - ccRank(b.country)
      );
    } else if (sortBy === "speed") {
      sorted.sort(
        (a, b) =>
          nullsLastDesc(b.speed) - nullsLastDesc(a.speed) || nullsLastAsc(a.ping) - nullsLastAsc(b.ping)
      );
    } else {
      sorted.sort(
        (a, b) =>
          ccRank(a.country) - ccRank(b.country) ||
          (b.verified ? 1 : 0) - (a.verified ? 1 : 0) ||
          nullsLastAsc(a.ping) - nullsLastAsc(b.ping)
      );
    }
    return sorted;
  }, [data, country, proto, sortBy, verifiedOnly]);

  const subUrl = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const c = data?.countries.find((x) => x.cc === country);
    const file = country !== "all" && c ? c.file : "all.txt";
    return `${origin}${BASE_PATH}/sub/${file}`;
  }, [data, country]);

  const updatedAt = data
    ? new Date(data.generated).toLocaleString("fa-IR", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "";

  const verifiedTotal = data?.configs.filter((c) => c.verified).length ?? 0;

  return (
    <section id="configs" className="scroll-mt-24 py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="mb-8 text-center">
          <Badge variant="outline" className="mb-3 gap-1.5 border-primary/40 bg-primary/5 text-primary">
            <Server className="h-3.5 w-3.5" />
            بدون نیاز به جست‌وجو — آماده اتصال
          </Badge>
          <h2 className="text-2xl font-bold sm:text-3xl">کانفیگ‌های رایگان تست‌شده</h2>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            هر ۶ ساعت از منابع معروف جمع‌آوری، با هسته واقعی Xray اجرا و کشور خروجی، پینگ و سرعت
            دانلود اندازه‌گیری می‌شود. با فیلتر پروتکل و کشور، بهترین را انتخاب کنید.
          </p>
        </div>

        <Alert className="mb-6 border-amber-300 bg-amber-50 text-amber-900 [&>svg]:text-amber-600">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription className="leading-6">
            <span className="font-bold">هشدار امنیتی:</span> این سرورها عمومی و رایگان هستند و
            صدها نفر همزمان از آن‌ها استفاده می‌کنند. فقط برای مرور عادی وب مناسب‌اند؛{" "}
            <span className="font-bold">هرگز</span> با آن‌ها به بانک یا حساب‌های حساس وارد
            نشوید. کانفیگ‌ها موقتی‌اند — اگر قطع شدند، کشور دیگری را امتحان کنید یا منتظر
            به‌روزرسانی بعدی بمانید.
          </AlertDescription>
        </Alert>

        {dataError && (
          <Alert className="border-dashed">
            <Info className="h-4 w-4" />
            <AlertDescription className="leading-6">
              داده‌های کانفیگ هنوز تولید نشده است. پس از اولین اجرای خودکار
              (&laquo;Update free V2Ray configs&raquo; در تب Actions مخزن) این بخش به‌صورت
              خودکار پر می‌شود.
            </AlertDescription>
          </Alert>
        )}

        {!data && !dataError && (
          <div className="flex flex-col items-center gap-3 py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">در حال دریافت فهرست کانفیگ‌ها…</span>
          </div>
        )}

        {data && (
          <>
            {/* خلاصه و زمان به‌روزرسانی */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary" className="gap-1">
                  <ListChecks className="h-3 w-3" />
                  {data.countries.length} کشور
                </Badge>
                <Badge variant="secondary" className="gap-1 border-emerald-400/40 text-emerald-700">
                  <BadgeCheck className="h-3 w-3" />
                  {verifiedTotal} تست‌شده با Xray
                </Badge>
              </div>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                به‌روزرسانی: {updatedAt}
              </span>
            </div>

            {/* اشتراک خودکار */}
            <div className="mb-5 rounded-md border border-dashed p-3">
              <p className="mb-2 text-xs font-semibold text-foreground">
                {country !== "all"
                  ? `اشتراک کشور انتخابی (خودکار به‌روزرسانی می‌شود):`
                  : "اشتراک کامل همه کشورها (خودکار به‌روزرسانی می‌شود):"}
              </p>
              <button
                type="button"
                dir="ltr"
                onClick={() => copyText(subUrl, "sub")}
                className="mb-2 flex w-full items-center justify-between gap-2 rounded-md border bg-muted/50 px-3 py-2 text-left font-mono text-xs transition-colors hover:bg-accent"
                aria-label="کپی آدرس اشتراک"
              >
                <span className="break-all">{subUrl}</span>
                {copied === "sub" ? (
                  <Check className="h-4 w-4 shrink-0 text-primary" />
                ) : (
                  <Copy className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </button>
              <div className="flex flex-wrap gap-2">
                <a
                  href={`v2rayng://install-sub?url=${encodeURIComponent(subUrl)}`}
                  className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-xs font-medium transition-colors hover:bg-accent"
                >
                  افزودن به V2RayNG
                </a>
                <a
                  href={`hiddify://import?url=${encodeURIComponent(subUrl)}`}
                  className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-xs font-medium transition-colors hover:bg-accent"
                >
                  افزودن به Hiddify
                </a>
              </div>
            </div>

            {/* فیلتر کشور */}
            <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="انتخاب کشور">
              <Button
                type="button"
                variant={country === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setCountry("all")}
                aria-pressed={country === "all"}
                className="h-9 gap-1.5"
              >
                همه کشورها
                <Badge
                  variant={country === "all" ? "secondary" : "outline"}
                  className="px-1.5 py-0 text-[10px] leading-4"
                >
                  {verifiedOnly ? verifiedTotal : data.configs.length}
                </Badge>
              </Button>
              {data.countries
                .filter((c) => !verifiedOnly || c.verifiedCount > 0)
                .map((c) => {
                  const shown = verifiedOnly ? c.verifiedCount : c.count;
                  return (
                    <Button
                      key={c.cc}
                      type="button"
                      variant={country === c.cc ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCountry(c.cc)}
                      aria-pressed={country === c.cc}
                      aria-label={`${c.name}، ${shown} کانفیگ`}
                      className="h-9 gap-1.5"
                    >
                      <span aria-hidden="true">{c.flag}</span>
                      <span>{c.name}</span>
                      <Badge
                        variant={country === c.cc ? "secondary" : "outline"}
                        className="px-1.5 py-0 text-[10px] leading-4"
                      >
                        {shown}
                      </Badge>
                    </Button>
                  );
                })}
            </div>

            {/* فیلتر پروتکل + مرتب‌سازی */}
            <div className="mb-4 flex flex-col gap-2 rounded-md border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="فیلتر پروتکل">
                <span className="ml-1 text-xs font-medium text-muted-foreground">پروتکل:</span>
                <Button
                  type="button"
                  variant={proto === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setProto("all")}
                  aria-pressed={proto === "all"}
                  className="h-8 gap-1 px-2.5 text-xs"
                >
                  همه
                </Button>
                {Object.entries(PROTO_LABEL).map(([key, label]) => {
                  const n = protocolCounts.get(key) || 0;
                  if (verifiedOnly && n === 0 && proto !== key) return null;
                  return (
                    <Button
                      key={key}
                      type="button"
                      variant={proto === key ? "default" : "outline"}
                      size="sm"
                      onClick={() => setProto(key)}
                      aria-pressed={proto === key}
                      className="h-8 gap-1 px-2.5 text-xs"
                    >
                      {label}
                      <Badge
                        variant={proto === key ? "secondary" : "outline"}
                        className="px-1 py-0 text-[10px] leading-3"
                      >
                        {n}
                      </Badge>
                    </Button>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                  <Switch
                    checked={verifiedOnly}
                    onCheckedChange={(v) => setVerifiedOnly(v === true)}
                    aria-label="نمایش فقط کانفیگ‌های تست‌شده"
                  />
                  فقط تست‌شده‌ها
                </label>
                <div className="flex items-center gap-1.5" dir="ltr">
                  <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger
                      className="h-8 w-[150px] text-xs"
                      aria-label="ترتیب نمایش کانفیگ‌ها"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ping">کم‌ترین پینگ</SelectItem>
                      <SelectItem value="speed">بیش‌ترین سرعت</SelectItem>
                      <SelectItem value="country">کشور، بعد پینگ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* فهرست کانفیگ‌ها */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">
                      {country === "all"
                        ? "همه کشورها"
                        : (() => {
                            const c = data.countries.find((x) => x.cc === country);
                            return `${c?.flag || ""} ${c?.name || country}`;
                          })()}
                      {proto !== "all" && (
                        <span className="text-muted-foreground">
                          {" "}
                          — {PROTO_LABEL[proto] || proto}
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {filtered.length} کانفیگ در این فهرست — روی دکمه کپی بزنید و در V2RayNG از
                      &laquo;Import config from clipboard&raquo; اضافه کنید
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copyText(filtered.map((c) => c.uri).join("\n"), "all")}
                    className="h-9 gap-1.5"
                    aria-label="کپی همه کانفیگ‌های فهرست"
                  >
                    {copied === "all" ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    کپی همه
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {filtered.length === 0 ? (
                  <Alert className="border-dashed">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      با این فیلترها کانفیگی یافت نشد — کشور یا پروتکل دیگری را امتحان کنید.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <ul
                    className="max-h-[560px] space-y-2 overflow-y-auto pr-1 [scrollbar-width:thin]"
                    aria-label="کانفیگ‌های تست‌شده"
                  >
                    {filtered.map((c, i) => {
                      const src = sourceMap.get(c.source);
                      const sec = secBadge(c.security);
                      const key = `${i}`;
                      return (
                        <li
                          key={`${c.host}:${c.port}:${i}`}
                          className="flex flex-col gap-2 rounded-md border bg-muted/50 px-3 py-2.5 transition-colors hover:bg-accent"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                              <Badge
                                variant="secondary"
                                className="shrink-0 px-1.5 py-0 text-[10px] leading-4"
                              >
                                {PROTO_LABEL[c.proto] || c.proto}
                              </Badge>
                              {sec && (
                                <Badge
                                  variant="outline"
                                  className="shrink-0 border-sky-400/40 px-1.5 py-0 text-[10px] leading-4 text-sky-700"
                                >
                                  {sec}
                                </Badge>
                              )}
                              {c.verified ? (
                                <Badge
                                  variant="outline"
                                  className="shrink-0 gap-1 border-emerald-400/50 px-1.5 py-0 text-[10px] leading-4 text-emerald-700"
                                >
                                  <Check className="h-2.5 w-2.5" />
                                  تست‌شده
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="shrink-0 border-dashed px-1.5 py-0 text-[10px] leading-4 text-muted-foreground"
                                >
                                  تست‌نشده
                                </Badge>
                              )}
                              <span
                                dir="ltr"
                                className="truncate font-mono text-xs text-muted-foreground"
                              >
                                {c.host}:{c.port}
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => copyText(c.uri, key)}
                              className="h-8 w-8 shrink-0 p-0"
                              aria-label={`کپی کانفیگ ${c.host}`}
                            >
                              {copied === key ? (
                                <Check className="h-4 w-4 text-primary" />
                              ) : (
                                <Copy className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                            <Badge
                              variant="outline"
                              className={`gap-1 px-1.5 py-0 text-[10px] leading-4 ${pingClass(c.ping)}`}
                              title="پینگ اندازه‌گیری‌شده از داخل تانل"
                            >
                              <Activity className="h-2.5 w-2.5" />
                              {c.ping === null ? "پینگ: —" : `${c.ping} ms`}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="gap-1 border-violet-400/40 bg-violet-50 px-1.5 py-0 text-[10px] leading-4 text-violet-700"
                              title="سرعت دانلود اندازه‌گیری‌شده از داخل تانل"
                            >
                              <Gauge className="h-2.5 w-2.5" />
                              {speedLabel(c.speed)}
                            </Badge>
                            {c.org && (
                              <span
                                dir="ltr"
                                className="max-w-[180px] truncate text-muted-foreground"
                                title={`سازنده سرور: ${c.org}`}
                              >
                                {c.org}
                              </span>
                            )}
                            {src && (
                              <a
                                href={src.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
                                title={`سورس این کانفیگ: ${src.name}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {src.name}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                            {c.name && (
                              <span
                                dir="ltr"
                                className="max-w-[220px] truncate text-foreground/70"
                                title={c.name}
                              >
                                {c.name}
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </section>
  );
}
