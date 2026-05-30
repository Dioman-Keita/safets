import {
  Activity,
  Blocks,
  BookOpen,
  Braces,
  FileJson,
  GitBranch,
  GitPullRequest,
  Map,
  Package,
  Radar,
  ShieldCheck,
  Terminal,
  TimerReset,
} from "lucide-react";

export const mainNav = [
  { label: "Docs", to: "/docs" },
  { label: "Rules", to: "/rules" },
  { label: "Install", to: "/install" },
  { label: "Playground", to: "/playground" },
  { label: "Changelog", to: "/changelog" },
  { label: "About", to: "/about" },
] as const;

export const docsGroups = [
  {
    title: "Start",
    items: [
      { label: "Overview", to: "/docs" },
      { label: "Installation", to: "/install" },
      { label: "Playground", to: "/playground" },
    ],
  },
  {
    title: "Analysis",
    items: [
      { label: "Rules and detectors", to: "/rules" },
      { label: "Baseline workflow", to: "/docs#baseline" },
      { label: "CI integration", to: "/install#ci" },
    ],
  },
  {
    title: "Project",
    items: [
      { label: "Changelog", to: "/changelog" },
      { label: "Philosophy", to: "/about" },
    ],
  },
] as const;

export const detectors = [
  {
    name: "Unsafe access after await",
    confidence: "MEDIUM",
    icon: TimerReset,
    summary:
      "Flags narrowing that becomes stale after an async boundary, especially around shared mutable state.",
    unsafe: `if (session.user) {
  await refreshSession()
  return session.user.email.toLowerCase()
}`,
    safe: `const user = session.user
await refreshSession()
return user?.email?.toLowerCase()`,
  },
  {
    name: "Unsafe property access",
    confidence: "HIGH",
    icon: Braces,
    summary:
      "Finds nested property reads where a parent expression can be null or undefined at runtime.",
    unsafe: `const city = account.profile.address.city`,
    safe: `const city = account.profile?.address?.city ?? "unknown"`,
  },
  {
    name: "Unsafe process.env access",
    confidence: "HIGH",
    icon: Terminal,
    summary:
      "Discourages direct env reads and non-null assertions in favor of a typed configuration boundary.",
    unsafe: `export const token = process.env.API_TOKEN!`,
    safe: `export const token = requiredEnv("API_TOKEN")`,
  },
  {
    name: "Unprotected JSON.parse",
    confidence: "HIGH",
    icon: FileJson,
    summary:
      "Detects JSON parsing without a local failure boundary or schema validation step.",
    unsafe: `const payload = JSON.parse(input)
return payload.user.name`,
    safe: `const payload = safeParse(input)
return payload.ok ? payload.value.user?.name : null`,
  },
  {
    name: "Unsafe Promise.all destructuring",
    confidence: "MEDIUM",
    icon: Blocks,
    summary:
      "Catches tuple destructuring that assumes every async result is present and shaped correctly.",
    unsafe: `const [user] = await Promise.all([loadUser(id)])
return user.name`,
    safe: `const [user] = await Promise.all([loadUser(id)])
return user?.name ?? "anonymous"`,
  },
  {
    name: "Unsafe Map/Record access",
    confidence: "HIGH",
    icon: Map,
    summary:
      "Flags key lookups followed by immediate property access without checking whether the key exists.",
    unsafe: `return handlers[event.type].run(event)`,
    safe: `return handlers[event.type]?.run(event)`,
  },
] as const;

export const installTabs = [
  {
    manager: "npm",
    install: "npm install --save-dev @safets-org/cli typescript",
    run: "npx safets doctor",
  },
  {
    manager: "pnpm",
    install: "pnpm add -D @safets-org/cli typescript",
    run: "pnpm exec safets doctor",
  },
  {
    manager: "Bun",
    install: "bun add -D @safets-org/cli typescript",
    run: "bunx safets doctor",
  },
] as const;

export const featureCards = [
  {
    title: "Async-aware checks",
    body: "SafeTS focuses on crash patterns that become visible around await, stale narrowing, optional data, and CI boundaries.",
    icon: Activity,
  },
  {
    title: "Compiler-backed",
    body: "Built on the TypeScript Compiler API, with type-aware detectors and project-relative reports.",
    icon: Radar,
  },
  {
    title: "Baseline friendly",
    body: "Adopt it in real codebases without blocking every existing issue. Commit debt once, block regressions forever.",
    icon: GitBranch,
  },
  {
    title: "Agent readable",
    body: "JSON output, fix suggestions, and an installable agent skill make reports easy for bots and humans to act on.",
    icon: BookOpen,
  },
] as const;

export const changelog = [
  {
    version: "1.0.1",
    date: "May 2026",
    title: "Vercel-safe docs and action reliability",
    items: [
      "GitHub Action installs SafeTS in an isolated npm prefix.",
      "Docs site emits Vercel Build Output with Nitro.",
      "Package smoke tests validate installed CLI behavior.",
    ],
  },
  {
    version: "1.0.0",
    date: "May 2026",
    title: "Stable CLI release",
    items: [
      "Published scoped package as @safets-org/cli.",
      "Added JSON reports, baseline workflow, and CI mode.",
      "Validated against real-world TypeScript repositories.",
    ],
  },
] as const;

export const trustedSignals = [
  "TypeScript Compiler API",
  "GitHub Actions",
  "npm, pnpm, Bun",
  "JSON reports",
  "Baseline workflow",
  "Agent skill",
] as const;

export const quickLinks = [
  { label: "Install CLI", to: "/install", icon: Package },
  { label: "Read rules", to: "/rules", icon: ShieldCheck },
  { label: "Try examples", to: "/playground", icon: GitPullRequest },
] as const;
