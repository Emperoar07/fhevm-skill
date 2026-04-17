# Agent Eval Rubric

Use this rubric when scoring a benchmark run.

## Scoring Categories

Score each category from `0` to `2`.

| Category | 0 | 1 | 2 |
|---|---|---|---|
| Prompt understanding | Misses the requested product entirely | Gets the general shape right but misses key requirements | Correctly understands the requested app and constraints |
| FHEVM contract correctness | Core FHEVM patterns are wrong or unsafe | Mostly correct but with one meaningful gap | Correct encrypted types, ACL, branching, and decryption patterns |
| Test quality | No tests or unusable tests | Partial tests with missing coverage | Useful tests that validate the core behavior |
| Deployment readiness | Cannot deploy as generated | Deployable with small fixes | Deploy-ready with clear scripts/config assumptions |
| Frontend/client integration | Missing or wrong integration path | Partial or narrow integration | Correct relayer or client-side flow for the requested task |
| Anti-pattern avoidance | Hits multiple known mistakes | Avoids most mistakes but slips on one | Clearly avoids the skill's documented anti-patterns |
| Autonomy | Needs major human rescue | Needs a few corrections | Produces high-quality output with minimal intervention |

## Total Score

- `12-14`: submission-grade benchmark result
- `9-11`: strong but still needs polish
- `6-8`: partially effective skill guidance
- `0-5`: benchmark failure

## Mandatory Notes

Every scored run should also include:

- what the agent got right because of the skill
- what still required human correction
- whether the failure was a skill gap, environment issue, or agent limitation

The notes matter as much as the score, because they tell maintainers what the skill should learn next.
