# FHEVM Agent Skill — Testing Guide

> **Part of the FHEVM Skill File System.**
> This file covers everything needed to write, run, and debug FHEVM contract tests using Hardhat.
> All patterns here are validated against the 32-test suite in this repo.
>
> Read `SKILL.md` for concepts. Read `SKILL-REFERENCE.md` for the API. Read `SKILL-TEMPLATES.md` for contract starting points.

---

## Metadata

| Field | Value |
|---|---|
| **Version** | 1.5.0 |
| **Test framework** | Hardhat + Mocha + Chai |
| **Plugin** | `@fhevm/hardhat-plugin` v0.4.2 |
| **Mock mode** | Local — no network required, instant execution |
| **Sepolia mode** | Real network — requires funded wallet + RPC |

---

## 1. Setup

### Required imports (every test file)

```typescript
import { fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { ethers } from "hardhat";
import { expect } from "chai";
import type { Signer } from "ethers";
```

### Running tests

```bash
# From project root — runs all tests in local mock mode
pnpm test

# From hardhat package only
cd packages/hardhat
pnpm test

# Single test file
pnpm test test/ConfidentialVoting.ts

# Watch mode
pnpm test --watch
```

### hardhat.config.ts requirement

```typescript
import "@fhevm/hardhat-plugin"; // must be present for fhevm object to exist
```

---

## 2. Creating Encrypted Inputs in Tests

The `fhevm` object from Hardhat is the test-side equivalent of the browser SDK.

### Single encrypted value

```typescript
const input = fhevm.createEncryptedInput(
  await contract.getAddress(), // contract address (string)
  alice.address,               // user address
);
input.add64(BigInt(500));      // add64 for euint64, add32 for euint32, etc.
const enc = await input.encrypt();

// Use in contract call:
await contract.connect(alice).transfer(bob.address, enc.handles[0], enc.inputProof);
```

### Multiple encrypted values (single proof)

```typescript
const input = fhevm.createEncryptedInput(await contract.getAddress(), alice.address);
input.add64(BigInt(100));   // → handles[0]  externalEuint64
input.add8(5);              // → handles[1]  externalEuint8
input.addBool(true);        // → handles[2]  externalEbool
const enc = await input.encrypt();

await contract.multiInput(enc.handles[0], enc.handles[1], enc.handles[2], enc.inputProof);
```

### Input methods by type

| Method | Solidity param type |
|---|---|
| `input.addBool(true)` | `externalEbool` |
| `input.add8(n)` | `externalEuint8` |
| `input.add16(n)` | `externalEuint16` |
| `input.add32(n)` | `externalEuint32` |
| `input.add64(BigInt(n))` | `externalEuint64` |
| `input.add128(BigInt(n))` | `externalEuint128` |
| `input.addAddress("0x...")` | `externalEaddress` |

---

## 3. Decrypting Values in Tests (Assertions)

`fhevm.userDecryptEuint` reads the encrypted handle and returns the plaintext BigInt.
**Requires that `FHE.allow(handle, signer.address)` was called in the contract.**

### Decrypt euint

```typescript
const encHandle = await contract.balanceOf(alice.address);
const plain = await fhevm.userDecryptEuint(
  FhevmType.euint64,          // type enum
  encHandle,                  // bytes32 handle from contract
  await contract.getAddress(),
  alice,                      // Signer — must match FHE.allow() grant
);
expect(plain).to.equal(BigInt(500));
```

### Decrypt helpers by type

```typescript
// euint variants
fhevm.userDecryptEuint(FhevmType.euint8,   handle, contractAddr, signer)
fhevm.userDecryptEuint(FhevmType.euint16,  handle, contractAddr, signer)
fhevm.userDecryptEuint(FhevmType.euint32,  handle, contractAddr, signer)
fhevm.userDecryptEuint(FhevmType.euint64,  handle, contractAddr, signer)
fhevm.userDecryptEuint(FhevmType.euint128, handle, contractAddr, signer)

// ebool
fhevm.userDecryptEbool(handle, contractAddr, signer)  // returns boolean

// eaddress
fhevm.userDecryptEaddress(handle, contractAddr, signer) // returns address string
```

