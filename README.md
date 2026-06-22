# GenLayer Signal Board

A public, consensus-backed Bitcoin market signal board built on GenLayer.
Validators independently fetch live BTC market data, validate the proposed
result, and finalize an AI-generated **Bullish**, **Bearish**, or **Neutral**
signal before it is stored onchain.

This is not a frontend that calculates a signal and uploads the answer. The web
request, LLM analysis, and validation all execute inside GenVM through
GenLayer's Equivalence Principle.

## Live deployment

- **Network:** GenLayer Bradbury Testnet (chain 4221)
- **Contract:** [`0x0871319A81d42d7f9c4A8C47236076EF5Fbd60cB`](https://explorer-bradbury.genlayer.com/contract/0x0871319A81d42d7f9c4A8C47236076EF5Fbd60cB)
- **Contract source:** [`btc_market_contract.py`](./btc_market_contract.py)
- **Successful consensus transaction:** [`0xc87d32c3f89996a27bc945a7b62996b9104bba63ea56f4d8edd199fb84411b78`](https://explorer-bradbury.genlayer.com/transactions/0xc87d32c3f89996a27bc945a7b62996b9104bba63ea56f4d8edd199fb84411b78)
- **Live app:** [genlayer-signal-board.vercel.app](https://genlayer-signal-board.vercel.app/)

## What makes it a GenLayer application

- **Live web data:** each execution fetches BTC price and 24-hour change from
  CoinGecko inside `gl.nondet.web.get`.
- **AI reasoning:** `gl.nondet.exec_prompt` produces a concise explanation and
  confidence score.
- **Real network consensus:** `gl.vm.run_nondet_unsafe` invokes a leader and a
  validator function. There is no hardcoded validator loop or simulated vote.
- **Auditable invariant:** above `+2%` is Bullish, below `-2%` is Bearish, and
  the range in between is Neutral.
- **Independent verification:** validators fetch the market again, enforce a
  2% price tolerance and 0.5 percentage-point change tolerance, and reject
  malformed or inconsistent results.
- **Safe state updates:** persistent storage changes only after the network has
  accepted the non-deterministic result.

## Contract methods

### `analyze_market()`

Public write method that:

1. Fetches the live BTC price and 24-hour change.
2. Derives the signal using the public threshold invariant.
3. Requests LLM reasoning and a confidence score.
4. Runs the leader result through network validator checks.
5. Stores the consensus-approved result onchain.

### `get_last_result()`

Public view method returning:

```json
{
  "price_cents": 6390500,
  "change_bps": 31,
  "signal": "Neutral",
  "confidence": 70,
  "reasoning": "...",
  "analysis_count": 1
}
```

Prices use integer cents and percentage changes use basis points, avoiding
unsupported floating-point values in persistent GenVM state.

## Consensus flow

```text
User submits analyze_market()
              |
              v
Leader fetches CoinGecko + runs the LLM
              |
              v
Validators independently fetch and validate
              |
              v
GenLayer accepts an equivalent result
              |
              v
Contract stores the finalized signal
```

## Architecture

```text
btc_market_contract.py     GenLayer Intelligent Contract
src/pages/home.tsx         React application and contract calls
src/components/            Wallet and UI components
src/lib/wagmi.ts           Bradbury wallet configuration
.env.example               Public contract configuration
```

The contract follows current GenVM requirements:

- extends `gl.Contract`;
- declares typed class-level storage (`u256`, `i32`, `u8`, `str`);
- uses `@gl.public.write` and `@gl.public.view`;
- keeps all `gl.nondet.*` calls inside parameterless non-deterministic blocks;
- performs storage writes only after consensus.

## Run locally

```bash
npm install
copy .env.example .env
npm run dev
```

The deployed Bradbury address is already included in `.env.example`.

## Verify

```bash
npm run typecheck
npm run build
genvm-lint check btc_market_contract.py
```

The final command requires the GenVM development tools. The contract can also
be uploaded directly to GenLayer Studio and deployed on Bradbury.

## Tech stack

- GenLayer Intelligent Contracts / GenVM
- Python
- GenLayer JS SDK
- React + TypeScript + Vite
- Wagmi + Viem
- Tailwind CSS
