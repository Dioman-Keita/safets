import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Github, Play, ShieldCheck } from "lucide-react";
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

function HomePage() {
  return (
    <SiteShell>
      <main>
        <section className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8 text-center"
          >
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-lg bg-card px-3 py-1.5 text-sm font-medium text-muted">
                <ShieldCheck className="h-4 w-4" />
                TypeScript safety tooling for async correctness
              </div>
              <h1 className="mx-auto max-w-5xl text-balance text-5xl font-extrabold leading-tight tracking-[-0.055em] text-foreground sm:text-6xl lg:text-7xl">
                SafeTS
              </h1>
              <p className="mx-auto max-w-2xl text-xl text-muted">
                Static analysis for the crashes hiding behind await.
              </p>
            </div>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
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
            <div className="grid gap-3 sm:grid-cols-3">
              {quickLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="group rounded-lg bg-card p-4 text-left transition hover:bg-secondary"
                >
                  <link.icon className="mb-4 h-5 w-5 text-muted" />
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
            className="mt-10"
          >
            <img
              src="/docs-hero.jpg"
              alt="A laptop with TypeScript code open, matching the SafeTS documentation theme"
              className="h-auto w-full rounded-lg object-cover"
            />
          </motion.div>
        </section>

        <section className="border-y border-border px-6 py-8">
          <div className="mx-auto flex max-w-[90rem] flex-wrap items-center justify-center gap-x-8 gap-y-4">
            {trustedSignals.map((signal) => (
              <span key={signal} className="font-mono text-xs uppercase tracking-[0.2em] text-subtle">
                {signal}
              </span>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
          <SectionHeader
            eyebrow="Why SafeTS?"
            title="A narrow, serious layer for runtime safety."
            body="SafeTS is intentionally not a formatter, not a broad linter, and not a replacement for tests. It is a focused crash detector for code paths TypeScript can type-check but production can still punish."
          />
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featureCards.map((feature) => (
              <Card key={feature.title}>
                <feature.icon className="mb-8 h-6 w-6 text-muted" />
                <h3 className="text-lg font-semibold">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted">{feature.body}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
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

        <section className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
          <Card className="overflow-hidden p-0">
            <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="p-8 sm:p-12">
                <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-border px-3 py-1 text-sm text-muted">
                  <Play className="h-3.5 w-3.5" />
                  CI ready
                </div>
                <h2 className="text-3xl font-bold tracking-[-0.035em]">
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
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-balance text-3xl font-bold tracking-[-0.035em] sm:text-4xl">
        {title}
      </h2>
      <p className="mt-5 text-lg leading-8 text-muted">{body}</p>
    </div>
  );
}
