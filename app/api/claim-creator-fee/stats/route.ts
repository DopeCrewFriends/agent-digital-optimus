import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { Connection, PublicKey } from "@solana/web3.js";
import { OnlinePumpSdk, PUMP_SDK, bondingCurvePda, feeSharingConfigPda } from "@pump-fun/pump-sdk";
import { getClaimLogsFromChain, getFullClaimTotalFromChain } from "../chain-history";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CLAIM_THRESHOLD_SOL = 1;
const TRIGGER_COOLDOWN_MS = 120_000; // debounce: don't re-trigger for 2 min (claim takes ~30s)
let lastTriggerAt = 0;

async function getPendingFeesSol(
  connection: Connection,
  creatorPubkey: PublicKey,
  agentMint: string
): Promise<number> {
  try {
    const sdk = new OnlinePumpSdk(connection);
    const mint = new PublicKey(agentMint);
    const bcPda = bondingCurvePda(mint);
    const bcInfo = await connection.getAccountInfo(bcPda);
    if (bcInfo) {
      const bc = PUMP_SDK.decodeBondingCurveNullable(bcInfo);
      if (bc && bc.creator.equals(feeSharingConfigPda(mint))) {
        const res = await sdk.getMinimumDistributableFee(mint);
        return res.distributableFees.toNumber() / 1e9;
      }
    }
    const total = await sdk.getCreatorVaultBalanceBothPrograms(creatorPubkey);
    return total.toNumber() / 1e9;
  } catch {
    return 0;
  }
}

export async function GET() {
  try {
    const creatorPubkey = process.env.CREATOR_PUBLIC_KEY;
    const agentMint = process.env.AGENT_TOKEN_MINT_ADDRESS;
    const rpc =
      process.env.SOLANA_RPC_URL ?? process.env.NEXT_PUBLIC_SOLANA_RPC_URL;

    let logs: Awaited<ReturnType<typeof getClaimLogsFromChain>> = [];
    let pendingFeesSol = 0;
    if (creatorPubkey && rpc) {
      const connection = new Connection(rpc);
      logs = await getClaimLogsFromChain(
        connection,
        new PublicKey(creatorPubkey),
        15
      );
      if (agentMint) {
        pendingFeesSol = await getPendingFeesSol(
          connection,
          new PublicKey(creatorPubkey),
          agentMint
        );
      }
    }

    // On Vercel without cron: trigger claim when pending rewards exceed 1 SOL (driven by page/stats traffic)
    const cronSecret = process.env.CRON_SECRET;
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.BASE_URL || "http://localhost:3001";
    if (
      cronSecret &&
      pendingFeesSol >= CLAIM_THRESHOLD_SOL &&
      Date.now() - lastTriggerAt > TRIGGER_COOLDOWN_MS
    ) {
      lastTriggerAt = Date.now();
      fetch(`${baseUrl}/api/claim-creator-fee/auto`, {
        method: "POST",
        headers: { Authorization: `Bearer ${cronSecret}` },
      }).catch(() => {});
    }

    // Full history total (cached 10 min) — paginates through all creator txns
    const getCachedTotal = unstable_cache(
      async (creator: string, rpcUrl: string) => {
        const conn = new Connection(rpcUrl);
        return getFullClaimTotalFromChain(conn, new PublicKey(creator));
      },
      ["claim-creator-total", creatorPubkey ?? "", rpc ?? ""],
      { revalidate: 1800 }
    );
    const { totalLamports: totalCollectedLamports } =
      creatorPubkey && rpc
        ? await getCachedTotal(creatorPubkey, rpc)
        : { totalLamports: 0 };

    return NextResponse.json(
      {
        claims: logs,
        totalCollectedLamports,
        totalCollectedSol: totalCollectedLamports / 1e9,
        pendingFeesSol,
      },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch {
    return NextResponse.json(
      {
        claims: [],
        totalCollectedLamports: 0,
        totalCollectedSol: 0,
        pendingFeesSol: 0,
      },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  }
}
