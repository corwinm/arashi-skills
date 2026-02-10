# Troubleshooting Matrix

Use this matrix to map symptoms to root cause and a deterministic fix.

| Symptom | Likely Cause | Recovery Action |
|---------|--------------|-----------------|
| `npm: command not found` | Node.js/npm not installed or not on `PATH` | Install Node.js LTS, restart shell, rerun `npm --version`. |
| `git: command not found` | Git not installed or not on `PATH` | Install Git, restart shell, rerun `git --version`. |
| `arashi: command not found` | Arashi not installed or install location not on `PATH` | Install Arashi via npm or release binary, then run `arashi --version`. |
| `npm install -g arashi` fails | Registry access blocked, permissions issue, or npm config issue | Check network/registry access, fix npm auth/config, retry with sufficient permissions. |
| Release binary download fails | DNS/proxy/firewall blocks GitHub release endpoint | Verify connectivity, retry from stable network, or use npm install path. |
| `arashi init` fails | Directory not writable or invalid workspace location | Ensure directory is writable and rerun `arashi init` in the intended root. |
| `arashi create` fails due to branch conflict | Branch already exists with incompatible worktree state | Use a unique branch name or remove conflicting worktree, then retry. |
| `sesh connect` fails | `sesh` missing or tmux not configured | Install/configure sesh and tmux, or use plain `cd` shortcut flow. |

## Recovery Playbook

1. confirm prerequisites from `references/prerequisites.md`
2. confirm `arashi --version` succeeds
3. rerun the failing workflow command
4. verify expected outcomes in `references/workflows.md`
