# EVAL-005 Public Decryption Verifier

## Load These Skill Files

- `SKILL.md`
- `SKILL-REFERENCE.md`
- `SKILL-TEMPLATES.md`
- `SKILL-TESTING.md`

## Prompt

```text
Read SKILL.md, SKILL-REFERENCE.md, SKILL-TEMPLATES.md, and SKILL-TESTING.md from this repository before writing code.

Build a Zama FHEVM contract and test flow that stores multiple encrypted values, marks them publicly decryptable, obtains a public decryption proof off-chain, and verifies that proof on-chain with FHE.checkSignatures.

Requirements:
- Support at least 3 handles in one proof verification flow
- Preserve handle ordering correctly between publicDecrypt and checkSignatures
- Include tests or a clearly documented Sepolia-only validation path if mock mode cannot fully prove the flow
- Do not simplify away the proof verification step

Follow the repo's validated public decryption patterns and be explicit about any environment limitations.
```

## Expected Evidence

- Correct multi-handle public decryption shape
- Correct handle ordering discipline
- Honest distinction between local limits and Sepolia validation
