# Prerequisites

Run these checks before installing Arashi CLI.

| Requirement | Command | Expected Output | Required |
|-------------|---------|-----------------|----------|
| Git available | `git --version` | Version string, exit code `0` | Yes |
| npm available (recommended) | `npm --version` | Version string, exit code `0` | No (needed for npm install path) |
| curl available (alternative) | `curl --version` | Version string, exit code `0` | No (needed for release-binary path) |
| fzf available (optional) | `fzf --version` | Version string, exit code `0` | No (needed for shortcut flows) |
| sesh available (optional) | `sesh --help` | Help output, exit code `0` | No (needed for tmux session shortcut) |
| Network access to Arashi repo | `git ls-remote https://github.com/corwinm/arashi.git` | Remote refs listed, exit code `0` | Yes |

## Quick Readiness Check

```bash
git --version
arashi --version
```

Expected result: commands exit `0` and `arashi` is available on `PATH`.