### Common decryption error

```
Error: User 0x... is not authorized to user decrypt handle 0x...
```

**Cause:** The contract did not call `FHE.allow(handle, signer.address)`.
**Fix:** Add `FHE.allow(handle, msg.sender)` (or the appropriate address) after every FHE operation that produces the handle.

---

## 4. Full Test File Template

Copy this structure for any new contract test file:

```typescript
import { fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { ethers } from "hardhat";
import { expect } from "chai";
import type { Signer } from "ethers";

// TODO: import your contract type
// import type { MyContract } from "../typechain-types";

describe("MyContract", () => {
  let contract: any; // TODO: replace any with typed contract
  let owner: Signer;
  let alice: Signer;
  let bob: Signer;
  let contractAddress: string;

  beforeEach(async () => {
    [owner, alice, bob] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    contract = await Factory.deploy(/* TODO: constructor args */);
    await contract.waitForDeployment();
    contractAddress = await contract.getAddress();
  });

  it("deploys with correct initial state", async () => {
    // TODO: assert initial state
    // e.g. const count = await contract.count(); expect(count).to.equal(0n);
  });

  it("accepts an encrypted input", async () => {
    const input = fhevm.createEncryptedInput(contractAddress, (await alice.getAddress()));
    input.add64(BigInt(100));
    const enc = await input.encrypt();

    await contract.connect(alice).setValue(enc.handles[0], enc.inputProof);
    // TODO: assert side effects (events, counters, etc.)
  });

  it("user can decrypt their own value", async () => {
    // First: write encrypted value
    const input = fhevm.createEncryptedInput(contractAddress, (await alice.getAddress()));
    input.add64(BigInt(42));
    const enc = await input.encrypt();
    await contract.connect(alice).setValue(enc.handles[0], enc.inputProof);

    // Then: read and decrypt
    const encHandle = await contract.getValue(await alice.getAddress());
    const plain = await fhevm.userDecryptEuint(
      FhevmType.euint64, encHandle, contractAddress, alice
    );
    expect(plain).to.equal(BigInt(42));
  });

  it("blocks unauthorized access", async () => {
    // TODO: test access controls, require statements, double-submit guards
    await expect(contract.connect(bob).ownerOnlyFunction()).to.be.reverted;
  });
});
```

---

## 5. Testing Specific Patterns

### Testing the silent-clamp pattern (no revert on invalid input)

```typescript
it("clamps transfer to 0 when balance insufficient", async () => {
  // Alice has 100, tries to transfer 999 — should silently transfer 0
  const aliceAddr = await alice.getAddress();
  const bobAddr   = await bob.getAddress();

  // Give alice 100
  const mintInput = fhevm.createEncryptedInput(contractAddress, aliceAddr);
  mintInput.add64(BigInt(100));
  const mintEnc = await mintInput.encrypt();
  await contract.connect(alice).deposit(mintEnc.handles[0], mintEnc.inputProof);

  // Alice tries to transfer 999
  const txInput = fhevm.createEncryptedInput(contractAddress, aliceAddr);
  txInput.add64(BigInt(999));
  const txEnc = await txInput.encrypt();
  await contract.connect(alice).transfer(bobAddr, txEnc.handles[0], txEnc.inputProof);

  // Bob's balance should still be 0 (transfer was clamped)
  const bobHandle = await contract.balanceOf(bobAddr);
  const bobBalance = await fhevm.userDecryptEuint(FhevmType.euint64, bobHandle, contractAddress, bob);
  expect(bobBalance).to.equal(BigInt(0));
});
```

### Testing FHE.select (encrypted conditional)

