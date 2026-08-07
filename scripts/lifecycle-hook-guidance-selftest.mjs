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
const contract = JSON.parse(
  readFileSync(join(repositoryRoot, "contracts", "lifecycle-hook-guidance.json"), "utf8"),
);
const skillRootArgumentIndex = process.argv.indexOf("--skill-root");
const suppliedSkillRoot =
  skillRootArgumentIndex >= 0 ? process.argv[skillRootArgumentIndex + 1] : undefined;
if (skillRootArgumentIndex >= 0 && !suppliedSkillRoot) {
  throw new Error("--skill-root requires a path");
}

function validateSkill(root, label) {
  for (const relativePath of contract.requiredFiles) {
    assert.ok(existsSync(join(root, relativePath)), `${label}/${relativePath} is missing`);
  }

  const guidance = [];
  for (const [relativePath, expectedTexts] of Object.entries(contract.surfaces)) {
    const content = readFileSync(join(root, relativePath), "utf8");
    guidance.push(content);
    for (const expected of expectedTexts) {
      assert.ok(
        content.includes(expected),
        `${label}/${relativePath} is missing ${JSON.stringify(expected)}`,
      );
    }
  }

  const allGuidance = guidance.join("\n");
  for (const pattern of contract.forbiddenPatterns) {
    assert.doesNotMatch(
      allGuidance,
      new RegExp(pattern, "i"),
      `${label} contains forbidden lifecycle-hook guidance matching ${pattern}`,
    );
  }

  const skill = readFileSync(join(root, "SKILL.md"), "utf8");
  assert.doesNotMatch(
    skill,
    /ARASHI_HOOK_TARGET|ARASHI_REMOVE_TARGETS_JSON|powershell\.exe|cmd\.exe/,
    `${label}/SKILL.md must remain a routing surface; detailed hook semantics belong in references`,
  );
}

function validateWorkflowWiring() {
  for (const relativePath of [
    ".github/workflows/security-audit.yml",
    ".github/workflows/release-security-gate.yml",
  ]) {
    const workflow = readFileSync(join(repositoryRoot, relativePath), "utf8");
    assert.match(
      workflow,
      /^\s*(?:run:\s*)?node scripts\/lifecycle-hook-guidance-selftest\.mjs\s*$/m,
      `${relativePath} does not run the authored lifecycle-hook guidance check`,
    );
    assert.match(
      workflow,
      /^\s*node scripts\/lifecycle-hook-guidance-selftest\.mjs --skill-root package-check\/skills\/arashi\s*$/m,
      `${relativePath} does not run the extracted-package lifecycle-hook guidance check`,
    );
    assert.match(
      workflow,
      /^\s*(?:run:\s*)?tar -czf arashi-skill-package\.tar\.gz skills\/(?: README\.md LICENSE security\/)?\s*$/m,
      `${relativePath} does not create the release-shaped archive`,
    );
    assert.match(
      workflow,
      /^\s*tar -xzf arashi-skill-package\.tar\.gz -C package-check\s*$/m,
      `${relativePath} does not extract the archive before packaged validation`,
    );
  }
}

function validateDeliberateDrift() {
  const driftRoot = mkdtempSync(join(tmpdir(), "arashi-hook-guidance-drift-"));
  try {
    const driftSkillRoot = join(driftRoot, "arashi");
    cpSync(sourceSkillRoot, driftSkillRoot, { recursive: true });
    const hooksPath = join(driftSkillRoot, "references", "hooks.md");
    const hooks = readFileSync(hooksPath, "utf8");

    const timeout = "The default lifecycle-hook timeout is `300000` milliseconds";
    assert.equal(
      hooks.split(timeout).length - 1,
      1,
      "deliberate drift requires exactly one timeout contract sentence",
    );
    writeFileSync(hooksPath, hooks.replace(timeout, "The timeout depends on the hook scope"));
    assert.throws(
      () => validateSkill(driftSkillRoot, "deliberate-timeout-drift"),
      /default lifecycle-hook timeout/,
      "checker accepted deliberate timeout drift",
    );

    writeFileSync(hooksPath, hooks);
    const row =
      "| Repository `pre-create.<repo>` | After that child worktree is materialized, before its repository setup | New child worktree |";
    assert.equal(
      hooks.split(row).length - 1,
      1,
      "deliberate drift requires exactly one repository pre-create lifecycle row",
    );
    writeFileSync(
      hooksPath,
      hooks.replace(
        row,
        "| Repository `pre-create.<repo>` | Before child worktree materialization | Configured workspace root |",
      ),
    );
    assert.throws(
      () => validateSkill(driftSkillRoot, "deliberate-timing-drift"),
      /Repository `pre-create\.<repo>`/,
      "checker accepted deliberate repository hook timing/cwd drift",
    );

    writeFileSync(hooksPath, hooks);
    const inputMode =
      "`ARASHI_HOOK_INPUT` is executor-owned and is always `tty`, `disabled`, or `unavailable`";
    assert.equal(
      hooks.split(inputMode).length - 1,
      1,
      "deliberate drift requires exactly one hook-input mode contract sentence",
    );
    writeFileSync(
      hooksPath,
      hooks.replace(inputMode, "Hook input mode depends on the active shell"),
    );
    assert.throws(
      () => validateSkill(driftSkillRoot, "deliberate-input-mode-drift"),
      /ARASHI_HOOK_INPUT/,
      "checker accepted deliberate hook-input mode drift",
    );
  } finally {
    rmSync(driftRoot, { recursive: true, force: true });
  }
}

function main() {
  if (suppliedSkillRoot) {
    validateSkill(resolve(suppliedSkillRoot), "package");
    console.log("lifecycle-hook guidance self-test passed for packaged skill");
    return;
  }

  validateSkill(sourceSkillRoot, "source");
  validateWorkflowWiring();
  validateDeliberateDrift();
  console.log(
    `lifecycle-hook guidance self-test passed for source, workflows, and deliberate drift (${Object.keys(contract.surfaces).length} surfaces)`,
  );
}

main();
