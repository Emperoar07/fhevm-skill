# How to Use the FHEVM Agent Skill

This guide explains how developers use the skill files to get AI agents to produce correct FHEVM code. It covers four workflows: building a new contract, debugging an existing one, writing tests, and deploying.

---

## The Core Idea

AI agents do not know FHEVM well. The API is specific: encrypted types need ACL grants after every mutation, branching uses FHE.select instead of if statements, decryption is asynchronous and off-chain, and every function parameter that receives user input needs a ZKPoK proof validated via FHE.fromExternal. Without guidance, agents produce code that compiles but fails tests, or produces subtly wrong logic that is hard to debug.

The skill files give the agent a complete, accurate picture of the FHEVM API before it writes a single line. The result is working code on the first attempt.

---

## Quick Start

### Step 1: Clone the repo

```bash
git clone https://github.com/Emperoar07/fhevm-skill-demo
cd fhevm-skill-demo
```

### Step 2: Open your agent

Open Claude Code, Cursor, Windsurf, or any other AI coding agent in this directory.

### Step 3: Give the agent a prompt

Tell the agent which skill files to read, then describe what you want to build:

```
Read SKILL.md and SKILL-TEMPLATES.md in this repo.

Build a confidential salary survey contract where:
- Employees submit their encrypted salary once
- The owner can read an encrypted aggregate total
- No one can see anyone else's salary
- The owner can close the survey and request a public reveal

Include a full Hardhat test suite.
```

The agent reads the skill files, understands the FHEVM API, and writes the contract and tests. All tests pass on the first run.

---

## Which Files to Load for Each Task

You do not always need to load all four skill files. Loading only what is relevant keeps the agent focused.

### Building a new contract from scratch

Load these two files:

```
Read SKILL.md and SKILL-TEMPLATES.md, then build me [your contract description].
```

SKILL.md gives the mental model and all patterns. SKILL-TEMPLATES.md gives a starting point so the agent does not write from a blank page.

### Reviewing or extending an existing contract

Load the reference:

```
Read SKILL.md and SKILL-REFERENCE.md. Here is my existing contract: [paste contract].
Review it for missing ACL grants, incorrect FHE.select usage, and HCU concerns.
```

SKILL-REFERENCE.md has the complete ACL function list, operation costs, and every type so the agent can spot issues precisely.

### Writing tests for a contract

Load the testing guide:

```
Read SKILL-TESTING.md. Here is my contract: [paste contract].
Write a full Hardhat test suite covering the happy path, access controls, double submit prevention, and the aggregate total.
```

SKILL-TESTING.md has the exact fhevm.createEncryptedInput and fhevm.userDecryptEuint call signatures, common failure messages and their fixes, and a test coverage checklist.

### Debugging a failing test

Load both reference files:

```
Read SKILL.md and SKILL-TESTING.md. My test is failing with this error:

  Error: User 0xf39F... is not authorized to user decrypt handle 0x...

Here is my contract: [paste contract]
Here is my test: [paste test]

What is wrong and how do I fix it?
```

The agent will identify the missing FHE.allow call immediately because the skill files document this as the most common failure with its exact error message.

### Deploying to Sepolia

Load the master file:

```
Read SKILL.md. Walk me through deploying my ConfidentialVoting contract to Sepolia
and connecting it to the NextJS frontend.
```

SKILL.md Section 11d has the step-by-step deployment walkthrough, the environment variable checklist, and the error table for the five most common deployment failures.

---

## Example Prompts That Work Well

These prompts have been tested and produce working code on the first attempt when the skill is loaded.

**Confidential token:**
```
Read SKILL.md and SKILL-TEMPLATES.md.
Build a confidential ERC20-style token where balances are encrypted.
Transfer amounts should be hidden. Include mint (owner only) and transfer functions.
Write a test suite with at least 5 tests.
```

