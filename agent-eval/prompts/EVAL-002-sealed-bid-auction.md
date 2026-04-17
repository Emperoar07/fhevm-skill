# EVAL-002 Sealed Bid Auction

## Load These Skill Files

- `SKILL.md`
- `SKILL-REFERENCE.md`
- `SKILL-TEMPLATES.md`
- `SKILL-TESTING.md`

## Prompt

```text
Read SKILL.md, SKILL-REFERENCE.md, SKILL-TEMPLATES.md, and SKILL-TESTING.md from this repository.

Build a sealed-bid auction with Zama FHEVM where bids are encrypted, the highest bid is tracked on-chain without revealing plaintext, and the current winner is stored as an encrypted address.

Requirements:
- Solidity contract in packages/hardhat/contracts
- Hardhat tests in mock mode
- Use euint64 for bids
- Use eaddress for the current winner
- Use FHE.select for encrypted branching
- Ensure bidders can decrypt their own bid handles
- Ensure the owner can request settlement/reveal after the auction ends

Stay inside the APIs and patterns documented by the skill files.
```

## Expected Evidence

- Correct bid ingestion via `fromExternal`
- Highest bid and winner tracked through encrypted branching
- ACL grants for bidder and owner flows
- Passing local tests
