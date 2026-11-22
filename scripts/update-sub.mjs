/**
 * update-sub.mjs — جمع‌آوری، فیلتر و تست کانفیگ‌های رایگان V2Ray
 *
 * - از چند منبع عمومی معروف کانفیگ می‌گیرد (هر کانفیگ به سورس خودش لینک می‌خورد)
 * - کشور خروجی هر سرور را با geo-ip (و در صورت نبود، برچسب متنی) تشخیص می‌دهد
 * - کانفیگ‌های مرده را با تست TCP حذف می‌کند
 * - اگر هسته Xray در دسترس باشد، کانفیگ‌ها را واقعاً اجرا و کشور خروجی را تأیید می‌کند
 * - برای هر کانفیگ تأییدشده: پینگ (ms) و سرعت دانلود (Mbps) از داخل تانل اندازه‌گیری می‌شود
 * - خروجی‌ها:
 *     public/sub/<cc>.txt (base64) + public/sub/all.txt + public/sub/index.json   (اشتراک V2RayNG)
 *     public/configs/latest.json                                                  (لیست غنی برای رابط کاربری)
 *
 * اجرا: node scripts/update-sub.mjs   (یا bun)
 * متغیرها: XRAY_BIN=/path/to/xray  SKIP_VERIFY=1  SKIP_GEO=1  SKIP_TCP=1  VERIFY_PER_COUNTRY=10
 */

import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import { Resolver } from "node:dns/promises";
import { execFile, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "public", "sub");
const RICH_DIR = path.join(ROOT, "public", "configs");
const TMP_DIR = fs.mkdtempSync("/tmp/vsub-");
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(RICH_DIR, { recursive: true });

// ---------- تنظیمات ----------
const SOURCES = [
  {
    key: "barryfar",
    name: "barry-far/V2ray-Config",
    url: "https://github.com/barry-far/V2ray-Config",
    raws: ["https://raw.githubusercontent.com/barry-far/V2ray-Config/main/All_Configs_Sub.txt"],
  },
  {
    key: "mahdibland",
    name: "mahdibland/V2RayAggregator",
    url: "https://github.com/mahdibland/V2RayAggregator",
    raws: [
      "https://raw.githubusercontent.com/mahdibland/V2RayAggregator/master/sub/sub_merge.txt",
      "https://raw.githubusercontent.com/mahdibland/V2RayAggregator/master/sub/sub_merge_base64.txt",
    ],
  },
  {
    key: "aliilapro",
    name: "ALIILAPRO/v2rayNG-Config",
    url: "https://github.com/ALIILAPRO/v2rayNG-Config",
    raws: ["https://raw.githubusercontent.com/ALIILAPRO/v2rayNG-Config/main/server.txt"],
  },
  {
    key: "nowalls",
    name: "peasoft/NoMoreWalls",
    url: "https://github.com/peasoft/NoMoreWalls",
    raws: ["https://raw.githubusercontent.com/peasoft/NoMoreWalls/master/list.txt"],
  },
  {
    key: "freefq",
    name: "freefq/free",
    url: "https://github.com/freefq/free",
    raws: ["https://raw.githubusercontent.com/freefq/free/master/v2"],
  },
  // ---------- منابع باکیفیت‌تر (تست سلامت/دسترس‌پذیری داخلی دارند) ----------
  {
    key: "ermaozi",
    name: "ermaozi/get_subscribe",
    url: "https://github.com/ermaozi/get_subscribe",
    raws: ["https://raw.githubusercontent.com/ermaozi/get_subscribe/main/subscribe/v2ray.txt"],
  },
  {
    key: "proxypool",
    name: "snakem982/proxypool",
    url: "https://github.com/snakem982/proxypool",
    raws: ["https://raw.githubusercontent.com/snakem982/proxypool/main/source/v2ray-2.txt"],
  },
  {
    key: "matin",
    name: "MatinGhanbari/v2ray-configs",
    url: "https://github.com/MatinGhanbari/v2ray-configs",
    raws: ["https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/main/subscriptions/v2ray/all_sub.txt"],
  },
  {
    key: "aiboboxx",
    name: "aiboboxx/v2rayfree",
    url: "https://github.com/aiboboxx/v2rayfree",
    raws: ["https://raw.githubusercontent.com/aiboboxx/v2rayfree/main/v{today}"],
  },
];
const EXCLUDED_CC = new Set(["IR", "CN", "KP", "SY"]);
const CDN_ORG_RE = /cloudflare|akamai|fastly|ddos-guard|gcore|cloudfront/i;
const PREF_PORTS = new Set([443, 8443, 2053, 2083, 2087, 2096, 5228, 2052, 2082, 2086, 8880]);
const MAX_HOSTS_RESOLVE = 1500;
const MAX_GEO_IPS = 2500;
const IP_LIT_RE = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
const SKIP_GEO = process.env.SKIP_GEO === "1";
const SKIP_TCP = process.env.SKIP_TCP === "1";
const VERIFY_PER_COUNTRY = parseInt(process.env.VERIFY_PER_COUNTRY || "10", 10);
const PARALLEL_XRAY = 8;
const XRAY_BASE_PORT = 17000;
const VERIFY_KEEP = 12;  // حداکثر کانفیگ تأییدشده در خروجی غنی هر کشور
const RICH_BACKUP = 6;   // حداکثر کانفیگ «پشتیبانِ» تست‌نشده در خروجی غنی هر کشور
const UNVERIF_FILL = 6;  // حداکثر پشتیبان تست‌نشده در فایل اشتراک هر کشور (اگر تأییدشده کم بود)
const QUALITY_SRC = new Set(["ermaozi", "proxypool", "matin", "aiboboxx"]); // منابع با تست سلامت داخلی
const FILE_CAP = 30;
const ALL_CAP = 400;
const SPEED_TEST_BYTES = 25 * 1024 * 1024; // 25MB برای رتبه‌بندی درست سرعت
const SPEED_TEST_SECONDS = 10;

