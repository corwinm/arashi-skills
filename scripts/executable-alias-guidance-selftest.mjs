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
  skillRootArgumentIndex >= 0 ? process.argv[skillRootArgumentIndex + 1] : undefined;
if (skillRootArgumentIndex >= 0 && !suppliedSkillRoot) {
  throw new Error("--skill-root requires a path");
}

const aliasGuidance = [
  "`aw` is the supported **Arashi Workspace** executable shorthand",
  "Supported npm and direct installations provide equivalent `arashi` and `aw` executable names",
  "`arashi` remains the canonical product and command vocabulary",
  "not a Commander command alias or a second command vocabulary",
  "Keep workflow examples and command discovery canonical: use `arashi --version`, `arashi --help`, and `arashi <command> --help`",
  "installation-channel details about collision handling, shell integration, completion, updates, and manual installation",
];

function walkMarkdown(root, directory = root) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) return walkMarkdown(root, absolutePath);
    return entry.name.endsWith(".md") ? [absolutePath] : [];
  });
}

function validateSkill(root, label) {
  const manifestPath = join(root, "SKILL.md");
  const tutorialPath = join(root, "references", "tutorial.md");
  const manifest = readFileSync(manifestPath, "utf8");
  const tutorial = readFileSync(tutorialPath, "utf8");

  for (const expected of [
    "verify_arashi: arashi --version",
    "discover_commands: arashi --help",
    "inspect current help output when needed: `arashi <command> --help`",
  ]) {
    assert.ok(manifest.includes(expected), `${label}/SKILL.md is missing canonical discovery command ${JSON.stringify(expected)}`);
  }

  for (const expected of aliasGuidance) {
    assert.ok(
      tutorial.includes(expected),
      `${label}/references/tutorial.md is missing executable-alias guidance ${JSON.stringify(expected)}`,
    );
  }

  assert.doesNotMatch(
    manifest,
    /\baw\b/,
    `${label}/SKILL.md must remain a minimal canonical routing surface without executable-alias guidance`,
  );

  for (const path of walkMarkdown(root)) {
    const content = readFileSync(path, "utf8");
    const relativePath = path.slice(root.length + 1);
    for (const [pattern, description] of [
      [/\baw\b[^\n]{0,40}\b(?:is|becomes) (?:a|the) (?:separate|second|alternative) (?:product|command vocabulary)/i, "separate product or command vocabulary"],
      [/\baw\b[^\n]{0,40}\b(?:provides|uses) (?:a|the) (?:separate|second) command vocabulary/i, "separate command vocabulary"],
      [/(?:prefer|replace[^\n]*with) `?aw`?/i, "preferred replacement"],
      [/(?<!not (?:a |an ))Commander command alias/i, "Commander command alias"],
    ]) {
      assert.doesNotMatch(
        content,
        pattern,
        `${label}/${relativePath} incorrectly presents aw as a ${description}`,
      );
    }
    if (path === tutorialPath) continue;
    assert.doesNotMatch(
      content,
      /(?:^|[\s`])aw(?:\s+[-\w]|\s+--|\s*$)/m,
      `${label}/${relativePath} duplicates workflows with aw command spellings`,
    );
  }
}

function validateDeliberateDrift() {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "arashi-executable-alias-guidance-"));
  try {
    const fixtureSkillRoot = join(fixtureRoot, "arashi");
    cpSync(sourceSkillRoot, fixtureSkillRoot, { recursive: true });
    const tutorialPath = join(fixtureSkillRoot, "references", "tutorial.md");
    const original = readFileSync(tutorialPath, "utf8");

    writeFileSync(
      tutorialPath,
      `${original}\n\`aw\` is a separate product with an alternative command vocabulary.\n`,
    );
    assert.throws(
      () => validateSkill(fixtureSkillRoot, "deliberate-identity-drift"),
      /separate product or command vocabulary/,
      "checker accepted an incorrect separate-product claim while preferred alias guidance remained present",
    );

    writeFileSync(tutorialPath, original);
    const manifestPath = join(fixtureSkillRoot, "SKILL.md");
    writeFileSync(
      manifestPath,
      readFileSync(manifestPath, "utf8").replace(
        "discover_commands: arashi --help",
        "discover_commands: aw --help",
      ),
    );
    assert.throws(
      () => validateSkill(fixtureSkillRoot, "deliberate-discovery-drift"),
      /canonical discovery command|minimal canonical routing surface/,
      "checker accepted non-canonical entry-command discovery",
    );

    writeFileSync(manifestPath, readFileSync(join(sourceSkillRoot, "SKILL.md"), "utf8"));
    const workflowsPath = join(fixtureSkillRoot, "references", "workflows.md");
    writeFileSync(
      workflowsPath,
      `${readFileSync(workflowsPath, "utf8")}\nRun aw status for the shorthand workflow.\n`,
    );
    assert.throws(
      () => validateSkill(fixtureSkillRoot, "deliberate-vocabulary-drift"),
      /duplicates workflows with aw command spellings/,
      "checker accepted a duplicate aw workflow vocabulary outside the installation reference",
    );
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

function main() {
  if (suppliedSkillRoot) {
    validateSkill(resolve(suppliedSkillRoot), "package");
    console.log("Executable-alias guidance self-test passed for packaged skill");
    return;
  }

  validateSkill(sourceSkillRoot, "source");
  validateDeliberateDrift();
  console.log("Executable-alias guidance self-test passed for source and deliberate drift");
}

main();
