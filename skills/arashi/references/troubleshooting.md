# Troubleshooting Matrix

Use this matrix to map symptoms to root cause and a deterministic fix.

| Symptom | Likely Cause | Recovery Action |
|---------|--------------|-----------------|
| `npm: command not found` | Node.js/npm not installed or not on `PATH` | Install Node.js LTS, restart shell, rerun `npm --version`. |
| `node: command not found` | Node.js not installed or not on `PATH` | Install Node.js LTS, restart shell, rerun `node --version`. |
| `curl: command not found` | curl not installed or not on `PATH` | Install curl only if using the verified release artifact path, then rerun `curl --version`. |
| `git: command not found` | Git not installed or not on `PATH` | Install Git, restart shell, rerun `git --version`. |
| `arashi-checksums.txt` download fails | Release assets unavailable or network blocks GitHub | Retry from stable network. If still failing, use pinned npm install while release assets are corrected. |
| `arashi: command not found` | Arashi not installed or install location not on `PATH` | Install Arashi via pinned npm command, then run `arashi --version`. |
| `npm install --global arashi@1.7.0` fails | Registry access blocked, permissions issue, or npm config issue | Check network/registry access, fix npm auth/config, retry with sufficient permissions. |
| Verified release download fails | DNS/proxy/firewall blocks GitHub release endpoint | Verify connectivity, retry from stable network, or use pinned npm path. |
| Repository security checks fail on exception metadata | Exception entry is stale or malformed | Remediate findings or renew exceptions with owner, rationale, and valid expiry metadata. |
| `arashi init` fails | Directory not writable or invalid workspace location | Ensure directory is writable and rerun `arashi init` in the intended root. |
| `arashi create` fails due to branch conflict | Branch already exists with incompatible worktree state | Use a unique branch name or remove conflicting worktree, then retry. |
| `sesh connect` fails | `sesh` missing or tmux not configured | Install/configure sesh and tmux, or use plain `cd` shortcut flow. |

## Recovery Playbook

1. confirm prerequisites from `references/prerequisites.md`
2. confirm `arashi --version` succeeds
3. run your repository's configured security checks
4. rerun the failing workflow command
5. verify expected outcomes in `references/workflows.md`
