# Switch and launch

Select an existing worktree and resolve one launch mode without unsafe fallback.

Installed `aw <command> --help` is the parameter authority.

## Worktree listing

`aw list` prints known worktree paths for navigation and automation.

```bash
aw list
aw list --table
aw list --json
```

Default output is pipe-friendly; `--table` adds headers and `--json` emits structured worktree data. Standalone mode lists only the standalone repository's worktrees and does not traverse sub-repositories. Use `aw list --help` for current depth and verbosity options.

## Worktree Switching

Use `aw switch` to open a terminal context for an existing worktree, or change the current shell directory when shell integration is active.

```bash
# create and explicitly launch in plain tmux
aw create feature-auth --tmux

# parent workspace worktrees (default)
aw switch

# child repositories in current workspace only
aw switch --repos docs

# include parent workspaces + nested child repo worktrees
aw switch --all

# select one exact worktree by full path
aw switch --path /path/to/worktree

# force Cursor / VS Code / Kiro for one run
aw switch --cursor feature-auth
aw switch --vscode feature-auth
aw switch --kiro feature-auth

# request parent-shell cd when shell integration is active
aw switch --cd feature-auth

# force launch behavior for one run while preserving a configured launcher
aw switch --launch feature-auth

# sesh mode inside tmux
aw switch --sesh

# force plain tmux for this invocation
aw switch --tmux feature-auth

# explicitly open or focus the worktree in Herdr
aw switch --herdr feature-auth

# request a tab/equivalent in the selected launcher for this invocation
aw switch --tab feature-auth
aw switch --tab --herdr feature-auth

# capability failure example: explicit IDEs do not expose tab launch
aw switch --tab --vscode feature-auth

# bypass a configured explicit sesh or Herdr switch mode without forcing behavior
aw switch --ignore-configured-launcher feature-auth

# force generic automatic launch and bypass a configured named launcher
aw switch --launch --ignore-configured-launcher feature-auth
```

Expected outcomes:

- success-oriented commands above exit `0` and open the selected target in a new context; the explicitly labeled VS Code capability example exits nonzero with `TAB_DISPOSITION_UNSUPPORTED`
- configured `defaults.switch.mode` is the single switch default and accepts `auto`, `cd`, `launch`, `sesh`, and `herdr`; when omitted, Arashi keeps automatic launch behavior rather than preferring `cd`
- contextual `auto` resolves in this order: tmux → Herdr → cmux → integrated IDE → Kitty → parent-shell `cd` → terminal application/platform fallback
- in a cmux-managed terminal, automatic launch creates and focuses a cmux workspace at the exact selected worktree
- Arashi recognizes cmux from a non-empty `CMUX_WORKSPACE_ID` or `CMUX_SURFACE_ID`; `CMUX_SOCKET_PATH` alone does not activate cmux behavior
- cmux launch requires cmux v0.64.18 or newer, the `cmux workspace create` command, and local socket access
- cmux command, socket, malformed JSON, or missing workspace identifier failures return `LAUNCH_FAILED` without opening standalone Ghostty
- explicit IDE or sesh launch choices keep precedence, and an active tmux session nested inside cmux keeps tmux behavior
- explicit `--tmux` requires a non-empty trimmed `TMUX`, overrides configured and detected launch behavior, and never falls back to another launcher
- explicit `--herdr` selects Herdr outside a managed pane; conflicting explicit launcher flags and `--cd --herdr` are rejected
- with no explicit or configured launcher, trimmed `HERDR_ENV` must equal exactly `1` to select Herdr automatically; automatic tmux remains earlier, while Herdr is earlier than cmux, IDE, and terminal fallbacks
- positively detected Kitty is automatic only, requires Kitty 0.43+ with permitted remote control, and reports `mode: "kitty"`; there is no explicit Kitty launcher flag, and `kitty` is not a persisted create or switch mode
- once managed Kitty is selected, version, permission, state, duplicate, focus, or launch failure reports actionable `LAUNCH_FAILED` detail and does not fall back to another launcher
- `aw switch --cd` changes the current shell directory when invoked through the installed shell wrapper; without shell integration it warns and does not launch an alternate context
- `--launch` preserves a configured `sesh` or `herdr` launcher while forcing launch behavior
- `--ignore-configured-launcher` alone bypasses only a configured `sesh` or `herdr` launcher; it preserves configured or contextual `auto`, `cd`, or `launch` behavior and does not independently force or prevent parent-shell `cd`
- The exact generic automatic-launch request is `--launch --ignore-configured-launcher`; explicit launcher and tab selectors remain authoritative and keep their prerequisite, failure, and no-fallback policy
- `--repos` matches repository names first (exact match preferred)
- `--repos` with no matches lists available child repositories
- `--path` matches one exact worktree path and skips fuzzy branch/path matching
- `--vscode`, `--cursor`, and `--kiro` override configured switch defaults for a single invocation
- when shell integration is inactive, explicit `--cd` warns without launching another context; configured `mode: "cd"` warns and falls back to automatic launch
- compatible editor hosts can pass the matching switch flag automatically when running Arashi through the extension
- extension-driven switch selections use exact path mode so duplicate branch names do not create ambiguous CLI matches

