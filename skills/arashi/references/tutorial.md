# End-to-End Tutorial

Follow this tutorial to go from zero setup to one successful Arashi workflow.

## Step 1: Preflight

```bash
git --version
npm --version
command -v shasum || command -v sha256sum || command -v openssl
git ls-remote https://github.com/corwinm/arashi.git
```

Success criteria:

- commands return exit code `0`
- network check returns remote refs

## Step 2: Install Arashi CLI

```bash
npm install --global arashi@1.7.0
```

Optional verified release artifact flow (macOS/Linux):

```bash
ARASHI_VERSION="1.7.0"
ARASHI_ASSET="arashi-macos-arm64"
curl -L "https://github.com/corwinm/arashi/releases/download/v${ARASHI_VERSION}/${ARASHI_ASSET}" -o "${ARASHI_ASSET}"
curl -L "https://github.com/corwinm/arashi/releases/download/v${ARASHI_VERSION}/arashi-checksums.txt" -o arashi-checksums.txt
grep " ${ARASHI_ASSET}$" arashi-checksums.txt | shasum -a 256 -c -
install -m 0755 "${ARASHI_ASSET}" "$HOME/.local/bin/arashi"
```

## Step 3: Verify CLI

```bash
arashi --version
arashi --help
```

Success criteria:

- all commands exit `0`
- help output lists commands

## Step 4: Run First Workflow

```bash
arashi init
arashi status
```

Success criteria:

- `.arashi/config.json` exists after `arashi init`
- `.arashi/config.json` includes `worktreesDir` (default `.arashi/worktrees`)
- worktree paths (default and custom) are not auto-included in `.gitignore`
- `arashi status` prints repository/worktree status without errors

## Step 5: Optional Session Shortcut Flow

```bash
arashi switch
arashi switch --repos docs
arashi switch --sesh
arashi switch --no-default-launch
```

Use `--sesh` only when running inside tmux with `sesh` installed.
Use `--no-default-launch` when your workspace config has switch launch defaults you want to skip for one invocation.

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
Use these hooks to automate teardown tasks (for example tmux session cleanup) around `arashi remove`.

## Step 7: Simulate and Recover

If `arashi` is not on `PATH`, run:

```bash
arashi --version
```

Expected failure: `command not found`.

Recovery path:

1. reinstall Arashi (`npm install --global arashi@1.7.0`)
2. open a new shell
3. if npm path is unavailable, use verified release artifact install from Step 2
4. rerun `arashi --version`

Tutorial is complete when one workflow succeeds end-to-end and failure recovery works.
