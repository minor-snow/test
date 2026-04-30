# Repair Protocol

Pantheon expects this sequence:

1. Write an agent bug report.
2. Run repair intake.
3. Capture the repair_id.
4. Run repair plan.
5. Read repair_task.md.
6. Modify only allowed files.
7. Run repair check.
8. If Pantheon returns requires_review, stop and wait for human approval.
