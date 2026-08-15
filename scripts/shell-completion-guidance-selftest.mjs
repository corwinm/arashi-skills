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
const metaRootArgumentIndex = process.argv.indexOf("--meta-root");
const suppliedMetaRoot =
  metaRootArgumentIndex >= 0
    ? process.argv[metaRootArgumentIndex + 1]
    : undefined;
if (metaRootArgumentIndex >= 0 && !suppliedMetaRoot) {
  throw new Error("--meta-root requires a path");
}

const requirements = new Map([
  [
    "references/commands.md",
    [
      "arashi completion bash",
      "arashi completion zsh",
      "arashi completion fish",
      "`arashi shell init <shell>` emits only the manual wrapper",
      "`arashi shell install` owns both wrapper and completion activation lines",
      "Static command and option completion works outside a configured workspace",
      "each `--only` segment completes repository names",
      "`switch [filter]` and `remove [target]` complete branch, worktree name, or path values",
      "`--path` narrows them to exact worktree paths",
      "`move --from` and `move --to` complete workspace branch, name, or path references",
      "200 ms whole-query budget",
      "no network requests, hooks, prompts, workspace mutation, or child-repository operations",
      "Budget expiry or discovery failure is silently empty",
      "`command arashi` so wrapper functions cannot recursively intercept completion queries",
      "Bash's native programmable-completion UI does not generally display per-candidate descriptions",
      "npm-managed wrapper and standalone binary expose the same completion behavior",
    ],
  ],
  [
    "references/tutorial.md",
    [
      "Enable the wrapper and completion independently when configuring a shell manually",
      "eval \"$(command arashi shell init bash)\"",
      "source <(command arashi completion bash)",
      "eval \"$(command arashi shell init zsh)\"",
      "source <(command arashi completion zsh)",
      "command arashi shell init fish | source",
      "command arashi completion fish | source",
      "`arashi shell install` writes and idempotently upgrades both activation lines in its managed block",
    ],
  ],
  [
    "references/troubleshooting.md",
    [
      "arashi completion bash",
      "run `command arashi completion <shell>` directly",
      "Static completion remains available outside configured workspaces",
      "Dynamic completion is intentionally empty",
      "200 ms whole-query budget expires",
      "npm-managed install, run `arashi install` once",
      "standalone binary from the same release",
    ],
  ],
]);

function walkFiles(root, directory = root) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) return walkFiles(root, absolutePath);
    return [absolutePath.slice(root.length + 1)];
  });
}

