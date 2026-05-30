import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Code2,
  Github,
  Moon,
  Package,
  ShieldCheck,
  Sparkles,
  Terminal,
} from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  component: HomePage,
});

const packageManagers = [
  {
    name: "npm",
    install: "npm install --save-dev @safets-org/cli typescript",
    run: "npx safets doctor",
  },
  {
    name: "pnpm",
    install: "pnpm add -D @safets-org/cli typescript",
    run: "pnpm exec safets doctor",
  },
  {
    name: "Bun",
    install: "bun add -D @safets-org/cli typescript",
    run: "bunx safets doctor",
  },
];

const patterns = [
  "Unsafe property access",
  "Unsafe destructuring",
  "Unsafe array index access",
  "Unprotected JSON.parse",
  "Unsafe process.env access",
  "Non-null assertion on nullable",
  "Unsafe access after await",
  "Unsafe Promise.all destructuring",
  "Unsafe Map/Record access",
];

const workflow = [
  {
    title: "Install",
    body: "Add SafeTS as a dev dependency next to the TypeScript compiler already used by your app.",
  },
  {
    title: "Scan",
    body: "Run doctor locally to find runtime crash patterns before code review or production.",
  },
  {
    title: "Baseline",
    body: "Commit the existing debt snapshot once, then block only new findings in CI.",
  },
  {
    title: "Automate",
    body: "Use the GitHub Action or your package manager scripts to keep the feedback loop permanent.",
  },
];

