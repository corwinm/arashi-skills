# Security Audit Policy

This policy defines the canonical security gate for the Arashi skill package.

## Canonical Gate Command

Run from `repos/arashi-skills`:

```bash
node scripts/security-gate.mjs --root . --exceptions security/audit-exceptions.json
```

## Pass/Fail Threshold

- **FAIL** when any unsuppressed finding is reported by the gate
- **FAIL** when exception metadata is malformed or expired
- **PASS** only when findings count is `0`

## Enforcement Locations

- Pull requests: `.github/workflows/security-audit.yml`
- Release/tag builds: `.github/workflows/release-security-gate.yml`

Both workflows MUST run the same canonical gate command.

## Finding Classes Enforced by Gate

1. Content safety rules for markdown guidance
   - no remote pipe-to-shell patterns
   - no privileged binary move examples
   - no unpinned global npm install examples
   - no unsafe command substitution patterns for worktree selection
2. Artifact hygiene rules
   - no `.env` files or private key material tracked in artifacts
3. Dependency manifest rules
   - if `package.json` exists, disallow unpinned/remote dependency sources

## Exception Workflow

Exceptions are allowed only in `security/audit-exceptions.json` and must include:

- `id`
- `finding`
- `path` (supports `*` wildcard)
- `owner`
- `rationale`
- `expiresAt` (ISO-8601)

Expired or malformed exceptions are treated as gate failures.
