import type { ReactNode } from "react";
import { ThemeToggle } from "./ThemeToggle";

export function TerminalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-base-300 text-base-content flex flex-col">
      {/* Header bar */}
      <header className="border-b border-current/10 bg-base-200 px-4 py-2">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <a href="/" className="flex items-center gap-2 no-underline">
            <span className="text-primary font-bold tracking-wider">
              PAPER_GRADER
            </span>
            <span className="text-xs opacity-40">v1.0</span>
          </a>
          <ThemeToggle />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-4xl">{children}</div>
      </main>

      {/* Footer */}
      <footer className="border-t border-current/10 bg-base-200 px-4 py-2">
        <div className="mx-auto max-w-4xl text-center text-xs opacity-30">
          GCSE & A-Level Past Paper Grading System
        </div>
      </footer>
    </div>
  );
}
