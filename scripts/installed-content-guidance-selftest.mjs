#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
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

const commandRoutes = new Map([
  ["references/commands/setup.md", "Setup, update, and completion"],
  ["references/commands/workspace.md", "Workspace and repositories"],
  ["references/commands/automation.md", "Automation and coordinated execution"],
  ["references/commands/create.md", "Create worktrees"],
  ["references/commands/switch-and-launch.md", "Switch and launch"],
  ["references/commands/remove-and-maintenance.md", "Remove and maintenance"],
]);

const ownedHeadings = new Map([
  ["Shell Completion", "references/commands/setup.md"],
  ["Workspace Initialization", "references/commands/workspace.md"],
  ["JSON Output for Automation", "references/commands/automation.md"],
  ["Create from a Coordinated Base Branch", "references/commands/create.md"],
  ["Worktree Switching", "references/commands/switch-and-launch.md"],
  ["Remove Dry-Run Preview", "references/commands/remove-and-maintenance.md"],
]);

function markdownFiles(root, directory = root) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(root, absolutePath);
    return entry.name.endsWith(".md") ? [absolutePath] : [];
  });
}

function read(root, path, problems) {
  const absolutePath = join(root, path);
  if (!existsSync(absolutePath)) {
    problems.push(`missing installed guidance file ${path}`);
    return "";
  }
  return readFileSync(absolutePath, "utf8");
}

function validateLinks(root, files, problems) {
  for (const absolutePath of files) {
    const content = readFileSync(absolutePath, "utf8");
    const relativePath = relative(root, absolutePath);
    for (const match of content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const target = match[1].split("#", 1)[0];
      if (!target || /^(?:https?:|mailto:)/.test(target)) continue;
      const resolvedTarget = resolve(dirname(absolutePath), target);
      if (!existsSync(resolvedTarget)) {
        problems.push(`${relativePath} has broken local link ${target}`);
      }
    }
  }
}

