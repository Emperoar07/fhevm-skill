# FHEVM Skill — Version Pin Tracker

This file records the exact package versions the skill was last validated against.
It is updated automatically by the `skill-watch-deps.yml` workflow when new versions are detected,
and manually by maintainers after re-validating the skill against a new release.

**If the "Latest on npm" column differs from "Skill validated against" — the skill needs a review.**

---

## Zama Package Versions

| Package | Skill validated against | Latest on npm | Status | Last checked |
|---|---|---|---|---|
| `@fhevm/solidity` | `0.10.0` | — | Pending check | 2026-04-12 |
| `@zama-fhe/relayer-sdk` | `0.3.0` | — | Pending check | 2026-04-12 |
| `@fhevm/hardhat-plugin` | `0.4.2` | — | Pending check | 2026-04-12 |
| `@openzeppelin/confidential-contracts` | `latest` | — | Pending check | 2026-04-12 |

**Status legend:**
- `Up to date` — skill validated against this version, no changes needed
- `Pending check` — new version detected, skill not yet re-validated
- `Needs update` — confirmed breaking changes found, skill update in progress

---

## How This File Gets Updated

### Automatically (weekly)
The `skill-watch-deps.yml` GitHub Actions workflow:
1. Checks npm for the latest version of each Zama package above
2. Compares against the "Skill validated against" column in this file
3. If any version has changed:
   - Updates the "Latest on npm" and "Last checked" columns here
   - Sets status to `Pending check`
   - Opens a GitHub Issue labeled `skill-gap` with details of what changed
   - The `skill-evolve.yml` workflow then logs it to `KNOWN_GAPS.md`

### Manually (after re-validation)
When a maintainer has updated the skill for a new package version:
1. Update "Skill validated against" to the new version
2. Set status back to `Up to date`
3. Update "Last checked" to today's date
4. Add an entry to `CHANGELOG.md` describing what changed in the skill
5. Bump the skill version in `SKILL.md` metadata

---

## Docs Snapshot Hash

Used by `skill-watch-docs.yml` to detect changes in the Zama documentation.

| Source | Last snapshot | Hash |
|---|---|---|
| `docs.zama.org/protocol` changelog | 2026-04-12 | `pending-first-run` |
| `docs.zama.org/protocol` API reference | 2026-04-12 | `pending-first-run` |

When the docs watcher detects a hash change, it opens a GitHub Issue labeled `skill-gap` so
the change can be reviewed and incorporated into the skill files.

---

## Known Breaking Changes History

| Date | Package | Old version | New version | What changed | Skill updated |
|---|---|---|---|---|---|
| — | — | — | — | First entry will appear here when the watcher fires | — |

---

## Adding a New Package to Watch

To track a new Zama package, add a row to the table above and update
`.github/workflows/skill-watch-deps.yml` with the new package name in the `PACKAGES` list.
