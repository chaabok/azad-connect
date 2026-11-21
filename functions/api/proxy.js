// ─────────────────────────────────────────────────────────────
// Cloudflare Pages Function — مسیر: /api/proxy
// منطق دقیقاً یکسان با src/app/api/proxy/route.ts (نسخه Next.js) است،
// اما روی شبکه لبه Cloudflare اجرا می‌شود تا نسخه رایگانِ هاست‌شده هم
// درگاه یک‌کلیکی داشته باشد.
// ─────────────────────────────────────────────────────────────

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const TIMEOUT_MS = 20000;

function decodeEnt(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function isForbiddenHost(host) {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h === "::1" || h === "0.0.0.0" || h === "") return true;
  if (h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (/^(127|10)\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  if (/^169\.254\./.test(h)) return true;
  return false;
}

function absolutize(raw, base) {
  const t = raw.trim().replace(/^["'<`\s]+/, "").replace(/["'`>\s]+$/, "").trim();
  if (!t) return null;
  if (/^(#|mailto:|tel:|sms:|data:|blob:|ftp:|ws:|wss:)/i.test(t)) return null;
  try {
    const u = new URL(decodeEnt(t), base);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (isForbiddenHost(u.hostname)) return null;
    return u.href;
  } catch {
    return null;
  }
}

function proxify(abs) {
  return `/api/proxy?url=${encodeURIComponent(abs)}`;
}

function rewriteCss(css, base) {
  return css
    .replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (m, q, u) => {
      const abs = absolutize(u, base);
      return abs ? `url("${proxify(abs)}")` : m;
    })
    .replace(/@import\s+(['"])([^'"]+)\1/gi, (m, q, u) => {
      const abs = absolutize(u, base);
      return abs ? `@import "${proxify(abs)}"` : m;
    });
}

function rewriteSrcset(val, base) {
  const parts = val
    .split(",")
    .map((p) => {
      const seg = p.trim().split(/\s+/);
      if (!seg[0]) return "";
      const abs = absolutize(seg[0], base);
      if (!abs) return p;
      const descriptor = seg.slice(1).join(" ");
      return proxify(abs) + (descriptor ? " " + descriptor : "");
    })
    .filter(Boolean);
  return parts.join(", ");
}

function rewriteHtml(html, base) {
  let out = html;

  // حذف اسکریپت‌ها، iframes، تگ base و متا رفرش/CSP
  out = out.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  out = out.replace(/<script\b[^>]*\/?>/gi, "");
  out = out.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "");
  out = out.replace(/<iframe\b[^>]*\/?>/gi, "");
  out = out.replace(/<base\b[^>]*\/?>/gi, "");
  out = out.replace(
    /<meta\s+[^>]*http-equiv=["']?(refresh|content-security-policy)["']?[^>]*>/gi,
    "",
  );
  out = out.replace(/<\/?noscript[^>]*>/gi, "");

  // حذف SRI که با محتوای بازنویسی‌شده ناسازگار می‌شود
  out = out.replace(/\s(integrity|crossorigin|nonce)=("[^"]*"|'[^']*')/gi, "");

  // بازنویسی href / src / action / poster
  out = out.replace(
    /\s(href|src|action|poster)\s*=\s*("([^"]*)"|'([^']*)')/gi,
    (m, attr, dq, sq) => {
      const raw = dq !== undefined ? dq : sq;
      if (raw === undefined) return m;
      const t = raw.trim();
      if (/^javascript:/i.test(t)) return ` ${attr}="#"`;
      const abs = absolutize(t, base);
      if (!abs) return m;
      return ` ${attr}="${proxify(abs)}"`;
    },
  );

  // بازنویسی srcset
  out = out.replace(/\ssrcset\s*=\s*("([^"]*)"|'([^']*)')/gi, (m, dq, sq) => {
    const raw = dq !== undefined ? dq : sq;
    if (raw === undefined) return m;
    return ` srcset="${rewriteSrcset(raw, base)}"`;
  });

  // بازنویسی url() داخل styleهای درون‌خطی
  out = out.replace(/\sstyle\s*=\s*("([^"]*)"|'([^']*)')/gi, (m, dq, sq) => {
    const raw = dq !== undefined ? dq : sq;
    if (raw === undefined) return m;
    const decoded = raw.replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&amp;/g, "&");
    const rewritten = decoded.replace(
      /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi,
      (mm, q, u) => {
        const abs = absolutize(u, base);
        return abs ? `url("${proxify(abs)}")` : mm;
      },
    );
    const reEncoded = rewritten.replace(/&(?=[a-zA-Z#])/, "&amp;").replace(/"/g, "&quot;");
    return ` style="${reEncoded}"`;
  });

  // بازنویسی url() و @import داخل بلوک‌های style
  out = out.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (m, attrs, css) => {
    return `<style${attrs}>${rewriteCss(css, base)}</style>`;
  });

  return out;
}

function errorPage(message) {
  const html = `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>خطای درگاه</title></head>
<body style="font-family:Tahoma,sans-serif;background:#fafafa;color:#333;display:flex;align-items:center;justify-content:center;min-height:80vh;">
<div style="text-align:center;max-width:420px;padding:2rem;">
<p style="font-size:1.1rem;font-weight:bold;margin-bottom:0.75rem;">باز کردن این سایت ممکن نشد</p>
<p style="font-size:0.9rem;line-height:1.9;color:#666;">${message}</p>
<p style="font-size:0.85rem;color:#999;margin-top:1rem;">سرور این سایت ممکن است موقتاً در دسترس نباشد؛ چند لحظه بعد دوباره تلاش کنید.</p>
</div></body></html>`;
  return new Response(html, {
    status: 502,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

async function handle(request, method) {
  const sp = new URL(request.url).searchParams;
  const rawUrl = sp.get("url");
  if (!rawUrl) return errorPage("آدرسی مشخص نشده است.");

  let target;
  try {
    target = new URL(decodeEnt(rawUrl));
  } catch {
    return errorPage("آدرس واردشده معتبر نیست.");
  }

  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return errorPage("فقط آدرس‌های http و https پشتیبانی می‌شوند.");
  }
  if (target.port !== "") {
    return errorPage("این آدرس مجاز نیست.");
  }
  if (isForbiddenHost(target.hostname)) {
    return errorPage("این آدرس مجاز نیست.");
  }

  // پارامترهای اضافه (مثلاً فرم‌های GET) به آدرس مقصد اضافه می‌شوند
  const rest = new URLSearchParams(sp);
  rest.delete("url");
  for (const [k, v] of rest) {
    target.searchParams.append(k, v);
  }

  try {
    const upstream = await fetch(target.href, {
      method,
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        "user-agent": UA,
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "accept-language": "fa,en;q=0.8",
      },
      body: method === "POST" ? await request.arrayBuffer() : undefined,
    });

    const ct = upstream.headers.get("content-type") ?? "";
    const base = upstream.url || target.href;

    if (ct.includes("text/html")) {
      const html = await upstream.text();
      return new Response(rewriteHtml(html, base), {
        status: upstream.status,
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
      });
    }

    if (ct.includes("text/css")) {
      const css = await upstream.text();
      return new Response(rewriteCss(css, base), {
        status: upstream.status,
        headers: { "content-type": "text/css; charset=utf-8", "cache-control": "no-store" },
      });
    }

    // بقیه محتوا (تصویر، فونت و ...) مستقیم عبور داده می‌شود
    if (!upstream.body) {
      return new Response(null, { status: upstream.status });
    }
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "content-type": ct || "application/octet-stream",
        "cache-control": "no-store",
      },
    });
  } catch {
    return errorPage("اتصال به سایت مقصد از سرور خارجی برقرار نشد.");
  }
}

export async function onRequestGet({ request }) {
  return handle(request, "GET");
}

export async function onRequestPost({ request }) {
  return handle(request, "POST");
}
