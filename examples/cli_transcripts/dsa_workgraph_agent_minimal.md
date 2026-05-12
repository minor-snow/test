# Minimal CLI Transcript Example

This transcript demonstrates a successful end-to-end integration of DSA, Workgraph, and Agent Gateway.

```bash
# 1. Observe drift
$ clarion dsa observe
# Status: ok | Candidates: 1

# 2. Review and Approve
$ clarion dsa review approve cand_123
# Status: ok | Summary: Candidate approved.

# 3. Synchronize work
$ clarion workgraph import-dsa
# Status: ok | Summary: 1 work item created (item_456).

# 4. Agent Claims work
$ clarion workgraph claim item_456
# Status: ok | Summary: Claimed by agent_alpha.

# 5. Agent Submits work
$ clarion agent submit --envelope @submission.json
# Status: ok | Summary: Session opened (sess_789).

# 6. Finalize work item
$ clarion workgraph complete item_456
# Status: ok | Summary: Work item completed.
```
