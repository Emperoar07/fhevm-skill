# Known Gaps - FHEVM Agent Skill

This file tracks patterns that are not yet fully validated or are suspected to be incomplete.
AI agents reading this file should treat these areas with extra caution and prefer documented safe patterns over improvising.

---

## Active Gaps

### GAP-003 - Re-org handling in high-stakes contracts
**Status:** Partially validated, network re-org simulation still unproven  
**Description:** The skill now has a local boundary proof for ACL lifetime via
`packages/hardhat/contracts/AclTransientBoundaryProof.sol` and
`packages/hardhat/test/AclTransientBoundaryProof.ts`.
That proof validates the narrower rule that `FHE.allowTransient` is suitable for same-transaction
handoff, but should not be treated as durable access in later transactions. What remains unproven
is a true chain re-org simulation against live network behavior.  
**Safe fallback:** Use persistent `FHE.allow` for any handle that must survive across blocks,
retries, delayed reads, settlement, or admin review.  
**Tracked since:** 2026-04-12

---

### GAP-004 - `euint256` operation surface
**Status:** Resolved in v1.8.0  
**Description:** The skill documents that `euint256` supports only bitwise/logical operations and no arithmetic.
This is now validated in local mock mode by `packages/hardhat/contracts/Euint256OpsProof.sol` and
`packages/hardhat/test/Euint256OpsProof.ts`.  
**Resolution:** The following `euint256` operations are compile-tested and runtime-tested:
- `FHE.and`
- `FHE.or`
- `FHE.xor`
- `FHE.not`
- `FHE.eq`
- `FHE.ne`
- `FHE.select`

Arithmetic remains unsupported for `euint256`; use `euint128` when you need large-value arithmetic.  
**Fixed in:** v1.8.0 - 2026-04-17

---

## Resolved Gaps

| Gap ID | Description | Fixed in version |
|---|---|---|
| GAP-001 | `publicDecrypt` return type shape - `clearValues` keyed by handle hex, values are bigint | v1.7.0 |
| GAP-002 | `FHE.checkSignatures` with 3+ handles - validated via `PublicDecryptionVerifier` on Sepolia | v1.7.0 |
| GAP-004 | `euint256` supported operation surface - validated via `Euint256OpsProof` | v1.8.0 |
| GAP-005 | ERC7984 `_burn` ACL requirements and `FHE.isInitialized` guard | v1.7.0 |
| - | `publicDecrypt` was documented as a standalone import | v1.3.0 |
| - | Owner ACL not mentioned for admin-readable handles | v1.3.0 |
| - | `euint8` import rule for intermediate types | v1.3.0 |
| - | `FHE.toBytes32` undocumented | v1.3.0 |

---

## How To Add A Gap

If you discover a pattern the skill gets wrong, add an entry above:

```markdown
### GAP-XXX - Short title
**Status:** [Unvalidated / Partially validated / Confirmed bug]
**Description:** What the skill says vs. what actually happens.
**Safe fallback:** What to do instead until the skill is fixed.
**Tracked since:** YYYY-MM-DD
```

Then open `FEEDBACK.md` and submit a full report so the maintainer can fix it.
