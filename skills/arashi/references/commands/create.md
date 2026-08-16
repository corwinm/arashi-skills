# Create worktrees

Create coordinated worktrees only after the effective repository set and base are clear.

Installed `arashi <command> --help` is the parameter authority.

## Create from a Coordinated Base Branch

Use the workspace-generic `defaults.create.baseBranch` setting when follow-up branches should start from the same long-running branch in the parent and managed repositories. It is not editor-scoped or per-repository configuration:

```json
{
  "defaults": {
    "create": {
      "baseBranch": "feature/FEAT-1234"
    }
  }
}
```

For one invocation, use `arashi create <target> --base <branch>`; for example, `arashi create feature/FEAT-1234/docs --base feature/FEAT-1234`. Precedence is CLI > configuration > legacy behavior: `--base` overrides `defaults.create.baseBranch`, and omitting both preserves the established configured and standalone start-point behavior.

Arashi resolves the requested base in every effective selected repository, including repositories whose target will be reused, using the local branch first and then `origin/<branch>`; it captures the resolved commit OID, and all resolution failures are aggregated before hooks or any workspace mutation. `--only` and `--group` limit that effective set and still compose by intersection. Resolution is read-only and does not fetch another remote. New targets use the captured commit OID even if the selected ref moves after preflight.

`--base` applies only to newly created targets. For a target accepted with `--conflict REUSE_EXISTING` (`REUSE_EXISTING`), base resolution remains required, but the target receives no mutation: Arashi keeps its exact existing OID and does not reset, rebase, recreate, or rewrite it. Arashi does not assert or check ancestry and does not represent or claim that the reused target was derived from the requested base.

In implicit standalone mode, explicit `--base` is invocation-only and does not load or persist `defaults.create.baseBranch`; when omitted, standalone create continues to start new targets from the current `HEAD`. Human `--dry-run` output reports the requested base and each repository's resolved ref without mutation. With `--json` or `--dry-run --json`, stdout remains exactly one JSON document. `requestedBranch` is the normalized logical branch after removing at most one leading `origin/`, `source` is exactly `cli` or `config`, and `targetAction` is exactly `created` or `reused`.

Successful JSON output covers the complete selected set in effective repository order. Missing bases return `CREATE_BASE_RESOLUTION_FAILED` with only affected repositories and the attempted local-then-`origin` refs; unaffected selected repositories are excluded. `ARASHI_BRANCH_NAME` remains the target-branch hook context; do not invent `ARASHI_BASE_BRANCH`.
Use command defaults in `.arashi/config.json` to control post-create behavior and select one canonical switch mode:

```json
{
  "defaults": {
    "create": {
      "switch": true,
      "launch": "herdr"
    },
    "editors": {
      "vscode": {
        "create": {
          "switch": false,
          "launch": "auto"
        }
      }
    },
    "switch": {
      "mode": "auto"
    }
  }
}
```

For `defaults.create.launch`, choose `none`, `auto`, `sesh`, or `herdr`. Omitting it has the built-in `none` behavior. The independent `switch` boolean still opts into or out of post-create selection, but launch implies switch: resolving `auto`, `sesh`, or `herdr` always selects the newly created primary worktree even when `switch` is false or `--no-switch` is present. Conversely, `launch: "none"` does not suppress an independently enabled switch.

Scope create defaults to the invocation host. Terminal invocations use only `defaults.create`. Editor-hosted invocations use only `defaults.editors.<host>.create` for the matching `vscode`, `cursor`, or `kiro` host and do not fall back to generic defaults or another editor host when that scope is absent. Implicit standalone create has no configured defaults and continues to use explicit flags only.
Use one-off CLI overrides when one `arashi create` run should differ from its matching configured scope:

```bash
arashi create feature-auth --launch
arashi create feature-auth --tmux
arashi create feature-auth --sesh
arashi create feature-auth --herdr
arashi create feature-auth --tab
arashi create feature-auth --no-launch
arashi create feature-auth --no-switch
arashi create feature-auth --move-changes
```

Create launch precedence is `--sesh` or `--herdr` > `--launch` > `--no-launch` > matching configured `launch` > built-in `none`. An explicit launcher implies launch even with `--no-launch`; simultaneous `--sesh` and `--herdr` is rejected before repository discovery or mutation. `--no-launch` suppresses a configured launcher when no explicit launcher is present. Switch precedence is resolved independently before launch-implies-switch is applied.

Configured launch is unsupported with `create --json`: resolved `auto`, `sesh`, or `herdr` returns one structured unsupported-mode error before repository discovery or worktree mutation, just like explicit launch flags. Resolved `none` may continue through normal non-interactive JSON create, with stdout remaining exactly one JSON document.

Automatic launch uses tmux → Herdr → cmux → integrated IDE → Kitty → terminal/platform selection and strict environment checks. Explicit `sesh` or `herdr` bypasses automatic context detection. Launch runs only after successful creation; launcher validation or process failure preserves every successfully created worktree, reports creation separately from launch failure, and does not fall back to another launcher. Paths and labels remain distinct process arguments rather than shell-interpolated command text.

If work starts before the right coordinated worktree exists, move compatible uncommitted edits into the target workspace:

```bash
# after creating the target worktree
arashi move --to feature-auth

# explicit source and target for unattended automation
arashi move --from main --to feature-auth --json
```

Expected outcomes:

- `arashi create <branch>` leaves existing uncommitted changes in place and prints move guidance when compatible changed repositories are detected.
- `arashi create <branch> --json` includes dirty-workspace guidance as structured data, not human text.
- `arashi create <branch> --move-changes` moves compatible staged, unstaged, and untracked changes after successful worktree creation.
- `arashi move` refuses dirty target repositories and reports recovery commands if a stash-backed transfer needs manual recovery.
Precedence for create/switch launch behavior is: explicit flag > opt-out flag > config default > built-in default. `--tmux` is a per-invocation-only override: configured `auto` remains the persistent contextual path to plain tmux. In zero-config standalone and configured repositories alike, explicit tmux requires a non-empty trimmed `TMUX` and does not fall back after prerequisite or process failure.

For switch, `--tmux` conflicts with `--cd` and any explicit launcher in `--sesh`, `--herdr`, `--vscode`, `--cursor`, or `--kiro`. `--tmux --launch` is compatible launch intent, and `--tmux --ignore-configured-launcher` keeps explicit tmux authoritative while bypassing configured launchers. For create, `--tmux` implies launch and target selection: `--tmux --no-launch` and `--tmux --no-switch` still create and launch the primary worktree, while create `--tmux` conflicts with `--sesh` or `--herdr`.

Both `switch --json --tmux` and `create --json --tmux` return one structured `JSON_UNSUPPORTED_FOR_MODE` document before context validation, conflicts, launch, hooks, or repository mutation. Switch retains its `launch` mode label; create retains its `interactive-or-launch` mode label. A missing tmux context therefore creates nothing. A `tmux new-window` process failure after successful create preserves successfully created worktrees and does not try another launcher.

The configured vocabularies do not gain `tmux`: `defaults.switch.mode` still accepts only `auto`, `cd`, `launch`, `sesh`, and `herdr`, while `defaults.create.launch` still accepts only `none`, `auto`, `sesh`, and `herdr`. Configured `auto` can continue choosing plain tmux contextually.
