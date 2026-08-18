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
      "installed `aw --help` and `aw <command> --help` are the parameter authority",
      "`-v/--verbose`, `-f/--force`, `-j/--json`, `-o/--only`, `-g/--group`, and `-n/--dry-run`",
      "`add -n/--name` remains command-local name syntax",
      "`exec --jobs` remains long-only",
      "Deprecated compatibility syntax remains accepted throughout Arashi 1.x",
      "removal is no earlier than 2.0 and requires a separately approved breaking-change issue",
      "`--no-cd` maps to `--launch`",
      "`--no-default-launch` maps to `--ignore-configured-launcher`",
      "Markdown is the default",
      "omit the deprecated compatibility spelling `--markdown`",
      "Arashi-generated programmable completion, not shell-builtin completion",
    ],
  ],
  [
    "references/commands/automation.md",
    [
      "accept repeated occurrences, comma-separated values, or both",
      "encounter order, trims whitespace, ignores blank segments beside valid values, and deduplicates by first occurrence",
      "Explicitly supplied selectors that normalize to empty, unknown values, and valid filters with no matches fail closed",
      "`--only` and `--group` intersect",
      "`status --only` is configured-workspace-only",
    ],
  ],
  [
    "references/commands/switch-and-launch.md",
    [
      "aw switch --launch feature-auth",
      "aw switch --launch --ignore-configured-launcher feature-auth",
      "`--launch` preserves a configured `sesh` or `herdr` launcher",
      "`--ignore-configured-launcher` alone bypasses only a configured `sesh` or `herdr` launcher",
      "does not independently force or prevent parent-shell `cd`",
      "The exact generic automatic-launch request is `--launch --ignore-configured-launcher`",
    ],
  ],
  [
    "references/commands/setup.md",
    [
      "`update --check` conflicts with `--dry-run` and `-n`",
      "before release lookup, installer planning, package-manager execution, binary replacement, or mutation",
      "both the native Commander path and the npm-managed wrapper path",
      "Bare `update --json` is inspection-only",
      "never prompts or applies an update",
      "`update --json --yes` returns one `JSON_UNSUPPORTED_FOR_MODE` envelope",
    ],
  ],
  ["references/session-shortcuts.md", ["commands/switch-and-launch.md"]],
  ["references/tutorial.md", ["commands/switch-and-launch.md"]],
]);

function validateDeprecatedUsage(root, label) {
  for (const relativePath of walkFiles(root)) {
    const content = readFileSync(join(root, relativePath), "utf8");
    const lines = content.split("\n");
    lines.forEach((line, index) => {
      const cliGuidance = line.replaceAll("git-bash.exe --no-cd", "");
      if (!/--no-cd|--no-default-launch|--markdown/.test(cliGuidance)) {
        return;
      }
      assert.match(
        cliGuidance,
        /[Dd]eprecated compatibility/,
        `${label}/${relativePath}:${index + 1} teaches deprecated CLI syntax outside explicit compatibility metadata`,
      );
      assert.doesNotMatch(
        cliGuidance,
        /\barashi\s+[^`\n]*(?:--no-cd|--no-default-launch|--markdown)/,
        `${label}/${relativePath}:${index + 1} teaches actionable deprecated CLI syntax`,
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
  const setup = readFileSync(
    join(root, "references", "commands", "setup.md"),
    "utf8",
  );
  assert.ok(
    setup.includes(
      "Bare `update --json` is inspection-only in both paths: it reports the update plan in one envelope and never prompts or applies an update.",
    ),
    `${label}/references/commands/setup.md has invalid bare update JSON policy`,
  );
  assert.ok(
    setup.includes(
      "`update --json --yes` returns one `JSON_UNSUPPORTED_FOR_MODE` envelope for installer apply before mutation.",
    ),
    `${label}/references/commands/setup.md has invalid JSON apply policy`,
  );
  validateDeprecatedUsage(root, label);
}


function validateDeliberateDrift() {
  const driftRoot = mkdtempSync(join(tmpdir(), "arashi-cli-guidance-drift-"));
  try {
    const packagedSkillRoot = join(driftRoot, "arashi");
    cpSync(sourceSkillRoot, packagedSkillRoot, { recursive: true });

    const switchPath = join(
      packagedSkillRoot,
      "references",
      "commands",
      "switch-and-launch.md",
    );
    const originalSwitch = readFileSync(switchPath, "utf8");
    const launchSemantic =
      "The exact generic automatic-launch request is `--launch --ignore-configured-launcher`";
    assert.equal(originalSwitch.split(launchSemantic).length - 1, 1);
    writeFileSync(
      switchPath,
      originalSwitch.replace(
        launchSemantic,
        "The exact generic automatic-launch request is `--ignore-configured-launcher` alone",
      ),
    );
    assert.throws(
      () => validateSkill(packagedSkillRoot, "deliberate-launch-drift"),
      /exact generic automatic-launch request/,
    );
    writeFileSync(switchPath, originalSwitch);

    const setupPath = join(packagedSkillRoot, "references", "commands", "setup.md");
    const originalSetup = readFileSync(setupPath, "utf8");
    writeFileSync(setupPath, originalSetup.replace("in both paths", "in the native path only"));
    assert.throws(
      () => validateSkill(packagedSkillRoot, "deliberate-native-only-json"),
      /invalid bare update JSON policy/,
    );
    writeFileSync(setupPath, originalSetup.replace("before mutation.", "after mutation."));
    assert.throws(
      () => validateSkill(packagedSkillRoot, "deliberate-after-mutation-json-apply"),
      /invalid JSON apply policy/,
    );
    writeFileSync(setupPath, originalSetup);

    const skillPath = join(packagedSkillRoot, "SKILL.md");
    const originalSkill = readFileSync(skillPath, "utf8");
    writeFileSync(skillPath, `${originalSkill}
Preferred shortcut: run \`aw switch --no-cd\`.
`);
    assert.throws(
      () => validateSkill(packagedSkillRoot, "deliberate-deprecated-guidance"),
      /deprecated CLI syntax outside explicit compatibility metadata/,
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
  validateDeliberateDrift();
  console.log(
    `CLI flag rationalization guidance self-test passed for source and deliberate drift (${requirements.size} surfaces)`,
  );
}

main();
