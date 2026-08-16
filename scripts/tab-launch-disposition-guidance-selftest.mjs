#!/usr/bin/env node

import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

const expectedGuidance = [
  "new window or independent managed session",
  "`--tab` is a one-shot CLI-only launch disposition",
  "never persisted in `.arashi/config.json`",
  "arashi switch --tab feature-auth",
  "arashi switch --tab --vscode feature-auth",
  "arashi switch --tab --herdr feature-auth",
  "`switch --tab` expresses explicit launch intent",
  "overrides configured or contextual parent-shell `cd`",
  "bypasses configured launcher defaults",
  "conflicts only with explicit `--cd`",
  "`switch --tab --json` returns `JSON_UNSUPPORTED_FOR_MODE`",
  '`details.mode: "launch"`',
  "arashi create feature-auth --tab",
  "arashi create feature-auth --tab --no-launch --no-switch",
  "arashi create feature-auth --tab --dry-run",
  "`create --tab` implies launch and switch",
  "`create --tab --json` returns `JSON_UNSUPPORTED_FOR_MODE`",
  '`details.mode: "interactive-or-launch"`',
  "preserves every successfully created worktree",
  "does not retry as a window or another launcher",
  "TAB_DISPOSITION_UNSUPPORTED",
  "LAUNCH_FAILED",
  "pass paths as distinct process arguments or through a static data-only automation protocol",
  "Default Herdr launch continues to use `herdr worktree open`",
  "`--tab --herdr` instead runs `herdr tab create`",
];

function validateSkill(root, label) {
  const commands = readFileSync(
    join(root, "references", "commands", "switch-and-launch.md"),
    "utf8",
  );
  for (const expected of expectedGuidance) {
    assert.ok(
      commands.includes(expected),
      `${label}/references/commands/switch-and-launch.md is missing ${JSON.stringify(expected)}`,
    );
  }

  assert.doesNotMatch(
    commands,
    /```json[\s\S]*?"command"\s*:\s*"(?:switch|create)"/,
    `${label} still embeds exact tab-refusal JSON envelopes`,
  );
  assert.doesNotMatch(
    commands,
    /\| Launcher\/context \| Default `window` disposition \| Explicit `tab` disposition \|/,
    `${label} still embeds the exhaustive launcher implementation matrix`,
  );

  const skill = readFileSync(join(root, "SKILL.md"), "utf8");
  assert.doesNotMatch(
    skill,
    /TAB_DISPOSITION|--tab/,
    `${label}/SKILL.md must remain minimal; disposition details belong in the switch reference`,
  );
}

function validateRepositoryContracts() {
  for (const contractName of ["create-launch-config.json", "switch-config.json"]) {
    const contractText = readFileSync(
      join(repositoryRoot, "contracts", contractName),
      "utf8",
    );
    assert.doesNotMatch(
      contractText,
      /"tab"|--tab/,
      `${contractName} must not persist the one-shot --tab disposition`,
    );
  }

  const coverage = JSON.parse(
    readFileSync(join(repositoryRoot, "contracts", "command-coverage.json"), "utf8"),
  );
  for (const commandName of ["create", "switch"]) {
    const command = coverage.commands.find(({ name }) => name === commandName);
    assert.ok(command, `command coverage is missing ${commandName}`);
    assert.ok(
      command.requiredOptions?.includes("--tab"),
      `${commandName} command coverage is missing --tab`,
    );
  }
}

function validateDeliberateDrift() {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "arashi-tab-guidance-"));
  try {
    const packagedSkillRoot = join(temporaryRoot, "arashi");
    cpSync(sourceSkillRoot, packagedSkillRoot, { recursive: true });
    const commandsPath = join(
      packagedSkillRoot,
      "references",
      "commands",
      "switch-and-launch.md",
    );
    const original = readFileSync(commandsPath, "utf8");
    const expected = "`--tab` is a one-shot CLI-only launch disposition";
    assert.equal(original.split(expected).length - 1, 1, "drift marker must occur once");
    writeFileSync(
      commandsPath,
      original.replace(expected, "`--tab` is a persisted launch disposition"),
    );
    assert.throws(
      () => validateSkill(packagedSkillRoot, "deliberate drift"),
      /one-shot CLI-only launch disposition/,
    );
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

function main() {
  if (suppliedSkillRoot) {
    validateSkill(resolve(suppliedSkillRoot), "package");
    console.log("tab launch-disposition guidance self-test passed for packaged skill");
    return;
  }

  validateSkill(sourceSkillRoot, "source");
  validateRepositoryContracts();
  validateDeliberateDrift();
  console.log("tab launch-disposition guidance self-test passed for source, contracts, and deliberate drift");
}

main();
