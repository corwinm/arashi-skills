# Prerequisites Matrix

Run these checks before installation. All required rows must pass.

| Requirement | Command | Expected Output | Required |
|-------------|---------|-----------------|----------|
| Git available | `git --version` | Version string, exit code `0` | Yes |
| npx available | `npx --version` | Version string, exit code `0` | Yes |
| Arashi available | `arashi --version` | Arashi version string | No (required only for verification gate) |
| Network access to GitHub | `git ls-remote https://github.com/corwinm/arashi-skills.git` | Remote refs listed, exit code `0` | Yes |
| User write access to local skill directory | `test -w "$HOME"` | Exit code `0` | Yes |

## Preflight Gates

1. **Prerequisite gate**: required checks pass.
2. **Install gate**: skill files are available locally after install.
3. **Workflow gate**: examples and workflow reference files are present.

## Validation Command

Use the bundled validator to run the same checks quickly:

```bash
bash skills/arashi/scripts/validate.sh --check preflight
```

Expected result: command exits `0` and prints `PASS` lines for required commands.
