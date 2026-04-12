# FHEVM Agent Skill — API Reference

> **Part of the FHEVM Skill File System.**
> This file is the authoritative API reference for encrypted types, FHE operations, ACL functions,
> HCU limits, and deployment addresses. Keep this open alongside `SKILL.md` (overview) when
> writing any FHEVM contract.
>
> Read `SKILL.md` first for concepts. Read `SKILL-TEMPLATES.md` for copy-paste starting points.
> Read `SKILL-TESTING.md` for test patterns.

---

## Metadata

| Field | Value |
|---|---|
| **Version** | 1.5.0 |
| **Scope** | Solidity API + TypeScript SDK API |
| **Covers** | `@fhevm/solidity` v0.9/v0.10, `@zama-fhe/relayer-sdk` v0.3 |

---

## 1. Encrypted Types

### Solidity Storage Types

| Type | Bits | Operations Supported |
|---|---|---|
| `ebool` | 2 | `and`, `or`, `xor`, `eq`, `ne`, `not`, `select`, `rand` |
| `euint8` | 8 | full arithmetic + bitwise + comparisons |
| `euint16` | 16 | full arithmetic + bitwise + comparisons |
| `euint32` | 32 | full arithmetic + bitwise + comparisons |
| `euint64` | 64 | full arithmetic + bitwise + comparisons |
| `euint128` | 128 | full arithmetic + bitwise + comparisons |
| `euint160` / `eaddress` | 160 | `eq`, `ne`, `select` only — use `eaddress` alias for addresses |
| `euint256` | 256 | bitwise/logical only — **NO arithmetic** (`add`/`sub`/`mul`/`div` not supported) |

### External Input Types (Function Parameters)

Use these for function parameters that receive user-submitted ciphertexts.
**Always validate with `FHE.fromExternal(param, inputProof)` before use.**

| Type | Maps to |
|---|---|
| `externalEbool` | → `ebool` after `fromExternal` |
| `externalEuint8` | → `euint8` after `fromExternal` |
| `externalEuint16` | → `euint16` after `fromExternal` |
| `externalEuint32` | → `euint32` after `fromExternal` |
| `externalEuint64` | → `euint64` after `fromExternal` |
| `externalEuint128` | → `euint128` after `fromExternal` |
| `externalEuint256` | → `euint256` after `fromExternal` |
| `externalEaddress` | → `eaddress` after `fromExternal` |

### Import Statement (copy-paste)

```solidity
import { FHE, euint8, euint16, euint32, euint64, euint128, euint256,
         ebool, eaddress,
         externalEuint8, externalEuint16, externalEuint32, externalEuint64,
         externalEuint128, externalEuint256, externalEbool, externalEaddress
       } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";
```

> **Rule:** Import every encrypted type you USE, even if only as an intermediate.
> `euint8` used only inside `FHE.asEuint8(...)` still requires `euint8` in the import list.

---

## 2. FHE Operations Reference

### Trivial Encryption (plaintext → encrypted)

```solidity
euint64  val  = FHE.asEuint64(n);    // n is uint64
euint32  val  = FHE.asEuint32(n);
euint8   val  = FHE.asEuint8(n);
ebool    flag = FHE.asEbool(true);
eaddress addr = FHE.asEaddress(msg.sender);
```

> **Warning:** Trivially encrypted values are publicly visible. Use for constants and initial values only — never for secret user data.

### Casting Between Encrypted Types

```solidity
euint64 big   = FHE.asEuint64(1000);
euint32 small = FHE.asEuint32(big);   // truncates — loses upper 32 bits
euint64 back  = FHE.asEuint64(small); // pads with zeros
ebool   flag  = FHE.asEbool(small);   // non-zero → true

// Cross-type casting goes through FHE.asEuintXX()
euint8  narrow = FHE.asEuint8(euint64Val); // truncates to 8 bits
```

### Arithmetic

| Operation | Syntax | Notes |
|---|---|---|
| Add | `FHE.add(a, b)` | Both encrypted, or right scalar |
| Add scalar | `FHE.add(a, uint64(5))` | Cheaper than encrypted+encrypted |
| Subtract | `FHE.sub(a, b)` | Wraps on underflow (no revert) |
| Multiply | `FHE.mul(a, uint64(2))` | Right side must be plaintext scalar |
| Negate | `FHE.neg(a)` | Encrypted negation |
| Divide | `FHE.div(a, uint64(2))` | Right side must be plaintext scalar |
| Remainder | `FHE.rem(a, uint64(10))` | Right side must be plaintext scalar |

