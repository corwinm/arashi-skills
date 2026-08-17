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

const expectedGuidance = [
  '"launch": "herdr"',
  "`none`, `auto`, `sesh`, or `herdr`",
  "independent `switch` boolean",
  "launch implies switch",
  "aw create feature-auth --launch",
  "aw create feature-auth --sesh",
  "aw create feature-auth --herdr",
  "aw create feature-auth --no-launch",
  "aw create feature-auth --no-switch",
  "`--sesh` or `--herdr` > `--launch` > `--no-launch` > matching configured `launch` > built-in `none`",
  "Terminal invocations use only `defaults.create`",
  "Editor-hosted invocations use only `defaults.editors.<host>.create`",
  "do not fall back to generic defaults or another editor host",
  "Configured launch is unsupported with `create --json`",
  "preserves every successfully created worktree",
  "does not fall back to another launcher",
];

const expectedContract = {
  schemaVersion: 1,
  canonicalField: "defaults.create.launch",
  modes: ["none", "auto", "sesh", "herdr"],
  absentMode: "none",
  switch: {
    field: "defaults.create.switch",
    type: "boolean",
    independent: true,
    launchImpliesSwitch: true,
  },
  editorHosts: ["vscode", "cursor", "kiro"],
  editorScope: "defaults.editors.<host>.create",
  editorScopeFallback: "none",
  cliPrecedence: [
    "explicit-launcher",
    "launch",
    "no-launch",
    "configured",
    "none",
  ],
  legacyFields: ["launch:boolean", "launchMode", "launch_mode"],
  acceptedMigrations: [
    "launcher-without-boolean",
    "true-with-absent-or-launcher",
    "false-without-launcher",
    "canonical-with-compatible-launcher",
    "equal-launcher-aliases",
  ],
  rejectedMigrations: [
    "false-with-launcher",
    "conflicting-launcher-aliases",
    "none-with-launcher",
    "auto-with-explicit-launcher",
    "opposite-explicit-launchers",
    "invalid-values",
  ],
  jsonRestrictedModes: ["auto", "sesh", "herdr"],
  failurePreservesCreatedWorktrees: true,
};

function validateSkill(root, label) {
  const commands = readFileSync(
    join(root, "references", "commands", "create.md"),
    "utf8",
  );
  for (const expected of expectedGuidance) {
    assert.ok(
      commands.includes(expected),
      `${label}/references/commands/create.md is missing ${JSON.stringify(expected)}`,
    );
  }

  assert.doesNotMatch(
    commands,
    /Legacy create-default migration|launchMode|launch_mode/,
    `${label}/references/commands/create.md still exposes legacy migration tables`,
  );
  assert.doesNotMatch(
    commands,
    /"create"\s*:\s*\{[^}]*"launch"\s*:\s*(?:true|false)/s,
    `${label} still advertises boolean create launch as canonical guidance`,
  );
}

function validateContract() {
  const contract = JSON.parse(
    readFileSync(
      join(repositoryRoot, "contracts", "create-launch-config.json"),
      "utf8",
    ),
  );
  assert.deepEqual(
    contract,
    expectedContract,
    "create launch semantic contract is stale",
  );
}

function main() {
  if (suppliedSkillRoot) {
    validateSkill(resolve(suppliedSkillRoot), "package");
    console.log("create launch guidance self-test passed for packaged skill");
    return;
  }

  validateSkill(sourceSkillRoot, "source");
  validateContract();

  const packageRoot = mkdtempSync(
    join(tmpdir(), "arashi-create-launch-skill-package-"),
  );
  try {
    const packagedSkillRoot = join(packageRoot, "arashi");
    cpSync(sourceSkillRoot, packagedSkillRoot, { recursive: true });
    validateSkill(packagedSkillRoot, "package");
  } finally {
    rmSync(packageRoot, { recursive: true, force: true });
  }

  console.log(
    "create launch guidance self-test passed for source, packaged skill, and contract",
  );
}

main();
