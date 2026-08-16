#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceSkillRoot = join(repositoryRoot, "skills", "arashi");
const skillRootIndex = process.argv.indexOf("--skill-root");
const suppliedSkillRoot = skillRootIndex >= 0 ? process.argv[skillRootIndex + 1] : undefined;
if (skillRootIndex >= 0 && !suppliedSkillRoot) throw new Error("--skill-root requires a path");

const requiredHookGuidance = [
  "`hooks.scripts.<lifecycle>`",
  "`repos.<name>.hooks.<lifecycle>`",
  "`pre-create`, `post-create`, `pre-remove`, and `post-remove`",
  "A string is Bash shorthand",
  "`bash`, `powershell`, and `cmd`",
  "POSIX scans non-empty `PATH` entries in order for executable `bash`",
  "Windows selects `powershell`, then `cmd`, then `bash`",
  "`%SystemRoot%`",
  "`interpreter_unavailable`",
  "one logical location",
  "short reviewable commands",
  "substantial, reusable scripts",
  "`--no-hooks` is create-only and remove does not accept it",
  "`--no-hook-input` disables terminal input for that invocation without skipping hooks",
  "Remove dry-run keeps source-aware previews",
  "Configured-create dry-run performs no hook discovery, returns an empty hook ledger, and has no hook preview surface",
  "`sourceKind: \"inline-config\"`",
  "`sourceOwnerKind`",
  "`sourceOwnerName`",
  "`sourceScriptPath` is `null` or omitted",
  "Outcomes, previews, diagnostics, and logs never disclose snippet text",
  "Standalone and user-global hooks remain native-file only",
  "`$ARASHI_*`",
  "`$env:ARASHI_*`",
  "`%ARASHI_*%`",
  "fail-fast",
  "later success cannot mask an earlier failure",
  "Inline configuration is executable code",
  "do not embed or enter secrets",
  "File hooks receive `ARASHI_HOOK_SOURCE_PATH` as their absolute source path",
  "Inline hooks omit `ARASHI_HOOK_SOURCE_PATH`",
  "no path-like replacement is invented",
  "installed `arashi create --help` and `arashi remove --help`",
  "installed configuration schema",
];

function validateSkill(root, label) {
  const hooksPath = join(root, "references", "hooks.md");
  const hooks = readFileSync(hooksPath, "utf8");
  for (const required of requiredHookGuidance) {
    assert.ok(hooks.includes(required), `${label}/references/hooks.md is missing ${JSON.stringify(required)}`);
  }

  assert.match(
    hooks,
    /`hooks\.scripts\.<lifecycle>`[^\n]*workspace[^\n]*`repos\.<name>\.hooks\.<lifecycle>`[^\n]*repository/i,
    `${label}/references/hooks.md does not bind canonical owner paths to workspace and repository ownership`,
  );
  assert.match(
    hooks,
    /Windows selects `powershell`, then `cmd`, then `bash`[^\n]*unavailable[^\n]*next configured[^\n]*`interpreter_unavailable`/i,
    `${label}/references/hooks.md does not bind Windows interpreter order, availability fallback, and failure`,
  );
  assert.match(
    hooks,
    /Remove dry-run keeps source-aware previews[^\n]*Configured-create dry-run performs no hook discovery[^\n]*empty hook ledger[^\n]*no hook preview surface/i,
    `${label}/references/hooks.md does not bind the command-specific dry-run asymmetry`,
  );
  assert.match(
    hooks,
    /`sourceKind: "inline-config"`[^\n]*`sourceOwnerKind`[^\n]*`sourceOwnerName`[^\n]*`sourceScriptPath` is `null` or omitted[^\n]*never disclose snippet text/i,
    `${label}/references/hooks.md does not bind source metadata to no-disclosure`,
  );
  validateCopyableHookGuidance(hooks, `${label}/references/hooks.md`);

  const commands = readFileSync(join(root, "references", "commands.md"), "utf8");
  assert.match(commands, /installed `arashi --help` and `arashi <command> --help` are the parameter authority/i);

  for (const { content, relativePath } of installableGuidanceFiles(root)) {
    checkContradictions(content, `${label}/${relativePath}`);
  }

  const skill = readFileSync(join(root, "SKILL.md"), "utf8");
  assert.doesNotMatch(
    skill,
    /hooks\.scripts\.<lifecycle>|sourceOwnerKind|interpreter_unavailable/,
    `${label}/SKILL.md must remain a minimal router; inline-hook details belong in references`,
  );
}

function section(content, heading) {
  const start = content.indexOf(`## ${heading}`);
  assert.notEqual(start, -1, `missing ${heading} section`);
  const end = content.indexOf("\n## ", start + 1);
  return content.slice(start, end === -1 ? content.length : end);
}

