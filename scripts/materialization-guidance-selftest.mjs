#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
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
const skillRootArgumentIndex = process.argv.indexOf("--skill-root");
const suppliedSkillRoot =
  skillRootArgumentIndex >= 0 ? process.argv[skillRootArgumentIndex + 1] : undefined;

if (skillRootArgumentIndex >= 0 && !suppliedSkillRoot) {
  throw new Error("--skill-root requires a path");
}

const validGuidance = `# Command Reference

## Repository Worktree File Materialization

Configured mode accepts direct \`repos.<name>.copy\` and \`repos.<name>.symlink\` arrays. Each declared repository-relative path uses the same relative path in the canonical Git primary source checkout and the new worktree destination. This configuration is configured-only and is not available in zero-config standalone mode.

For each repository, Arashi runs repository pre-create, then every copy entry in declaration order, then every symlink entry in declaration order, and then repository post-create. \`--no-hooks\` disables hooks only and does not disable declarative materialization.

A missing source is skipped visibly. Destinations never overwrite an existing object and never escape the new worktree. A symlink is a native symbolic link to the exact canonical source target; platform or policy capability failures are actionable and never fall back to a copy, hard link, or junction.

Use \`copy\` for \`.env\` or local configuration that must be independently mutable in each worktree; the supported same-path case does not require a shell hook. Use \`symlink\` only for intentionally shared state, because mutation is shared with the canonical checkout and native symbolic-link capability varies by platform.

For normal dependency setup, prefer package-manager content-addressed stores plus per-worktree installs. Treat symlinked \`node_modules\` or equivalent shared dependency trees as advanced and risky: branches, lockfiles, runtimes, native modules, and install scripts can diverge or mutate shared state.

Use lifecycle hooks when you need globs, remapping, external sources, interpolation, required entries, or conditional behavior. Do not invent unsupported materialization fields.

\`arashi create --dry-run\` previews the ordered materialization plan in declaration order without mutation. \`arashi doctor\` non-mutatively diagnoses configured source availability and managed destination safety without repair or capability probes.
`;

function section(content, heading) {
  const marker = `## ${heading}`;
  const start = content.indexOf(marker);
  if (start < 0) return undefined;
  const end = content.indexOf("\n## ", start + marker.length);
  return content.slice(start, end < 0 ? content.length : end);
}

function installableGuidanceFiles(root) {
  const files = [];
  const visit = (directory) => {
    for (const name of readdirSync(directory).sort()) {
      const path = join(directory, name);
      const stat = statSync(path);
      if (stat.isDirectory()) {
        visit(path);
      } else if (/\.(?:md|txt|json)$/i.test(name)) {
        const content = readFileSync(path, "utf8");
        if (/\.json$/i.test(name)) JSON.parse(content);
        files.push({ path, content });
      }
    }
  };
  visit(root);
  return files;
}