> **Note:** `FHE.div(a, b)` where `b` is encrypted is a **compile error**. Divisor must be plaintext.

### Comparison (all return `ebool`)

```solidity
ebool eq  = FHE.eq(a, b);
ebool ne  = FHE.ne(a, b);
ebool gt  = FHE.gt(a, b);
ebool ge  = FHE.ge(a, b);
ebool lt  = FHE.lt(a, b);
ebool le  = FHE.le(a, b);

euint64 minVal = FHE.min(a, b);
euint64 maxVal = FHE.max(a, b);
```

### Bitwise

```solidity
FHE.and(a, b)          // bitwise AND
FHE.or(a, b)           // bitwise OR
FHE.xor(a, b)          // bitwise XOR
FHE.not(a)             // bitwise NOT
FHE.shl(a, uint8(2))   // shift left by plaintext amount
FHE.shr(a, uint8(2))   // shift right by plaintext amount
FHE.rotl(a, uint8(3))  // rotate left
FHE.rotr(a, uint8(3))  // rotate right
```

### Select (Encrypted Ternary — the ONLY way to branch on encrypted conditions)

```solidity
// select(condition, valueIfTrue, valueIfFalse)
ebool cond  = FHE.ge(score, highScore);
euint64 res = FHE.select(cond, score, highScore);

// All three arguments must be the same encrypted type
// WRONG: FHE.select(ebool, euint64, euint32) → type mismatch
```

### Random Numbers

```solidity
euint64 r64 = FHE.randEuint64();
euint32 r32 = FHE.randEuint32();
euint8  r8  = FHE.randEuint8Bounded(uint8(100)); // 0..99
```

### Initialization Check

```solidity
// Uninitialized euint is bytes32(0) — the zero handle
if (!FHE.isInitialized(_count)) {
    _count = FHE.asEuint32(0);
    FHE.allowThis(_count);
}
```

### Input Validation (from user)

```solidity
function submit(externalEuint64 enc, bytes calldata inputProof) external {
    euint64 value = FHE.fromExternal(enc, inputProof); // validates ZKPoK
    // Never skip fromExternal — never cast externalEuintXX directly
    FHE.allowThis(value);
    FHE.allow(value, msg.sender);
}
```

One `inputProof` covers all `externalEuintXX` parameters in a single call:

```solidity
function multiInput(
    externalEuint64 encA,
    externalEuint8  encB,
    bytes calldata  inputProof
) external {
    euint64 a = FHE.fromExternal(encA, inputProof);
    euint8  b = FHE.fromExternal(encB, inputProof);
}
```

---

## 3. ACL (Access Control List) Reference

Every encrypted handle requires explicit ACL grants. Without them, the handle cannot be reused in future transactions or decrypted.

### ACL Functions

| Function | Scope | Notes |
|---|---|---|
| `FHE.allow(handle, addr)` | Persistent | Grants `addr` permanent access to `handle` |
| `FHE.allowThis(handle)` | Persistent | Shorthand: grants `address(this)` access |
| `FHE.allowTransient(handle, addr)` | Transient (current tx) | Uses EIP-1153, cheaper |
| `FHE.makePubliclyDecryptable(handle)` | Persistent | Anyone can request decryption via Gateway |
| `FHE.isAllowed(handle, addr)` | View | Returns `bool` — check if `addr` has access |
| `FHE.isSenderAllowed(handle)` | View | Returns `bool` — check if `msg.sender` has access |
| `FHE.toBytes32(encValue)` | Utility | Returns the raw `bytes32` handle |
| `FHE.checkSignatures(handles, cleartexts, proof)` | Verification | Reverts if public decryption proof is invalid |

### Method-Chaining Syntax

```solidity
using FHE for *;
ciphertext.allowThis().allow(msg.sender).allow(recipient);
```

### The Golden Rule