function validateCopyableHookGuidance(hooks, label) {
  const problems = [];
  const configured = section(hooks, "Configured Inline Hooks");
  const jsonMatch = configured.match(/```json\s*\n([\s\S]*?)\n```/);
  assert.ok(jsonMatch, `${label} is missing the configured inline-hook JSON example`);
  const example = JSON.parse(jsonMatch[1]);
  const cmd = example?.hooks?.scripts?.["pre-create"]?.cmd;
  if (cmd !== "echo Inline pre-create hook running || exit /b 1") {
    problems.push("cmd example must avoid reflecting ARASHI_BRANCH_NAME or other unconstrained values into command text");
  }
  const nestedPnpm = example?.repos?.api?.hooks?.["post-create"];
  if (nestedPnpm !== "set -eu; CI=true corepack pnpm --ignore-workspace install --frozen-lockfile") {
    problems.push("nested pnpm child example must set CI=true and pass --ignore-workspace");
  }
  if (/\bDry-run previews discovery but does not spawn hooks or fabricate execution outcomes\./.test(hooks)) {
    problems.push("dry-run discovery guidance must not make an unscoped all-command claim");
  }
  if (!hooks.includes("Remove dry-run previews discovery but does not spawn hooks or fabricate execution outcomes.")) {
    problems.push("dry-run discovery guidance must be scoped to remove");
  }
  assert.deepEqual(problems, [], `${label} has unsafe or contradictory copyable guidance:\n- ${problems.join("\n- ")}`);
}

function isActionNegated(clause, actionIndex) {
  const prefix = clause.slice(Math.max(0, actionIndex - 64), actionIndex).toLowerCase();
  return /(?:\bnever\s+|\bavoid\s+|\b(?:do|does|must|should|can|may|will)\s+not(?:\s+\w+){0,3}\s+|\b(?:is|are|was|were)\s+not\s+|\bnot\s+to\s+)$/.test(prefix);
}

function splitClauses(statement) {
  return statement.split(/\s*(?:;|\bbut\b|\bhowever\b|\balthough\b|\bwhile\b|\byet\b)\s*/i).filter(Boolean);
}

function checkInlineSourcePathClaim(statement, label) {
  for (const clause of splitClauses(statement)) {
    if (!/inline(?:-config)?\s+hooks?|inline\s+sources?/i.test(clause) || !/ARASHI_HOOK_SOURCE_PATH/.test(clause)) continue;
    const behavior = /\b(?:receive[sd]?|provide[sd]?|export(?:s|ed)?|include[sd]?|set|available)\b/gi;
    const actions = [...clause.matchAll(behavior)];
    const explicitlyOmitted = /\b(?:omit(?:s|ted)?|unset|unavailable)\b|\bis\s+not\s+(?:set|available)\b/i.test(clause);
    if (actions.length === 0 ? !explicitlyOmitted : actions.some((match) => !isActionNegated(clause, match.index))) {
      assert.fail(`${label} teaches ARASHI_HOOK_SOURCE_PATH for inline hooks: ${clause.trim()}`);
    }
  }
}

function checkSecretGuidance(statement, label) {
  for (const clause of splitClauses(statement)) {
    if (!/\b(?:API\s+tokens?|tokens?|passwords?|credentials?|secrets?)\b/i.test(clause)) continue;
    if (!/\b(?:inline\s+(?:snippets?|configuration|hooks?)|external\s+script\s+paths?)\b/i.test(clause)) continue;
    const actions = /\b(?:embed(?:s|ded|ding)?|enter(?:s|ed|ing)?|store[sd]?|storing|place[sd]?|placing|put(?:s|ting)?|include[sd]?|including|save[sd]?|saving|write|writes|writing)\b/gi;
    for (const action of clause.matchAll(actions)) {
      if (!isActionNegated(clause, action.index)) {
        assert.fail(`${label} contains unsafe secret guidance: ${clause.trim()}`);
      }
    }
  }
}

