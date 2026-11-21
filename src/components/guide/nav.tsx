import { Globe } from "lucide-react";

const NAV_LINKS = [
  { href: "#portal", label: "درگاه یک‌کلیکی" },
  { href: "#advisor", label: "مشاور هوشمند" },
  { href: "#tools", label: "ابزارها" },
  { href: "#guides", label: "راهنماهای کامل" },
  { href: "#dns", label: "DNS ضدتحریم" },
  { href: "#safety", label: "امنیت" },
  { href: "#faq", label: "سوالات" },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <a href="#" className="flex shrink-0 items-center gap-2 text-sm font-extrabold sm:text-base">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Globe className="h-5 w-5" />
          </span>
          اتصال آزاد
        </a>
        <nav aria-label="فهرست بخش‌ها" className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <a
          href="#advisor"
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground md:hidden"
        >
          شروع سریع
        </a>
      </div>
    </header>
  );
}
