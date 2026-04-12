# Feedback — FHEVM Agent Skill

Use this file to report gaps, errors, or missing patterns you discovered while using the skill.
Every report directly improves the skill for future developers and AI agents.

---

## How to submit feedback

1. Copy the template below
2. Fill in all fields — the more detail the better
3. Submit as a GitHub issue or PR to this repository, OR email developer@zama.org with subject
   `SKILL feedback: <short title>`

---

## Report Template

```markdown
### [SHORT TITLE]

**Date discovered:** YYYY-MM-DD  
**Skill version used:** (check SKILL.md metadata table)  
**AI agent used:** Claude Code / Cursor / Windsurf / other  

**Prompt given to agent:**
> (paste the exact prompt you gave the agent)

**Code the agent generated:**
\`\`\`solidity
// paste the generated code here
\`\`\`

**What went wrong:**
(compile error / test failure / wrong behavior / missing pattern)

**Error message (if any):**
\`\`\`
paste error here
\`\`\`

**What the correct code should look like:**
\`\`\`solidity
// paste the correct version here if you know it
\`\`\`

**Which section of SKILL.md should be updated:**
(e.g. "Section 6 — ACL", "Section 8 — Decryption Patterns", "new section needed")

**Suggested fix (optional):**
(describe what you think should change in the skill)
```

---

## Submitted Reports

### [REPORT-001] — Missing owner ACL for tally reads

**Date discovered:** 2026-04-12  
**Skill version used:** 1.1.0  
**AI agent used:** Claude Code  

**Prompt given to agent:**
> Build a confidential voting contract where users cast encrypted yes/no votes and the owner can reveal the tally

**What went wrong:**
Test failure — `userDecryptEuint` rejected the owner address:
```
Error: User 0xf39F... is not authorized to user decrypt handle 0x48017e...
```

**Root cause:**
The contract called `FHE.allowThis(_yesCount)` after every `add()` but never called
`FHE.allow(_yesCount, owner)`. The skill documented `allowThis` but did not make clear
that admin/owner addresses need their own explicit `FHE.allow` grant.

**Fix applied in:** v1.3.0 — Added "Also applies to admin/owner roles" note to Golden Rule of ACL.

---

### [REPORT-002] — Missing `euint8` import for intermediate type

**Date discovered:** 2026-04-12  
**Skill version used:** 1.1.0  
**AI agent used:** Claude Code  

**What went wrong:**
Compile error — `euint8` used in `FHE.asEuint8(ERR_NONE)` but not listed in the import statement.
The agent imported only the types used as function parameters, not types used as intermediate values.

**Fix applied in:** v1.3.0 — Added explicit import rule to cheatsheet.

---

## What makes a good report

- **Exact prompt** — so we can reproduce the agent's behavior
- **Exact error** — compile errors and test failures have different root causes
- **Skill version** — so we know if it's already fixed in a newer version
- **Which agent** — different agents parse skill files differently; the fix may be agent-specific

Even a one-line note ("agent forgot FHE.allowThis after FHE.select in a loop") is useful.
The goal is: same mistake never happens twice.