**Sealed bid auction:**
```
Read SKILL.md and SKILL-TEMPLATES.md.
Build a sealed bid auction where bidders submit encrypted bids.
The highest bidder is tracked using FHE.select with no plaintext comparison.
After the auction ends the owner can request a public reveal of the winner and winning amount.
Write tests covering multiple bidders and the reveal flow.
```

**Confidential voting:**
```
Read SKILL.md and SKILL-REFERENCE.md.
Build a confidential voting contract where:
- Users cast encrypted yes or no votes
- Double voting is prevented
- A deadline closes the vote
- The owner can request a tally reveal after the deadline
Test that the tally is correct after 2 yes votes and 1 no vote.
```

**Leaderboard with personal best:**
```
Read SKILL.md and SKILL-TEMPLATES.md.
Build a confidential leaderboard where players submit encrypted scores.
Each player has an encrypted personal best that only they can decrypt.
The contract also tracks a global top score that the owner can reveal.
Use FHE.isInitialized to detect a player's first submission.
```

---

## Loading Skill Files in Different Agents

### Claude Code

Use the at-mention syntax to attach files:

```
@SKILL.md @SKILL-TEMPLATES.md Build me a confidential prediction market...
```

Or ask Claude to read them:

```
Read the files SKILL.md and SKILL-TEMPLATES.md in this repo, then build...
```

### Cursor

Add the skill files to your context using the @ file picker in the chat sidebar, then type your prompt.

### Windsurf

Open the skill files in the editor before starting a Cascade session. They will be in the agent's context window.

### Any agent with file access

The simplest universal approach is to paste the relevant skill file content directly into the prompt, or ask the agent to read the files by path.

---

## What the Agent Will Get Right Because of the Skill

Without the skill, agents make these mistakes consistently. With the skill loaded, all of them are prevented.

**Missing ACL grants.** After every FHE.add, FHE.select, or FHE.sub the handle changes. Without re-granting FHE.allowThis and FHE.allow, future transactions cannot use the value and users cannot decrypt. The skill documents this as the golden rule with a code example showing wrong and correct side by side.

**Owner cannot decrypt.** FHE.allowThis grants access to the contract, not the owner address. Without an explicit FHE.allow(handle, owner()) the owner gets an authorization error when trying to read tallies or totals. The skill has a red critical callout for this specific mistake.

**Using if on an encrypted bool.** Agents trained on regular Solidity want to write if (FHE.gt(a, b)). This does not compile or produces wrong results. The skill shows FHE.select as the only way to branch on encrypted conditions.

**Storing externalEuint64 directly.** Agents sometimes skip FHE.fromExternal and try to use the external parameter value directly. The skill shows that fromExternal is mandatory and validates the zero-knowledge proof.

**Wrong import list.** If a contract uses euint8 only as an intermediate type inside FHE.asEuint8(), agents sometimes omit it from the import. The skill has an explicit rule: import every type you use, even intermediates.

**Handle order in checkSignatures.** The decryption proof is bound to the exact order of handles in the publicDecrypt call. Swapping the order causes a silent revert. The skill has a red critical callout with a wrong and correct example.

---

## Verifying the Output

After the agent generates a contract and tests, run:

```bash
pnpm compile
pnpm test
```

A correctly generated contract produces `32 passing, 1 pending` (the Sepolia test is always pending locally).

If a test fails with `User ... is not authorized to user decrypt handle`, the contract is missing an FHE.allow call. Ask the agent:

```
Read SKILL.md Section 6. My test is failing with this authorization error: [paste error].
Fix the missing ACL grant in the contract.
```

---

## Reporting a Gap

If the skill guides an agent to produce wrong code, report it so it can be fixed:

```bash
pnpm report-gap
```

This opens a pre-filled GitHub Issue. The issue is automatically logged to KNOWN_GAPS.md. See FEEDBACK.md for the manual reporting template.

Every report makes the skill more accurate for every future developer using it.
