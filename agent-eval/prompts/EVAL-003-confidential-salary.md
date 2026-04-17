# EVAL-003 Confidential Salary

## Load These Skill Files

- `SKILL.md`
- `SKILL-REFERENCE.md`
- `SKILL-TEMPLATES.md`
- `SKILL-TESTING.md`

## Prompt

```text
Read SKILL.md, SKILL-REFERENCE.md, SKILL-TEMPLATES.md, and SKILL-TESTING.md before writing code.

Build a confidential salary survey contract where employees submit encrypted salaries once, can decrypt their own submission, and the owner can read only the encrypted aggregate total.

Requirements:
- Solidity contract plus full Hardhat tests
- Block duplicate submissions
- Track a running encrypted total
- Give employees access to decrypt their own stored salary
- Give the owner access to decrypt the aggregate only
- Add a close-survey flow and reveal request if needed

Use only the patterns documented in the skill. Avoid undocumented shortcuts.
```

## Expected Evidence

- Multi-user encrypted aggregation
- Proper owner versus user ACL separation
- Double-submit protection
- Passing local tests
