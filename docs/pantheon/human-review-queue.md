# Human Review Queue

Pantheon materializes non-pass repair outcomes into the local review queue:

`.pantheon/reviews/review_queue.json`

Review request files are stored under:

`.pantheon/reviews/review_requests/`

Useful commands:

- `node dist/src/cli/pantheon-alpha.js review list`
- `node dist/src/cli/pantheon-alpha.js review show --target-type repair --target-id <repair_id>`
