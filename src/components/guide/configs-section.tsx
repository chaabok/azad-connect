"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Copy,
  Check,
  Server,
  Info,
  Loader2,
  Clock,
  ShieldAlert,
  ListChecks,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

// در نسخه استاتیک (GitHub Pages) مسیر پایه زیرپوشه است
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

type CountryInfo = {
  cc: string;
  name: string;
  flag: string;
  count: number;
  verified: number;
  file: string;
};

type SubIndex = {
  generated: string;
  countries: CountryInfo[];
  cdn: CountryInfo | null;
};

type ParsedConfig = {
  uri: string;
  proto: string;
  host: string;
  port: string;
  name: string;
};

function b64d(s: string): string {
  try {
    let t = s.replace(/-/g, "+").replace(/_/g, "/").trim();
    while (t.length % 4) t += "=";
    return atob(t);
  } catch {
    return "";
  }
}

function decodeBase64Utf8(b64: string): string {
  const bin = b64d(b64);
  if (!bin) return "";
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function parseConfigLine(uri: string): ParsedConfig | null {
  const low = uri.slice(0, 8).toLowerCase();
  if (low.startsWith("vmess://")) {
    const json = b64d(uri.slice(8));
    try {
      const j = JSON.parse(json);
      return {
        uri,
        proto: "VMess",
        host: String(j.add ?? ""),
        port: String(j.port ?? ""),
        name: String(j.ps ?? ""),
      };
    } catch {
      return null;
    }
  }
  const m = uri.match(/^(vless|trojan):\/\/[^@]+@([^:/#]+):(\d+)(?:\?([^#]*))?(?:#(.*))?$/i);
  if (m) {
    const q: Record<string, string> = {};
    if (m[4])
      for (const kv of m[4].split("&")) {
        const i = kv.indexOf("=");
        if (i > 0) q[kv.slice(0, i)] = safeDecode(kv.slice(i + 1));
      }
    const proto =
      m[1].toLowerCase() === "vless"
        ? q.security === "reality"
          ? "VLESS-Reality"
          : q.security === "tls"
            ? "VLESS-TLS"
            : "VLESS"
        : "Trojan";
    return { uri, proto, host: m[2], port: m[3], name: safeDecode(m[5] || "") };
  }
  if (low.startsWith("ss://")) {
    const m1 = uri.match(/^ss:\/\/([^@#]+)@([^:]+):(\d+)(?:\?[^#]*)?#(.*)$/);
    if (m1)
      return { uri, proto: "Shadowsocks", host: m1[2], port: m1[3], name: safeDecode(m1[4] || "") };
    const m2 = uri.match(/^ss:\/\/([^#]+?)(?:#(.*))?$/);
    if (m2) {
      const dec = b64d(m2[1]);
      const mm = dec.match(/@([^:]+):(\d+)$/);
      if (mm)
        return { uri, proto: "Shadowsocks", host: mm[1], port: mm[2], name: safeDecode(m2[2] || "") };
    }
  }
  return null;
}

export function ConfigsSection() {
  const [index, setIndex] = useState<SubIndex | null>(null);
  const [indexError, setIndexError] = useState(false);
  const [selected, setSelected] = useState<CountryInfo | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [configs, setConfigs] = useState<ParsedConfig[]>([]);
  const [fileError, setFileError] = useState(false);
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
    fetch(`${BASE_PATH}/sub/index.json`, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((data: SubIndex) => {
        if (alive) setIndex(data);
      })
      .catch(() => {
        if (alive) setIndexError(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const selectCountry = useCallback((c: CountryInfo) => {
    setSelected(c);
    setConfigs([]);
    setFileError(false);
    setLoadingFile(true);
    fetch(`${BASE_PATH}/sub/${c.file}`, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.text();
      })
      .then((txt) => {
        const decoded = decodeBase64Utf8(txt);
        const list = decoded
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean)
          .map(parseConfigLine)
          .filter((x): x is ParsedConfig => x !== null);
        setConfigs(list);
        if (list.length === 0) setFileError(true);
      })
      .catch(() => setFileError(true))
      .finally(() => setLoadingFile(false));
  }, []);

  const subscriptionUrl = selected
    ? `${typeof window !== "undefined" ? window.location.origin : ""}${BASE_PATH}/sub/${selected.file}`
    : "";

  const updatedAt = index
    ? new Date(index.generated).toLocaleString("fa-IR", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "";

  return (
    <section id="configs" className="scroll-mt-24 py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="mb-8 text-center">
          <Badge variant="outline" className="mb-3 gap-1.5 border-primary/40 bg-primary/5 text-primary">
            <Server className="h-3.5 w-3.5" />
            بدون نیاز به جست‌وجو — آماده اتصال
          </Badge>
          <h2 className="text-2xl font-bold sm:text-3xl">کانفیگ‌های رایگان V2Ray</h2>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            کانفیگ‌های عمومی رایگان از منابع معروف، به‌صورت خودکار هر ۶ ساعت جمع‌آوری و با هسته
            Xray تست می‌شوند؛ کشور خروجی هر سرور مشخص است.
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

        {indexError && (
          <Alert className="border-dashed">
            <Info className="h-4 w-4" />
            <AlertDescription className="leading-6">
              داده‌های کانفیگ هنوز تولید نشده است. پس از اولین اجرای خودکار
              (&laquo;Update free V2Ray configs&raquo; در تب Actions مخزن) این بخش به‌صورت
              خودکار پر می‌شود.
            </AlertDescription>
          </Alert>
        )}

        {!index && !indexError && (
          <div className="flex flex-wrap justify-center gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-9 w-28 animate-pulse rounded-md bg-muted"
                aria-hidden="true"
              />
            ))}
            <span className="sr-only">در حال بارگذاری فهرست کشورها</span>
          </div>
        )}

        {index && (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary" className="gap-1">
                  <ListChecks className="h-3 w-3" />
                  {index.countries.length} کشور
                </Badge>
                {index.cdn && (
                  <Badge variant="secondary" className="gap-1">
                    {index.cdn.flag} {index.cdn.count} کانفیگ CDN
                  </Badge>
                )}
              </div>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                به‌روزرسانی: {updatedAt}
              </span>
            </div>

            <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="انتخاب کشور">
              {index.countries.map((c) => (
                <Button
                  key={c.cc}
                  type="button"
                  variant={selected?.cc === c.cc ? "default" : "outline"}
                  size="sm"
                  onClick={() => selectCountry(c)}
                  aria-pressed={selected?.cc === c.cc}
                  aria-label={`${c.name}، ${c.count} کانفیگ`}
                  className="h-9 gap-1.5"
                >
                  <span aria-hidden="true">{c.flag}</span>
                  <span>{c.name}</span>
                  <Badge
                    variant={selected?.cc === c.cc ? "secondary" : "outline"}
                    className="px-1.5 py-0 text-[10px] leading-4"
                  >
                    {c.count}
                  </Badge>
                  {c.verified > 0 && (
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                      title="تست‌شده با Xray"
                      aria-label="تست‌شده"
                    />
                  )}
                </Button>
              ))}
              {index.cdn && (
                <Button
                  type="button"
                  variant={selected?.cc === "CDN" ? "default" : "outline"}
                  size="sm"
                  onClick={() => selectCountry({ ...index.cdn!, cc: "CDN" })}
                  aria-pressed={selected?.cc === "CDN"}
                  className="h-9 gap-1.5"
                >
                  <span aria-hidden="true">{index.cdn.flag}</span>
                  <span>{index.cdn.name}</span>
                  <Badge
                    variant={selected?.cc === "CDN" ? "secondary" : "outline"}
                    className="px-1.5 py-0 text-[10px] leading-4"
                  >
                    {index.cdn.count}
                  </Badge>
                </Button>
              )}
            </div>
          </>
        )}

        {selected && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span aria-hidden="true">{selected.flag}</span>
                    <span>{selected.name}</span>
                    {selected.verified > 0 && (
                      <Badge variant="outline" className="gap-1 border-emerald-400/50 text-emerald-600">
                        <Check className="h-3 w-3" />
                        {selected.verified} تست‌شده با Xray
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    روی دکمه کپی هر کانفیگ بزنید و در V2RayNG از
                    &laquo;Import config from clipboard&raquo; اضافه کنید
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copyText(configs.map((c) => c.uri).join("\n"), "all")}
                    className="h-9 gap-1.5"
                    aria-label="کپی همه کانفیگ‌ها"
                  >
                    {copied === "all" ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    کپی همه
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => selectCountry(selected)}
                    className="h-9 gap-1.5"
                    aria-label="بارگذاری دوباره"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {loadingFile && (
                <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">در حال دریافت کانفیگ‌ها…</span>
                </div>
              )}

              {fileError && !loadingFile && (
                <Alert className="border-dashed">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    کانفیگی برای این کشور یافت نشد — کشور دیگری را انتخاب کنید.
                  </AlertDescription>
                </Alert>
              )}

              {!loadingFile && configs.length > 0 && (
                <>
                  <ul
                    className="max-h-96 space-y-2 overflow-y-auto pr-1 [scrollbar-width:thin]"
                    aria-label={`کانفیگ‌های ${selected.name}`}
                  >
                    {configs.map((c, i) => (
                      <li
                        key={`${c.host}:${c.port}:${i}`}
                        className="flex items-center justify-between gap-3 rounded-md border bg-muted/50 px-3 py-2.5 transition-colors hover:bg-accent"
                      >
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-[10px] leading-4">
                              {c.proto}
                            </Badge>
                            <span
                              dir="ltr"
                              className="truncate font-mono text-xs text-muted-foreground"
                            >
                              {c.host}:{c.port}
                            </span>
                          </div>
                          {c.name && (
                            <span dir="ltr" className="truncate text-xs text-foreground/80">
                              {c.name}
                            </span>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => copyText(c.uri, `${i}`)}
                          className="h-8 w-8 shrink-0 p-0"
                          aria-label={`کپی کانفیگ ${c.host}`}
                        >
                          {copied === `${i}` ? (
                            <Check className="h-4 w-4 text-primary" />
                          ) : (
                            <Copy className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </li>
                    ))}
                  </ul>

                  <div className="rounded-md border border-dashed p-3">
                    <p className="mb-2 text-xs font-semibold text-foreground">
                      افزودن به‌صورت اشتراک (خودکار به‌روزرسانی می‌شود):
                    </p>
                    <button
                      type="button"
                      dir="ltr"
                      onClick={() => copyText(subscriptionUrl, "sub")}
                      className="mb-2 flex w-full items-center justify-between gap-2 rounded-md border bg-muted/50 px-3 py-2 text-left font-mono text-xs transition-colors hover:bg-accent"
                      aria-label="کپی آدرس اشتراک"
                    >
                      <span className="break-all">{subscriptionUrl}</span>
                      {copied === "sub" ? (
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                      ) : (
                        <Copy className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                    </button>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`v2rayng://install-sub?url=${encodeURIComponent(subscriptionUrl)}`}
                        className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-xs font-medium transition-colors hover:bg-accent"
                      >
                        افزودن به V2RayNG
                      </a>
                      <a
                        href={`hiddify://import?url=${encodeURIComponent(subscriptionUrl)}`}
                        className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-xs font-medium transition-colors hover:bg-accent"
                      >
                        افزودن به Hiddify
                      </a>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
