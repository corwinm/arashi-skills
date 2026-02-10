# Troubleshooting Matrix

Use this matrix to map symptoms to root cause and a deterministic fix.

| Symptom | Likely Cause | Recovery Action |
|---------|--------------|-----------------|
| `npm: command not found` | Node.js/npm not installed or not on `PATH` | Install Node.js LTS, restart shell, rerun `npm --version`. |
| `git: command not found` | Git not installed or shell session missing updated `PATH` | Install Git, restart shell, rerun `git --version`. |
| `arashi: command not found` | Arashi not installed or install location not on `PATH` | Install Arashi via npm or release binary, then run `arashi --version`. |
| `npm install -g arashi` fails | Registry access blocked, permissions issue, or npm config problem | Check network/registry access, fix npm auth/config, retry install with sufficient permissions. |
| Release binary download fails | DNS/proxy/firewall blocks GitHub release endpoint | Verify connectivity, retry with stable network, or use npm install path. |
| `git ls-remote ...` hangs or times out | Corporate proxy or TLS inspection interfering with GitHub HTTPS | Configure proxy/cert chain for Git, retry from approved network. |
| Validation fails with missing `SKILL.md` | Install did not complete or wrong current directory | Re-run install, then run validator from repo root. |
| Workflow validation fails with `missing command: arashi` | Arashi CLI not installed globally or binary path missing | Install via npm or release binary; verify with `arashi --version`. |
| Workflow validation fails for missing workflow references | Skill files are incomplete or partial checkout | Pull latest repository state and re-run `--check workflows`. |
| `Permission denied` on validator script | Script missing execute permission or filesystem ACL blocks execution | Run `chmod +x skills/arashi/scripts/validate.sh` and retry. |
| `arashi create` fails due to branch conflict | Branch already exists with incompatible worktree state | Choose a unique branch name or remove conflicting worktree, then retry. |

## Failure Recovery Playbook

1. Re-run preflight checks: `bash skills/arashi/scripts/validate.sh --check preflight`.
2. Fix all failing prerequisites first.
3. Re-run install gate: `bash skills/arashi/scripts/validate.sh --check install`.
4. Re-run workflow gate: `bash skills/arashi/scripts/validate.sh --check workflows`.
5. Execute workflow commands only after all gates pass.
