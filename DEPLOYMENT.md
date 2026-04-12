# Sepolia Deployments

All contracts deployed and live-tested on Ethereum Sepolia testnet (chain ID 11155111).
Every address links to Sepolia Etherscan for on-chain verification.

**Deployer:** `0x5fd6Bb298fDA067cd32166CA8b04c913746fF3AA`
**Network:** Sepolia testnet
**FHEVM gateway:** Zama Protocol (auto-wired via `ZamaEthereumConfig`)
**Deployed:** 2026-04-12

---

## Contract Addresses

| Contract | Address | Block | Tx hash |
|---|---|---|---|
| `FHECounter` | [0x23f51eAa3274c4051D9B0c28143778f8DfAa10CE](https://sepolia.etherscan.io/address/0x23f51eAa3274c4051D9B0c28143778f8DfAa10CE) | 10643514 | [0xe9578d4a...](https://sepolia.etherscan.io/tx/0xe9578d4ac19b629b0d4bc05c983a42d422bf78cd298551a6a84571dab52453f3) |
| `ConfidentialToken` | [0xdf92f54401406571DF0D3538ebb8eFE39Eb45512](https://sepolia.etherscan.io/address/0xdf92f54401406571DF0D3538ebb8eFE39Eb45512) | 10643548 | [0xce389107...](https://sepolia.etherscan.io/tx/0xce389107387bf175bb0f3b1c435143094dca940b000c619fc2d2031b1fdb7b6f) |
| `ConfidentialVoting` | [0x022DAb103EDb3B4815677C83a20E9e80AE9ea926](https://sepolia.etherscan.io/address/0x022DAb103EDb3B4815677C83a20E9e80AE9ea926) | 10643599 | [0x7f30593d...](https://sepolia.etherscan.io/tx/0x7f30593dc830c94fbaef34842ccc8b670c859d80d5c4ac020bfcc40b74572d79) |
| `SealedBidAuction` | [0x4061C54E999ADf0B4A12111435E1Cf4c317Af079](https://sepolia.etherscan.io/address/0x4061C54E999ADf0B4A12111435E1Cf4c317Af079) | 10643717 | [0xbba678c2...](https://sepolia.etherscan.io/tx/0xbba678c28a05def01e2396fabeb3171717a0f0b5b2a6760e620572105d050de0) |
| `ConfidentialLeaderboard` | [0x10166D8f3C64B6478Fc1806AAd57802FBF213f0C](https://sepolia.etherscan.io/address/0x10166D8f3C64B6478Fc1806AAd57802FBF213f0C) | 10643747 | [0x8c53142d...](https://sepolia.etherscan.io/tx/0x8c53142d605f9da2b18429589135894c624b4cbcfd07c1b94bcd32f0035b373f) |
| `ConfidentialSalary` | [0x0D739C65459a2E1F54e4fe56bD0fa5c93633151b](https://sepolia.etherscan.io/address/0x0D739C65459a2E1F54e4fe56bD0fa5c93633151b) | 10643807 | [0x1e29513c...](https://sepolia.etherscan.io/tx/0x1e29513c8c489fb1faeafa1ae7ab973b4cdd83c9039883cb8d46e60ac20c78c9) |

---

## Live Test Results

All 16 Sepolia tests passing across all 6 contracts:

```
FHECounterSepolia              1/1  passing
ConfidentialTokenSepolia       3/3  passing
ConfidentialVotingSepolia      3/3  passing
SealedBidAuctionSepolia        3/3  passing
ConfidentialLeaderboardSepolia 3/3  passing
ConfidentialSalarySepolia      3/3  passing

Total: 16/16 passing
```

---

## Patterns Validated On-Chain

| Pattern | Contract | Confirmed |
|---|---|---|
| `FHE.fromExternal` ZK proof verification | All | Yes |
| `FHE.add`, `FHE.sub` encrypted arithmetic | FHECounter, ConfidentialToken | Yes |
| `FHE.allowThis` + `FHE.allow` ACL grants | All | Yes |
| `fhevm.userDecryptEuint` via live relayer | All | Yes |
| `FHE.select` with `ebool` input | ConfidentialVoting | Yes |
| `FHE.select` with `euint64` comparison | SealedBidAuction, ConfidentialLeaderboard | Yes |
| `eaddress` encrypted address tracking | SealedBidAuction | Yes |
| `FHE.isInitialized` guard | ConfidentialLeaderboard, ConfidentialToken | Yes |
| Confidential burn with ACL | ConfidentialToken | Yes |
| Encrypted running total | ConfidentialSalary | Yes |
| Double-submit / double-vote prevention | ConfidentialVoting, ConfidentialSalary | Yes |
| Multi-user encrypted aggregation | ConfidentialSalary, ConfidentialLeaderboard | Yes |

---

## How to Reproduce

```bash
cd packages/hardhat
npx hardhat vars set MNEMONIC        # 12-word seed phrase
npx hardhat vars set INFURA_API_KEY  # Infura project key

# Deploy all contracts
npx hardhat deploy --network sepolia --tags FHECounter
npx hardhat deploy --network sepolia --tags ConfidentialToken
npx hardhat deploy --network sepolia --tags ConfidentialVoting
npx hardhat deploy --network sepolia --tags SealedBidAuction
npx hardhat deploy --network sepolia --tags ConfidentialLeaderboard
npx hardhat deploy --network sepolia --tags ConfidentialSalary

# Run all Sepolia tests
npx hardhat test test/FHECounterSepolia.ts --network sepolia
npx hardhat test test/ConfidentialTokenSepolia.ts --network sepolia
npx hardhat test test/ConfidentialVotingSepolia.ts --network sepolia
npx hardhat test test/SealedBidAuctionSepolia.ts --network sepolia
npx hardhat test test/ConfidentialLeaderboardSepolia.ts --network sepolia
npx hardhat test test/ConfidentialSalarySepolia.ts --network sepolia
```

Requires a wallet funded with Sepolia ETH on accounts 0, 1, and 2.
Get test ETH from any Sepolia faucet (sepoliafaucet.com, infura.io/faucet/sepolia).
