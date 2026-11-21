import {
  ExternalLink,
  Lightbulb,
  TriangleAlert,
  CircleCheck,
  BookOpen,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { TOOLS } from "@/lib/guide-data";

export function StepGuides() {
  return (
    <section id="guides" className="scroll-mt-24 py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <Badge variant="outline" className="mb-3 gap-1.5 border-primary/40 bg-primary/5 text-primary">
            <BookOpen className="h-3.5 w-3.5" />
            راهنمای کامل
          </Badge>
          <h2 className="text-2xl font-bold sm:text-3xl">نصب قدم‌به‌قدم هر ابزار</h2>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            برای باز کردن هر راهنما روی عنوان آن بزنید.
          </p>
        </div>

        <Alert className="mb-6 border-primary/30 bg-primary/5 [&>svg]:text-primary">
          <CircleCheck className="h-4 w-4" />
          <AlertDescription className="leading-6">
            مراحل را به ترتیب انجام دهید. اگر یک ابزار روی اپراتور شما جواب نداد، ناامید
            نشوید — سراغ ابزار بعدی بروید و بعداً دوباره تست کنید.
          </AlertDescription>
        </Alert>

        <Accordion type="multiple" className="space-y-4">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <div key={tool.id} id={`guide-${tool.id}`} className="scroll-mt-28">
                <AccordionItem
                  value={tool.id}
                  className="rounded-xl border bg-card px-4 shadow-sm sm:px-6"
                >
                  <AccordionTrigger className="py-4 text-right hover:no-underline">
                    <span className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="text-sm font-bold sm:text-base">{tool.name}</span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-6">
                    <ol className="mb-4 space-y-3">
                      {tool.steps.map((step, i) => (
                        <li key={i} className="flex gap-3 text-sm leading-6">
                          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                            {i + 1}
                          </span>
                          <span className="text-muted-foreground">{step}</span>
                        </li>
                      ))}
                    </ol>

                    {tool.tip && (
                      <Alert className="mb-3 [&>svg]:text-primary">
                        <Lightbulb className="h-4 w-4" />
                        <AlertDescription className="leading-6">{tool.tip}</AlertDescription>
                      </Alert>
                    )}

                    {tool.warning && (
                      <Alert variant="destructive" className="mb-3">
                        <TriangleAlert className="h-4 w-4" />
                        <AlertDescription className="leading-6">{tool.warning}</AlertDescription>
                      </Alert>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {tool.links.map((l) => (
                        <Button key={l.url} variant="outline" size="sm" asChild>
                          <a
                            href={l.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="gap-1.5"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            {l.label}
                          </a>
                        </Button>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </div>
            );
          })}
        </Accordion>
      </div>
    </section>
  );
}
