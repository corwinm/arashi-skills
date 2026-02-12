# Prerequisites

Run these checks before installing Arashi CLI.

| Requirement | Command | Expected Output | Required |
|-------------|---------|-----------------|----------|
| Git available | `git --version` | Version string, exit code `0` | Yes |
| bash available (curl installer path) | `bash --version` | Version string, exit code `0` | No (needed for curl install path) |
| curl available (curl installer path) | `curl --version` | Version string, exit code `0` | No (needed for curl install path) |
| SHA-256 tool available | `command -v shasum || command -v sha256sum || command -v openssl` | Tool path printed, exit code `0` | No (needed for curl install path) |
| npm available (fallback path) | `npm --version` | Version string, exit code `0` | No (needed for npm install path) |
| fzf available (optional) | `fzf --version` | Version string, exit code `0` | No (needed for shortcut flows) |
| sesh available (optional) | `sesh --help` | Help output, exit code `0` | No (needed for tmux session shortcut) |
| Network access to Arashi repo | `git ls-remote https://github.com/corwinm/arashi.git` | Remote refs listed, exit code `0` | Yes |

## Quick Readiness Check

```bash
git --version
curl --version
arashi --version
```

Expected result: commands exit `0` and `arashi` is available on `PATH`.
