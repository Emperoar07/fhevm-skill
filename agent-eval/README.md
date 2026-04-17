# Agent Eval Pack

This folder turns the skill into a measurable benchmark instead of a documentation-only artifact.

Use it to evaluate whether an AI coding agent can go from a natural-language prompt to correct FHEVM output while using this repo's skill files.

## What This Proves

The benchmark pack is designed to answer the challenge's hardest scoring question:

"Does the skill help a real agent produce correct, working FHEVM code?"

Each evaluation run captures:

- the exact prompt given to the agent
- which skill files were loaded
- what files the agent generated or changed
- whether the output compiled
- whether tests passed
- whether deployment succeeded
- which common FHEVM mistakes the skill helped prevent
- a reusable score sheet in `agent-eval/results/` when the run is worth preserving

## Benchmarks

The canonical prompts live in `agent-eval/prompts/`.

| Prompt ID | Scenario | Primary proof target |
|---|---|---|
| `EVAL-001` | Confidential voting | Encrypted bool input, `FHE.select`, owner reveal |
| `EVAL-002` | Sealed-bid auction | Encrypted uint bids, highest bid tracking, `eaddress` |
| `EVAL-003` | Confidential salary | Multi-user encrypted aggregation, owner-only total |
| `EVAL-004` | ERC-7984 token flow | Confidential token patterns, transfers, wrapping mindset |
| `EVAL-005` | Public decryption verifier | `makePubliclyDecryptable`, proof verification, handle ordering |

## How To Run An Evaluation

1. Choose one benchmark prompt from `agent-eval/prompts/`.
2. Open your AI coding tool.
3. Load the skill files named in the prompt.
4. Paste the prompt exactly as written.
5. Let the agent generate code without manually patching correctness gaps first.
6. Run the validation commands listed in `agent-eval/results-template.md`.
7. Record the outcome in a copy of `agent-eval/results-template.md`.

## Success Standard

An evaluation run is considered strong when:

- generated code compiles without manual rescue edits
- tests pass or fail only for clearly stated environmental reasons
- the agent uses the documented FHEVM patterns correctly
- the output avoids common anti-patterns already called out in the skill
- the generated code is close enough to ship that a developer would trust it

## Confidence And Truthfulness

Do not over-score the skill.

If an output works only after substantial manual correction, record that honestly.
The goal of this pack is not to make the repo look perfect. The goal is to show that the skill improves agent reliability in a repeatable, evidence-backed way.

## Suggested Submission Use

For the bounty submission:

- run at least 3 benchmark prompts end to end
- include 1 benchmark in the demo video
- link the completed score sheets in the repository root README or submission notes

This creates a clean bridge between the written skill and observed agent performance.

## Golden Reference

A completed sample score sheet using the current repo as the reference implementation lives at:

- `agent-eval/results/EVAL-001-confidential-voting-golden.md`
- `agent-eval/results/EVAL-005-public-decryption-golden.md`
