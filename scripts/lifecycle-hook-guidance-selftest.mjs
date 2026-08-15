#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceSkillRoot = join(repositoryRoot, "skills", "arashi");
const contract = JSON.parse(
  readFileSync(
    join(repositoryRoot, "contracts", "lifecycle-hook-guidance.json"),
    "utf8",
  ),
);
const skillRootArgumentIndex = process.argv.indexOf("--skill-root");
const suppliedSkillRoot =
  skillRootArgumentIndex >= 0
    ? process.argv[skillRootArgumentIndex + 1]
    : undefined;
if (skillRootArgumentIndex >= 0 && !suppliedSkillRoot) {
  throw new Error("--skill-root requires a path");
}

function validateSkill(root, label) {
  for (const relativePath of contract.requiredFiles) {
    assert.ok(
      existsSync(join(root, relativePath)),
      `${label}/${relativePath} is missing`,
    );
  }

  for (const [relativePath, expectedTexts] of Object.entries(
    contract.surfaces,
  )) {
    const content = readFileSync(join(root, relativePath), "utf8");
    for (const expected of expectedTexts) {
      assert.ok(
        content.includes(expected),
        `${label}/${relativePath} is missing ${JSON.stringify(expected)}`,
      );
    }
  }

  const guidanceFiles = collectInstallableGuidanceFiles(root);
  const allGuidance = guidanceFiles.map(({ content }) => content).join("\n");
  for (const pattern of contract.forbiddenPatterns) {
    assert.doesNotMatch(
      allGuidance,
      new RegExp(pattern, "i"),
      `${label} contains forbidden lifecycle-hook guidance matching ${pattern}`,
    );
  }

  for (const { content, relativePath } of guidanceFiles) {
    for (const variable of contract.unsupportedEnvironmentVariables ?? []) {
      for (const sentence of semanticSentences(content)) {
        if (advertisesUnsupportedVariable(sentence, variable)) {
          assert.fail(
            `${label}/${relativePath} affirmatively advertises unsupported lifecycle-hook variable ${variable}: ${sentence}`,
          );
        }
      }
    }
  }

  for (const line of allGuidance.split("\n")) {
    if (
      /hooks\.input/i.test(line) &&
      !/there is no persistent `?hooks\.input`?/i.test(line)
    ) {
      assert.fail(
        `${label} publishes contradictory persistent hooks.input guidance: ${line.trim()}`,
      );
    }
  }
  for (const { content, relativePath } of guidanceFiles) {
    for (const command of unsupportedHookInputCommands(content)) {
      assert.fail(
        `${label}/${relativePath} publishes unsupported ${command} --no-hook-input guidance; the option belongs only to create and remove`,
      );
    }
  }

  const skill = readFileSync(join(root, "SKILL.md"), "utf8");
  assert.doesNotMatch(
    skill,
    /ARASHI_HOOK_TARGET|ARASHI_REMOVE_TARGETS_JSON|powershell\.exe|cmd\.exe/,
    `${label}/SKILL.md must remain a routing surface; detailed hook semantics belong in references`,
  );
}

function collectInstallableGuidanceFiles(root, current = root) {
  const files = [];
  for (const entry of readdirSync(current, { withFileTypes: true })) {
    const absolutePath = join(current, entry.name);
    if (entry.isDirectory())
      files.push(...collectInstallableGuidanceFiles(root, absolutePath));
    else if (/\.(?:md|txt|json)$/i.test(entry.name)) {
      files.push({
        content: readFileSync(absolutePath, "utf8"),
        relativePath: relative(root, absolutePath),
      });
    }
  }
  return files;
}

function semanticSentences(content) {
  return content
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/\n/g, " "))
    .split(/(?<=[.!?])\s+|\n{2,}/)
    .map((sentence) => sentence.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function contrastClauses(sentence) {
  return sentence
    .split(/\s*(?:;|\b(?:although|but|however|though|whereas|while|yet)\b[:,]?)\s*/i)
    .filter(Boolean);
}

function actionIsNegated(clause, actionIndex) {
  const prefix = clause.slice(0, actionIndex).toLowerCase();
  if (
    /\b(?:does?|do|is|are|was|were|will|must|should|can|may)\s+not(?:\s+\w+){0,3}\s*$/.test(
      prefix,
    ) ||
    /\bnever(?:\s+\w+){0,2}\s*$/.test(prefix)
  ) {
    return true;
  }
  const lastNot = Math.max(prefix.lastIndexOf(" not "), prefix.lastIndexOf(" never "));
  if (lastNot === -1) return false;
  const sharedScope = prefix.slice(lastNot);
  return /\b(?:or|nor)\b/.test(sharedScope) && !/\band\b/.test(sharedScope);
}

function advertisesUnsupportedVariable(sentence, variable) {
  const escaped = variable.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!new RegExp(`\\b${escaped}\\b`, "i").test(sentence)) return false;
  if (new RegExp(`${escaped}\\s*=`, "i").test(sentence)) return true;

  return contrastClauses(sentence).some((clause) => {
    if (!new RegExp(`\\b${escaped}\\b`, "i").test(clause)) return false;
    for (const match of clause.matchAll(
      /\b(?:export|exports|exported|provide|provides|provided|set|sets|define|defines|defined|populate|populates|expose|exposes)\b/gi,
    )) {
      if (!actionIsNegated(clause, match.index)) return true;
    }
    return false;
  });
}