### Launch disposition (`--tab`)

Default launch opens a new window or independent managed session. `--tab` is a one-shot CLI-only launch disposition on `switch` and `create`; it is never persisted in `.arashi/config.json`, and the existing create/switch configuration contracts remain unchanged. A tab request preserves the selected app, profile, shell, and cwd and never silently falls back to a window, another launcher, or a generic terminal.

`switch --tab` expresses explicit launch intent. It overrides configured or contextual parent-shell `cd` and bypasses configured launcher defaults, so it uses automatic launcher resolution without another override. It conflicts only with explicit `--cd` and composes with canonical `--launch`, `--ignore-configured-launcher`, and launcher selectors such as `--vscode`, `--cursor`, `--kiro`, `--tmux`, `--sesh`, and `--herdr`; an explicit selector remains authoritative while `--tab` controls its disposition, and the selected adapter decides capability. `switch --tab --launch` and `switch --tab --ignore-configured-launcher` are compatible same-intent combinations. `switch --tab --json` returns `JSON_UNSUPPORTED_FOR_MODE` with `details.mode: "launch"` and exits `2`.

For create, the complete precedence examples are:

```bash
# tab intent implies both launch and selection
aw create feature-auth --tab

# positive tab intent wins over both negative flags
aw create feature-auth --tab --no-launch --no-switch

# positive launch/switch flags are compatible and redundant with tab intent
aw create feature-auth --tab --launch
aw create feature-auth --tab --switch

# preview the resolved tab launch without mutation
aw create feature-auth --tab --dry-run
```

`create --tab` implies launch and switch, bypasses configured generic or editor-scoped launch defaults, wins over `--no-launch` and `--no-switch`, and uses automatic contextual launcher resolution unless `--tmux`, `--sesh`, or `--herdr` explicitly selects the adapter. `create --tab --launch` and `create --tab --switch` are compatible. `create --tab --json` returns `JSON_UNSUPPORTED_FOR_MODE` with `details.mode: "interactive-or-launch"` and exits `1`. Both JSON guards run before option or context validation, and stdout remains exactly one JSON document. After authoritative workspace/config resolution, a knowable unsupported tab request fails before managed-ignore reconciliation, hooks, branch creation, or worktree creation. Dry-run previews tab intent without mutation and does not require runtime-only session evidence. If a supported launch is attempted but fails at runtime, Arashi reports partial failure, preserves every successfully created worktree, and does not retry as a window or another launcher.
Managed context outranks the outer terminal. For example, Ghostty inside tmux uses a tmux window; Ghostty inside Herdr uses a Herdr tab; cmux uses a workspace (its vertical-tab equivalent). Bare macOS Ghostty 1.3+ uses a Ghostty tab. Bare Terminal.app returns `TAB_DISPOSITION_UNSUPPORTED` before target preflight, AppleScript, command execution, or fallback launch. To use a true Terminal.app tab, press Command-T manually, then run `aw switch --cd`; this requires active Arashi shell integration. To request normal automatic launch, run `aw switch --launch --ignore-configured-launcher` directly; it opens a new Terminal window when automatic launcher resolution selects Terminal.app. Bare Git Bash/MinTTY returns an actionable `TAB_DISPOSITION_UNSUPPORTED` and does not fall back to a new window. An automatically detected IDE whose CLI is unavailable continues canonical terminal/platform resolution; after that resolution, apply the selected launcher's tab mapping or capability, and do not classify the unavailable IDE as a selected unsupported IDE.

