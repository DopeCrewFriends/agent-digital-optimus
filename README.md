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

## Run

```bash
npm run dev
```

Runs on port 3001 (feet-pics uses 3000).
