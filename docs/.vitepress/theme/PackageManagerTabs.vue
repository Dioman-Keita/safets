<script setup lang="ts">
import { computed, ref } from "vue";

const props = withDefaults(
  defineProps<{
    mode?: PackageManagerMode | string;
  }>(),
  {
    mode: "install",
  },
);

type PackageManagerMode = "install" | "doctor" | "fix" | "debt" | "baseline";

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

const commandLabels: Record<PackageManagerMode, string> = {
  install: "Install + first scan",
  doctor: "Scan your project",
  fix: "Print suggestions",
  debt: "Show debt overview",
  baseline: "Create a CI baseline",
};

const isPackageManagerMode = (mode: string): mode is PackageManagerMode =>
  Object.hasOwn(commandLabels, mode);

const resolvedMode = computed<PackageManagerMode>(() => {
  const mode = props.mode ?? "install";
  return isPackageManagerMode(mode) ? mode : "install";
});

const code = computed(() => {
  const debtCommand =
    selected.value.name === "npm"
      ? "npx safets debt"
      : selected.value.name === "pnpm"
        ? "pnpm exec safets debt"
        : "bunx safets debt";

  const commands: Record<PackageManagerMode, string[]> = {
    install: [
      "# Install",
      selected.value.install,
      "",
      "# First scan",
      selected.value.run,
    ],
    doctor: [selected.value.run],
    fix: [selected.value.fix],
    debt: [debtCommand],
    baseline: [
      selected.value.baseline,
      selected.value.ci,
    ],
  };

  return commands[resolvedMode.value].join("\n");
});

const panelId = computed(() => `pm-tabs-panel-${resolvedMode.value}`);
const selectedTabId = computed(() => `pm-tabs-tab-${resolvedMode.value}-${selected.value.name}`);
</script>

<template>
  <div class="pm-tabs">
    <div class="pm-tabs__buttons" role="tablist" aria-label="Package manager">
      <button
        v-for="manager in managers"
        :key="manager.name"
        :id="`pm-tabs-tab-${resolvedMode}-${manager.name}`"
        type="button"
        role="tab"
        :aria-selected="selected.name === manager.name"
        :aria-controls="panelId"
        class="pm-tabs__button"
        :class="{ 'pm-tabs__button--active': selected.name === manager.name }"
        @click="selected = manager"
      >
        {{ manager.name }}
      </button>
    </div>

    <div
      :id="panelId"
      class="pm-tabs__panel"
      role="tabpanel"
      :aria-labelledby="selectedTabId"
    >
      <div class="pm-tabs__label">{{ commandLabels[resolvedMode] }}</div>
      <pre><code>{{ code }}</code></pre>
    </div>

    <p class="pm-tabs__note">{{ selected.note }}</p>
  </div>
</template>
