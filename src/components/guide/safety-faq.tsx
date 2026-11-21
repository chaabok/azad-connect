import { ShieldCheck, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FAQ, SAFETY_TIPS } from "@/lib/guide-data";

export function SafetySection() {
  return (
    <section id="safety" className="scroll-mt-24 py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <Badge variant="outline" className="mb-3 gap-1.5 border-primary/40 bg-primary/5 text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            امنیت اول
          </Badge>
          <h2 className="text-2xl font-bold sm:text-3xl">نکات امنیتی مهم</h2>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            این پنج نکته را جدی بگیرید تا تلفن و حساب‌هایتان امن بمانند.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {SAFETY_TIPS.map((tip) => {
            const Icon = tip.icon;
            return (
              <div
                key={tip.title}
                className="rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-3 flex items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="text-sm font-bold leading-6">{tip.title}</h3>
                </div>
                <p className="text-sm leading-7 text-muted-foreground">{tip.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function FaqSection() {
  return (
    <section id="faq" className="scroll-mt-24 bg-muted/40 py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <Badge variant="outline" className="mb-3 gap-1.5 border-primary/40 bg-primary/5 text-primary">
            <HelpCircle className="h-3.5 w-3.5" />
            پرسش‌های رایج
          </Badge>
          <h2 className="text-2xl font-bold sm:text-3xl">سوالات پرتکرار</h2>
        </div>

        <Accordion type="single" collapsible className="rounded-xl border bg-card px-4 shadow-sm sm:px-6">
          {FAQ.map((item, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="py-4 text-right text-sm font-semibold hover:no-underline sm:text-base">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="pb-5 text-sm leading-7 text-muted-foreground">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
