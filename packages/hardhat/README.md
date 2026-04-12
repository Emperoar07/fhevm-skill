# Hardhat Package

Solidity contracts and tests for the FHEVM Agent Skill demo. All five contracts were written using only the skill files as guidance. They serve as proof that the skill produces correct, working FHEVM code.

---

## Contracts

| Contract | What it demonstrates |
|---|---|
| `ConfidentialVoting.sol` | Encrypted boolean votes, FHE.select tallying, public reveal after deadline |
| `SealedBidAuction.sol` | Encrypted bids, highest bid tracking with FHE.select, eaddress for winner |
| `ConfidentialLeaderboard.sol` | Personal best initialization check, global top score, multi-user scoring |
| `ConfidentialSalary.sol` | Cold start proof: built from SKILL.md alone, 10 of 10 tests passed first try |
| `FHECounter.sol` | Base template from Zama showing increment and decrement on encrypted counter |

---

## Running Tests

From the project root:

```bash
pnpm test
```

From this package directly:

```bash
cd packages/hardhat
pnpm test
```

Expected output:

```
  32 passing
   1 pending
```

The pending test is `FHECounterSepolia` which only runs on the Sepolia testnet. It is intentionally skipped in local mock mode.

---

## Running a Single Test File

```bash
cd packages/hardhat
pnpm test test/ConfidentialVoting.ts
```

---

## Compiling

```bash
pnpm compile
```

Or from the project root:

```bash
pnpm hardhat:compile
```

---

## Deploying to Sepolia

Set up your environment variables first:

```bash
# packages/hardhat/.env
MNEMONIC="your twelve word mnemonic phrase here"
SEPOLIA_RPC_URL="https://ethereum-sepolia-rpc.publicnode.com"
```

Then deploy from the project root:

```bash
pnpm deploy:sepolia
```

After deploying, generate the TypeScript ABIs for the frontend:

```bash
pnpm generate
```

See Section 11d of [SKILL.md](../../SKILL.md) for the full deployment walkthrough including the error table for common failures.

---

## Project Structure

```
packages/hardhat/
  contracts/
    ConfidentialLeaderboard.sol
    ConfidentialSalary.sol
    ConfidentialVoting.sol
    SealedBidAuction.sol
    FHECounter.sol
  test/
    ConfidentialLeaderboard.ts
    ConfidentialSalary.ts
    ConfidentialVoting.ts
    SealedBidAuction.ts
    FHECounter.ts
    FHECounterSepolia.ts
  deploy/
    deploy.ts
  hardhat.config.ts
  package.json
  tsconfig.json
```

---

## Key FHEVM Patterns in These Contracts

**ACL after every mutation.** Every FHE operation produces a new handle. All contracts re-grant `FHE.allowThis` and `FHE.allow` immediately after each `FHE.add`, `FHE.select`, or `FHE.sub` call.

**Owner access requires explicit grant.** `FHE.allowThis` grants access to the contract, not the owner. All contracts include `FHE.allow(handle, owner())` for any value the owner needs to decrypt.

**FHE.select instead of if.** No contract uses `if` on an encrypted condition. All branching goes through `FHE.select(condition, valueIfTrue, valueIfFalse)`.

**Silent clamp instead of revert.** Functions that could fail on an encrypted condition (insufficient balance, overflow) use `FHE.select` to clamp the value to zero rather than reverting.

**FHE.isInitialized for first-write detection.** `ConfidentialLeaderboard` uses `FHE.isInitialized(_personalBest[msg.sender])` to handle the first score submission without a separate tracking variable.

For the full explanation of each pattern see [SKILL.md](../../SKILL.md) and [SKILL-REFERENCE.md](../../SKILL-REFERENCE.md).

---

## Dependencies

| Package | Version | Purpose |
|---|---|---|
| `@fhevm/solidity` | 0.9+ | Encrypted types and FHE library |
| `@fhevm/hardhat-plugin` | 0.4.2 | Test helpers: fhevm object, userDecryptEuint |
| `@openzeppelin/contracts` | 5.x | Ownable2Step |
| `hardhat` | 2.x | Test runner and compiler |

---

## License

BSD-3-Clause-Clear
