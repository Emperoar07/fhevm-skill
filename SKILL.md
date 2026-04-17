# FHEVM Agent Skill — Zama Protocol

> This skill enables AI coding agents to accurately write, test, and deploy confidential smart contracts using Zama's FHEVM. Read this file before generating any FHEVM-related code.

---

## Skill Metadata

| Field | Value |
|---|---|
| **Version** | 1.8.0 |
| **Last updated** | 2026-04-17 |
| **Last tested against** | `@fhevm/solidity` v0.11.1, `@zama-fhe/relayer-sdk` v0.4.1, `@fhevm/hardhat-plugin` v0.4.2 |
| **Package versions** | [VERSIONS.md](VERSIONS.md) — auto-updated weekly by CI |
| **Test result** | 34 passing (local mock), 17 pending (Sepolia) |
| **Changelog** | [CHANGELOG.md](CHANGELOG.md) |
| **Report a gap** | [FEEDBACK.md](FEEDBACK.md) |
| **Known open gaps** | [KNOWN_GAPS.md](KNOWN_GAPS.md) |

---

## Skill File System

This skill is split across four files. Load the ones relevant to your task:

| File | Purpose | When to load |
|---|---|---|
| **[SKILL.md](SKILL.md)** ← you are here | Master overview, mental model, full workflow | Always — read this first |
| **[SKILL-REFERENCE.md](SKILL-REFERENCE.md)** | Complete API reference — every type, op, ACL function, address | When writing or reviewing contract code |
| **[SKILL-TEMPLATES.md](SKILL-TEMPLATES.md)** | 7 copy-paste contract templates with `// TODO:` markers | When starting a new contract |
| **[SKILL-TESTING.md](SKILL-TESTING.md)** | Test patterns, decrypt helpers, debug guide, CI setup | When writing or debugging tests |

### How This Skill Evolves

This skill is **living documentation** that evolves through three channels:

**1. Usage failures** — when an agent generates wrong code:
```
Developer uses skill → Agent generates code → Code fails or behaves unexpectedly
        ↓
Developer runs `pnpm report-gap` or files a GitHub Issue (label: skill-gap)
        ↓
skill-evolve.yml auto-logs it to KNOWN_GAPS.md and notifies maintainers
        ↓
Maintainer reproduces, fixes the skill, bumps version in CHANGELOG.md
```

**2. Upstream package changes** — when Zama ships new versions (automatic, weekly):
```
skill-watch-deps.yml runs every Monday
        ↓
Checks npm: @fhevm/solidity, @zama-fhe/relayer-sdk, @fhevm/hardhat-plugin
        ↓
If version changed → opens GitHub Issue (skill-gap) → maintainer reviews API diff
        ↓
VERSIONS.md updated, affected SKILL files patched, tests re-run
```

**3. Documentation changes** — when Zama updates their docs (automatic, weekly):
```
skill-watch-docs.yml runs every Thursday
        ↓
Fetches 5 Zama docs pages, hashes content, compares to stored snapshots
        ↓
If content changed → opens GitHub Issue (skill-gap) with which page changed
        ↓
Maintainer reviews the diff, updates the relevant SKILL file(s)
```

**If you are an AI agent reading this:**
- Check `KNOWN_GAPS.md` before generating code — it lists patterns that are still being validated
- If you produce code that fails, note the failure pattern so it can be added to the anti-patterns section
- Always use the version of the API documented here — do not guess at newer APIs

**If you are a developer using this skill:**
- When the agent's generated code doesn't compile or fails tests, open `FEEDBACK.md` and fill in the template
- Your report directly improves the skill for every future developer

---

## Table of Contents

> **Quick navigation across the skill file system:**
> - Full API (types, ops, ACL, addresses) → **[SKILL-REFERENCE.md](SKILL-REFERENCE.md)**
> - Copy-paste contract templates → **[SKILL-TEMPLATES.md](SKILL-TEMPLATES.md)**
> - Test patterns and debug guide → **[SKILL-TESTING.md](SKILL-TESTING.md)**

### This file (SKILL.md — master overview)

