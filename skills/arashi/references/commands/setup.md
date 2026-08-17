# Setup, update, and completion

Install or update the CLI and configure supported shell completion.

Installed `arashi <command> --help` is the parameter authority.

## Installation

Installation instructions are maintained on the Arashi website:

- https://arashi.haphazard.dev

Use the website flow for your platform and environment policy.

Expected outcomes:

- `arashi --version` exits `0`
- `arashi --help` exits `0`

## Repository setup

`arashi setup` runs configured repository setup scripts in workspace order. It requires configured mode.

```bash
# all configured repositories
arashi setup

# repeat or comma-separate selectors; group and name filters intersect
arashi setup --only api --group services

# one machine-readable result
arashi setup --only api --json
```

Targets without setup scripts are skipped. Failed or timed-out scripts produce a non-zero result; JSON mode captures script diagnostics and keeps stdout to one document. Setup scripts are not lifecycle hooks. Use `arashi setup --help` for current options.

## Shell Completion

Arashi generates shell-specific completion scripts for Bash, Zsh, and Fish through one public command:

```bash
arashi completion bash
arashi completion zsh
arashi completion fish
```

Completion activation and the parent-shell wrapper are separate manual choices. `arashi shell init <shell>` emits only the manual wrapper; it does not activate completion. `arashi shell install` owns both wrapper and completion activation lines in its managed profile block, and repeated installs idempotently upgrade the complete block.

For manual activation, run the commands for the current shell. Each line is independent, so install only the wrapper or only completion when that is the intended scope.

**Bash**

```bash
eval "$(command arashi shell init bash)"
source <(command arashi completion bash)
```

**Zsh**

```zsh
eval "$(command arashi shell init zsh)"
source <(command arashi completion zsh)
```

**Fish**

```fish
command arashi shell init fish | source
command arashi completion fish | source
```

Static command and option completion works outside a configured workspace. Dynamic ownership is exact: each `--only` segment completes repository names; each `--group` segment completes configured groups; `switch [filter]` and `remove [target]` complete branch, worktree name, or path values, while `--path` narrows them to exact worktree paths; `move --from` and `move --to` complete workspace branch, name, or path references; supported-shell arguments and finite constrained options complete only their declared values; unclassified slots receive no local candidates. Each request has a 200 ms whole-query budget and uses only local read-only discovery: no network requests, hooks, prompts, workspace mutation, or child-repository operations. Budget expiry or discovery failure is silently empty while static completion remains available. Generated completion functions invoke `command arashi` so wrapper functions cannot recursively intercept completion queries.

Zsh and Fish can present candidate descriptions from Arashi's shared completion model. Bash's native programmable-completion UI does not generally display per-candidate descriptions, although the shared model retains them. The npm-managed wrapper and standalone binary expose the same completion behavior and generated shell output for a given release.

## Executable names

`aw` is the supported **Arashi Workspace** executable shorthand. Supported npm and direct installations provide equivalent `arashi` and `aw` executable names. `arashi` remains the canonical product and command vocabulary; `aw` is not a Commander command alias or a second command vocabulary. Keep workflow examples and command discovery canonical: use `arashi --version`, `arashi --help`, and `arashi <command> --help`. See current installation-channel details about collision handling, shell integration, completion, updates, and manual installation at https://arashi.haphazard.dev.

## Updating Arashi

Use the docs site for current install-method guidance. The CLI can also check update availability:

```bash
# check without changing files
arashi update --check

# show the selected package-manager command or installer invocation
arashi update --dry-run

# run a supported npm-managed update non-interactively
arashi update --yes
```

`update --check` conflicts with `--dry-run` and `-n`. Arashi rejects either combination before release lookup, installer planning, package-manager execution, binary replacement, or mutation in both the native Commander path and the npm-managed wrapper path.

Bare `update --json` is inspection-only in both paths: it reports the update plan in one envelope and never prompts or applies an update. `update --json --yes` returns one `JSON_UNSUPPORTED_FOR_MODE` envelope for installer apply before mutation.

Expected outcomes:

- npm-managed installs update only when Arashi can confidently detect a supported package manager.
- official curl installer installs rerun the installer against the current binary directory when `--yes` is passed.
- ambiguous npm-managed installs do not mutate files; follow the printed manual commands.
