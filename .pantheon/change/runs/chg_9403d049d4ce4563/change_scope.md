# Change Scope

Change ID: `chg_9403d049d4ce4563`
Revision: 1

## Allowed
| Pattern | Reason |
|---|---|
| `.pantheon/architecture/architecture_contract.json` | User declared target for this change. (user_intent) |
| `.pantheon/architecture/architecture_contract.spec.json` | Inferred co-located spec file for declared target. (default_rule) |
| `.pantheon/architecture/architecture_contract.test.json` | Inferred co-located test file for declared target. (default_rule) |
| `src/utils/format.spec.ts` | Inferred co-located spec file for declared target. (default_rule) |
| `src/utils/format.test.ts` | Inferred co-located test file for declared target. (default_rule) |
| `src/utils/format.ts` | User declared target for this change. (user_intent) |

## Review Required
| Pattern | Reason |
|---|---|
| `.github/workflows/**` | Project configuration and manifests require review. (default_rule) |
| `action/dist/**` | Project configuration and manifests require review. (default_rule) |
| `dist/**` | Project configuration and manifests require review. (default_rule) |
| `package-lock.json` | Project configuration and manifests require review. (default_rule) |
| `package.json` | Project configuration and manifests require review. (default_rule) |
| `pnpm-lock.yaml` | Project configuration and manifests require review. (default_rule) |
| `tsconfig*.json` | Project configuration and manifests require review. (default_rule) |
| `vitest.config.*` | Project configuration and manifests require review. (default_rule) |
| `yarn.lock` | Project configuration and manifests require review. (default_rule) |

## Forbidden
| Pattern | Reason |
|---|---|
| `.cursor/**` | Pantheon trust and audit artifacts are strictly forbidden from automated modification. (default_rule) |
| `.git/**` | Pantheon trust and audit artifacts are strictly forbidden from automated modification. (default_rule) |
| `.pantheon/**/approval*.json` | Pantheon trust and audit artifacts are strictly forbidden from automated modification. (default_rule) |
| `.pantheon/audit/**` | Pantheon trust and audit artifacts are strictly forbidden from automated modification. (default_rule) |
| `.pantheon/repair/**/human_decision*.json` | Pantheon trust and audit artifacts are strictly forbidden from automated modification. (default_rule) |
| `.pantheon/reviews/**` | Pantheon trust and audit artifacts are strictly forbidden from automated modification. (default_rule) |
