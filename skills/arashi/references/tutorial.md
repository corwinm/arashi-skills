# End-to-End Tutorial

Follow this tutorial to go from zero setup to one successful Arashi workflow.

## Step 1: Preflight

```bash
git --version
git ls-remote https://github.com/corwinm/arashi.git
```

Success criteria:

- commands return exit code `0`
- network check returns remote refs

## Step 2: Install Arashi CLI

Use the website install guide and follow the instructions for your platform:

- https://arashi.haphazard.dev

If you use the official curl installer, it can offer shell integration during install so `arashi switch --cd` works without an extra setup step. For unattended installs, use `ARASHI_SHELL_INTEGRATION=yes` or `ARASHI_SHELL_INTEGRATION=no`.

## Step 3: Verify CLI

```bash
arashi --version
arashi --help
```

Success criteria:

- all commands exit `0`
- if `arashi --version` exits immediately or returns `137`, stop and reinstall using a pinned version from the website guide
- help output lists commands

## Step 4: Run First Workflow

Choose where you want the workspace repository to live before running `arashi init`:

- Existing repository flow: `cd` into the repository root and run `arashi init` there.
- New repository flow: `cd` into a parent directory, run `arashi init`, then enter `.` or a child name when prompted.

Bootstrap the current directory:

```bash
mkdir my-arashi-workspace
cd my-arashi-workspace
arashi init
# prompt: Repository target ('.' for current directory or a child directory name) -> .
arashi status
```

Bootstrap a child directory from a parent folder:

```bash
mkdir scratch
cd scratch
arashi init
# prompt: Repository target ('.' for current directory or a child directory name) -> my-arashi-repo
cd my-arashi-repo
arashi status
```

If you already have a repository, the shorter flow still works:

```bash
arashi init
arashi status
```

Success criteria:

- `.arashi/config.json` exists after `arashi init`
- `.arashi/config.json` includes `worktreesDir` (default `.arashi/worktrees`)
- the repository target prompt accepts `.` for the current directory and a simple child name for child-directory bootstrap
- safe configured repository and worktree directories are effectively ignored; missing rules default to the repository-local exclude file rather than tracked `.gitignore`
- existing effective tracked, repository-local, or global rules are honored without duplication, and Arashi never writes global Git configuration
- `arashi status` prints repository/worktree status without errors

## Step 5: Optional Session Shortcut Flow

```bash
arashi switch
arashi switch --repos docs
arashi switch --cursor feature-auth
arashi switch --tmux feature-auth
arashi switch --sesh
arashi switch --no-cd
arashi switch --no-default-launch
```

Use `--sesh` only when running inside tmux with `sesh` installed.
Use `--tmux` inside an active tmux client or session for deterministic plain tmux launch. It is a per-invocation override in configured and zero-config standalone repositories; for example, `arashi create feature-auth --tmux` creates and then launches the primary worktree.
Use `--vscode`, `--cursor`, or `--kiro` when you want a one-off IDE launch without changing workspace defaults.
Use `--no-cd` to force launch behavior for one invocation. Use `--no-default-launch` to bypass a configured explicit `sesh` or `herdr` switch mode; it does not erase configured `auto`, `cd`, or `launch` behavior.

## Step 6: Optional Remove Hook Setup

```bash
# workspace-root hook
cp .arashi/hooks/pre-remove.sh.example .arashi/hooks/pre-remove.sh

# optional final cleanup hook
cp .arashi/hooks/post-remove.sh.example .arashi/hooks/post-remove.sh

# optional repo-scoped hook
mkdir -p repos/<repo>/.arashi/hooks
cp .arashi/hooks/pre-remove.sh.example repos/<repo>/.arashi/hooks/pre-remove.sh

# optional global shared hook
mkdir -p ~/.arashi/hooks
cp .arashi/hooks/pre-remove.sh.example ~/.arashi/hooks/pre-remove.sh
```

Before enabling these hooks, review script contents and keep commands limited to trusted operations for each scope.
Treat hook scripts as executable code: only enable scripts from trusted repositories and verify their contents before running `arashi remove`.
Use these hooks to automate teardown tasks (for example tmux session cleanup) around `arashi remove`.

## Step 7: Simulate and Recover

If `arashi` is not on `PATH`, run:

```bash
arashi --version
```

Expected failure: `command not found`.

Recovery path:

1. reinstall Arashi using the website instructions (`https://arashi.haphazard.dev`)
2. for npm installs, run `arashi install` to preinstall the platform binary
3. open a new shell
4. ensure the installed binary location is on `PATH`
5. rerun `arashi --version`

Tutorial is complete when one workflow succeeds end-to-end and failure recovery works.
