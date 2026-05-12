# Example: Workgraph Import & List Flow

This flow shows how to move from architectural observation to work orchestration.

## 1. Import Approved Changes
Once DSA candidates are approved, pull them into the workgraph:
```bash
clarion workgraph import-dsa
```

## 2. List Active Work
```bash
clarion workgraph list
```
Output:
```json
{
  "summary": {
    "workgraph_list": {
      "items": [
        {
          "id": "item_001",
          "status": "pending",
          "source": "dsa:cand_001",
          "summary": "Fix unauthorized dependency in storage domain."
        }
      ]
    }
  }
}
```

## 3. Examine Detail
```bash
clarion workgraph show item_001
```
This shows dependencies. If this item requires a database migration first, the `dependencies` array will point to the migration item.
