#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const checkerPath = fileURLToPath(import.meta.url);
const repositoryRoot = resolve(dirname(checkerPath), "..");
const sourceSkillRoot = join(repositoryRoot, "skills", "arashi");
const relativePath = "references/commands/create.md";
const skillRootArgumentIndex = process.argv.indexOf("--skill-root");
const suppliedSkillRoot =
  skillRootArgumentIndex >= 0 ? process.argv[skillRootArgumentIndex + 1] : undefined;

if (skillRootArgumentIndex >= 0 && !suppliedSkillRoot) {
  throw new Error("--skill-root requires a path");
}

const expectedRows = [
  ["bare", "default", "preserve", "example/feature/auth"],
  ["bare", "default", "flatten", "example/feature-auth"],
  ["bare", "branch", "preserve", "feature/auth"],
  ["bare", "branch", "flatten", "feature-auth"],
  ["bare", "repo-branch", "preserve", "example-feature/auth"],
  ["bare", "repo-branch", "flatten", "example-feature-auth"],
  ["non-bare", "default", "preserve", "feature/auth"],
];

function output(result) {
  return `${result.stdout}${result.stderr}`;
}

function section(content, heading) {
  const marker = `## ${heading}`;
  const start = content.indexOf(marker);
  assert.notEqual(start, -1, `missing section ${JSON.stringify(marker)}`);
  const end = content.indexOf("\n## ", start + marker.length);
  return content.slice(start, end === -1 ? content.length : end);
}