```typescript
it("select chooses higher value", async () => {
  const addr = await contract.getAddress();
  const userAddr = await alice.getAddress();

  // Submit two values — contract should keep the higher one
  const input1 = fhevm.createEncryptedInput(addr, userAddr);
  input1.add64(BigInt(50));
  const enc1 = await input1.encrypt();
  await contract.connect(alice).submitScore(enc1.handles[0], enc1.inputProof);

  const input2 = fhevm.createEncryptedInput(addr, userAddr);
  input2.add64(BigInt(80));
  const enc2 = await input2.encrypt();
  await contract.connect(alice).submitScore(enc2.handles[0], enc2.inputProof);

  // Personal best should be 80
  const pbHandle = await contract.getPersonalBest(userAddr);
  const pb = await fhevm.userDecryptEuint(FhevmType.euint64, pbHandle, addr, alice);
  expect(pb).to.equal(BigInt(80));
});
```

### Testing multi-user aggregation

```typescript
it("aggregates multiple users correctly", async () => {
  const addr = await contract.getAddress();
  const users = [owner, alice, bob];
  const amounts = [BigInt(100), BigInt(200), BigInt(300)];

  for (let i = 0; i < users.length; i++) {
    const userAddr = await users[i].getAddress();
    const input = fhevm.createEncryptedInput(addr, userAddr);
    input.add64(amounts[i]);
    const enc = await input.encrypt();
    await contract.connect(users[i]).submit(enc.handles[0], enc.inputProof);
  }

  // Owner reads encrypted total
  const totalHandle = await contract.connect(owner).getTotal();
  const total = await fhevm.userDecryptEuint(FhevmType.euint64, totalHandle, addr, owner);
  expect(total).to.equal(BigInt(600)); // 100 + 200 + 300
});
```

### Testing `onlyOwner` and access guards

```typescript
it("non-owner cannot call restricted function", async () => {
  await expect(
    contract.connect(alice).ownerOnlyFunction()
  ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
});

it("owner can call restricted function", async () => {
  await expect(contract.connect(owner).ownerOnlyFunction()).to.not.be.reverted;
});
```

### Testing time-based conditions (deadline)

```typescript
it("blocks action after deadline", async () => {
  // Move time forward past deadline
  await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]); // 7 days
  await ethers.provider.send("evm_mine", []);

  const input = fhevm.createEncryptedInput(contractAddress, await alice.getAddress());
  input.add64(BigInt(1));
  const enc = await input.encrypt();

  await expect(
    contract.connect(alice).vote(enc.handles[0], enc.inputProof)
  ).to.be.revertedWith("Voting closed");
});
```

### Testing double-submission guard

```typescript
it("prevents double submission", async () => {
  const addr = await contract.getAddress();
  const aliceAddr = await alice.getAddress();

  const submit = async () => {
    const input = fhevm.createEncryptedInput(addr, aliceAddr);
    input.add64(BigInt(50));
    const enc = await input.encrypt();
    return contract.connect(alice).submit(enc.handles[0], enc.inputProof);
  };

  await submit();
  await expect(submit()).to.be.revertedWith("Already submitted");
});
```

---

## 6. Mock Mode vs Sepolia Mode

### Mock mode (default — local, instant)

- No network needed
- `fhevm.createEncryptedInput` and `fhevm.userDecryptEuint` work instantly
- FHE operations are simulated — no real encryption, but same contract logic
- Use for all development and CI

```typescript
// Automatically active when running `pnpm test` locally
// No configuration needed
```

### Sepolia mode

For tests that must run against the real Zama coprocessors on Sepolia testnet.

```typescript
// test/MyContractSepolia.ts
import { fhevm } from "hardhat";

describe("MyContractSepolia", () => {
  before(function () {
    if (network.name !== "sepolia") {
      console.log("This hardhat test suite can only run on Sepolia Testnet");
      this.skip(); // skips all tests in this suite when not on Sepolia
    }
  });

  it("real FHE operation on Sepolia", async () => {
    // same test code — but fhevm.userDecryptEuint goes through real Zama relayer
  });
});
```

