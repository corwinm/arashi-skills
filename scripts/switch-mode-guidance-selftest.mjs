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
  skillRootArgumentIndex >= 0
    ? process.argv[skillRootArgumentIndex + 1]
    : undefined;
if (skillRootArgumentIndex >= 0 && !suppliedSkillRoot) {
  throw new Error("--skill-root requires a path");
}

const requirements = new Map([
  [
    "references/commands/switch-and-launch.md",
    [
      '"mode": "auto"',
      "`auto`, `cd`, `launch`, `sesh`, and `herdr`",
      "tmux → Herdr → cmux → integrated IDE → Kitty → parent-shell `cd` → terminal application/platform fallback",
      "aw switch --launch feature-auth",
      "aw switch --ignore-configured-launcher feature-auth",
      "`--ignore-configured-launcher` bypasses only configured `sesh` or `herdr`",
    ],
  ],
  ["references/workflows.md", ["commands/switch-and-launch.md"]],
  ["references/session-shortcuts.md", ["commands/switch-and-launch.md"]],
]);

function validateSkill(root, label) {
  for (const [relativePath, expectedTexts] of requirements) {
    const content = readFileSync(join(root, relativePath), "utf8");
    for (const expected of expectedTexts) {
      assert.ok(
        content.includes(expected),
        `${label}/${relativePath} is missing ${JSON.stringify(expected)}`,
      );
    }
  }

  const commands = readFileSync(
    join(root, "references", "commands", "switch-and-launch.md"),
    "utf8",
  );
  assert.doesNotMatch(
    commands,
    /launchMode|launch_mode|Legacy switch-default migration/,
    `${label} still exposes legacy switch-default migration sediment`,
  );
}

function main() {
  if (suppliedSkillRoot) {
    validateSkill(resolve(suppliedSkillRoot), "package");
    console.log(
      `switch mode guidance self-test passed for packaged skill (${requirements.size} surfaces)`,
    );
    return;
  }

  validateSkill(sourceSkillRoot, "source");

  const packageRoot = mkdtempSync(
    join(tmpdir(), "arashi-switch-skill-package-"),
  );
  try {
    const packagedSkillRoot = join(packageRoot, "arashi");
    cpSync(sourceSkillRoot, packagedSkillRoot, { recursive: true });
    validateSkill(packagedSkillRoot, "package");
  } finally {
    rmSync(packageRoot, { recursive: true, force: true });
  }

  console.log(
    `switch mode guidance self-test passed for source and packaged skill (${requirements.size} surfaces)`,
  );
}

main();
