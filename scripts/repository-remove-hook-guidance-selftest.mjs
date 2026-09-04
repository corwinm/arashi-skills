#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const checkerPath = fileURLToPath(import.meta.url);
const repositoryRoot = resolve(dirname(checkerPath), "..");
const sourceSkillRoot = join(repositoryRoot, "skills", "arashi");
const skillRootIndex = process.argv.indexOf("--skill-root");
const suppliedSkillRoot = skillRootIndex >= 0 ? process.argv[skillRootIndex + 1] : undefined;
if (skillRootIndex >= 0 && !suppliedSkillRoot) throw new Error("--skill-root requires a path");

const paths = {
  hooks: "references/hooks.md",
  workspace: "references/commands/workspace.md",
  remove: "references/commands/remove-and-maintenance.md",
  troubleshooting: "references/troubleshooting.md",
};

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
  return content.split(/\n\s*\n/).map((value) => value.replace(/\s+/g, " ").trim()).filter(Boolean);
}

function clauses(content) {
  return content
    .split(/\r?\n|[.!?](?:\s|$)|;\s*|,\s*(?=(?:but|however|yet)\b)/i)
    .map((value) => value.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function requireParagraph(items, pattern, diagnostic) {
  assert.ok(items.some((item) => pattern.test(item)), diagnostic);
}

function guidanceFiles(root, current = root) {
  const result = [];
  for (const entry of readdirSync(current, { withFileTypes: true })) {
    const absolute = join(current, entry.name);
    if (entry.isDirectory()) result.push(...guidanceFiles(root, absolute));
    else if (statSync(absolute).isFile() && /\.(?:md|txt)$/i.test(entry.name)) {
      result.push({ relativePath: relative(root, absolute), content: readFileSync(absolute, "utf8") });
    }
  }
  return result;
}

function validateContradictions(root, label) {
  const failures = [];
  const patterns = [
    [
      /`?<activeRepo>`?[^.\n]{0,140}(?:is|means|denotes|refers to)(?!\s+(?:not|never)\b)[^.\n]{0,100}(?:canonical (?:clone|source checkout)|branch worktree[^.\n]{0,60}(?:selected|chosen)[^.\n]{0,40}(?:delet|remov))/i,
      "activeRepo must identify the configured hook target, not the canonical source or branch worktree selected for deletion",
    ],
    [/repository remove\s+(?!(?:[a-z-]+\s+){0,4}(?:(?:does|can)\s+not|cannot|never)\s+(?:[a-z-]+\s+){0,4}(?:prefers?|assigns? precedence|wins over|falls? back))[^.\n]{0,180}(?:prefers?|assigns? precedence|wins over|falls? back)[^.\n]{0,160}(?:inline|qualified|child-local|native)/i, "must not assign precedence among repository remove aliases"],
    [/repository remove\s+(?!(?:[a-z-]+\s+){0,4}(?:(?:does|can)\s+not|cannot|never)\s+(?:[a-z-]+\s+){0,4}(?:composes?|combines?|runs? both|executes? both))[^.\n]{0,180}(?:composes?|combines?|runs? both|executes? both)[^.\n]{0,120}(?:inline|qualified|child-local|native)/i, "must not compose repository remove aliases"],
    [/(?:(?:default|canonical)\s+configured\s+(?:(?:location|path)\s+for\s+repository remove|repository remove\s+(?:location|path))\s+(?:is|remains)\s+`<repo>\/\.arashi\/hooks\/(?:pre|post)-remove<ext>`|`<repo>\/\.arashi\/hooks\/(?:pre|post)-remove<ext>`\s+(?:is|remains)\s+(?:the\s+)?(?:default|canonical)\s+configured\s+(?:repository remove\s+)?(?:location|path))/i, "must not claim the child-local path is the canonical configured location"],
    [/(?:only|sole) supported repository remove[^.\n]{0,100}(?:child-local|<activeRepo>)/i, "must not claim child-local is the only supported repository remove source"],
    [/(?:add|configure)\s+(?!(?:does not|never)\b)[^.\n]{0,140}(?:creates?|writes?|installs?)[^.\n]{0,120}<activeRepo>\/.arashi\/hooks\/(?:pre|post)-remove<ext>/i, "must not teach add/configure to create child-local repository remove files"],
    [/delete\s+(?!(?:does not|never)\b)[^.\n]{0,160}(?:owns?|deletes?|removes?)[^.\n]{0,100}<activeRepo>\/.arashi\/hooks\/(?:pre|post)-remove<ext>/i, "must not teach delete ownership of compatible child-local files"],
    [/repository remove[^.\n]{0,180}(?:(?:cwd|working directory)[^.\n]{0,80}(?:configuration root|workspace root)|(?:configuration root|workspace root)[^.\n]{0,80}(?:cwd|working directory))[^.\n]{0,80}(?:because|when|if)[^.\n]{0,80}(?:stored|located)/i, "must not derive repository remove cwd from source storage"],
  ];
  const affirmativeClause = /^(?![^\n]{0,220}\b(?:(?:does?|do|can|is|are)\s+not|cannot|never)\b)/i;
  const clausePatterns = [
    [
      /(?:repository remove|hook discovery|alias resolution|\bit\b)[^\n]{0,120}(?:inline[- ]first|file[- ]fallback|prefers?|prioriti[sz]es?|assigns? precedence|wins over|falls? back)/i,
      "must not assign precedence among repository remove aliases",
    ],
    [
      /repository remove hooks?[^\n]{0,100}(?:run|execute)[^\n]{0,100}(?:(?:configuration root|workspace root)[^\n]{0,60}(?:cwd|working directory)|(?:cwd|working directory)[^\n]{0,60}(?:configuration root|workspace root))/i,
      "repository remove hooks must run from the active target checkout",
    ],
    [
      /Windows[^\n]{0,120}qualified[^\n]{0,100}`?\.sh`?[^\n]{0,100}(?:Git Bash|bash)/i,
      "Windows must not accept qualified .sh repository remove hooks through Git Bash",
    ],
    [
      /remove dry-run[^\n]{0,100}(?:executes?|runs?|spawns?|invokes?)[^\n]{0,100}(?:pre-remove|repository remove hooks?)/i,
      "remove dry-run must not execute repository pre-remove hooks",
    ],
    [
      /(?:onboarding|setup)[^\n]{0,100}(?:creates?|writes?|installs?)[^\n]{0,120}(?:child-local|<activeRepo>\/\.arashi\/hooks\/(?:pre|post)-remove<ext>)/i,
      "onboarding must put new repository remove scripts at the canonical config-root qualified path",
    ],
    [
      /(?:delete|deletion|cleanup)[^\n]{0,100}(?:cleans?|deletes?|removes?)[^\n]{0,120}child-local[^\n]{0,80}(?:aliases?|lookalikes?)/i,
      "delete must not clean child-local aliases and lookalikes",
    ],
  ];
  for (const file of guidanceFiles(root)) {
    for (const [pattern, diagnostic] of patterns) {
      if (pattern.test(file.content)) failures.push(`${label}/${file.relativePath} ${diagnostic}`);
    }
    for (const clause of clauses(file.content)) {
      if (!affirmativeClause.test(clause)) continue;
      for (const [pattern, diagnostic] of clausePatterns) {
        if (pattern.test(clause)) failures.push(`${label}/${file.relativePath} ${diagnostic}`);
      }
    }
  }
  assert.deepEqual(failures, [], failures.join("\n"));
}

function validateSkill(root, label) {
  const hooks = readFileSync(join(root, paths.hooks), "utf8");
  const discovery = paragraphs(section(hooks, "Discovery and ownership"));
  const removeLifecycle = paragraphs(section(hooks, "Remove lifecycle"));
  requireParagraph(
    discovery,
    /`<configurationRoot>`.*configured workspace.*(?:authority|configuration).*owns.*\.arashi.*(?:configuration|hook files)/i,
    `${label}/${paths.hooks} must define configurationRoot as the configured workspace authority`,
  );
  const activeRepoDefinition = discovery.find((item) => /`<activeRepo>`/i.test(item));
  assert.ok(activeRepoDefinition, `${label}/${paths.hooks} must define activeRepo`);
  const activeRepoContract = activeRepoDefinition.slice(activeRepoDefinition.search(/`<activeRepo>`/i));
  for (const [pattern, diagnostic] of [
    [/\bactive\b/i, "as active"],
    [/\bconfigured\b/i, "as configured"],
    [/\btarget repository checkout\b/i, "as the target repository checkout"],
    [/(?:discover(?:y|ing)?|resolution)[^.]*repository remove hooks?|repository remove hook[^.]*discover/i, "as the checkout used for repository remove hook discovery"],
    [/(?:execut(?:e|ion)|run(?:ning)?)[^.]*repository remove hooks?|repository remove hook[^.]*execut|repository remove hooks?[^.]*run/i, "as the checkout used for repository remove hook execution"],
    [/(?:distinct from|differ(?:s|ent)? from)[^.]*canonical[^.]*(?:clone|source checkout)/i, "as distinct from the canonical clone or source checkout"],
    [/(?:is not|isn't|does not mean)[^.]*branch worktree[^.]*(?:selected|chosen)[^.]*delet/i, "as not the branch worktree selected for deletion"],
  ]) {
    assert.match(activeRepoContract, pattern, `${label}/${paths.hooks} must define activeRepo ${diagnostic}`);
  }
  requireParagraph(
    discovery,
    /canonical configured repository remove script[^.\n]*`<configurationRoot>\/\.arashi\/hooks\/<lifecycle>\.<repo><ext>`[^.\n]*(?:substantial|reusable)[^.\n]*(?:alternative|counterpart)[^.\n]*`repos\.<repo>\.hooks\.<lifecycle>`/i,
    `${label}/${paths.hooks} must define the canonical qualified file as the substantial-script alternative to inline repository hooks`,
  );
  requireParagraph(
    discovery,
    /compatible child-local[^.\n]*`<activeRepo>\/\.arashi\/hooks\/<lifecycle><ext>`[^.\n]*(?:remains|is) supported/i,
    `${label}/${paths.hooks} must retain the compatible child-local repository remove source`,
  );
  requireParagraph(
    discovery,
    /inline.*qualified.*child-local.*(?:one|same) repository slot.*(?:overlap|more than one|multiple).*(?:fail|error).*before.*mutation.*(?:no|not|never).*(?:precedence|composition|combine)/i,
    `${label}/${paths.hooks} must bind all three aliases to one fail-closed repository slot without precedence or composition`,
  );
  requireParagraph(
    discovery,
    /logical identity.*plain lifecycle.*repository scope.*repository owner.*source.*exact selected path.*(?:cwd|working directory).*active target checkout/i,
    `${label}/${paths.hooks} must preserve repository hook identity, exact source, and active-target cwd`,
  );
  requireParagraph(
    discovery,
    /POSIX.*qualified.*child-local.*only `\.sh`.*Windows.*qualified.*child-local.*`\.ps1`.*`\.cmd`.*`\.bat`.*case-insensitive.*multiple native candidates.*fail.*before.*mutation/i,
    `${label}/${paths.hooks} must align platform candidate rules for both configured repository remove file locations`,
  );
  requireParagraph(
    removeLifecycle,
    /repository.*workspace.*global-targeted.*global-shared.*(?:qualified|child-local).*(?:same|one) repository position/i,
    `${label}/${paths.hooks} must preserve remove order while treating both file locations as one repository position`,
  );
  requireParagraph(
    removeLifecycle,
    /remove dry-run.*(?:exact selected source path|source path).*(?:without|no).*(?:execute|spawn|mutation).*doctor.*(?:all|every).*(?:alias|source).*(?:overlap|ambiguity).*before.*(?:repair|mutation)/i,
    `${label}/${paths.hooks} must align remove dry-run and doctor with exact-source and ambiguity behavior`,
  );

  const workspace = readFileSync(join(root, paths.workspace), "utf8");
  const configure = paragraphs(section(workspace, "Inspecting and Editing Workspace Configuration"));
  const deletion = paragraphs(section(workspace, "Deleting Configured Repository Dependencies"));
  const adding = paragraphs(section(workspace, "Adding a Repository"));
  requireParagraph(
    configure,
    /repository remove files.*`<configurationRoot>\/\.arashi\/hooks\/<lifecycle>\.<repo><ext>`.*(?:add|configure).*(?:creates?|installs?).*canonical.*child-local.*(?:blocks?|prevents?).*(?:duplicate|creation|install)/i,
    `${label}/${paths.workspace} must bind add/configure creation to the canonical qualified path and block duplicates when child-local exists`,
  );
  requireParagraph(
    adding,
    /(?:substantial|reusable).*repository remove.*(?:creates?|installs?).*`<configurationRoot>\/\.arashi\/hooks\/<lifecycle>\.<repo><ext>`.*child-local.*(?:keep|supported|compatible).*(?:do not|never).*(?:create|duplicate)/i,
    `${label}/${paths.workspace} add guidance must create only the canonical qualified repository remove file`,
  );
  requireParagraph(
    deletion,
    /delete owns.*exact qualified.*`<configurationRoot>\/\.arashi\/hooks\/(?:pre-remove|post-remove)\.<repo><ext>`.*(?:does not|never).*(?:own|delete|remove).*`<activeRepo>\/\.arashi\/hooks\/<lifecycle><ext>`/i,
    `${label}/${paths.workspace} delete guidance must own only exact qualified files and preserve child-local compatibility files`,
  );

  const remove = paragraphs(section(readFileSync(join(root, paths.remove), "utf8"), "Remove Dry-Run Preview"));
  requireParagraph(
    remove,
    /hook previews?.*(?:logical|plain).*(?:lifecycle|repository).*exact selected source path.*(?:qualified|child-local).*(?:block|fail).*(?:overlap|ambiguity).*before mutation/i,
    `${label}/${paths.remove} must describe exact-source dry-run previews and pre-mutation alias ambiguity`,
  );

  const troubleshooting = paragraphs(section(readFileSync(join(root, paths.troubleshooting), "utf8"), "Hook fails or prompts unexpectedly"));
  requireParagraph(
    troubleshooting,
    /`aw doctor --json`.*(?:reports?|diagnoses?).*(?:inline|qualified|child-local).*(?:overlap|ambiguity).*(?:all|every).*(?:native candidate|candidate path).*(?:without|never).*(?:repair|mutation)/i,
    `${label}/${paths.troubleshooting} must teach non-mutating doctor diagnosis for all repository remove aliases and candidates`,
  );

  validateContradictions(root, label);
  const skill = readFileSync(join(root, "SKILL.md"), "utf8");
  assert.doesNotMatch(skill, /configurationRoot|activeRepo|qualified repository remove/i, `${label}/SKILL.md must remain a router`);
}

const omissionCases = [
  [paths.hooks, "`<configurationRoot>` is the configured workspace authority", "`<configurationRoot>` is the current checkout", /define configurationRoot/],
  [paths.hooks, "active configured target repository checkout", "configured target repository checkout", /as active/],
  [paths.hooks, "active configured target repository checkout", "active target repository checkout", /as configured/],
  [paths.hooks, "used to discover and execute repository remove hooks", "used by repository remove hooks", /hook discovery/],
  [paths.hooks, "It is distinct from the canonical clone or source checkout", "It is the canonical clone or source checkout", /distinct from the canonical/],
  [paths.hooks, "and is not the branch worktree selected for deletion", "", /not the branch worktree/],
  [paths.hooks, "The canonical configured repository remove script", "The configured repository remove script", /canonical qualified file/],
  [paths.hooks, "Compatible child-local", "Legacy child-local", /compatible child-local/],
  [paths.hooks, "one repository slot", "separate repository slots", /all three aliases/],
  [paths.hooks, "Logical identity stays", "Identity changes to", /preserve repository hook identity/],
  [paths.hooks, "For both qualified and child-local repository remove locations", "For the child-local repository remove location", /platform candidate rules/],
  [paths.hooks, "occupy the same repository position", "occupy different repository positions", /preserve remove order/],
  [paths.hooks, "Remove dry-run reports the exact selected source path", "Remove dry-run reports hook discovery", /align remove dry-run and doctor/],
  [paths.workspace, "the canonical active path is `<configurationRoot>/.arashi/hooks/<lifecycle>.<repo><ext>`", "the active path is `<activeRepo>/.arashi/hooks/<lifecycle><ext>`", /bind add\/configure creation/],
  [paths.workspace, "For a substantial or reusable repository remove script", "For a repository remove script", /add guidance/],
  [paths.workspace, "Delete owns only the exact qualified", "Delete owns the", /delete guidance/],
  [paths.remove, "hook previews preserve plain lifecycle/repository identity", "hook previews preserve identity", /exact-source dry-run/],
  [paths.troubleshooting, "`aw doctor --json` reports inline, qualified, and child-local", "`aw doctor --json` reports hook", /doctor diagnosis/],
];

const contradictionCases = [
  [paths.hooks, "`<activeRepo>` denotes the canonical source checkout.", /configured hook target/],
  [paths.hooks, "`<activeRepo>` refers to the branch worktree selected for deletion.", /configured hook target/],
  [paths.hooks, "`<activeRepo>` is not the branch worktree selected for deletion but is the canonical source checkout.", /configured hook target/],
  [paths.hooks, "Repository remove prefers the qualified file over inline and child-local aliases.", /precedence/],
  [paths.hooks, "Repository remove does not assign precedence among aliases, but it uses inline-first/file-fallback precedence.", /precedence/],
  [paths.hooks, "Repository remove composes and executes both qualified and child-local native files.", /compose/],
  [paths.hooks, "The default configured location for repository remove is `<repo>/.arashi/hooks/pre-remove<ext>`.", /canonical configured location/],
  [paths.workspace, "The canonical configured repository remove location is `<repo>/.arashi/hooks/pre-remove<ext>`.", /canonical configured location/],
  [paths.remove, "`<repo>/.arashi/hooks/post-remove<ext>` is the default configured repository remove path.", /canonical configured location/],
  [paths.workspace, "Configure creates `<activeRepo>/.arashi/hooks/pre-remove<ext>` for repository remove scripts.", /add\/configure/],
  [paths.workspace, "Onboarding installs new repository remove scripts in the child-local alias `<activeRepo>/.arashi/hooks/pre-remove<ext>`.", /onboarding/],
  [paths.workspace, "Delete owns and removes `<activeRepo>/.arashi/hooks/post-remove<ext>`.", /delete ownership/],
  [paths.workspace, "Delete cleans child-local repository remove aliases and lookalikes instead of only the exact config-owned canonical file.", /child-local aliases and lookalikes/],
  [paths.remove, "The only supported repository remove source is child-local `<activeRepo>/.arashi/hooks/pre-remove<ext>`.", /only supported/],
  [paths.troubleshooting, "Repository remove uses the configuration root as cwd because the hook is stored there.", /derive repository remove cwd/],
  [paths.troubleshooting, "Repository remove hooks run with the configuration root as their working directory.", /target checkout/],
  [paths.hooks, "On Windows, qualified repository remove `.sh` hooks run through Git Bash.", /Git Bash/],
  [paths.remove, "Remove dry-run executes pre-remove hooks to verify them before deletion.", /dry-run/],
];

const truthfulControls = [
  [paths.hooks, "`<activeRepo>` does not mean the canonical source checkout or the branch worktree selected for deletion."],
  [paths.hooks, "`<activeRepo>` is not the canonical source checkout or the branch worktree selected for deletion."],
  [paths.hooks, "Repository remove does not assign precedence among inline, qualified, and child-local aliases."],
  [paths.hooks, "Repository remove explicitly does not prefer the qualified file over inline and child-local aliases."],
  [paths.hooks, "Repository remove cannot prefer the qualified file over inline and child-local aliases."],
  [paths.hooks, "Repository remove can not prefer the qualified file over inline and child-local aliases."],
  [paths.hooks, "Repository remove cannot compose or execute both qualified and child-local aliases."],
  [paths.hooks, "Repository remove can not compose or execute both qualified and child-local aliases."],
  [paths.hooks, "Repository remove never composes or executes both qualified and child-local aliases."],
  [paths.workspace, "`<repo>/.arashi/hooks/pre-remove<ext>` is not the default or canonical configured repository remove location."],
  [paths.workspace, "Configure does not create `<activeRepo>/.arashi/hooks/pre-remove<ext>`."],
  [paths.workspace, "Onboarding does not install new repository remove scripts in the child-local alias `<activeRepo>/.arashi/hooks/pre-remove<ext>`."],
  [paths.workspace, "Delete never owns or removes `<activeRepo>/.arashi/hooks/post-remove<ext>`."],
  [paths.workspace, "Delete does not clean child-local repository remove aliases or lookalikes."],
  [paths.troubleshooting, "Repository remove hooks do not run with the configuration root as their working directory; they run from the active target checkout."],
  [paths.hooks, "On Windows, qualified repository remove `.sh` hooks do not run through Git Bash."],
  [paths.remove, "Remove dry-run does not execute pre-remove hooks."],
];

function runFixture(layout, skillRoot) {
  if (layout === "source") {
    try {
      validateSkill(skillRoot, "source-fixture");
      return { status: 0, stdout: "", stderr: "" };
    } catch (error) {
      return { status: 1, stdout: "", stderr: error.stack ?? String(error) };
    }
  }
  return spawnSync(process.execPath, [checkerPath, "--skill-root", skillRoot], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: { ...process.env, ARASHI_REPOSITORY_REMOVE_GUIDANCE_SKIP_FIXTURES: "1" },
  });
}

function validateControlledFixtures() {
  const roots = [];
  const falseAcceptances = [];
  const falseRejections = [];
  try {
    for (const layout of ["source", "package"]) {
      for (const [index, [relativePath, from, to, diagnostic]] of omissionCases.entries()) {
        const root = mkdtempSync(join(tmpdir(), `arashi-repo-remove-${layout}-omission-${index}-`));
        roots.push(root);
        const skillRoot = layout === "source" ? join(root, "skills", "arashi") : join(root, "arashi");
        cpSync(sourceSkillRoot, skillRoot, { recursive: true });
        const target = join(skillRoot, relativePath);
        const original = readFileSync(target, "utf8");
        assert.equal(original.split(from).length - 1, 1, `omission fixture source must occur once: ${from}`);
        writeFileSync(target, original.replace(from, to));
        const result = runFixture(layout, skillRoot);
        if (result.status === 0) falseAcceptances.push(`${layout}/omission-${index}`);
        else assert.match(output(result), diagnostic, `${layout}/omission-${index} wrong diagnostic`);
      }
      for (const [index, [relativePath, addition, diagnostic]] of contradictionCases.entries()) {
        const root = mkdtempSync(join(tmpdir(), `arashi-repo-remove-${layout}-contradiction-${index}-`));
        roots.push(root);
        const skillRoot = layout === "source" ? join(root, "skills", "arashi") : join(root, "arashi");
        cpSync(sourceSkillRoot, skillRoot, { recursive: true });
        const target = join(skillRoot, relativePath);
        writeFileSync(target, `${readFileSync(target, "utf8")}\n${addition}\n`);
        const result = runFixture(layout, skillRoot);
        if (result.status === 0) falseAcceptances.push(`${layout}/contradiction-${index}`);
        else assert.match(output(result), diagnostic, `${layout}/contradiction-${index} wrong diagnostic`);
      }
      for (const [index, [relativePath, addition]] of truthfulControls.entries()) {
        const root = mkdtempSync(join(tmpdir(), `arashi-repo-remove-${layout}-control-${index}-`));
        roots.push(root);
        const skillRoot = layout === "source" ? join(root, "skills", "arashi") : join(root, "arashi");
        cpSync(sourceSkillRoot, skillRoot, { recursive: true });
        const target = join(skillRoot, relativePath);
        writeFileSync(target, `${readFileSync(target, "utf8")}\n${addition}\n`);
        const result = runFixture(layout, skillRoot);
        if (result.status !== 0) falseRejections.push(`${layout}/control-${index}`);
      }
    }
    assert.deepEqual(falseAcceptances, [], `accepted repository remove guidance drift: ${falseAcceptances.join(", ")}`);
    assert.deepEqual(falseRejections, [], `rejected truthful repository remove guidance: ${falseRejections.join(", ")}`);
  } finally {
    for (const root of roots) rmSync(root, { recursive: true, force: true });
  }
}

const root = suppliedSkillRoot ? resolve(suppliedSkillRoot) : sourceSkillRoot;
const label = suppliedSkillRoot ? "package" : "source";
validateSkill(root, label);
if (process.env.ARASHI_REPOSITORY_REMOVE_GUIDANCE_SKIP_FIXTURES !== "1") validateControlledFixtures();
console.log(`repository remove hook guidance self-test passed (${label})`);
