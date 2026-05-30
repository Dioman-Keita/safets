import { createFileRoute } from "@tanstack/react-router";
import { DetectorCard } from "@/components/detector-card";
import { DocsLayout } from "@/components/docs-layout";
import { SiteShell } from "@/components/site-shell";
import { detectors } from "@/lib/site-data";

export const Route = createFileRoute("/rules")({
  component: RulesPage,
});

function RulesPage() {
  return (
    <SiteShell>
      <DocsLayout
        eyebrow="Rules"
        title="Detectors built around real TypeScript failure modes."
        description="SafeTS detectors are intentionally practical: high-signal runtime crash patterns with reviewable fixes."
        toc={detectors.map((detector) => ({
          label: detector.name,
          href: `#${slug(detector.name)}`,
        }))}
      >
        <div className="grid gap-6">
          {detectors.map((detector) => (
            <section key={detector.name} id={slug(detector.name)}>
              <DetectorCard {...detector} />
            </section>
          ))}
        </div>
      </DocsLayout>
    </SiteShell>
  );
}

function slug(value: string) {
  return value.toLowerCase().replaceAll(" ", "-").replaceAll("/", "-");
}