// نام فارسی کشورها + ترتیب اولویت (نزدیک به ایران اول)
const COUNTRY_ORDER = [
  "TR", "AE", "GE", "AM", "AZ", "DE", "NL", "FI", "SE", "GB", "FR", "CH", "AT",
  "CZ", "PL", "UA", "IT", "ES", "RO", "BG", "MD", "HU", "DK", "NO", "IE", "EE",
  "LV", "LT", "US", "CA", "JP", "SG", "HK", "KR", "AU", "BR", "IN", "AR", "MX",
  "ZA", "SA", "QA", "KW", "OM", "IQ",
];
const CC_FA = {
  TR: "ترکیه", AE: "امارات", GE: "گرجستان", AM: "ارمنستان", AZ: "آذربایجان",
  DE: "آلمان", NL: "هلند", FI: "فنلاند", SE: "سوئد", GB: "بریتانیا", FR: "فرانسه",
  CH: "سوئیس", AT: "اتریش", CZ: "چک", PL: "لهستان", UA: "اوکراین", IT: "ایتالیا",
  ES: "اسپانیا", RO: "رومانی", BG: "بلغارستان", MD: "مولداوی", HU: "مجارستان",
  DK: "دانمارک", NO: "نروژ", IE: "ایرلند", EE: "استونی", LV: "لتونی",
  LT: "لیتوانی", US: "آمریکا", CA: "کانادا", JP: "ژاپن", SG: "سنگاپور",
  HK: "هنگ‌کنگ", KR: "کره جنوبی", AU: "استرالیا", BR: "برزیل", IN: "هند",
  AR: "آرژانتین", MX: "مکزیک", ZA: "آفریقای جنوبی", SA: "عربستان",
  QA: "قطر", KW: "کویت", OM: "عمان", IQ: "عراق",
  AL: "آلبانی", BZ: "بلیز", CY: "قبرس", VN: "ویتنام", KZ: "قزاقستان",
  KG: "قرقیزستان", UZ: "ازبکستان", MN: "مغولستان", BE: "بلژیک", TH: "تایلند",
  LU: "لوکزامبورگ", PA: "پاناما", PH: "فیلیپین", IM: "جزیره من", VG: "جزایر ویرجین",
  SC: "سیشل", BY: "بلاروس", RS: "صربستان", SI: "اسلوونی", SK: "اسلواکی",
  HR: "کرواسی", GR: "یونان", PT: "پرتغال", IL: "اسرائیل", TN: "تونس",
  MA: "مراکش", EG: "مصر", NG: "نیجریه", KE: "کنیا", CL: "شیلی",
  CO: "کلمبیا", PE: "پرو", EC: "اکوادور", MY: "مالزی", ID: "اندونزی",
  TW: "تایوان", MO: "ماکائو", PK: "پاکستان", BD: "بنگلادش", LK: "سری‌لانکا",
  NP: "نپال", AF: "افغانستان", TJ: "تاجیکستان", TM: "ترکمنستان",
};

// برچسب‌های متنی برای حالتی که geo در دسترس نیست
const REMARK_CC = {
  de: "de|germany|german|frankfurt|berlin|dusseldorf|düsseldorf|münchen|munich|آلمان|فرانکفورت",
  tr: "tr|turkey|turkish|türkiye|istanbul|ankara|ترکیه|استانبول|استنبول",
  nl: "nl|netherlands|dutch|amsterdam|هلند|آمستردام",
  gb: "gb|uk|united kingdom|britain|england|london|انگلیس|بریتانیا|لندن",
  us: "us|usa|united states|america|آمریکا|امریکا",
  fi: "fi|finland|فنلاند",
  se: "se|sweden|سوئد",
  ch: "ch|swiss|switzerland|سوئیس",
  at: "at|austria|اتریش",
  fr: "fr|france|فرانسه",
  ca: "ca|canada|کانادا",
  ae: "ae|dubai|emirates|u\.a\.e|امارات|دبی",
  jp: "jp|japan|ژاپن",
  sg: "sg|singapore|سنگاپور",
  au: "au|australia|استرالیا",
  ru: "ru|russia|روسیه",
  ua: "ua|ukraine|اوکراین",
  pl: "pl|poland|لهستان",
  no: "no|norway|نروژ",
  dk: "dk|denmark|دانمارک",
  cz: "cz|czech|چک",
  ro: "ro|romania|رومانی",
  bg: "bg|bulgaria|بلغارستان",
  ge: "ge|georgia|گرجستان",
  am: "am|armenia|ارمنستان",
  md: "md|moldova|مولداوی",
  ie: "ie|ireland|ایرلند",
  hk: "hk|hong ?kong|هنگ‌کنگ|هنگکنگ",
  kr: "kr|korea|کره",
  in: "in|india|هند",
  br: "br|brazil|برزیل",
  it: "it|italy|ایتالیا",
  es: "es|spain|اسپانیا",
  hu: "hu|hungary|مجارستان",
};
const REMARK_RE = Object.fromEntries(
  Object.entries(REMARK_CC).map(([cc, kws]) => [
    cc.toUpperCase(),
    new RegExp(`(^|[^a-zA-Z])(${kws})($|[^a-zA-Z])`, "i"),
  ])
);

function ccFlag(cc) {
  try {
    return String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
  } catch {
    return "🏳";
  }
}

