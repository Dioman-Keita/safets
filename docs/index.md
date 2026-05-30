---
layout: home

hero:
  name: "SafeTS"
  text: "Runtime crashes TypeScript can't detect."
  tagline: "Static analysis for the patterns strict mode misses. Powered by the TypeScript Compiler API."
  image:
    src: /logo.svg
    alt: SafeTS
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/Dioman-Keita/safets

features:
  - icon: 🔍
    title: Finds what TypeScript misses
    details: Even with strict mode enabled, TypeScript allows patterns that crash at runtime. SafeTS detects them before they reach production.

  - icon: ⚡
    title: Zero config
    details: Works with your existing tsconfig.json. No plugins, no babel, no extra setup. Just install and run.

  - icon: 🛡️
    title: Read-only — always safe
    details: SafeTS never modifies your source code. It only reports. You stay in control.

  - icon: 📊
    title: Baseline & CI
    details: Snapshot your current debt and block only new crashes in CI. Never block your team on legacy issues.

  - icon: 🎯
    title: 9 crash patterns
    details: Unsafe property access, unprotected JSON.parse, incomplete optional chaining, non-null assertions, and more.

  - icon: 🔬
    title: Crash path simulation
    details: Every finding shows the exact crash path — not just "possible undefined" but the full stack trace simulation.
---

<div class="home-stats">
  <div class="stat">
    <span class="stat-number">9</span>
    <span class="stat-label">crash patterns detected</span>
  </div>
  <div class="stat">
    <span class="stat-number">297</span>
    <span class="stat-label">findings on gemini-cli</span>
  </div>
  <div class="stat">
    <span class="stat-number">0</span>
    <span class="stat-label">source files modified</span>
  </div>
</div>

## Why SafeTS?

```ts
// TypeScript says: ✓ OK
function getPort() {
  return process.env.PORT.toString(); // ← crashes if PORT is not set
}

// SafeTS says:
// HIGH  Unsafe property access
//   process.env.PORT.toString
//   type: string | undefined
//   → process.env.PORT may be undefined at runtime
//   → Cannot read properties of undefined (reading 'toString')
```

TypeScript's type checker is excellent — but it deliberately allows some patterns that can crash at runtime. SafeTS is the second layer that catches what strict mode leaves behind.

## Install

```bash
npm install --save-dev @safets-org/cli typescript
```

## Quick start

```bash
# Scan your project
npx safets doctor

# Show fix suggestions
npx safets fix

# Save a baseline for CI
npx safets baseline

# Block new crashes in CI
npx safets doctor --fail-on-new
```

<style>
.home-stats {
  display: flex;
  justify-content: center;
  gap: 3rem;
  padding: 3rem 0;
  border-top: 1px solid var(--vp-c-divider);
  border-bottom: 1px solid var(--vp-c-divider);
  margin: 2rem 0;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.stat-number {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--vp-c-brand-1);
}

.stat-label {
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
}
</style>
