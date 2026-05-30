import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, FileCode2, Terminal } from "lucide-react";
import { useState } from "react";
import { CodeBlock } from "@/components/code-block";
import { DocsLayout } from "@/components/docs-layout";
import { SiteShell } from "@/components/site-shell";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/playground")({
  component: PlaygroundPage,
});

const scenarios = [
  {
    id: "checkout",
    label: "Checkout session",
    command: "npx safets doctor --json",
    file: "src/checkout/session.ts",
    pattern: "Unsafe access after await",
    confidence: "MEDIUM",
    unsafe: `type Session = {
  user?: { email?: string }
}

export async function sendReceipt(session: Session) {
  if (!session.user) return

  await refreshBillingState()

  return session.user.email.toLowerCase()
}`,
    output: `SafeTS found 1 potential runtime crash

src/checkout/session.ts:9:10
  Pattern: Unsafe access after await
  Confidence: MEDIUM
  Why: session.user was checked before an await boundary.

Suggested fix:
  Snapshot the narrowed value before await, or keep access optional.`,
    safe: `export async function sendReceipt(session: Session) {
  const user = session.user
  if (!user) return

  await refreshBillingState()

  return user.email?.toLowerCase()
}`,
  },
  {
    id: "webhook",
    label: "Webhook payload",
    command: "pnpm exec safets doctor --json",
    file: "src/api/webhook.ts",
    pattern: "Unprotected JSON.parse",
    confidence: "HIGH",
    unsafe: `export async function POST(req: Request) {
  const raw = await req.text()
  const payload = JSON.parse(raw)

  return Response.json({
    userId: payload.data.user.id,
  })
}`,
    output: `SafeTS found 1 potential runtime crash

src/api/webhook.ts:3:19
  Pattern: Unprotected JSON.parse
  Confidence: HIGH
  Why: JSON.parse can throw and payload shape is unknown.

Suggested fix:
  Parse inside a failure boundary and validate before nested access.`,
    safe: `export async function POST(req: Request) {
  const raw = await req.text()
  const payload = safeJson(raw)

  return Response.json({
    userId: payload.ok ? payload.value.data?.user?.id : null,
  })
}`,
  },
  {
    id: "config",
    label: "Runtime config",
    command: "bunx safets doctor --json",
    file: "src/config.ts",
    pattern: "Unsafe process.env access",
    confidence: "HIGH",
    unsafe: `export const config = {
  stripeKey: process.env.STRIPE_SECRET_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
}`,
    output: `SafeTS found 2 potential runtime crashes

src/config.ts:2:14
src/config.ts:3:18
  Pattern: Unsafe process.env access
  Confidence: HIGH
  Why: non-null assertions hide missing deployment config.

Suggested fix:
  Move env reads into a typed requiredEnv boundary.`,
    safe: `export const config = {
  stripeKey: requiredEnv("STRIPE_SECRET_KEY"),
  webhookSecret: requiredEnv("STRIPE_WEBHOOK_SECRET"),
}`,
  },
] as const;

function PlaygroundPage() {
  const [activeId, setActiveId] = useState<(typeof scenarios)[number]["id"]>("checkout");
  const [showFix, setShowFix] = useState(false);
  const activeScenario = scenarios.find((scenario) => scenario.id === activeId) ?? scenarios[0];

  return (
    <SiteShell>
      <DocsLayout
        eyebrow="Playground"
        title="Simulate a SafeTS review."
        description="This frontend-only playground models how SafeTS findings show up in a real pull request before we ship a full in-browser analyzer."
        toc={[
          { label: "Scenario", href: "#scenario" },
          { label: "Finding", href: "#finding" },
          { label: "Fix", href: "#fix" },
          { label: "Workflow", href: "#workflow" },
        ]}
      >
        <section id="scenario">
          <h2>Choose a production-like scenario</h2>
          <p>
            Pick a common runtime-risk pattern. The code sample, SafeTS output,
            and suggested patch update together so you can understand the review
            loop without installing anything.
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            {scenarios.map((scenario) => (
              <button
                key={scenario.id}
                type="button"
                onClick={() => {
                  setActiveId(scenario.id);
                  setShowFix(false);
                }}
                className={[
                  "rounded-lg bg-card p-4 text-left transition hover:bg-secondary",
                  activeScenario.id === scenario.id ? "ring-2 ring-primary" : "",
                ].join(" ")}
              >
                <span className="text-sm font-semibold text-foreground">{scenario.label}</span>
                <span className="mt-2 block text-xs uppercase tracking-[0.18em] text-muted">
                  {scenario.confidence} confidence
                </span>
              </button>
            ))}
          </div>
        </section>

        <section id="finding">
          <h2>Finding preview</h2>
          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <CodeBlock title={activeScenario.file} code={activeScenario.unsafe} />
            <Card>
              <div className="mb-4 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-primary" />
                <div>
                  <h3>{activeScenario.pattern}</h3>
                  <p className="mt-1 text-sm text-muted">
                    {activeScenario.confidence} confidence finding from SafeTS.
                  </p>
                </div>
              </div>
              <CodeBlock
                title="terminal"
                language="text"
                className="mt-4"
                code={activeScenario.output}
              />
            </Card>
          </div>
        </section>

        <section id="fix">
          <h2>Suggested patch</h2>
          <p>
            SafeTS is read-only. It explains the risk and prints a small manual
            fix candidate, but it never modifies your source code.
          </p>
          <button
            type="button"
            onClick={() => setShowFix((value) => !value)}
            className="mb-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-background transition hover:bg-primary/90"
          >
            {showFix ? "Hide suggested fix" : "Show suggested fix"}
          </button>
          {showFix ? (
            <CodeBlock title="suggested-safe-version.ts" code={activeScenario.safe} />
          ) : (
            <Card className="flex items-center gap-3">
              <FileCode2 className="h-5 w-5 text-muted" />
              <p className="m-0 text-sm text-muted">
                Click the button to reveal the safer version for this scenario.
              </p>
            </Card>
          )}
        </section>

        <section id="workflow">
          <h2>How this maps to the real CLI</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <Terminal className="mb-4 h-5 w-5 text-primary" />
              <h3>Run analysis</h3>
              <CodeBlock language="bash" code={activeScenario.command} />
            </Card>
            <Card>
              <AlertTriangle className="mb-4 h-5 w-5 text-primary" />
              <h3>Review finding</h3>
              <p className="text-sm text-muted">
                SafeTS reports file, line, pattern, confidence, and a short
                explanation suitable for code review.
              </p>
            </Card>
            <Card>
              <CheckCircle2 className="mb-4 h-5 w-5 text-primary" />
              <h3>Apply fix</h3>
              <p className="text-sm text-muted">
                You keep control of the code change. SafeTS provides the safety
                reasoning and leaves the patch to the developer.
              </p>
            </Card>
          </div>
        </section>
      </DocsLayout>
    </SiteShell>
  );
}
