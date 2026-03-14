"use client";

import Link from "next/link";

export default function DeployPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-dark)] relative overflow-hidden pt-14">
      <section className="relative px-6 py-24 md:py-32">
        <div className="max-w-3xl mx-auto text-center">
          <p className="font-mono text-xs tracking-[0.3em] uppercase text-[var(--accent)] mb-4">
            Deploy Agents
          </p>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            <span className="text-[var(--text)]">Launch your own </span>
            <span className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent-bright)] bg-clip-text text-transparent">
              pump.fun agent coin
            </span>
          </h1>
          <p className="text-lg text-[var(--text-muted)] mb-12 max-w-2xl mx-auto">
            Deploy automated agent tokens on pump.fun — your AI agent, your bonding curve, 
            your buyback mechanics. All on Solana.
          </p>

          <div className="inline-flex items-center gap-2 font-mono text-sm text-[var(--accent-code)] bg-[var(--accent-code)]/10 border border-[var(--accent-code)]/30 px-6 py-3 rounded-lg mb-16">
            <span className="animate-pulse">◆</span>
            Coming Soon
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]/60 p-8 text-left">
            <p className="font-mono text-xs text-[var(--accent-code)] mb-4">
              WHAT&apos;S IN THE PIPELINE
            </p>
            <ul className="space-y-3 text-[var(--text-muted)]">
              <li className="flex items-start gap-3">
                <span className="text-[var(--accent)] shrink-0">→</span>
                Deploy your own pump.fun agent token with customizable parameters
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[var(--accent)] shrink-0">→</span>
                Automated buyback and rewards — set your own percentage
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[var(--accent)] shrink-0">→</span>
                Simple flow: connect wallet, configure, deploy on-chain
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[var(--accent)] shrink-0">→</span>
                No-code friendly — launch an agent coin in minutes
              </li>
            </ul>
          </div>

          <div className="mt-12">
            <Link
              href="/"
              className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
