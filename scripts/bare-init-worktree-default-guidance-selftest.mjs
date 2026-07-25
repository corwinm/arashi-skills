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
    "references/tutorial.md",
    [
      "non-bare repositories default to `.arashi/worktrees`",
      "canonical bare repositories default to `..`",
      "An explicit `--worktrees-dir` overrides either default",
      "persisted value remains authoritative",
    ],
  ],
  [
    "references/commands.md",
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
  [
    "references/workflows.md",
    [
      "non-bare configured init defaults to `.arashi/worktrees`",
      "canonical bare configured init defaults to `..`",
      "explicit `--worktrees-dir` overrides either default",
      "Later commands use the persisted config value",
      "parent default as external and unsafe",
      "bare-root subdirectories as non-applicable",
      "local, tracked, or none",
      "without `git check-ignore` or ignore-file writes",
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

function validateWorkflowWiring() {
  const workflowRequirements = new Map([
    [
      ".github/workflows/security-audit.yml",
      [
        /^\s*node scripts\/bare-init-worktree-default-guidance-selftest\.mjs\s*$/m,
        /^\s*tar -czf arashi-skill-package\.tar\.gz skills\/\s*$/m,
        /^\s*tar -xzf arashi-skill-package\.tar\.gz -C package-check\s*$/m,
        /^\s*node scripts\/bare-init-worktree-default-guidance-selftest\.mjs --skill-root package-check\/skills\/arashi\s*$/m,
      ],
    ],
    [
      ".github/workflows/release-security-gate.yml",
      [
        /^\s*node scripts\/bare-init-worktree-default-guidance-selftest\.mjs\s*$/m,
        /^\s*run: tar -czf arashi-skill-package\.tar\.gz skills\/ README\.md LICENSE security\/\s*$/m,
        /^\s*tar -xzf arashi-skill-package\.tar\.gz -C package-check\s*$/m,
        /^\s*node scripts\/bare-init-worktree-default-guidance-selftest\.mjs --skill-root package-check\/skills\/arashi\s*$/m,
      ],
    ],
  ]);

  for (const [relativePath, expectedPatterns] of workflowRequirements) {
    const content = readFileSync(join(repositoryRoot, relativePath), "utf8");
    for (const expected of expectedPatterns) {
      assert.match(content, expected, `${relativePath} is missing ${expected}`);
    }
  }
}

function main() {
  if (suppliedSkillRoot) {
    validateSkill(resolve(suppliedSkillRoot), "package");
    console.log("bare init worktree-default guidance self-test passed for packaged skill");
    return;
  }

  validateSkill(sourceSkillRoot, "source");
  validateWorkflowWiring();

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
