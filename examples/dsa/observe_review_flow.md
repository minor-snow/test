# Example: DSA Observe & Review Flow

This walkthrough demonstrates the end-to-end process of identifying architectural drift.

## 1. Initial State
The repository has a clean architecture.

## 2. Introduce Drift
An operator adds a direct dependency from `src/stores/db.ts` to `src/cli/main.ts`.

## 3. Observation
Run the observe command:
```bash
clarion dsa observe
```

## 4. Review Candidates
List the new candidates:
```bash
clarion dsa review list
```
Output:
```json
{
  "summary": {
    "dsa_review_list": {
      "candidates": [
        {
          "id": "cand_001",
          "kind": "unauthorized_dependency",
          "status": "pending",
          "confidence": 0.95
        }
      ]
    }
  }
}
```

## 5. Show Detail
```bash
clarion dsa review show cand_001
```
The output will contain a natural language summary explaining that `storage` cannot depend on `api`.

## 6. Decision
If the dependency was accidental:
```bash
clarion dsa review reject cand_001
```
Then fix the code.

If the dependency is a necessary evolution of the system:
```bash
clarion dsa review approve cand_001
clarion dsa materialize
```
This updates the architecture contract to recognize the new dependency.