function checkContradictions(content, label) {
  const statements = content
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/\n/g, " "))
    .split(/(?<=[.!?])\s+|\n+/);
  for (const statement of statements) {
    checkInlineSourcePathClaim(statement, label);
    checkSecretGuidance(statement, label);
    if (/"(?:pre|post)-(?:create|remove)\.[^"]+"\s*:/.test(statement)) {
      assert.fail(`${label} teaches an encoded repository lifecycle configuration key: ${statement.trim()}`);
    }
    if (/standalone[^.\n]{0,100}(?:loads?|supports?|executes?)[^.\n]{0,80}inline/i.test(statement)) {
      assert.fail(`${label} teaches inline hooks in standalone mode: ${statement.trim()}`);
    }
    if (/(?:outcomes|previews|diagnostics|logs)[^.\n]{0,120}(?:print|include|reveal|quote)[^.\n]{0,100}(?:snippet|command text)/i.test(statement)) {
      assert.fail(`${label} teaches snippet disclosure: ${statement.trim()}`);
    }
    if (/inline[^.\n]{0,100}(?:terminal|shell host)[^.\n]{0,80}(?:selects?|chooses?)[^.\n]{0,80}interpreter/i.test(statement)) {
      assert.fail(`${label} teaches terminal-driven interpreter selection: ${statement.trim()}`);
    }
  }
}

function installableGuidanceFiles(root) {
  const files = [];
  const visit = (directory) => {
    for (const name of readdirSync(directory).sort()) {
      const absolutePath = join(directory, name);
      if (statSync(absolutePath).isDirectory()) visit(absolutePath);
      else if (/\.(?:md|txt|json)$/i.test(name)) {
        const content = readFileSync(absolutePath, "utf8");
        if (/\.json$/i.test(name)) assert.doesNotThrow(() => JSON.parse(content), `${relative(root, absolutePath)} must be valid JSON`);
        files.push({ content, relativePath: relative(root, absolutePath) });
      }
    }
  };
  visit(root);
  return files;
}

function validateRegistration(root) {
  const manifestPath = join(root, "scripts", "guidance-checkers.json");
  const entries = JSON.parse(readFileSync(manifestPath, "utf8"));
  assert.ok(
    entries.includes("scripts/inline-lifecycle-hook-guidance-selftest.mjs"),
    "guidance-checkers.json must register the inline lifecycle-hook checker",
  );
}

function createCompleteFixture(root) {
  mkdirSync(join(root, "references"), { recursive: true });
  writeFileSync(join(root, "SKILL.md"), "# Fixture router\n");
  writeFileSync(
    join(root, "references", "commands.md"),
    "The installed `arashi --help` and `arashi <command> --help` are the parameter authority.\n",
  );
  const bindingLines = [
    "`hooks.scripts.<lifecycle>` is workspace ownership and `repos.<name>.hooks.<lifecycle>` is repository ownership.",
    "Windows selects `powershell`, then `cmd`, then `bash`; an unavailable entry falls through to the next configured entry and no available variant fails as `interpreter_unavailable`.",
    "Remove dry-run keeps source-aware previews; Configured-create dry-run performs no hook discovery, returns an empty hook ledger, and has no hook preview surface.",
    "`sourceKind: \"inline-config\"`, `sourceOwnerKind`, `sourceOwnerName`, and `sourceScriptPath` is `null` or omitted; Outcomes, previews, diagnostics, and logs never disclose snippet text.",
  ];
  const configuredExample = [
    "## Configured Inline Hooks",
    "```json",
    JSON.stringify({
      hooks: { scripts: { "pre-create": { cmd: "echo Inline pre-create hook running || exit /b 1" } } },
      repos: { api: { hooks: { "post-create": "set -eu; CI=true corepack pnpm --ignore-workspace install --frozen-lockfile" } } },
    }, null, 2),
    "```",
    "## Timeout and Failure Boundaries",
    "Remove dry-run previews discovery but does not spawn hooks or fabricate execution outcomes.",
  ];
  writeFileSync(
    join(root, "references", "hooks.md"),
    `${[...requiredHookGuidance, ...bindingLines, ...configuredExample].join("\n")}\n`,
  );
}

