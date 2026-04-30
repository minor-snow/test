# P28-0 Local Governance Smoke

## Scenario

Simulated a fresh alpha repo using `pantheon-alpha` on top of the fixture repository:

1. `init --no-github`
2. `doctor`
3. `repair intake`
4. `repair plan`
5. `repair check`
6. `review list`
7. `metrics daily`

Repo:

`data/dogfood/p28_0_local_governance/alpha_repo`

Repair session:

`repair_1b8916b06a0c`

## Result

- `pantheon-alpha doctor` reported `Agent-usable repo: yes`
- `pantheon-alpha repair check` returned `requires_review`
- `.pantheon/governance/events.jsonl` recorded:
  - `repair_plan_generated`
  - `repair_check_completed`
  - `review_requested`
- `.pantheon/reviews/review_queue.json` opened one review request
- `.pantheon/metrics/daily/2026-04-29.md` summarized one local repair check and one open review request

## Notable output

Changed file:

- `src/auth/login.ts`

Verdict details from `repair_check.json`:

- `verdict: requires_review`
- `bucket_counts.review_required: 1`
- `warnings: 1`
- `recommended human attention: review request opened`

## What this smoke proves

1. `pantheon-alpha` command surface is executable end to end.
2. Local governance events are written automatically from repair flow commands.
3. Human attention is materialized into a review request and queue entry.
4. Daily metrics are generated locally without any cloud service.
