# End-to-End Tutorial

Follow this tutorial to go from zero setup to one successful Arashi workflow.

## Step 1: Preflight

```bash
git --version
curl --version
command -v shasum || command -v sha256sum || command -v openssl
git ls-remote https://github.com/corwinm/arashi.git
```

Success criteria:

- commands return exit code `0`
- network check returns remote refs

## Step 2: Install Arashi CLI

```bash
curl -fsSL https://arashi.haphazard.dev/install | bash
```

Fallback (all platforms):

```bash
npm install -g arashi
```

## Step 3: Verify CLI

```bash
arashi --version
arashi --help
```

Success criteria:

- both commands exit `0`
- help output lists commands

## Step 4: Run First Workflow

```bash
arashi init
arashi status
```

Success criteria:

- `.arashi/config.json` exists after `arashi init`
- `.arashi/config.json` includes `worktreesDir` (default `.arashi/worktrees`)
- `.gitignore` includes `.arashi/worktrees/` when using default worktree location
- `arashi status` prints repository/worktree status without errors

If you use `arashi init --worktrees-dir <path>`, add that custom location to `.gitignore` manually when needed.

## Step 5: Optional Session Shortcut Flow

```bash
arashi switch
arashi switch --repos docs
arashi switch --sesh
```

Use `--sesh` only when running inside tmux with `sesh` installed.

## Step 6: Optional Remove Hook Setup

```bash
cp .arashi/hooks/pre-remove.sh.example .arashi/hooks/pre-remove.sh
chmod +x .arashi/hooks/pre-remove.sh

# optional final cleanup hook
cp .arashi/hooks/post-remove.sh.example .arashi/hooks/post-remove.sh
chmod +x .arashi/hooks/post-remove.sh
```

Use these hooks to automate teardown tasks (for example tmux session cleanup) around `arashi remove`.

## Step 7: Simulate and Recover

If `arashi` is not on `PATH`, run:

```bash
arashi --version
```

Expected failure: `command not found`.

Recovery path:

1. reinstall Arashi (`curl -fsSL https://arashi.haphazard.dev/install | bash`)
2. open a new shell
3. if curl path is unavailable, use fallback `npm install -g arashi`
4. rerun `arashi --version`

Tutorial is complete when one workflow succeeds end-to-end and failure recovery works.