For WezTerm and Herdr, an empty or missing exact pane/workspace identifier is unsupported. iTerm2 and macOS Ghostty require an exact target window, and Ghostty also requires supported-version evidence. Any missing target or supported-version evidence returns `TAB_DISPOSITION_UNSUPPORTED` before any process, automation, or fallback attempt. Denied or failed automation for a supported macOS tab adapter returns `LAUNCH_FAILED` and never falls back to a new window, another launcher, or generic terminal. Denied or failed read-only macOS automation preflight for a supported tab adapter returns `LAUNCH_FAILED` before create mutation or switch launch, with no fallback. Across every supported row, preserve the selected app/profile, current shell, and exact cwd; pass paths as distinct process arguments or through a static data-only automation protocol, strip shell-directive state from launched children, and never interpolate user-derived paths or commands into shell or AppleScript source.

Configured and implicit-standalone `switch --tab` and `create --tab` use the same resolver and failure semantics. Standalone invocations do not create or persist `.arashi` configuration; they use the already discovered standalone worktree layout without synthesizing configured defaults.

Default Herdr launch continues to use `herdr worktree open` and requires a non-bare source checkout. `--tab --herdr` instead runs `herdr tab create` in the active workspace identified by `HERDR_WORKSPACE_ID` and does not require a non-bare source checkout.
Configure the default with `"switch": { "mode": "auto" }`. For `defaults.switch.mode`, choose exactly one of `auto`, `cd`, `launch`, `sesh`, and `herdr`:

- `auto` prefers strictly detected managed contexts in the order tmux → Herdr → cmux → integrated IDE → Kitty, then uses parent-shell `cd` when shell integration is active, and otherwise continues to terminal application/platform fallback.
- `cd` requests parent-shell switching. A configured `cd` warns and falls back to automatic launch when shell integration is unavailable; an explicit `--cd` instead warns without launching another context.
- `launch` always enters automatic launcher selection and does not prefer `cd`.
- `sesh` and `herdr` choose that explicit launcher regardless of detected context or shell integration.
Use `aw shell install` to enable parent-shell switching for bash, zsh, or fish, or `aw shell init <shell>` for manual setup.

Precedence for create/switch launch behavior is: explicit flag > opt-out flag > config default > built-in default. `--tmux` is a per-invocation-only override: configured `auto` remains the persistent contextual path to plain tmux. In zero-config standalone and configured repositories alike, explicit tmux requires a non-empty trimmed `TMUX` and does not fall back after prerequisite or process failure.

For switch, `--tmux` conflicts with `--cd` and any explicit launcher in `--sesh`, `--herdr`, `--vscode`, `--cursor`, or `--kiro`. `--tmux --launch` is compatible launch intent, and `--tmux --ignore-configured-launcher` keeps explicit tmux authoritative while bypassing configured launchers. For create, `--tmux` implies launch and target selection: `--tmux --no-launch` and `--tmux --no-switch` still create and launch the primary worktree, while create `--tmux` conflicts with `--sesh` or `--herdr`.

