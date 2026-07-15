#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skillRootArgumentIndex = process.argv.indexOf("--skill-root");
const skillRoot =
  skillRootArgumentIndex >= 0
    ? resolve(process.argv[skillRootArgumentIndex + 1] ?? "")
    : join(repositoryRoot, "skills", "arashi");
if (skillRootArgumentIndex >= 0 && !process.argv[skillRootArgumentIndex + 1]) {
  throw new Error("--skill-root requires a path");
}

const workflow = readFileSync(join(skillRoot, "references", "workflows.md"), "utf8");
const match = workflow.match(
  /Equivalent manual bootstrap, run from anywhere in the repository:\s*```bash\n([\s\S]*?)\n```/
);
assert.ok(match, "manual standalone bootstrap shell block is missing");
const bootstrap = match[1];
const roots = [];

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function repository(label) {
  const root = mkdtempSync(join(tmpdir(), `arashi-manual-${label}-`));
  roots.push(root);
  git(root, "init", "-b", "main");
  return root;
}

function runBootstrap(root, env = {}) {
  return spawnSync("sh", ["-c", bootstrap], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, ...env }
  });
}

try {
  {
    const root = repository("success");
    const result = runBootstrap(root);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(existsSync(join(root, ".worktrees")), "success must create .worktrees");
    assert.match(
      readFileSync(join(root, ".git", "info", "exclude"), "utf8"),
      /^\.worktrees\/$/m,
      "success must add the repository-local exclude rule"
    );
    assert.ok(!existsSync(join(root, ".arashi")), "manual bootstrap must not create .arashi");
  }

  {
    const root = repository("configured");
    mkdirSync(join(root, ".arashi"));
    writeFileSync(join(root, ".arashi", "config.json"), "{}\n");
    const exclude = join(root, ".git", "info", "exclude");
    const before = readFileSync(exclude, "utf8");
    const result = runBootstrap(root);
    assert.notEqual(result.status, 0, "configured repository must be rejected");
    assert.ok(!existsSync(join(root, ".worktrees")), "configured rejection must not mutate");
    assert.equal(readFileSync(exclude, "utf8"), before, "configured rejection must preserve exclude");
  }

  {
    const root = repository("symlink");
    const exclude = join(root, ".git", "info", "exclude");
    const target = join(root, "exclude-target");
    writeFileSync(target, "sentinel\n");
    rmSync(exclude);
    symlinkSync(target, exclude);
    const result = runBootstrap(root);
    assert.notEqual(result.status, 0, "symlinked exclude must be rejected");
    assert.ok(lstatSync(exclude).isSymbolicLink(), "exclude symlink must remain intact");
    assert.equal(readFileSync(target, "utf8"), "sentinel\n", "symlink target must remain unchanged");
    assert.ok(!existsSync(join(root, ".worktrees")), "symlink rejection must not create .worktrees");
  }

  {
    const root = repository("rollback");
    const exclude = join(root, ".git", "info", "exclude");
    const before = readFileSync(exclude, "utf8");
    const bin = join(root, "bin");
    mkdirSync(bin);
    const wrapper = join(bin, "git");
    const realGit = execFileSync("which", ["git"], { encoding: "utf8" }).trim();
    writeFileSync(
      wrapper,
      `#!/bin/sh\nif [ "$1" = check-ignore ]; then exit 1; fi\nexec '${realGit}' "$@"\n`
    );
    chmodSync(wrapper, 0o755);
    const result = runBootstrap(root, { PATH: `${bin}:${process.env.PATH ?? ""}` });
    assert.notEqual(result.status, 0, "failed final ignore verification must fail");
    assert.ok(!existsSync(join(root, ".worktrees")), "rollback must remove its empty .worktrees");
    assert.equal(readFileSync(exclude, "utf8"), before, "rollback must restore exclude contents");
  }

  console.log("manual standalone bootstrap self-test passed");
} finally {
  for (const root of roots) rmSync(root, { force: true, recursive: true });
}
