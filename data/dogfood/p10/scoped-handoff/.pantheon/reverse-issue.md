# Reverse Issue Instructions

If implementation requires changing Pantheon-generated contracts, **do not edit generated files directly**.

Create a structured reverse issue:

```bash
npx tsx scripts/createImplementationIssue.ts \
  --artifact "<artifact_id>" \
  --block "<block_id>" \
  --type "<issue_type>" \
  --description "Explain the contract gap" \
  --context "Explain where implementation hit the gap"
```

## When to Create a Reverse Issue

### missing_field

**Condition**: A required field is missing from generated models.

**Action**: Create a Pantheon reverse issue instead of editing generated code.

```bash
npx tsx scripts/createImplementationIssue.ts --artifact "<artifact_id>" --block "<block_id>" --type "missing_field" --description "..." --context "..."
```

### new_state_transition

**Condition**: A new state transition is required that is not in the generated state machine.

**Action**: Create a Pantheon reverse issue to add the transition at architecture level.

```bash
npx tsx scripts/createImplementationIssue.ts --artifact "<artifact_id>" --block "<block_id>" --type "missing_state" --description "..." --context "..."
```

### new_conflict_policy

**Condition**: A new conflict policy is required.

**Action**: Create a Pantheon reverse issue to define the policy at architecture level.

```bash
npx tsx scripts/createImplementationIssue.ts --artifact "<artifact_id>" --block "<block_id>" --type "contract_mismatch" --description "..." --context "..."
```

### modify_forbidden_file

**Condition**: Implementation needs to modify a file outside the allowed list.

**Action**: Create a Pantheon reverse issue requesting scope expansion.

```bash
npx tsx scripts/createImplementationIssue.ts --artifact "<artifact_id>" --block "<block_id>" --type "other" --description "Scope expansion needed: ..." --context "..."
```

### contract_test_failure

**Condition**: A generated contract test blocks implementation.

**Action**: Create a Pantheon reverse issue; do not modify the test.

```bash
npx tsx scripts/createImplementationIssue.ts --artifact "<artifact_id>" --block "<block_id>" --type "contract_mismatch" --description "..." --context "..."
```

### need_to_change_generated_code

**Condition**: Downstream agent needs to change generated boundary code directly.

**Action**: Create a Pantheon reverse issue; boundary code is regenerated from architecture.

```bash
npx tsx scripts/createImplementationIssue.ts --artifact "<artifact_id>" --block "<block_id>" --type "other" --description "Generated code gap: ..." --context "..."
```

---

Scope: `sync-conflict-policy-change_mofrw3eg`
Risk level: **HIGH**
Human review required: yes