Both `switch --json --tmux` and `create --json --tmux` return one structured `JSON_UNSUPPORTED_FOR_MODE` document before context validation, conflicts, launch, hooks, or repository mutation. Switch retains its `launch` mode label; create retains its `interactive-or-launch` mode label. A missing tmux context therefore creates nothing. A `tmux new-window` process failure after successful create preserves successfully created worktrees and does not try another launcher.

The configured vocabularies do not gain `tmux`: `defaults.switch.mode` still accepts only `auto`, `cd`, `launch`, `sesh`, and `herdr`, while `defaults.create.launch` still accepts only `none`, `auto`, `sesh`, and `herdr`. Configured `auto` can continue choosing plain tmux contextually.

For switch, `--launch` forces launch while preserving a configured explicit launcher. `--ignore-configured-launcher` bypasses only configured `sesh` or `herdr`; it leaves configured `auto`, `cd`, and `launch` behavior intact. Do not combine switch `--herdr` with `--sesh` or an IDE launcher, or either Herdr flag with `--json`.
### cmux troubleshooting and agent safety

- Do not invent or export `CMUX_WORKSPACE_ID` / `CMUX_SURFACE_ID` to force cmux behavior; run from an actual cmux-managed terminal.
- Do not treat `CMUX_SOCKET_PATH` alone as proof of an active cmux terminal.
- Verify the required CLI contract with `cmux workspace create --help`; update to cmux v0.64.18 or newer if the namespaced command, `--cwd`, `--focus`, or `--json` is unavailable.
- If cmux reports socket access failure, check that access is not **Off**. The default **cmux processes only** mode is sufficient for an Arashi process launched inside cmux.
- Treat `LAUNCH_FAILED` as a real failed launch. Do not retry by opening Ghostty manually unless the user asks for a different terminal.
- For unattended agent workflows, continue to use `--no-launch --no-switch`; automatic cmux launching is interactive user-facing behavior.
- Canonical workflow reference: `https://arashi.haphazard.dev/workflows/cmux/`.

### Herdr launch contract and safety

- `switch --herdr` opens or focuses the selected existing worktree. `create --herdr` creates worktrees first and then opens the primary worktree; launch failure preserves every successful Git creation.
- Configure switch with `defaults.switch.mode: "herdr"`; configure generic or matching editor-scoped create with `launch: "herdr"`. `--ignore-configured-launcher` bypasses configured switch Herdr for one invocation; `--no-launch` suppresses configured create launch.
- Arashi resolves the repository's absolute non-bare main checkout for Herdr `--cwd`. Do not substitute a linked worktree or a bare repository; a missing source fails actionably without another launcher.
- The approved argv contract is `herdr worktree open --cwd <source-checkout> --path <existing-worktree> --label '<repo-name>: <branch-name>' --focus --json`. Paths and labels are separate process arguments, not shell-interpolated text.
- This default workspace-launch contract is distinct from `--tab --herdr`: tab disposition uses `herdr tab create` in the active workspace, requires a non-empty exact `HERDR_WORKSPACE_ID`, and does not resolve or require the non-bare source checkout used by `herdr worktree open`.
- A first open and an already-open response are both successful when Herdr returns a validated `worktree_opened` result with a workspace ID. Repeated launch focuses the existing workspace and reapplies the deterministic label.
- Arashi owns Git worktree creation and removal. Never substitute `herdr worktree create`, `herdr worktree remove`, or `herdr workspace create`.
- `aw remove` intentionally leaves Herdr workspaces untouched. For opt-in cleanup, resolve the workspace ID before removal and use `herdr workspace close <workspace-id>` in a pre-remove hook; automatic closure is unsafe because the workspace may contain agents or unsaved terminal state.
- Canonical workflow reference: `https://arashi.haphazard.dev/workflows/herdr/`.
## Session Navigation (Optional)

For tmux/sesh and worktree jump shortcuts, use [Session Shortcuts](../session-shortcuts.md).