function b64d(s) {
  try {
    let t = s.replace(/-/g, "+").replace(/_/g, "/").trim();
    while (t.length % 4) t += "=";
    const buf = Buffer.from(t, "base64");
    if (buf.length === 0) return "";
    const str = buf.toString("utf8");
    return /^[\x20-\x7e\s]/.test(str.slice(0, 8)) ? str : "";
  } catch {
    return "";
  }
}
function safeDecode(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

// ---------- پارس URI ----------
function parseVmess(uri) {
  const json = b64d(uri.slice(8));
  if (!json) return null;
  try {
    const j = JSON.parse(json);
    if (!j.add || !j.port) return null;
    return {
      raw: uri,
      proto: "vmess",
      host: String(j.add),
      port: Number(j.port),
      name: String(j.ps || ""),
      net: String(j.net || "tcp"),
      security: String(j.tls) === "tls" ? "tls" : "none",
    };
  } catch {
    return null;
  }
}

function parseUserinfo(uri, proto) {
  const m = uri.match(
    new RegExp("^" + proto + "://[^@]+@([^:/#]+):(\\d+)(?:/[^?]*)?(?:\\?([^#]*))?(?:#(.*))?$")
  );
  if (!m) return null;
  const q = {};
  if (m[3])
    for (const kv of m[3].split("&")) {
      const i = kv.indexOf("=");
      if (i > 0) q[kv.slice(0, i)] = safeDecode(kv.slice(i + 1));
    }
  return {
    raw: uri,
    proto,
    host: m[1],
    port: Number(m[2]),
    name: safeDecode(m[4] || ""),
    net: q.type || q.network || "tcp",
    security: q.security || (q.tls === "1" ? "tls" : "none"),
  };
}

function parseSs(uri) {
  let m = uri.match(/^ss:\/\/([^@#]+)@([^:]+):(\d+)(?:\?[^#]*)?#(.*)$/);
  if (m)
    return {
      raw: uri,
      proto: "ss",
      host: m[2],
      port: Number(m[3]),
      name: safeDecode(m[4] || ""),
      net: "tcp",
      security: "none",
    };
  m = uri.match(/^ss:\/\/([^#]+?)(?:#(.*))?$/);
  if (m) {
    const dec = b64d(m[1]);
    const mm = dec.match(/@([^:]+):(\d+)$/);
    if (!mm) return null;
    return {
      raw: uri,
      proto: "ss",
      host: mm[1],
      port: Number(mm[2]),
      name: safeDecode(m[2] || ""),
      net: "tcp",
      security: "none",
    };
  }
  return null;
}

function remarkToCc(name) {
  if (name.includes("🇩🇪")) return "DE";
  for (const [cc, re] of Object.entries(REMARK_RE)) if (re.test(name)) return cc;
  return null;
}

// ---------- مرحله ۱: دریافت منابع ----------
async function fetchSources() {
  const texts = []; // {key, text}
  await Promise.all(
    SOURCES.map(async (src) => {
      for (const rawUrl of src.raws) {
        // {today} = تاریخ روز به شکل YYYYMMDD (برای فایل‌های روزانه مثل aiboboxx)
        const url = rawUrl.replaceAll("{today}", new Date().toISOString().slice(0, 10).replaceAll("-", ""));
        try {
          const res = await fetch(url, { signal: AbortSignal.timeout(40000) });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const text = await res.text();
          if (text.length > 300) texts.push({ key: src.key, text });
          console.log(`source ok: ${src.key} <- ${url.split("/").slice(3).join("/")} (${text.length} B)`);
        } catch (e) {
          console.log(`source FAIL: ${src.key} ${url} -> ${e.message}`);
        }
      }
    })
  );
  if (texts.length === 0) throw new Error("هیچ منبعی در دسترس نبود");
  return texts;
}

const URI_RE = /^(vmess|vless|trojan|ss):\/\//i;
function extractUris(text, uriSrc, key) {
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    if (URI_RE.test(t)) {
      if (!uriSrc.has(t)) uriSrc.set(t, key);
      continue;
    }
    const dec = b64d(t);
    if (dec && URI_RE.test(dec.trim()) && !uriSrc.has(dec.trim())) uriSrc.set(dec.trim(), key);
  }
}

function parseAll(uriSrc) {
  const cands = [];
  const seen = new Set();
  for (const [uri, key] of uriSrc) {
    const low = uri.slice(0, 8).toLowerCase();
    let c = null;
    if (low.startsWith("vmess://")) c = parseVmess(uri);
    else if (low.startsWith("vless://")) c = parseUserinfo(uri, "vless");
    else if (low.startsWith("trojan://")) c = parseUserinfo(uri, "trojan");
    else if (low.startsWith("ss://")) c = parseSs(uri);
    if (!c || !c.host || !c.port || c.port > 65535) continue;
    const key0 = `${c.proto}|${c.host.toLowerCase()}|${c.port}`;
    if (seen.has(key0)) continue;
    seen.add(key0);
    c.src = key;
    cands.push(c);
  }
  return cands;
}

// ---------- مرحله ۲: DNS + geo ----------
async function resolveHosts(cands) {
  const resolver = new Resolver();
  const ipToHosts = new Map();
  // IPهای خام مستقیماً وارد استخر geo می‌شوند (بدون DNS)
  for (const c of cands) {
    if (IP_LIT_RE.test(c.host)) {
      const k = c.host.toLowerCase();
      if (!ipToHosts.has(k)) ipToHosts.set(k, [k]);
    }
  }
  const remarkFirst = cands.filter((c) => remarkToCc(c.name));
  const others = cands.filter((c) => !remarkToCc(c.name));
  const hosts = [];
  const seen = new Set();
  for (const c of [...remarkFirst, ...others]) {
    if (IP_LIT_RE.test(c.host)) continue;
    const k = c.host.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    hosts.push(c.host);
    if (hosts.length >= MAX_HOSTS_RESOLVE) break;
  }
  let idx = 0;
  const CONC = 60;
  const worker = async () => {
    while (idx < hosts.length) {
      const host = hosts[idx++];
      try {
        // نکته: با {ttl:...} برخی ران‌تایم‌ها آبجکت {address,ttl} می‌دهند — نرمال می‌کنیم
        const addrs = await resolver.resolve4(host, { ttl: 300 });
        const ips = addrs
          .map((a) => (typeof a === "string" ? a : a && a.address))
          .filter(Boolean)
          .slice(0, 3);
        for (const a of ips) {
          if (!ipToHosts.has(a)) ipToHosts.set(a, []);
          ipToHosts.get(a).push(host.toLowerCase());
        }
      } catch {
        /* رزول نشد */
      }
    }
  };
  await Promise.all(Array.from({ length: CONC }, worker));
  return ipToHosts;
}

async function geoBatch(ipToHosts) {
  const ipList = [...ipToHosts.keys()].slice(0, MAX_GEO_IPS);
  const geo = new Map();
  let healthy = true;
  // از curl استفاده می‌کنیم چون fetch در برخی محیط‌ها (مانند bun در sandbox) معلق می‌شود
  const curlBatch = (body) => {
    try {
      const out = execFileSync(
        "curl",
        [
          "-sS", "--max-time", "20", "-X", "POST",
          "-H", "Content-Type: application/json",
          "-d", body,
          "http://ip-api.com/batch?fields=countryCode,org,query",
        ],
        { timeout: 25000, maxBuffer: 10 * 1024 * 1024 }
      );
      return JSON.parse(out.toString());
    } catch {
      return null;
    }
  };
  for (let i = 0; i < ipList.length && healthy; i += 100) {
    const chunk = ipList.slice(i, i + 100);
    let ok = false;
    for (let attempt = 0; attempt < 2 && !ok; attempt++) {
      const arr = curlBatch(JSON.stringify(chunk));
      if (Array.isArray(arr)) {
        for (const r of arr)
          if (r && r.query)
            geo.set(r.query, { cc: r.countryCode || "", org: r.org || r.isp || "" });
        ok = true;
      } else {
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
    if (!ok) {
      if (geo.size === 0) healthy = false; // geo کلا در دسترس نیست
      break;
    }
    await new Promise((r) => setTimeout(r, 4300));
  }
  return { geo, healthy };
}

// ---------- مرحله ۳: تست TCP ----------
async function tcpAlive(cands) {
  const alive = [];
  let idx = 0;
  const CONC = 100;
  const TCP_TIMEOUT = 2000;
  const tcpCheck = (host, port) =>
    new Promise((resolve) => {
      let settled = false;
      let s;
      const done = (ok) => {
        if (settled) return;
        settled = true;
        try {
          s.destroy();
        } catch {}
        resolve(ok);
      };
      try {
        s = net.connect({ host, port });
      } catch {
        return resolve(false);
      }
      s.setTimeout(TCP_TIMEOUT, () => done(false));
      s.once("connect", () => done(true));
      s.once("error", () => done(false));
    });
  const total = cands.length;
  let doneCount = 0;
  const worker = async () => {
    while (idx < cands.length) {
      const c = cands[idx++];
      if (await tcpCheck(c.host, c.port)) alive.push(c);
      doneCount++;
      if (doneCount % 500 === 0) console.log(`tcp progress: ${doneCount}/${total} (alive=${alive.length})`);
    }
  };
  await Promise.all(Array.from({ length: CONC }, worker));
  return alive;
}

// ---------- ساخت outbound برای Xray ----------
function streamFromVmess(j, host) {
  const netMap = { raw: "tcp", splithttp: "xhttp", h2: "http" };
  const network = netMap[String(j.net || "tcp").toLowerCase()] || String(j.net || "tcp").toLowerCase();
  const s = { network, security: String(j.tls) === "tls" ? "tls" : "none" };
  if (s.security === "tls")
    s.tlsSettings = { serverName: String(j.sni || j.host || host), fingerprint: "chrome" };
  const p = String(j.path || "/");
  const h = String(j.host || "");
  if (network === "ws") s.wsSettings = { path: p, headers: h ? { Host: h } : undefined };
  else if (network === "grpc") s.grpcSettings = { serviceName: p.replace(/^\//, "") || "grpc" };
  else if (network === "httpupgrade") s.httpupgradeSettings = { path: p, host: h || host };
  else if (network === "xhttp") s.xhttpSettings = { path: p, host: h || host, mode: "auto" };
  else if (network === "http") s.httpSettings = { path: p, host: h ? [h] : undefined };
  else if (network === "tcp" && String(j.type) === "http")
    s.tcpSettings = {
      header: {
        type: "request",
        request: {
          version: "1.1",
          method: "GET",
          path: [p],
          headers: { Host: [h || host], "User-Agent": ["Mozilla/5.0"] },
        },
      },
    };
  return s;
}

function streamFromQuery(q, host, defaultTls) {
  const netMap = { raw: "tcp", splithttp: "xhttp" };
  const network = netMap[String(q.type || "tcp").toLowerCase()] || String(q.type || "tcp").toLowerCase();
  const sec = q.security || (defaultTls ? "tls" : "none");
  const s = { network, security: sec };
  if (sec === "tls")
    s.tlsSettings = { serverName: q.sni || q.host || q.peer || host, fingerprint: q.fp || "chrome" };
  else if (sec === "reality")
    s.realitySettings = {
      serverName: q.sni || host,
      publicKey: q.pbk || "",
      shortId: q.sid || "",
      fingerprint: q.fp || "chrome",
    };
  const p = safeDecode(q.path || "/");
  const h = q.host || "";
  if (network === "ws") s.wsSettings = { path: p, headers: h ? { Host: h } : undefined };
  else if (network === "grpc") s.grpcSettings = { serviceName: (q.serviceName || "").replace(/^\//, "") || "grpc" };
  else if (network === "httpupgrade") s.httpupgradeSettings = { path: p, host: h || host };
  else if (network === "xhttp") s.xhttpSettings = { path: p, host: h || host, mode: "auto" };
  else if (network === "http") s.httpSettings = { path: p, host: h ? [h] : undefined };
  else if (network === "tcp" && q.headerType === "http")
    s.tcpSettings = {
      header: { type: "request", request: { version: "1.1", method: "GET", path: [p], headers: { Host: [h || host] } } },
    };
  return s;
}

function buildOutbound(c) {
  const low = c.raw.slice(0, 8).toLowerCase();
  if (low.startsWith("vmess://")) {
    const j = JSON.parse(b64d(c.raw.slice(8)));
    return {
      protocol: "vmess",
      settings: {
        vnext: [{ address: c.host, port: c.port, users: [{ id: String(j.id), security: String(j.scy || "auto"), level: 0 }] }],
      },
      streamSettings: streamFromVmess(j, c.host),
    };
  }
  if (low.startsWith("vless://")) {
    const m = c.raw.match(/^vless:\/\/([^@]+)@([^:/#]+):(\d+)(?:\?([^#]*))?(?:#(.*))?$/);
    if (!m) return null;
    const q = {};
    if (m[4])
      for (const kv of m[4].split("&")) {
        const i = kv.indexOf("=");
        if (i > 0) q[kv.slice(0, i)] = safeDecode(kv.slice(i + 1));
      }
    return {
      protocol: "vless",
      settings: { vnext: [{ address: c.host, port: c.port, users: [{ id: m[1], encryption: "none", flow: q.flow || "", level: 0 }] }] },
      streamSettings: streamFromQuery(q, c.host, false),
    };
  }
  if (low.startsWith("trojan://")) {
    const m = c.raw.match(/^trojan:\/\/([^@]+)@([^:/#]+):(\d+)(?:\?([^#]*))?(?:#(.*))?$/);
    if (!m) return null;
    const q = {};
    if (m[4])
      for (const kv of m[4].split("&")) {
        const i = kv.indexOf("=");
        if (i > 0) q[kv.slice(0, i)] = safeDecode(kv.slice(i + 1));
      }
    return {
      protocol: "trojan",
      settings: { servers: [{ address: c.host, port: c.port, password: safeDecode(m[1]) }] },
      streamSettings: streamFromQuery(q, c.host, q.security !== "none"),
    };
  }
  if (low.startsWith("ss://")) {
    let userinfo = "";
    const m1 = c.raw.match(/^ss:\/\/([^@#]+)@/);
    if (m1) userinfo = b64d(m1[1]);
    else {
      const m2 = c.raw.match(/^ss:\/\/([^#]+)/);
      const dec = b64d(m2 ? m2[1] : "");
      const mi = dec.indexOf("@");
      userinfo = mi > 0 ? dec.slice(0, mi) : "";
    }
    const ci = userinfo.indexOf(":");
    if (ci < 0) return null;
    return {
      protocol: "shadowsocks",
      settings: {
        servers: [{ address: c.host, port: c.port, method: userinfo.slice(0, ci), password: userinfo.slice(ci + 1) }],
      },
    };
  }
  return null;
}

// ---------- مرحله ۴: تست واقعی با Xray (خروجی + پینگ + سرعت) ----------
function curlCmd(args, timeoutMs) {
  return new Promise((resolve) => {
    execFile("curl", args, { timeout: timeoutMs }, (err, stdout) => {
      if (err || !stdout) return resolve(null);
      resolve(stdout.toString());
    });
  });
}

async function exitInfo(port) {
  const out = await curlCmd(
    [
      "-sS", "--max-time", "8",
      "--socks5-hostname", `127.0.0.1:${port}`,
      "http://ip-api.com/json/?fields=status,countryCode,org,as,query",
    ],
    10000
  );
  if (!out) return null;
  try {
    const j = JSON.parse(out);
    if (!j.countryCode) return null;
    return { cc: j.countryCode, org: String(j.org || j.as || "") };
  } catch {
    return null;
  }
}

async function pingThroughSocks(port) {
  let best = null;
  for (let i = 0; i < 2; i++) {
    const out = await curlCmd(
      [
        "-sS", "-o", "/dev/null",
        "-w", "%{time_total}",
        "--max-time", "6",
        "--socks5-hostname", `127.0.0.1:${port}`,
        "http://www.gstatic.com/generate_204",
      ],
      8000
    );
    if (out) {
      const t = parseFloat(out);
      if (!Number.isNaN(t) && t > 0) {
        const ms = Math.round(t * 1000);
        if (best === null || ms < best) best = ms;
        if (best <= 400) break; // سریع بود، ادامه نده
      }
    }
  }
  return best;
}

async function speedThroughSocks(port) {
  const out = await curlCmd(
    [
      "-sS", "-o", "/dev/null",
      "-w", "%{speed_download}",
      "--max-time", String(SPEED_TEST_SECONDS),
      "--socks5-hostname", `127.0.0.1:${port}`,
      `https://speed.cloudflare.com/__down?bytes=${SPEED_TEST_BYTES}`,
    ],
    SPEED_TEST_SECONDS * 1000 + 2000
  );
  if (!out) return null;
  const bps = parseFloat(out);
  if (Number.isNaN(bps) || bps <= 0) return null;
  return Math.round((bps * 8) / 1e6 * 10) / 10; // Mbps با یک رقم اعشار
}

function startXray(cfgFile) {
  return execFile(XRAY_BIN, ["run", "-c", cfgFile], { timeout: 15000 }, () => {});
}

async function verifyOne(c, slot, expectedCc) {
  let ob = null;
  try {
    ob = buildOutbound(c);
  } catch {
    return null;
  }
  if (!ob) return null;
  const cfg = {
    log: { loglevel: "warning" },
    inbounds: [{ listen: "127.0.0.1", port: XRAY_BASE_PORT + slot, protocol: "socks", settings: { auth: "noauth", udp: false } }],
    outbounds: [ob],
  };
  const cfgFile = path.join(TMP_DIR, `cfg_${slot}.json`);
  fs.writeFileSync(cfgFile, JSON.stringify(cfg));
  const proc = startXray(cfgFile);
  const port = XRAY_BASE_PORT + slot;
  await new Promise((r) => setTimeout(r, 1100));
  const exit = await exitInfo(port);
  let detail = null;
  if (exit) {
    const ping = await pingThroughSocks(port);
    if (ping !== null) {
      const speed = await speedThroughSocks(port);
      detail = { cc: exit.cc, org: exit.org, ping, speed };
    }
  }
  try {
    proc.kill("SIGKILL");
  } catch {}
  if (!detail) return null;
  if (expectedCc && detail.cc !== expectedCc) return null;
  if (!expectedCc && EXCLUDED_CC.has(detail.cc)) return null;
  return detail;
}

async function verifyBatch(list, expectedCc) {
  const results = new Map(); // raw -> detail
  if (list.length === 0) return results;
  let idx = 0;
  const N = Math.min(PARALLEL_XRAY, list.length);
  const freeSlots = [...Array(N).keys()];
  const takeSlot = () =>
    new Promise((res) => {
      const t = setInterval(() => {
        if (freeSlots.length > 0) {
          clearInterval(t);
          res(freeSlots.shift());
        }
      }, 30);
    });
  const worker = async () => {
    while (idx < list.length) {
      const c = list[idx++];
      const slot = await takeSlot();
      try {
        const detail = await verifyOne(c, slot, expectedCc);
        if (detail) results.set(c.raw, detail);
      } catch {
        /* نادیده */
      }
      freeSlots.push(slot);
    }
  };
  await Promise.all(Array.from({ length: N }, worker));
  return results;
}

// ---------- انتخاب ----------
function score(c) {
  let s = 0;
  if (PREF_PORTS.has(c.port)) s += 4;
  if (c.security === "reality") s += 3;
  if (c.security === "tls") s += 2;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(c.host)) s += 1; // IP مستقیم
  if (c.src && QUALITY_SRC.has(c.src)) s += 3; // منابع با تست سلامت داخلی اولویت دارند
  return s;
}
function pickForVerify(pool, n) {
  const byProto = new Map();
  const chosen = [];
  const sorted = [...pool].sort((a, b) => score(b) - score(a));
  for (const c of sorted) {
    const k = `${c.proto}/${c.security}/${c.net}`;
    const cnt = byProto.get(k) || 0;
    if (cnt >= Math.ceil(n / 4) && chosen.length > 0) continue;
    byProto.set(k, cnt + 1);
    chosen.push(c);
    if (chosen.length >= n) break;
  }
  return chosen;
}

// ---------- اجرای اصلی (resume‌پذیر مرحله‌به‌مرحله) ----------
const STATE_DIR = process.env.STATE_DIR || "/tmp/vsub-run";
const VERIFY_DIR = path.join(STATE_DIR, "verify");
fs.mkdirSync(VERIFY_DIR, { recursive: true });
const STATE_FILE = path.join(STATE_DIR, "state.json");
const TCP_FILE = path.join(STATE_DIR, "tcp.json");
const DONE_FILE = path.join(STATE_DIR, "done.flag");
const jread = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const jwrite = (f, obj) => fs.writeFileSync(f, JSON.stringify(obj));

const XRAY_BIN =
  process.env.XRAY_BIN && fs.existsSync(process.env.XRAY_BIN)
    ? process.env.XRAY_BIN
    : path.join(STATE_DIR, "xray", "xray");
async function ensureXray() {
  if (fs.existsSync(XRAY_BIN)) return true;
  if (process.env.SKIP_VERIFY) return false;
  try {
    const zipPath = path.join(STATE_DIR, "xray.zip");
    const res = await fetch("https://github.com/XTLS/Xray-core/releases/latest/download/Xray-linux-64.zip", { signal: AbortSignal.timeout(180000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(zipPath, buf);
    const destDir = path.join(STATE_DIR, "xray");
    fs.mkdirSync(destDir, { recursive: true });
    execFileSync("python3", ["-m", "zipfile", "-e", zipPath, destDir], { timeout: 120000 });
    fs.chmodSync(XRAY_BIN, 0o755);
    return true;
  } catch (e) {
    console.log(`xray download failed: ${e.message} — verify skipped`);
    return false;
  }
}

async function main() {
  let cands, hostToGeo;

  if (fs.existsSync(STATE_FILE) && process.env.FRESH !== "1") {
    console.log("== resume: state loaded ==");
    const st = jread(STATE_FILE);
    cands = st.cands;
    hostToGeo = new Map(st.hostToGeo);
  } else {
    console.log("== 1/5 fetching sources ==");
    const texts = await fetchSources();
    const uriSrc = new Map();
    for (const { key, text } of texts) extractUris(text, uriSrc, key);
    console.log(`unique URIs: ${uriSrc.size}`);

    console.log("== 2/5 parsing ==");
    cands = parseAll(uriSrc);
    console.log(`parsed candidates: ${cands.length}`);

    console.log("== 3/5 dns + geo ==");
    hostToGeo = new Map();
    if (!SKIP_GEO) {
      const ipToHosts = await resolveHosts(cands);
      console.log(`unique IPs resolved: ${ipToHosts.size}`);
      const { geo, healthy } = await geoBatch(ipToHosts);
      console.log(`geo entries: ${geo.size} (healthy=${healthy})`);
      for (const [ip, g] of geo)
        for (const h of ipToHosts.get(ip) || [])
          if (!hostToGeo.has(h)) hostToGeo.set(h, g);
    } else {
      console.log("geo skipped (SKIP_GEO=1) — remark grouping only");
    }
    jwrite(STATE_FILE, { cands, hostToGeo: [...hostToGeo.entries()] });
    console.log("state saved to disk");
  }

  // گروه‌بندی: geo دقیق > برچسب متنی > CDN > حذف
  const groups = new Map();
  const cdnPool = [];
  for (const c of cands) {
    const g = hostToGeo.get(c.host.toLowerCase());
    if (g && CDN_ORG_RE.test(g.org)) {
      cdnPool.push(c);
      continue;
    }
    let cc = null;
    if (g && g.cc && !EXCLUDED_CC.has(g.cc)) cc = g.cc;
    if (!cc) {
      const rcc = remarkToCc(c.name);
      if (rcc && !EXCLUDED_CC.has(rcc)) cc = rcc;
    }
    if (!cc) continue;
    if (!groups.has(cc)) groups.set(cc, []);
    groups.get(cc).push(c);
  }
  console.log(`country groups: ${[...groups.entries()].map(([cc, a]) => `${cc}:${a.length}`).join(", ")}`);
  console.log(`cdn pool: ${cdnPool.length}`);

  console.log("== 4/5 tcp filter ==");
  let aliveByCc, cdnAlive;
  if (fs.existsSync(TCP_FILE)) {
    const t = jread(TCP_FILE);
    aliveByCc = new Map();
    for (const [cc, raws] of Object.entries(t.aliveByCc)) {
      const byRaw = new Map((groups.get(cc) || []).map((c) => [c.raw, c]));
      const list = raws.map((r) => byRaw.get(r)).filter(Boolean);
      if (list.length) aliveByCc.set(cc, list);
    }
    const byRawCdn = new Map(cdnPool.map((c) => [c.raw, c]));
    cdnAlive = (t.cdnAlive || []).map((r) => byRawCdn.get(r)).filter(Boolean);
    console.log("tcp filter loaded from disk");
  } else {
    aliveByCc = new Map();
    for (const [cc, pool] of groups) {
      const alive = SKIP_TCP ? pool : await tcpAlive(pool);
      if (alive.length) aliveByCc.set(cc, alive);
    }
    cdnAlive = SKIP_TCP ? cdnPool : await tcpAlive(cdnPool);
    jwrite(TCP_FILE, {
      aliveByCc: Object.fromEntries([...aliveByCc.entries()].map(([cc, a]) => [cc, a.map((c) => c.raw)])),
      cdnAlive: cdnAlive.map((c) => c.raw),
    });
    console.log("tcp filter saved to disk");
  }
  console.log(`alive groups: ${[...aliveByCc.entries()].map(([cc, a]) => `${cc}:${a.length}`).join(", ")}`);
  console.log(`cdn alive: ${cdnAlive.length}`);

  console.log("== 5/5 xray verify ==");
  const hasXray = await ensureXray();
  const candByRaw = new Map(cands.map((c) => [c.raw, c]));

  const orderedCc = [...aliveByCc.keys()].sort((a, b) => {
    const ia = COUNTRY_ORDER.indexOf(a);
    const ib = COUNTRY_ORDER.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
  const pending = orderedCc.map((cc) => ({ key: cc, list: aliveByCc.get(cc), expectedCc: cc }));
  if (cdnAlive.length) pending.push({ key: "CDN", list: cdnAlive, expectedCc: null });

  const verifyChunk = async ({ key, list, expectedCc }) => {
    const f = path.join(VERIFY_DIR, `${key}.json`);
    if (fs.existsSync(f)) return jread(f);
    const n = key === "CDN" ? VERIFY_PER_COUNTRY * 2 : VERIFY_PER_COUNTRY;
    const pool = pickForVerify(list, n);
    const results = {};
    if (hasXray && pool.length) {
      const m = await verifyBatch(pool, expectedCc);
      for (const [raw, d] of m) results[raw] = d;
    }
    const chunk = { key, pool: pool.map((c) => c.raw), results };
    jwrite(f, chunk);
    console.log(`verify ${key}: ${Object.keys(results).length}/${pool.length} verified — saved`);
    return chunk;
  };
  for (const item of pending) await verifyChunk(item);

  // ---------- ساخت خروجی‌ها ----------
  const index = { generated: new Date().toISOString(), countries: [], cdn: null };
  const allLines = [];
  const richByCc = new Map();
  const pushRich = (entry) => {
    const cc = entry.country;
    if (!richByCc.has(cc)) richByCc.set(cc, []);
    richByCc.get(cc).push(entry);
  };
  const byPing = (a, b) => (a[1].ping || 99999) - (b[1].ping || 99999);

  for (const item of pending) {
    const { key, list, expectedCc } = item;
    const chunk = jread(path.join(VERIFY_DIR, `${key}.json`));
    const verifiedMap = new Map(Object.entries(chunk.results));
    if (key === "CDN") {
      const lines = [];
      const seenRaw = new Set();
      for (const raw of verifiedMap.keys()) {
        if (!seenRaw.has(raw)) {
          seenRaw.add(raw);
          lines.push(raw);
        }
      }
      for (const c of list) {
        if (lines.length >= 24) break;
        if (!seenRaw.has(c.raw)) {
          seenRaw.add(c.raw);
          lines.push(c.raw);
        }
      }
      if (lines.length) {
        fs.writeFileSync(
          path.join(OUT_DIR, "cdn.txt"),
          Buffer.from(lines.join("\n"), "utf8").toString("base64") + "\n"
        );
        index.cdn = { name: "بین‌الملل (CDN)", flag: "🌐", count: lines.length, file: "cdn.txt" };
      }
      // تأییدشده‌های CDN به کشور واقعی خروجی می‌روند
      const verifiedByCc = new Map();
      for (const [raw, d] of verifiedMap) {
        const c = candByRaw.get(raw);
        if (!c || EXCLUDED_CC.has(d.cc)) continue;
        if (!verifiedByCc.has(d.cc)) verifiedByCc.set(d.cc, []);
        verifiedByCc.get(d.cc).push([c, d]);
      }
      for (const [cc, pairs] of verifiedByCc) {
        pairs.sort(byPing);
        for (const [c, d] of pairs.slice(0, 4)) {
          pushRich({
            uri: c.raw, proto: c.proto, net: c.net || "tcp", security: c.security || "none",
            country: cc, org: d.org || "", ping: d.ping, speed: d.speed,
            source: c.src || "", name: c.name || "", host: c.host, port: c.port, verified: true,
          });
        }
      }
      let cdnBackup = 0;
      const sortedCdn = [...list].sort((a, b) => score(b) - score(a));
      for (const c of sortedCdn) {
        if (cdnBackup >= 8) break;
        if (verifiedMap.has(c.raw)) continue;
        pushRich({
          uri: c.raw, proto: c.proto, net: c.net || "tcp", security: c.security || "none",
          country: "CDN", org: "", ping: null, speed: null,
          source: c.src || "", name: c.name || "", host: c.host, port: c.port, verified: false,
        });
        cdnBackup++;
      }
      continue;
    }
    // کشور عادی
    const lines = [];
    const seenRaw = new Set();
    for (const raw of verifiedMap.keys()) {
      if (!seenRaw.has(raw)) {
        seenRaw.add(raw);
        lines.push(raw);
        if (lines.length >= VERIFY_KEEP) break;
      }
    }
    // فایل اشتراک باید عمدتاً تأییدشده باشد: فقط وقتی تأییدشده کم است چند پشتیبان اضافه می‌کنیم
    const extrasMax = Math.max(0, UNVERIF_FILL - lines.length);
    let extras = 0;
    for (const c of list) {
      if (extras >= extrasMax || lines.length >= FILE_CAP) break;
      if (!seenRaw.has(c.raw)) {
        seenRaw.add(c.raw);
        lines.push(c.raw);
        extras++;
      }
    }
    if (lines.length) {
      const file = `${key.toLowerCase()}.txt`;
      fs.writeFileSync(path.join(OUT_DIR, file), Buffer.from(lines.join("\n"), "utf8").toString("base64") + "\n");
      index.countries.push({ cc: key, name: CC_FA[key] || key, flag: ccFlag(key), count: lines.length, verified: Math.min(verifiedMap.size, VERIFY_KEEP), file });
      for (const l of lines) if (allLines.length < ALL_CAP) allLines.push(l);
    }
    const verifiedSorted = [...verifiedMap.entries()].sort(byPing).slice(0, VERIFY_KEEP);
    for (const [raw, d] of verifiedSorted) {
      const c = candByRaw.get(raw);
      if (!c) continue;
      pushRich({
        uri: c.raw, proto: c.proto, net: c.net || "tcp", security: c.security || "none",
        country: d.cc || key, org: d.org || "", ping: d.ping, speed: d.speed,
        source: c.src || "", name: c.name || "", host: c.host, port: c.port, verified: true,
      });
    }
    const poolRaws = new Set(chunk.pool);
    let backup = 0;
    const sorted = [...list].sort((a, b) => score(b) - score(a));
    for (const c of sorted) {
      if (backup >= RICH_BACKUP) break;
      if (poolRaws.has(c.raw) || verifiedMap.has(c.raw)) continue;
      const g = hostToGeo.get(c.host.toLowerCase());
      pushRich({
        uri: c.raw, proto: c.proto, net: c.net || "tcp", security: c.security || "none",
        country: key, org: (g && g.org) || "", ping: null, speed: null,
        source: c.src || "", name: c.name || "", host: c.host, port: c.port, verified: false,
      });
      backup++;
    }
  }

  fs.writeFileSync(
    path.join(OUT_DIR, "all.txt"),
    Buffer.from(allLines.join("\n"), "utf8").toString("base64") + "\n"
  );
  fs.writeFileSync(path.join(OUT_DIR, "index.json"), JSON.stringify(index, null, 2));

  const countryEntries = [...richByCc.entries()]
    .filter(([cc]) => cc !== "CDN")
    .sort((a, b) => {
      const ia = COUNTRY_ORDER.indexOf(a[0]);
      const ib = COUNTRY_ORDER.indexOf(b[0]);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    })
    .map(([cc, list]) => ({
      cc,
      name: CC_FA[cc] || cc,
      flag: ccFlag(cc),
      count: list.length,
      verifiedCount: list.filter((x) => x.verified).length,
      file: `${cc.toLowerCase()}.txt`,
    }));
  if (richByCc.has("CDN")) {
    const list = richByCc.get("CDN");
    countryEntries.push({ cc: "CDN", name: "بین‌الملل (CDN)", flag: "🌐", count: list.length, verifiedCount: 0, file: "cdn.txt" });
  }
  const latest = {
    generated: new Date().toISOString(),
    sources: SOURCES.map((s) => ({ key: s.key, name: s.name, url: s.url })),
    countries: countryEntries,
    configs: [...richByCc.entries()]
      .sort((a, b) => {
        const ia = COUNTRY_ORDER.indexOf(a[0]) === -1 ? 999 : COUNTRY_ORDER.indexOf(a[0]);
        const ib = COUNTRY_ORDER.indexOf(b[0]) === -1 ? 999 : COUNTRY_ORDER.indexOf(b[0]);
        return ia - ib;
      })
      .flatMap(([, list]) => list),
  };
  fs.writeFileSync(path.join(RICH_DIR, "latest.json"), JSON.stringify(latest));

  const allDone = pending.every((item) => fs.existsSync(path.join(VERIFY_DIR, `${item.key}.json`)));
  console.log(
    `DONE: ${index.countries.length} countries, all=${allLines.length}, rich=${latest.configs.length}, verified=${latest.configs.filter((c) => c.verified).length}, complete=${allDone}`
  );
  if (allDone) jwrite(DONE_FILE, { at: Date.now() });
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