function unsupportedHookInputCommands(content) {
  const unsupported = new Set();
  const actionablePatterns = [
    /\barashi\s+([a-z][a-z0-9-]*)\b(?:(?!\barashi\s+[a-z][a-z0-9-]*\b)[^\n])*?--no-hook-input\b/gi,
    /\b(add|clone|completion|config|doctor|exec|handoff|init|install|list|move|prune|pull|push|setup|shell|status|switch|sync|update)\s+--no-hook-input\b/gi,
  ];
  for (const pattern of actionablePatterns) {
    for (const match of content.matchAll(pattern)) {
      const command = match[1].toLowerCase();
      if (command !== "create" && command !== "remove")
        unsupported.add(command);
    }
  }
  return [...unsupported];
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

    const timeout =
      "The default lifecycle-hook timeout is `300000` milliseconds";
    assert.equal(
      hooks.split(timeout).length - 1,
      1,
      "deliberate drift requires exactly one timeout contract sentence",
    );
    writeFileSync(
      hooksPath,
      hooks.replace(timeout, "The timeout depends on the hook scope"),
    );
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

    writeFileSync(hooksPath, hooks);
    const commandsPath = join(driftSkillRoot, "references", "commands.md");
    const commands = readFileSync(commandsPath, "utf8");
    writeFileSync(
      commandsPath,
      `${commands}\nPowerShell hooks use -NonInteractive.\n`,
    );
    assert.throws(
      () => validateSkill(driftSkillRoot, "deliberate-powershell-drift"),
      /-NonInteractive/,
      "checker accepted stale PowerShell invocation outside the required surfaces",
    );

    writeFileSync(
      commandsPath,
      `${commands}\nConfigure hooks.input: auto for prompts.\n`,
    );
    assert.throws(
      () => validateSkill(driftSkillRoot, "deliberate-persistent-input-drift"),
      /persistent hooks\.input guidance/,
      "checker accepted contradictory persistent hook-input guidance",
    );

    writeFileSync(
      commandsPath,
      `${commands}\nRun status --no-hook-input before creating a worktree.\n`,
    );
    assert.throws(
      () =>
        validateSkill(driftSkillRoot, "deliberate-unsupported-command-drift"),
      /status --no-hook-input/,
      "checker accepted --no-hook-input guidance for an unsupported command",
    );
    writeFileSync(
      commandsPath,
      `${commands}\nRun \`arashi status\` before \`arashi create topic --no-hook-input\`.\n`,
    );
    assert.doesNotThrow(
      () => validateSkill(driftSkillRoot, "valid-multiple-command-guidance"),
      "checker associated --no-hook-input with an earlier command invocation",
    );

    writeFileSync(
      commandsPath,
      `${commands}\nRun \`arashi create topic\` before \`arashi status --no-hook-input\`.\n`,
    );
    assert.throws(
      () => validateSkill(driftSkillRoot, "invalid-multiple-command-guidance"),
      /status --no-hook-input/,
      "checker missed --no-hook-input on a later unsupported command invocation",
    );

    writeFileSync(commandsPath, commands);
    const tutorialPath = join(driftSkillRoot, "references", "tutorial.md");
    const tutorial = readFileSync(tutorialPath, "utf8");
    writeFileSync(
      tutorialPath,
      `${tutorial}\nArashi does not provide ARASHI_BASE_BRANCH to lifecycle hooks.\nLifecycle hooks never export ARASHI_BASE_BRANCH.\n`,
    );
    assert.doesNotThrow(
      () => validateSkill(driftSkillRoot, "valid-negated-base-variable-guidance"),
      "lifecycle checker rejected legitimate negated ARASHI_BASE_BRANCH guidance",
    );

    for (const [index, claim] of [
      "Arashi provides ARASHI_BASE_BRANCH to lifecycle hooks.",
      "Lifecycle hooks export ARASHI_BASE_BRANCH for create.",
      "Set ARASHI_BASE_BRANCH=feature/base in create hooks.",
    ].entries()) {
      writeFileSync(tutorialPath, `${tutorial}\n${claim}\n`);
      assert.throws(
        () => validateSkill(driftSkillRoot, `invalid-base-variable-${index}`),
        /ARASHI_BASE_BRANCH/,
        `lifecycle checker accepted affirmative ARASHI_BASE_BRANCH guidance: ${claim}`,
      );
    }
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
