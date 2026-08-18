# Prerequisites

Check only the requirements for the operation being performed.

## Always required

| Requirement | Check | Expected result |
| --- | --- | --- |
| Git | `git --version` | Version string and exit code `0` |
| Installed Arashi CLI | `aw --version` | Version string and exit code `0` |

If `aw --version` fails, follow the current installation instructions at https://arashi.haphazard.dev. An already-installed standalone binary can perform local operations without Node.js or GitHub access.

## Conditional prerequisites

| Scope | Requirement | Check or boundary |
| --- | --- | --- |
| npm installation or npm-managed update | Node.js and npm | `node --version` and `npm --version` |
| curl installation, update checks, clone, pull, push, or other remote Git operations | Network access to the selected installer, package registry, or Git remote | Test the actual destination only when the operation needs it |
| repository maintainer validation | Node.js | Required by this repository's validation scripts, not by installed local CLI use |
| fuzzy session shortcuts | fzf | `fzf --version` |
| plain tmux launch | tmux plus an active tmux client or session | `tmux -V` and a non-empty `TMUX` value |
| sesh integration | tmux context and sesh | `tmux -V`, a non-empty `TMUX` value, and `sesh --help` |
| Herdr launch | Herdr and a reachable Herdr session/server | `herdr --version`; default workspace launch also needs a non-bare main checkout |
| managed Kitty launch | Kitty 0.43+ with remote control permitted by the user's policy | `kitten --version` and existing Kitty `allow_remote_control` and password policy |
| editor-specific launch | The selected editor CLI | Verify the dynamically selected editor; do not assume another editor is interchangeable |

## Launch boundaries

For Herdr, default workspace launch uses `herdr worktree open` and requires a non-bare main checkout. `--tab --herdr` instead uses `herdr tab create` in the active workspace, requires a non-empty `HERDR_WORKSPACE_ID`, and does not require that source checkout.

For managed Kitty launch, Arashi uses inherited Kitty context and `kitten @`. It does not rewrite Kitty configuration, invent a socket, or weaken the user's remote-control or password policy.

A missing optional integration blocks only the mode that requested it. Choose a different supported mode explicitly rather than fabricating environment evidence or relying on silent fallback.
