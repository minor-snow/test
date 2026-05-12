# Example: Workgraph Claim & Complete Flow

This flow shows how an actor (human or agent) moves a work item to completion.

## 1. Claiming Work
```bash
clarion workgraph claim item_001
```
The status of `item_001` changes to `active`.

## 2. Performing the Work
The actor performs the necessary code changes.

## 3. Submitting via Agent Gateway (Optional)
If an agent is performing the work, they submit their session:
```bash
clarion agent submit --envelope @my_work.json
```

## 4. Finalizing
Once the work is validated:
```bash
clarion workgraph complete item_001
```
The item status changes to `completed`.

## 5. Audit Ledger
View the history:
```bash
clarion workgraph events
```
This will show the `claim` and `complete` events with timestamps and actor IDs.
