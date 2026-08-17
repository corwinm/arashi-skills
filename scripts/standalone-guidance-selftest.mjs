#!/usr/bin/env node

import assert from "node:assert/strict";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
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
    "SKILL.md",
    [
      "zero-config standalone",
      "arashi init --zero-config",
      "non-bare Git project",
      "ad hoc work",
      "Prefer configured mode",
      "child repositories",
      "tracked `.gitignore`",
      "global Git",
    ],
  ],
  [
    "references/workflows.md",
    [
      "Configured workflow",
      "1. Initialize only when configuration is absent",
      "2. Diagnose the initialized workspace before changing state",
      "ordinary `arashi init`",
      "Standalone Repository Workflow",
      "arashi init --zero-config",
      "literal `.worktrees/` rule",
      "commands/workspace.md",
      "main worktree",
      "linked worktree",
    ],
  ],
  [
    "references/commands/workspace.md",
    [
      "arashi init --zero-config",
      "arashi init --zero-config --dry-run",
      "arashi init --zero-config --json",
      ".worktrees/<branch>",
      "exact planned destination",
      "git check-ignore --no-index -q -- \"$destination\"",
      "configured-only",
      "add",
      "clone",
      "sync",
      "pull",
      "push",
      "exec",
      "setup",
      "--repos",
      "--all",
      "ordinary `arashi init`",
    ],
  ],
  [
    "references/troubleshooting.md",
    [
      "exact `.worktrees/<branch>` destination is not ignored",
      "arashi init --zero-config",
      'current_root=$(git rev-parse --show-toplevel)',
      'git_dir=$(git rev-parse --path-format=absolute --git-dir)',
      'main_root=${current_root%/.worktrees/*}',
      'cd "$main_root"',
      'git check-ignore --no-index -q -- "$destination"',
      "literal `.worktrees/` rule",
      "repository-local exclude",
      "passive discovery does not repair",
      "tracked `.gitignore`",
      "global Git configuration",
    ],
  ],
  [
    "references/hooks.md",
    [
      "standalone mode",
      "Prefer configured mode",
      "ad hoc use",
      "user-global",
      "main-root basename",
      "main repository",
      "repository-local",
      "workspace-root",
      "does not activate them",
    ],
  ],
]);

function validateSkill(root, label) {
  for (const [relativePath, expectedTexts] of requirements) {
    const content = readFileSync(join(root, relativePath), "utf8");
    for (const expected of expectedTexts) {
      assert.ok(
        content.toLowerCase().includes(expected.toLowerCase()),
        `${label}/${relativePath} is missing ${JSON.stringify(expected)}`
      );
    }
  }

  const workflow = readFileSync(join(root, "references", "workflows.md"), "utf8");
  const configuredPosition = workflow.indexOf("## Configured workflow");
  const standalonePosition = workflow.indexOf("## Standalone Repository Workflow");
  assert.ok(standalonePosition >= 0, `${label} is missing the ad hoc standalone workflow route`);
  assert.ok(
    configuredPosition >= 0 && configuredPosition < standalonePosition,
    `${label} must prioritize configured guidance before ad hoc standalone guidance`
  );

  const allGuidance = [...requirements.keys()]
    .map((relativePath) => readFileSync(join(root, relativePath), "utf8"))
    .join("\n");
  assert.doesNotMatch(
    allGuidance,
    /Do not treat this as the zero-config behavior tracked by issue #212|configless workspace behavior remains separate under issue #212/,
    `${label} still routes zero-config guidance to the implementation issue`
  );
  assert.doesNotMatch(
    allGuidance,
    /git\s+config\s+--global[^\n]*(?:core\.excludesFile|\.gitignore)|(?:>>?|tee\s+-a?)\s+[^\n]*\.gitignore/i,
    `${label} contains an automatic global or tracked ignore edit`
  );
  const troubleshooting = readFileSync(join(root, "references", "troubleshooting.md"), "utf8");
  assert.doesNotMatch(
    troubleshooting,
    /\$\{current_root%%\/\.worktrees\/\*\}/,
    `${label} strips an outer .worktrees ancestor instead of the innermost Arashi segment`,
  );
  assert.doesNotMatch(
    troubleshooting,
    /add only the missing exact destination/i,
    `${label} incorrectly claims zero-config init adds an exact destination exclude`
  );
  assert.doesNotMatch(
    workflow,
    /(?:bootstrap|init)[^\n.]{0,160}(?:add|append)[^\n.]{0,80}exact (?:planned )?destination/i,
    `${label} workflow incorrectly narrows zero-config bootstrap to an exact destination exclude`,
  );
}