function semanticStatements(content) {
  return content
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/\n/g, " "))
    .split(/(?<=[.!?])\s+|\n{2,}|\s*;\s*/)
    .map((statement) => statement.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function isNegatedBefore(statement, index) {
  const beforeAction = statement.slice(0, index);
  const contrast = /(?:\b(?:yet|but|however|while|although|though|whereas)\b|;)/gi;
  let clauseStart = 0;
  for (const match of beforeAction.matchAll(contrast)) clauseStart = (match.index ?? 0) + match[0].length;
  const actionWord = statement.slice(index).match(/^\w+/)?.[0] ?? "";
  if (/s$/i.test(actionWord)) {
    for (const match of beforeAction.matchAll(/\b(?:and|or)\b/gi)) {
      clauseStart = Math.max(clauseStart, (match.index ?? 0) + match[0].length);
    }
  }
  const prefix = statement.slice(Math.max(clauseStart, index - 80), index).toLowerCase();
  return /\b(?:does?|do|is|are|must|should|can|may|will)\s+not(?:\s+\w+){0,5}\s*$/.test(prefix) ||
    /\b(?:cannot|can[’']t)(?:\s+\w+){0,4}\s*$/.test(prefix) ||
    /\b(?:doesn|isn|aren|wasn|weren|mustn|shouldn|wouldn|won|couldn|mayn|willn|don|hasn|haven|hadn|needn)[’']t(?:\s+\w+){0,5}\s*$/.test(prefix) ||
    /\bnever(?:\s+\w+){0,4}\s*$/.test(prefix) ||
    /\bwithout(?:\s+\w+){0,4}\s*$/.test(prefix);
}

function hasAffirmativeAction(statement, pattern) {
  for (const match of statement.matchAll(pattern)) {
    if (!isNegatedBefore(statement, match.index ?? 0)) return true;
  }
  return false;
}

function contradiction(statement) {
  const standaloneScope = /(?:zero-config\s+)?standalone/i.test(statement);
  const fieldScope = /repos\.<name>\.(?:copy|symlink)|\bcopy\b[^.]{0,40}\bsymlink\b/i.test(statement);
  if (standaloneScope && fieldScope) {
    if (hasAffirmativeAction(statement, /\b(?:available|supports?|accepts?|loads?|uses?)\b/gi)) {
      return "advertises repository materialization configuration in standalone mode";
    }
  }

  if (/symlink/i.test(statement)) {
    if (hasAffirmativeAction(statement, /\bfall(?:s)?\s+back\b/gi)) {
      return "claims symbolic links fall back to another materialization action";
    }
  }

  if (/materialization|configured source/i.test(statement)) {
    if (hasAffirmativeAction(
      statement,
      /\b(?:reads?|uses?|sources?)\b[^.]{0,120}\b(?:caller|active|execution)\s+(?:checkout|worktree)\b/gi,
    )) {
      return "claims materialization uses a non-canonical source checkout";
    }
  }

  if (/materialization|repository/i.test(statement)) {
    const reversedOrder = /(?:\bsymlink(?: entries)?\b[^.]{0,100}\bbefore\b[^.]{0,100}\bcopy(?: entries)?\b|\bcopy(?: entries)?\b[^.]{0,100}\bafter\b[^.]{0,100}\bsymlink(?: entries)?\b)/i.exec(statement);
    if (reversedOrder?.index !== undefined) {
      const beforeIndex = reversedOrder.index + reversedOrder[0].search(/\bbefore\b/i);
      if (!isNegatedBefore(statement, beforeIndex)) {
        return "claims symlink materialization runs before copy";
      }
    }
  }

  const independentSymlink = statement.search(/\buse\s+`?symlink`?\b/i);
  if (
    independentSymlink >= 0 &&
    /\bindependently mutable\b/i.test(statement) &&
    /`?\.env`?/i.test(statement) &&
    !isNegatedBefore(statement, independentSymlink)
  ) {
    return "recommends symlink for independently mutable .env state";
  }

  if (/destination/i.test(statement)) {
    if (hasAffirmativeAction(statement, /\boverwrite(?:s|n)?\b/gi)) {
      return "claims materialization may overwrite an existing destination";
    }
    if (hasAffirmativeAction(statement, /\bescape(?:s|d)?\b/gi)) {
      return "claims a materialization destination may escape the worktree";
    }
  }

  return undefined;
}

function requirePattern(defects, content, pattern, diagnostic) {
  if (!pattern.test(content)) defects.push(diagnostic);
}

function validateSkill(root, label) {
  const defects = [];
  const commandsPath = join(root, "references", "commands.md");
  let commands;
  try {
    commands = readFileSync(commandsPath, "utf8");
  } catch (error) {
    return [`${label}/references/commands.md could not be read (${error.code ?? error.message})`];
  }

  const guidance = section(commands, "Repository Worktree File Materialization");
  if (!guidance) {
    defects.push(`${label}/references/commands.md is missing the Repository Worktree File Materialization section`);
  } else {
    requirePattern(defects, guidance, /direct[^.\n]*`repos\.<name>\.copy`[^.\n]*`repos\.<name>\.symlink`[^.\n]*arrays/i,
      `${label}/references/commands.md must teach direct repos.<name>.copy and repos.<name>.symlink arrays`);
    requirePattern(defects, guidance, /same relative path[^.\n]*(?:canonical )?Git primary source checkout[^.\n]*(?:new )?worktree destination/i,
      `${label}/references/commands.md must bind same-relative-path destinations to the canonical Git-primary source checkout`);
    requirePattern(defects, guidance, /configured-only[^.\n]*(?:not available|unsupported)[^.\n]*(?:zero-config )?standalone|(?:zero-config )?standalone[^.\n]*(?:not available|unsupported)[^.\n]*configured-only/i,
      `${label}/references/commands.md must state configured-only scope without standalone availability`);
    requirePattern(defects, guidance, /repository pre-create[\s\S]{0,180}copy entr(?:y|ies)[\s\S]{0,180}symlink entr(?:y|ies)[\s\S]{0,180}repository post-create/i,
      `${label}/references/commands.md must bind repository pre-create -> copy -> symlink -> repository post-create order`);
    requirePattern(defects, guidance, /`--no-hooks`[^.\n]*(?:does not|never)[^.\n]*disable[^.\n]*materialization/i,
      `${label}/references/commands.md must keep materialization independent of --no-hooks`);
    requirePattern(defects, guidance, /missing source[^.\n]*(?:skipped|skip)[^.\n]*visib/i,
      `${label}/references/commands.md must make missing-source skips visible`);
    requirePattern(defects, guidance, /destinations?[^.\n]*never[^.\n]*overwrite[^.\n]*(?:existing|pre-existing)/i,
      `${label}/references/commands.md must prohibit destination overwrite`);
    requirePattern(defects, guidance, /destinations?[^.\n]*never[^.\n]*escape[^.\n]*(?:worktree|root)/i,
      `${label}/references/commands.md must prohibit destination escape`);
    requirePattern(defects, guidance, /symlink[^.\n]*native symbolic link[^.\n]*exact canonical source target/i,
      `${label}/references/commands.md must explain native exact-target symlink behavior`);
    requirePattern(defects, guidance, /(?:platform|policy)[^.\n]*capability fail(?:ure|ures)[^.\n]*actionable/i,
      `${label}/references/commands.md must explain actionable platform capability failures`);
    requirePattern(defects, guidance, /never[^.\n]*fall back[^.\n]*copy[^.\n]*hard link[^.\n]*junction/i,
      `${label}/references/commands.md must prohibit copy, hard-link, and junction fallback`);
    requirePattern(defects, guidance, /use `copy`[^.\n]*`\.env`[^.\n]*local configuration[^.\n]*independently mutable/i,
      `${label}/references/commands.md must recommend copy for independently mutable .env/local configuration`);
    requirePattern(defects, guidance, /same-path case[^.\n]*(?:does not|need not)[^.\n]*(?:require|use)[^.\n]*(?:shell )?hook/i,
      `${label}/references/commands.md must state that supported same-path copies do not require hooks`);
    requirePattern(defects, guidance, /use `symlink`[^.\n]*intentionally shared state[^.\n]*mutation[^.\n]*shared[^.\n]*canonical checkout/i,
      `${label}/references/commands.md must reserve symlink for intentionally shared mutable state`);
    requirePattern(defects, guidance, /package-manager content-addressed stores?[^.\n]*per-worktree installs?/i,
      `${label}/references/commands.md must prefer package-manager stores and per-worktree installs`);
    requirePattern(defects, guidance, /symlinked `node_modules`[^.\n]*shared dependency trees?[^.\n]*advanced[^.\n]*risky/i,
      `${label}/references/commands.md must label shared dependency trees advanced and risky`);
    for (const risk of ["branches", "lockfiles", "runtimes", "native modules", "install scripts"]) {
      requirePattern(defects, guidance, new RegExp(`\\b${risk.replace(" ", "\\s+")}\\b`, "i"),
        `${label}/references/commands.md must name shared-dependency risk: ${risk}`);
    }
    requirePattern(defects, guidance, /lifecycle hooks?[^.\n]*(?:globs|remapping)[^.\n]*external sources[^.\n]*interpolation[^.\n]*required entries[^.\n]*conditional behavior/i,
      `${label}/references/commands.md must route unsupported mapping and conditional behavior to lifecycle hooks`);
    requirePattern(defects, guidance, /do not invent[^.\n]*unsupported materialization fields/i,
      `${label}/references/commands.md must prohibit invented materialization fields`);
    requirePattern(defects, guidance, /create --dry-run[^.\n]*(?:preview|plan)[^.\n]*(?:ordered|declaration order)[^.\n]*(?:without mutation|non-mutating)/i,
      `${label}/references/commands.md must teach ordered non-mutating materialization dry-run preview`);
    requirePattern(defects, guidance, /doctor[^.\n]*(?:non-mutatively|non-mutating)[^.\n]*(?:diagnos|inspect)[^.\n]*(?:without repair|without mutation)/i,
      `${label}/references/commands.md must teach non-mutating materialization doctor diagnostics`);
  }

  try {
    for (const { path, content } of installableGuidanceFiles(root)) {
      for (const statement of semanticStatements(content)) {
        const problem = contradiction(statement);
        if (problem) defects.push(`${label}/${relative(root, path)} ${problem}: ${statement}`);
      }
    }
  } catch (error) {
    defects.push(`${label} installable guidance scan failed (${error.code ?? error.message})`);
  }

  return defects;
}

function writeCompleteFixture(root) {
  mkdirSync(join(root, "references"), { recursive: true });
  writeFileSync(join(root, "SKILL.md"), "# Fixture router\n");
  writeFileSync(join(root, "references", "commands.md"), validGuidance);
}

function requireValid(root, label) {
  const defects = validateSkill(root, label);
  assert.deepEqual(defects, [], `valid controlled fixture failed:\n${defects.join("\n")}`);
}

function requireRejection(root, label, diagnostic) {
  const defects = validateSkill(root, label);
  assert.ok(defects.some((defect) => defect.includes(diagnostic)),
    `${label} did not produce ${JSON.stringify(diagnostic)}:\n${defects.join("\n")}`);
}

function validateControlledFixtures() {
  const roots = [];
  const falseAccepts = [];
  const driftCases = [
    {
      name: "field-shape",
      from: "direct `repos.<name>.copy` and `repos.<name>.symlink` arrays",
      to: "repository materialization arrays",
      diagnostic: "direct repos.<name>.copy and repos.<name>.symlink arrays",
    },
    {
      name: "source-ownership",
      from: "same relative path in the canonical Git primary source checkout and the new worktree destination",
      to: "a configured source path and destination path",
      diagnostic: "same-relative-path destinations",
    },
    {
      name: "lifecycle-order",
      from: "then every copy entry in declaration order, then every symlink entry in declaration order",
      to: "then every symlink entry in declaration order, then every copy entry in declaration order",
      diagnostic: "repository pre-create -> copy -> symlink -> repository post-create order",
    },
    {
      name: "no-hooks-independence",
      from: "does not disable declarative materialization",
      to: "also disables declarative materialization",
      diagnostic: "independent of --no-hooks",
    },
    {
      name: "safety-fallback",
      from: "never fall back to a copy, hard link, or junction",
      to: "fall back to a copy when symbolic links are unavailable",
      diagnostic: "prohibit copy, hard-link, and junction fallback",
    },
    {
      name: "dependency-sharing",
      from: "package-manager content-addressed stores plus per-worktree installs",
      to: "one shared dependency installation",
      diagnostic: "package-manager stores and per-worktree installs",
    },
    {
      name: "hook-escape-hatch",
      from: "Use lifecycle hooks when you need globs, remapping, external sources, interpolation, required entries, or conditional behavior",
      to: "Add custom materialization fields for globs and remapping",
      diagnostic: "route unsupported mapping and conditional behavior to lifecycle hooks",
    },
  ];

  try {
    for (const mode of ["authored-source", "extracted-package"]) {
      const control = mkdtempSync(join(tmpdir(), `arashi-materialization-${mode}-control-`));
      roots.push(control);
      const controlRoot = mode === "authored-source" ? control : join(control, "skills", "arashi");
      writeCompleteFixture(controlRoot);
      requireValid(controlRoot, `${mode}-control`);

      const negationControl = mkdtempSync(join(tmpdir(), `arashi-materialization-${mode}-cannot-control-`));
      roots.push(negationControl);
      const negationRoot = mode === "authored-source" ? negationControl : join(negationControl, "skills", "arashi");
      writeCompleteFixture(negationRoot);
      writeFileSync(
        join(negationRoot, "references", "safety-negation.md"),
        "A materialization destination cannot escape the new worktree. A materialization destination does not overwrite files or escape the new worktree. A symlink cannot fall back to a copy, hard link, or junction.\n",
      );
      requireValid(negationRoot, `${mode}-cannot-control`);

      const contractionControl = mkdtempSync(join(tmpdir(), `arashi-materialization-${mode}-contraction-control-`));
      roots.push(contractionControl);
      const contractionRoot = mode === "authored-source" ? contractionControl : join(contractionControl, "skills", "arashi");
      writeCompleteFixture(contractionRoot);
      writeFileSync(
        join(contractionRoot, "references", "safety-contractions.md"),
        "A materialization destination doesn't overwrite an existing file. A symlink won't fall back to a copy, hard link, or junction. Standalone isn't available for repos.<name>.copy or repos.<name>.symlink.\n",
      );
      requireValid(contractionRoot, `${mode}-contraction-control`);

      for (const drift of driftCases) {
        const fixture = mkdtempSync(join(tmpdir(), `arashi-materialization-${mode}-${drift.name}-`));
        roots.push(fixture);
        const skillRoot = mode === "authored-source" ? fixture : join(fixture, "skills", "arashi");
        writeCompleteFixture(skillRoot);
        const commandsPath = join(skillRoot, "references", "commands.md");
        const original = readFileSync(commandsPath, "utf8");
        assert.ok(original.includes(drift.from), `${drift.name} fixture mutation source is stale`);
        writeFileSync(commandsPath, original.replace(drift.from, drift.to));
        const defects = validateSkill(skillRoot, `${mode}-${drift.name}`);
        if (!defects.some((defect) => defect.includes(drift.diagnostic))) {
          falseAccepts.push(`${mode}:${drift.name} expected ${drift.diagnostic}; got ${defects.join(" | ") || "no defects"}`);
        }
      }

      for (const contradictionCase of [
        {
          name: "standalone-availability",
          claim: "Zero-config standalone supports `repos.<name>.copy` and `repos.<name>.symlink`.",
          diagnostic: "standalone mode",
        },
        {
          name: "overwrite",
          claim: "A materialization destination overwrites an existing file.",
          diagnostic: "overwrite an existing destination",
        },
        {
          name: "fallback",
          claim: "A symlink falls back to copy when platform policy rejects it.",
          diagnostic: "fall back to another materialization action",
        },
        {
          name: "contrast-fallback",
          claim: "A symlink cannot preserve permissions yet falls back to copy.",
          diagnostic: "fall back to another materialization action",
        },
        {
          name: "while-fallback",
          claim: "A symlink cannot preserve permissions while it falls back to copy.",
          diagnostic: "fall back to another materialization action",
        },
        {
          name: "repeated-fallback",
          claim: "A symlink does not fall back to copy and falls back to a hard link.",
          diagnostic: "fall back to another materialization action",
        },
        {
          name: "repeated-overwrite",
          claim: "A materialization destination does not overwrite files and overwrites directories.",
          diagnostic: "overwrite an existing destination",
        },
        {
          name: "repeated-standalone",
          claim: "Zero-config standalone does not support copy and symlink arrays and accepts repos.<name>.copy.",
          diagnostic: "standalone mode",
        },
        {
          name: "contrast-escape",
          claim: "A materialization destination cannot preserve metadata but escapes the worktree.",
          diagnostic: "destination may escape the worktree",
        },
        {
          name: "source-ownership-contradiction",
          claim: "Materialization reads each configured source from the caller checkout instead of the canonical Git primary checkout.",
          diagnostic: "non-canonical source checkout",
        },
        {
          name: "lifecycle-order-contradiction",
          claim: "Arashi runs symlink entries before copy entries during repository materialization.",
          diagnostic: "symlink materialization runs before copy",
        },
        {
          name: "selection-advice-contradiction",
          claim: "Use symlink for an independently mutable `.env` file in every worktree.",
          diagnostic: "symlink for independently mutable .env state",
        },
      ]) {
        const fixture = mkdtempSync(join(tmpdir(), `arashi-materialization-${mode}-${contradictionCase.name}-`));
        roots.push(fixture);
        const skillRoot = mode === "authored-source" ? fixture : join(fixture, "skills", "arashi");
        writeCompleteFixture(skillRoot);
        writeFileSync(join(skillRoot, "references", "contradiction.txt"), `${contradictionCase.claim}\n`);
        const defects = validateSkill(skillRoot, `${mode}-${contradictionCase.name}`);
        if (!defects.some((defect) => defect.includes(contradictionCase.diagnostic))) {
          falseAccepts.push(`${mode}:${contradictionCase.name} expected ${contradictionCase.diagnostic}; got ${defects.join(" | ") || "no defects"}`);
        }
      }
    }
    assert.deepEqual(falseAccepts, [], `controlled materialization fixtures were falsely accepted:\n${falseAccepts.join("\n")}`);
  } finally {
    for (const root of roots) rmSync(root, { recursive: true, force: true });
  }
}

function main() {
  validateControlledFixtures();
  const root = suppliedSkillRoot ? resolve(suppliedSkillRoot) : sourceSkillRoot;
  const label = suppliedSkillRoot ? "package" : "source";
  const defects = validateSkill(root, label);
  assert.deepEqual(defects, [], `repository worktree materialization guidance failed:\n${defects.join("\n")}`);
  console.log(`materialization guidance self-test passed for ${label}`);
}

main();
