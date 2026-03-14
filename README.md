# Digital Optimus

Landing site for the Digital Optimus agent on pump.fun. No paywall — creator rewards stats only.

## Setup

```bash
npm install
```

Copy `.env.example` to `.env` and set:

- `SOLANA_RPC_URL` / `NEXT_PUBLIC_SOLANA_RPC_URL`
- `AGENT_TOKEN_MINT_ADDRESS` — pump.fun token mint
- `CREATOR_PUBLIC_KEY` — creator wallet address (for claim stats)
- `CREATOR_WALLET_PRIVATE_KEY` — base58 or JSON array (for claim automation)
- `CRON_SECRET` — secret for claim endpoint auth

## Claim automation

Creator fees from pump.fun trading are claimed and 85% is paid into the agent.

- **Vercel**: Set `CRON_SECRET` in env; `vercel.json` runs every 5 min.
- **GitHub Actions**: Add repo secrets `CLAIM_ENDPOINT_URL` and `CRON_SECRET`; enable `.github/workflows/claim-cron.yml`.

Manual: `curl -X POST https://your-app.com/api/claim-creator-fee/auto -H "Authorization: Bearer YOUR_CRON_SECRET"`

## Run

```bash
npm run dev
```

Runs on port 3001 (feet-pics uses 3000).