> **After every FHE operation that produces a new handle, re-grant all required permissions.**
> FHE operations return NEW handles — the old ACL grants do not carry over.

```solidity
// WRONG — new handle has no permissions
_balance = FHE.add(_balance, amount);

// CORRECT
_balance = FHE.add(_balance, amount);
FHE.allowThis(_balance);         // contract can reuse in future txs
FHE.allow(_balance, msg.sender); // user can decrypt
```

### 🔴 CRITICAL — Admin/Owner Access

`FHE.allowThis(handle)` grants access to `address(this)` — **the contract itself**.
It does **NOT** grant access to the contract owner, deployer, or any EOA.

```solidity
// Owner who needs to decrypt tallies, results, or totals requires an explicit grant:
FHE.allow(handle, ownerAddress); // must be called every time handle changes

// Missing this → "User 0x... is not authorized to user decrypt handle" error
```

### ACL Pattern: Token Transfer

```solidity
euint64 newFromBal = FHE.sub(_balances[msg.sender], safeAmount);
euint64 newToBal   = FHE.add(_balances[to], safeAmount);

_balances[msg.sender] = newFromBal;
_balances[to]         = newToBal;

FHE.allowThis(_balances[msg.sender]);
FHE.allow(_balances[msg.sender], msg.sender);
FHE.allowThis(_balances[to]);
FHE.allow(_balances[to], to);
```

### ACL Pattern: Cross-Contract Pass

```solidity
// Before calling external contract with an encrypted param
FHE.allowTransient(encValue, address(externalContract));
externalContract.process(encValue);
```

### ACL Pattern: Access-Gated Functions

```solidity
function transfer(address to, euint64 encAmount) external {
    require(
        FHE.isSenderAllowed(encAmount),
        "Caller does not have ACL access to this handle"
    );
    // safe to use encAmount
}
```

---

## 4. Decryption Reference

### User Decryption (TypeScript SDK)

Private decryption for the data owner. Ciphertext is re-encrypted under the user's keypair.

```typescript
import { createInstance, SepoliaConfig } from "@zama-fhe/relayer-sdk";

const instance = await createInstance({ ...SepoliaConfig, network: window.ethereum });

// 1. Generate ephemeral keypair
const keypair = instance.generateKeypair();

// 2. Build EIP-712 authorization
const startTime = Math.floor(Date.now() / 1000).toString();
const eip712    = instance.createEIP712(keypair.publicKey, [contractAddress], startTime, "10");

// 3. Sign
const sig = await signer.signTypedData(
  eip712.domain,
  { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
  eip712.message,
);

// 4. Decrypt
const handle  = await contract.getBalance(signer.address);
const result  = await instance.userDecrypt(
  [{ handle, contractAddress }],
  keypair.privateKey, keypair.publicKey,
  sig.replace("0x", ""),
  [contractAddress], signer.address, startTime, "10",
);
const plainBalance = result[handle]; // BigInt
```

> **Limit:** Total bit length of all handles in one `userDecrypt` call must not exceed **2048 bits**.

### Public Decryption (TypeScript + Solidity)

For revealing values publicly (auction winner, game result, vote tally).

**Step 1 — Contract: mark for decryption**

```solidity
function revealResult() external {
    FHE.makePubliclyDecryptable(encryptedWinner);
    FHE.makePubliclyDecryptable(encryptedAmount);
}
```

**Step 2 — TypeScript: fetch proof**

```typescript
// handles order must match makePubliclyDecryptable call order
const handles = [winnerHandle, amountHandle];
const { clearValues, abiEncodedClearValues, decryptionProof } =
  instance.publicDecrypt(handles);
```

**Step 3 — Contract: verify proof**

```solidity
function claimPrize(address winner, uint64 amount, bytes calldata proof) external {
    bytes32[] memory handles = new bytes32[](2);
    handles[0] = FHE.toBytes32(encryptedWinner);  // SAME order as publicDecrypt
    handles[1] = FHE.toBytes32(encryptedAmount);
    bytes memory cleartexts = abi.encode(winner, amount);

    FHE.checkSignatures(handles, cleartexts, proof); // reverts if invalid
    _transferPrize(winner, amount);
}
```

