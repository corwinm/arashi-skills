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
const relativePath = "references/commands/workspace.md";
const skillRootArgumentIndex = process.argv.indexOf("--skill-root");
const suppliedSkillRoot =
  skillRootArgumentIndex >= 0 ? process.argv[skillRootArgumentIndex + 1] : undefined;

if (skillRootArgumentIndex >= 0 && !suppliedSkillRoot) {
  throw new Error("--skill-root requires a path");
}

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

function validateSkill(root, label) {
  const content = readFileSync(join(root, relativePath), "utf8");
  const guidance = section(content, "Deleting Configured Repository Dependencies");
  const items = paragraphs(guidance);

  requireParagraph(
    items,
    /explicit destructive intent.*(?:required|must be present).*configured repository dependency deletion.*(?:inspect|detach|clean).*branch\/worktree cleanup.*(?:do not|never).*(?:infer|grant)/i,
    `${label}/${relativePath} must require explicit destructive intent without inferring it from cleanup requests`,
  );
  requireParagraph(
    items,
    /inspect.*installed `aw delete --help`.*before.*(?:planning|use|invocation)/i,
    `${label}/${relativePath} must make installed delete help the preflight authority`,
  );
  requireParagraph(
    items,
    /`aw delete <repository>`.*one exact configured `repos\.<repository>` key.*(?:not|never).*(?:path|branch|fuzzy|alias)/i,
    `${label}/${relativePath} must bind explicit delete automation to one exact configured key`,
  );
  requireParagraph(
    items,
    /human TTY.*omitted.*`aw delete`.*checkbox.*(?:one or many|one\/many).*names? and (?:submitted )?values?.*exact(?:ly)?.*configured keys?.*(?:no|not|never).*(?:path|Git URL).*(?:group|description).*metadata.*combined preview.*one default-no confirmation/i,
    `${label}/${relativePath} must teach key-only TTY checkbox names and values without repository metadata`,
  );
  requireParagraph(
    items,
    /omitted.*(?:target|repository).*(?:non-TTY|noninteractive).*JSON.*`DELETE_SELECTION_REQUIRED`.*neither.*`--force`.*nor.*`--dry-run`.*(?:choose|invent|infer|default)/i,
    `${label}/${relativePath} must reject omitted non-TTY/JSON targets even with force or dry-run`,
  );
  requireParagraph(
    items,
    /`aw delete <repository> --dry-run`.*produces?.*(?:exact|complete).*plan.*review.*(?:accept|confirm).*only then.*`aw delete <repository> --force`.*same exact (?:configured )?key/i,
    `${label}/${relativePath} must require dry-run to produce a reviewed exact-key plan before force automation`,
  );
  requireParagraph(
    items,
    /`aw delete`.*configured repository dependenc.*`aw remove`.*branch\/worktree.*(?:do not|never).*(?:substitute|alias|hand-edit).*(?:config|paths|hooks)/i,
    `${label}/${relativePath} must distinguish delete from remove and forbid broad manual substitutes`,
  );
  requireParagraph(
    items,
    /deletion plan.*canonical clone.*all owned linked worktrees.*local refs.*exact `repos\.<repository>` entry.*canonical local repository-targeted hook files\/templates/i,
    `${label}/${relativePath} must identify complete deletion-owned scope`,
  );
  requireParagraph(
    items,
    /preserves?.*unrelated config.*managed-ignore policy.*shared hooks.*user-global hooks.*remote repositories.*remote branches/i,
    `${label}/${relativePath} must identify preserved configuration, hook, ignore, and remote scope`,
  );
  requireParagraph(
    items,
    /dirty.*unpublished.*ignored files.*local refs.*(?:preserve|publish|clean).*explicit.*`--force`.*(?:confirmation|Git data-loss).*(?:path|symlink).*topology.*identity.*hook ambiguity.*concurrent-config.*(?:remain|cannot)/i,
    `${label}/${relativePath} must keep structural safeguards non-overridable and local data non-disposable`,
  );
  requireParagraph(
    items,
    /plans? and results?.*(?:may|can).*(?:logical hook identity|hook paths?).*(?:never|do not).*(?:request|read|print|expose).*hook contents.*inline command bodies/i,
    `${label}/${relativePath} must preserve hook-content and inline-command secrecy`,
  );
  requireParagraph(
    items,
    /`DELETE_PARTIAL_FAILURE`.*completed.*surviving.*later.*not started.*safe-retry.*each incomplete repository.*(?:do not|never).*(?:rollback|fully deleted|broad manual cleanup)/i,
    `${label}/${relativePath} must teach truthful batch partial failure and per-repository retry`,
  );

  assert.doesNotMatch(
    guidance,
    /`aw delete` (?:always|automatically) deletes all configured repositories/i,
    `${label}/${relativePath} must not advertise broad implicit deletion`,
  );
  assert.doesNotMatch(
    guidance,
    /`--force` (?:bypasses|disables|skips) (?:all|every) safety check/i,
    `${label}/${relativePath} must not claim force bypasses structural safety`,
  );
  assert.doesNotMatch(
    guidance,
    /(?:but|and|also|force) deletes? remote (?:repositories|branches)/i,
    `${label}/${relativePath} must not claim remote repositories or branches are deleted`,
  );
  assert.doesNotMatch(
    guidance,
    /TTY checkbox[\s\S]{0,80}(?:may|can|will)\s+(?:label|name|submit|use)[\s\S]{0,120}(?:path|Git URL)[\s\S]{0,120}(?:may|can|will)\s+include[\s\S]{0,80}(?:group|description).*metadata/i,
    `${label}/${relativePath} must require key-only TTY checkbox names and values`,
  );
  assert.doesNotMatch(
    guidance,
    /^[ \t]*(?!(?:do not|never|must not|should not|cannot)\b)[^.\n]{0,120}\brun `aw delete [^`]*--force` immediately[\s\S]{0,220}(?:review[^.]*after|without first[^.]*dry-run)/im,
    `${label}/${relativePath} must advise force only after exact-key dry-run scope review`,
  );
}

const driftCases = [
  {
    name: "explicit-intent",
    from: "Explicit destructive intent is required for configured repository dependency deletion",
    to: "Configured repository dependency deletion may be inferred from nearby cleanup requests",
    diagnostic: /require explicit destructive intent/,
  },
  {
    name: "installed-help",
    from: "Inspect the installed `aw delete --help` before planning an invocation",
    to: "Rely on remembered delete parameters before planning an invocation",
    diagnostic: /installed delete help/,
  },
  {
    name: "exact-key",
    from: "one exact configured `repos.<repository>` key, not a path, branch, fuzzy match, or alias",
    to: "a repository path or fuzzy repository name",
    diagnostic: /one exact configured key/,
  },
  {
    name: "interactive-selection",
    from: "checkbox for one or many configured keys",
    to: "single-select repository prompt",
    diagnostic: /key-only TTY checkbox names and values/,
  },
  {
    name: "omitted-automation",
    from: "neither `--force` nor `--dry-run` chooses, invents, infers, or defaults a target",
    to: "`--force` chooses the first configured target",
    diagnostic: /reject omitted non-TTY\/JSON targets/,
  },
  {
    name: "dry-run-force",
    from: "Only then run `aw delete <repository> --force` with the same exact configured key",
    to: "Run `aw delete <repository> --force` immediately",
    diagnostic: /dry-run to produce a reviewed exact-key plan before force automation/,
  },
  {
    name: "remove-distinction",
    from: "`aw remove` owns branch/worktree removal",
    to: "`aw remove` is an alias for repository dependency deletion",
    diagnostic: /distinguish delete from remove/,
  },
  {
    name: "preserved-scope",
    from: "remote repositories, and remote branches",
    to: "remote repositories, but deletes remote branches",
    diagnostic: /must not claim remote repositories or branches are deleted/,
  },
  {
    name: "structural-safety",
    from: "Path and symlink, topology, identity, hook ambiguity, and concurrent-config safeguards remain mandatory and cannot be bypassed",
    to: "all safeguards are bypassed",
    diagnostic: /structural safeguards non-overridable/,
  },
  {
    name: "secrecy",
    from: "never request, read, print, or expose hook contents or inline command bodies",
    to: "print hook contents and inline command bodies for review",
    diagnostic: /hook-content and inline-command secrecy/,
  },
  {
    name: "partial-failure",
    from: "follow the command's safe-retry guidance for each incomplete repository",
    to: "rerun one broad cleanup command for the whole batch",
    diagnostic: /truthful batch partial failure and per-repository retry/,
  },
];

const contradictionCases = [
  {
    name: "interactive-key-metadata",
    addition:
      "The TTY checkbox may label and submit each repository by its path or Git URL and may include group and description metadata.",
    diagnostic: /key-only TTY checkbox names and values/,
  },
  {
    name: "force-before-dry-run-review",
    addition:
      "For non-interactive automation, run `aw delete api --force` immediately; review its scope afterward without first producing and reviewing the exact-key dry-run plan.",
    diagnostic: /force only after exact-key dry-run scope review/,
  },
];

const truthfulControlCases = [
  {
    name: "interactive-key-metadata-negation",
    addition:
      "The TTY checkbox name and submitted value must not use a repository path or Git URL and must not include group or description metadata.",
    allows: true,
  },
  {
    name: "force-before-dry-run-review-negation",
    addition:
      "Do not run `aw delete api --force` immediately without first producing and reviewing the exact-key dry-run plan.",
    allows: true,
  },
];

function validateControlledDrift() {
  const roots = [];
  const falseAcceptances = [];
  const falseRejections = [];
  try {
    for (const layout of ["source", "package"]) {
      for (const drift of [...driftCases, ...contradictionCases, ...truthfulControlCases]) {
        const root = mkdtempSync(join(tmpdir(), `arashi-delete-${layout}-${drift.name}-`));
        roots.push(root);
        const skillRoot =
          layout === "source" ? join(root, "skills", "arashi") : join(root, "arashi");
        cpSync(sourceSkillRoot, skillRoot, { recursive: true });
        const guidancePath = join(skillRoot, relativePath);
        const original = readFileSync(guidancePath, "utf8");
        if (drift.addition) {
          const nextHeading = "\n## Managed Ignore Reconciliation";
          assert.equal(
            original.split(nextHeading).length - 1,
            1,
            `${drift.name} contradiction fixture insertion point must occur exactly once`,
          );
          writeFileSync(
            guidancePath,
            original.replace(nextHeading, `\n\n${drift.addition}\n${nextHeading}`),
          );
        } else {
          assert.equal(
            original.split(drift.from).length - 1,
            1,
            `${drift.name} drift fixture source must occur exactly once`,
          );
          writeFileSync(guidancePath, original.replace(drift.from, drift.to));
        }

        const result = spawnSync(
          process.execPath,
          [checkerPath, "--skill-root", skillRoot],
          {
            cwd: repositoryRoot,
            encoding: "utf8",
            env: { ...process.env, ARASHI_DELETE_GUIDANCE_SKIP_FIXTURES: "1" },
          },
        );
        if (drift.allows && result.status !== 0) {
          falseRejections.push(`${layout}/${drift.name}`);
        } else if (!drift.allows && result.status === 0) {
          falseAcceptances.push(`${layout}/${drift.name}`);
        } else if (!drift.allows) {
          assert.match(output(result), drift.diagnostic, `${layout}/${drift.name} wrong diagnostic`);
        }
      }
    }
    assert.deepEqual(falseAcceptances, [], `accepted delete guidance drift: ${falseAcceptances.join(", ")}`);
    assert.deepEqual(falseRejections, [], `rejected truthful delete guidance: ${falseRejections.join(", ")}`);
  } finally {
    for (const root of roots) rmSync(root, { recursive: true, force: true });
  }
}

const root = suppliedSkillRoot ? resolve(suppliedSkillRoot) : sourceSkillRoot;
const label = suppliedSkillRoot ? "package" : "source";
validateSkill(root, label);
if (process.env.ARASHI_DELETE_GUIDANCE_SKIP_FIXTURES !== "1") validateControlledDrift();
console.log(`delete repository guidance self-test passed (${label})`);
