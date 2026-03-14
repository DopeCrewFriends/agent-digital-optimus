import { NextResponse } from "next/server";
import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { PumpAgent } from "@pump-fun/agent-payments-sdk";
import bs58 from "bs58";

const WSOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");

async function waitForConfirmation(
  connection: Connection,
  signature: string,
  maxWaitMs = 60_000
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const status = await connection.getSignatureStatuses([signature]);
    const s = status.value[0];
    if (s?.confirmationStatus === "confirmed" || s?.confirmationStatus === "finalized") return;
    if (s?.err) throw new Error(`Transaction failed: ${JSON.stringify(s.err)}`);
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("Confirmation timeout");
}

/**
 * Manual buyback: send SOL into the agent.
 * POST with Authorization: Bearer CRON_SECRET
 * Optional: ?amount=3 or body { amount: 3 } — defaults to 1 SOL
 */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const privateKey = process.env.CREATOR_WALLET_PRIVATE_KEY;
  const rpcUrl = process.env.SOLANA_RPC_URL;
  const agentMint = process.env.AGENT_TOKEN_MINT_ADDRESS;

  if (!privateKey || !rpcUrl || !agentMint) {
    return NextResponse.json(
      { error: "Missing CREATOR_WALLET_PRIVATE_KEY, SOLANA_RPC_URL, or AGENT_TOKEN_MINT_ADDRESS" },
      { status: 500 }
    );
  }

  let keypair: Keypair;
  try {
    const trimmed = privateKey.trim();
    const secret = trimmed.startsWith("[")
      ? Uint8Array.from(JSON.parse(trimmed) as number[])
      : bs58.decode(trimmed);
    keypair = Keypair.fromSecretKey(secret);
  } catch {
    return NextResponse.json({ error: "Invalid CREATOR_WALLET_PRIVATE_KEY" }, { status: 500 });
  }

  const connection = new Connection(rpcUrl);

  let amountSol = 1;
  try {
    const url = new URL(req.url);
    const qty = url.searchParams.get("amount");
    if (qty) amountSol = Math.max(0.001, Math.min(100, parseFloat(qty)));
  } catch {
    // keep default 1
  }
  const amountLamports = BigInt(Math.floor(amountSol * 1e9));

  try {
    const agent = new PumpAgent(new PublicKey(agentMint), "mainnet", connection);
    const memo = String(Math.floor(Math.random() * 900000000000) + 100000);
    const now = Math.floor(Date.now() / 1000);
    const startTime = String(now);
    const endTime = String(now + 86400);

    const payInstructions = await agent.buildAcceptPaymentInstructions({
      user: keypair.publicKey,
      currencyMint: WSOL_MINT,
      amount: String(amountLamports),
      memo,
      startTime,
      endTime,
      computeUnitLimit: 200_000,
      computeUnitPrice: 150_000,
    });

    const payTx = new Transaction();
    const { blockhash } = await connection.getLatestBlockhash("confirmed");
    payTx.recentBlockhash = blockhash;
    payTx.feePayer = keypair.publicKey;
    payTx.add(...payInstructions);
    payTx.sign(keypair);

    const sig = await connection.sendRawTransaction(payTx.serialize(), {
      skipPreflight: true,
      preflightCommitment: "confirmed",
    });

    await waitForConfirmation(connection, sig);

    return NextResponse.json({
      success: true,
      signature: sig,
      amountSol,
      message: `${amountSol} SOL sent to agent`,
    });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    console.error("[buyback] Error:", errMsg, e);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
