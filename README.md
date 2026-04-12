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
| [CHANGELOG.md](CHANGELOG.md) | Full version history from v1.1.0 to v1.7.0. |
| [KNOWN_GAPS.md](KNOWN_GAPS.md) | Open gaps and patterns still under validation. |
| [FEEDBACK.md](FEEDBACK.md) | How to report a gap or suggest an improvement. |

---

## Test Results

### Local mock mode (32/32)

```
  ConfidentialLeaderboard    6 passing
  ConfidentialSalary        10 passing
  ConfidentialVoting         7 passing
  FHECounter                 2 passing
  SealedBidAuction           5 passing
  FHECounterSepolia          1 pending  (Sepolia only — skipped locally)
  ConfidentialTokenSepolia   3 pending  (Sepolia only — skipped locally)

  32 passing
   4 pending
```

### Live Sepolia testnet (10/10)

```
  FHECounterSepolia          1 passing  (81s)
  ConfidentialTokenSepolia   3 passing  (2m)
    mint then decrypt balance
    confidential transfer then decrypt both balances
    confidential burn reduces balance
  ConfidentialVotingSepolia  3 passing  (26s)
    cast YES vote and verify hasVoted flag
    two YES votes and one NO vote — tally is correct
    double vote is rejected
  SealedBidAuctionSepolia    3 passing  (3m)
    alice places encrypted bid and decrypts her own bid
    multiple bidders — highest bid tracked via FHE.select
    non-owner cannot settle auction
```

All core FHEVM patterns validated end-to-end on Sepolia against the live Zama relayer:
encrypted input generation, FHE operations on-chain, ACL enforcement, user decryption via relayer,
confidential burn, FHE.select with ebool and euint64, eaddress tracking, multi-user aggregation, and access control.

---

## Contracts

Six contracts covering the full range of FHEVM patterns:

| Contract | Patterns demonstrated | Sepolia validated | Sepolia address |
|---|---|---|---|
| `ConfidentialToken` | Encrypted balances, confidential transfer, approve, burn with ACL | Yes | [0xdf92f544](https://sepolia.etherscan.io/address/0xdf92f54401406571DF0D3538ebb8eFE39Eb45512) |
| `ConfidentialVoting` | Encrypted bool inputs, FHE.select for vote tallying, owner reveals after deadline | Yes | [0x022DAb10](https://sepolia.etherscan.io/address/0x022DAb103EDb3B4815677C83a20E9e80AE9ea926) |
| `SealedBidAuction` | Encrypted uint64 bids, FHE.select for highest bid tracking, eaddress for winner | Yes | [0x4061C54E](https://sepolia.etherscan.io/address/0x4061C54E999ADf0B4A12111435E1Cf4c317Af079) |
| `ConfidentialLeaderboard` | Personal best with FHE.isInitialized, global top score, multi-user aggregation | Yes | [0x10166D8f](https://sepolia.etherscan.io/address/0x10166D8f3C64B6478Fc1806AAd57802FBF213f0C) |
| `ConfidentialSalary` | Per-user encrypted values, encrypted running total, owner-only aggregate read | No | — |
| `FHECounter` | Base template from Zama, increment and decrement encrypted counter | Yes | [0x23f51eAa](https://sepolia.etherscan.io/address/0x23f51eAa3274c4051D9B0c28143778f8DfAa10CE) |

---

## How to Run Tests

### Local mock mode (no wallet needed)

```bash
git clone https://github.com/Emperoar07/fhevm-skill
cd fhevm-skill
pnpm install
pnpm test
```

Expected output: `32 passing, 4 pending`

### Live Sepolia testnet

```bash
cd packages/hardhat
npx hardhat vars set MNEMONIC       # your 12-word seed phrase
npx hardhat vars set INFURA_API_KEY # your Infura project key
npx hardhat deploy --network sepolia
npx hardhat test test/FHECounterSepolia.ts --network sepolia
npx hardhat deploy --network sepolia --tags ConfidentialToken
npx hardhat test test/ConfidentialTokenSepolia.ts --network sepolia
```

Requires a wallet funded with Sepolia ETH (get from any Sepolia faucet).

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
fhevm-skill/
  SKILL.md                      Master skill overview (v1.7.0)
  SKILL-REFERENCE.md            API reference
  SKILL-TEMPLATES.md            Contract templates (7 templates)
  SKILL-TESTING.md              Test guide
  USAGE.md                      How to use the skill with any agent
  VERSIONS.md                   Package version tracker (auto-updated weekly)
  CHANGELOG.md                  Version history (v1.1.0 to v1.7.0)
  KNOWN_GAPS.md                 Open gaps and resolved gaps
  FEEDBACK.md                   Gap reporting guide
  packages/
    hardhat/
      contracts/                Six confidential contracts
      test/                     Eight test files (32 mock + 4 Sepolia)
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
    doc-snapshots/              Hashes of watched Zama docs pages
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
