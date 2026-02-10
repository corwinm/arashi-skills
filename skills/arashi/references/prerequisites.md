# Prerequisites Matrix

Run these checks before installing Arashi CLI. All required rows must pass.

| Requirement | Command | Expected Output | Required |
|-------------|---------|-----------------|----------|
| Git available | `git --version` | Version string, exit code `0` | Yes |
| npm available (recommended) | `npm --version` | Version string, exit code `0` | No (required for npm install path) |
| curl available (alternative) | `curl --version` | Version string, exit code `0` | No (required for release-binary path) |
| fzf available (optional) | `fzf --version` | Version string, exit code `0` | No (required for shortcut flows) |
| sesh available (optional) | `sesh --help` | Help output, exit code `0` | No (required for tmux session shortcut) |
| Network access to Arashi releases | `git ls-remote https://github.com/corwinm/arashi.git` | Remote refs listed, exit code `0` | Yes |
| User write access to install location | `test -w "$HOME"` | Exit code `0` | Yes |

## Preflight Gates

1. **Prerequisite gate**: required checks pass.
2. **Install gate**: `arashi` command and required skill files are available.
3. **Workflow gate**: workflow reference files are present.

## Validation Command

Use the bundled validator to run the same checks quickly:

```bash
bash skills/arashi/scripts/validate.sh --check preflight
```

Expected result: command exits `0` and prints `PASS` lines for required checks.
