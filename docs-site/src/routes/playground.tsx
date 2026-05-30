import { createFileRoute } from "@tanstack/react-router";
import { CodeBlock } from "@/components/code-block";
import { DocsLayout } from "@/components/docs-layout";
import { SiteShell } from "@/components/site-shell";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/playground")({
  component: PlaygroundPage,
});

const examples = [
  {
    title: "Stale narrowing after await",
    code: `async function renderProfile(user?: User) {
  if (!user) return null

  await hydratePermissions()

  return user.profile.name
}`,
    output: `Unsafe access after await
The value was narrowed before an await boundary.
Snapshot it or keep access optional.`,
  },
  {
    title: "Typed env boundary",
    code: `export const config = {
  stripeKey: process.env.STRIPE_SECRET_KEY!,
}`,
    output: `Unsafe process.env access
Move runtime validation into a requiredEnv helper.`,
  },
];

function PlaygroundPage() {
  return (
    <SiteShell>
      <DocsLayout
        eyebrow="Playground"
        title="Examples that feel like production code."
        description="Explore the kinds of findings SafeTS is designed to report and how the suggested fixes read in review."
        toc={[
          { label: "Async example", href: "#stale-narrowing-after-await" },
          { label: "Env example", href: "#typed-env-boundary" },
        ]}
      >
        <div className="grid gap-6">
          {examples.map((example) => (
            <section key={example.title} id={slug(example.title)}>
              <Card className="p-0">
                <div className="border-b border-border p-6">
                  <h2>{example.title}</h2>
                </div>
                <div className="grid gap-4 p-4 lg:grid-cols-[1.1fr_0.9fr]">
                  <CodeBlock title="input.ts" code={example.code} />
                  <CodeBlock title="safets output" language="text" code={example.output} />
                </div>
              </Card>
            </section>
          ))}
        </div>
      </DocsLayout>
    </SiteShell>
  );
}

function slug(value: string) {
  return value.toLowerCase().replaceAll(" ", "-");
}
