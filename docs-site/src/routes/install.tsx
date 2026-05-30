import { createFileRoute } from "@tanstack/react-router";
import { CodeBlock } from "@/components/code-block";
import { DocsLayout } from "@/components/docs-layout";
import { SiteShell } from "@/components/site-shell";
import { Card } from "@/components/ui/card";
import { installTabs } from "@/lib/site-data";

export const Route = createFileRoute("/install")({
  component: InstallPage,
});

function InstallPage() {
  return (
    <SiteShell>
      <DocsLayout
        eyebrow="Install"
        title="Add SafeTS to any TypeScript project."
        description="Install the scoped npm package, run the safets binary, then wire it into CI when the baseline is ready."
        toc={[
          { label: "Package managers", href: "#package-managers" },
          { label: "Scripts", href: "#scripts" },
          { label: "CI", href: "#ci" },
          { label: "Agent skill", href: "#agent-skill" },
        ]}
      >
        <section id="package-managers">
          <h2>Package managers</h2>
          <p>
            These commands run the local SafeTS binary after installation. Use
            package scripts for daily workflows, but use `exec`/`bunx` when you
            want to invoke the binary directly.
          </p>
          <div className="grid gap-4 lg:grid-cols-3">
            {installTabs.map((tab) => (
              <Card key={tab.manager}>
                <h3>{tab.manager}</h3>
                <CodeBlock language="bash" code={tab.install} />
                <CodeBlock language="bash" code={tab.run} />
              </Card>
            ))}
          </div>
        </section>

        <section id="scripts">
          <h2>Recommended scripts</h2>
          <CodeBlock
            language="json"
            title="package.json"
            code={`{
  "scripts": {
    "safets": "safets doctor",
    "safets:fix": "safets fix",
    "safets:baseline": "safets baseline",
    "safets:ci": "safets doctor --fail-on-new"
  }
}`}
          />
        </section>

        <section id="ci">
          <h2>GitHub Actions</h2>
          <CodeBlock
            language="yaml"
            title=".github/workflows/safets.yml"
            code={`name: SafeTS

on:
  pull_request:
  push:
    branches: [main]

jobs:
  safets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: Dioman-Keita/safets@v1.0.1
        with:
          version: 1.0.1
          fail-on-new: "true"`}
          />
        </section>

        <section id="agent-skill">
          <h2>Agent skill</h2>
          <p>
            SafeTS includes an installable skill for agents that support the
            `skills` CLI. Codex is one supported target, not a requirement.
          </p>
          <CodeBlock
            language="bash"
            code={`npx skills add Dioman-Keita/safets
npx skills add Dioman-Keita/safets --skill safets-agent -a codex -g -y`}
          />
        </section>
      </DocsLayout>
    </SiteShell>
  );
}
