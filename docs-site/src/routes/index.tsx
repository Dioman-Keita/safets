import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Github, Play, ShieldCheck, Terminal } from "lucide-react";
import { motion } from "motion/react";
import { CodeBlock } from "@/components/code-block";
import { DetectorCard } from "@/components/detector-card";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  detectors,
  featureCards,
  quickLinks,
  trustedSignals,
} from "@/lib/site-data";

export const Route = createFileRoute("/")({
  component: HomePage,
});

const heroCode = `type Session = {
  user?: { email?: string }
}

async function sendReceipt(session: Session) {
  if (!session.user) return

  await refreshBillingState()

  // SafeTS: narrowing may be stale after await
  return session.user.email.toLowerCase()
}`;

function HomePage() {
  return (
    <SiteShell>
      <main>
        <section className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-28">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-300/20 bg-indigo-400/10 px-4 py-2 font-mono text-xs uppercase tracking-[0.18em] text-indigo-200">
              <ShieldCheck className="h-4 w-4" />
              TypeScript safety tooling for async correctness
            </div>
            <h1 className="max-w-5xl text-balance text-5xl font-semibold leading-[0.92] tracking-[-0.065em] text-foreground sm:text-7xl lg:text-8xl">
              Static analysis for the crashes hiding behind await.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-muted sm:text-xl">
              SafeTS scans TypeScript projects for runtime crash patterns that strict mode can still miss: stale async narrowing, unsafe env access, optional data, unguarded JSON, and brittle collection lookups.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link to="/docs">
                  Get Started
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <a href="https://github.com/Dioman-Keita/safets">
                  <Github />
                  GitHub
                </a>
              </Button>
            </div>
            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {quickLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="group rounded-2xl border border-border bg-card/60 p-4 transition hover:-translate-y-0.5 hover:border-indigo-300/30 hover:bg-card"
                >
                  <link.icon className="mb-4 h-5 w-5 text-indigo-300" />
                  <span className="text-sm font-medium text-muted group-hover:text-foreground">
                    {link.label}
                  </span>
                </Link>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.12 }}
            className="relative"
          >
            <div className="absolute -inset-8 rounded-[3rem] bg-indigo-500/10 blur-3xl" />
            <CodeBlock
              title="async-correctness.ts"
              code={heroCode}
              className="relative animate-float"
            />
            <Card className="absolute -bottom-8 left-6 hidden max-w-sm border-indigo-300/20 bg-[#0b1020]/90 p-4 shadow-2xl shadow-indigo-950/40 backdrop-blur md:block">
              <div className="mb-2 flex items-center gap-2 font-mono text-xs text-indigo-200">
                <Terminal className="h-4 w-4" />
                safets doctor
              </div>
              <p className="text-sm text-muted">
                Unsafe access after await detected at line 10. Snapshot the value or keep access optional.
              </p>
            </Card>
          </motion.div>
        </section>

        <section className="border-y border-border/70 bg-card/30 px-4 py-10">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-4">
            {trustedSignals.map((signal) => (
              <span key={signal} className="font-mono text-xs uppercase tracking-[0.2em] text-subtle">
                {signal}
              </span>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
          <SectionHeader
            eyebrow="Why SafeTS?"
            title="A narrow, serious layer for runtime safety."
            body="SafeTS is intentionally not a formatter, not a broad linter, and not a replacement for tests. It is a focused crash detector for code paths TypeScript can type-check but production can still punish."
          />
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {featureCards.map((feature) => (
              <Card key={feature.title} className="transition hover:-translate-y-1 hover:border-indigo-300/25">
                <feature.icon className="mb-8 h-6 w-6 text-indigo-300" />
                <h3 className="text-lg font-semibold">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted">{feature.body}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
          <SectionHeader
            eyebrow="Detector model"
            title="Readable findings, realistic fixes."
            body="Every detector is designed to explain the risk, point to a crash path, and keep the suggested fix small enough for code review."
          />
          <div className="mt-12 grid gap-6">
            {detectors.slice(0, 3).map((detector) => (
              <DetectorCard key={detector.name} {...detector} />
            ))}
          </div>
          <div className="mt-8">
            <Button asChild variant="secondary">
              <Link to="/rules">
                View all detectors
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
          <Card className="overflow-hidden p-0">
            <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="p-8 sm:p-12">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-300/20 bg-indigo-400/10 px-3 py-1 font-mono text-xs uppercase tracking-[0.18em] text-indigo-200">
                  <Play className="h-3.5 w-3.5" />
                  CI ready
                </div>
                <h2 className="text-4xl font-semibold tracking-[-0.04em]">
                  Adopt without stopping the team.
                </h2>
                <p className="mt-4 text-muted">
                  Generate a baseline once, commit it, and only fail pull requests when new crash patterns appear.
                </p>
              </div>
              <CodeBlock
                title=".github/workflows/safets.yml"
                className="h-full rounded-none border-0"
                language="yaml"
                code={`name: SafeTS

on:
  pull_request:

jobs:
  safety:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: Dioman-Keita/safets@v1.0.1
        with:
          version: 1.0.1
          fail-on-new: "true"`}
              />
            </div>
          </Card>
        </section>
      </main>
    </SiteShell>
  );
}

function SectionHeader({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="max-w-3xl">
      <p className="font-mono text-xs uppercase tracking-[0.24em] text-indigo-300">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-balance text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
        {title}
      </h2>
      <p className="mt-5 text-lg leading-8 text-muted">{body}</p>
    </div>
  );
}