function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f3ea] text-slate-950 dark:bg-[#080b12] dark:text-white">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-[-15%] top-[-20%] h-[34rem] w-[34rem] rounded-full bg-amber-300/35 blur-3xl dark:bg-cyan-500/20" />
        <div className="absolute right-[-10%] top-[20%] h-[28rem] w-[28rem] rounded-full bg-emerald-300/25 blur-3xl dark:bg-emerald-400/15" />
        <div className="absolute bottom-[-20%] left-[25%] h-[32rem] w-[32rem] rounded-full bg-rose-300/25 blur-3xl dark:bg-indigo-500/15" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.05)_1px,transparent_1px)] bg-[size:42px_42px] dark:bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)]" />
      </div>

      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6">
        <a href="#top" className="flex items-center gap-3 font-black tracking-tight">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/20 dark:bg-white dark:text-slate-950">
            S
          </span>
          <span>SafeTS</span>
        </a>
        <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-600 dark:text-slate-300 md:flex">
          <a href="#install" className="hover:text-slate-950 dark:hover:text-white">
            Install
          </a>
          <a href="#ci" className="hover:text-slate-950 dark:hover:text-white">
            CI
          </a>
          <a href="#agents" className="hover:text-slate-950 dark:hover:text-white">
            Agents
          </a>
        </nav>
        <ModeToggle />
      </header>

      <section id="top" className="mx-auto grid max-w-7xl gap-10 px-6 pb-20 pt-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:pt-20">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-950/10 bg-white/60 px-4 py-2 text-sm font-bold text-slate-700 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Runtime safety docs for TypeScript teams
          </div>
          <h1 className="max-w-4xl text-balance text-5xl font-black leading-[0.95] tracking-[-0.055em] sm:text-7xl lg:text-8xl">
            Catch the crashes TypeScript lets through.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-700 dark:text-slate-300">
            SafeTS is a read-only devtool that scans TypeScript projects for common runtime crash patterns: unsafe property access, nullable non-null assertions, unguarded env access, stale narrowing after await, and more.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <a href="#install">
                Start the guide
                <ArrowRight />
              </a>
            </Button>
            <Button asChild variant="secondary">
              <a href="https://github.com/Dioman-Keita/safets">
                <Github />
                GitHub
              </a>
            </Button>
          </div>
        </div>

        <Card className="relative overflow-hidden bg-slate-950 p-0 text-white dark:bg-black/60">
          <div className="border-b border-white/10 px-5 py-4">
            <div className="flex gap-2">
              <span className="h-3 w-3 rounded-full bg-rose-400" />
              <span className="h-3 w-3 rounded-full bg-amber-300" />
              <span className="h-3 w-3 rounded-full bg-emerald-400" />
            </div>
          </div>
          <pre className="overflow-x-auto p-6 text-sm leading-7 text-slate-200">
            <code>{`$ safets doctor

SafeTS v1.0.1
Finds common runtime crashes TypeScript can't detect

Runtime Safety Report
src/config.ts:4:18
Unsafe process.env access

Suggestion:
Guard env values once, then export typed config.`}</code>
          </pre>
        </Card>
      </section>

      <section id="install" className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-8 flex items-end justify-between gap-6">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-emerald-700 dark:text-emerald-300">
              Installation
            </p>
            <h2 className="mt-3 text-4xl font-black tracking-[-0.04em]">
              Works with npm, pnpm, and Bun.
            </h2>
          </div>
          <Package className="hidden h-12 w-12 text-slate-400 md:block" />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {packageManagers.map((manager) => (
            <Card key={manager.name}>
              <h3 className="text-xl font-black">{manager.name}</h3>
              <CodeBlock value={manager.install} />
              <CodeBlock value={manager.run} />
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-16 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-rose-700 dark:text-rose-300">
            Coverage
          </p>
          <h2 className="mt-3 text-4xl font-black tracking-[-0.04em]">
            Nine practical crash patterns.
          </h2>
          <p className="mt-5 text-slate-700 dark:text-slate-300">
            SafeTS focuses on patterns that show up in real production code, not stylistic preferences.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {patterns.map((pattern) => (
            <div
              key={pattern}
              className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white/55 p-4 font-semibold dark:border-white/10 dark:bg-white/[0.05]"
            >
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
              {pattern}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-4 md:grid-cols-4">
          {workflow.map((step, index) => (
            <Card key={step.title}>
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-lg font-black text-white dark:bg-white dark:text-slate-950">
                {index + 1}
              </div>
              <h3 className="text-xl font-black">{step.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {step.body}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section id="ci" className="mx-auto grid max-w-7xl gap-6 px-6 py-16 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-300" />
            <h2 className="text-3xl font-black tracking-[-0.035em]">
              Baseline without freezing delivery.
            </h2>
          </div>
          <p className="text-slate-700 dark:text-slate-300">
            Commit `.safets-baseline.json` once, then run `safets doctor --fail-on-new` to block only new runtime-crash risks.
          </p>
          <CodeBlock value={`safets baseline
git add .safets-baseline.json
safets doctor --fail-on-new`} />
        </Card>
        <Card>
          <div className="mb-4 flex items-center gap-3">
            <Terminal className="h-6 w-6 text-cyan-600 dark:text-cyan-300" />
            <h2 className="text-3xl font-black tracking-[-0.035em]">
              GitHub Action ready.
            </h2>
          </div>
          <CodeBlock
            value={`- uses: Dioman-Keita/safets@v1.0.1
  with:
    version: 1.0.1
    fail-on-new: "true"`}
          />
        </Card>
      </section>

      <section id="agents" className="mx-auto max-w-7xl px-6 py-16">
        <Card className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-center">
          <div>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
              <Bot />
            </div>
            <h2 className="text-4xl font-black tracking-[-0.04em]">
              Agent skill, not Codex lock-in.
            </h2>
            <p className="mt-4 text-slate-700 dark:text-slate-300">
              SafeTS ships an installable skill for agents that support the `skills` CLI. Codex is one supported target, not a required runtime.
            </p>
          </div>
          <div>
            <CodeBlock value="npx skills add Dioman-Keita/safets" />
            <CodeBlock value="npx skills add Dioman-Keita/safets --skill safets-agent -a codex -g -y" />
          </div>
        </Card>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <Card className="overflow-hidden bg-slate-950 text-white dark:bg-white dark:text-slate-950">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.7fr] lg:items-center">
            <div>
              <div className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.25em] text-amber-300 dark:text-amber-600">
                <Moon className="h-4 w-4" />
                Dark mode included
              </div>
              <h2 className="text-4xl font-black tracking-[-0.04em]">
                Built as a real docs surface, deployable as one Vercel folder.
              </h2>
            </div>
            <p className="text-slate-300 dark:text-slate-700">
              The site uses TanStack Start routing, shadcn-style components, Tailwind CSS v4, and a class-based theme provider.
            </p>
          </div>
        </Card>
      </section>
    </main>
  );
}

function CodeBlock({ value }: { value: string }) {
  return (
    <pre className="mt-4 overflow-x-auto rounded-2xl bg-slate-950 p-4 text-sm leading-6 text-slate-100 shadow-inner dark:bg-black/70">
      <code>{value}</code>
    </pre>
  );
}
