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
  "arashi create feature-auth --launch",
  "arashi create feature-auth --sesh",
  "arashi create feature-auth --herdr",
  "arashi create feature-auth --no-launch",
  "arashi create feature-auth --no-switch",
  "`--sesh` or `--herdr` > `--launch` > `--no-launch` > matching configured `launch` > built-in `none`",
  "Terminal invocations use only `defaults.create`",
  "Editor-hosted invocations use only `defaults.editors.<host>.create`",
  "do not fall back to generic defaults or another editor host",
  "Configured launch is unsupported with `create --json`",
  "preserves every successfully created worktree",
  "does not fall back to another launcher",
  "Legacy create-default migration",
  "`launchMode` and `launch_mode`",
  "`launch: false` plus any legacy launcher is rejected",
  'canonical `launch: "none"`',
  "matching enabled mode",
];

const expectedContract = {
  schemaVersion: 1,
  canonicalField: "defaults.create.launch",
  modes: ["none", "auto", "sesh", "herdr"],
  absentMode: "none",
  switchIndependent: true,
  launchImpliesSwitch: true,
  editorHosts: ["vscode", "cursor", "kiro"],
  legacyFields: ["launch:boolean", "launchMode", "launch_mode"],
  legacyPolicy: {
    booleanTrue: "launcher-or-auto",
    booleanFalseWithoutLauncher: "none",
    booleanFalseWithLauncher: "reject",
    launcherWithoutBoolean: "launcher",
    equalAliases: "collapse",
    conflictingAliases: "reject",
    canonicalCompatibleLegacy: "preserve",
    canonicalConflictingLegacy: "reject",
  },
  explicitPrecedence: [
    "sesh-or-herdr",
    "launch",
    "no-launch",
    "config",
    "absent-none",
  ],
  configuredJsonLaunch: "reject-before-mutation",
};

function validateSkill(root, label) {
  const commands = readFileSync(
    join(root, "references", "commands.md"),
    "utf8",
  );
  for (const expected of expectedGuidance) {
    assert.ok(
      commands.includes(expected),
      `${label}/references/commands.md is missing ${JSON.stringify(expected)}`,
    );
  }

  const migrationHeading = commands.indexOf(
    "### Legacy create-default migration",
  );
  assert.ok(
    migrationHeading >= 0,
    `${label} is missing legacy create migration guidance`,
  );
  const canonicalGuidance = commands.slice(0, migrationHeading);
  assert.doesNotMatch(
    canonicalGuidance,
    /defaults\.create[^\n]*(?:launchMode|launch_mode)|"create"\s*:\s*\{[^}]*"launchMode"/s,
    `${label} still advertises create launchMode as canonical guidance`,
  );
  assert.doesNotMatch(
    canonicalGuidance,
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
