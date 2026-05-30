import { createFileRoute } from "@tanstack/react-router";
import { CodeBlock } from "@/components/code-block";
import { DocsLayout } from "@/components/docs-layout";
import { SiteShell } from "@/components/site-shell";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/docs")({
  component: DocsPage,
});

function DocsPage() {
  return (
    <SiteShell>
      <DocsLayout
        eyebrow="Docs"
        title="Understand SafeTS in one pass."
        description="SafeTS is a read-only TypeScript analysis tool for async correctness and runtime crash prevention."
        toc={[
          { label: "Mental model", href: "#mental-model" },
          { label: "Commands", href: "#commands" },
          { label: "Baseline", href: "#baseline" },
          { label: "JSON output", href: "#json-output" },
        ]}
      >
        <section id="mental-model">
          <h2>Mental model</h2>
          <p>
            SafeTS builds a TypeScript program, walks the AST, and reports patterns
            that can still crash at runtime even when the code type-checks. It
            never edits files. The `fix` command prints suggestions only.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {["Read-only", "Type-aware", "CI-friendly"].map((item) => (
              <Card key={item}>
                <h3>{item}</h3>
                <p>
                  Focused analysis with project-relative output and adoption paths
                  for existing codebases.
                </p>
              </Card>
            ))}
          </div>
        </section>

        <section id="commands">
          <h2>Commands</h2>
          <CodeBlock
            language="bash"
            title="terminal"
            code={`safets doctor
safets fix
safets debt
safets baseline
safets doctor --json
safets doctor --fail-on-new`}
          />
        </section>

        <section id="baseline">
          <h2>Baseline workflow</h2>
          <p>
            Baseline mode lets teams introduce SafeTS without blocking on old
            findings. Commit the current snapshot, then fail only on new findings.
          </p>
          <CodeBlock
            language="bash"
            title="baseline"
            code={`safets baseline
git add .safets-baseline.json
git commit -m "chore: add safets baseline"
safets doctor --fail-on-new`}
          />
        </section>

        <section id="json-output">
          <h2>JSON output</h2>
          <p>
            Use JSON for bots, CI annotations, editor integrations, or agent
            workflows that need structured crash reports.
          </p>
          <CodeBlock
            language="json"
            title="report.json"
            code={`{
  "schemaVersion": 1,
  "summary": {
    "total": 2,
    "new": 1,
    "known": 1
  },
  "crashes": [
    {
      "pattern": "Unsafe access after await",
      "confidence": "MEDIUM",
      "file": "src/session.ts",
      "line": 18
    }
  ]
}`}
          />
        </section>
      </DocsLayout>
    </SiteShell>
  );
}
