<script setup lang="ts">
import { computed, ref } from "vue";

type PackageManager = {
  name: string;
  install: string;
  run: string;
  fix: string;
  baseline: string;
  ci: string;
  note: string;
};

const managers: PackageManager[] = [
  {
    name: "npm",
    install: "npm install --save-dev @safets-org/cli typescript",
    run: "npx safets doctor",
    fix: "npx safets fix",
    baseline: "npx safets baseline",
    ci: "npx safets doctor --fail-on-new",
    note: "Use npm scripts for daily usage, or npx when you want to invoke the local binary directly.",
  },
  {
    name: "pnpm",
    install: "pnpm add -D @safets-org/cli typescript",
    run: "pnpm exec safets doctor",
    fix: "pnpm exec safets fix",
    baseline: "pnpm exec safets baseline",
    ci: "pnpm exec safets doctor --fail-on-new",
    note: "pnpm exec runs the SafeTS binary installed in the project dev dependencies.",
  },
  {
    name: "bun",
    install: "bun add -D @safets-org/cli typescript",
    run: "bunx safets doctor",
    fix: "bunx safets fix",
    baseline: "bunx safets baseline",
    ci: "bunx safets doctor --fail-on-new",
    note: "Bun users can install the package with bun add and invoke the binary with bunx.",
  },
];

const selected = ref(managers[0]);

const code = computed(() =>
  [
    "# Install",
    selected.value.install,
    "",
    "# Scan",
    selected.value.run,
    "",
    "# Suggestions",
    selected.value.fix,
    "",
    "# Baseline for CI",
    selected.value.baseline,
    selected.value.ci,
  ].join("\n"),
);
</script>

<template>
  <div class="pm-tabs">
    <div class="pm-tabs__buttons" role="tablist" aria-label="Package manager">
      <button
        v-for="manager in managers"
        :key="manager.name"
        :id="`pm-tabs-tab-${manager.name}`"
        type="button"
        role="tab"
        :aria-selected="selected.name === manager.name"
        aria-controls="pm-tabs-panel"
        class="pm-tabs__button"
        :class="{ 'pm-tabs__button--active': selected.name === manager.name }"
        @click="selected = manager"
      >
        {{ manager.name }}
      </button>
    </div>

    <div
      id="pm-tabs-panel"
      class="pm-tabs__panel"
      role="tabpanel"
      :aria-labelledby="`pm-tabs-tab-${selected.name}`"
    >
      <pre><code>{{ code }}</code></pre>
    </div>

    <p class="pm-tabs__note">{{ selected.note }}</p>
  </div>
</template>
