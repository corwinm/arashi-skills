# Prerequisites

Run these checks before running Arashi workflows.

| Requirement | Command | Expected Output | Required |
|-------------|---------|-----------------|----------|
| Git available | `git --version` | Version string, exit code `0` | Yes |
| Arashi CLI available | `arashi --version` | Version string, exit code `0` | Yes |
| Node.js available (local security gate) | `node --version` | Version string, exit code `0` | Yes |
| fzf available (optional) | `fzf --version` | Version string, exit code `0` | No (needed for shortcut flows) |
| sesh available (optional) | `sesh --help` | Help output, exit code `0` | No (needed for tmux session shortcut) |
| Herdr available (optional) | `herdr --version` | Verified v0.7.4 command contract, exit code `0` | No (needed for Herdr launch) |
| Kitty managed sessions (optional) | `kitten --version` | Kitty 0.43+ version string, exit code `0` | No (needed for automatic managed Kitty launch) |
| Network access to Arashi repo | `git ls-remote https://github.com/corwinm/arashi.git` | Remote refs listed, exit code `0` | Yes |

## Quick Readiness Check

```bash
git --version
arashi --version
```

Expected result: commands exit `0` and `arashi` is available on `PATH`.

If `arashi --version` fails, install Arashi by following https://arashi.haphazard.dev. If it exits immediately or returns `137`, reinstall with a pinned release from the website guide. The official curl installer can also offer shell integration during install; use `ARASHI_SHELL_INTEGRATION=yes|no` for unattended runs.

For Herdr launch, the CLI must be able to reach a running default Herdr session/server. The selected Git repository must also have a non-bare main checkout; a bare repository alone cannot provide the source required by `herdr worktree open`.

For automatic managed Kitty launch, use Kitty 0.43+ and permit remote control through the user's Kitty `allow_remote_control` and password policy. Arashi uses the inherited Kitty context and `kitten @`; it does not rewrite Kitty configuration, invent a socket, or weaken the user's permission policy.
