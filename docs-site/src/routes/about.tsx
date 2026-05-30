import { createFileRoute } from "@tanstack/react-router";
import { DocsLayout } from "@/components/docs-layout";
import { SiteShell } from "@/components/site-shell";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/about")({
  component: AboutPage,
});

const principles = [
  {
    title: "Trust over noise",
    body: "A detector should earn attention. SafeTS favors fewer findings with clearer crash paths over broad stylistic coverage.",
  },
  {
    title: "Adoption over purity",
    body: "Real repositories carry debt. Baselines let teams improve safety without turning every migration into a rewrite.",
  },
  {
    title: "Async correctness matters",
    body: "Modern TypeScript apps are distributed, concurrent, and stateful. The dangerous code often sits at async boundaries.",
  },
];

function AboutPage() {
  return (
    <SiteShell>
      <DocsLayout
        eyebrow="Philosophy"
        title="Safe code is code that survives production timing."
        description="SafeTS exists because compile-time correctness and runtime correctness are related, but not identical."
        toc={[
          { label: "Principles", href: "#principles" },
          { label: "Non-goals", href: "#non-goals" },
        ]}
      >
        <section id="principles">
          <h2>Principles</h2>
          <div className="grid gap-4">
            {principles.map((principle) => (
              <Card key={principle.title}>
                <h3>{principle.title}</h3>
                <p>{principle.body}</p>
              </Card>
            ))}
          </div>
        </section>
        <section id="non-goals">
          <h2>Non-goals</h2>
          <p>
            SafeTS is not trying to replace ESLint, Prettier, tests, schema
            validation, or TypeScript itself. It is a small infrastructure layer
            for high-signal runtime safety checks.
          </p>
        </section>
      </DocsLayout>
    </SiteShell>
  );
}
