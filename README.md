# FHEVM Agent Skill

**Zama Developer Program Season 2 Bounty Submission**

A production-ready AI coding skill that enables agents like Claude Code, Cursor, and Windsurf to accurately write, test, and deploy confidential smart contracts using the Zama Protocol (FHEVM).

Point any AI agent at the skill files and it can go from a plain English prompt to a working, tested, deployable FHEVM contract without guessing at APIs or making common mistakes.

---

## What This Is

FHEVM lets smart contracts compute over encrypted data. The API is powerful but unfamiliar to most agents: encrypted types, ACL grants on every handle, no plaintext conditionals, async decryption, HCU limits. Without guidance, agents consistently produce code that compiles but fails tests, or fails at deployment.

This skill solves that. It is a set of structured reference files an agent loads before generating any FHEVM code. The result is correct code on the first try.

**Cold start proof:** The `ConfidentialSalary` contract was built by giving an agent only this prompt and pointing it at `SKILL.md`. All 10 tests passed on the first attempt with no corrections.

---

## Skill File System

The skill is split into four files. An agent loads the ones relevant to its task.

| File | Purpose |
|---|---|
| [SKILL.md](SKILL.md) | Master overview. Mental model, full workflow, all patterns, complete examples. Read this first. |
| [SKILL-REFERENCE.md](SKILL-REFERENCE.md) | Complete API reference. Every encrypted type, FHE operation, ACL function, HCU cost, and deployment address. |
| [SKILL-TEMPLATES.md](SKILL-TEMPLATES.md) | Seven copy-paste contract templates with TODO markers. Token, Voting, Auction, Survey, Leaderboard, ERC7984, Minimal. |
| [SKILL-TESTING.md](SKILL-TESTING.md) | Hardhat test patterns, encrypted input helpers, decryption assertions, debug guide, CI setup. |

Supporting files:

| File | Purpose |
|---|---|
| [USAGE.md](USAGE.md) | Step-by-step guide for using the skill with any AI agent. Example prompts, agent-specific instructions, and what mistakes the skill prevents. |
| [VERSIONS.md](VERSIONS.md) | Tracks exact package versions the skill was validated against. Updated weekly by CI. |
| [CHANGELOG.md](CHANGELOG.md) | Full version history from v1.1.0 to v1.6.0. |
| [KNOWN_GAPS.md](KNOWN_GAPS.md) | Open gaps and patterns still under validation. |
| [FEEDBACK.md](FEEDBACK.md) | How to report a gap or suggest an improvement. |

---

## Test Results

```
  ConfidentialLeaderboard    6 passing
  ConfidentialSalary        10 passing
  ConfidentialVoting         7 passing
  FHECounter                 2 passing
  SealedBidAuction           5 passing
  FHECounterSepolia          1 pending  (Sepolia only)

  32 passing
   1 pending
```

All contracts compile and all 32 tests pass in local mock mode. The pending test requires a live Sepolia connection and is intentionally skipped locally.

---

## Contracts

Five contracts covering the full range of FHEVM patterns:

| Contract | Patterns demonstrated |
|---|---|
| `ConfidentialVoting` | Encrypted bool inputs, FHE.select for vote tallying, owner reveals after deadline |
| `SealedBidAuction` | Encrypted uint64 bids, FHE.select for highest bid tracking, eaddress for winner |
| `ConfidentialLeaderboard` | Personal best with FHE.isInitialized, global top score, multi-user aggregation |
| `ConfidentialSalary` | Per-user encrypted values, encrypted running total, owner-only aggregate read |
| `FHECounter` | Base template from Zama, increment and decrement encrypted counter |

---

## How to Run Tests

```bash
git clone https://github.com/Emperoar07/fhevm-skill-demo
cd fhevm-skill-demo
pnpm install
pnpm test
```

Expected output: `32 passing, 1 pending`

---

## Auto-Evolve System

The skill evolves automatically through three channels so it never goes stale.

