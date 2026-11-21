import { Globe, ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-auto border-t bg-muted/30">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-sm font-extrabold">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Globe className="h-4 w-4" />
          </span>
          اتصال آزاد
        </div>
        <p className="max-w-xl text-xs leading-6 text-muted-foreground">
          این اپ صرفاً آموزشی است و به هیچ‌یک از سرویس‌های معرفی‌شده وابستگی ندارد.
          مسئولیت استفاده از ابزارها و پایبندی به قوانین محل زندگی شما بر عهده خودتان است.
          هیچ داده‌ای جمع‌آوری یا ارسال نمی‌شود.
        </p>
        <p className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          دسترسی آزاد به اطلاعات، حق همه است
        </p>
      </div>
    </footer>
  );
}