function validateControlledMismatch() {
  const root = mkdtempSync(join(tmpdir(), "arashi-inline-guidance-mismatch-"));
  try {
    createCompleteFixture(root);
    validateSkill(root, "complete-fixture");
    const hooksPath = join(root, "references", "hooks.md");
    const original = readFileSync(hooksPath, "utf8");

    writeFileSync(hooksPath, original.replaceAll("`repos.<name>.hooks.<lifecycle>`", "`hooks.scripts.<lifecycle>.<repo>`"));
    assert.throws(() => validateSkill(root, "ownership-drift"), /repos\.<name>\.hooks/);

    writeFileSync(hooksPath, `${original}\nConfigured inline outcomes include snippet command text.\n`);
    assert.throws(() => validateSkill(root, "disclosure-drift"), /snippet disclosure/);

    writeFileSync(hooksPath, `${original}\n"pre-create.api": "echo bad"\n`);
    assert.throws(() => validateSkill(root, "encoded-key-drift"), /encoded repository lifecycle/);

    writeFileSync(hooksPath, original.replace("echo Inline pre-create hook running", "echo %ARASHI_BRANCH_NAME%"));
    assert.throws(() => validateSkill(root, "cmd-expansion-drift"), /cmd example must avoid reflecting/);

    writeFileSync(hooksPath, original.replace("CI=true corepack pnpm --ignore-workspace", "corepack pnpm"));
    assert.throws(() => validateSkill(root, "pnpm-isolation-drift"), /must set CI=true and pass --ignore-workspace/);

    writeFileSync(hooksPath, original.replace("Remove dry-run previews discovery", "Dry-run previews discovery"));
    assert.throws(() => validateSkill(root, "dry-run-scope-drift"), /unscoped all-command claim|scoped to remove/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function validatePackageWideAdversarialFixtures() {
  const roots = [];
  const cases = [
    {
      name: "unconditional-inline-source-path",
      claim: "Inline hooks always receive ARASHI_HOOK_SOURCE_PATH.",
      diagnostic: /ARASHI_HOOK_SOURCE_PATH.*inline|inline.*ARASHI_HOOK_SOURCE_PATH/i,
    },
    {
      name: "inline-api-token",
      claim: "For convenience, embed API tokens and secrets in inline snippets.",
      diagnostic: /secret guidance|API tokens|secrets/i,
    },
    {
      name: "external-script-path-secret",
      claim: "Store secrets in external script paths and reference those paths from inline hooks.",
      diagnostic: /secret guidance|secrets|external script paths/i,
    },
  ];

  const falseAccepts = [];
  try {
    for (const mode of ["source-fixture", "extracted-package-fixture"]) {
      for (const fixtureCase of cases) {
        const root = mkdtempSync(join(tmpdir(), `arashi-inline-${mode}-${fixtureCase.name}-`));
        roots.push(root);
        const skillRoot = mode === "source-fixture"
          ? join(root, "arashi")
          : join(root, "package-check", "skills", "arashi");
        cpSync(sourceSkillRoot, skillRoot, { recursive: true });
        writeFileSync(join(skillRoot, "references", "adversarial.txt"), `${fixtureCase.claim}\n`);
        try {
          validateSkill(skillRoot, `${mode}-${fixtureCase.name}`);
          falseAccepts.push(`${mode}:${fixtureCase.name}`);
        } catch (error) {
          assert.match(
            String(error.message),
            fixtureCase.diagnostic,
            `${mode}:${fixtureCase.name} failed for an unrelated diagnostic`,
          );
        }
      }
    }

    assert.deepEqual(falseAccepts, [], `package-wide contradictions were accepted: ${falseAccepts.join(", ")}`);

    const legitimateRoot = mkdtempSync(join(tmpdir(), "arashi-inline-legitimate-negations-"));
    roots.push(legitimateRoot);
    createCompleteFixture(legitimateRoot);
    writeFileSync(
      join(legitimateRoot, "references", "safe.txt"),
      [
        "Inline hooks do not receive ARASHI_HOOK_SOURCE_PATH.",
        "ARASHI_HOOK_SOURCE_PATH is not available to inline hooks.",
        "Arashi never exports ARASHI_HOOK_SOURCE_PATH to inline hooks.",
        "Never embed API tokens or secrets in inline snippets.",
        "Inline snippets must never embed API tokens.",
        "Do not store secrets in external script paths for inline hooks.",
        "External script paths should not store secrets for inline hooks.",
      ].join("\n"),
    );
    validateSkill(legitimateRoot, "legitimate-negations");
  } finally {
    for (const root of roots) rmSync(root, { recursive: true, force: true });
  }
}

function validateReachabilityMismatch() {
  const root = mkdtempSync(join(tmpdir(), "arashi-inline-guidance-reachability-"));
  try {
    mkdirSync(join(root, "scripts"), { recursive: true });
    writeFileSync(join(root, "scripts", "guidance-checkers.json"), '["scripts/inline-lifecycle-hook-guidance-selftest.mjs"]\n');
    validateRegistration(root);
    writeFileSync(join(root, "scripts", "guidance-checkers.json"), "[]\n");
    assert.throws(() => validateRegistration(root), /must register/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function main() {
  validateControlledMismatch();
  validateReachabilityMismatch();
  if (suppliedSkillRoot) {
    validateSkill(resolve(suppliedSkillRoot), "package");
    validatePackageWideAdversarialFixtures();
    console.log("inline lifecycle-hook guidance self-test passed for packaged skill");
    return;
  }
  validateRegistration(repositoryRoot);
  validateSkill(sourceSkillRoot, "source");
  validatePackageWideAdversarialFixtures();
  console.log("inline lifecycle-hook guidance self-test passed for source and controlled mismatch fixtures");
}

main();
