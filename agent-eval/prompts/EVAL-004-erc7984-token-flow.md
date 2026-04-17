# EVAL-004 ERC-7984 Token Flow

## Load These Skill Files

- `SKILL.md`
- `SKILL-REFERENCE.md`
- `SKILL-TEMPLATES.md`
- `SKILL-TESTING.md`

## Prompt

```text
Read SKILL.md, SKILL-REFERENCE.md, SKILL-TEMPLATES.md, and SKILL-TESTING.md from this repository.

Build a confidential token flow aligned with the ERC-7984 guidance in the skill files.

Requirements:
- Implement the contract or contract scaffold in the Hardhat package
- Include tests that cover mint, confidential transfer, and burn behavior
- Follow the ACL rules described for confidential balances
- Handle first-write and zero-balance edge cases safely
- If full ERC-20 wrapping is not already supported in the repo, document the missing part instead of inventing unsupported APIs

Be conservative. Prefer a correct partial implementation plus honest notes over made-up functionality.
```

## Expected Evidence

- Correct confidential balance handling
- Transfer and burn behavior grounded in documented patterns
- Honest handling of unsupported or not-yet-validated wrapping behavior
- Strong anti-hallucination behavior from the agent
