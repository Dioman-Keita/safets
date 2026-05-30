import { Link } from "@tanstack/react-router";
import { Github, Menu, Search } from "lucide-react";
import type { ReactNode } from "react";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { mainNav } from "@/lib/site-data";
import { cn } from "@/lib/utils";

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <BackgroundTexture />
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            <LogoMark />
            <div>
              <div className="text-sm font-semibold tracking-tight">SafeTS</div>
              <div className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-muted sm:block">
                async correctness
              </div>
            </div>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {mainNav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-full px-3 py-2 text-sm text-muted transition hover:bg-white/[0.06] hover:text-foreground"
                activeProps={{ className: "bg-white/[0.08] text-foreground" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <SearchBox compact />
            <Button asChild variant="ghost" size="icon" className="hidden sm:inline-flex">
              <a href="https://github.com/Dioman-Keita/safets" aria-label="GitHub">
                <Github />
              </a>
            </Button>
            <ModeToggle />
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu />
            </Button>
          </div>
        </div>
        <div className="scrollbar-none flex gap-2 overflow-x-auto px-4 pb-3 md:hidden">
          {mainNav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted"
              activeProps={{ className: "border-indigo-400/40 text-foreground" }}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </header>
      {children}
      <Footer />
    </div>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-300/20 bg-indigo-400/10 font-mono text-sm font-bold text-indigo-200 shadow-[0_0_30px_rgba(99,102,241,0.25)]",
        className,
      )}
    >
      <span className="absolute inset-px rounded-[0.7rem] bg-gradient-to-br from-white/12 to-transparent" />
      <span className="relative">S</span>
    </span>
  );
}

export function SearchBox({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "hidden items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-2 text-sm text-muted shadow-sm backdrop-blur sm:flex",
        compact ? "w-44 lg:w-64" : "w-full",
      )}
    >
      <Search className="h-4 w-4" />
      <span className="truncate">Search docs...</span>
      <kbd className="ml-auto rounded-md border border-border px-1.5 py-0.5 font-mono text-[10px] text-subtle">
        /
      </kbd>
    </div>
  );
}

function BackgroundTexture() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background">
      <div className="absolute left-1/2 top-[-22rem] h-[34rem] w-[44rem] -translate-x-1/2 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="absolute right-[-12rem] top-80 h-[30rem] w-[30rem] rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/70 px-4 py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 text-sm text-muted md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <LogoMark className="h-8 w-8" />
          <span>SafeTS. TypeScript safety tooling for async correctness.</span>
        </div>
        <div className="flex gap-4">
          <Link to="/docs" className="hover:text-foreground">
            Docs
          </Link>
          <Link to="/changelog" className="hover:text-foreground">
            Changelog
          </Link>
          <a href="https://github.com/Dioman-Keita/safets" className="hover:text-foreground">
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
