import { Connection, PublicKey } from "@solana/web3.js";

const PUMP_PROGRAM_ID = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
const MIN_CLAIM_LAMPORTS = 10_000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export type ClaimLog = {
  timestamp: string;
  claimSignature?: string;
  claimAmountLamports?: number;
  claimAmountSol?: number;
  paymentSignature?: string;
  paymentAmountLamports?: number;
  error?: string;
};

const TX_CHUNK_SIZE = 5;
const TX_CHUNK_DELAY_MS = 150;

export async function getClaimLogsFromChain(
  connection: Connection,
  creatorPubkey: PublicKey,
  limit = 15
): Promise<ClaimLog[]> {
  const logs: ClaimLog[] = [];
  try {
    const sigs = await connection.getSignaturesForAddress(creatorPubkey, {
      limit,
      before: undefined,
    });
    await sleep(200);
    const txs: (Awaited<ReturnType<Connection["getTransaction"]>>)[] = [];
    for (let i = 0; i < sigs.length; i += TX_CHUNK_SIZE) {
      const chunk = sigs.slice(i, i + TX_CHUNK_SIZE);
      txs.push(
        ...(await Promise.all(
          chunk.map((s) =>
            connection.getTransaction(s.signature, { maxSupportedTransactionVersion: 0 })
          )
        ))
      );
      if (i + TX_CHUNK_SIZE < sigs.length) await sleep(TX_CHUNK_DELAY_MS);
    }
    for (let i = 0; i < sigs.length; i++) {
      const tx = txs[i];
      const sig = sigs[i].signature;
      if (!tx?.meta?.preBalances || !tx?.meta?.postBalances) continue;
      const keys = tx.transaction.message.getAccountKeys({
        accountKeysFromLookups: tx.meta.loadedAddresses ?? undefined,
      });
      let creatorIdx = -1;
      for (let j = 0; j < keys.length; j++) {
        if (keys.get(j)?.equals(creatorPubkey)) {
          creatorIdx = j;
          break;
        }
      }
      if (creatorIdx < 0) continue;
      const pre = tx.meta.preBalances[creatorIdx] ?? 0;
      const post = tx.meta.postBalances[creatorIdx] ?? 0;
      const delta = post - pre;
      if (delta < MIN_CLAIM_LAMPORTS) continue;
      let hasPump = false;
      for (let k = 0; k < keys.length; k++) {
        if (keys.get(k)?.toBase58() === PUMP_PROGRAM_ID) {
          hasPump = true;
          break;
        }
      }
      if (!hasPump) continue;
      const blockTime = tx.blockTime ?? sigs[i].blockTime ?? 0;
      logs.push({
        timestamp: new Date(blockTime * 1000).toISOString(),
        claimSignature: sig,
        claimAmountLamports: delta,
        claimAmountSol: delta / 1e9,
      });
    }
    logs.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  } catch (e) {
    console.error("[claim-chain-history]", e);
  }
  return logs;
}

const MAX_SIGNATURES_TO_SCAN = 2000;
const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 800;
const FULL_TX_CHUNK_SIZE = 5;
const FULL_TX_CHUNK_DELAY_MS = 200;

export async function getFullClaimTotalFromChain(
  connection: Connection,
  creatorPubkey: PublicKey
): Promise<{ totalLamports: number; claimCount: number }> {
  let totalLamports = 0;
  let claimCount = 0;
  let before: string | undefined;
  let scanned = 0;

  try {
    while (scanned < MAX_SIGNATURES_TO_SCAN) {
      const sigs = await connection.getSignaturesForAddress(creatorPubkey, {
        limit: BATCH_SIZE,
        before,
      });
      await sleep(300);
      if (sigs.length === 0) break;

      const txs: (Awaited<ReturnType<Connection["getTransaction"]>>)[] = [];
      for (let i = 0; i < sigs.length; i += FULL_TX_CHUNK_SIZE) {
        const chunk = sigs.slice(i, i + FULL_TX_CHUNK_SIZE);
        txs.push(
          ...(await Promise.all(
            chunk.map((s) =>
              connection.getTransaction(s.signature, { maxSupportedTransactionVersion: 0 })
            )
          ))
        );
        if (i + FULL_TX_CHUNK_SIZE < sigs.length) await sleep(FULL_TX_CHUNK_DELAY_MS);
      }

      for (let i = 0; i < sigs.length; i++) {
        const tx = txs[i];
        if (!tx?.meta?.preBalances || !tx?.meta?.postBalances) continue;
        const keys = tx.transaction.message.getAccountKeys({
          accountKeysFromLookups: tx.meta.loadedAddresses ?? undefined,
        });
        let creatorIdx = -1;
        for (let j = 0; j < keys.length; j++) {
          if (keys.get(j)?.equals(creatorPubkey)) {
            creatorIdx = j;
            break;
          }
        }
        if (creatorIdx < 0) continue;
        const pre = tx.meta.preBalances[creatorIdx] ?? 0;
        const post = tx.meta.postBalances[creatorIdx] ?? 0;
        const delta = post - pre;
        if (delta < MIN_CLAIM_LAMPORTS) continue;
        let hasPump = false;
        for (let k = 0; k < keys.length; k++) {
          if (keys.get(k)?.toBase58() === PUMP_PROGRAM_ID) {
            hasPump = true;
            break;
          }
        }
        if (!hasPump) continue;
        totalLamports += delta;
        claimCount += 1;
      }

      scanned += sigs.length;
      before = sigs[sigs.length - 1]?.signature;
      if (sigs.length < BATCH_SIZE) break;
      await sleep(BATCH_DELAY_MS);
    }
  } catch (e) {
    console.error("[claim-chain-history] full total", e);
  }
  return { totalLamports, claimCount };
}

/**
 * Returns true if the creator's most recent on-chain tx looks like a claim
 * from the last N seconds. Used to prevent double claims when multiple
 * instances trigger concurrently.
 */
export async function hasRecentClaim(
  connection: Connection,
  creatorPubkey: PublicKey,
  withinSeconds = 120
): Promise<boolean> {
  try {
    const sigs = await connection.getSignaturesForAddress(creatorPubkey, {
      limit: 1,
    });
    if (sigs.length === 0) return false;
    const tx = await connection.getTransaction(sigs[0].signature, {
      maxSupportedTransactionVersion: 0,
    });
    if (!tx?.meta?.preBalances || !tx?.meta?.postBalances) return false;
    const blockTime = tx.blockTime ?? sigs[0].blockTime ?? 0;
    if (Date.now() / 1000 - blockTime > withinSeconds) return false;
    const keys = tx.transaction.message.getAccountKeys({
      accountKeysFromLookups: tx.meta.loadedAddresses ?? undefined,
    });
    let creatorIdx = -1;
    for (let j = 0; j < keys.length; j++) {
      if (keys.get(j)?.equals(creatorPubkey)) {
        creatorIdx = j;
        break;
      }
    }
    if (creatorIdx < 0) return false;
    const delta =
      (tx.meta.postBalances[creatorIdx] ?? 0) - (tx.meta.preBalances[creatorIdx] ?? 0);
    if (delta < MIN_CLAIM_LAMPORTS) return false;
    for (let k = 0; k < keys.length; k++) {
      if (keys.get(k)?.toBase58() === PUMP_PROGRAM_ID) return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}
