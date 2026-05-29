# SafeTS With TanStack Start, shadcn/ui, Tailwind CSS, And Dark Mode

This guide shows how to add SafeTS to a modern TanStack Start app using shadcn/ui, Tailwind CSS, and class-based dark mode.

The goal is simple: keep the app visually polished, keep the TypeScript runtime-safety feedback loop tight, and make the setup work with npm, pnpm, or Bun.

## Stack

- TanStack Start for the full-stack React application
- shadcn/ui for copy-owned UI components
- Tailwind CSS for styling
- Class-based dark mode with a `.dark` selector
- SafeTS for detecting runtime crash patterns that TypeScript can miss

## Create The App

Create a TanStack Start project:

```bash
npx @tanstack/cli@latest create
cd my-app
npm install
```

With pnpm:

```bash
pnpm dlx @tanstack/cli@latest create
cd my-app
pnpm install
```

With Bun:

```bash
bunx @tanstack/cli@latest create
cd my-app
bun install
```

Run the app:

```bash
npm run dev
```

Use the equivalent package-manager command if your project uses pnpm or Bun.

## Add shadcn/ui Components

If the project was created with TanStack Start and Tailwind CSS, initialize shadcn/ui with the TanStack template:

```bash
npx shadcn@latest init -t start
```

If the template is not appropriate for your app, use the standard initializer instead:

```bash
npx shadcn@latest init
```

Add a few components used by this guide:

```bash
npx shadcn@latest add button card dropdown-menu
```

With pnpm:

```bash
pnpm dlx shadcn@latest add button card dropdown-menu
```

With Bun:

```bash
bunx shadcn@latest add button card dropdown-menu
```

## Enable Tailwind Dark Mode

Use a selector-driven dark mode so the app can toggle the `dark` class on the document root.

In your global stylesheet, keep the Tailwind import and add the dark custom variant:

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));
```

This makes Tailwind `dark:` utilities respond to the `.dark` class.

## Add A Theme Provider

Create `src/components/theme-provider.tsx`:

```tsx
import { ScriptOnce } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

type ThemeProviderValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeProviderContext = createContext<ThemeProviderValue | null>(null);

const storageKey = "ui-theme";

function applyTheme(theme: Theme) {
  const root = window.document.documentElement;
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
  const nextTheme = theme === "system" ? systemTheme : theme;

  root.classList.remove("light", "dark");
  root.classList.add(nextTheme);
}

const themeScript = `
(() => {
  const storageKey = "${storageKey}";
  const storedTheme = localStorage.getItem(storageKey) || "system";
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
  const nextTheme = storedTheme === "system" ? systemTheme : storedTheme;

  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(nextTheme);
})();
`;

export function ThemeProvider({
  children,
  defaultTheme = "system",
}: {
  children: ReactNode;
  defaultTheme?: Theme;
}) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return defaultTheme;
    return (localStorage.getItem(storageKey) as Theme | null) ?? defaultTheme;
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = (nextTheme: Theme) => {
    localStorage.setItem(storageKey, nextTheme);
    setThemeState(nextTheme);
  };

  return (
    <ThemeProviderContext.Provider value={{ theme, setTheme }}>
      <ScriptOnce children={themeScript} />
      {children}
    </ThemeProviderContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeProviderContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
```

## Wrap The Root Route

In your root route, wrap the app with `ThemeProvider`.

For example, in `src/routes/__root.tsx`:

```tsx
import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { ThemeProvider } from "@/components/theme-provider";
import appCss from "@/styles/app.css?url";

export const Route = createRootRoute({
  head: () => ({
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-background text-foreground antialiased">
        <ThemeProvider defaultTheme="system">
          <Outlet />
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
```

Adjust import aliases to match your generated TanStack Start project.

## Add A Mode Toggle

Create `src/components/mode-toggle.tsx`:

```tsx
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/components/theme-provider";

export function ModeToggle() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Toggle theme">
          <Sun className="h-4 w-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute h-4 w-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

Then place `<ModeToggle />` in your header or layout.

## Add SafeTS

Install SafeTS and TypeScript as development dependencies:

```bash
npm install --save-dev @safets-org/cli typescript
```

With pnpm:

```bash
pnpm add -D @safets-org/cli typescript
```

With Bun:

```bash
bun add -D @safets-org/cli typescript
```

Add scripts to `package.json`:

```json
{
  "scripts": {
    "safets": "safets doctor",
    "safets:json": "safets doctor --json",
    "safets:fix": "safets fix",
    "safets:baseline": "safets baseline",
    "safets:ci": "safets doctor --fail-on-new"
  }
}
```

Run SafeTS locally:

```bash
npm run safets
```

With pnpm:

```bash
pnpm safets
```

With Bun:

```bash
bun run safets
```

## Make Environment Access Safe

TanStack Start apps often read server and client configuration from environment variables. Avoid using `process.env.MY_KEY!` directly in app code.

Create a small helper instead:

```ts
function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const serverConfig = {
  databaseUrl: requiredEnv("DATABASE_URL"),
};
```

This pattern gives SafeTS and future maintainers a clear runtime guard instead of a non-null assertion.

## Baseline Existing Debt

If the project already has findings, create a baseline:

```bash
npm run safets:baseline
```

Commit `.safets-baseline.json`:

```bash
git add .safets-baseline.json
git commit -m "chore: add safets baseline"
```

Then enforce only new findings in CI:

```bash
npm run safets:ci
```

Regenerate the baseline only when you intentionally accept the current state as the new snapshot.

## Add GitHub Actions

Use the SafeTS action in `.github/workflows/safets.yml`:

```yaml
name: SafeTS

on:
  pull_request:
  push:
    branches: [main]

jobs:
  safets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: Dioman-Keita/safets@v1.0.1
        with:
          version: 1.0.1
          fail-on-new: "true"
```

The action installs the SafeTS CLI in an isolated npm prefix, so it can be used in npm, pnpm, or Bun projects without changing your app's package manager.

## Release Checklist For The App

Before shipping a TanStack Start feature:

```bash
npm run safets
npm run safets:fix
npm run safets:ci
```

Also run your normal app checks:

```bash
npm run build
npm test
```

SafeTS does not replace tests, linting, formatting, or runtime validation. It adds a focused runtime-crash safety layer.

## Troubleshooting

- If SafeTS reports env access, add a guard function instead of using `process.env.KEY!`.
- If SafeTS reports optional data from loaders or server functions, narrow the value before accessing nested properties.
- If a finding exists in legacy code, create a baseline and use `--fail-on-new` to avoid blocking unrelated work.
- If test files should be scanned, use `safets doctor --include-tests` and regenerate the baseline with the same option.

## References

- [TanStack Start getting started](https://tanstack.com/start/latest/docs/framework/react/getting-started)
- [shadcn/ui TanStack installation](https://ui.shadcn.com/docs/installation/tanstack)
- [shadcn/ui dark mode for TanStack Start](https://ui.shadcn.com/docs/dark-mode/tanstack-start)
- [Tailwind CSS dark mode](https://tailwindcss.com/docs/dark-mode)
