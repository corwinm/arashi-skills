#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const checkerPath = fileURLToPath(import.meta.url);
const repositoryRoot = resolve(dirname(checkerPath), "..");
const sourceSkillRoot = join(repositoryRoot, "skills", "arashi");
const ownerPath = "references/commands/create.md";
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
  ["non-bare", "default", "flatten", "feature-auth"],
  ["non-bare", "branch", "preserve", "feature/auth"],
  ["non-bare", "branch", "flatten", "feature-auth"],
  ["non-bare", "repo-branch", "preserve", "example-feature/auth"],
  ["non-bare", "repo-branch", "flatten", "example-feature-auth"],
];

const canonicalJson = `\`\`\`json
{
  "worktreeNaming": {
    "style": "repo-branch",
    "branchSlashes": "flatten",
    "maxPathLength": 180
  }
}
\`\`\``;
const canonicalDefaults =
  "Omitting the `worktreeNaming` object or either individual field applies `default` and `preserve` without migrating and without persisting either default.";
const invariants =
  "The Git branch remains the exact requested name; only the directory path is transformed. A path collision fails without generating an alternate suffix. Existing worktrees are never renamed, and recorded metadata remains authoritative for locating them. Coordinated child placement remains unchanged. Standalone `.worktrees/<branch>` placement remains unchanged.";

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
  const lines = sectionContent
    .split("\n")
    .filter((candidate) => candidate.startsWith(`- \`${field}\``));
  assert.equal(lines.length, 1, `missing or duplicated ${field} enum declaration`);
  return [...lines[0].matchAll(/`([^`]+)`/g)].map((match) => match[1]).slice(1);
}

function parseExamples(sectionContent) {
  return [...sectionContent.matchAll(/```json\n([\s\S]*?)\n```/g)].map((match) => JSON.parse(match[1]));
}

function parseRows(sectionContent) {
  return sectionContent
    .split("\n")
    .filter((line) => /^\| (?:bare|non-bare) \|/.test(line))
    .map((line) =>
      line
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim().replace(/^`|`$/g, "")),
    );
}

function markdownFiles(root) {
  const files = [];
  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile() && entry.name.endsWith(".md")) files.push(absolute);
    }
  }
  visit(root);
  return files.sort();
}

function validateEnumClaims(content, field, allowed, label) {
  for (const claim of content.split(/\n|(?<=\.)\s+/)) {
    if (!new RegExp(`\\\`${field}\\\`[^.\\n]{0,100}(?:accepts?|supports?|allows?)`, "i").test(claim)) {
      continue;
    }
    const tokens = [...claim.matchAll(/`([^`]+)`/g)]
      .map((match) => match[1])
      .filter((token) => token !== field);
    assert.ok(
      tokens.length > 0 && tokens.every((token) => allowed.includes(token)),
      `${label} contains contradictory ${field} enum guidance`,
    );
  }
}

const contradictionRules = [
  [
    /`aw configure`\s+(?:also\s+)?(?:can|will|supports?|exposes?|configures?)[^.\n]{0,100}(?:worktree naming|`worktreeNaming`)|(?:worktree naming|`worktreeNaming`)[^.\n]{0,100}(?:through|via|with)[^.\n]{0,40}`aw configure`/i,
    "direct configuration authoring",
  ],
  [
    /`worktreeNaming`[^.\n]{0,100}(?:belongs|goes|is nested|must be placed)[^.\n]{0,30}(?:under|beneath|inside|within)[^.\n]{0,60}(?:`defaults`|`meta`|repository)/i,
    "root JSON ownership",
  ],
  [
    /(?:omitting|omitted)[^.\n]{0,80}`worktreeNaming`[^.\n]{0,120}(?:applies|selects?|uses?|defaults? to)[^.\n]{0,80}(?:`branch`|`repo-branch`|`flatten`)/i,
    "omitted defaults",
  ],
  [
    /Git branch[^.\n]{0,40}(?:is|becomes|gets|will be|may be|can be)[^.\n]{0,30}(?:renamed|flattened|transformed|rewritten)/i,
    "Git branch identity",
  ],
  [
    /collision[^.\n]{0,100}(?:adds?|generates?|uses?|receives?)[^.\n]{0,60}(?:alternate|numeric|unique)?[^.\n]*suffix|collision[^.\n]{0,100}suffix[^.\n]{0,40}(?:is|gets)[^.\n]{0,20}(?:added|generated)/i,
    "collision failure",
  ],
  [
    /existing worktrees?[^.\n]{0,80}(?:are renamed|will be renamed|may be renamed|can be renamed|get renamed)/i,
    "existing-worktree no-rename",
  ],
  [
    /(?:naming configuration|directory naming)[^.\n]{0,100}(?:is|remains|becomes)[^.\n]{0,40}authoritative|naming configuration[^.\n]{0,80}overrides?[^.\n]{0,40}recorded metadata|recorded metadata[^.\n]{0,80}(?:is|will be|may be|can be|gets)[^.\n]{0,30}(?:ignored|rewritten|replaced)/i,
    "metadata authority",
  ],
  [
    /coordinated child placement[^.\n]{0,100}(?:follows?|uses?|applies?)[^.\n]{0,80}(?:worktree naming|`worktreeNaming`|naming style)/i,
    "coordinated placement",
  ],
  [
    /standalone[^.\n]{0,100}(?:placement|`\.worktrees\/<branch>`)[^.\n]{0,100}(?:follows?|uses?|applies?)[^.\n]{0,80}(?:worktree naming|`worktreeNaming`|naming style)/i,
    "standalone placement",
  ],
  [
    /`maxPathLength`[^.\n]{0,100}(?:limits?|budgets?|measures?|applies to)[^.\n]{0,80}(?:folder|directory|path) component/i,
    "full absolute destination scope",
    true,
  ],
  [
    /(?:Arashi|the platform|Windows)[^.\n]{0,80}(?:automatically|always)[^.\n]{0,40}(?:sets?|chooses?|persists?|uses?)[^.\n]{0,60}(?:`maxPathLength`|path (?:length )?(?:budget|limit)|platform default)/i,
    "no automatic platform default",
    true,
  ],
  [
    /`maxPathLength`[^.\n]{0,120}(?:measured|counted)[^.\n]{0,50}(?:bytes?|Unicode code points?|characters?)/i,
    "UTF-16 measurement",
    true,
  ],
  [
    /(?:path budget|shortened (?:path|name)|`maxPathLength`)[^.\n]{0,140}(?:numeric|incrementing|random) (?:collision )?suffix/i,
    "deterministic hash suffix",
    true,
  ],
  [
    /(?:coordinated )?child(?:ren| paths?)?[^.\n]{0,100}(?:shorten|fit|size|calculate)[^.\n]{0,50}(?:independently|separately|their own parent)/i,
    "authoritative coordinated parent",
    true,
  ],
  [
    /(?:`maxPathLength`|path (?:length )?(?:budget|limit))[^.\n]{0,140}(?:guarantees?|ensures?|makes certain)[^.\n]{0,100}(?:repository-internal|files? (?:inside|within|in) (?:the )?repository|every (?:repository )?file)[^.\n]{0,50}(?:fit|fits|within)/i,
    "repository-content limitation",
    true,
  ],
];

const truthfulNegation =
  /\b(?:do|does|is|are|was|were|can|could|will|would|may|might|must|should)\s+not\b|\b(?:cannot|never)\b|n't\b/i;

function contradictionClauses(content) {
  return content
    .split(/(?<=[.!?])\s+|\n+|;\s*/u)
    .flatMap((fragment) =>
      fragment.split(
        /(?:\s*,?\s*\b(?:but|while|whereas|however|yet)\b\s*|\s*,?\s*\band\b\s*(?=(?:`|[A-Z]|\b(?:the|this|that|each|standalone|existing|coordinated|maxPathLength)\b)))/u,
      ),
    )
    .flatMap((fragment) => {
      if (!/^\s*(?:although|though|even\s+though)\b/iu.test(fragment)) return [fragment];
      const comma = fragment.indexOf(",");
      return comma < 0 ? [fragment] : [fragment.slice(0, comma), fragment.slice(comma + 1)];
    });
}

