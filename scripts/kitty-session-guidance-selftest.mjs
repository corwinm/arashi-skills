#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceSkillRoot = join(repositoryRoot, "skills", "arashi");
const skillRootArgumentIndex = process.argv.indexOf("--skill-root");
const suppliedSkillRoot =
  skillRootArgumentIndex >= 0
    ? process.argv[skillRootArgumentIndex + 1]
    : undefined;

if (skillRootArgumentIndex >= 0 && !suppliedSkillRoot) {
  throw new Error("--skill-root requires a path");
}

const requirements = new Map([
  [
    "references/prerequisites.md",
    ["Kitty 0.43+", "kitten --version", "remote control", "allow_remote_control"],
  ],
  [
    "references/commands/switch-and-launch.md",
    [
      "tmux → Herdr → cmux → integrated IDE → Kitty → parent-shell `cd` → terminal application/platform fallback",
      '`mode: "kitty"`',
      "no explicit Kitty launcher flag",
      "not a persisted create or switch mode",
      "does not fall back",
    ],
  ],
  [
    "references/commands/create.md",
    [
      "tmux → Herdr → cmux → integrated IDE → Kitty → terminal/platform",
      "preserves every successfully created worktree",
    ],
  ],
  ["references/workflows.md", ["Kitty", "commands/switch-and-launch.md"]],
  ["references/session-shortcuts.md", ["commands/switch-and-launch.md"]],
  [
    "references/troubleshooting.md",
    [
      "Kitty 0.43+",
      "remote control",
      "LAUNCH_FAILED",
      "duplicate exact marked Kitty windows",
      "does not close ambiguous Kitty windows",
      "preserve the created worktrees",
    ],
  ],
]);

function validateSkill(root, label) {
  for (const [relativePath, expectedTexts] of requirements) {
    const path = join(root, relativePath);
    const content = readFileSync(path, "utf8");
    for (const expected of expectedTexts) {
      assert.ok(
        content.includes(expected),
        `${label}/${relativePath} is missing ${JSON.stringify(expected)}`,
      );
    }
  }

  for (const maintainerOnlyDirectory of ["scripts", "contracts"]) {
    assert.equal(
      existsSync(join(root, maintainerOnlyDirectory)),
      false,
      `${label} includes maintainer-only ${maintainerOnlyDirectory}/`,
    );
  }

  const allGuidance = [...requirements.keys()]
    .map((relativePath) => readFileSync(join(root, relativePath), "utf8"))
    .join("\n");
  assert.doesNotMatch(
    allGuidance,
    /arashi\s+(?:switch|create)[^\n`]*--kitty\b/,
    `${label} advertises an unsupported explicit --kitty launcher`,
  );
}

function validateSourceContracts() {
  const switchContract = JSON.parse(
    readFileSync(join(repositoryRoot, "contracts", "switch-config.json"), "utf8"),
  );
  assert.deepEqual(
    switchContract.autoOrder,
    ["tmux", "herdr", "cmux", "ide", "kitty", "cd", "platform"],
    "switch autoOrder must place Kitty after IDE and before cd/platform fallback",
  );

}

function validateDeliberateMismatch() {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "arashi-kitty-guidance-drift-"));
  try {
    const fixtureSkillRoot = join(fixtureRoot, "arashi");
    cpSync(sourceSkillRoot, fixtureSkillRoot, { recursive: true });
    const prerequisitesPath = join(fixtureSkillRoot, "references", "prerequisites.md");
    const prerequisites = readFileSync(prerequisitesPath, "utf8");
    assert.ok(prerequisites.includes("Kitty 0.43+"), "drift fixture precondition failed");
    writeFileSync(
      prerequisitesPath,
      prerequisites.replaceAll("Kitty 0.43+", "Kitty 0.42+"),
    );
    assert.throws(
      () => validateSkill(fixtureSkillRoot, "deliberate-mismatch"),
      /prerequisites\.md is missing "Kitty 0\.43\+"/,
      "deliberate out-of-repository Kitty version mismatch was not rejected",
    );
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

function main() {
  if (suppliedSkillRoot) {
    validateSkill(resolve(suppliedSkillRoot), "package");
    console.log(
      `Kitty session guidance self-test passed for packaged skill (${requirements.size} surfaces)`,
    );
    return;
  }

  validateSkill(sourceSkillRoot, "source");
  validateSourceContracts();
  validateDeliberateMismatch();
  console.log(
    `Kitty session guidance self-test passed for source contracts and deliberate mismatch (${requirements.size} surfaces)`,
  );
}

main();
