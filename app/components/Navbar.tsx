"use client";

import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--border)] bg-[var(--bg-dark)]/95 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="font-semibold text-[var(--text)] hover:text-[var(--accent)] transition-colors"
        >
          <span className="text-[var(--text)]">Digital </span>
          <span className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent-bright)] bg-clip-text text-transparent">
            Optimus
          </span>
        </Link>
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            Home
          </Link>
          <Link
            href="/deploy"
            className="text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-bright)] transition-colors flex items-center gap-2"
          >
            Deploy Agents
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--accent-code)] bg-[var(--accent-code)]/10 px-2 py-0.5 rounded">
              Coming Soon
            </span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