1. [Mental Model](#1-mental-model)
2. [Project Setup](#2-project-setup)
3. [Encrypted Types](#3-encrypted-types)
4. [FHE Operations](#4-fhe-operations)
5. [Gas Model — HCU](#4b-gas-model--hcu-homomorphic-complexity-units)
6. [Encrypted Inputs (Contract Side)](#5-encrypted-inputs-contract-side)
7. [Access Control List (ACL)](#6-access-control-list-acl)
8. [Branching and Conditions](#7-branching-and-conditions)
9. [Decryption Patterns](#8-decryption-patterns)
10. [Frontend Integration (Relayer SDK)](#9-frontend-integration-relayer-sdk)
    - 10b. [NextJS / Scaffold-ETH Integration](#9b-nextjs--scaffold-eth-integration)
11. [Testing with Hardhat](#10-testing-with-hardhat)
12. [Complete Contract Example](#11-complete-contract-example)
13. [ERC7984 — Confidential Token Standard](#11b-erc7984--confidential-token-standard)
14. [Deployment Addresses](#11c-deployment-addresses)
    - 14b. [Deploying to Sepolia](#11d-deploying-to-sepolia)
15. [Anti-Patterns and Gotchas](#12-anti-patterns-and-gotchas)
16. [Quick Reference Cheatsheet](#13-quick-reference-cheatsheet)
17. [Troubleshooting Index](#14-troubleshooting-index)
18. [Glossary](#15-glossary)

---

## 1. Mental Model

FHEVM (Fully Homomorphic Encryption Virtual Machine) lets smart contracts compute over encrypted data without ever decrypting it on-chain.

**Key architectural facts:**

- **Handles, not values.** Encrypted types (`euint64`, `ebool`, etc.) are `bytes32` handles pointing to off-chain ciphertexts. On-chain code never sees plaintext.
- **Symbolic execution.** When you call `FHE.add(a, b)`, the EVM records the operation and emits an event. Off-chain coprocessors actually perform the FHE computation and store the result ciphertext.
- **ACL controls who can decrypt.** Every ciphertext handle has an Access Control List. You must explicitly grant access with `FHE.allow()` / `FHE.allowThis()` or no one — including the owning contract — can reuse or decrypt it.
- **Decryption is async and off-chain.** There is no synchronous decrypt in a transaction. Decryption requires off-chain interaction with the Zama Gateway/relayer.
- **No plaintext conditionals on encrypted values.** You cannot use `if (encryptedBool)` — use `FHE.select()` instead.

---

## 2. Project Setup

### Installation

```bash
# Using the official template (recommended)
git clone https://github.com/zama-ai/fhevm-react-template
cd fhevm-react-template
git submodule update --init --recursive
pnpm install
```

Or install libraries manually:

```bash
npm install @fhevm/solidity
npm install @zama-fhe/relayer-sdk
npm install @openzeppelin/confidential-contracts  # optional, for ERC7984
```

### Hardhat Config

```typescript
// hardhat.config.ts
import "@fhevm/hardhat-plugin";
import { HardhatUserConfig } from "hardhat/config";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.MNEMONIC ? { mnemonic: process.env.MNEMONIC } : [],
    },
  },
};

export default config;
```

### Minimal Contract Boilerplate

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint64, externalEuint64 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract MyConfidentialContract is ZamaEthereumConfig {
    // your state and functions here
}
```

**Rules:**
- Always inherit `ZamaEthereumConfig` (wires up ACL, FHEVMExecutor, KMSVerifier, InputVerifier for Sepolia/Mainnet)
- Always import both `FHE` library and the encrypted types you use
- Import `externalEuintXX` types for function parameters that accept user input

---

## 3. Encrypted Types

### Available Types

| Solidity Type | Bits | Notes |
|---|---|---|
| `ebool` | 2 | Supports: `and`, `or`, `xor`, `eq`, `ne`, `not`, `select`, `rand` |
| `euint8` | 8 | Full arithmetic + bitwise + comparisons |
| `euint16` | 16 | Full arithmetic + bitwise + comparisons |
| `euint32` | 32 | Full arithmetic + bitwise + comparisons |
| `euint64` | 64 | Full arithmetic + bitwise + comparisons |
| `euint128` | 128 | Full arithmetic + bitwise + comparisons |
| `euint160` / `eaddress` | 160 | Only: `eq`, `ne`, `select`; use `eaddress` alias for encrypted addresses |
| `euint256` | 256 | Bitwise/logical only - NO arithmetic (add/sub/mul/div/rem not supported); locally validated for `and`, `or`, `xor`, `not`, `eq`, `ne`, `select` |

**External input types** (for function parameters receiving user-submitted ciphertexts):

| Type | Use for |
|---|---|
| `externalEbool` | Encrypted boolean from user |
| `externalEuint8` … `externalEuint256` | Encrypted integers from user |
| `externalEaddress` | Encrypted address from user |

### Declaring State Variables

```solidity
euint64 private _balance;
ebool private _flag;
eaddress private _owner;
mapping(address => euint64) private _balances;
```

### Trivial Encryption (plaintext → encrypted)

```solidity
euint64 zero = FHE.asEuint64(0);
euint32 hundred = FHE.asEuint32(100);
ebool truth = FHE.asEbool(true);
eaddress encAddr = FHE.asEaddress(msg.sender);
```

> **Warning:** Trivial encryption is publicly visible on-chain — the plaintext value is known. Use it only for constants or public initial values.

### Casting Between Encrypted Types

```solidity
euint64 big = FHE.asEuint64(1000);
euint32 small = FHE.asEuint32(big);   // truncates — loses upper 32 bits
euint64 back = FHE.asEuint64(small);  // safe, pads with zeros
ebool asBool = FHE.asEbool(small);    // non-zero → true
```

**Rule:** Casting to a smaller type **truncates silently**. No revert.

### Initialization Check

```solidity
// Uninitialized euint is the zero handle (bytes32(0))
// Always initialize before use
if (!FHE.isInitialized(_count)) {
    _count = FHE.asEuint32(0);
    FHE.allowThis(_count);
}
```

---

## 4. FHE Operations

All operations are called as `FHE.<op>(a, b)`. Many accept a mix of encrypted and plaintext (scalar) operands.

### Arithmetic

```solidity
euint64 sum  = FHE.add(_balance, amount);    // encrypted + encrypted
euint64 sum2 = FHE.add(_balance, uint64(5)); // encrypted + plaintext scalar (cheaper)
euint64 diff = FHE.sub(_balance, amount);
euint64 prod = FHE.mul(amount, uint64(2));
euint64 neg  = FHE.neg(amount);

// div/rem: right-hand side MUST be plaintext
euint64 half = FHE.div(amount, uint64(2));   // OK
euint64 rem  = FHE.rem(amount, uint64(10));  // OK
// FHE.div(a, b) where b is euint64 → COMPILE ERROR
```

> **Important:** Arithmetic wraps on overflow (unchecked). There is no SafeMath equivalent yet for encrypted types.

### Comparison (returns `ebool`)

```solidity
ebool isEqual   = FHE.eq(a, b);
ebool isNotEq   = FHE.ne(a, b);
ebool isGreater = FHE.gt(a, b);
ebool isGTE     = FHE.ge(a, b);
ebool isLess    = FHE.lt(a, b);
ebool isLTE     = FHE.le(a, b);
euint64 minVal  = FHE.min(a, b);
euint64 maxVal  = FHE.max(a, b);
```

### Bitwise

```solidity
euint32 andVal = FHE.and(a, b);
euint32 orVal  = FHE.or(a, b);
euint32 xorVal = FHE.xor(a, b);
euint32 notVal = FHE.not(a);
euint32 shlVal = FHE.shl(a, uint8(2));   // shift left by plaintext
euint32 shrVal = FHE.shr(a, uint8(2));   // shift right by plaintext
euint32 rotl   = FHE.rotl(a, uint8(3));
euint32 rotr   = FHE.rotr(a, uint8(3));
// Shift amount is computed modulo bit width automatically
```

### Select (Encrypted Ternary)

```solidity
// select(condition, valueIfTrue, valueIfFalse)
ebool condition = FHE.ge(a, b);
euint64 result  = FHE.select(condition, a, b); // returns a if a >= b, else b
```

This is the ONLY way to do conditional logic on encrypted values.

### Random Numbers

```solidity
euint64 rand64   = FHE.randEuint64();
euint32 rand32   = FHE.randEuint32();
euint8  rand8B   = FHE.randEuint8Bounded(uint8(100)); // 0..99
```

> Random numbers are pseudo-random, seeded by the coprocessor. They are encrypted and not revealed on-chain.

---

## 4b. Gas Model — HCU (Homomorphic Complexity Units)

FHE operations are metered in **HCU** (Homomorphic Complexity Units), not just EVM gas. Exceeding limits causes transaction reversion.

### Transaction Limits

| Limit | Value |
|---|---|
| Global HCU per transaction | 20,000,000 |
| Sequential depth per transaction | 5,000,000 |

### Sample Operation Costs

| Operation | Type | HCU Cost |
|---|---|---|
| Cast / trivial encrypt | any | ~32 |
| `ebool and/or/xor` | ebool | 22,000–25,000 |
| `euint8` add/sub | euint8 | ~50,000 |
| `euint8` mul | euint8 | 122,000–150,000 |
| `euint64` add/sub | euint64 | ~100,000 |
| `euint64` mul | euint64 | ~400,000 |
| `euint128` mul | euint128 | 696,000–1,686,000 |
| `FHE.select` | euint64 | ~100,000 |

### Optimization Rules

1. **Prefer scalar operands** — `FHE.add(a, uint64(5))` costs less than `FHE.add(a, b)` (encrypted + encrypted)
2. **Use smallest type that fits** — `euint8` is much cheaper than `euint128`
3. **Avoid encrypted array indexing** — O(n) equality checks are extremely expensive; use plaintext indices where possible
4. **Split work across transactions** — if logic exceeds 5M HCU sequential depth, break it into multiple calls
5. **Prefer bitwise ops over arithmetic** — `and/or/xor` cost ~5× less than `add/mul`
6. **Fixed-length loops only** — you cannot break a loop on an encrypted condition; keep loop bounds small

### HCU Worked Example

**Function:** `submitScore()` in ConfidentialLeaderboard

```solidity
function submitScore(externalEuint64 encScore, bytes calldata inputProof) external {
    euint64 score    = FHE.fromExternal(encScore, inputProof);  // ~32 HCU (cast)
    ebool isNewTop   = FHE.gt(score, _topScore);                // ~100k HCU (comparison)
    _topScore        = FHE.select(isNewTop, score, _topScore);  // ~100k HCU (select)
    _topPlayer       = FHE.select(isNewTop, ...);               // ~100k HCU (select eaddress)
    ebool beatsPB    = FHE.gt(score, _personalBest[...]);       // ~100k HCU (comparison)
    _personalBest    = FHE.select(beatsPB, score, _personalBest); // ~100k HCU (select)
    _lastError       = FHE.select(isNewTop, ...);               // ~25k  HCU (select euint8)
    // Total estimate: ~525k HCU — well under 5M sequential limit
}
```

**Rule of thumb:** Each `euint64` comparison or select costs ~100k HCU. A typical function doing 5–8 FHE ops uses ~500k–800k HCU — safe. Only worry when you have 20+ FHE ops in one function.

### Loop Pattern (bounded, no encrypted break)

```solidity
// WRONG — cannot break on encrypted condition
for (uint i = 0; i < n; i++) {
    if (FHE.lt(x, limit)) break; // COMPILE ERROR — ebool is not bool
}

// CORRECT — fixed bounds, use select to conditionally no-op
for (uint32 i = 0; i < 10; i++) {
    euint8 increment = FHE.select(FHE.lt(x, limit), FHE.asEuint8(1), FHE.asEuint8(0));
    x = FHE.add(x, increment);
}
```

---

## 5. Encrypted Inputs (Contract Side)

When users submit encrypted data, use `externalEuintXX` parameter types and validate with `FHE.fromExternal`.

### Function Signature Pattern

```solidity
function transfer(
    address to,
    externalEuint64 encryptedAmount,
    bytes calldata inputProof
) external {
    // Validate the proof and extract usable encrypted handle
    euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);
    // ... use amount
}
```

### Multiple Encrypted Parameters

```solidity
function multiInput(
    externalEbool   encBool,
    externalEuint64 encAmount,
    externalEuint8  encType,
    bytes calldata  inputProof   // single proof covers all params
) external {
    ebool   flag   = FHE.fromExternal(encBool,   inputProof);
    euint64 amount = FHE.fromExternal(encAmount, inputProof);
    euint8  kind   = FHE.fromExternal(encType,   inputProof);
}
```

> One `inputProof` bytes blob covers all `externalEuintXX` parameters in a single call — they are packed together by the SDK.

### Rules for Encrypted Inputs

- **Always call `FHE.fromExternal(param, inputProof)`** before using the value. This validates the ZKPoK.
- Never store `externalEuintXX` values directly — always convert first.
- After `fromExternal`, you MUST grant ACL permissions to anyone who needs to use the result (including the contract itself).

---

## 6. Access Control List (ACL)

**Every encrypted handle requires explicit ACL grants.** Without them, the handle cannot be reused in future transactions or decrypted.

### ACL Functions

```solidity
// Permanent (persistent across transactions) — stored in ACL contract
FHE.allow(ciphertext, someAddress);    // grant to specific address
FHE.allowThis(ciphertext);             // shorthand: grant to address(this)

// Transient (current transaction only) — uses EIP-1153 transient storage, cheaper
FHE.allowTransient(ciphertext, someAddress);

// Public decryption — marks ciphertext as publicly decryptable by anyone
FHE.makePubliclyDecryptable(ciphertext);

// Verification
bool ok1 = FHE.isAllowed(ciphertext, someAddress);
bool ok2 = FHE.isSenderAllowed(ciphertext); // checks msg.sender
```

### Method-Chaining Syntax

```solidity
using FHE for *;

// Equivalent to multiple FHE.allow() calls
ciphertext.allowThis().allow(msg.sender).allow(recipient);
```

### The Golden Rule of ACL

After **every operation that creates a new ciphertext handle**, you must re-grant permissions. FHE operations produce NEW handles, not mutations.

> ---
> **🔴 CRITICAL — Admin/Owner Access:**
>
> `FHE.allowThis(handle)` grants access to `address(this)` — the **contract itself**.
> It does **NOT** grant access to the contract owner, deployer, or any EOA.
>
> If an owner needs to decrypt a value (read tallies, reveal results), they need:
> ```solidity
> FHE.allow(handle, ownerAddress);  // explicit grant to the owner EOA
> ```
> This must be called every time the handle changes (after every FHE operation).
> Forgetting this is the #1 source of `"User is not authorized to decrypt"` errors.
> ---

```solidity
// WRONG — _balance handle changed after add(), old permissions gone
_balance = FHE.add(_balance, amount);

// CORRECT — re-grant after every mutation
_balance = FHE.add(_balance, amount);
FHE.allowThis(_balance);        // contract can reuse in future txs
FHE.allow(_balance, msg.sender); // user can decrypt their own balance
```

### Token Transfer ACL Pattern

```solidity
function transfer(address to, externalEuint64 encAmount, bytes calldata proof) external {
    euint64 amount = FHE.fromExternal(encAmount, proof);

    // Validate sender has sufficient balance (encrypted — no revert, use select)
    ebool hasEnough = FHE.le(amount, _balances[msg.sender]);
    euint64 actualAmount = FHE.select(hasEnough, amount, FHE.asEuint64(0));

    euint64 newFromBalance = FHE.sub(_balances[msg.sender], actualAmount);
    euint64 newToBalance   = FHE.add(_balances[to], actualAmount);

    _balances[msg.sender] = newFromBalance;
    _balances[to]         = newToBalance;

    // Re-grant ACL for both updated balances
    FHE.allowThis(_balances[msg.sender]);
    FHE.allow(_balances[msg.sender], msg.sender);
    FHE.allowThis(_balances[to]);
    FHE.allow(_balances[to], to);
}
```

### View Functions Returning Encrypted Handles

A view function that returns an encrypted handle is only useful if the **caller** has ACL access to it. Grant access when the handle is created, not at read time.

```solidity
// Contract storage + grants
mapping(address => euint64) private _balances;

function deposit(externalEuint64 enc, bytes calldata proof) external {
    euint64 amount = FHE.fromExternal(enc, proof);
    _balances[msg.sender] = FHE.add(_balances[msg.sender], amount);
    FHE.allowThis(_balances[msg.sender]);
    FHE.allow(_balances[msg.sender], msg.sender); // ← caller can now decrypt
}

// This view works only because FHE.allow(..., msg.sender) was called above
function balanceOf(address account) external view returns (euint64) {
    return _balances[account];
}
```

If you forget `FHE.allow(handle, caller)`, the caller gets the bytes32 handle but the relayer will reject their decryption request.

### Handle Conversion Utility

```solidity
// Convert any encrypted type to its raw bytes32 handle
// Used when building the handles array for FHE.checkSignatures()
bytes32 rawHandle = FHE.toBytes32(_yesCount);   // euint64 → bytes32
bytes32 rawHandle2 = FHE.toBytes32(_flag);       // ebool  → bytes32
bytes32 rawHandle3 = FHE.toBytes32(_owner);      // eaddress → bytes32
```

### Passing Encrypted Values Between Contracts

When calling an external contract with an encrypted value, use `allowTransient`:

```solidity
// Before calling external contract with an encrypted param
FHE.allowTransient(encryptedValue, address(externalContract));
externalContract.process(encryptedValue);
```

### Validating Caller Has Access (Access-Gated Functions)

```solidity
// Prevent unauthorized callers from submitting someone else's handle
function transfer(address to, euint64 encryptedAmount) public {
    require(
        FHE.isSenderAllowed(encryptedAmount),
        "Caller does not have ACL access to this ciphertext"
    );
    // safe to use encryptedAmount here
}
```

---

## 7. Branching and Conditions

**You cannot use `if`, `require`, or ternary `?:` on `ebool` values.**

### Pattern: Use `FHE.select`

```solidity
// WRONG — will not compile or will give wrong results
if (FHE.gt(a, b)) { ... }
require(FHE.gt(a, b), "too small");

// CORRECT
ebool condition = FHE.gt(a, b);
euint64 result  = FHE.select(condition, a, b);
```

### Overflow-Safe Add Pattern

```solidity
function safeAdd(euint32 supply, euint32 amount) internal returns (euint32) {
    euint32 tempValue  = FHE.add(supply, amount);
    ebool   overflow   = FHE.lt(tempValue, supply); // wrapped → smaller than original
    return FHE.select(overflow, supply, tempValue); // keep supply unchanged on overflow
}
```

### Error Handling Without Revert

Since you can't revert based on an encrypted condition, the pattern is "silent clamp":

```solidity
// Instead of: require(balance >= amount)
euint64 safeAmount = FHE.select(FHE.le(amount, balance), amount, FHE.asEuint64(0));
// If amount > balance, safeAmount becomes 0 (no-op transfer)
```

### Encrypted Error Codes Pattern

When you need to communicate failure to a user without revealing *why* (which could leak info), store an encrypted error code:

```solidity
// Error codes (plaintext enum, stored as encrypted value)
uint8 constant ERR_NONE             = 0;
uint8 constant ERR_INSUFFICIENT_BAL = 1;
uint8 constant ERR_TRANSFER_ZERO    = 2;

mapping(address => euint8)   private _errorCode;
mapping(address => uint256)  public  errorTimestamp;

function transfer(address to, externalEuint64 enc, bytes calldata proof) external {
    euint64 amount = FHE.fromExternal(enc, proof);
    ebool   ok     = FHE.le(amount, _balances[msg.sender]);

    // Log encrypted error code — ERR_NONE if ok, ERR_INSUFFICIENT_BAL if not
    _errorCode[msg.sender] = FHE.select(
        ok,
        FHE.asEuint8(ERR_NONE),
        FHE.asEuint8(ERR_INSUFFICIENT_BAL)
    );
    FHE.allow(_errorCode[msg.sender], msg.sender);
    errorTimestamp[msg.sender] = block.timestamp;

    // Proceed with clamped transfer regardless
    euint64 safe = FHE.select(ok, amount, FHE.asEuint64(0));
    _balances[msg.sender] = FHE.sub(_balances[msg.sender], safe);
    _balances[to]         = FHE.add(_balances[to], safe);
    FHE.allowThis(_balances[msg.sender]);
    FHE.allow(_balances[msg.sender], msg.sender);
    FHE.allowThis(_balances[to]);
    FHE.allow(_balances[to], to);

    emit TransferAttempt(msg.sender, to); // event signals frontend to check error
}

function getErrorCode() external view returns (euint8) {
    return _errorCode[msg.sender];
}
```

### Transitioning to Public Logic (Decryption Gate)

When you need a plaintext branch after decryption:

```solidity
// Step 1: Mark for public decryption
function revealResult() external {
    FHE.makePubliclyDecryptable(encryptedWinner);
}

// Step 2: Accept decryption proof from off-chain relayer
function claimPrize(address winner, bytes calldata decryptionProof) external {
    bytes32[] memory handles = new bytes32[](1);
    handles[0] = FHE.toBytes32(encryptedWinner);
    bytes memory cleartexts = abi.encode(winner);

    FHE.checkSignatures(handles, cleartexts, decryptionProof); // reverts if invalid
    // Now we know winner is correct — proceed with plaintext logic
    _transferPrize(winner);
}
```

---

## 8. Decryption Patterns

There are two decryption flows: **user decryption** (private, for the data owner) and **public decryption** (for publicly revealed values).

### 8a. User Decryption (Re-encryption)

The user decrypts data that belongs to them. The ciphertext is re-encrypted under the user's public key off-chain.

**Contract requirements:**
1. Return the encrypted handle via a view function
2. Ensure `FHE.allow(handle, userAddress)` was called when the handle was created

```solidity
function getBalance(address account) external view returns (euint64) {
    return _balances[account];
    // ACL: FHE.allow(_balances[account], account) must have been called
}
```

**Frontend (TypeScript):**

```typescript
import { createInstance, SepoliaConfig } from "@zama-fhe/relayer-sdk";

const instance = await createInstance({
  ...SepoliaConfig,
  network: window.ethereum,
});

// 1. Generate keypair
const keypair = instance.generateKeypair();

// 2. Create EIP-712 message
const startTime = Math.floor(Date.now() / 1000).toString();
const duration  = "10"; // days
const eip712    = instance.createEIP712(
  keypair.publicKey,
  [contractAddress],
  startTime,
  duration,
);

// 3. Sign with user's wallet
const signature = await signer.signTypedData(
  eip712.domain,
  { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
  eip712.message,
);

// 4. Fetch and decrypt the handle
const handle = await contract.getBalance(signer.address);

const result = await instance.userDecrypt(
  [{ handle, contractAddress }],
  keypair.privateKey,
  keypair.publicKey,
  signature.replace("0x", ""),
  [contractAddress],
  signer.address,
  startTime,
  duration,
);

const plainBalance = result[handle]; // BigInt
```

> **Limit:** Total bit length of all ciphertexts in one `userDecrypt` call must not exceed **2048 bits**.

### 8b. Public Decryption (On-chain verification)

For revealing values publicly (e.g., auction winner, game result).

**Contract — mark for decryption:**

```solidity
function endAuction() external onlyAfterDeadline {
    FHE.makePubliclyDecryptable(highestBidder);
    FHE.makePubliclyDecryptable(highestBid);
}
```

**Off-chain (TypeScript) — fetch cleartext + proof:**

```typescript
// handles must be in the SAME ORDER you called makePubliclyDecryptable
const handles = [highestBidderHandle, highestBidHandle];

const { clearValues, abiEncodedClearValues, decryptionProof } =
  instance.publicDecrypt(handles);

// clearValues[handles[0]] → decrypted winner address
// clearValues[handles[1]] → decrypted bid amount
```

**Contract — verify and use:**

```solidity
function resolveAuction(
    address winner,
    uint64  amount,
    bytes calldata decryptionProof
) external {
    bytes32[] memory handles = new bytes32[](2);
    handles[0] = FHE.toBytes32(highestBidder);
    handles[1] = FHE.toBytes32(highestBid);
    bytes memory cleartexts = abi.encode(winner, amount);

    FHE.checkSignatures(handles, cleartexts, decryptionProof);
    // verified — execute plaintext logic
    _settle(winner, amount);
}
```

> ---
> **🔴 CRITICAL — Handle Order is Proof-Bound:**
>
> The decryption proof is cryptographically tied to the **exact order** of handles.
> `publicDecrypt([topScore, topBidder])` produces a proof only valid for `[topScore, topBidder]`.
>
> ```solidity
> // WRONG — swapped order, checkSignatures will REVERT with no helpful error
> handles[0] = FHE.toBytes32(topBidder);  // was index 1 in publicDecrypt
> handles[1] = FHE.toBytes32(topScore);   // was index 0 in publicDecrypt
>
> // CORRECT — same order as publicDecrypt call
> handles[0] = FHE.toBytes32(topScore);   // index 0 in publicDecrypt
> handles[1] = FHE.toBytes32(topBidder);  // index 1 in publicDecrypt
> ```
>
> Use comments in your contract to document which index is which.
> ---

### Validated: 3-Handle Public Decryption (GAP-002 closed v1.7.0)

Validated end-to-end on Sepolia via `PublicDecryptionVerifier`
([0x72B0BBB2](https://sepolia.etherscan.io/address/0x72B0BBB2172FcAAaF01e052C81C8B9638686047D)).
3+ handles work identically to 1–2 handles — same rules apply.

**Solidity:**
```solidity
function revealAll() external onlyOwner {
    FHE.makePubliclyDecryptable(_valueA);
    FHE.makePubliclyDecryptable(_valueB);
    FHE.makePubliclyDecryptable(_valueC);
}

function verify(uint64 a, uint64 b, uint64 c, bytes calldata decryptionProof) external {
    bytes32[] memory handles = new bytes32[](3);
    handles[0] = FHE.toBytes32(_valueA);  // index 0 — must match publicDecrypt order
    handles[1] = FHE.toBytes32(_valueB);  // index 1
    handles[2] = FHE.toBytes32(_valueC);  // index 2

    bytes memory cleartexts = abi.encode(a, b, c);  // same order as handles[]
    FHE.checkSignatures(handles, cleartexts, decryptionProof);
    revealed = true;
}
```

**TypeScript:**
```typescript
// After revealAll() is confirmed on-chain:
const [handleA, handleB, handleC] = await contract.getHandles();
const results = await fhevm.publicDecrypt([handleA, handleB, handleC]);

// clearValues is a plain object keyed by handle hex string, values are bigint
const a = BigInt(String(results.clearValues[handleA]));
const b = BigInt(String(results.clearValues[handleB]));
const c = BigInt(String(results.clearValues[handleC]));

await contract.verify(a, b, c, results.decryptionProof);
```

---

## 9. Frontend Integration (Relayer SDK)

### Installation

```bash
npm install @zama-fhe/relayer-sdk
```

### SDK Initialization

```typescript
import { createInstance, SepoliaConfig, MainnetConfig } from "@zama-fhe/relayer-sdk";

// Testnet (Sepolia)
const instance = await createInstance({
  ...SepoliaConfig,
  network: window.ethereum, // or RPC URL string
});

// Mainnet (requires API key)
const instance = await createInstance({
  ...MainnetConfig,
  network: window.ethereum,
  auth: { __type: "ApiKeyHeader", value: process.env.ZAMA_FHEVM_API_KEY },
});
```

Network IDs: Sepolia chainId = `11155111`, gatewayChainId = `10901`. Mainnet chainId = `1`, gatewayChainId = `261131`.

### Creating Encrypted Inputs

```typescript
// 1. Create input buffer (bound to contract + user)
const input = instance.createEncryptedInput(contractAddress, userAddress);

// 2. Add values (order matters — maps to handles[0], handles[1], ...)
input.addBool(true);             // → handles[0] as externalEbool
input.add64(BigInt(1000));       // → handles[1] as externalEuint64
input.add8(5);                   // → handles[2] as externalEuint8
input.add32(42);
input.add128(BigInt("999999999999999999"));
input.addAddress("0x1234...");   // → as externalEaddress

// 3. Encrypt (async — sends to relayer for proof generation)
const encrypted = await input.encrypt();

// 4. Extract for contract call
const handle0     = encrypted.handles[0]; // externalEbool param
const handle1     = encrypted.handles[1]; // externalEuint64 param
const inputProof  = encrypted.inputProof; // bytes calldata proof
```

### Calling the Contract

```typescript
await contract.transfer(
  recipientAddress,
  encrypted.handles[0],  // externalEuint64 encryptedAmount
  encrypted.inputProof,  // bytes calldata inputProof
);
```

### React Hook Pattern

```typescript
// hooks/useConfidentialToken.ts
import { useCallback, useState } from "react";
import { createInstance, SepoliaConfig } from "@zama-fhe/relayer-sdk";

export function useConfidentialToken(contract, signer) {
  const [instance, setInstance] = useState(null);

  const init = useCallback(async () => {
    const inst = await createInstance({
      ...SepoliaConfig,
      network: window.ethereum,
    });
    setInstance(inst);
  }, []);

  const transfer = useCallback(async (to: string, amount: bigint) => {
    const input = instance.createEncryptedInput(contract.address, signer.address);
    input.add64(amount);
    const enc = await input.encrypt();
    return contract.transfer(to, enc.handles[0], enc.inputProof);
  }, [instance, contract, signer]);

  const getBalance = useCallback(async () => {
    const handle = await contract.balanceOf(signer.address);
    const keypair = instance.generateKeypair();
    const startTime = Math.floor(Date.now() / 1000).toString();
    const eip712 = instance.createEIP712(keypair.publicKey, [contract.address], startTime, "10");
    const sig = await signer.signTypedData(
      eip712.domain,
      { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
      eip712.message,
    );
    const result = await instance.userDecrypt(
      [{ handle, contractAddress: contract.address }],
      keypair.privateKey, keypair.publicKey,
      sig.replace("0x", ""),
      [contract.address], signer.address, startTime, "10",
    );
    return result[handle];
  }, [instance, contract, signer]);

  return { init, transfer, getBalance };
}
```

---

## 9b. NextJS Integration (Scaffold-ETH Template)

The `fhevm-react-template` ships with a NextJS frontend in `packages/nextjs/` built on Scaffold-ETH. Here's how to wire FHEVM contracts into it.

### Project structure

```
packages/nextjs/
├── app/                      # Next.js app router pages
├── components/               # Shared UI components
├── contracts/                # Auto-generated — run `pnpm generate`
│   └── deployedContracts.ts  # ABI + address per network
├── hooks/
│   ├── fhecounter-example/   # Reference: useFHECounterWagmi.tsx
│   └── helper/               # MetaMask EIP-6963 helpers
└── .env.local                # NEXT_PUBLIC_* env vars
```

### Step 1 — Generate contract bindings

After deploying, run from project root:

```cmd
pnpm generate
```

This reads `packages/hardhat/deployments/` and writes typed ABIs to `packages/nextjs/contracts/deployedContracts.ts`.

### Step 2 — Initialize FHEVM instance in a provider

```typescript
// components/FhevmProvider.tsx
"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { createInstance, SepoliaConfig } from "@zama-fhe/relayer-sdk";
import type { FhevmInstance } from "@zama-fhe/relayer-sdk";

const FhevmContext = createContext<FhevmInstance | null>(null);

export function FhevmProvider({ children }: { children: React.ReactNode }) {
  const [instance, setInstance] = useState<FhevmInstance | null>(null);

  useEffect(() => {
    createInstance({ ...SepoliaConfig, network: window.ethereum })
      .then(setInstance)
      .catch(console.error);
  }, []);

  return <FhevmContext.Provider value={instance}>{children}</FhevmContext.Provider>;
}

export const useFhevm = () => useContext(FhevmContext);
```

Wrap your app in `layout.tsx`:

```typescript
// app/layout.tsx
import { FhevmProvider } from "~~/components/FhevmProvider";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <FhevmProvider>{children}</FhevmProvider>
      </body>
    </html>
  );
}
```

### Step 3 — Encrypt and submit from a page

```typescript
// app/vote/page.tsx
"use client";
import { useFhevm } from "~~/components/FhevmProvider";
import { useScaffoldWriteContract, useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { useAccount } from "wagmi";

export default function VotePage() {
  const { address } = useAccount();
  const instance  = useFhevm();
  const { writeContractAsync } = useScaffoldWriteContract("ConfidentialVoting");

  const castVote = async (voteYes: boolean) => {
    if (!instance || !address) return;

    // Encrypt the vote
    const input = instance.createEncryptedInput(
      CONTRACT_ADDRESS,
      address,
    );
    input.addBool(voteYes);
    const enc = await input.encrypt();

    // Submit encrypted vote to contract
    await writeContractAsync({
      functionName: "castVote",
      args: [enc.handles[0], enc.inputProof],
    });
  };

  return (
    <div>
      <button onClick={() => castVote(true)}>Vote YES</button>
      <button onClick={() => castVote(false)}>Vote NO</button>
    </div>
  );
}
```

### Step 4 — Display decrypted balance

```typescript
// components/ConfidentialBalance.tsx
"use client";
import { useState } from "react";
import { useFhevm } from "~~/components/FhevmProvider";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { useAccount, useWalletClient } from "wagmi";

export function ConfidentialBalance({ contractAddress }: { contractAddress: string }) {
  const { address }       = useAccount();
  const { data: signer }  = useWalletClient();
  const instance          = useFhevm();
  const [balance, setBalance] = useState<bigint | null>(null);

  const { data: encHandle } = useScaffoldReadContract({
    contractName: "ConfidentialToken",
    functionName: "balanceOf",
    args: [address],
  });

  const decrypt = async () => {
    if (!instance || !signer || !encHandle) return;

    const keypair   = instance.generateKeypair();
    const startTime = Math.floor(Date.now() / 1000).toString();
    const eip712    = instance.createEIP712(keypair.publicKey, [contractAddress], startTime, "10");
    const sig       = await signer.signTypedData({
      domain: eip712.domain,
      types: { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
      primaryType: "UserDecryptRequestVerification",
      message: eip712.message,
    });

    const result = await instance.userDecrypt(
      [{ handle: encHandle, contractAddress }],
      keypair.privateKey, keypair.publicKey,
      sig.replace("0x", ""),
      [contractAddress], address!, startTime, "10",
    );

    setBalance(result[encHandle] as bigint);
  };

  return (
    <div>
      <button onClick={decrypt}>Reveal My Balance</button>
      {balance !== null && <p>Balance: {balance.toString()}</p>}
    </div>
  );
}
```

### Key NextJS rules

- Always mark components using `window.ethereum` as `"use client"`
- Initialize FHEVM instance once in a provider — don't recreate per component
- Use `useScaffoldWriteContract` / `useScaffoldReadContract` from Scaffold-ETH for typed contract calls
- The `pnpm generate` script must be re-run after every new deployment

---

## 10. Testing with Hardhat

### Setup

```typescript
// hardhat.config.ts — must include the plugin
import "@fhevm/hardhat-plugin";
```

```typescript
// test/MyContract.test.ts
import { fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { ethers } from "hardhat";
```

### Creating Encrypted Inputs in Tests

```typescript
it("should transfer confidentially", async () => {
  const [alice, bob] = await ethers.getSigners();
  const contract = await ethers.deployContract("ConfidentialToken");

  // Create encrypted input
  const input = fhevm.createEncryptedInput(
    await contract.getAddress(),
    alice.address,
  );
  input.add64(BigInt(500)); // transfer amount
  const enc = await input.encrypt();

  await contract.connect(alice).transfer(
    bob.address,
    enc.handles[0],
    enc.inputProof,
  );
});
```

### Decrypting Values in Tests (Assertions)

```typescript
// Get the encrypted handle
const encBalance = await contract.balanceOf(bob.address);

// Decrypt for assertion — only works if FHE.allow(handle, bob) was called
const plainBalance = await fhevm.userDecryptEuint(
  FhevmType.euint64,
  encBalance,
  await contract.getAddress(),
  bob,
);

expect(plainBalance).to.equal(BigInt(500));
```

Available decrypt helpers by type:

| Function | Type |
|---|---|
| `fhevm.userDecryptEuint(FhevmType.euint8, ...)` | `euint8` |
| `fhevm.userDecryptEuint(FhevmType.euint16, ...)` | `euint16` |
| `fhevm.userDecryptEuint(FhevmType.euint32, ...)` | `euint32` |
| `fhevm.userDecryptEuint(FhevmType.euint64, ...)` | `euint64` |
| `fhevm.userDecryptEbool(...)` | `ebool` |
| `fhevm.userDecryptEaddress(...)` | `eaddress` |

### Full Test Example

```typescript
import { fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("FHECounter", () => {
  it("increments encrypted counter", async () => {
    const [alice] = await ethers.getSigners();
    const Counter = await ethers.getContractFactory("FHECounter");
    const counter = await Counter.deploy();
    await counter.waitForDeployment();

    const addr = await counter.getAddress();

    // Encrypt the increment value
    const input = fhevm.createEncryptedInput(addr, alice.address);
    input.add32(42);
    const enc = await input.encrypt();

    await counter.connect(alice).increment(enc.handles[0], enc.inputProof);

    // Decrypt and assert
    const encCount = await counter.getCount();
    const count = await fhevm.userDecryptEuint(FhevmType.euint32, encCount, addr, alice);
    expect(count).to.equal(BigInt(42));
  });
});
```

> **Requirement:** The contract must have called `FHE.allow(handle, alice.address)` for `userDecryptEuint` to succeed.

---

## 11. Complete Contract Example

A production-ready confidential ERC-20-style token:

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint64, ebool, externalEuint64 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract ConfidentialToken is ZamaEthereumConfig {
    string public name;
    string public symbol;
    uint64 public totalSupply;

    mapping(address => euint64) private _balances;

    event Transfer(address indexed from, address indexed to);

    constructor(string memory _name, string memory _symbol, uint64 initialSupply) {
        name = _name;
        symbol = _symbol;
        totalSupply = initialSupply;

        // Mint to deployer — use trivial encryption for initial (publicly known) value
        _balances[msg.sender] = FHE.asEuint64(initialSupply);
        FHE.allowThis(_balances[msg.sender]);
        FHE.allow(_balances[msg.sender], msg.sender);
    }

    /// @notice Returns the encrypted balance handle. Caller must have ACL access to decrypt.
    function balanceOf(address account) external view returns (euint64) {
        return _balances[account];
    }

    /// @notice Transfer encrypted amount. Amount clamped to 0 if sender has insufficient balance.
    function transfer(
        address to,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external returns (bool) {
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

        // Clamp: if amount > balance, transfer 0 (no revert on encrypted condition)
        ebool  hasEnough    = FHE.le(amount, _balances[msg.sender]);
        euint64 safeAmount  = FHE.select(hasEnough, amount, FHE.asEuint64(0));

        euint64 newFromBal = FHE.sub(_balances[msg.sender], safeAmount);
        euint64 newToBal   = FHE.add(_balances[to], safeAmount);

        _balances[msg.sender] = newFromBal;
        _balances[to]         = newToBal;

        // Re-grant ACL — handles changed, must re-authorize
        FHE.allowThis(_balances[msg.sender]);
        FHE.allow(_balances[msg.sender], msg.sender);
        FHE.allowThis(_balances[to]);
        FHE.allow(_balances[to], to);

        emit Transfer(msg.sender, to);
        return true;
    }

    /// @notice Mint new tokens to an address (owner-only in production — omitted for brevity)
    function mint(address to, uint64 amount) external {
        euint64 mintAmount = FHE.asEuint64(amount);

        if (FHE.isInitialized(_balances[to])) {
            _balances[to] = FHE.add(_balances[to], mintAmount);
        } else {
            _balances[to] = mintAmount;
        }

        totalSupply += amount;
        FHE.allowThis(_balances[to]);
        FHE.allow(_balances[to], to);
    }
}
```

---

## 11b. ERC7984 — Confidential Token Standard

ERC7984 is OpenZeppelin's base contract for confidential fungible tokens. It replaces ERC20's transparent ledger with FHE-encrypted balances.

### Installation

```bash
npm install @openzeppelin/confidential-contracts
```

### Minimal ERC7984 Token

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint64, externalEuint64 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";
import { ERC7984 } from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";
import { Ownable2Step, Ownable } from "@openzeppelin/contracts/access/Ownable2Step.sol";

contract ConfidentialUSDT is ZamaEthereumConfig, ERC7984, Ownable2Step {
    constructor(address initialOwner, uint64 initialSupply)
        ERC7984("Confidential USDT", "cUSDT", "")
        Ownable(initialOwner)
    {
        // Trivial encrypt for initial supply (publicly known amount)
        _mint(initialOwner, FHE.asEuint64(initialSupply));
    }

    /// @notice Mint with public amount (visible on-chain)
    function mint(address to, uint64 amount) external onlyOwner {
        _mint(to, FHE.asEuint64(amount));
    }

    /// @notice Mint with confidential amount (amount hidden)
    function confidentialMint(
        address to,
        externalEuint64 encAmount,
        bytes calldata inputProof
    ) external onlyOwner {
        _mint(to, FHE.fromExternal(encAmount, inputProof));
    }
}
```

### ERC7984 vs ERC20 Key Differences

| Feature | ERC20 | ERC7984 |
|---|---|---|
| Balances | `uint256`, public | `euint64`, encrypted |
| Transfer amount | Plaintext | Encrypted via `externalEuint64` |
| `balanceOf` return | `uint256` | `euint64` handle |
| Allowances | Plaintext | Encrypted |
| Events | Amount visible | Amount hidden |
| Overflow | SafeMath / reverts | Wraps silently (FHE arithmetic) |

### Private Transfers and Encrypted Allowances

ERC7984 transfers are confidential by default. The transfer amount is passed as `externalEuint64` so the amount is never visible on-chain. The base contract handles the ACL re-grants internally.

```solidity
// User calls transfer — amount is encrypted, invisible on-chain
function transfer(
    address to,
    externalEuint64 encAmount,
    bytes calldata inputProof
) external override returns (bool) {
    euint64 amount = FHE.fromExternal(encAmount, inputProof);
    // ERC7984 base _transfer handles silent clamp + ACL re-grants internally
    _transfer(msg.sender, to, amount);
    return true;
}

// Encrypted allowance — approve a spender for a confidential amount
function confidentialApprove(
    address spender,
    externalEuint64 encAmount,
    bytes calldata inputProof
) external {
    euint64 amount = FHE.fromExternal(encAmount, inputProof);
    _approve(msg.sender, spender, amount);
    // Grant spender ACL access to the allowance handle
    FHE.allow(_allowances[msg.sender][spender], spender);
    FHE.allowThis(_allowances[msg.sender][spender]);
}

// Encrypted transferFrom — spender uses their allowance
function confidentialTransferFrom(
    address from,
    address to,
    externalEuint64 encAmount,
    bytes calldata inputProof
) external returns (bool) {
    euint64 amount = FHE.fromExternal(encAmount, inputProof);
    _spendAllowance(from, msg.sender, amount);
    _transfer(from, to, amount);
    return true;
}
```

> **Note:** The ERC7984 base contract internally uses `FHE.select` for silent clamping — transfers that exceed balance silently transfer 0, they do not revert. This is the same pattern as the manual ConfidentialToken example.

### Burn Pattern and ACL

Burning tokens removes them from circulation. The `_burn` function in ERC7984 requires ACL access to the holder's balance handle.

```solidity
/// @notice Burn tokens from the caller's balance (public amount, owner only)
function burn(address from, uint64 amount) external onlyOwner {
    // _burn is provided by ERC7984 base — handles ACL and balance update internally
    _burn(from, FHE.asEuint64(amount));
}

/// @notice Burn a confidential amount from caller's own balance
function confidentialBurn(externalEuint64 encAmount, bytes calldata inputProof) external {
    euint64 amount = FHE.fromExternal(encAmount, inputProof);
    // Caller must have ACL access to their own balance (granted at mint/transfer time)
    _burn(msg.sender, amount);
}
```

> **🔴 CRITICAL — Burn ACL requirement:**
> `_burn` reads the holder's encrypted balance internally. For this to succeed, the contract
> must have been granted `FHE.allowThis(balance)` when the balance was last written.
> If `allowThis` was ever skipped after a transfer, `_burn` will fail silently (balance becomes 0 handle).
> Always verify `FHE.isInitialized(_balances[from])` before calling `_burn`.

### Wrapping ERC20 → ERC7984 (Confidential Wrapper)

Wrapping lets users deposit a standard ERC20 and receive an encrypted ERC7984 balance. Unwrapping burns the confidential balance and returns the plaintext ERC20.

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint64, externalEuint64 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";
import { ERC7984 } from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title ConfidentialWrapper
/// @notice Wrap any ERC20 into an ERC7984 confidential token.
///         Users deposit plaintext ERC20 → receive encrypted balance.
///         Users unwrap encrypted balance → receive plaintext ERC20.
contract ConfidentialWrapper is ZamaEthereumConfig, ERC7984 {
    using SafeERC20 for IERC20;

    IERC20 public immutable underlying; // the ERC20 being wrapped

    event Wrapped(address indexed user, uint64 amount);
    event Unwrapped(address indexed user, uint64 amount);

    constructor(address _underlying)
        ERC7984("Confidential Wrapped Token", "cTOKEN", "")
    {
        underlying = IERC20(_underlying);
    }

    /// @notice Deposit ERC20 and receive an encrypted balance.
    ///         Amount is publicly visible (pulled from ERC20 transfer).
    function wrap(uint64 amount) external {
        // Pull plaintext ERC20 from user
        underlying.safeTransferFrom(msg.sender, address(this), amount);

        // Mint encrypted balance — trivial encrypt (amount is already public from the transfer)
        _mint(msg.sender, FHE.asEuint64(amount));

        emit Wrapped(msg.sender, amount);
    }

    /// @notice Burn encrypted balance and withdraw plaintext ERC20.
    ///         The withdrawal amount is public — visible in the event and ERC20 transfer.
    ///         Use this only when you are ready to reveal the amount.
    function unwrap(uint64 amount) external {
        // Burn encrypted balance — amount becomes public at this point
        _burn(msg.sender, FHE.asEuint64(amount));

        // Return plaintext ERC20 to user
        underlying.safeTransfer(msg.sender, amount);

        emit Unwrapped(msg.sender, amount);
    }

    /// @notice Burn encrypted balance with a confidential amount.
    ///         Amount stays hidden until the underlying ERC20 transfer reveals it.
    function confidentialUnwrap(
        externalEuint64 encAmount,
        bytes calldata inputProof,
        uint64 publicAmount  // must match encAmount — used for the ERC20 transfer
    ) external {
        euint64 amount = FHE.fromExternal(encAmount, inputProof);
        _burn(msg.sender, amount);
        underlying.safeTransfer(msg.sender, publicAmount);
        emit Unwrapped(msg.sender, publicAmount);
    }
}
```

**Wrapping rules:**

| Direction | Visibility | Pattern |
|---|---|---|
| ERC20 → ERC7984 (wrap) | Amount is public (ERC20 transfer is visible) | `_mint(user, FHE.asEuint64(amount))` — trivial encrypt is fine since amount is already on-chain |
| ERC7984 → ERC20 (unwrap) | Amount becomes public at unwrap time | `_burn` + ERC20 `safeTransfer` |
| Confidential transfer (within ERC7984) | Amount stays hidden | `_transfer(from, to, encAmount)` — never leaves ERC7984 |

> **Note:** There is no way to unwrap without revealing the amount at the ERC20 level. The confidentiality of ERC7984 applies only to transfers that stay within the ERC7984 system. Once a user unwraps, the amount is visible on-chain.

---

## 11c. Deployment Addresses

### Sepolia Testnet

| Contract | Address |
|---|---|
| ACL | `0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D` |
| FHEVMExecutor | `0x92C920834Ec8941d2C77D188936E1f7A6f49c127` |
| KMSVerifier | `0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A` |
| InputVerifier | `0xBBC1fFCdc7C316aAAd72E807D9b0272BE8F84DA0` |
| HCU Limit | `0xa10998783c8CF88D886Bc30307e631D6686F0A22` |
| Decryption verifier | `0x5D8BD78e2ea6bbE41f26dFe9fdaEAa349e077478` |
| Input verification | `0x483b9dE06E4E4C7D35CCf5837A1668487406D955` |

All wired automatically by `ZamaEthereumConfig`. You only need these if configuring manually.

### Mainnet API Key

Mainnet relayer access requires a Zama API key. Apply at docs.zama.org. **Never expose the key in frontend code.**

```typescript
// Backend/server only — never in browser bundle
const instance = await createInstance({
  ...MainnetConfig,
  network: rpcUrl,
  auth: { __type: "ApiKeyHeader", value: process.env.ZAMA_FHEVM_API_KEY },
});
```

For browser apps, proxy relayer requests through your backend server so the key stays server-side.

---

## 11d. Deploying to Sepolia

### Step 1 — Environment setup

Create `packages/hardhat/.env`:

```bash
MNEMONIC="your twelve word wallet mnemonic phrase here"
SEPOLIA_RPC_URL="https://ethereum-sepolia-rpc.publicnode.com"
```

### Step 2 — Fund your wallet

The first address derived from your mnemonic needs Sepolia ETH.
Get it free from: https://sepoliafaucet.com

### Step 3 — Deploy

From the project root:

```cmd
pnpm deploy:sepolia
```

This runs `hardhat-deploy` which:
1. Compiles contracts
2. Deploys to Sepolia using your mnemonic
3. Writes deployed addresses to `packages/hardhat/deployments/sepolia/`

### Step 4 — Verify deployment

```cmd
cd packages\hardhat
npx hardhat verify --network sepolia <DEPLOYED_ADDRESS>
```

### Step 5 — Connect frontend

The deploy script auto-generates TypeScript ABIs into `packages/nextjs/contracts/`:

```cmd
pnpm generate
```

This makes your deployed contract available in the frontend as:

```typescript
import deployedContracts from "~~/contracts/deployedContracts";
const { address, abi } = deployedContracts[11155111].YourContract;
```

### Step 6 — Run frontend against Sepolia

```cmd
# .env.local in packages/nextjs
NEXT_PUBLIC_ALCHEMY_API_KEY=your_key
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id

pnpm start
```

### Deployment checklist

```
✅ .env set with MNEMONIC and SEPOLIA_RPC_URL
✅ Wallet has Sepolia ETH (check: pnpm hardhat:chain → use test wallet)
✅ Contract inherits ZamaEthereumConfig (auto-wires Sepolia addresses)
✅ pnpm deploy:sepolia completes without error
✅ deployments/sepolia/<ContractName>.json exists
✅ pnpm generate updates packages/nextjs/contracts/
✅ Frontend loads and wallet connects on Sepolia network (chainId 11155111)
```

### Common deployment errors

| Error | Cause | Fix |
|---|---|---|
| `insufficient funds` | Wallet has no Sepolia ETH | Fund from faucet |
| `nonce too low` | Stale nonce from previous failed tx | Clear MetaMask activity or wait |
| `contract size too large` | Too many FHE operations in one contract | Split into multiple contracts |
| `HCU limit exceeded` | Too many FHE ops in constructor | Move init logic to separate `initialize()` tx |

---

## 12. Anti-Patterns and Gotchas

### ❌ Missing ACL After Operations

```solidity
// WRONG — new handle has no permissions
_balance = FHE.add(_balance, amount);
// future: FHE.allowThis(_balance) would fail — contract can't reuse it

// CORRECT
_balance = FHE.add(_balance, amount);
FHE.allowThis(_balance);
FHE.allow(_balance, msg.sender);
```

### ❌ Using `if` on Encrypted Boolean

```solidity
// WRONG — ebool is not a bool, this will not compile or will misfire
if (FHE.gt(a, b)) { doSomething(); }

// CORRECT
ebool cond = FHE.gt(a, b);
euint64 result = FHE.select(cond, valueA, valueB);
```

### ❌ Storing `externalEuint` Directly

```solidity
// WRONG — externalEuint64 is just an index/reference, not a usable encrypted value
euint64 _stored = encryptedParam; // type error or wrong value

// CORRECT
euint64 _stored = FHE.fromExternal(encryptedParam, inputProof);
FHE.allowThis(_stored);
```

### ❌ Forgetting `inputProof` Validation

```solidity
// WRONG — do not skip fromExternal
euint64 amount = euint64.wrap(bytes32(encryptedAmount)); // NEVER do this

// CORRECT
euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);
```

### ❌ Division by Encrypted Value

```solidity
// WRONG — rhs must be plaintext
euint64 result = FHE.div(a, b); // b is euint64 — COMPILE ERROR

// CORRECT
euint64 result = FHE.div(a, uint64(2)); // plaintext divisor only
```

### ❌ Expecting Synchronous Decryption

```solidity
// WRONG — there is no on-chain decrypt() that returns a plaintext
uint64 plain = decrypt(encryptedBalance); // does not exist

// CORRECT — use off-chain SDK for user decryption,
// or use FHE.makePubliclyDecryptable() + FHE.checkSignatures() for on-chain verification
```

### ❌ Wrong Handle Order in `checkSignatures`

```solidity
// When requesting public decryption for [handleA, handleB],
// the proof is ORDER-DEPENDENT.
// WRONG — swapped order
bytes32[] memory handles = new bytes32[](2);
handles[0] = FHE.toBytes32(handleB); // was B in decryption request
handles[1] = FHE.toBytes32(handleA); // was A in decryption request
FHE.checkSignatures(handles, cleartexts, proof); // will REVERT

// CORRECT — same order as decryption request
handles[0] = FHE.toBytes32(handleA);
handles[1] = FHE.toBytes32(handleB);
```

### ❌ Trivial Encryption for Secret Values

```solidity
// WRONG — trivial encryption exposes value on-chain
euint64 secret = FHE.asEuint64(userPrivateAmount); // userPrivateAmount visible in calldata/event

// CORRECT — user encrypts off-chain and submits as externalEuint64
function setSecret(externalEuint64 enc, bytes calldata proof) external {
    euint64 secret = FHE.fromExternal(enc, proof);
}
```

### ❌ Re-org Handling Neglect

ACL grants use events consumed by coprocessors. In case of a chain re-org, a grant emitted in a re-orged block could be lost. For critical access grants:

```solidity
// Consider using allowTransient for intermediate computation values
// Use persistent FHE.allow() only for long-lived balances/results
```

### euint256 Arithmetic

```solidity
// WRONG - euint256 does not support arithmetic
euint256 sum = FHE.add(a256, b256); // COMPILE ERROR

// euint256 supports: and, or, xor, not, eq, ne, select only
euint256 xored = FHE.xor(a256, b256); // OK
```

Validated in this repo by:
- `packages/hardhat/contracts/Euint256OpsProof.sol`
- `packages/hardhat/test/Euint256OpsProof.ts`
---

## 13. Quick Reference Cheatsheet

### Imports

```solidity
import { FHE, euint8, euint16, euint32, euint64, euint128, euint256,
         ebool, eaddress,
         externalEuint8, externalEuint16, externalEuint32, externalEuint64,
         externalEuint128, externalEuint256, externalEbool, externalEaddress
       } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";
```

> **Rule:** Import every encrypted type you USE, even if only as an intermediate. `euint8` used only in `FHE.asEuint8(...)` still requires `euint8` in the import list — Solidity will error otherwise.

### Contract Skeleton

```solidity
contract MyContract is ZamaEthereumConfig {
    euint64 private _value;

    function set(externalEuint64 enc, bytes calldata proof) external {
        _value = FHE.fromExternal(enc, proof);
        FHE.allowThis(_value);
        FHE.allow(_value, msg.sender);
    }

    function get() external view returns (euint64) {
        return _value;
    }
}
```

### ACL Cheatsheet

| Goal | Call |
|---|---|
| Contract reuses handle next tx | `FHE.allowThis(handle)` |
| User can decrypt their data | `FHE.allow(handle, userAddress)` |
| Temporary pass to external contract | `FHE.allowTransient(handle, extContract)` |
| Public reveal (auction result etc.) | `FHE.makePubliclyDecryptable(handle)` |
| Verify public decryption proof | `FHE.checkSignatures(handles, cleartexts, proof)` |
| Convert handle to bytes32 | `FHE.toBytes32(encValue)` |
| Check if handle is initialized | `FHE.isInitialized(encValue)` |
| Check caller has ACL access | `FHE.isSenderAllowed(encValue)` |

### Operations Cheatsheet

| Operation | Call |
|---|---|
| a + b | `FHE.add(a, b)` |
| a - b | `FHE.sub(a, b)` |
| a * scalar | `FHE.mul(a, uint64(n))` |
| a / scalar | `FHE.div(a, uint64(n))` |
| a >= b | `FHE.ge(a, b)` → `ebool` |
| a > b | `FHE.gt(a, b)` → `ebool` |
| a == b | `FHE.eq(a, b)` → `ebool` |
| cond ? x : y | `FHE.select(cond, x, y)` |
| plaintext → encrypted | `FHE.asEuint64(n)` |
| cast euint64 → euint32 | `FHE.asEuint32(val64)` |
| user input → euint | `FHE.fromExternal(ext, proof)` |

### Frontend Cheatsheet

```typescript
// Init
const instance = await createInstance({ ...SepoliaConfig, network: window.ethereum });

// Encrypt
const input = instance.createEncryptedInput(contractAddr, userAddr);
input.add64(amount);
const enc = await input.encrypt();
// → enc.handles[0], enc.inputProof

// User decrypt
const keypair = instance.generateKeypair();
const eip712  = instance.createEIP712(keypair.publicKey, [contractAddr], startTime, "10");
const sig     = await signer.signTypedData(eip712.domain, { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification }, eip712.message);
const result  = await instance.userDecrypt([{ handle, contractAddress: contractAddr }], keypair.privateKey, keypair.publicKey, sig.replace("0x",""), [contractAddr], signer.address, startTime, "10");
const plain   = result[handle];
```

---

---

## 14. Troubleshooting Index

Quick lookup for common failure modes. Match the error message or symptom to the fix.

### Contract / Compile Errors

| Error | Cause | Fix |
|---|---|---|
| `Operator not compatible with type euint64` | Using `+`, `-`, `>`, `==` on encrypted types | Replace with `FHE.add`, `FHE.sub`, `FHE.gt`, `FHE.eq` |
| `if (encValue)` / `if (encBool)` | Plaintext conditional on encrypted type | Use `FHE.select(condition, trueVal, falseVal)` |
| `FHE.decrypt()` does not exist | No synchronous decrypt in FHEVM | Use off-chain `userDecryptEuint` or `publicDecrypt` |
| `Member not found in euint64` | Wrong type — e.g. calling euint32 op on euint64 | Match types exactly; cast with `FHE.asEuint64()` if needed |
| Import path not found | Wrong import path | Use `@fhevm/solidity/lib/FHE.sol` and `@fhevm/solidity/config/ZamaConfig.sol` |

### Runtime / Transaction Errors

| Error / Symptom | Cause | Fix |
|---|---|---|
| `User is not authorized` | Missing `FHE.allow(handle, userAddress)` | Add `FHE.allow` grant after every mutation |
| `ACL: contract not authorized` | Missing `FHE.allowThis(handle)` | Add `FHE.allowThis` after every mutation |
| `FHE.checkSignatures` reverts with no message | Wrong handle order in proof | Match `handles[]` order exactly to `publicDecrypt()` call order |
| Handle returns zero / uninitialized | `FHE.isInitialized` returns false | Check with `FHE.isInitialized(handle)` before use; initialize in constructor |
| Encrypted value silently wraps | `FHE.sub` underflow on euint — wraps like uint256 | Guard with `FHE.isInitialized` check; validate inputs off-chain |
| `HCU limit exceeded` | Too many FHE ops in one transaction | Split into multiple txs; check HCU table in Section 4b |
| Old handle value after update | ACL grant on stale handle reference | Always re-grant `FHE.allowThis` + `FHE.allow` after `FHE.add/sub/select` |

### Test / SDK Errors

| Error | Cause | Fix |
|---|---|---|
| `RelayerV2FetchError: fetch failed` | Transient Zama relayer connection drop | Retry — use `encryptWithRetry` / `decryptWithRetry` helpers |
| `Cannot call publicDecrypt from a 'hardhat node' server` | Called `fhevm.publicDecrypt` inside `hardhat node` process | Run in test process only, not in a running node |
| `Impossible to fetch public key: wrong relayer url` | Relayer URL changed or unreachable | Check Zama Discord `#dev-support`; retry after a few minutes |
| `TypeError: Do not know how to serialize a BigInt` | `JSON.stringify` on bigint directly | Use replacer: `JSON.stringify(val, (_k, v) => typeof v === "bigint" ? v.toString() : v)` |
| `decryptedValue` is always 0 | Handle not allowed to the user | Add `FHE.allow(handle, userAddress)` in the contract |
| Test passes locally but fails on Sepolia | Mock mode vs live relayer behavior differs | Check ACL grants — mock is lenient, live relayer enforces strictly |

### Deployment Errors

| Error | Cause | Fix |
|---|---|---|
| `missing revert data` on deploy | Contract constructor reverts | Check `ZamaEthereumConfig` is inherited; check constructor args |
| `insufficient funds` | Deployer wallet empty | Fund wallet from Sepolia faucet |
| `nonce too low` | Pending tx or wrong account | Wait for pending txs; check `MNEMONIC` hardhat var points to correct wallet |

---

## 15. Glossary

| Term | Definition |
|---|---|
| **FHE** | Fully Homomorphic Encryption — compute on encrypted data without decrypting |
| **FHEVM** | FHE Virtual Machine — Zama's system for running FHE on EVM-compatible chains |
| **Handle** | A `bytes32` pointer to an off-chain ciphertext. Encrypted types (`euint64` etc.) are handles internally |
| **Ciphertext** | The actual encrypted data, stored off-chain by coprocessors. Never touches the EVM directly |
| **Coprocessor** | Off-chain service that receives FHE operation events and performs the actual encrypted computation |
| **Symbolic execution** | On-chain FHE calls record intent (emit events) — coprocessors execute the actual FHE math off-chain |
| **ACL** | Access Control List — per-handle registry of which addresses can decrypt or reuse a ciphertext |
| **Gateway** | Zama service that orchestrates decryption requests between contracts, coprocessors, and KMS |
| **KMS** | Key Management System — 13-node MPC network that holds the FHE private key for decryption |
| **Relayer** | Off-chain service (Zama-hosted) that processes user decryption and input proof requests |
| **Relayer SDK** | `@zama-fhe/relayer-sdk` — TypeScript client for encrypting inputs and requesting decryptions |
| **euint64** | Encrypted unsigned 64-bit integer. One of 8 encrypted types available in FHEVM |
| **ebool** | Encrypted boolean — result of FHE comparisons. Cannot be used in `if` statements directly |
| **eaddress** | Encrypted Ethereum address — alias for `euint160`, supports only `eq`, `ne`, `select` |
| **externalEuint64** | Parameter type for function inputs submitted by users — must be validated with `FHE.fromExternal` |
| **inputProof** | Zero-knowledge proof bundled with encrypted inputs proving the submitter knows the plaintext |
| **ZKPoK** | Zero-Knowledge Proof of Knowledge — proves the sender encrypted a valid value without revealing it |
| **trivial encryption** | Converting a plaintext to an encrypted type with `FHE.asEuint64(n)` — value is publicly visible |
| **HCU** | Homomorphic Complexity Unit — measures FHE computation cost. Limit: 20M global, 5M sequential per tx |
| **allowThis** | `FHE.allowThis(h)` — grants the current contract access to handle `h` across future transactions |
| **allowTransient** | `FHE.allowTransient(h, addr)` — grants access for current transaction only (uses EIP-1153) |
| **makePubliclyDecryptable** | Marks a handle so anyone can request its decryption via the Gateway |
| **checkSignatures** | On-chain verification of a public decryption proof from the KMS |
| **ERC7984** | OpenZeppelin confidential token standard — ERC20 with encrypted balances and transfer amounts |
| **ZamaEthereumConfig** | Base contract that auto-configures FHEVM infrastructure addresses for Sepolia/Mainnet |
| **User decryption** | Re-encryption flow where a user's data is decrypted privately using EIP-712 signature + keypair |
| **Public decryption** | Flow where an encrypted value is revealed publicly — verified on-chain with `checkSignatures` |

---

---

## Skill File System Index

| File | Contents |
|---|---|
| **[SKILL.md](SKILL.md)** | Master overview — mental model, full workflow, all patterns |
| **[SKILL-REFERENCE.md](SKILL-REFERENCE.md)** | API reference — types, operations, ACL functions, HCU costs, deployment addresses |
| **[SKILL-TEMPLATES.md](SKILL-TEMPLATES.md)** | 7 contract templates — Token, Voting, Auction, Survey, Leaderboard, ERC7984, Minimal |
| **[SKILL-TESTING.md](SKILL-TESTING.md)** | Testing guide — setup, encrypt/decrypt helpers, patterns, debug checklist, CI |
| **[KNOWN_GAPS.md](KNOWN_GAPS.md)** | Open gaps and patterns still under validation |
| **[FEEDBACK.md](FEEDBACK.md)** | How to report a gap or suggest an improvement |
| **[CHANGELOG.md](CHANGELOG.md)** | Version history and what changed in each release |

*Generated for the Zama Developer Program Season 2 Bounty Track. Based on FHEVM v0.9/v0.10 and Relayer SDK v0.3. Docs: [docs.zama.org/protocol](https://docs.zama.org/protocol)*
