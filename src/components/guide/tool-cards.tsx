import { ExternalLink, Monitor, Smartphone, Sparkles, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RATING_STYLES, TOOLS } from "@/lib/guide-data";

function RatingRow({ label, value }: { label: string; value: string }) {
  const style = RATING_STYLES[value] ?? "bg-muted text-muted-foreground";
  return (
    <span className="flex items-center justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={`rounded-full px-2 py-0.5 font-medium ${style}`}>{value}</span>
    </span>
  );
}

export function ToolCards() {
  return (
    <section id="tools" className="scroll-mt-24 bg-muted/40 py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <Badge variant="outline" className="mb-3 gap-1.5 border-primary/40 bg-primary/5 text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            جعبه ابزار
          </Badge>
          <h2 className="text-2xl font-bold sm:text-3xl">ابزارهای رایگان اتصال</h2>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            پنج ابزار رسمی و معتبر که روی ویندوز و اندروید کار می‌کنند — همه رایگان.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <Card key={tool.id} className="flex h-full flex-col transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-base leading-6">{tool.name}</CardTitle>
                  <CardDescription className="text-sm leading-6">{tool.tagline}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-4">
                  <p className="text-sm leading-6 text-muted-foreground">{tool.description}</p>

                  <div className="space-y-1.5 rounded-lg border p-3">
                    <RatingRow label="سرعت" value={tool.rating.speed} />
                    <RatingRow label="پایداری" value={tool.rating.stability} />
                    <RatingRow label="سادگی راه‌اندازی" value={tool.rating.ease} />
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {tool.platforms.map((p) => (
                      <Badge key={p} variant="secondary" className="gap-1.5">
                        {p === "ویندوز" ? <Monitor className="h-3 w-3" /> : <Smartphone className="h-3 w-3" />}
                        {p}
                      </Badge>
                    ))}
                  </div>

                  <div className="mt-auto flex flex-wrap gap-2 pt-1">
                    {tool.links.map((l) => (
                      <Button key={l.url} variant="outline" size="sm" asChild>
                        <a href={l.url} target="_blank" rel="noopener noreferrer" className="gap-1.5">
                          <ExternalLink className="h-3.5 w-3.5" />
                          {l.label}
                        </a>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          <Card className="flex h-full flex-col border-dashed bg-card/60">
            <CardHeader>
              <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <TrendingUp className="h-6 w-6" />
              </div>
              <CardTitle className="text-base leading-6">برای سرعت پایدارتر در آینده</CardTitle>
              <CardDescription className="text-sm leading-6">
                قدم بعدی وقتی شرایط مالی اجازه داد
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-sm leading-6 text-muted-foreground">
                یک سرور خارجی ارزان (VPS چند دلاری در ماه) به‌همراه پروتکل VLESS+Reality،
                سرعت و پایداری می‌دهد که هیچ سرویس رایگانی ندارد؛ ترافیک شما هم مثل HTTPS
                عادی دیده می‌شود. راهنمای کامل راه‌اندازی را هر وقت خواستید می‌توانید بخواهید.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
