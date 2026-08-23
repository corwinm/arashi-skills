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
const skillRelativePath = "SKILL.md";
const hooksRelativePath = "references/hooks.md";
const skillRootArgumentIndex = process.argv.indexOf("--skill-root");
const suppliedSkillRoot =
  skillRootArgumentIndex >= 0 ? process.argv[skillRootArgumentIndex + 1] : undefined;

if (skillRootArgumentIndex >= 0 && !suppliedSkillRoot) {
  throw new Error("--skill-root requires a path");
}

const descriptorFamilies = [
  {
    name: "workspace settings",
    paths: ["reposDir", "worktreesDir", "baseBranch", "sync.timeoutSeconds"],
  },
  {
    name: "workspace lifecycle hooks",
    paths: [
      "hooks.timeout",
      "hooks.scripts.pre-create",
      "hooks.scripts.post-create",
      "hooks.scripts.pre-remove",
      "hooks.scripts.post-remove",
    ],
  },
  {
    name: "command defaults",
    paths: ["defaults.create.switch", "defaults.create.launch", "defaults.switch.mode"],
  },
  {
    name: "editor defaults",
    paths: [
      "defaults.editors.vscode.create.switch",
      "defaults.editors.vscode.create.launch",
      "defaults.editors.cursor.create.switch",
      "defaults.editors.cursor.create.launch",
      "defaults.editors.kiro.create.switch",
      "defaults.editors.kiro.create.launch",
    ],
  },
  { name: "meta-repository policy", paths: ["meta.baseBranch"] },
  {
    name: "existing repository",
    paths: [
      "repos.<name>.groups",
      "repos.<name>.baseBranch",
      "repos.<name>.copy",
      "repos.<name>.symlink",
      "repos.<name>.hooks.pre-create",
      "repos.<name>.hooks.post-create",
      "repos.<name>.hooks.pre-remove",
      "repos.<name>.hooks.post-remove",
    ],
  },
];