**When an agent produces wrong code:**
A developer runs `pnpm report-gap` or files a GitHub Issue with the `skill-gap` label. The `skill-evolve.yml` workflow auto-logs it to `KNOWN_GAPS.md` and notifies maintainers.

**When Zama ships a new package version (every Monday):**
The `skill-watch-deps.yml` workflow checks npm for new versions of `@fhevm/solidity`, `@zama-fhe/relayer-sdk`, `@fhevm/hardhat-plugin`, and `@openzeppelin/confidential-contracts`. On any change it opens a `skill-gap` issue with links to the changelogs and updates `VERSIONS.md`.

**When Zama updates their documentation (every Thursday):**
The `skill-watch-docs.yml` workflow fetches five Zama docs pages, hashes the content, and compares against stored snapshots. On any change it opens a `skill-gap` issue naming exactly which page changed and which skill file needs review.

All four GitHub Actions workflows are in [.github/workflows/](.github/workflows/).

---

## Reporting a Gap

If the skill guides an agent to produce wrong or incomplete code, report it:

```bash
pnpm report-gap
```

This opens a pre-filled GitHub Issue in your browser. The issue is automatically logged to `KNOWN_GAPS.md` and a maintainer is notified. See [FEEDBACK.md](FEEDBACK.md) for the manual process.

---

## Project Structure

```
fhevm-skill-demo/
  SKILL.md                      Master skill overview
  SKILL-REFERENCE.md            API reference
  SKILL-TEMPLATES.md            Contract templates
  SKILL-TESTING.md              Test guide
  USAGE.md                      How to use the skill with any agent
  VERSIONS.md                   Package version tracker
  CHANGELOG.md                  Version history
  KNOWN_GAPS.md                 Open gaps
  FEEDBACK.md                   Gap reporting guide
  packages/
    hardhat/
      contracts/                Five confidential contracts
      test/                     Six test files (32 tests)
      deploy/                   Hardhat deploy scripts
    nextjs/                     Scaffold-ETH frontend
    fhevm-sdk/                  FHEVM SDK package
  scripts/
    report-gap.js               CLI gap reporter
  .github/
    workflows/
      skill-ci.yml              Test runner and gap logger
      skill-evolve.yml          Community issue handler
      skill-watch-deps.yml      Weekly npm version watcher
      skill-watch-docs.yml      Weekly docs change detector
    ISSUE_TEMPLATE/
      skill-gap.yml             Structured gap report template
```

---

## How to Use the Skill

Full guide: **[USAGE.md](USAGE.md)**

The short version: open any AI coding agent, tell it to read the relevant skill files, then describe what you want to build.

```
Read SKILL.md and SKILL-TEMPLATES.md in this repo.

Build a confidential salary survey contract where employees submit encrypted
salaries and the owner reads an encrypted aggregate total. Include tests.
```

The agent reads the skill files and produces a working contract with correct ACL grants, proper FHE.select usage, and a full test suite. No corrections needed.

Which files to load by task:

| Task | Load these files |
|---|---|
| New contract from scratch | SKILL.md and SKILL-TEMPLATES.md |
| Debugging or reviewing a contract | SKILL.md and SKILL-REFERENCE.md |
| Writing tests | SKILL-TESTING.md |
| Full workflow from contract to deployment | All four skill files |

See [USAGE.md](USAGE.md) for tested example prompts, agent-specific instructions for Claude Code, Cursor, and Windsurf, a list of every mistake the skill prevents, and how to verify the agent output.

---

## Requirements

- Node.js v20 or higher
- pnpm v8 or higher
- Git

---

## License

BSD-3-Clause-Clear. See [LICENSE](LICENSE).

---

## Resources

- Zama Protocol docs: https://docs.zama.org/protocol
- FHEVM Solidity: https://github.com/zama-ai/fhevm
- Zama Discord: https://discord.com/invite/zama
- Developer Program: https://www.zama.ai/developer-program
