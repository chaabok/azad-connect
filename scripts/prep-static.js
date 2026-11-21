// ─────────────────────────────────────────────────────────────
// پیش‌نیاز ساخت استاتیک (GitHub Pages / Cloudflare Pages):
// مسیرهای سروری src/app/api با خروجی استاتیک Next.js سازگار نیستند
// و باید قبل از build حذف شوند.
//   - روی Cloudflare Pages نسخه functions/api/proxy.js جای آن را می‌گیرد
//   - روی GitHub Pages درگاه به حالت «نسخه سبک» می‌رود
// این اسکریپت فقط داخل CI اجرا می‌شود و به مخزن محلی شما آسیبی نمی‌زند.
// ─────────────────────────────────────────────────────────────
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const apiDir = join(root, "src", "app", "api");

try {
  rmSync(apiDir, { recursive: true, force: true });
  console.log("[prep-static] src/app/api removed for static export.");
} catch (err) {
  console.warn("[prep-static] could not remove api dir:", err);
}