> **🔴 CRITICAL — Handle Order is Proof-Bound:**
> The decryption proof is tied to the exact array order. `checkSignatures` reverts silently if
> handles are in a different order than `publicDecrypt` was called with.

---

## 5. HCU (Gas) Reference

### Limits

| Limit | Value |
|---|---|
| Global HCU per transaction | 20,000,000 |
| Sequential depth per transaction | 5,000,000 |

### Operation Costs

| Operation | Type | Approx. HCU |
|---|---|---|
| Cast / trivial encrypt | any | ~32 |
| `FHE.fromExternal` | any | ~32 |
| `ebool and/or/xor` | ebool | 22,000–25,000 |
| `euint8` add/sub | euint8 | ~50,000 |
| `euint8` mul | euint8 | 122,000–150,000 |
| `euint64` add/sub | euint64 | ~100,000 |
| `euint64` comparison | euint64 | ~100,000 |
| `euint64` select | euint64 | ~100,000 |
| `euint64` mul | euint64 | ~400,000 |
| `euint128` mul | euint128 | 696,000–1,686,000 |

**Rule of thumb:** A typical function with 5–8 `euint64` FHE ops uses ~500k–800k HCU. Only worry when you exceed 20+ ops in one function.

### Optimization Rules

1. Prefer scalar operands: `FHE.add(a, uint64(5))` costs less than `FHE.add(a, b)`
2. Use the smallest type that fits — `euint8` is much cheaper than `euint128`
3. Avoid encrypted array indexing — O(n) equality checks are extremely expensive
4. Split work across transactions if you approach the 5M sequential limit
5. Prefer bitwise ops over arithmetic — `and/or/xor` cost ~5× less than `add/mul`
6. Keep loop bounds small (≤10–20) — no encrypted break possible

---

## 6. Deployment Addresses

### Sepolia Testnet (chainId: 11155111)

| Contract | Address |
|---|---|
| ACL | `0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D` |
| FHEVMExecutor | `0x92C920834Ec8941d2C77D188936E1f7A6f49c127` |
| KMSVerifier | `0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A` |
| InputVerifier | `0xBBC1fFCdc7C316aAAd72E807D9b0272BE8F84DA0` |
| HCU Limit | `0xa10998783c8CF88D886Bc30307e631D6686F0A22` |
| Decryption verifier | `0x5D8BD78e2ea6bbE41f26dFe9fdaEAa349e077478` |
| Input verification | `0x483b9dE06E4E4C7D35CCf5837A1668487406D955` |

> All wired automatically by `ZamaEthereumConfig`. You only need these if configuring manually.

### Network IDs (TypeScript SDK)

| Network | `chainId` | `gatewayChainId` |
|---|---|---|
| Sepolia | `11155111` | `10901` |
| Mainnet | `1` | `261131` |

### SDK Initialization

```typescript
import { createInstance, SepoliaConfig, MainnetConfig } from "@zama-fhe/relayer-sdk";

// Sepolia (testnet — no API key needed)
const instance = await createInstance({ ...SepoliaConfig, network: window.ethereum });

// Mainnet (requires Zama API key — never expose in browser bundle)
const instance = await createInstance({
  ...MainnetConfig,
  network: window.ethereum,
  auth: { __type: "ApiKeyHeader", value: process.env.ZAMA_FHEVM_API_KEY },
});
```

---

## 7. Encrypted Input SDK Reference (TypeScript)

```typescript
// Create input (bound to contract + user address)
const input = instance.createEncryptedInput(contractAddress, userAddress);

// Add values — order maps to handles[0], handles[1], ...
input.addBool(true);
input.add8(5);
input.add16(300);
input.add32(42);
input.add64(BigInt(1000));
input.add128(BigInt("999999999999999999"));
input.addAddress("0x1234...");

// Encrypt (async — relayer generates ZKPoK)
const encrypted = await input.encrypt();

// Extract
const handle    = encrypted.handles[0]; // first externalEuintXX param
const inputProof = encrypted.inputProof; // bytes calldata proof for all params
```

---

*Part of the FHEVM Skill File System. See also: [SKILL.md](SKILL.md) (master), [SKILL-TEMPLATES.md](SKILL-TEMPLATES.md) (templates), [SKILL-TESTING.md](SKILL-TESTING.md) (testing).*
