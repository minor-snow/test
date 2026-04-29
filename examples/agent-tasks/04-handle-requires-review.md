# Agent Task 04: Handle `requires_review`

If Pantheon returns `requires_review`:

1. Stop broadening the diff.
2. Keep the affected files for human review.
3. Do not silently treat review-required files as approved.
4. Read `repair_feedback.md` and follow the listed actions.
