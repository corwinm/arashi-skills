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
    "references/session-shortcuts.md",
    [
      "arashi switch --tmux feature-auth",
      "arashi create feature-auth --tmux",
      "arashi switch --sesh",
      "active tmux",
      "non-empty after trimming",
      "does not fall back"
    ]
  ],
  [
    "references/tutorial.md",
    [
      "commands/switch-and-launch.md",
    ]
  ],
  [
    "references/troubleshooting.md",
    [
      "`--tmux` requires an active tmux client or session",
      "TMUX",
      "before creating worktrees",
      "does not fall back",
      "preserve the created worktrees"
    ]
  ],
  [
    "references/commands/switch-and-launch.md",
    [
      "arashi switch --tmux feature-auth",
      "arashi create feature-auth --tmux",
      "`--tmux` is a per-invocation-only override",
      "`--tmux --launch`",
      "`--tmux --ignore-configured-launcher`",
      "`--tmux --no-launch`",
      "`--tmux --no-switch`",
      "`--tmux` conflicts with `--cd`",
      "`--sesh`, `--herdr`, `--vscode`, `--cursor`, or `--kiro`",
      "create `--tmux` conflicts with `--sesh` or `--herdr`",
      "JSON_UNSUPPORTED_FOR_MODE",
      "`launch` mode label",
      "`interactive-or-launch` mode label",
      "configured `auto`",
      "zero-config standalone",
      "does not fall back",
      "preserves successfully created worktrees"
    ]
  ]
]);

function validateSkill(root, label) {
  for (const [relativePath, expectedTexts] of requirements) {
    const content = readFileSync(join(root, relativePath), "utf8");
    for (const expected of expectedTexts) {
      assert.ok(
        content.includes(expected),
        `${label}/${relativePath} is missing ${JSON.stringify(expected)}`
      );
    }
  }

  const commands = readFileSync(join(root, "references", "commands", "switch-and-launch.md"), "utf8");
  assert.match(
    commands,
    /defaults\.switch\.mode[^\n]*`auto`, `cd`, `launch`, `sesh`, and `herdr`/,
    `${label} must keep the configured switch vocabulary unchanged`
  );
  assert.match(
    commands,
    /defaults\.create\.launch[^\n]*`none`, `auto`, `sesh`, and `herdr`/,
    `${label} must keep the configured create launch vocabulary unchanged`
  );
  assert.doesNotMatch(
    commands,
    /"mode"\s*:\s*"tmux"|"launch"\s*:\s*"tmux"|"launchMode"\s*:\s*"tmux"/i,
    `${label} must not advertise tmux as a persisted mode`
  );
}

function validateCoverageContract() {
  const contract = JSON.parse(
    readFileSync(join(repositoryRoot, "contracts", "command-coverage.json"), "utf8")
  );
  const commands = new Map(contract.commands.map((command) => [command.name, command]));
  for (const commandName of ["switch", "create"]) {
    assert.ok(
      commands.get(commandName)?.requiredOptions?.includes("--tmux"),
      `${commandName} coverage must require --tmux`
    );
  }
}

function main() {
  if (suppliedSkillRoot) {
    validateSkill(resolve(suppliedSkillRoot), "package");
    console.log(
      `tmux launch guidance self-test passed for packaged skill (${requirements.size} surfaces)`
    );
    return;
  }

  validateSkill(sourceSkillRoot, "source");
  validateCoverageContract();

  const packageRoot = mkdtempSync(join(tmpdir(), "arashi-tmux-skill-package-"));
  try {
    const packagedSkillRoot = join(packageRoot, "arashi");
    cpSync(sourceSkillRoot, packagedSkillRoot, { recursive: true });
    validateSkill(packagedSkillRoot, "package");
  } finally {
    rmSync(packageRoot, { recursive: true, force: true });
  }

  console.log(
    `tmux launch guidance self-test passed for source, packaged skill, and command coverage (${requirements.size} surfaces)`
  );
}

main();
