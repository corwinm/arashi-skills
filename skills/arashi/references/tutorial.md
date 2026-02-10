# End-to-End Tutorial

Follow this tutorial to go from zero setup to one successful Arashi workflow.

## Step 1: Preflight

```bash
git --version
npm --version
git ls-remote https://github.com/corwinm/arashi.git
```

Success criteria:

- commands return exit code `0`
- network check returns remote refs

## Step 2: Install Arashi CLI

```bash
npm install -g arashi
```

Alternative:

```bash
curl -L https://github.com/corwinm/arashi/releases/latest/download/arashi-macos-arm64 -o arashi
chmod +x arashi
sudo mv arashi /usr/local/bin/arashi
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
- `arashi status` prints repository/worktree status without errors

## Step 5: Optional Session Shortcut Flow

```bash
cd "$(arashi list | fzf)"
sesh connect "$(arashi list | fzf)"
```

Use this step only when `fzf` and `sesh` are installed.

## Step 6: Simulate and Recover

If `arashi` is not on `PATH`, run:

```bash
arashi --version
```

Expected failure: `command not found`.

Recovery path:

1. reinstall Arashi (`npm install -g arashi`)
2. open a new shell
3. rerun `arashi --version`

Tutorial is complete when one workflow succeeds end-to-end and failure recovery works.