function validateSkill(root, label, { requireRepositoryPolicy = false } = {}) {
  const problems = [];
  const skill = read(root, "SKILL.md", problems);
  const readme = read(root, "README.md", problems);
  const router = read(root, "references/commands.md", problems);
  const prerequisites = read(root, "references/prerequisites.md", problems);
  const tutorial = read(root, "references/tutorial.md", problems);
  const workflows = read(root, "references/workflows.md", problems);
  const troubleshooting = read(root, "references/troubleshooting.md", problems);

  for (const [path, title] of commandRoutes) {
    const leaf = read(root, path, problems);
    const routerTarget = path.replace(/^references\//, "");
    if (!router.includes(`](${routerTarget})`)) {
      problems.push(`references/commands.md is missing command route ${routerTarget}`);
    }
    if (!leaf.includes(`# ${title}`)) {
      problems.push(`${path} is missing its scope heading ${JSON.stringify(title)}`);
    }
  }

  if (router.length > 8_000) {
    problems.push(`references/commands.md must remain a compact router (found ${router.length} characters)`);
  }
  if (skill.length > 5_000) {
    problems.push(`SKILL.md must remain a compact router (found ${skill.length} characters)`);
  }
  const startMode = skill.indexOf("Choose one mode");
  const startDoctor = skill.indexOf("arashi doctor --json");
  if (startMode < 0 || startDoctor < 0 || startMode > startDoctor) {
    problems.push("SKILL.md must choose and initialize a mode before workspace diagnostics");
  }
  if (!workflows.includes("When configured child repositories exist") || !workflows.includes("paths reported by `arashi status`")) {
    problems.push("references/workflows.md must keep parent-only validation local and make exec conditional on configured children");
  }
  const handoff = workflows.slice(workflows.indexOf("## Completion handoff"));
  if (/Run the relevant selected validation through `arashi exec`/i.test(handoff)) {
    problems.push("references/workflows.md completion handoff makes exec unconditional");
  }
  for (const forbiddenHeading of ["## Common Requests", "## Canonical Docs"]) {
    if (skill.includes(forbiddenHeading)) {
      problems.push(`SKILL.md still contains routed detail section ${forbiddenHeading}`);
    }
  }
  if (!/security/i.test(skill) || !skill.includes("references/troubleshooting.md")) {
    problems.push("SKILL.md must route operational security and failures to troubleshooting guidance");
  }

  const installedPublication = join(root, "references", "publication.md");
  if (existsSync(installedPublication)) {
    problems.push("maintainer publication policy remains inside the installed skill");
  }
  if (skill.includes("references/publication.md")) {
    problems.push("SKILL.md still routes installed users to maintainer publication policy");
  }
  if (/references\/publication\.md|publication policy|command contract maintenance/i.test(readme)) {
    problems.push("README.md still contains installed maintainer publication or contract policy");
  }

  for (const [labelText, pattern] of [
    ["Node", /^\|[^\n]*Node(?:\.js)?[^\n]*\|\s*Yes\s*\|/im],
    ["network", /^\|[^\n]*Network[^\n]*\|\s*Yes\s*\|/im],
  ]) {
    if (pattern.test(prerequisites)) {
      problems.push(`references/prerequisites.md still presents ${labelText} as universally required`);
    }
  }
  if (!/conditional prerequisites/i.test(prerequisites)) {
    problems.push("references/prerequisites.md is missing a conditional-prerequisites boundary");
  }

  for (const [path, content] of [
    ["references/tutorial.md", tutorial],
    ["references/workflows.md", workflows],
    ["references/troubleshooting.md", troubleshooting],
  ]) {
    if (/^## (?:Shell Completion|Workspace Initialization|JSON Output for Automation|Create from a Coordinated Base Branch|Worktree Switching|Remove Dry-Run Preview)$/m.test(content)) {
      problems.push(`${path} duplicates a command-reference ownership heading`);
    }
  }

  const files = markdownFiles(root);
  for (const [heading, owner] of ownedHeadings) {
    const owners = files
      .filter((path) => readFileSync(path, "utf8").includes(`## ${heading}`))
      .map((path) => relative(root, path));
    if (owners.length !== 1 || owners[0] !== owner) {
      problems.push(`heading ${JSON.stringify(heading)} must be owned only by ${owner}; found ${owners.join(", ") || "none"}`);
    }
  }

  for (const absolutePath of files) {
    const content = readFileSync(absolutePath, "utf8");
    const relativePath = relative(root, absolutePath);
    if (/skill-arashi-v\d+\.\d+\.\d+/i.test(content)) {
      problems.push(`${relativePath} contains a stale hard-coded skill release tag`);
    }
    if (/\b(?:issue|PR)\s*#?\d+\b|\/(?:issues|pull)\/\d+\b|\bgh pr (?:checks|view) \d+\b/i.test(content)) {
      problems.push(`${relativePath} contains issue/PR-specific historical guidance`);
    }
  }

  const tutorialContent = readFileSync(join(root, "references", "tutorial.md"), "utf8");
  const tutorialInit = tutorialContent.search(/^arashi init$/m);
  const tutorialDoctor = tutorialContent.search(/^arashi doctor --json$/m);
  if (tutorialInit < 0 || tutorialDoctor < 0 || tutorialInit > tutorialDoctor) {
    problems.push("references/tutorial.md must initialize an absent configured workspace before doctor");
  }
  if (/arashi exec --only docs\b/.test(tutorialContent)) {
    problems.push("references/tutorial.md validates an unconfigured example repository");
  }

  const shortcuts = readFileSync(join(root, "references", "session-shortcuts.md"), "utf8");
  if (!shortcuts.includes("arashi list | fzf")) {
    problems.push("references/session-shortcuts.md must compose the fuzzy picker from pipe-friendly list output");
  }
  if (/\bjq\b/.test(shortcuts)) {
    problems.push("references/session-shortcuts.md introduces an undeclared jq prerequisite");
  }

  validateLinks(root, files, problems);

  if (requireRepositoryPolicy && !existsSync(join(repositoryRoot, "docs", "publication.md"))) {
    problems.push("repository-level docs/publication.md is missing before installed publication policy removal");
  }

  if (problems.length > 0) {
    throw new Error(`${label} installed-content guidance failed:\n- ${problems.join("\n- ")}`);
  }
}

function writeFixture(root) {
  const files = new Map([
    ["README.md", "# Arashi Skill Package\n\nInstalled runtime guidance.\n"],
    [
      "SKILL.md",
      "# Arashi Skill\n\nChoose one mode, initialize it, then run arashi doctor --json.\n\nUse [Commands](references/commands.md) and [Troubleshooting](references/troubleshooting.md) for operational security and failures.\n",
    ],
    [
      "references/commands.md",
      [...commandRoutes.entries()]
        .map(([path, title]) => `- [${title}](${path.replace(/^references\//, "")})`)
        .join("\n"),
    ],
    ["references/prerequisites.md", "# Prerequisites\n\n## Conditional Prerequisites\n\nNode and network access apply only to tasks that need them.\n"],
    ["references/tutorial.md", "# End-to-End Tutorial\n\narashi init\narashi doctor --json\nComplete one configured workflow.\n"],
    ["references/workflows.md", "# Workflow Catalog\n\nChoose configured or standalone mode. Use paths reported by `arashi status`. When configured child repositories exist, use exec.\n"],
    ["references/session-shortcuts.md", "# Session shortcuts\n\narashi list | fzf\n"],
    ["references/troubleshooting.md", "# Troubleshooting\n\nDiagnose the symptom before recovery.\n"],
  ]);
  for (const [path, title] of commandRoutes) {
    const ownedHeading = [...ownedHeadings].find(([, owner]) => owner === path)?.[0];
    files.set(path, `# ${title}\n\n${ownedHeading ? `## ${ownedHeading}\n\nOwned guidance.\n` : ""}`);
  }
  for (const [path, content] of files) {
    const absolutePath = join(root, path);
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, content);
  }
}

function requireRejection(root, label, mutate, diagnostic) {
  const fixture = join(root, label);
  writeFixture(fixture);
  mutate(fixture);
  assert.throws(() => validateSkill(fixture, label), diagnostic);
}

function selfTest() {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "arashi-installed-content-guidance-"));
  try {
    const valid = join(temporaryRoot, "valid");
    writeFixture(valid);
    validateSkill(valid, "valid fixture");

    requireRejection(
      temporaryRoot,
      "broken-routing",
      (root) => {
        const path = join(root, "references", "commands.md");
        writeFileSync(path, readFileSync(path, "utf8").replace("commands/create.md", "commands/missing.md"));
      },
      /missing command route commands\/create\.md|broken local link/,
    );
    requireRejection(
      temporaryRoot,
      "duplicate-ownership",
      (root) => {
        const path = join(root, "references", "workflows.md");
        writeFileSync(path, `${readFileSync(path, "utf8")}\n## Worktree Switching\n\nDuplicate detail.\n`);
      },
      /duplicates a command-reference ownership heading|must be owned only/,
    );
    requireRejection(
      temporaryRoot,
      "unconditional-prerequisite",
      (root) => {
        const path = join(root, "references", "prerequisites.md");
        writeFileSync(path, `${readFileSync(path, "utf8")}\n| Node.js | node --version | Version | Yes |\n`);
      },
      /Node as universally required/,
    );
    requireRejection(
      temporaryRoot,
      "stale-publication-tag",
      (root) => {
        const path = join(root, "references", "tutorial.md");
        writeFileSync(path, `${readFileSync(path, "utf8")}\nUse skill-arashi-v0.1.0.\n`);
      },
      /stale hard-coded skill release tag/,
    );
    requireRejection(
      temporaryRoot,
      "historical-issue-url",
      (root) => {
        const path = join(root, "references", "commands", "automation.md");
        writeFileSync(path, `${readFileSync(path, "utf8")}\nSee https://example.test/issues/186 and run gh pr checks 123.\n`);
      },
      /issue\/PR-specific historical guidance/,
    );
    requireRejection(
      temporaryRoot,
      "installed-publication-policy",
      (root) => {
        const path = join(root, "references", "publication.md");
        writeFileSync(path, "# Publication Policy\n");
      },
      /maintainer publication policy remains inside the installed skill/,
    );
    requireRejection(
      temporaryRoot,
      "readme-maintainer-policy",
      (root) => {
        const path = join(root, "README.md");
        writeFileSync(path, `${readFileSync(path, "utf8")}\n## Command Contract Maintenance\n`);
      },
      /README.md still contains installed maintainer publication or contract policy/,
    );
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

function main() {
  selfTest();
  if (suppliedSkillRoot) {
    validateSkill(resolve(suppliedSkillRoot), "package");
    console.log("installed-content guidance self-test passed for packaged skill");
    return;
  }

  validateSkill(sourceSkillRoot, "source", { requireRepositoryPolicy: true });
  console.log("installed-content guidance self-test passed for source and controlled drift fixtures");
}

main();
