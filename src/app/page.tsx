import { Nav } from "@/components/guide/nav";
import { Hero } from "@/components/guide/hero";
import { Portal } from "@/components/guide/portal";
import { Advisor } from "@/components/guide/advisor";
import { ToolCards } from "@/components/guide/tool-cards";
import { StepGuides } from "@/components/guide/step-guides";
import { DnsSection } from "@/components/guide/dns-section";
import { SafetySection, FaqSection } from "@/components/guide/safety-faq";
import { Footer } from "@/components/guide/footer";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="flex-1">
        <Hero />
        <Portal />
        <Advisor />
        <ToolCards />
        <StepGuides />
        <DnsSection />
        <SafetySection />
        <FaqSection />
      </main>
      <Footer />
    </div>
  );
}
