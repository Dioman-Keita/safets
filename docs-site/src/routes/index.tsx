import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Github, Play } from "lucide-react";
import { motion } from "motion/react";
import { CodeBlock } from "@/components/code-block";
import { DetectorCard } from "@/components/detector-card";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  detectors,
  featureCards,
} from "@/lib/site-data";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <SiteShell>
      <main>
        <section className="relative mx-auto flex max-w-[980px] flex-col items-center gap-2 overflow-hidden px-5 py-8 text-center md:py-12 md:pb-8 lg:py-24 lg:pb-20">
          <div className="opendocs-vortex pointer-events-none fixed left-0 top-[-10rem] -z-10 h-full w-full overflow-hidden" />
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex w-full flex-col items-center gap-2"
          >
            <Link
              to="/docs"
              className="group inline-flex items-center rounded-lg border border-input bg-card/80 px-3 py-1 text-sm font-medium backdrop-blur-lg dark:bg-card/30"
            >
              <span>SafeTS 1.0 is available</span>
              <ArrowRight className="ml-1 h-4 w-4 transition group-hover:translate-x-1" />
            </Link>

            <div className="relative mt-4">
              <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 text-8xl font-bold tracking-tighter text-foreground/[0.035] sm:text-9xl">
                docs
              </div>
              <h1 className="mx-auto max-w-4xl text-balance text-3xl font-bold leading-tight tracking-tighter text-foreground md:text-6xl lg:leading-[1.1] dark:bg-linear-to-r dark:from-slate-50 dark:to-slate-200 dark:bg-clip-text dark:text-transparent">
                TypeScript safety tooling for async correctness.
              </h1>
            </div>

            <p className="mt-4 max-w-[750px] text-lg text-muted sm:text-xl">
              Find runtime crash patterns TypeScript can miss, adopt with a
              baseline, and keep pull requests focused on new safety regressions.
            </p>

            <div className="flex w-full flex-wrap items-center justify-center gap-3 py-4 md:pb-10">
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

            <CodeBlock
              title="terminal"
              language="bash"
              className="relative mt-2 w-full max-w-xl text-left"
              code="npx safets doctor --fail-on-new"
            />
          </motion.div>
        </section>

        <section className="container mx-auto max-w-screen-2xl px-5 py-10 sm:py-14">
          <SectionHeader
            eyebrow="Why SafeTS?"
            title="A narrow, serious layer for runtime safety."
            body="SafeTS is intentionally not a formatter, not a broad linter, and not a replacement for tests. It is a focused crash detector for code paths TypeScript can type-check but production can still punish."
          />
          <div className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-2 2xl:grid-cols-4">
            {featureCards.map((feature) => (
              <Card key={feature.title} className="bg-card/80 dark:bg-card/30">
                <div className="mb-4 flex w-11 items-center justify-center rounded-md bg-secondary px-3 py-2 text-center text-lg">
                  <feature.icon className="h-5 w-5 text-muted" />
                </div>
                <h3 className="text-lg font-semibold">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted">{feature.body}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="container mx-auto max-w-screen-2xl px-5 py-10 sm:py-14">
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

        <section className="container mx-auto max-w-screen-2xl px-5 py-10 sm:py-14">
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
      - uses: Dioman-Keita/safets@v1.0.2
        with:
          version: 1.0.2
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