function containsContradiction(content, pattern, negationAware) {
  if (!negationAware) return pattern.test(content);
  return contradictionClauses(content).some(
    (fragment) => pattern.test(fragment) && !truthfulNegation.test(fragment),
  );
}

function validatePackageWidePolicy(root, label) {
  const defects = [];
  for (const absolute of markdownFiles(root)) {
    const path = relative(root, absolute).replaceAll("\\", "/");
    const content = readFileSync(absolute, "utf8");
    validateEnumClaims(content, "style", ["default", "branch", "repo-branch"], `${label}/${path}`);
    validateEnumClaims(content, "branchSlashes", ["preserve", "flatten"], `${label}/${path}`);

    for (const [pattern, family, negationAware = false] of contradictionRules) {
      if (containsContradiction(content, pattern, negationAware)) {
        defects.push(`${label}/${path} contains contradictory worktree naming guidance for ${family}`);
      }
    }

    if (
      path !== ownerPath &&
      /`worktreeNaming`/i.test(content) &&
      (/(?:`branchSlashes`|`repo-branch`)/i.test(content) ||
        /\|\s*(?:bare|non-bare)\s*\|/i.test(content) ||
        /(?:style|slash)[^.\n]{0,80}(?:accepts?|supports?|allows?)/i.test(content))
    ) {
      defects.push(
        `${label}/${path} detailed worktree naming policy must be owned only by ${ownerPath}`,
      );
    }
  }
  assert.deepEqual(defects, [], defects.join("\n"));
}

