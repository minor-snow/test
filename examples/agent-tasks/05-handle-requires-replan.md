# Agent Task 05: Handle `requires_replan`

If Pantheon returns `requires_replan`:

1. Stop patching.
2. Re-run repair plan for the current base state.
3. Do not reuse the older repair contract for correctness decisions.
4. Continue only after a new repair plan exists.