function validateNoStaleClaims(root, label) {
  const staleClaims = [
    /shell init[^\n]*(?:includes|enables|installs|emits) (?:shell )?completion/i,
    /completion[^\n]*(?:requires|only works in)[^\n]*(?:configured )?workspace/i,
  ];
  for (const relativePath of walkFiles(root)) {
    const content = readFileSync(join(root, relativePath), "utf8");
    content.split("\n").forEach((line, index) => {
      for (const staleClaim of staleClaims) {
        assert.doesNotMatch(
          line,
          staleClaim,
          `${label}/${relativePath}:${index + 1} contains stale shell-completion guidance`,
        );
      }
    });
  }
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

  const commands = readFileSync(join(root, "references", "commands.md"), "utf8");
  assert.ok(
    commands.includes(
      "Dynamic ownership is exact: each `--only` segment completes repository names; each `--group` segment completes configured groups; `switch [filter]` and `remove [target]` complete branch, worktree name, or path values, while `--path` narrows them to exact worktree paths; `move --from` and `move --to` complete workspace branch, name, or path references; supported-shell arguments and finite constrained options complete only their declared values; unclassified slots receive no local candidates.",
    ),
    `${label}/references/commands.md does not bind the bounded candidate classes to their constrained slots`,
  );
  assert.ok(
    commands.includes(
      "The npm-managed wrapper and standalone binary expose the same completion behavior and generated shell output for a given release.",
    ),
    `${label}/references/commands.md does not state npm/standalone release parity`,
  );
  validateNoStaleClaims(root, label);
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
      /^\s*(?:run:\s*)?node scripts\/shell-completion-guidance-selftest\.mjs\s*$/m,
      `${workflowPath} does not run the source shell-completion guidance self-test`,
    );
    assert.match(
      workflow,
      /^\s*node scripts\/shell-completion-guidance-selftest\.mjs --skill-root package-check\/skills\/arashi\s*$/m,
      `${workflowPath} does not run the extracted-package shell-completion guidance self-test`,
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

function validateCoordinatedWorkflowWiring(metaRoot) {
  const workflow = readFileSync(
    join(metaRoot, ".github", "workflows", "cross-repo-command-contracts.yml"),
    "utf8",
  );
  for (const expected of [
    "completion:generate",
    "completion:check",
    "pnpm --dir repos/arashi-docs validate:semantic-docs",
    "node repos/arashi-skills/scripts/shell-completion-guidance-selftest.mjs",
    "node repos/arashi-skills/scripts/shell-completion-guidance-selftest.mjs --skill-root package-check/skills/arashi",
  ]) {
    assert.ok(
      workflow.includes(expected),
      `coordinated workflow does not directly reach ${expected}`,
    );
  }
}

function validateCommandCoverage() {
  const coverage = JSON.parse(
    readFileSync(join(repositoryRoot, "contracts", "command-coverage.json"), "utf8"),
  );
  const completion = coverage.commands.find((command) => command.name === "completion");
  assert.deepEqual(
    completion,
    {
      name: "completion",
      status: "covered",
      reference: "references/commands.md",
      standalone: { support: "supported" },
    },
    "contracts/command-coverage.json does not classify completion guidance and standalone support",
  );
}

function validateDeliberateDrift() {
  const driftRoot = mkdtempSync(join(tmpdir(), "arashi-completion-guidance-drift-"));
  try {
    const packagedSkillRoot = join(driftRoot, "arashi");
    cpSync(sourceSkillRoot, packagedSkillRoot, { recursive: true });
    const commandsPath = join(packagedSkillRoot, "references", "commands.md");
    const original = readFileSync(commandsPath, "utf8");

    const dynamicContract =
      "Dynamic ownership is exact: each `--only` segment completes repository names; each `--group` segment completes configured groups; `switch [filter]` and `remove [target]` complete branch, worktree name, or path values, while `--path` narrows them to exact worktree paths; `move --from` and `move --to` complete workspace branch, name, or path references; supported-shell arguments and finite constrained options complete only their declared values; unclassified slots receive no local candidates.";
    assert.equal(
      original.split(dynamicContract).length - 1,
      1,
      "drift fixture requires one exact dynamic-candidate contract",
    );
    writeFileSync(
      commandsPath,
      original.replace(
        dynamicContract,
        "Dynamic candidates may be offered for any argument that resembles a repository or branch.",
      ),
    );
    assert.throws(
      () => validateSkill(packagedSkillRoot, "deliberate-dynamic-drift"),
      /bounded candidate classes|each `--only` segment completes repository names|configured groups for `--group`/,
      "checker accepted unbounded dynamic candidates outside constrained slots",
    );

    writeFileSync(commandsPath, original);
    const parityContract =
      "The npm-managed wrapper and standalone binary expose the same completion behavior and generated shell output for a given release.";
    assert.equal(
      original.split(parityContract).length - 1,
      1,
      "drift fixture requires one exact distribution-parity contract",
    );
    writeFileSync(
      commandsPath,
      original.replace(
        parityContract,
        "Completion behavior is guaranteed only for npm-managed installs.",
      ),
    );
    assert.throws(
      () => validateSkill(packagedSkillRoot, "deliberate-parity-drift"),
      /npm\/standalone release parity|npm-managed wrapper and standalone binary/,
      "checker accepted npm-only completion guidance",
    );
  } finally {
    rmSync(driftRoot, { recursive: true, force: true });
  }
}

function main() {
  if (suppliedSkillRoot) {
    validateSkill(resolve(suppliedSkillRoot), "package");
    console.log("Shell-completion guidance self-test passed for packaged skill");
    return;
  }

  validateSkill(sourceSkillRoot, "source");
  validateCommandCoverage();
  validateWorkflowWiring();
  if (suppliedMetaRoot) validateCoordinatedWorkflowWiring(resolve(suppliedMetaRoot));
  validateDeliberateDrift();
  console.log(
    `Shell-completion guidance self-test passed for source, workflows, and deliberate drift (${requirements.size} surfaces)`,
  );
}

main();
