# FHEVM Skill - Version Pin Tracker

This file records the exact package versions the skill was last validated against.
It is updated automatically by the dependency and docs watcher workflows.

If the "Latest on npm" column differs from "Skill validated against", the skill needs a review.

---

## Zama Package Versions

| Package | Skill validated against | Latest on npm | Status | Last checked |
|---|---|---|---|---|
| `@fhevm/solidity` | `0.11.1` | `0.11.1` | Up to date | 2026-04-17 |
| `@zama-fhe/relayer-sdk` | `0.4.1` | `0.4.1` | Up to date | 2026-04-17 |
| `@fhevm/hardhat-plugin` | `0.4.2` | `0.4.2` | Up to date | 2026-04-17 |
| `@openzeppelin/confidential-contracts` | `latest` | `latest` | Pending check | 2026-04-17 |

Status legend:
- `Up to date`: skill validated against this version, no changes needed
- `Pending check`: new version detected, skill not yet re-validated
- `Needs update`: breaking changes found and skill updates are in progress

---

## Docs Snapshot Hash

Used by `skill-watch-docs.yml` to detect documentation changes.

| Source | Last snapshot | Hash |
|---|---|---|
| `docs.zama.org/fhevm-solidity-api` | 2026-04-17 | `pending-first-run` |
| `docs.zama.org/relayer-sdk-api` | 2026-04-17 | `pending-first-run` |
| `docs.zama.org/fhevm-changelog` | 2026-04-17 | `pending-first-run` |
| `docs.zama.org/acl-reference` | 2026-04-17 | `pending-first-run` |
| `docs.zama.org/hardhat-plugin` | 2026-04-17 | `pending-first-run` |

---

## Known Breaking Changes History

| Date | Package | Old version | New version | What changed | Skill updated |
|---|---|---|---|---|---|
| - | - | - | - | First entry will appear here when the watcher fires | - |

---

## Adding a New Package to Watch

To track a new package:
1. Add a row to the table above.
2. Add the package name to `PACKAGES` in `.github/workflows/skill-watch-deps.yml`.
