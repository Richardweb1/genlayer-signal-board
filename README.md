# AI BTC Sentinel  GenLayer 

This is a cleaned Vercel-ready version of the Replit export.

## What was changed

- Kept the project on GenLayer.
- Removed Replit-only package references such as `catalog:` and workspace packages.
- Added missing root files required for Vercel/Vite: `package.json`, `index.html`, `vite.config.ts`, `tsconfig.json`, and `vercel.json`.
- Replaced the missing generated `@workspace/api-client-react` dependency with a simple frontend `fetch('/api/btc/analyze')` call.
- Replaced the Express API dependency with a Vercel Serverless Function at `api/btc/analyze.ts`.
- Updated contract method names in the app to match `btc_market_contract.py`:
  - write: `analyze_market`
  - read: `get_last_result`
- Removed Replit comments/references from UI component source files.

## Local setup

```bash
npm install
npm run dev
```

## Build check

```bash
npm run build
```

## Deploy to Vercel

1. Push this folder to GitHub.
2. Import the GitHub repository in Vercel.
3. Framework preset: Vite.
4. Build command: `npm run build`.
5. Output directory: `dist`.

## Optional environment variables

Set these in Vercel if you deploy a new GenLayer contract:

```bash
VITE_GENLAYER_CONTRACT_ADDRESS=0x...
GENLAYER_CONTRACT_ADDRESS=0x...
```
