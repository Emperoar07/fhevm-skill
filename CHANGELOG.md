# SKILL.md Changelog
## [CI-VALIDATED] — 2026-04-12

**Version:** 1.7.0
0.4.2
0.8.24
0.8.24
0.8.24
0.8.24
0.8.24
**Result:** 32 passing, 7 pending, 0 failing
**Commit:** 90d01fee178db98f0a2e7587832a7f8b1f14b043
**Triggered by:** push to main

---


All notable changes to the FHEVM Agent Skill are documented here.
Format: `[version] — date — what changed and why`

---

## [1.7.0] — 2026-04-12

### Added — ERC7984 Complete Pattern Coverage (closes GAP-005)

Expanded `SKILL.md §11b` and `SKILL-TEMPLATES.md Template 7` with full ERC7984 operational patterns:

- **Private transfers** — `transfer(address, externalEuint64, bytes)` override with `_transfer` delegation
- **Confidential allowances** — `confidentialApprove` + `confidentialTransferFrom` with required ACL grants
  (`FHE.allow(_allowances[...]`, `FHE.allowThis(...)`) so the spender can actually read the handle
- **Burn pattern with ACL requirement** — `confidentialBurn` with `FHE.isInitialized(balance)` guard;
  critical red-box warning that `_burn` on an address with no prior balance history reverts because
  `allowThis` is set by `_mint`/`_transfer`, never by zero-balance state
- **Admin burn** — owner-controlled `adminBurn(address, uint64)` for compliance use cases
- **ConfidentialWrapper (Template 7b)** — full ERC20 ↔ ERC7984 bridge with `wrap`, `unwrap`, and
  `confidentialUnwrap` (hidden-amount unwrap), plus a visibility rules table showing what leaks at
  each step
- **KNOWN_GAPS.md** — GAP-005 marked resolved, added to Resolved Gaps table

### Improved — SKILL-TEMPLATES.md
- Template 7 split into 7a (core token) and 7b (wrapper) for clarity
- Version bumped to 1.7.0

---

## [1.6.0] — 2026-04-12

### Added — Upstream Ecosystem Monitoring

The skill now evolves automatically when the **Zama ecosystem itself changes**, not just when
users report failures. Three new components:

- **`VERSIONS.md`** — Version pin tracker. Records the exact package version the skill was
  last validated against for all four Zama packages. Updated automatically by CI weekly.
  Agents should check this before generating code to know if the skill is current.

- **`skill-watch-deps.yml`** (GitHub Actions, runs every Monday) — Fetches the latest npm version
  of `@fhevm/solidity`, `@zama-fhe/relayer-sdk`, `@fhevm/hardhat-plugin`, and
  `@openzeppelin/confidential-contracts`. Compares against the pinned versions in `VERSIONS.md`.
  On any version change: updates `VERSIONS.md`, opens a GitHub Issue labeled `skill-gap` with
  the exact packages that changed and links to their changelogs.

- **`skill-watch-docs.yml`** (GitHub Actions, runs every Thursday) — Fetches 5 Zama docs pages
  (FHE API reference, relayer SDK, changelog, ACL reference, hardhat plugin), hashes the content,
  and stores snapshots in `.github/doc-snapshots/`. On any content change: opens a GitHub Issue
  labeled `skill-gap` identifying which page changed and which SKILL file is most likely affected.

### Improved — SKILL.md evolution section
- Replaced single-loop diagram with three-channel evolution description
- Added `VERSIONS.md` row to metadata table with "auto-updated weekly by CI" label
- Version bumped to 1.6.0

---

## [1.5.0] — 2026-04-12

### Added — Skill File System

The skill is now split across **four files** to satisfy the "more than one SKILL.md" judging
criterion and to improve agent load efficiency (agents load only the files relevant to their task).

- **`SKILL-REFERENCE.md`** — Complete API reference: all encrypted types, every FHE operation,
  ACL function signatures, HCU cost table, TypeScript SDK input/decrypt API, deployment addresses.
  Extracted from SKILL.md sections 3, 4, 4b, 6, 8, 11c so agents writing contracts always have
  the authoritative reference without re-reading the full overview.

- **`SKILL-TEMPLATES.md`** — 7 production-ready, validated contract templates with `// TODO:`
  markers: Minimal, ConfidentialToken, ConfidentialVoting, SealedBidAuction, ConfidentialSurvey,
  ConfidentialLeaderboard, ERC7984 token. Includes ACL checklist for reviewing new functions.

- **`SKILL-TESTING.md`** — Complete Hardhat test guide: setup, encrypted input creation,
  `userDecryptEuint` helpers by type, full test file template, 6 pattern-specific test examples
  (clamp, select, aggregation, access guards, deadline, double-submit), mock vs Sepolia mode,
  debug checklist for the 5 most common test failures, CI setup, test coverage checklist.

### Improved — SKILL.md (master index)
- Added **Skill File System** table in metadata section — one-glance navigation to all four files
- Updated **Table of Contents** with cross-file navigation callouts
- Added **Skill File System Index** table at footer
- Version bumped to 1.5.0

