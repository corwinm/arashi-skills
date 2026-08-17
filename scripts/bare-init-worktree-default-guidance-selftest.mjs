#!/usr/bin/env node

import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceSkillRoot = join(repositoryRoot, "skills", "arashi");
const skillRootArgumentIndex = process.argv.indexOf("--skill-root");
const suppliedSkillRoot =
  skillRootArgumentIndex >= 0 ? process.argv[skillRootArgumentIndex + 1] : undefined;

if (skillRootArgumentIndex >= 0 && !suppliedSkillRoot) {
  throw new Error("--skill-root requires a path");
}

const requirements = new Map([
  [
    "SKILL.md",
    [
      "references/commands/workspace.md",
      "bare repositories report administrative paths without editing ignore files",
    ],
  ],
  [
    "references/commands/workspace.md",
    [
      "canonical bare repository",
      "defaults to `..`",
      "non-bare repository",
      "defaults to `.arashi/worktrees`",
      "explicit `--worktrees-dir` wins",
      "existing configured value remains authoritative",
      "external and unsafe",
      "non-applicable to working-tree ignore rules",
      "does not run `git check-ignore`",
      "or write `.gitignore` or the common local exclude file",
      "`local`, `tracked`, and `none`",
      "clone-local scope preference",
      "In non-bare repositories, `local` writes only",
      "Bare repositories are the exception",
    ],
  ],
]);

function validateSkill(root, label) {
  const guidance = [];

  for (const [relativePath, expectedTexts] of requirements) {
    const content = readFileSync(join(root, relativePath), "utf8");
    guidance.push(content);

    for (const expected of expectedTexts) {
      assert.ok(
        content.toLowerCase().includes(expected.toLowerCase()),
        `${label}/${relativePath} is missing ${JSON.stringify(expected)}`,
      );
    }
  }

  const allGuidance = guidance.join("\n");
  assert.doesNotMatch(
    allGuidance,
    /default `worktreesDir` is `\.arashi\/worktrees` when the option is omitted|`worktreesDir` \(default `\.arashi\/worktrees`\)|records `worktreesDir` \(default `\.arashi\/worktrees`\)/i,
    `${label} still states an unconditional .arashi/worktrees default`,
  );

  assert.doesNotMatch(
    allGuidance,
    /^- `(?:local|tracked)` writes only/m,
    `${label} still states an unconditional ignore-file write outcome`,
  );
}


function main() {
  if (suppliedSkillRoot) {
    validateSkill(resolve(suppliedSkillRoot), "package");
    console.log("bare init worktree-default guidance self-test passed for packaged skill");
    return;
  }

  validateSkill(sourceSkillRoot, "source");

  const packageRoot = mkdtempSync(join(tmpdir(), "arashi-bare-init-skill-package-"));
  try {
    const packagedSkillRoot = join(packageRoot, "arashi");
    cpSync(sourceSkillRoot, packagedSkillRoot, { recursive: true });
    validateSkill(packagedSkillRoot, "package");
  } finally {
    rmSync(packageRoot, { recursive: true, force: true });
  }

  console.log("bare init worktree-default guidance self-test passed for source and packaged skill");
}

main();
