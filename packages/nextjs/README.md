# FHEVM NextJS Frontend

Next.js + Scaffold-ETH frontend for confidential dApps built with the Zama Protocol.

## Setup

```cmd
# From project root
pnpm install
pnpm deploy:sepolia   # deploy contracts first
pnpm generate         # generate typed ABIs from deployments
pnpm start            # start dev server at localhost:3000
```

## Environment

Create `.env.local`:

```bash
NEXT_PUBLIC_ALCHEMY_API_KEY=your_key
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id
```

## Key files

| File | Purpose |
|---|---|
| `contracts/deployedContracts.ts` | Auto-generated ABI + address per network (run `pnpm generate`) |
| `hooks/fhecounter-example/useFHECounterWagmi.tsx` | Reference hook for FHEVM contract interaction |
| `hooks/helper/` | MetaMask EIP-6963 wallet helpers |

## FHEVM integration pattern

See Section 9b of SKILL.md for the full NextJS integration guide:
- `FhevmProvider` — initialize SDK once, share via context
- `useFhevm()` — access instance in any component
- Encrypt inputs with `instance.createEncryptedInput()`
- Decrypt balances with `instance.userDecrypt()`

## MetaMask note

After restarting the local Hardhat node (`pnpm chain`), clear MetaMask activity
(Settings → Advanced → Clear activity tab) to reset the nonce. Otherwise transactions will fail.