function paragraphs(content) {
  return content
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function requireParagraph(items, pattern, diagnostic) {
  assert.ok(items.some((paragraph) => pattern.test(paragraph)), diagnostic);
}

function parseEnum(sectionContent, field) {
  const line = sectionContent
    .split("\n")
    .find((candidate) => candidate.startsWith(`- \`${field}\``));
  assert.ok(line, `missing ${field} enum declaration`);
  return [...line.matchAll(/`([^`]+)`/g)].map((match) => match[1]).slice(1);
}

function parseExample(sectionContent) {
  const match = sectionContent.match(/```json\n([\s\S]*?)\n```/);
  assert.ok(match, "worktree naming guidance must contain a JSON example");
  return JSON.parse(match[1]);
}

function parseRows(sectionContent) {
  return sectionContent
    .split("\n")
    .filter((line) => /^\| (?:bare|non-bare) \|/.test(line))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim().replace(/^`|`$/g, "")));
}

function validateSkill(root, label) {
  const content = readFileSync(join(root, relativePath), "utf8");
  const guidance = section(content, "Configuring Worktree Naming");
  const items = paragraphs(guidance);

  requireParagraph(
    items,
    /configured workspaces[^.\n]*edit `\.arashi\/config\.json` directly[^.\n]*`aw configure`[^.\n]*(?:does not|doesn’t|doesn't)[^.\n]*(?:expose|edit|support)[^.\n]*(?:worktree naming|this setting)/i,
    `${label}/${relativePath} must require direct config authoring instead of aw configure`,
  );

  assert.deepEqual(
    parseExample(guidance),
    { worktreeNaming: { style: "repo-branch", branchSlashes: "flatten" } },
    `${label}/${relativePath} must show worktreeNaming as a nested root JSON object`,
  );
  assert.deepEqual(
    parseEnum(guidance, "style"),
    ["default", "branch", "repo-branch"],
    `${label}/${relativePath} style must accept exactly default, branch, and repo-branch`,
  );
  assert.deepEqual(
    parseEnum(guidance, "branchSlashes"),
    ["preserve", "flatten"],
    `${label}/${relativePath} branchSlashes must accept exactly preserve and flatten`,
  );

  requireParagraph(
    items,
    /omitting[^.\n]*(?:`worktreeNaming`|object)[^.\n]*or[^.\n]*(?:either|individual)[^.\n]*field[^.\n]*`default`[^.\n]*`preserve`[^.\n]*(?:without|does not|never)[^.\n]*(?:migrat|persist|writ)[^.\n]*(?:without|and)[^.\n]*(?:migrat|persist|writ)/i,
    `${label}/${relativePath} must define omitted default/preserve behavior without migration or persistence`,
  );

  assert.deepEqual(
    parseRows(guidance),
    expectedRows,
    `${label}/${relativePath} must preserve the exact repository/style/slash/path example matrix`,
  );

  requireParagraph(
    items,
    /Git branch[^.\n]*(?:remains|is)[^.\n]*exact[^.\n]*(?:requested|input|name)[^.\n]*(?:only|regardless)[^.\n]*(?:directory|path|transform)/i,
    `${label}/${relativePath} must preserve the exact Git branch independently of directory naming`,
  );
  requireParagraph(
    items,
    /collision[^.\n]*fail[^.\n]*(?:without|never|no)[^.\n]*(?:alternate|automatic|generated)[^.\n]*suffix/i,
    `${label}/${relativePath} must require collisions to fail without an alternate suffix`,
  );
  requireParagraph(
    items,
    /existing worktrees[^.\n]*(?:are not|never)[^.\n]*renamed[^.\n]*metadata[^.\n]*(?:remains|is)[^.\n]*authoritative/i,
    `${label}/${relativePath} must preserve existing worktrees and metadata authority`,
  );
  requireParagraph(
    items,
    /coordinated child placement[^.\n]*(?:is|remains)[^.\n]*unchanged/i,
    `${label}/${relativePath} must keep coordinated child placement unchanged`,
  );
  requireParagraph(
    items,
    /standalone[^.\n]*`\.worktrees\/<branch>`[^.\n]*(?:is|remains)[^.\n]*unchanged/i,
    `${label}/${relativePath} must keep standalone .worktrees/<branch> placement unchanged`,
  );
}

const driftCases = [
  {
    name: "nested-root",
    from: `\`\`\`json
{
  "worktreeNaming": {
    "style": "repo-branch",
    "branchSlashes": "flatten"
  }
}
\`\`\``,
    to: `\`\`\`json
{
  "defaults": {
    "worktreeNaming": {
      "style": "repo-branch",
      "branchSlashes": "flatten"
    }
  }
}
\`\`\``,
    diagnostic: /nested root JSON object/,
  },
  { name: "style-default", from: "`default`, `branch`, and `repo-branch`", to: "`standard`, `branch`, and `repo-branch`", diagnostic: /style must accept exactly/ },
  { name: "style-default-removed", from: "`default`, `branch`, and `repo-branch`", to: "`branch` and `repo-branch`", diagnostic: /style must accept exactly/ },
  { name: "style-branch", from: "`default`, `branch`, and `repo-branch`", to: "`default`, `topic`, and `repo-branch`", diagnostic: /style must accept exactly/ },
  { name: "style-branch-removed", from: "`default`, `branch`, and `repo-branch`", to: "`default` and `repo-branch`", diagnostic: /style must accept exactly/ },
  { name: "style-repo-branch", from: "`default`, `branch`, and `repo-branch`", to: "`default`, `branch`, and `repository-branch`", diagnostic: /style must accept exactly/ },
  { name: "style-repo-branch-removed", from: "`default`, `branch`, and `repo-branch`", to: "`default` and `branch`", diagnostic: /style must accept exactly/ },
  { name: "slashes-preserve", from: "`preserve` and `flatten`", to: "`keep` and `flatten`", diagnostic: /branchSlashes must accept exactly/ },
  { name: "slashes-preserve-removed", from: "`preserve` and `flatten`", to: "`flatten`", diagnostic: /branchSlashes must accept exactly/ },
  { name: "slashes-flatten", from: "`preserve` and `flatten`", to: "`preserve` and `replace`", diagnostic: /branchSlashes must accept exactly/ },
  { name: "slashes-flatten-removed", from: "`preserve` and `flatten`", to: "`preserve`", diagnostic: /branchSlashes must accept exactly/ },
  { name: "omitted-style-default", from: "applies `default` and `preserve`", to: "applies `branch` and `preserve`", diagnostic: /omitted default\/preserve behavior/ },
  { name: "omitted-slashes-preserve", from: "applies `default` and `preserve`", to: "applies `default` and `flatten`", diagnostic: /omitted default\/preserve behavior/ },
  { name: "omitted-defaults-removed", from: "Omitting the `worktreeNaming` object or either individual field applies `default` and `preserve` without migrating and without persisting either default.", to: "Omitted fields use runtime behavior.", diagnostic: /omitted default\/preserve behavior/ },
  { name: "no-persistence", from: "without migrating and without persisting either default", to: "and persists both defaults", diagnostic: /without migration or persistence/ },
  ...expectedRows.flatMap((row, index) => [
    {
      name: `path-${index + 1}`,
      from: `| ${row[0]} | \`${row[1]}\` | \`${row[2]}\` | \`${row[3]}\` |`,
      to: `| ${row[0]} | \`${row[1]}\` | \`${row[2]}\` | \`incorrect/${index + 1}\` |`,
      diagnostic: /exact repository\/style\/slash\/path example matrix/,
    },
    {
      name: `path-${index + 1}-removed`,
      from: `| ${row[0]} | \`${row[1]}\` | \`${row[2]}\` | \`${row[3]}\` |\n`,
      to: "",
      diagnostic: /exact repository\/style\/slash\/path example matrix/,
    },
  ]),
  { name: "git-branch-exact", from: "The Git branch remains the exact requested name", to: "The Git branch follows the transformed directory name", diagnostic: /preserve the exact Git branch/ },
  { name: "git-branch-exact-removed", from: "The Git branch remains the exact requested name; only the directory path is transformed. ", to: "", diagnostic: /preserve the exact Git branch/ },
  { name: "collision", from: "A path collision fails without generating an alternate suffix", to: "A path collision generates an alternate suffix", diagnostic: /collisions to fail without an alternate suffix/ },
  { name: "collision-removed", from: "A path collision fails without generating an alternate suffix. ", to: "", diagnostic: /collisions to fail without an alternate suffix/ },
  { name: "existing-worktrees", from: "Existing worktrees are never renamed, and recorded metadata remains authoritative", to: "Existing worktrees are renamed, and naming configuration remains authoritative", diagnostic: /preserve existing worktrees and metadata authority/ },
  { name: "existing-worktrees-removed", from: "Existing worktrees are never renamed, and recorded metadata remains authoritative for locating them. ", to: "", diagnostic: /preserve existing worktrees and metadata authority/ },
  { name: "coordinated-placement", from: "Coordinated child placement remains unchanged", to: "Coordinated child placement follows the naming style", diagnostic: /coordinated child placement unchanged/ },
  { name: "coordinated-placement-removed", from: "Coordinated child placement remains unchanged. ", to: "", diagnostic: /coordinated child placement unchanged/ },
  { name: "standalone-placement", from: "Standalone `.worktrees/<branch>` placement remains unchanged", to: "Standalone placement follows worktreeNaming", diagnostic: /standalone \.worktrees\/<branch> placement unchanged/ },
  { name: "standalone-placement-removed", from: "Standalone `.worktrees/<branch>` placement remains unchanged.", to: "", diagnostic: /standalone \.worktrees\/<branch> placement unchanged/ },
  { name: "direct-authoring", from: "edit `.arashi/config.json` directly", to: "run `aw configure` interactively", diagnostic: /direct config authoring instead of aw configure/ },
  { name: "direct-authoring-removed", from: "For configured workspaces, edit `.arashi/config.json` directly; `aw configure` does not expose worktree naming. ", to: "", diagnostic: /direct config authoring instead of aw configure/ },
];