---

## [1.4.0] — 2026-04-12

### Added
- **NextJS / frontend integration section** (Section 9b): `FhevmProvider` setup, `useScaffoldWriteContract`
  pattern for encrypted inputs, component-level encrypt-and-submit flow, scaffold-eth wiring.

- **Sepolia deployment walkthrough** (Section 11d): Step-by-step `hardhat deploy` to Sepolia,
  `.env` variable checklist, `verify` command, post-deploy smoke test, and error table for the
  5 most common deployment failures.

- **Glossary** (Section 14): 27 terms defined — handles, ACL, HCU, Gateway, coprocessor, TKMS,
  KMSVerifier, InputVerifier, ZamaEthereumConfig, ERC7984, and more.

- **Handle ordering critical callout** (Section 12 anti-patterns): Red-box warning that
  `FHE.select(condition, ifTrue, ifFalse)` requires all three handles to be of the same encrypted
  type — wrong ordering causes a silent wrong-branch result, not a compile error.

### Improved
- **Admin/owner ACL warning** (Section 6): Replaced inline note with prominent 🔴 CRITICAL callout
  block — the most-hit gap in testing.

- **HCU worked example** (Section 4b): Added line-by-line HCU estimate for `submitScore()` showing
  how ops accumulate toward the 5M sequential limit.

- **report-gap.js** (scripts/): REPO constant now reads from `SKILL_REPO` env var or
  `package.json` `repository.url` field instead of a hardcoded placeholder.

---

## [1.3.0] — 2026-04-12

### Added
- **Admin/owner ACL rule** (Section 6): Explicitly documented that `FHE.allowThis` does NOT grant
  access to the contract owner. Owner addresses need their own `FHE.allow(handle, ownerAddress)`.
  *Discovered by:* failing test — `userDecryptEuint` rejected owner address on ConfidentialVoting tallies.

- **Import rule for intermediate types** (Section 13 cheatsheet): Added explicit note that every
  encrypted type used in a contract must appear in the import statement, even if only used as an
  intermediate (e.g. `euint8` used only in `FHE.asEuint8()` still requires the import).
  *Discovered by:* ConfidentialLeaderboard compile error — `euint8` used but not imported.

- **ERC7984 section** (Section 11b): Full coverage of the confidential token standard — inheritance,
  mint patterns, key differences from ERC20.

- **Deployment addresses** (Section 11c): Sepolia contract addresses for ACL, FHEVMExecutor,
  KMSVerifier, InputVerifier, HCU Limit.

- **HCU gas model** (Section 4b): Cost table per operation type, 20M/5M limits, optimization rules,
  fixed-loop pattern.

- **Encrypted error codes pattern** (Section 7): How to communicate failure to users without
  revealing which condition failed — using per-user encrypted error code mappings.

- **`FHE.toBytes32()` documentation** (Section 6): Added as both a subsection and cheatsheet entry.
  Required for building the handles array in `FHE.checkSignatures()` but was previously undocumented.

- **Mainnet API key guidance** (Section 11c): Backend-proxy pattern to avoid leaking the Zama
  relayer API key in frontend bundles.

- **`FHE.isSenderAllowed` guard pattern** (Section 6): Prevents callers from submitting encrypted
  handles they don't own.

### Fixed
- **`publicDecrypt` call signature**: Was documented as `import { publicDecrypt } from "@zama-fhe/relayer-sdk"`.
  Corrected to `instance.publicDecrypt(handles)` — it is a method on the instance, not a standalone export.

- **View function ACL section**: Added explicit subsection explaining that view functions returning
  encrypted handles require the caller to have been granted ACL access at write time, not read time.

---

## [1.2.0] — 2026-04-12

### Added
- Full loop pattern documentation — cannot break on `ebool`, must use fixed bounds + `FHE.select`
- React hook pattern for `useConfidentialToken`
- User decryption 2048-bit limit noted in both contract and frontend sections

### Fixed
- `FHE.select` examples now show correct operand type alignment
- ACL method-chaining syntax example corrected

---

## [1.1.0] — 2026-04-12

### Added
- Initial SKILL.md with 13 sections
- Complete contract example (ConfidentialToken)
- Anti-patterns section with 8 common mistakes
- Quick reference cheatsheet

### Validated against
- FHECounter (existing template contract) — 3/3 tests passing
- ConfidentialVoting — 6/6 tests passing (after ACL fix)
- SealedBidAuction — 6/6 tests passing
- ConfidentialLeaderboard — 6/6 tests passing
- ConfidentialSalary (cold-start demo test) — 10/10 tests passing, first try

---

## How to contribute to this changelog

When you fix a gap in SKILL.md:
1. Add an entry here under a new version number
2. State: what changed, what section, and what failure triggered the fix
3. Bump the version in the SKILL.md metadata table
4. Update the `Last updated` and `Last tested against` fields
