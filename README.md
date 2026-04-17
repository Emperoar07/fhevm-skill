# FHEVM Agent Skill

**Zama Developer Program Season 2 Bounty Submission**

A production ready AI coding skill that helps agents such as Claude Code, Cursor, and Windsurf write, test, and deploy confidential smart contracts with the Zama Protocol and FHEVM.

Point an AI coding agent at the skill files in this repository and it can move from a plain English request to a working, tested, deployable FHEVM contract without guessing APIs or repeating common mistakes.

**Live demo:** [fhevm-skill.vercel.app](https://fhevm-skill.vercel.app), FHE Counter on Sepolia with MetaMask support

## What This Is

FHEVM lets smart contracts compute over encrypted data. The model is powerful, but unfamiliar to most agents: encrypted types, ACL grants on every handle, no plaintext conditionals, async decryption, and HCU limits. Without guidance, agents often produce code that compiles yet fails in tests or breaks during deployment.

This repository solves that problem. It packages the core knowledge, examples, guardrails, and workflows an agent needs before it writes any FHEVM code.

**Cold start proof:** the `ConfidentialSalary` contract was produced from a single prompt after loading `SKILL.md`, and all 10 tests passed on the first attempt without rescue edits.

**Agent evaluation pack:** benchmark prompts, rubrics, and score sheets live in [agent-eval/README.md](agent-eval/README.md), so skill quality can be measured with repeatable tasks instead of described only in prose.

## Skill File System

The skill is split across four primary files. Agents can load the full set, or just the parts needed for the task at hand.

| File | Purpose |
|---|---|
| [SKILL.md](SKILL.md) | Master overview, mental model, end to end workflow, and complete examples |
| [SKILL-REFERENCE.md](SKILL-REFERENCE.md) | API reference for encrypted types, FHE operations, ACL patterns, HCU notes, and deployment details |
| [SKILL-TEMPLATES.md](SKILL-TEMPLATES.md) | Reusable contract templates with TODO markers for new builds |
| [SKILL-TESTING.md](SKILL-TESTING.md) | Hardhat test patterns, encrypted input helpers, decryption assertions, debugging guidance, and CI notes |

Supporting material:

| File | Purpose |
|---|---|
| [USAGE.md](USAGE.md) | Step by step guide for using the skill with AI coding agents |
| [VERSIONS.md](VERSIONS.md) | Exact package versions validated by the repo |
| [CHANGELOG.md](CHANGELOG.md) | Version history and skill evolution log |
| [KNOWN_GAPS.md](KNOWN_GAPS.md) | Open gaps and recently closed validation items |
| [FEEDBACK.md](FEEDBACK.md) | How to report a missing pattern or incorrect output |
| [agent-eval/README.md](agent-eval/README.md) | Benchmark pack for measuring real agent performance |

## Test Results

### Local mock mode

```text
  ConfidentialLeaderboard    6 passing
  ConfidentialSalary        10 passing
  ConfidentialVoting         7 passing
  FHECounter                 2 passing
  SealedBidAuction           5 passing
  Euint256OpsProof           4 passing
  FHECounterSepolia                    1 pending  (Sepolia only, skipped locally)
  ConfidentialTokenSepolia             3 pending  (Sepolia only, skipped locally)
  ConfidentialVotingSepolia            3 pending  (Sepolia only, skipped locally)
  SealedBidAuctionSepolia              3 pending  (Sepolia only, skipped locally)
  ConfidentialLeaderboardSepolia       3 pending  (Sepolia only, skipped locally)
  ConfidentialSalarySepolia            3 pending  (Sepolia only, skipped locally)
  PublicDecryptionVerifierSepolia      1 pending  (Sepolia only, skipped locally)

  34 passing
  17 pending
```

### Live Sepolia testnet

```text
  FHECounterSepolia          1 passing  (81s)
  ConfidentialTokenSepolia   3 passing  (2m)
    mint then decrypt balance
    confidential transfer then decrypt both balances
    confidential burn reduces balance
  ConfidentialVotingSepolia  3 passing  (26s)
    cast YES vote and verify hasVoted flag
    two YES votes and one NO vote, tally is correct
    double vote is rejected
  SealedBidAuctionSepolia    3 passing  (3m)
    alice places encrypted bid and decrypts her own bid
    multiple bidders, highest bid tracked via FHE.select
    non owner cannot settle auction
  ConfidentialLeaderboardSepolia  3 passing  (3m)
    submit score and decrypt personal best
    personal best updates on higher score, FHE.select confirmed
    multiple players, each decrypts their own personal best
  ConfidentialSalarySepolia  3 passing  (24s)
    employee submits encrypted salary and decrypts own value
    owner decrypts encrypted aggregate total after multiple submissions
    double submission is rejected
  PublicDecryptionVerifierSepolia  1 passing  (GAP 002 closure)
    stores 3 encrypted values, marks public, gets proof, verifies 3 handle checkSignatures
```

All core FHEVM patterns are validated end to end on Sepolia against the live Zama relayer: encrypted input generation, on chain FHE operations, ACL enforcement, user decryption through the relayer, confidential burn, `FHE.select` with `ebool` and `euint64`, `eaddress` tracking, multi user aggregation, access control, and 3 handle public decryption with `FHE.checkSignatures`.

## Contracts

Seven contracts cover the main FHEVM patterns used by agent generated applications.

| Contract | Patterns demonstrated | Sepolia validated | Sepolia address |
|---|---|---|---|
| `FHECounter` | Base counter flow from Zama, encrypted increment and decrement | Yes | [0x23f51eAa](https://sepolia.etherscan.io/address/0x23f51eAa3274c4051D9B0c28143778f8DfAa10CE) |
| `ConfidentialToken` | Encrypted balances, confidential transfer, approve, and burn with ACL | Yes | [0xdf92f544](https://sepolia.etherscan.io/address/0xdf92f54401406571DF0D3538ebb8eFE39Eb45512) |
| `ConfidentialVoting` | Encrypted bool inputs, `FHE.select` tallying, owner reveal after deadline | Yes | [0x022DAb10](https://sepolia.etherscan.io/address/0x022DAb103EDb3B4815677C83a20E9e80AE9ea926) |
| `SealedBidAuction` | Encrypted `uint64` bids, highest bid tracking, `eaddress` winner storage | Yes | [0x4061C54E](https://sepolia.etherscan.io/address/0x4061C54E999ADf0B4A12111435E1Cf4c317Af079) |
| `ConfidentialLeaderboard` | Personal best flow with `FHE.isInitialized`, global top score, multi user state | Yes | [0x10166D8f](https://sepolia.etherscan.io/address/0x10166D8f3C64B6478Fc1806AAd57802FBF213f0C) |
| `ConfidentialSalary` | Per user encrypted values, encrypted running total, owner only aggregate read | Yes | [0x0D739C65](https://sepolia.etherscan.io/address/0x0D739C65459a2E1F54e4fe56bD0fa5c93633151b) |
| `PublicDecryptionVerifier` | 3 handle public decryption, `FHE.makePubliclyDecryptable`, `FHE.checkSignatures` proof verification | Yes | [0x72B0BBB2](https://sepolia.etherscan.io/address/0x72B0BBB2172FcAAaF01e052C81C8B9638686047D) |

## How To Run Tests

### Local mock mode

```bash
git clone https://github.com/Emperoar07/fhevm-skill
cd fhevm-skill
pnpm install
pnpm test
```

Expected output: `34 passing, 17 pending`

### Live Sepolia testnet

```bash
cd packages/hardhat
npx hardhat vars set MNEMONIC
npx hardhat vars set INFURA_API_KEY
npx hardhat deploy --network sepolia
npx hardhat test test/FHECounterSepolia.ts --network sepolia
npx hardhat deploy --network sepolia --tags ConfidentialToken
npx hardhat test test/ConfidentialTokenSepolia.ts --network sepolia
```

This flow requires a wallet funded with Sepolia ETH.

## Auto Evolve System

The skill keeps learning through three input channels so it can keep pace with Zama and the wider ecosystem.

1. Usage failures  
Developers can run `pnpm report-gap` or file a GitHub issue with the `skill-gap` label. The workflow records the issue in `KNOWN_GAPS.md` and alerts maintainers.

2. Upstream package changes  
The `skill-watch-deps.yml` workflow checks npm each week for updates to `@fhevm/solidity`, `@zama-fhe/relayer-sdk`, `@fhevm/hardhat-plugin`, and `@openzeppelin/confidential-contracts`. When a version changes, it opens a `skill-gap` issue and refreshes `VERSIONS.md`.

3. Documentation changes  
The `skill-watch-docs.yml` workflow snapshots key Zama documentation pages, detects content changes, and opens a targeted issue naming the affected skill files.

All workflows live in [.github/workflows/](.github/workflows/).

## Reporting A Gap

If the skill guides an agent toward incorrect or incomplete code, run:

```bash
pnpm report-gap
```

That command opens a prefilled GitHub issue in the browser. The report is then recorded in `KNOWN_GAPS.md` and surfaced to maintainers.

## Project Structure

```text
fhevm-skill/
  SKILL.md                      Master skill overview
  SKILL-REFERENCE.md            API reference
  SKILL-TEMPLATES.md            Contract templates
  SKILL-TESTING.md              Test guide
  USAGE.md                      Agent usage guide
  VERSIONS.md                   Package version tracker
  CHANGELOG.md                  Version history
  KNOWN_GAPS.md                 Open and resolved gaps
  FEEDBACK.md                   Gap reporting guide
  agent-eval/                   Benchmark prompts and score sheets
  packages/
    hardhat/
      contracts/                Confidential contract examples
      test/                     Mock and Sepolia validation suites
      deploy/                   Hardhat deploy scripts
    nextjs/                     Scaffold ETH frontend
    fhevm-sdk/                  FHEVM SDK package
  scripts/
    report-gap.js               CLI gap reporter
  .github/
    workflows/                  CI, evolution, and watcher workflows
    doc-snapshots/              Stored Zama docs hashes
    ISSUE_TEMPLATE/             Structured gap reporting template
```

## How To Use The Skill

Point your AI coding agent at the skill files, then describe the application you want to build.

### Claude Code

```text
Read SKILL.md, SKILL-REFERENCE.md, SKILL-TEMPLATES.md, and SKILL-TESTING.md
from this repo. Build a confidential voting contract where users cast encrypted
yes or no votes and the owner reveals the tally after a deadline. Include full tests.
```

### Cursor Or Windsurf

Add the relevant skill files to context, then prompt:

```text
Read SKILL.md and SKILL-TEMPLATES.md.
Build a sealed bid auction where bids are encrypted and the highest bidder
is tracked using FHE.select. Include Hardhat tests.
```

### Which Files To Load

| Task | Load these files |
|---|---|
| New contract from scratch | `SKILL.md` and `SKILL-TEMPLATES.md` |
| Contract review or debugging | `SKILL.md` and `SKILL-REFERENCE.md` |
| Test writing | `SKILL-TESTING.md` |
| Full workflow from contract through deployment | all four primary skill files |

### What The Skill Prevents

Without the skill, agents often:

1. Miss `FHE.allowThis`, so the contract cannot reuse its own handles in the next transaction.
2. Use plaintext conditionals such as `if (encryptedValue > 0)`, which do not compile for encrypted types.
3. Forget `FHE.allow(handle, user)`, so users cannot decrypt their own values.
4. Misorder handles in `FHE.checkSignatures`, which breaks proof verification.
5. Call `FHE.decrypt()` in view functions, even though decryption is asynchronous.

The skill calls out each of these with correct patterns and examples.

Full usage guidance is in [USAGE.md](USAGE.md).

## Requirements

1. Node.js v20 or higher
2. pnpm v8 or higher
3. Git

## License

BSD 3 Clause Clear. See [LICENSE](LICENSE).

## Resources

1. Zama Protocol docs: https://docs.zama.org/protocol
2. FHEVM Solidity: https://github.com/zama-ai/fhevm
3. Zama Discord: https://discord.com/invite/zama
4. Developer Program: https://www.zama.ai/developer-program