Run against Sepolia:

```bash
cd packages/hardhat
MNEMONIC="..." SEPOLIA_RPC_URL="..." pnpm hardhat test --network sepolia
```

> **Sepolia tests count as "pending" in local runs** — they appear as `1 pending` in Mocha output, which is expected and correct.

---

## 7. Debugging Test Failures

### "User 0x... is not authorized to user decrypt handle"

The signer passed to `userDecryptEuint` was never granted ACL access.

**Checklist:**
1. Does the contract call `FHE.allow(handle, signer.address)`?
2. Is it called after **every** FHE operation that mutates the handle?
3. Is it called for the **owner** address too if owner needs to decrypt?
4. Are you passing the correct signer to `userDecryptEuint`?

```typescript
// Fix in contract:
_balance = FHE.add(_balance, amount);
FHE.allowThis(_balance);
FHE.allow(_balance, msg.sender);   // ← user
FHE.allow(_balance, owner());      // ← owner (if owner needs to decrypt)
```

### "TypeError: fhevm.createEncryptedInput is not a function"

`@fhevm/hardhat-plugin` is not imported in `hardhat.config.ts`.

```typescript
// hardhat.config.ts — add this line
import "@fhevm/hardhat-plugin";
```

### "euint8 not found" compile error

The type is used in the contract but not imported from `@fhevm/solidity`.

```solidity
// Add the missing type to the import:
import { FHE, euint64, euint8, ... } from "@fhevm/solidity/lib/FHE.sol";
```

### Test passes but decrypted value is wrong

Common causes:
- **Handle ordering issue:** Multiple FHE ops in sequence — make sure you're reading the handle after all mutations, not a stale one
- **Type mismatch:** Passing `FhevmType.euint32` to decrypt a `euint64` handle — use the correct type enum
- **Wrong signer:** Decrypting with `owner` when the handle was granted to `alice`

### "FHE.checkSignatures reverted" in public decryption test

Handle array order in the contract doesn't match the order used in `publicDecrypt`.

```typescript
// In test: note the order you pass to publicDecrypt
const { decryptionProof } = instance.publicDecrypt([handleA, handleB]);

// In contract: must be same order
handles[0] = FHE.toBytes32(encA); // handleA was index 0
handles[1] = FHE.toBytes32(encB); // handleB was index 1
```

---

## 8. CI Configuration

The test suite runs automatically in GitHub Actions. See `.github/workflows/skill-ci.yml`.

Key config:
- Tests run on every push to `main` or PR touching contracts/tests/SKILL.md
- Mock mode only in CI (no Sepolia keys in CI environment)
- On failure: gap entry auto-appended to `KNOWN_GAPS.md`
- On success on `main`: CHANGELOG.md updated automatically

To run the same check locally before pushing:

```bash
pnpm compile && pnpm test
```

Expected output for a clean repo:

```
  32 passing (Xs)
  1 pending
```

The `1 pending` is the Sepolia-only test — this is expected and correct.

---

## 9. Test Coverage Checklist

Use this checklist when writing tests for a new contract:

```
[ ] Deploy test — contract initializes with correct state
[ ] Happy path — encrypted input accepted, state updated
[ ] User can decrypt their own data (userDecryptEuint succeeds)
[ ] Aggregate/total accessible only by authorized address
[ ] Double-submission blocked
[ ] Post-deadline/post-close actions blocked
[ ] Non-owner blocked from owner-only functions
[ ] Multi-user scenario — multiple users, correct aggregate
[ ] Silent-clamp test — overspend/overflow results in 0, not revert
[ ] (optional) Public reveal — makePubliclyDecryptable + checkSignatures
```

---

*Part of the FHEVM Skill File System. See also: [SKILL.md](SKILL.md) (master), [SKILL-REFERENCE.md](SKILL-REFERENCE.md) (API reference), [SKILL-TEMPLATES.md](SKILL-TEMPLATES.md) (contract templates).*
