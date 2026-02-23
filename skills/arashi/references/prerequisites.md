# Prerequisites

Run these checks before installing Arashi CLI.

| Requirement | Command | Expected Output | Required |
|-------------|---------|-----------------|----------|
| Git available | `git --version` | Version string, exit code `0` | Yes |
| npm available (primary install path) | `npm --version` | Version string, exit code `0` | Yes |
| Node.js available (local security gate) | `node --version` | Version string, exit code `0` | Yes |
| SHA-256 tool available | `command -v shasum || command -v sha256sum || command -v openssl` | Tool path printed, exit code `0` | No (needed for verified release artifact path) |
| curl available | `curl --version` | Version string, exit code `0` | No (needed for verified release artifact path) |
| fzf available (optional) | `fzf --version` | Version string, exit code `0` | No (needed for shortcut flows) |
| sesh available (optional) | `sesh --help` | Help output, exit code `0` | No (needed for tmux session shortcut) |
| Network access to Arashi repo | `git ls-remote https://github.com/corwinm/arashi.git` | Remote refs listed, exit code `0` | Yes |

## Quick Readiness Check

```bash
git --version
npm --version
arashi --version
```

Expected result: commands exit `0` and `arashi` is available on `PATH`.