function validateCoverageContract() {
  const contract = JSON.parse(
    readFileSync(join(repositoryRoot, "contracts", "command-coverage.json"), "utf8")
  );
  const commands = new Map(contract.commands.map((command) => [command.name, command]));
  const expectedSupport = new Map([
    ...[
      "completion",
      "create",
      "doctor",
      "handoff",
      "list",
      "move",
      "prune",
      "remove",
      "status",
      "switch"
    ].map((name) => [name, "supported"]),
    ...["add", "clone", "exec", "pull", "push", "setup", "sync"].map((name) => [
      name,
      "configured-only"
    ]),
    ["init", "conditional"],
    ...["install", "shell", "shell init", "shell install", "update"].map((name) => [
      name,
      "not-applicable"
    ])
  ]);

  assert.equal(commands.size, contract.commands.length, "coverage command names must be unique");
  assert.equal(
    commands.size,
    expectedSupport.size,
    "every coverage command must have an audited standalone classification"
  );

  for (const [name, support] of expectedSupport) {
    const command = commands.get(name);
    assert.ok(command, `coverage contract is missing ${name}`);
    assert.equal(command.standalone?.support, support, `${name} standalone support is stale`);
    if (support !== "supported") {
      assert.ok(command.standalone?.reason?.trim(), `${name} standalone policy needs a reason`);
    }

    if (command.status === "covered") {
      assert.match(command.reference ?? "", /^references\/(?:commands\/)?[a-z0-9-]+\.md$/);
      assert.ok(
        existsSync(join(sourceSkillRoot, command.reference)),
        `${name} coverage reference does not exist`
      );
      if (["list", "setup"].includes(name)) {
        const owner = readFileSync(join(sourceSkillRoot, command.reference), "utf8");
        assert.ok(
          owner.includes(`arashi ${name}`),
          `${name} coverage owner does not document arashi ${name}`
        );
      }
    } else {
      assert.equal(command.status, "excluded", `${name} has an invalid coverage status`);
      assert.ok(command.reason?.trim(), `${name} exclusion needs a reason`);
    }
  }

  const init = commands.get("init");
  assert.deepEqual(init?.requiredOptions, ["--zero-config"]);
  assert.deepEqual(init?.standalone?.policy, {
    option: "--zero-config",
    dryRun: true,
    json: true,
    compatibleOptions: ["--dry-run", "--json", "--verbose"],
    incompatibleOptions: [
      "--force",
      "--ignore-scope",
      "--no-discover",
      "--repos-dir",
      "--worktrees-dir"
    ]
  });
}

function main() {
  if (suppliedSkillRoot) {
    validateSkill(resolve(suppliedSkillRoot), "package");
    console.log(
      `standalone guidance self-test passed for packaged skill (${requirements.size} routed surfaces)`
    );
    return;
  }

  validateSkill(sourceSkillRoot, "source");
  validateCoverageContract();

  const packageRoot = mkdtempSync(join(tmpdir(), "arashi-skill-package-"));
  try {
    const packagedSkillRoot = join(packageRoot, "arashi");
    cpSync(sourceSkillRoot, packagedSkillRoot, { recursive: true });
    validateSkill(packagedSkillRoot, "package");
  } finally {
    rmSync(packageRoot, { recursive: true, force: true });
  }

  console.log(
    `standalone guidance self-test passed for source, packaged skill, and command coverage (${requirements.size} routed surfaces)`
  );
}

main();
