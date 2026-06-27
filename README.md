# GenLayer Live Claim Checker

A minimal Intelligent Contract that checks one factual claim against one live
web page. The leader fetches the page and asks an LLM for a YES, NO, or UNCLEAR
verdict. Validators independently fetch the same page, judge the claim again,
and accept the leader result only when the verdict agrees.

## Deployment status

- Network: GenLayer Bradbury Testnet (chain ID 4221)
- RPC: https://rpc-bradbury.genlayer.com
- Explorer: https://explorer-bradbury.genlayer.com
- Live app: https://genlayer-signal-board.vercel.app/
- Contract address: [`0xDB945ca005Abd2a7c098Ccd07cBd3802b79Ef1E5`](https://explorer-bradbury.genlayer.com/address/0xDB945ca005Abd2a7c098Ccd07cBd3802b79Ef1E5)
- Deployment transaction: [`0x8dcd2d5878526881fd6d7cea3672693b97a9cb8d1c13f0179d1d4bbd3a896c73`](https://explorer-bradbury.genlayer.com/tx/0x8dcd2d5878526881fd6d7cea3672693b97a9cb8d1c13f0179d1d4bbd3a896c73) (`FINALIZED`, `AGREE`)
- Successful CONTRACT_CALL transaction: [`0x1b0f60e64c32db16e71b2d228d73373a5777cf51221d5ef4ea30726a4fc53d72`](https://explorer-bradbury.genlayer.com/tx/0x1b0f60e64c32db16e71b2d228d73373a5777cf51221d5ef4ea30726a4fc53d72) (`FINALIZED`, `AGREE`, `FINISHED_WITH_RETURN`)

The project is not considered verified until a real contract call reaches
ACCEPTED with result AGREE and then FINALIZED without an execution revert.
This verification completed that lifecycle and stored verification count `1`
in finalized contract state.

## Architecture

- `live_claim_contract.py`: typed GenLayer Intelligent Contract storage
- `src/pages/home.tsx`: GenLayerJS reads, writes, and transaction monitoring
- `src/lib/wagmi.ts`: wallet configuration for Bradbury

All web and LLM operations execute inside the leader and validator functions
passed to `gl.vm.run_nondet_unsafe`. The validator performs its own
`gl.nondet.web.get` and LLM judgment; there is no simulated validator loop.
Persistent state is updated only after consensus returns an agreed result.

## Contract methods

- `verify_claim(url, claim)`: fetch, judge, validate, and store the latest result
- `get_latest_verification()`: read the latest finalized result
- `get_verification_count()`: read the number of finalized verifications

## Local checks

```bash
npm install
npm run typecheck
npm run build
genvm-lint check live_claim_contract.py
```

Copy `.env.example` to `.env` after deployment and set the new contract address.
