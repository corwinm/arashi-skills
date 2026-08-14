#!/usr/bin/env node

import assert from "node:assert/strict";
import { appendFileSync, cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceSkillRoot = join(repositoryRoot, "skills", "arashi");
const skillRootArgumentIndex = process.argv.indexOf("--skill-root");
const suppliedSkillRoot =
  skillRootArgumentIndex >= 0 ? process.argv[skillRootArgumentIndex + 1] : undefined;

if (skillRootArgumentIndex >= 0 && !suppliedSkillRoot) {
  throw new Error("--skill-root requires a path");
}

const sectionHeading = "## Adding a Repository from a Linked Parent Worktree";
const requiredStatements = [
  "A direct add from the canonical parent checkout keeps the existing one-clone flow: Arashi clones beneath that checkout's configured `reposDir` and updates that checkout's `.arashi/config.json`.",
  "From a linked parent worktree, Arashi clones the child beneath the canonical parent checkout's configured `reposDir`, leaves that canonical clone on the detected child default branch, and creates the active child path as a linked worktree on the active parent branch.",
  "Only the active parent worktree's `.arashi/config.json` receives the new repository entry; linked add does not edit the canonical parent checkout's tracked configuration.",
  "If a matching `origin/<active-parent-branch>` remote-tracking ref exists, the coordinated local branch tracks that ref; otherwise Arashi creates it from the detected child default branch.",
  "Before materialization, linked add evaluates effective ignore coverage for both canonical and active destinations.",
  "With `local` scope, the common repository exclude authority must cover both destinations; with `tracked` scope, the canonical destination must already be ignored from the canonical checkout before Arashi may reconcile the active branch's `.gitignore`; with `none`, Arashi writes no ignore files, reports each unignored destination, and may continue under the explicit opt-out policy.",
  "If linked-worktree cleanup or final-state observation is incomplete, rollback retains the canonical clone, coordinated branch, and applicable managed-ignore coverage because the surviving linked child depends on the canonical clone's Git common directory.",
];

function markdownFiles(root) {
  const files = [];
  function walk(current) {
    for (const entry of readdirSync(current)) {
      const path = join(current, entry);
      const stat = statSync(path);
      if (stat.isDirectory()) walk(path);
      else if (stat.isFile() && path.endsWith(".md")) files.push(path);
    }
  }
  walk(root);
  return files;
}

function extractSection(content, label) {
  const start = content.indexOf(sectionHeading);
  assert.notEqual(start, -1, `${label}/references/commands.md is missing ${sectionHeading}`);
  const nextHeading = content.indexOf("\n## ", start + sectionHeading.length);
  return content.slice(start, nextHeading === -1 ? content.length : nextHeading);
}

function validateSkill(root, label) {
  const commandsPath = join(root, "references", "commands.md");
  const commands = readFileSync(commandsPath, "utf8");
  const section = extractSection(commands, label);

  for (const statement of requiredStatements) {
    assert.ok(
      section.includes(statement),
      `${label}/references/commands.md linked-add section is missing ${JSON.stringify(statement)}`,
    );
  }

  for (const path of markdownFiles(root)) {
    const content = readFileSync(path, "utf8");
    const pathLabel = relative(root, path);
    assert.doesNotMatch(
      content,
      /manually clone (?:the )?child (?:twice|into both)|clone (?:the )?new child only (?:into|under) the active parent/i,
      `${label}/${pathLabel} contains stale linked-add materialization guidance`,
    );
  }
}

function validateWorkflowWiring() {
  const requirements = new Map([
    [
      ".github/workflows/security-audit.yml",
      [
        /^\s*node scripts\/linked-add-guidance-selftest\.mjs\s*$/m,
        /^\s*node scripts\/linked-add-guidance-selftest\.mjs --skill-root package-check\/skills\/arashi\s*$/m,
      ],
    ],
    [
      ".github/workflows/release-security-gate.yml",
      [
        /^\s*node scripts\/linked-add-guidance-selftest\.mjs\s*$/m,
        /^\s*node scripts\/linked-add-guidance-selftest\.mjs --skill-root package-check\/skills\/arashi\s*$/m,
      ],
    ],
  ]);

  for (const [path, patterns] of requirements) {
    const content = readFileSync(join(repositoryRoot, path), "utf8");
    for (const pattern of patterns) {
      assert.match(content, pattern, `${path} is missing ${pattern}`);
    }
  }
}

function validateControlledDrift() {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "arashi-linked-add-drift-"));
  try {
    const fixtureSkillRoot = join(fixtureRoot, "arashi");
    cpSync(sourceSkillRoot, fixtureSkillRoot, { recursive: true });
    appendFileSync(
      join(fixtureSkillRoot, "SKILL.md"),
      "\nAgents should manually clone the child twice when add starts from a linked parent.\n",
    );
    assert.throws(
      () => validateSkill(fixtureSkillRoot, "controlled-drift"),
      /stale linked-add materialization guidance/,
      "controlled stale packaged guidance must be rejected",
    );
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

function main() {
  if (suppliedSkillRoot) {
    validateSkill(resolve(suppliedSkillRoot), "package");
    console.log("linked-add guidance self-test passed for packaged skill");
    return;
  }

  validateSkill(sourceSkillRoot, "source");
  validateWorkflowWiring();
  validateControlledDrift();
  console.log("linked-add guidance self-test passed for source, workflow wiring, and controlled drift");
}

main();
