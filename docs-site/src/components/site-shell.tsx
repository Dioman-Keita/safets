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
      <header className="sticky top-0 z-50 w-full backdrop-blur">
        <div className="container flex h-14 max-w-screen-2xl items-center">
          <Link to="/" className="flex items-center gap-3">
            <LogoMark />
            <div>
              <div className="text-sm font-bold tracking-tight text-foreground">SafeTS</div>
              <div className="hidden text-[11px] leading-none text-muted sm:block">
                async correctness
              </div>
            </div>
          </Link>
          <nav className="ml-8 hidden items-center gap-4 text-sm lg:gap-6 md:flex">
            {mainNav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="text-foreground/60 transition-colors hover:text-foreground/80"
                activeProps={{ className: "text-foreground dark:text-[hsl(var(--primary-active))]" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
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
              className="shrink-0 rounded-md px-2.5 py-1.5 text-sm text-muted hover:bg-secondary"
              activeProps={{ className: "text-foreground" }}
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
        "flex h-8 w-8 items-center justify-center rounded-md border border-input bg-card/80 font-mono text-sm font-bold text-foreground",
        className,
      )}
    >
      <span>S</span>
    </span>
  );
}

export function SearchBox({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "hidden items-center gap-2 rounded-lg border border-input bg-card/80 px-3 py-2 text-sm font-medium text-foreground shadow-sm sm:flex",
        compact ? "w-44 lg:w-64" : "w-full",
      )}
    >
      <Search className="h-4 w-4" />
      <span className="truncate">Search docs...</span>
      <kbd className="ml-auto rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-subtle">
        /
      </kbd>
    </div>
  );
}

function BackgroundTexture() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 bg-background" />
  );
}

function Footer() {
  return (
    <footer className="border-t border-border px-6 py-8">
      <div className="container flex max-w-screen-2xl flex-col gap-6 text-sm text-muted md:flex-row md:items-center md:justify-between">
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
