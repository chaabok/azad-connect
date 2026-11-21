import { Globe, Compass, ArrowDown, BookOpen, Monitor, Smartphone, Info, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-emerald-50 via-emerald-50/40 to-transparent"
      />
      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-16 text-center sm:px-6 sm:py-24">
        <Badge variant="outline" className="gap-1.5 border-primary/40 bg-primary/5 px-3 py-1 text-primary">
          <Globe className="h-3.5 w-3.5" />
          راهنمای اتصال به اینترنت آزاد
        </Badge>

        <h1 className="max-w-3xl text-3xl font-black leading-snug sm:text-5xl sm:leading-[1.3]">
          به اینترنت بین‌الملل وصل شوید، <span className="text-primary">بدون هزینه</span>
        </h1>

        <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
          راهنمای فارسی و قدم‌به‌قدم ابزارهای رسمی و رایگان اتصال برای ویندوز و اندروید.
          بدون تبلیغ، بدون جمع‌آوری اطلاعات — و بدون ادعای جادو.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" asChild>
            <a href="#portal" className="gap-2">
              <Zap className="h-4 w-4" />
              اتصال یک‌کلیکی به وب
            </a>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a href="#advisor" className="gap-2">
              <Compass className="h-4 w-4" />
              شروع سریع
            </a>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a href="#tools" className="gap-2">
              مشاهده ابزارها
              <ArrowDown className="h-4 w-4" />
            </a>
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <Badge variant="secondary" className="gap-1.5 px-3 py-1">
            <BookOpen className="h-3.5 w-3.5" /> ۵ ابزار رایگان با راهنمای کامل
          </Badge>
          <Badge variant="secondary" className="gap-1.5 px-3 py-1">
            <Monitor className="h-3.5 w-3.5" />
            <Smartphone className="h-3.5 w-3.5" /> ویندوز و اندروید
          </Badge>
          <Badge variant="secondary" className="gap-1.5 px-3 py-1">
            <Info className="h-3.5 w-3.5" /> تنظیمات مخصوص هر اپراتور
          </Badge>
        </div>

        <Alert className="mt-2 max-w-2xl border-primary/30 bg-card/80 text-right [&>svg]:text-primary">
          <Info className="h-4 w-4" />
          <AlertDescription className="leading-6">
            <span className="font-bold">صداقت مهم است:</span> هیچ اپلیکیشنی به‌تنهایی و بدون
            نقطه خروج خارج از شبکه ملی نمی‌تواند فیلترینگ را دور بزند — هر کس ادعای خلاف این
            را دارد، به احتمال زیاد بدافزار می‌فروشد. کاری که این اپ می‌کند این است که شما را
            قدم‌به‌قدم به تونل‌های رایگان سرویس‌های رسمی جهانی (کلادفلر، تور، سایفون و...)
            وصل می‌کند.
          </AlertDescription>
        </Alert>
      </div>
    </section>
  );
}
