# Known Gaps — FHEVM Agent Skill

This file tracks patterns that are **not yet fully validated** or are **suspected to be incomplete**.
AI agents reading this file should treat these areas with extra caution and prefer the documented
safe patterns over improvising.

---

## Active Gaps

### GAP-001 — Public decryption TypeScript return type
**Status:** Resolved in v1.7.0  
**Description:** The `instance.publicDecrypt(handles)` return type includes `clearValues`,
`abiEncodedClearValues`, and `decryptionProof`. The exact shape of `clearValues` (keyed by
handle hex string, values are bigint/boolean/string depending on type) is now validated against
the live Sepolia relayer via `PublicDecryptionVerifier` contract.  
**Resolution:** `clearValues` is a plain object keyed by handle hex. Use
`BigInt(String(results.clearValues[handle]))` to extract euint64 values safely.
Pass `results.decryptionProof` directly to `FHE.checkSignatures` on-chain.  
**Fixed in:** v1.7.0 — 2026-04-12

---

### GAP-002 — `FHE.checkSignatures` with more than 2 handles
**Status:** Resolved in v1.7.0  
**Description:** The skill documents `checkSignatures` with 1 and 2 handle arrays. Behavior with
3+ handles and the corresponding `abi.encode` format has now been validated end-to-end on Sepolia
via the `PublicDecryptionVerifier` contract (deployed at
`0x72B0BBB2172FcAAaF01e052C81C8B9638686047D`).  
**Resolution:** 3-handle public decryption works exactly like 1-handle. Key rules:
- `handles[]` order in `FHE.checkSignatures` must match the order passed to `publicDecrypt()`
- `cleartexts` must be `abi.encode(a, b, c)` in the same order
- `FHE.makePubliclyDecryptable` must be called on each handle before `publicDecrypt()`
- `fhevm.publicDecrypt([handleA, handleB, handleC])` returns `{ clearValues, decryptionProof }`  
**Fixed in:** v1.7.0 — 2026-04-12

---

### GAP-003 — Re-org handling in high-stakes contracts
**Status:** Documented but not tested  
**Description:** The skill mentions re-org risk for ACL grants (Section 6). The recommended pattern
of using `allowTransient` for intermediate values is documented but no test covers the re-org
scenario.  
**Safe fallback:** Use persistent `FHE.allow` for any handle that must survive across blocks.  
**Tracked since:** 2026-04-12

---

### GAP-004 — `euint256` operation surface
**Status:** Partially validated  
**Description:** Skill documents that `euint256` supports only bitwise/logical ops (no arithmetic).
This has not been compile-tested — relying on Zama docs.  
**Safe fallback:** Avoid `euint256` unless you specifically need 256-bit bitwise ops. Use `euint128`
for large values that need arithmetic.  
**Tracked since:** 2026-04-12

---

### GAP-005 — ERC7984 `_burn` ACL requirements
**Status:** Resolved in v1.7.0  
**Description:** The skill covers `_mint` ACL patterns for ERC7984 but did not document what ACL
grants `_burn` requires on the caller's balance handle.  
**Resolution:** SKILL.md §11b and SKILL-TEMPLATES.md Template 7 now document the full burn pattern:
`FHE.isInitialized(balance)` guard required before `_burn`; the ERC7984 base satisfies `allowThis`
automatically via `_mint`/`_transfer`, but callers with no balance history will fail.  
**Fixed in:** v1.7.0 — 2026-04-12

---

## Resolved Gaps

| Gap ID | Description | Fixed in version |
|---|---|---|
| GAP-001 | `publicDecrypt` return type shape — `clearValues` keyed by handle hex, values are bigint | v1.7.0 |
| GAP-002 | `FHE.checkSignatures` with 3+ handles — validated via `PublicDecryptionVerifier` on Sepolia | v1.7.0 |
| GAP-005 | ERC7984 `_burn` ACL requirements and `FHE.isInitialized` guard | v1.7.0 |
| — | `publicDecrypt` was documented as a standalone import | v1.3.0 |
| — | Owner ACL not mentioned for admin-readable handles | v1.3.0 |
| — | `euint8` import rule for intermediate types | v1.3.0 |
| — | `FHE.toBytes32` undocumented | v1.3.0 |

---

## How to add a gap

If you discover a pattern the skill gets wrong, add an entry above:

```markdown
### GAP-XXX — Short title
**Status:** [Unvalidated / Partially validated / Confirmed bug]
**Description:** What the skill says vs. what actually happens.
**Safe fallback:** What to do instead until the skill is fixed.
**Tracked since:** YYYY-MM-DD
```

Then open `FEEDBACK.md` and submit a full report so the maintainer can fix it.
