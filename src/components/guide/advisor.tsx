"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Monitor, Smartphone, Wrench, Info, ArrowDown, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ADVICE, REASON_STEPS, TOOLS, type ISP } from "@/lib/guide-data";

type Device = "windows" | "android";

const DEVICES: { id: Device; label: string; icon: typeof Monitor }[] = [
  { id: "windows", label: "ویندوز", icon: Monitor },
  { id: "android", label: "اندروید", icon: Smartphone },
];

const ISPS: { id: ISP; label: string }[] = [
  { id: "mci", label: "همراه اول" },
  { id: "irancell", label: "ایرانسل" },
  { id: "tci", label: "مخابرات / TD-LTE" },
  { id: "other", label: "اپراتور دیگر" },
];

export function Advisor() {
  const [device, setDevice] = useState<Device | null>(null);
  const [isp, setIsp] = useState<ISP | null>(null);

  const advice = isp ? ADVICE[isp] : null;
  const ready = device && isp;

  return (
    <section id="advisor" className="scroll-mt-24 py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-8 text-center">
          <Badge variant="outline" className="mb-3 gap-1.5 border-primary/40 bg-primary/5 text-primary">
            <Compass className="h-3.5 w-3.5" />
            مشاور هوشمند
          </Badge>
          <h2 className="text-2xl font-bold sm:text-3xl">از کجا شروع کنم؟</h2>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            دستگاه و اپراتور خود را انتخاب کنید تا بهترین گزینه‌های اتصال برای شما مرتب شود.
          </p>
        </div>

        <Card className="mx-auto max-w-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wrench className="h-5 w-5 text-primary" />
              مشخصات من
            </CardTitle>
            <CardDescription>هر دو گزینه را انتخاب کنید تا نتیجه نمایش داده شود.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="mb-2 text-sm font-medium">دستگاه من</p>
              <div className="grid grid-cols-2 gap-3">
                {DEVICES.map((d) => (
                  <Button
                    key={d.id}
                    type="button"
                    variant={device === d.id ? "default" : "outline"}
                    onClick={() => setDevice(d.id)}
                    className="h-12 justify-center gap-2"
                    aria-pressed={device === d.id}
                  >
                    <d.icon className="h-5 w-5" />
                    {d.label}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">اپراتور من</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {ISPS.map((i) => (
                  <Button
                    key={i.id}
                    type="button"
                    variant={isp === i.id ? "default" : "outline"}
                    onClick={() => setIsp(i.id)}
                    className="h-12 justify-center text-sm"
                    aria-pressed={isp === i.id}
                  >
                    {i.label}
                  </Button>
                ))}
              </div>
            </div>

            <AnimatePresence>
              {ready && advice && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4 pt-2"
                >
                  <Alert className="border-primary/30 bg-primary/5 [&>svg]:text-primary">
                    <Info className="h-4 w-4" />
                    <AlertDescription className="leading-6">{advice.tip}</AlertDescription>
                  </Alert>

                  <div className="space-y-3">
                    {advice.order.slice(0, 3).map((id, idx) => {
                      const tool = TOOLS.find((t) => t.id === id);
                      if (!tool) return null;
                      const Icon = tool.icon;
                      return (
                        <a
                          key={id}
                          href={`#guide-${id}`}
                          className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                            <Icon className="h-5 w-5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">
                              {REASON_STEPS[idx]}: {tool.name}
                            </span>
                            <span className="block text-xs text-muted-foreground">{tool.tagline}</span>
                          </span>
                          <ArrowDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </a>
                      );
                    })}
                  </div>

                  <p className="text-xs leading-5 text-muted-foreground">
                    این ترتیب صرفاً بر اساس تجربه رایج کاربران است و با تغییرات فیلترینگ ممکن
                    است جابه‌جا شود. برای جزئیات نصب، روی هر گزینه بزنید.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
