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
        title="SafeTS documentation."
        description="A practical guide to how SafeTS analyzes TypeScript projects, reports runtime-risk patterns, and fits into pull request workflows."
        toc={[
          { label: "What SafeTS does", href: "#what-safets-does" },
          { label: "Analysis model", href: "#analysis-model" },
          { label: "Command reference", href: "#command-reference" },
          { label: "Baseline workflow", href: "#baseline-workflow" },
          { label: "JSON output", href: "#json-output" },
          { label: "Exit codes", href: "#exit-codes" },
          { label: "Known limits", href: "#known-limits" },
        ]}
      >
        <section id="what-safets-does">
          <h2>What SafeTS does</h2>
          <p>
            SafeTS is a read-only static analysis CLI for TypeScript projects.
            It focuses on runtime crash patterns that can survive strict
            TypeScript checks: stale narrowing after `await`, unsafe nested
            access, unprotected `JSON.parse`, unsafe `process.env` reads, and
            brittle collection lookups.
          </p>
          <p>
            The tool does not replace TypeScript, ESLint, tests, or schema
            validation. It adds a narrow review layer for places where code can
            type-check but still fail when production data, deployment config,
            or async timing changes.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <h3>Read-only</h3>
              <p>
                SafeTS never edits your source. `fix` prints suggestions that a
                developer can apply manually.
              </p>
            </Card>
            <Card>
              <h3>Compiler-backed</h3>
              <p>
                Analysis uses the TypeScript compiler API and project config
                where possible, then falls back to robust file discovery.
              </p>
            </Card>
            <Card>
              <h3>CI-friendly</h3>
              <p>
                Baselines let teams adopt SafeTS incrementally and block only
                newly introduced findings.
              </p>
            </Card>
          </div>
        </section>

        <section id="analysis-model">
          <h2>Analysis model</h2>
          <p>
            SafeTS first tries to load the closest `tsconfig.json` and create a
            TypeScript program with `noEmit`. It then walks source files and
            runs detectors against AST nodes and type information. Generated
            bundles, dependency folders, declaration files, and test files are
            filtered out by default to keep findings focused on product code.
          </p>
          <p>
            Test files are excluded unless you pass `--include-tests`. This
            matters for baselines: the baseline records whether tests were
            included, and CI should use the same option set as the baseline that
            was committed.
          </p>
          <CodeBlock
            language="bash"
            title="include tests when needed"
            code={`safets doctor --include-tests
safets baseline --include-tests
safets doctor --include-tests --fail-on-new`}
          />
        </section>

        <section id="command-reference">
          <h2>Command reference</h2>
          <p>
            The `safets` binary ships with a small set of commands. Use
            `doctor` locally and in CI, `fix` when you want human-readable
            remediation suggestions, and `baseline` when introducing SafeTS to
            an existing codebase.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <h3>doctor</h3>
              <p>Runs all detectors and prints findings grouped by file.</p>
              <CodeBlock language="bash" code="safets doctor" />
            </Card>
            <Card>
              <h3>fix</h3>
              <p>Prints suggested manual remediations without editing files.</p>
              <CodeBlock language="bash" code="safets fix" />
            </Card>
            <Card>
              <h3>debt</h3>
              <p>Summarizes current findings and baseline deltas by pattern.</p>
              <CodeBlock language="bash" code="safets debt" />
            </Card>
            <Card>
              <h3>baseline</h3>
              <p>Writes `.safets-baseline.json` for incremental adoption.</p>
              <CodeBlock language="bash" code="safets baseline" />
            </Card>
          </div>
        </section>

        <section id="baseline-workflow">
          <h2>Baseline workflow</h2>
          <p>
            A baseline is a snapshot of known findings. It lets a project start
            using SafeTS without blocking every existing issue on day one. Once
            committed, `--fail-on-new` compares the current analysis to the
            baseline and fails only when new findings appear.
          </p>
          <CodeBlock
            language="bash"
            title="first adoption"
            code={`safets baseline
git add .safets-baseline.json
git commit -m "chore: add safets baseline"
safets doctor --fail-on-new`}
          />
          <p>
            Regenerate the baseline intentionally when the team has fixed a set
            of old findings or changed SafeTS options. Do not regenerate it in
            every pull request, otherwise CI stops protecting against
            regressions.
          </p>
        </section>

        <section id="json-output">
          <h2>JSON output</h2>
          <p>
            `--json` is designed for bots, CI annotations, editor integrations,
            and AI agents. It includes a schema version, summary counts, baseline
            status when available, and normalized crash reports.
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
      "line": 18,
      "expr": "session.user.email"
    }
  ]
}`}
          />
        </section>

        <section id="exit-codes">
          <h2>Exit codes</h2>
          <p>
            Local exploration and CI have different needs. SafeTS is quiet when
            no findings are present, reports findings when detectors match, and
            can be configured to fail only on new findings when a baseline is
            present.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <h3>0</h3>
              <p>No blocking findings for the selected mode.</p>
            </Card>
            <Card>
              <h3>1</h3>
              <p>Findings or new findings should block the command.</p>
            </Card>
            <Card>
              <h3>2</h3>
              <p>Configuration, baseline, or program loading error.</p>
            </Card>
          </div>
        </section>

        <section id="known-limits">
          <h2>Known limits</h2>
          <p>
            SafeTS is intentionally conservative. It can miss flows that require
            deep interprocedural analysis, and it can report findings that a
            domain-specific invariant makes safe. Treat findings as review
            prompts: the goal is to surface suspicious runtime edges, not to
            prove a whole program correct.
          </p>
          <p>
            When a finding is valid, prefer small fixes: snapshot a narrowed
            value before `await`, add optional chaining, validate external data,
            or move environment reads into a typed configuration boundary.
          </p>
        </section>
      </DocsLayout>
    </SiteShell>
  );
}
