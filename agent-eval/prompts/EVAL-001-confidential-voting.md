# EVAL-001 Confidential Voting

## Load These Skill Files

- `SKILL.md`
- `SKILL-REFERENCE.md`
- `SKILL-TEMPLATES.md`
- `SKILL-TESTING.md`

## Prompt

```text
Read SKILL.md, SKILL-REFERENCE.md, SKILL-TEMPLATES.md, and SKILL-TESTING.md from this repository before writing code.

Build a confidential voting contract using Zama FHEVM where users cast encrypted yes/no votes, cannot vote twice, and the owner can request a public reveal after the deadline.

Requirements:
- Solidity contract in the Hardhat package
- Full Hardhat tests for local mock mode
- Use the correct encrypted bool input flow
- Use FHE.select instead of plaintext branching on encrypted values
- Apply the right ACL grants after every encrypted mutation
- Include a deploy script if one does not already exist

Do not invent new APIs. Follow the skill files exactly.
```

## Expected Evidence

- Correct use of encrypted boolean input
- Correct tally tracking via `FHE.select`
- Double-vote prevention
- Owner-only reveal request
- Passing local tests without manual FHEVM rescue edits
