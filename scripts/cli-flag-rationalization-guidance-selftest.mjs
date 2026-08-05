#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
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
    "references/commands.md",
    [
      "installed `arashi --help` and `arashi <command> --help` are the parameter authority",
      "`-v/--verbose`, `-f/--force`, `-j/--json`, `-o/--only`, `-g/--group`, and `-n/--dry-run`",
      "`add -n/--name` remains command-local name syntax",
      "`exec --jobs` remains long-only",
      "accept repeated occurrences, comma-separated values, or both",
      "encounter order, trims whitespace, ignores blank segments beside valid values, and deduplicates by first occurrence",
      "Explicitly supplied selectors that normalize to empty, unknown values, and valid filters with no matches fail closed",
      "`--only` and `--group` intersect",
      "`status --only` is configured-workspace-only",
      "arashi switch --launch feature-auth",
      "arashi switch --launch --ignore-configured-launcher feature-auth",
      "`--launch` preserves a configured `sesh` or `herdr` launcher",
      "`--ignore-configured-launcher` alone bypasses only a configured `sesh` or `herdr` launcher",
      "does not independently force or prevent parent-shell `cd`",
      "The exact generic automatic-launch request is `--launch --ignore-configured-launcher`",
      "Deprecated compatibility syntax remains accepted throughout Arashi 1.x",
      "removal is no earlier than 2.0 and requires a separately approved breaking-change issue",
      "`--no-cd` maps to `--launch`",
      "`--no-default-launch` maps to `--ignore-configured-launcher`",
      "Markdown is the default",
      "omit deprecated `--markdown`",
      "`update --check` conflicts with `--dry-run` and `-n`",
      "before release lookup, installer planning, package-manager execution, binary replacement, or mutation",
      "both the native Commander path and the npm-managed wrapper path",
      "do not claim native shell completion",
    ],
  ],
  [
    "references/session-shortcuts.md",
    [
      "arashi switch --launch feature-auth",
      "arashi switch --ignore-configured-launcher feature-auth",
      "arashi switch --launch --ignore-configured-launcher feature-auth",
      "preserves a configured explicit `sesh` or `herdr` launcher",
      "does not independently force or prevent parent-shell `cd`",
    ],
  ],
  [
    "references/tutorial.md",
    [
      "arashi switch --launch feature-auth",
      "arashi switch --ignore-configured-launcher feature-auth",
      "arashi switch --launch --ignore-configured-launcher feature-auth",
      "configured `sesh` or `herdr` remains selected",
      "normal automatic launcher resolution",
    ],
  ],
]);

function validateDeprecatedUsage(root, label) {
  for (const relativePath of walkFiles(root)) {
    const content = readFileSync(join(root, relativePath), "utf8");
    const lines = content.split("\n");
    lines.forEach((line, index) => {
      if (!/--no-cd|--no-default-launch|handoff --markdown/.test(line)) {
        return;
      }
      if (/git-bash\.exe --no-cd/.test(line)) {
        return;
      }
      assert.match(
        line,
        /[Dd]eprecated compatibility/,
        `${label}/${relativePath}:${index + 1} teaches deprecated CLI syntax outside explicit compatibility metadata`,
      );
    });
  }
}

function walkFiles(root, directory = root) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) return walkFiles(root, absolutePath);
    return [absolutePath.slice(root.length + 1)];
  });
}

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
  validateDeprecatedUsage(root, label);
}

function validateWorkflowWiring() {
  const workflows = [
    ".github/workflows/security-audit.yml",
    ".github/workflows/release-security-gate.yml",
  ];
  for (const workflowPath of workflows) {
    const workflow = readFileSync(join(repositoryRoot, workflowPath), "utf8");
    assert.match(
      workflow,
      /^\s*(?:run:\s*)?node scripts\/cli-flag-rationalization-guidance-selftest\.mjs\s*$/m,
      `${workflowPath} does not run the source CLI flag rationalization self-test`,
    );
    assert.match(
      workflow,
      /^\s*node scripts\/cli-flag-rationalization-guidance-selftest\.mjs --skill-root package-check\/skills\/arashi\s*$/m,
      `${workflowPath} does not run the extracted-package CLI flag rationalization self-test`,
    );
    assert.match(
      workflow,
      /^\s*(?:run:\s*)?tar -czf arashi-skill-package\.tar\.gz skills\/(?: README\.md LICENSE security\/)?\s*$/m,
      `${workflowPath} does not create a release-shaped package before validation`,
    );
    assert.match(
      workflow,
      /^\s*tar -xzf arashi-skill-package\.tar\.gz -C package-check\s*$/m,
      `${workflowPath} does not extract the package before validation`,
    );
  }
}

function validateDeliberateDrift() {
  const driftRoot = mkdtempSync(join(tmpdir(), "arashi-cli-guidance-drift-"));
  try {
    const packagedSkillRoot = join(driftRoot, "arashi");
    cpSync(sourceSkillRoot, packagedSkillRoot, { recursive: true });
    const commandsPath = join(packagedSkillRoot, "references", "commands.md");
    const original = readFileSync(commandsPath, "utf8");
    const semantic =
      "The exact generic automatic-launch request is `--launch --ignore-configured-launcher`";
    assert.equal(
      original.split(semantic).length - 1,
      1,
      "drift fixture requires one exact generic-launch behavior statement",
    );
    writeFileSync(
      commandsPath,
      original.replace(
        semantic,
        "The exact generic automatic-launch request is `--ignore-configured-launcher` alone",
      ),
    );
    assert.throws(
      () => validateSkill(packagedSkillRoot, "deliberate-drift"),
      /exact generic automatic-launch request/,
      "checker accepted semantic drift that made launcher-ignore force generic launch",
    );
    writeFileSync(commandsPath, original);

    const skillPath = join(packagedSkillRoot, "SKILL.md");
    writeFileSync(
      skillPath,
      `${readFileSync(skillPath, "utf8")}\n\nPreferred shortcut: run \`arashi switch --no-cd\`.\n`,
    );
    assert.throws(
      () => validateSkill(packagedSkillRoot, "deliberate-deprecated-guidance"),
      /SKILL\.md.*deprecated CLI syntax outside explicit compatibility metadata/,
      "checker accepted actionable deprecated guidance outside the three edited references",
    );
  } finally {
    rmSync(driftRoot, { recursive: true, force: true });
  }
}

function main() {
  if (suppliedSkillRoot) {
    validateSkill(resolve(suppliedSkillRoot), "package");
    console.log("CLI flag rationalization guidance self-test passed for packaged skill");
    return;
  }

  validateSkill(sourceSkillRoot, "source");
  validateWorkflowWiring();
  validateDeliberateDrift();
  console.log(
    `CLI flag rationalization guidance self-test passed for source, workflows, and deliberate drift (${requirements.size} surfaces)`,
  );
}

main();
