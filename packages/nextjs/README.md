# NextJS Frontend Package

Next.js and Scaffold-ETH frontend for confidential dApps built with the Zama Protocol.

---

## Setup

From the project root:

```bash
pnpm install
pnpm deploy:sepolia
pnpm generate
pnpm start
```

`pnpm generate` reads the deployed contract addresses from `packages/hardhat/deployments/` and writes typed ABIs to `contracts/deployedContracts.ts`. Run it after every new deployment.

The dev server starts at `http://localhost:3000`.

---

## Environment Variables

Create `packages/nextjs/.env.local`:

```bash
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_key
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_walletconnect_project_id
```

Both are required for the Sepolia frontend to function. `NEXT_PUBLIC_ALCHEMY_API_KEY` is used for on-chain reads. `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` is used for WalletConnect modal.

---

## Key Files

| File | Purpose |
|---|---|
| `contracts/deployedContracts.ts` | Auto-generated ABI and address per network. Run `pnpm generate` to update. |
| `hooks/fhecounter-example/useFHECounterWagmi.tsx` | Reference hook showing FHEVM contract interaction pattern |
| `hooks/helper/` | MetaMask EIP-6963 wallet provider helpers |

---

## FHEVM Integration Pattern

The full NextJS integration guide is in Section 9b of [SKILL.md](../../SKILL.md). The short version:

**Step 1: Wrap the app in FhevmProvider**

```typescript
// components/FhevmProvider.tsx
"use client";
import { createInstance, SepoliaConfig } from "@zama-fhe/relayer-sdk";

export function FhevmProvider({ children }) {
  const [instance, setInstance] = useState(null);
  useEffect(() => {
    createInstance({ ...SepoliaConfig, network: window.ethereum }).then(setInstance);
  }, []);
  return <FhevmContext.Provider value={instance}>{children}</FhevmContext.Provider>;
}
```

**Step 2: Encrypt and submit from a page**

```typescript
const instance = useFhevm();
const input = instance.createEncryptedInput(CONTRACT_ADDRESS, address);
input.addBool(voteYes);
const enc = await input.encrypt();
await writeContractAsync({ functionName: "castVote", args: [enc.handles[0], enc.inputProof] });
```

**Step 3: Decrypt a balance**

```typescript
const keypair = instance.generateKeypair();
const eip712 = instance.createEIP712(keypair.publicKey, [contractAddress], startTime, "10");
const sig = await signer.signTypedData(...);
const result = await instance.userDecrypt([{ handle, contractAddress }], keypair.privateKey, ...);
const balance = result[handle];
```

---

## MetaMask and Local Development

After restarting the local Hardhat node with `pnpm chain`, MetaMask may track a stale nonce. Clear it:

1. Open MetaMask
2. Select the Hardhat network
3. Go to Settings, then Advanced
4. Click Clear Activity Tab

If view functions return stale data after a Hardhat restart, do a full browser restart to clear MetaMask's in-memory cache.

---

## Scaffold-ETH Hooks

The frontend uses Scaffold-ETH typed hooks for contract calls:

```typescript
import { useScaffoldWriteContract, useScaffoldReadContract } from "~~/hooks/scaffold-eth";

const { writeContractAsync } = useScaffoldWriteContract("ConfidentialVoting");
const { data: encHandle } = useScaffoldReadContract({
  contractName: "ConfidentialToken",
  functionName: "balanceOf",
  args: [address],
});
```

These hooks read the ABI and address from `contracts/deployedContracts.ts` so there is no manual ABI management needed.

---

## License

BSD-3-Clause-Clear