function validateControlledDrift() {
  const roots = [];
  try {
    for (const drift of driftCases) {
      const root = mkdtempSync(join(tmpdir(), `arashi-worktree-naming-${drift.name}-`));
      roots.push(root);
      const skillRoot = join(root, "skills", "arashi");
      cpSync(sourceSkillRoot, skillRoot, { recursive: true });
      const guidancePath = join(skillRoot, relativePath);
      const original = readFileSync(guidancePath, "utf8");
      assert.ok(original.includes(drift.from), `${drift.name} drift fixture source is stale`);
      writeFileSync(guidancePath, original.replace(drift.from, drift.to));

      assert.throws(
        () => validateSkill(skillRoot, `source-${drift.name}-drift`),
        drift.diagnostic,
        `${drift.name} drift must fail direct semantic validation`,
      );

      const packaged = spawnSync(process.execPath, [checkerPath, "--skill-root", skillRoot], {
        cwd: repositoryRoot,
        encoding: "utf8",
      });
      assert.notEqual(packaged.status, 0, `${drift.name} drift must fail package validation`);
      assert.match(output(packaged), drift.diagnostic);
    }
  } finally {
    for (const root of roots) rmSync(root, { recursive: true, force: true });
  }
}

function main() {
  if (suppliedSkillRoot) {
    validateSkill(resolve(suppliedSkillRoot), "package");
    console.log("worktree naming guidance self-test passed for packaged skill semantics");
    return;
  }

  validateSkill(sourceSkillRoot, "source");
  validateControlledDrift();
  console.log(
    `worktree naming guidance self-test passed for source and ${driftCases.length} source/package semantic drift fixtures`,
  );
}

main();
