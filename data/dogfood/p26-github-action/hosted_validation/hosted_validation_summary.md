# P26 Hosted GitHub Validation

This evidence package captures the final release validation for the Pantheon GitHub PR Boundary Gate on real GitHub-hosted Actions runs.

## Hosted Findings

### Release PR blocking path

- PR: [#1](https://github.com/minor-snow/pantheon/pull/1)
- Workflow run: [25051242771](https://github.com/minor-snow/pantheon/actions/runs/25051242771)
- Comment: [github-actions[bot] review](https://github.com/minor-snow/pantheon/pull/1#issuecomment-4334960954)
- Workflow conclusion: `failure`
- Pantheon verdict: `requires_reverse_issue`
- Outcome:
  - PR comment posted successfully
  - `pantheon-report/` artifact uploaded successfully
  - blocking finding rendered correctly on a real hosted PR
- Interpretation:
  - This release-validation PR intentionally touched generated `dist/src/**` files, which Bootstrap Mode still treats as forbidden/protected in this repo.
  - The hosted run therefore validated the real blocking path rather than the non-blocking path.

### Review-required success path

- PR: [#2](https://github.com/minor-snow/pantheon/pull/2)
- Workflow run: [25051308314](https://github.com/minor-snow/pantheon/actions/runs/25051308314)
- Comment: [github-actions[bot] review](https://github.com/minor-snow/pantheon/pull/2#issuecomment-4334970861)
- Workflow conclusion: `success`
- Pantheon verdict: `requires_review`
- Outcome:
  - PR comment posted successfully
  - `pantheon-report/` artifact uploaded successfully
  - `requires_review` surfaced as a warning path with exit code `0`
  - no forbidden or outside-scope findings were present

## Release blockers found and fixed during hosted validation

1. `pantheon check --base <sha>` still mixed untracked working-tree files into PR diff mode.
   - Fix: when `baseRef` is present, `gitDiffReader` now skips `git ls-files --others --exclude-standard`.

2. The Action runtime did not pass `GITHUB_TOKEN` into `githubActionEntry`.
   - Fix: `action/action.yml` now forwards `github.token`, which allows hosted PR comment creation/update.

## Final hosted validation judgment

`P26` is now:

```text
code complete
dogfood complete
hosted validated
```

The release surface now has proof for both:

- blocking boundary behavior on a real GitHub-hosted PR
- non-blocking `requires_review` behavior on a real GitHub-hosted PR
