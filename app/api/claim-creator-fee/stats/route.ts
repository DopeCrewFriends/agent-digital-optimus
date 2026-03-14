import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { OnlinePumpSdk, PUMP_SDK, bondingCurvePda, feeSharingConfigPda } from "@pump-fun/pump-sdk";
import { getClaimLogsFromChain } from "../chain-history";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
    const bcBalance = await sdk.getCreatorVaultBalance(creatorPubkey);
    const ammBalance = await sdk.pumpAmmSdk.getCoinCreatorVaultBalance(creatorPubkey);
    return (bcBalance.toNumber() + ammBalance.toNumber()) / 1e9;
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
    const totalCollectedLamports = logs.reduce((s, l) => {
      const amt = l.paymentAmountLamports ?? l.claimAmountLamports ?? 0;
      return s + (amt > 0 ? amt : 0);
    }, 0);

    const now = new Date();
    const nextRun = new Date(now);
    nextRun.setSeconds(0, 0);
    nextRun.setMilliseconds(0);
    const mins = nextRun.getMinutes();
    nextRun.setMinutes(mins + (5 - (mins % 5)));
    const nextClaimInMs = Math.max(0, nextRun.getTime() - now.getTime());

    return NextResponse.json(
      {
        claims: logs,
        totalCollectedLamports,
        totalCollectedSol: totalCollectedLamports / 1e9,
        pendingFeesSol,
        nextClaimInMs,
        nextClaimAt: nextRun.toISOString(),
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
        nextClaimInMs: 0,
        nextClaimAt: null,
      },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  }
}
