# Security Exception Process

Use exceptions only when a finding cannot be remediated immediately.

## Requirements

Add entries to `security/audit-exceptions.json` with:

- `id`: stable unique identifier
- `finding`: rule key from `scripts/security-gate.mjs`
- `path`: affected file path (supports `*` wildcard)
- `owner`: person/team responsible for remediation
- `rationale`: why temporary suppression is needed
- `expiresAt`: ISO-8601 timestamp

## Approval and Lifecycle

1. Open a pull request with the exception and remediation issue link.
2. Require reviewer approval from repository maintainers.
3. Set expiration to the shortest realistic remediation window.
4. Remove the exception as soon as the underlying finding is fixed.

## Expiration Behavior

Expired exceptions fail the security gate automatically.
Malformed exception entries also fail the gate.

## Example

```json
{
  "id": "docs-remediation-window-2026-03",
  "finding": "no-unpinned-global-npm-install",
  "path": "skills/arashi/references/*.md",
  "owner": "@corwinm",
  "rationale": "Temporary while pinned install docs roll out across all files",
  "expiresAt": "2026-03-15T00:00:00Z"
}
```
