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
    "references/commands.md",
    [
      '"mode": "auto"',
      "`auto`, `cd`, `launch`, `sesh`, and `herdr`",
      "tmux → Herdr → cmux → integrated IDE → parent-shell `cd` → terminal application/platform fallback",
      "arashi switch --no-cd",
      "arashi switch --no-default-launch",
      "`--no-default-launch` bypasses only configured `sesh` or `herdr`",
      "`launchMode` and `launch_mode`",
      "`cd` plus `sesh` or `herdr`",
      "actionable migration error",
      "one migration warning",
    ],
  ],
  [
    "references/workflows.md",
    [
      '`defaults.switch.mode: "herdr"`',
      "tmux → Herdr → cmux → integrated IDE",
      "parent-shell `cd`",
      "terminal/platform fallback",
    ],
  ],
  [
    "references/session-shortcuts.md",
    [
      "arashi switch --no-cd",
      "tmux → Herdr → cmux → integrated IDE → parent-shell `cd` → terminal/platform fallback",
      "configured explicit `sesh` or `herdr` mode",
    ],
  ],
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
    join(root, "references", "commands.md"),
    "utf8",
  );
  assert.doesNotMatch(
    commands,
    /"switch"\s*:\s*\{[^}]*"launchMode"/s,
    `${label} still advertises defaults.switch.launchMode in a canonical example`,
  );
  assert.doesNotMatch(
    commands,
    /Configured `launchMode: "herdr"` is supported for switch/,
    `${label} still gives canonical switch launchMode advice`,
  );
  assert.doesNotMatch(
    commands,
    /"create"\s*:\s*\{[^}]*"launch"\s*:\s*(?:true|false)[^}]*"launchMode"/s,
    `${label} still advertises the legacy two-field create model`,
  );
  assert.match(
    commands,
    /"create"\s*:\s*\{[^}]*"launch"\s*:\s*"herdr"/s,
    `${label} must use the canonical create launch field`,
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