const activeFilePaths = [
  "<workspace>/.arashi/hooks/pre-create<ext>",
  "<workspace>/.arashi/hooks/post-create<ext>",
  "<workspace>/.arashi/hooks/pre-remove<ext>",
  "<workspace>/.arashi/hooks/post-remove<ext>",
  "<workspace>/.arashi/hooks/pre-create.<repo><ext>",
  "<workspace>/.arashi/hooks/post-create.<repo><ext>",
  "<repo>/.arashi/hooks/pre-remove<ext>",
  "<repo>/.arashi/hooks/post-remove<ext>",
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

function validateDescriptorFamilies(guidance, label) {
  const bullets = guidance
    .split("\n")
    .filter((line) => line.startsWith("- "));
  assert.equal(
    bullets.length,
    descriptorFamilies.length,
    `${label}/${relativePath} must list exactly the six supported configure scope families`,
  );

  for (const family of descriptorFamilies) {
    const bullet = bullets.find((line) =>
      line.toLowerCase().includes(family.name.toLowerCase()),
    );
    assert.ok(
      bullet,
      `${label}/${relativePath} is missing the ${family.name} descriptor family`,
    );
    for (const path of family.paths) {
      assert.ok(
        bullet.includes(`\`${path}\``),
        `${label}/${relativePath} ${family.name} must name canonical descriptor path ${path}`,
      );
    }
    const expectedPaths =
      family.name === "existing repository"
        ? [...family.paths, "repos.<name>.path", "repos.<name>.gitUrl"]
        : family.paths;
    const documentedPaths = [...bullet.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
    assert.deepEqual(
      documentedPaths,
      expectedPaths,
      `${label}/${relativePath} ${family.name} must contain exactly its canonical descriptor paths`,
    );
  }

  const repositoryBullet = bullets.find((line) => /existing repository/i.test(line));
  for (const identityPath of ["repos.<name>.path", "repos.<name>.gitUrl"]) {
    assert.ok(
      repositoryBullet.includes(`\`${identityPath}\``),
      `${label}/${relativePath} must name canonical repository identity path ${identityPath}`,
    );
  }
  assert.match(
    repositoryBullet,
    /`repos\.<name>\.path`\s+and\s+`repos\.<name>\.gitUrl`[^.\n]*(?:identity-only|identity context)[^.\n]*(?:not editable|noneditable|read-only)/i,
    `${label}/${relativePath} must bind both repository path and gitUrl to noneditable identity-only context`,
  );
  assert.doesNotMatch(
    repositoryBullet,
    /`repos\.<name>\.path`[^.\n;]*(?:is|becomes?|remains?) editable/i,
    `${label}/${relativePath} must not contradict the noneditable repos.<name>.path identity`,
  );
  assert.doesNotMatch(
    repositoryBullet,
    /`repos\.<name>\.gitUrl`[^.\n;]*(?:is|becomes?|remains?) editable/i,
    `${label}/${relativePath} must not contradict the noneditable repos.<name>.gitUrl identity`,
  );
}

function validateSkill(root, label) {
  const content = readFileSync(join(root, relativePath), "utf8");
  const skillContent = readFileSync(join(root, skillRelativePath), "utf8");
  const hooksContent = readFileSync(join(root, hooksRelativePath), "utf8");
  const guidance = section(content, "Inspecting and Editing Workspace Configuration");
  const items = paragraphs(guidance);

  assert.match(
    skillContent,
    /## Task routing[\s\S]*\*\*[^\n]*configure[^\n]*existing workspace[^\n]*\*\*:[^\n]*\(references\/commands\/workspace\.md\)/i,
    `${label}/${skillRelativePath} must route existing-workspace configuration tasks to workspace guidance`,
  );

  const hookItems = paragraphs(hooksContent);
  requireParagraph(
    hookItems,
    /ordinary outcomes and previews[^.\n]*never disclose[^.\n]*inline command bodies[^.\n]*active-file contents/i,
    `${label}/${hooksRelativePath} must keep ordinary hook surfaces body-free`,
  );
  requireParagraph(
    hookItems,
    /`--json` output[^.\n]*never discloses[^.\n]*inline command bodies[^.\n]*active-file contents/i,
    `${label}/${hooksRelativePath} must keep JSON hook surfaces body-free`,
  );
  requireParagraph(
    hookItems,
    /diagnostics and logs[^.\n]*never disclose[^.\n]*inline command bodies[^.\n]*active-file contents/i,
    `${label}/${hooksRelativePath} must keep diagnostic hook surfaces body-free`,
  );
  requireParagraph(
    hookItems,
    /cancellation output[^.\n]*never discloses[^.\n]*inline command bodies[^.\n]*active-file contents/i,
    `${label}/${hooksRelativePath} must keep cancellation hook surfaces body-free`,
  );
  requireParagraph(
    hookItems,
    /only command-text exceptions[^.\n]*currently visible inline entry[^.\n]*`aw configure`[^.\n]*exact final `aw configure` JSON preview[^.\n]*those two surfaces show persisted command text/i,
    `${label}/${hooksRelativePath} must limit visible command text to the current configure entry and exact final preview`,
  );

  validateDescriptorFamilies(guidance, label);

  requireParagraph(
    items,
    /`aw configure`[^.\n]*(?:existing configured workspace)[^.\n]*(?:human-confirmed interactive edits)[^.\n]*not (?:a )?(?:generic )?(?:JSON )?Schema[- ](?:generated|derived) editor/i,
    `${label}/${relativePath} must route supported existing-workspace edits to the product-owned aw configure editor`,
  );
  requireParagraph(
    items,
    /`Configured`[^.\n]*present[^.\n]*`Not configured`[^.\n]*absent[^.\n]*(?:separate|separately)[^.\n]*effective[^.\n]*(?:never|does not)[^.\n]*persist/i,
    `${label}/${relativePath} must relate canonical persisted presence to separately non-persisting effective state`,
  );
  requireParagraph(
    items,
    /keep[^.\n]*preserves?[^.\n]*(?:persisted field|configured value)[^.\n]*(?:exactly|unchanged)[^.\n]*edit[^.\n]*(?:sets?|replaces?)[^.\n]*clear[^.\n]*(?:removes?|omits?)[^.\n]*(?:selected|canonical)[^.\n]*(?:optional )?field/i,
    `${label}/${relativePath} must relate keep/edit/clear to their distinct persisted-state actions`,
  );
  const reposDirPolicy = items.find((paragraph) => /Required `reposDir`/i.test(paragraph));
  assert.ok(reposDirPolicy, `${label}/${relativePath} must identify reposDir as required`);
  assert.match(reposDirPolicy, /supports? keep/i, `${label}/${relativePath} required reposDir must support keep`);
  assert.match(reposDirPolicy, /supports?[^.\n]*edit/i, `${label}/${relativePath} required reposDir must support edit`);
  assert.match(
    reposDirPolicy,
    /(?:not|never)[^.\n]*clear|clear[^.\n]*(?:not available|forbidden|unsupported)/i,
    `${label}/${relativePath} required reposDir must be non-clearable`,
  );

  const activeFilePolicy = items.find((paragraph) => /pre-existing active native file/i.test(paragraph));
  assert.ok(activeFilePolicy, `${label}/${relativePath} must define pre-existing active native file policy`);
  assert.match(activeFilePolicy, /external active state/i, `${label}/${relativePath} must treat active files as external state`);
  assert.match(activeFilePolicy, /never offers? clear/i, `${label}/${relativePath} must independently forbid clear for existing active files`);
  assert.match(activeFilePolicy, /never deletes?/i, `${label}/${relativePath} must independently forbid delete for existing active files`);
  assert.match(activeFilePolicy, /never overwrites?/i, `${label}/${relativePath} must independently forbid overwrite for existing active files`);
  assert.match(activeFilePolicy, /offers? keep\/skip/i, `${label}/${relativePath} must independently offer keep/skip for existing active files`);
  for (const path of activeFilePaths) {
    assert.ok(
      activeFilePolicy.includes(`\`${path}\``),
      `${label}/${relativePath} active-file matrix must contain exact canonical path ${path}`,
    );
  }
  requireParagraph(
    items,
    /final confirmation[^.\n]*exact serialized candidate JSON[^.\n]*plaintext inline command bodies[^.\n]*separate active-file plan[^.\n]*lifecycle[^.\n]*exact path[^.\n]*safe no-op[^.\n]*runtime-read(?:y|iness)[^.\n]*(?:does not|never)[^.\n]*(?:file contents|contents)[^.\n]*(?:JSON|preview)/i,
    `${label}/${relativePath} must relate exact JSON preview secrecy to separate active-file path/no-op/readiness metadata`,
  );
  requireParagraph(
    items,
    /declining the final (?:confirmation|preview)[^.\n]*(?:configuration bytes|config bytes)[^.\n]*active files[^.\n]*(?:unchanged|remain unchanged)/i,
    `${label}/${relativePath} must independently preserve config bytes and active files after final decline`,
  );
  requireParagraph(
    items,
    /interrupting the final (?:confirmation|preview)[^.\n]*(?:configuration bytes|config bytes)[^.\n]*active files[^.\n]*(?:unchanged|remain unchanged)/i,
    `${label}/${relativePath} must independently preserve config bytes and active files after interruption`,
  );
  requireParagraph(
    items,
    /canonical serialization[^.\n]*(?:equals|matches)[^.\n]*original (?:snapshot|bytes)[^.\n]*no active-file plan[^.\n]*reports?[^.\n]*no changes[^.\n]*before[^.\n]*final (?:mutation )?confirmation[^.\n]*(?:persistence|persist)[^.\n]*(?:does not|never)[^.\n]*install/i,
    `${label}/${relativePath} must make unchanged bytes plus no active-file plan exit before confirmation, persistence, or installation`,
  );
  requireParagraph(
    items,
    /both human and `--json`[^.\n]*canonical(?:ly)? (?:configured|loadable) valid workspace[^.\n]*(?:missing configuration|missing `\.arashi\/config\.json`)[^.\n]*standalone[^.\n]*invalid configuration[^.\n]*fail[^.\n]*before[^.\n]*(?:prompt|inspection)[^.\n]*(?:never|do not)[^.\n]*(?:initialize|init)[^.\n]*(?:repair|rewrite)/i,
    `${label}/${relativePath} must fail human/JSON missing, standalone, and invalid workspaces before prompt/inspection without init or repair`,
  );
  const jsonPolicy = items.find((paragraph) => /`aw configure --json`/.test(paragraph));
  assert.ok(jsonPolicy, `${label}/${relativePath} must define --json inspection policy`);
  assert.match(jsonPolicy, /(?:exactly one|one stable)[^.\n]*(?:sanitized|inspection)/i, `${label}/${relativePath} --json must emit one sanitized inspection document`);
  assert.match(jsonPolicy, /never prompts?/i, `${label}/${relativePath} --json must independently never prompt`);
  assert.match(jsonPolicy, /never mutates?/i, `${label}/${relativePath} --json must independently never mutate`);
  requireParagraph(
    items,
    /ordinary[^.\n]*JSON[^.\n]*(?:cancellation|cancelled)[^.\n]*(?:only|expose)[^.\n]*lifecycle[^.\n]*interpreter presence[^.\n]*(?:omit|never|without)[^.\n]*(?:inline command )?bodies/i,
    `${label}/${relativePath} must keep ordinary, JSON, and cancellation views body-free`,
  );
  requireParagraph(
    items,
    /non-TTY[^.\n]*(?:without|absent)[^.\n]*`--json`[^.\n]*fail[^.\n]*before[^.\n]*(?:prompt|mutation)/i,
    `${label}/${relativePath} must fail non-TTY human invocation before prompts or mutation`,
  );
  requireParagraph(
    items,
    /unsupported canonical fields[^.\n]*edit[^.\n]*`\.arashi\/config\.json`[^.\n]*directly/i,
    `${label}/${relativePath} must reserve direct JSON editing for unsupported canonical fields`,
  );

  assert.match(
    content,
    /Do not use `aw add` to edit an existing entry[^.\n]*Use `aw configure`[^.\n]*supported[^.\n]*(?:edits|fields)[^.\n]*direct[^.\n]*`\.arashi\/config\.json`[^.\n]*unsupported/i,
    `${label}/${relativePath} must route existing-entry supported edits to aw configure and only unsupported fields to direct JSON`,
  );
  assert.doesNotMatch(
    content,
    /Inspect `aw --help` for the installed configuration command|if none is available/i,
    `${label}/${relativePath} contains stale possible-configuration-command wording`,
  );
  assert.doesNotMatch(
    guidance,
    /(?:aw configure|configure)\s+--(?:set|unset)\b/i,
    `${label}/${relativePath} advertises an unsupported configure mutation flag`,
  );
}

const driftCases = [
  {
    name: "skill-configure-routing",
    path: skillRelativePath,
    from: "Initialize, add, clone, configure an existing workspace, or repair managed paths",
    to: "Initialize, add, clone, or repair managed paths",
    diagnostic: /route existing-workspace configuration tasks/,
  },
  {
    name: "hooks-ordinary-body-secrecy",
    path: hooksRelativePath,
    from: "Ordinary outcomes and previews never disclose inline command bodies or active-file contents.",
    to: "Ordinary outcomes and previews may disclose inline command bodies or active-file contents.",
    diagnostic: /keep ordinary hook surfaces body-free/,
  },
  {
    name: "hooks-json-body-secrecy",
    path: hooksRelativePath,
    from: "`--json` output never discloses inline command bodies or active-file contents.",
    to: "`--json` output may disclose inline command bodies or active-file contents.",
    diagnostic: /keep JSON hook surfaces body-free/,
  },
  {
    name: "hooks-diagnostic-body-secrecy",
    path: hooksRelativePath,
    from: "Diagnostics and logs never disclose inline command bodies or active-file contents.",
    to: "Diagnostics and logs may disclose inline command bodies or active-file contents.",
    diagnostic: /keep diagnostic hook surfaces body-free/,
  },
  {
    name: "hooks-cancellation-body-secrecy",
    path: hooksRelativePath,
    from: "Cancellation output never discloses inline command bodies or active-file contents.",
    to: "Cancellation output may disclose inline command bodies or active-file contents.",
    diagnostic: /keep cancellation hook surfaces body-free/,
  },
  {
    name: "hooks-visible-text-exception",
    path: hooksRelativePath,
    from: "The only command-text exceptions are the currently visible inline entry during `aw configure` editing and the exact final `aw configure` JSON preview; those two surfaces show persisted command text.",
    to: "All previews and diagnostics show persisted command text.",
    diagnostic: /limit visible command text to the current configure entry and exact final preview/,
  },
  {
    name: "descriptor-path",
    from: "`defaults.switch.mode`",
    to: "`defaults.switch.launch`",
    diagnostic: /canonical descriptor path defaults\.switch\.mode/,
  },
  {
    name: "repository-path-editable",
    from: "`repos.<name>.path` and `repos.<name>.gitUrl` are identity-only context and are noneditable",
    to: "`repos.<name>.path` is editable; `repos.<name>.gitUrl` is identity-only context and is noneditable",
    diagnostic: /both repository path and gitUrl|noneditable repos\.<name>\.path identity/,
  },
  {
    name: "repository-git-url-editable",
    from: "`repos.<name>.path` and `repos.<name>.gitUrl` are identity-only context and are noneditable",
    to: "`repos.<name>.path` is identity-only context and is noneditable; `repos.<name>.gitUrl` is editable",
    diagnostic: /both repository path and gitUrl|noneditable repos\.<name>\.gitUrl identity/,
  },
  {
    name: "required-repos-dir-keep",
    from: "Required `reposDir` supports keep. It supports edit. Clear is forbidden.",
    to: "Required `reposDir` omits keep. It supports edit. Clear is forbidden.",
    diagnostic: /required reposDir must support keep/,
  },
  {
    name: "required-repos-dir-edit",
    from: "Required `reposDir` supports keep. It supports edit. Clear is forbidden.",
    to: "Required `reposDir` supports keep. It omits edit. Clear is forbidden.",
    diagnostic: /required reposDir must support edit/,
  },
  {
    name: "required-repos-dir-clear",
    from: "Required `reposDir` supports keep. It supports edit. Clear is forbidden.",
    to: "Required `reposDir` supports keep. It supports edit. Clear is supported.",
    diagnostic: /required reposDir must be non-clearable/,
  },
  {
    name: "active-file-ownership",
    from: "external active state",
    to: "configure-owned persisted state",
    diagnostic: /external state/,
  },
  {
    name: "active-file-clear",
    from: "Configure never offers clear.",
    to: "Configure offers clear.",
    diagnostic: /independently forbid clear/,
  },
  {
    name: "active-file-delete",
    from: "It never deletes the file.",
    to: "It deletes the file on request.",
    diagnostic: /independently forbid delete/,
  },
  {
    name: "active-file-overwrite",
    from: "It never overwrites the file.",
    to: "It overwrites the file on request.",
    diagnostic: /independently forbid overwrite/,
  },
  {
    name: "active-file-keep-skip",
    from: "It offers keep/skip instead.",
    to: "It offers replace instead.",
    diagnostic: /independently offer keep\/skip/,
  },
  {
    name: "final-decline-preservation",
    from: "Declining the final preview leaves configuration bytes and active files unchanged.",
    to: "Declining the final preview may change configuration bytes and active files.",
    diagnostic: /after final decline/,
  },
  {
    name: "interruption-preservation",
    from: "Interrupting the final preview leaves configuration bytes and active files unchanged.",
    to: "Interrupting the final preview may change configuration bytes and active files.",
    diagnostic: /after interruption/,
  },
  {
    name: "no-op-confirmation",
    from: "before final mutation confirmation",
    to: "after final mutation confirmation",
    diagnostic: /unchanged bytes plus no active-file plan/,
  },
  {
    name: "workspace-eligibility",
    from: "fail before any prompt or inspection",
    to: "fail after inspection",
    diagnostic: /fail human\/JSON missing, standalone, and invalid workspaces/,
  },
  {
    name: "preview-secrecy",
    from: "does not put generated file contents into the JSON preview",
    to: "puts generated file contents into the JSON preview",
    diagnostic: /exact JSON preview secrecy/,
  },
  {
    name: "json-prompt",
    from: "It never prompts. It never mutates.",
    to: "It prompts. It never mutates.",
    diagnostic: /--json must independently never prompt/,
  },
  {
    name: "json-mutation",
    from: "It never prompts. It never mutates.",
    to: "It never prompts. It mutates.",
    diagnostic: /--json must independently never mutate/,
  },
  {
    name: "existing-entry-route",
    from: "use `aw configure` for supported edits",
    to: "inspect `aw --help` for a possible configuration command for supported edits",
    diagnostic: /route existing-entry supported edits|stale possible-configuration-command wording/,
  },
  ...activeFilePaths.map((path, index) => ({
    name: `active-file-path-${index + 1}`,
    from: `\`${path}\``,
    to: `\`${path.replace("/.arashi/hooks/", "/.arashi/incorrect-hooks/")}\``,
    diagnostic: new RegExp(`active-file matrix must contain exact canonical path ${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`),
  })),
];

function validateControlledDrift() {
  const roots = [];
  try {
    for (const drift of driftCases) {
      const root = mkdtempSync(join(tmpdir(), `arashi-configure-${drift.name}-`));
      roots.push(root);
      const skillRoot = join(root, "skills", "arashi");
      cpSync(sourceSkillRoot, skillRoot, { recursive: true });
      const guidancePath = join(skillRoot, drift.path ?? relativePath);
      const original = readFileSync(guidancePath, "utf8");
      assert.ok(original.includes(drift.from), `${drift.name} drift fixture source is stale`);
      writeFileSync(guidancePath, original.replace(drift.from, drift.to));

      assert.throws(
        () => validateSkill(skillRoot, `source-${drift.name}-drift`),
        drift.diagnostic,
        `${drift.name} drift must fail direct semantic validation`,
      );

      const packaged = spawnSync(
        process.execPath,
        [checkerPath, "--skill-root", skillRoot],
        { cwd: repositoryRoot, encoding: "utf8" },
      );
      assert.notEqual(
        packaged.status,
        0,
        `${drift.name} drift must fail the extracted-package invocation`,
      );
      assert.match(
        output(packaged),
        drift.diagnostic,
        `${drift.name} extracted-package invocation must enforce the same semantic relationship`,
      );
    }
  } finally {
    for (const root of roots) rmSync(root, { recursive: true, force: true });
  }
}

function main() {
  if (suppliedSkillRoot) {
    validateSkill(resolve(suppliedSkillRoot), "package");
    console.log("configure workspace guidance self-test passed for packaged skill semantics");
    return;
  }

  validateSkill(sourceSkillRoot, "source");
  validateControlledDrift();
  console.log(
    `configure workspace guidance self-test passed for source and ${driftCases.length} source/package semantic drift fixtures`,
  );
}

main();
