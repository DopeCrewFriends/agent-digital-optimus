"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

type ClaimLog = {
  timestamp: string;
  claimSignature?: string;
  claimAmountLamports?: number;
  claimAmountSol?: number;
  paymentSignature?: string;
  paymentAmountLamports?: number;
  error?: string;
};

export default function Home() {
  const [creatorStats, setCreatorStats] = useState<{
    totalCollectedSol: number;
    claims: ClaimLog[];
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchStats() {
      try {
        const res = await fetch("/api/claim-creator-fee/stats", {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) {
          setCreatorStats({
            totalCollectedSol: data.totalCollectedSol ?? 0,
            claims: data.claims ?? [],
          });
        }
      } catch {
        if (!cancelled)
          setCreatorStats({ totalCollectedSol: 0, claims: [] });
      }
    }
    fetchStats();
    const t = setInterval(fetchStats, 30_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return (
    <main className="min-h-screen bg-[var(--bg-dark)] relative overflow-hidden">
      {/* Hero section with banner */}
      <section className="relative">
        <div className="relative w-full aspect-[21/9] min-h-[200px] max-h-[50vh]">
          <div className="absolute inset-0 bg-digital" />
          <Image
            src="/banner.png"
            alt="Digital Optimus Agent"
            fill
            className="object-cover object-top"
            sizes="100vw"
            quality={95}
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--bg-dark)]" />
          <div className="absolute inset-0 flex items-end justify-center md:justify-start px-6 pb-8">
            <div className="text-center md:text-left">
              <p className="font-mono text-xs tracking-[0.3em] uppercase text-[var(--accent)] mb-2">
                Digital Agent
              </p>
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
                <span className="text-[var(--text)]">Digital </span>
                <span className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent-bright)] bg-clip-text text-transparent">
                  Optimus
                </span>
              </h1>
              <p className="text-sm md:text-base text-[var(--text-muted)] mt-2 max-w-md">
                The next evolution of AI agents on Solana.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Neural compute + Creator rewards side by side */}
      <section className="relative px-6 py-12">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Neural compute */}
          <div>
            <p className="font-mono text-xs text-[var(--accent-code)] mb-2">
              ON-CHAIN INTELLIGENCE
            </p>
            <h2 className="text-2xl font-bold text-[var(--text)] mb-3">
              Neural compute on Solana
            </h2>
            <p className="text-[var(--text-muted)] text-sm">
              Digital Optimus runs as an autonomous agent directly on the blockchain — fees, rewards, and state all verifiable on-chain.
            </p>
          </div>

          {/* Creator rewards */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]/80 backdrop-blur-sm overflow-hidden">
            <div className="p-6 border-b border-[var(--border)]">
              <p className="font-mono text-xs text-[var(--accent-code)] mb-1">
                STATUS: ACTIVE
              </p>
              <h2 className="text-lg font-semibold text-[var(--text)]">
                Agent revenue
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex flex-col gap-1 text-sm">
                <span className="text-[var(--text-muted)]">Total since creation</span>
                <span className="font-mono font-medium text-[var(--accent)]">
                  {creatorStats
                    ? `${creatorStats.totalCollectedSol.toFixed(6)} SOL`
                    : "—"}
                </span>
              </div>
              <p className="text-sm text-[var(--text-muted)]">
                Buyback rate: 85%
              </p>
              <div className="pt-4 border-t border-[var(--border)]">
                <p className="text-xs text-[var(--text-muted)] mb-2">Recent claims</p>
                {creatorStats && creatorStats.claims.length > 0 ? (
                  <ul className="space-y-2 max-h-32 overflow-y-auto">
                    {creatorStats.claims.slice(0, 8).map((c, i) => {
                      const sig = c.paymentSignature || c.claimSignature;
                      const amount =
                        c.paymentAmountLamports != null
                          ? `${(c.paymentAmountLamports / 1e9).toFixed(6)}`
                          : c.claimAmountSol != null
                            ? c.claimAmountSol.toFixed(6)
                            : "—";
                      const time = new Date(c.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                      return (
                        <li
                          key={i}
                          className="flex justify-between items-center text-xs font-mono"
                        >
                          {sig ? (
                            <a
                              href={`https://solscan.io/tx/${sig}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[var(--accent)] hover:text-[var(--accent-bright)] hover:underline truncate"
                            >
                              {amount} SOL
                            </a>
                          ) : (
                            <span className="text-[var(--text)]">{amount} SOL</span>
                          )}
                          <span className="text-[var(--text-muted)] shrink-0">
                            {time}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-xs text-[var(--text-muted)] font-mono">
                    No claims yet
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
