# Prerequisites

Run these checks before running Arashi workflows.

| Requirement | Command | Expected Output | Required |
|-------------|---------|-----------------|----------|
| Git available | `git --version` | Version string, exit code `0` | Yes |
| Arashi CLI available | `arashi --version` | Version string, exit code `0` | Yes |
| Node.js available (local security gate) | `node --version` | Version string, exit code `0` | Yes |
| fzf available (optional) | `fzf --version` | Version string, exit code `0` | No (needed for shortcut flows) |
| sesh available (optional) | `sesh --help` | Help output, exit code `0` | No (needed for tmux session shortcut) |
| Network access to Arashi repo | `git ls-remote https://github.com/corwinm/arashi.git` | Remote refs listed, exit code `0` | Yes |

## Quick Readiness Check

```bash
git --version
arashi --version
```

Expected result: commands exit `0` and `arashi` is available on `PATH`.

If `arashi --version` fails, install Arashi by following https://arashi.haphazard.dev.
