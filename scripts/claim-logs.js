#!/usr/bin/env node
/**
 * Live terminal logs: countdown to next claim + pending fees to claim.
 * Run alongside `npm run dev`. Polls every 3 seconds.
 *
 * Usage: node scripts/claim-logs.js
 *    or: npm run claim-logs
 */
const fs = require("fs");
const path = require("path");

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) {
        const key = m[1].trim();
        const val = m[2].trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

loadEnv();

const BASE = process.env.BASE || "http://localhost:3001";

function formatCountdown(ms) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

async function poll() {
  try {
    const res = await fetch(`${BASE}/api/claim-creator-fee/stats`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
    if (!res.ok) {
      console.log(`[${new Date().toLocaleTimeString()}] Stats API ${res.status}`);
      return;
    }
    const data = await res.json();
    const nextClaim = data.nextClaimInMs ?? 0;
    const pending = data.pendingFeesSol ?? 0;
    const total = data.totalCollectedSol ?? 0;

    const line = `[${new Date().toLocaleTimeString()}] Next claim: ${formatCountdown(nextClaim)} | Pending to claim: ${pending.toFixed(6)} SOL | Total collected: ${total.toFixed(6)} SOL`;
    console.log(line);
  } catch (e) {
    console.log(`[${new Date().toLocaleTimeString()}] ERROR: ${e.message}`);
  }
}

console.log("Claim logs started. Polling", BASE, "every 3s. Ctrl+C to stop.\n");
poll();
setInterval(poll, 3000);
