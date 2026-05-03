# Change Scope

Change ID: `chg_cae36ddd85ac4a77`
Revision: 1

## Allowed
*(None)*

## Review Required
| Pattern | Reason |
|---|---|
| `.github/workflows/**` | Project configuration and manifests require review. (default_rule) |
| `.pantheon/architecture/architecture_contract.json` | Architecture changes always require human review. (default_rule) |
| `.pantheon/architecture/architecture_contract.spec.json` | Architecture changes always require human review. (default_rule) |
| `.pantheon/architecture/architecture_contract.test.json` | Architecture changes always require human review. (default_rule) |
| `action/dist/**` | Project configuration and manifests require review. (default_rule) |
| `dist/**` | Project configuration and manifests require review. (default_rule) |
| `package-lock.json` | Project configuration and manifests require review. (default_rule) |
| `package.json` | Project configuration and manifests require review. (default_rule) |
| `pnpm-lock.yaml` | Project configuration and manifests require review. (default_rule) |
| `src/auth/login.spec.ts` | Architecture changes always require human review. (default_rule) |
| `src/auth/login.test.ts` | Architecture changes always require human review. (default_rule) |
| `src/auth/login.ts` | Architecture changes always require human review. (default_rule) |
| `src/payment/billing.spec.ts` | Architecture changes always require human review. (default_rule) |
| `src/payment/billing.test.ts` | Architecture changes always require human review. (default_rule) |
| `src/payment/billing.ts` | Architecture changes always require human review. (default_rule) |
| `src/utils/format.spec.ts` | Architecture changes always require human review. (default_rule) |
| `src/utils/format.test.ts` | Architecture changes always require human review. (default_rule) |
| `src/utils/format.ts` | Architecture changes always require human review. (default_rule) |
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