function validateSkill(root, label) {
  const content = readFileSync(join(root, ownerPath), "utf8");
  const guidance = section(content, "Configuring Worktree Naming");
  const items = paragraphs(guidance);

  requireParagraph(
    items,
    /configured workspaces[^.\n]*edit `\.arashi\/config\.json` directly[^.\n]*`aw configure`[^.\n]*(?:does not|doesn’t|doesn't)[^.\n]*(?:expose|edit|support)[^.\n]*(?:worktree naming|this setting)/i,
    `${label}/${ownerPath} must require direct config authoring instead of aw configure`,
  );

  const examples = parseExamples(guidance);
  assert.equal(examples.length, 1, `${label}/${ownerPath} must contain exactly one direct JSON example`);
  assert.deepEqual(
    examples[0],
    {
      worktreeNaming: {
        style: "repo-branch",
        branchSlashes: "flatten",
        maxPathLength: 180,
      },
    },
    `${label}/${ownerPath} must show worktreeNaming as a nested root JSON object`,
  );
  assert.deepEqual(
    parseEnum(guidance, "style"),
    ["default", "branch", "repo-branch"],
    `${label}/${ownerPath} style must accept exactly default, branch, and repo-branch`,
  );
  assert.deepEqual(
    parseEnum(guidance, "branchSlashes"),
    ["preserve", "flatten"],
    `${label}/${ownerPath} branchSlashes must accept exactly preserve and flatten`,
  );

  requireParagraph(
    items,
    /omitting[^.\n]*(?:`worktreeNaming`|object)[^.\n]*or[^.\n]*(?:either|individual)[^.\n]*field[^.\n]*`default`[^.\n]*`preserve`[^.\n]*without[^.\n]*migrat[^.\n]*without[^.\n]*persist/i,
    `${label}/${ownerPath} must define omitted default/preserve behavior without migration and persistence`,
  );

  requireParagraph(
    items,
    /`maxPathLength`[^.\n]*(?:optional|may be omitted)[^.\n]*positive integer[^.\n]*full absolute[^.\n]*(?:newly planned )?configured(?:-worktree)? destination[^.\n]*UTF-16 code units/i,
    `${label}/${ownerPath} must define the optional positive-integer full absolute configured destination budget in UTF-16 code units`,
  );
  requireParagraph(
    items,
    /omitting `maxPathLength`[^.\n]*preserves?[^.\n]*current paths[^.\n]*(?:does not|without)[^.\n]*(?:persist|migrat)[^.\n]*default/i,
    `${label}/${ownerPath} must preserve current paths without persisting or migrating an omitted maxPathLength default`,
  );
  requireParagraph(
    items,
    /(?:ordinary|unshortened)[^\n]{0,300}portable[^\n]{0,100}namespace[^\n]{0,200}readable prefix[^\n]*`-`[^\n]*first eight[^\n]*lowercase[^\n]*SHA-256[^\n]*hex/i,
    `${label}/${ownerPath} must define deterministic readable-prefix plus eight-hex SHA-256 shortening over the portable ordinary namespace`,
  );
  requireParagraph(
    items,
    /one authoritative parent[^.\n]*sized[^.\n]*all selected coordinated child paths[^.\n]*child-relative paths[^.\n]*unchanged/i,
    `${label}/${ownerPath} must size one authoritative parent against all selected coordinated children without changing child-relative paths`,
  );
  requireParagraph(
    items,
    /`WORKTREE_PATH_LENGTH_EXCEEDED`[^.\n]*before[^.\n]*mutation[^.\n]*fixed topology[^.\n]*(?:cannot|can(?:not|'t))[^.\n]*fit/i,
    `${label}/${ownerPath} must require WORKTREE_PATH_LENGTH_EXCEEDED before mutation when fixed topology cannot fit`,
  );
  requireParagraph(
    items,
    /(?:reserves?|reservation)[^.\n]*worktree-root[^.\n]*space[^.\n]*(?:cannot|does not)[^.\n]*guarantee[^.\n]*repository-internal files[^.\n]*fit/i,
    `${label}/${ownerPath} must limit the promise to reserved worktree-root space without a repository-content guarantee`,
  );

  assert.deepEqual(
    parseRows(guidance),
    expectedRows,
    `${label}/${ownerPath} must preserve the exact 12-row repository/style/slash/path matrix`,
  );

  requireParagraph(
    items,
    /Git branch[^.\n]*(?:remains|is)[^.\n]*exact[^.\n]*(?:requested|input|name)[^.\n]*(?:only|regardless)[^.\n]*(?:directory|path|transform)/i,
    `${label}/${ownerPath} must preserve the exact Git branch independently of directory naming`,
  );
  requireParagraph(
    items,
    /collision[^.\n]*fail[^.\n]*(?:without|never|no)[^.\n]*(?:alternate|automatic|generated)[^.\n]*suffix/i,
    `${label}/${ownerPath} must require collisions to fail without an alternate suffix`,
  );
  requireParagraph(
    items,
    /existing worktrees[^.\n]*(?:are not|never)[^.\n]*renamed/i,
    `${label}/${ownerPath} must require existing worktrees never to be renamed`,
  );
  requireParagraph(
    items,
    /recorded metadata[^.\n]*(?:remains|is)[^.\n]*authoritative/i,
    `${label}/${ownerPath} must keep recorded metadata authoritative`,
  );
  requireParagraph(
    items,
    /coordinated child placement[^.\n]*(?:is|remains)[^.\n]*unchanged/i,
    `${label}/${ownerPath} must keep coordinated child placement unchanged`,
  );
  requireParagraph(
    items,
    /standalone[^.\n]*`\.worktrees\/<branch>`[^.\n]*(?:is|remains)[^.\n]*unchanged/i,
    `${label}/${ownerPath} must keep standalone .worktrees/<branch> placement unchanged`,
  );

  validatePackageWidePolicy(root, label);
}

function replacement(name, from, to, diagnostic, path = ownerPath) {
  return { name, from, to, diagnostic, path };
}

const driftCases = [
  replacement("direct-json-root", canonicalJson, canonicalJson.replace('  "worktreeNaming"', '  "defaults": {\n    "worktreeNaming"').replace('\n}', '\n  }\n}'), /nested root JSON object/),
  replacement("direct-json-removed", `${canonicalJson}\n\n`, "", /exactly one direct JSON example/),
  replacement("path-budget-json-mutated", '    "maxPathLength": 180', '    "maxPathLength": 181', /nested root JSON object/),
  replacement("path-budget-json-removed", ',\n    "maxPathLength": 180', "", /nested root JSON object/),
  replacement("style-default-mutated", "`default`, `branch`, and `repo-branch`", "`standard`, `branch`, and `repo-branch`", /style must accept exactly/),
  replacement("style-default-removed", "`default`, `branch`, and `repo-branch`", "`branch` and `repo-branch`", /style must accept exactly/),
  replacement("style-branch-mutated", "`default`, `branch`, and `repo-branch`", "`default`, `topic`, and `repo-branch`", /style must accept exactly/),
  replacement("style-branch-removed", "`default`, `branch`, and `repo-branch`", "`default` and `repo-branch`", /style must accept exactly/),
  replacement("style-repo-branch-mutated", "`default`, `branch`, and `repo-branch`", "`default`, `branch`, and `repository-branch`", /style must accept exactly/),
  replacement("style-repo-branch-removed", "`default`, `branch`, and `repo-branch`", "`default` and `branch`", /style must accept exactly/),
  replacement("slashes-preserve-mutated", "`preserve` and `flatten`", "`keep` and `flatten`", /branchSlashes must accept exactly/),
  replacement("slashes-preserve-removed", "`preserve` and `flatten`", "`flatten`", /branchSlashes must accept exactly/),
  replacement("slashes-flatten-mutated", "`preserve` and `flatten`", "`preserve` and `replace`", /branchSlashes must accept exactly/),
  replacement("slashes-flatten-removed", "`preserve` and `flatten`", "`preserve`", /branchSlashes must accept exactly/),
  replacement("omitted-style-mutated", "applies `default` and `preserve`", "applies `branch` and `preserve`", /omitted default\/preserve behavior/),
  replacement("omitted-style-removed", "applies `default` and `preserve`", "applies a style and `preserve`", /omitted default\/preserve behavior/),
  replacement("omitted-slashes-mutated", "applies `default` and `preserve`", "applies `default` and `flatten`", /omitted default\/preserve behavior/),
  replacement("omitted-slashes-removed", "applies `default` and `preserve`", "applies `default` and a slash policy", /omitted default\/preserve behavior/),
  replacement("omitted-migration-mutated", "without migrating", "while migrating existing worktrees", /without migration and persistence/),
  replacement("omitted-migration-removed", "without migrating and ", "", /without migration and persistence/),
  replacement("omitted-persistence-mutated", "without persisting either default", "while persisting both defaults", /without migration and persistence/),
  replacement("omitted-persistence-removed", " and without persisting either default", "", /without migration and persistence/),
  ...expectedRows.flatMap((row, index) => {
    const rendered = `| ${row[0]} | \`${row[1]}\` | \`${row[2]}\` | \`${row[3]}\` |`;
    return [
      replacement(`matrix-row-${index + 1}-mutated`, rendered, rendered.replace(row[3], `incorrect/${index + 1}`), /exact 12-row repository\/style\/slash\/path matrix/),
      replacement(`matrix-row-${index + 1}-removed`, `${rendered}\n`, "", /exact 12-row repository\/style\/slash\/path matrix/),
      replacement(`matrix-row-${index + 1}-additive-contradiction`, `${rendered}\n`, `${rendered}\n${rendered.replace(row[3], `incorrect/${index + 1}`)}\n`, /exact 12-row repository\/style\/slash\/path matrix/),
    ];
  }),
  replacement("branch-identity-mutated", "The Git branch remains the exact requested name", "The Git branch is renamed to match the flattened directory path", /preserve the exact Git branch/),
  replacement("branch-identity-removed", "The Git branch remains the exact requested name; only the directory path is transformed. ", "", /preserve the exact Git branch/),
  replacement("collision-mutated", "A path collision fails without generating an alternate suffix", "A path collision generates an alternate suffix", /collisions to fail without an alternate suffix/),
  replacement("collision-removed", "A path collision fails without generating an alternate suffix. ", "", /collisions to fail without an alternate suffix/),
  replacement("no-rename-mutated", "Existing worktrees are never renamed", "Existing worktrees are renamed", /existing worktrees never to be renamed/),
  replacement("no-rename-removed", "Existing worktrees are never renamed, ", "", /existing worktrees never to be renamed/),
  replacement("metadata-mutated", "recorded metadata remains authoritative", "naming configuration is authoritative", /recorded metadata authoritative/),
  replacement("metadata-removed", "recorded metadata remains authoritative for locating them", "their locations are rediscovered", /recorded metadata authoritative/),
  replacement("coordinated-mutated", "Coordinated child placement remains unchanged", "Coordinated child placement follows the naming style", /coordinated child placement unchanged/),
  replacement("coordinated-removed", "Coordinated child placement remains unchanged. ", "", /coordinated child placement unchanged/),
  replacement("standalone-mutated", "Standalone `.worktrees/<branch>` placement remains unchanged", "Standalone `.worktrees/<branch>` placement follows worktree naming", /standalone \.worktrees\/<branch> placement unchanged/),
  replacement("standalone-removed", "Standalone `.worktrees/<branch>` placement remains unchanged.", "", /standalone \.worktrees\/<branch> placement unchanged/),
  replacement("direct-authoring-mutated", "edit `.arashi/config.json` directly", "run `aw configure` interactively", /direct config authoring instead of aw configure/),
  replacement("direct-authoring-removed", "For configured workspaces, edit `.arashi/config.json` directly; `aw configure` does not expose worktree naming. ", "", /direct config authoring instead of aw configure/),
  replacement("component-only-limit-mutated", "the full absolute newly planned configured-worktree destination", "only the generated directory component", /full absolute configured destination budget/),
  replacement("component-only-limit-removed", "the full absolute newly planned configured-worktree destination", "the newly planned configured-worktree destination", /full absolute configured destination budget/),
  replacement("automatic-default-mutated", "Omitting `maxPathLength` preserves current paths and does not persist or migrate a default", "Omitting `maxPathLength` selects and persists a platform default", /preserve current paths without persisting or migrating/),
  replacement("automatic-default-removed", "Omitting `maxPathLength` preserves current paths and does not persist or migrate a default; ", "", /preserve current paths without persisting or migrating/),
  replacement("measurement-unit-mutated", "measured in UTF-16 code units", "measured in Unicode code points", /UTF-16 code units/),
  replacement("measurement-unit-removed", ", measured in UTF-16 code units", "", /UTF-16 code units/),
  replacement("numeric-collision-suffix-mutated", "a readable prefix, `-`, and the first eight lowercase SHA-256 hex characters", "a readable prefix and an incrementing numeric collision suffix", /eight-hex SHA-256 shortening/),
  replacement("numeric-collision-suffix-removed", " The fitted name uses a readable prefix, `-`, and the first eight lowercase SHA-256 hex characters over the portable ordinary namespace.", "", /eight-hex SHA-256 shortening/),
  replacement("independent-child-shortening-mutated", "One authoritative parent is sized against all selected coordinated child paths, with child-relative paths unchanged", "Each selected child shortens its parent independently", /one authoritative parent/),
  replacement("independent-child-shortening-removed", "One authoritative parent is sized against all selected coordinated child paths, with child-relative paths unchanged. ", "", /one authoritative parent/),
  replacement("repository-content-guarantee-mutated", "cannot guarantee repository-internal files fit", "guarantees every repository-internal file fits", /without a repository-content guarantee/),
  replacement("repository-content-guarantee-removed", " This reserves worktree-root path space but cannot guarantee repository-internal files fit.", "", /without a repository-content guarantee/),
];

const additiveContradictions = [
  ["direct-authoring", "`aw configure` can configure worktree naming.", /contradictory worktree naming guidance for direct configuration authoring/],
  ["json-location", "The `worktreeNaming` object belongs under `defaults`.", /contradictory worktree naming guidance for root JSON ownership/],
  ["style-enum", "`style` also accepts `standard`.", /contradictory style enum guidance/],
  ["slashes-enum", "`branchSlashes` also accepts `keep`.", /contradictory branchSlashes enum guidance/],
  ["omitted-defaults", "Omitting `worktreeNaming` selects `branch` and `flatten`.", /contradictory worktree naming guidance for omitted defaults/],
  ["branch-identity", "The Git branch is renamed to match the flattened directory path.", /contradictory worktree naming guidance for Git branch identity/],
  ["collision", "A path collision generates a numeric suffix.", /contradictory worktree naming guidance for collision failure/],
  ["no-rename", "Existing worktrees may be renamed when the style changes.", /contradictory worktree naming guidance for existing-worktree no-rename/],
  ["metadata", "Naming configuration overrides recorded metadata.", /contradictory worktree naming guidance for metadata authority/],
  ["coordinated", "Coordinated child placement follows the naming style.", /contradictory worktree naming guidance for coordinated placement/],
  ["standalone", "Standalone `.worktrees/<branch>` placement follows worktree naming.", /contradictory worktree naming guidance for standalone placement/],
  ["component-only-limit", "`maxPathLength` limits only the generated directory component.", /contradictory worktree naming guidance for full absolute destination scope/],
  ["automatic-default", "Arashi automatically chooses and persists a platform default for `maxPathLength`.", /contradictory worktree naming guidance for no automatic platform default/],
  ["measurement-unit", "`maxPathLength` is measured in Unicode code points.", /contradictory worktree naming guidance for UTF-16 measurement/],
  ["numeric-collision-suffix", "A shortened path budget uses an incrementing numeric collision suffix.", /contradictory worktree naming guidance for deterministic hash suffix/],
  ["independent-child-shortening", "Coordinated children shorten their parents independently.", /contradictory worktree naming guidance for authoritative coordinated parent/],
  ["repository-content-guarantee", "The `maxPathLength` budget guarantees every repository-internal file fits within the limit.", /contradictory worktree naming guidance for repository-content limitation/],
  [
    "component-only-limit-mixed-polarity",
    "`maxPathLength` does not limit a folder component, but `maxPathLength` limits only one folder component.",
    /contradictory worktree naming guidance for full absolute destination scope/,
  ],
  [
    "automatic-default-mixed-polarity",
    "Arashi does not automatically set `maxPathLength`, but Arashi automatically chooses a platform default for `maxPathLength`.",
    /contradictory worktree naming guidance for no automatic platform default/,
  ],
  [
    "measurement-unit-mixed-polarity",
    "`maxPathLength` is not measured in characters, but `maxPathLength` is measured in UTF-8 bytes.",
    /contradictory worktree naming guidance for UTF-16 measurement/,
  ],
  [
    "numeric-collision-suffix-mixed-polarity",
    "The path budget does not use a numeric suffix, but the path budget uses an incrementing numeric suffix.",
    /contradictory worktree naming guidance for deterministic hash suffix/,
  ],
  [
    "independent-child-shortening-mixed-polarity",
    "Coordinated children do not shorten independently, but coordinated children shorten their own parent independently.",
    /contradictory worktree naming guidance for authoritative coordinated parent/,
  ],
  [
    "repository-content-guarantee-mixed-polarity",
    "The path budget cannot guarantee repository-internal files fit, but the path budget guarantees every repository-internal file fits within the limit.",
    /contradictory worktree naming guidance for repository-content limitation/,
  ],
  [
    "component-only-limit-coordinating-conjunction",
    "`maxPathLength` does not limit a folder component, and `maxPathLength` limits only one folder component.",
    /contradictory worktree naming guidance for full absolute destination scope/,
  ],
  [
    "automatic-default-subordinate-clause",
    "Arashi does not automatically set `maxPathLength`, while Arashi automatically chooses a platform default for `maxPathLength`.",
    /contradictory worktree naming guidance for no automatic platform default/,
  ],
  [
    "measurement-unit-contrasting-clause",
    "`maxPathLength` is not measured in characters, whereas `maxPathLength` is measured in UTF-8 bytes.",
    /contradictory worktree naming guidance for UTF-16 measurement/,
  ],
  [
    "repository-content-guarantee-concessive-clause",
    "Although the path budget cannot guarantee repository-internal files fit, the path budget guarantees every repository-internal file fits within the limit.",
    /contradictory worktree naming guidance for repository-content limitation/,
  ],
].map(([name, claim, diagnostic]) =>
  replacement(
    `additive-${name}-contradiction`,
    "## Repository Worktree File Materialization",
    `${claim}\n\n## Repository Worktree File Materialization`,
    diagnostic,
  ),
);

const ownershipDrifts = [
  replacement(
    "duplicate-owner-skill-manifest",
    "# Arashi Skill",
    "# Arashi Skill\n\nThe `worktreeNaming` policy is detailed here too.\n\n- `style` accepts exactly `default`, `branch`, and `repo-branch`.\n- `branchSlashes` accepts exactly `preserve` and `flatten`.",
    /detailed worktree naming policy must be owned only by/,
    "SKILL.md",
  ),
  replacement(
    "duplicate-owner-other-reference",
    "# Workspace and repositories",
    "# Workspace and repositories\n\nThe `worktreeNaming` policy is detailed here too.\n\n- `style` accepts exactly `default`, `branch`, and `repo-branch`.\n- `branchSlashes` accepts exactly `preserve` and `flatten`.",
    /detailed worktree naming policy must be owned only by/,
    "references/commands/workspace.md",
  ),
  replacement(
    "contradiction-other-reference",
    "# Workspace and repositories",
    "# Workspace and repositories\n\nA path collision generates a numeric suffix for worktree naming.",
    /contradictory worktree naming guidance for collision failure/,
    "references/commands/workspace.md",
  ),
];

const truthfulPathBudgetControls = [
  "`maxPathLength` does not limit a folder component.",
  "Arashi does not automatically set `maxPathLength` or a platform default.",
  "`maxPathLength` is not measured in characters.",
  "The path budget does not use a numeric suffix.",
  "Coordinated children do not shorten their parents independently.",
  "The path budget cannot guarantee repository-internal files fit.",
];

function validateTruthfulPathBudgetControls() {
  const roots = [];
  try {
    for (const [index, claim] of truthfulPathBudgetControls.entries()) {
      const root = mkdtempSync(join(tmpdir(), `arashi-worktree-naming-truthful-${index}-`));
      roots.push(root);
      const skillRoot = join(root, "skills", "arashi");
      cpSync(sourceSkillRoot, skillRoot, { recursive: true });
      const guidancePath = join(skillRoot, ownerPath);
      const original = readFileSync(guidancePath, "utf8");
      writeFileSync(guidancePath, `${original}\n${claim}\n`);

      assert.doesNotThrow(
        () => validateSkill(skillRoot, `truthful-${index}`),
        `truthful control rejected by direct validation: ${claim}`,
      );
      const packaged = spawnSync(process.execPath, [checkerPath, "--skill-root", skillRoot], {
        cwd: repositoryRoot,
        encoding: "utf8",
      });
      assert.equal(
        packaged.status,
        0,
        `truthful control rejected by --skill-root validation: ${claim}\n${output(packaged)}`,
      );
    }
  } finally {
    for (const root of roots) rmSync(root, { recursive: true, force: true });
  }
}

function validateControlledDrift() {
  const roots = [];
  const falseGreens = [];
  try {
    for (const drift of [...driftCases, ...additiveContradictions, ...ownershipDrifts]) {
      const root = mkdtempSync(join(tmpdir(), `arashi-worktree-naming-${drift.name}-`));
      roots.push(root);
      const skillRoot = join(root, "skills", "arashi");
      cpSync(sourceSkillRoot, skillRoot, { recursive: true });
      const guidancePath = join(skillRoot, drift.path);
      const original = readFileSync(guidancePath, "utf8");
      assert.ok(original.includes(drift.from), `${drift.name} drift fixture source is stale`);
      writeFileSync(guidancePath, original.replace(drift.from, drift.to));

      try {
        validateSkill(skillRoot, `source-${drift.name}-drift`);
        falseGreens.push(`${drift.name}: direct semantic validation accepted drift`);
      } catch (error) {
        assert.match(String(error.message), drift.diagnostic, `${drift.name} direct diagnostic`);
      }

      const packaged = spawnSync(process.execPath, [checkerPath, "--skill-root", skillRoot], {
        cwd: repositoryRoot,
        encoding: "utf8",
      });
      if (packaged.status === 0) {
        falseGreens.push(`${drift.name}: --skill-root validation accepted drift`);
      } else {
        assert.match(output(packaged), drift.diagnostic, `${drift.name} package diagnostic`);
      }
    }
    assert.deepEqual(falseGreens, [], `controlled drift false greens:\n${falseGreens.join("\n")}`);
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
  validateTruthfulPathBudgetControls();
  validateControlledDrift();
  const fixtureCount = driftCases.length + additiveContradictions.length + ownershipDrifts.length;
  console.log(
    `worktree naming guidance self-test passed for source and ${fixtureCount} independent source/package semantic drift fixtures`,
  );
}

main();
