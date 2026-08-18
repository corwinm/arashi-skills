#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  cpSync,
  mkdtempSync,
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
  skillRootArgumentIndex >= 0
    ? process.argv[skillRootArgumentIndex + 1]
    : undefined;

if (skillRootArgumentIndex >= 0 && !suppliedSkillRoot) {
  throw new Error("--skill-root requires a path");
}

const expectedRepositoryBasePolicy = {
  configuration: {
    child: "repos.<name>.baseBranch",
    meta: "meta.baseBranch",
    workspace: "baseBranch",
  },
  options: {
    global: "--base <branch>",
    metaSelector: "@meta",
    repository: "--repo-base <repository=branch>",
  },
  precedence: [
    "repository-cli",
    "cli",
    "repository-config",
    "workspace-config",
    "legacy-omitted",
  ],
  sources: [
    "repository-cli",
    "cli",
    "repository-config",
    "workspace-config",
    "legacy-omitted",
  ],
  scope: {
    clone: "configured-only",
    create: "configured-and-standalone-global",
    doctor: "configured-only",
    handoff: "configured-only",
    pull: "configured-only-with-upstream-fallback-when-absent",
    pushFallback: "configured-no-upstream-only",
    repositoryOverride: "configured-only",
    status: "configured-only",
  },
  clone: {
    coordinated: "checkout-current-target-from-effective-base",
    omitted: "remote-default",
    ordinary: "checkout-effective-base",
  },
  output: {
    cloneProperty: "base",
    createProperty: "base",
    fields: ["repositoryIdentity", "repositoryName", "requestedBranch", "source"],
    omitted: "all-legacy-omitted",
  },
  validation: "selected-set-before-mutation",
  rollback: "invocation-created-destinations-and-target-refs-only",
};

const expectedCreateBasePolicy = {
  scope: {
    cli: "invocation-only",
    workspaceDefault: "baseBranch",
    workspaceDefaultScope: "shared-create-clone",
    editorScopedDefault: "rejected",
  },
  precedence: [
    "repository-cli",
    "cli",
    "repository-config",
    "workspace-config",
    "legacy-omitted",
  ],
  normalization: { originPrefix: "remove-at-most-one" },
  standalone: {
    cli: "invocation-only",
    workspaceDefault: "ignored",
    omitted: "legacy-current-head",
  },
  resolution: {
    repositories: "every-effective-selected-including-reused",
    refs: ["refs/heads/<branch>", "refs/remotes/origin/<branch>"],
  },
  mutation: {
    preflight: "all-before-any",
    executionStartPoint: "immutable-resolved-oid",
    reusedTarget: {
      ancestry: "not-asserted-checked-or-derived",
      baseResolution: "required",
      mutation: "none",
    },
  },
  output: {
    humanDryRun: { baseResolution: true },
    json: {
      base: "optional",
      baseFields: ["requestedBranch", "source", "repositories"],
      requestedBranch: "normalized-logical-branch",
      sources: [
        "repository-cli",
        "cli",
        "repository-config",
        "workspace-config",
        "legacy-omitted",
      ],
      targetActions: ["created", "reused"],
      success: {
        ordering: "effective-selected-repository-order",
        repositories: "complete-selected-set",
        repositoryFields: [
          "repositoryName",
          "repositoryPath",
          "resolvedRef",
          "resolvedOid",
          "targetAction",
        ],
        repositoryPath: "canonical-absolute",
      },
      failure: {
        attemptedRefs: ["refs/heads/<branch>", "refs/remotes/origin/<branch>"],
        code: "CREATE_BASE_RESOLUTION_FAILED",
        fields: ["requestedBranch", "source", "repositories"],
        ordering: "effective-selected-repository-order",
        repositories: "affected-only-selected-set",
        repositoryFields: ["repositoryName", "repositoryPath", "attemptedRefs"],
        repositoryPath: "canonical-absolute",
      },
    },
  },
  environmentVariables: { ARASHI_BASE_BRANCH: "forbidden" },
};

const expectedContract = {
  schemaVersion: 9,
  commands: ["create", "clone"],
  options: ["--base", "--repo-base"],
  semanticPolicy: {
    ownership: "command",
    persisted: false,
    createBase: expectedCreateBasePolicy,
    repositoryBase: expectedRepositoryBasePolicy,
  },
};

function section(content, heading) {
  const marker = `## ${heading}`;
  const start = content.indexOf(marker);
  assert.notEqual(start, -1, `missing section ${JSON.stringify(marker)}`);
  const end = content.indexOf("\n## ", start + marker.length);
  return content.slice(start, end === -1 ? content.length : end);
}

function installableGuidanceFiles(root) {
  const files = [];
  const visit = (directory) => {
    for (const name of readdirSync(directory).sort()) {
      const path = join(directory, name);
      if (statSync(path).isDirectory()) {
        visit(path);
      } else if (/\.(?:md|txt|json)$/i.test(name)) {
        const content = readFileSync(path, "utf8");
        if (/\.json$/i.test(name)) {
          assert.doesNotThrow(
            () => JSON.parse(content),
            `${relative(root, path)} must contain valid JSON`,
          );
        }
        files.push({ content, path });
      }
    }
  };
  visit(root);
  return files;
}

function semanticSentences(content) {
  return content
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/\n/g, " "))
    .split(/(?<=[.!?])\s+|\n{2,}/)
    .map((sentence) => sentence.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function contrastClauses(sentence) {
  return sentence
    .split(/\s*(?:;|\b(?:although|but|however|though|whereas|while|yet)\b[:,]?)\s*/i)
    .map((clause) => clause.trim())
    .filter(Boolean);
}

function actionIsNegated(clause, actionIndex) {
  const prefix = clause.slice(0, actionIndex).toLowerCase();
  if (
    /\b(?:does?|do|is|are|was|were|will|must|should|can|may)\s+not(?:\s+\w+){0,3}\s*$/.test(
      prefix,
    ) ||
    /\bnever(?:\s+\w+){0,2}\s*$/.test(prefix) ||
    /\bwithout(?:\s+\w+){0,3}\s*$/.test(prefix)
  ) {
    return true;
  }

  const lastNot = Math.max(prefix.lastIndexOf(" not "), prefix.lastIndexOf(" never "));
  if (lastNot === -1) return false;
  const sharedScope = prefix.slice(lastNot);
  return /\b(?:or|nor)\b/.test(sharedScope) && !/\band\b/.test(sharedScope);
}

function hasAffirmativeAction(clause, actionPattern) {
  for (const match of clause.matchAll(actionPattern)) {
    if (!actionIsNegated(clause, match.index)) return true;
  }
  return false;
}

function removedCreateBaseGuidanceContradiction(content) {
  const blocks = content
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/\n/g, " "))
    .split(/\n{2,}/)
    .flatMap((block) => block.split(/\n(?=\s*(?:[-*+] |\d+\. ))/))
    .map((block) => block.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const contexts = blocks.flatMap((block, index) => {
    if (/^#{1,6}\s/.test(block) && /defaults\.create\.baseBranch/i.test(block))
      return [`${block} ${blocks[index + 1] ?? ""}`];
    return block.split(/(?<=[.!?])\s+/);
  });
  const mention = /defaults\.create\.baseBranch/gi;
  const rejection =
    /\b(?:unsupported|no longer supported|removed|obsolete|invalid|forbidden|rejects?|rejected|replac(?:e|ed|ement)|migrat(?:e|ed|ion)|move(?:d)?)\b|\b(?:(?:do|does|is|are|was|were|will|must|should|can|may)\s+not|never|cannot|can't|must not)\b[^.!?]{0,50}\b(?:set|use|configure|add|put|place|accept|support|read|honor)\b[^.!?]{0,50}defaults\.create\.baseBranch|\b(?:instead of|rather than)\s*`?defaults\.create\.baseBranch|defaults\.create\.baseBranch[^.!?]{0,80}(?:\b(?:does not|never|cannot|can't|must not)\b[^.!?]{0,40}\b(?:appl(?:y|ies)|works?|accepts?|supports?|reads?|honors?|uses?)\b|\b(?:is|are|was|were)\s+not\s+(?:supported|accepted|used|read|honored|valid|allowed)\b)/i;
  const actionBeforeMention =
    /\b(?:set|use|configure|add|put|place|accepts?|supports?|reads?|uses?|honors?)\b/gi;
  const affirmativeAfterMention =
    /\b(?:can|may|should)\s+(?:still\s+)?(?:be\s+)?(?:use|used|set|configure|configured|add|added|accept|accepted|support|supported|read|honor|honored)|\b(?:is|remains?|stays?)\s+(?!not\b)(?:still\s+)?(?:supported|accepted|valid|allowed|used|read|honored)|\b(?:arashi|create|configuration|config)\s+(?:still\s+)?(?:accepts?|supports?|reads?|uses?|honors?)\b|\bstill\s+(?:applies|works|controls?|defines?|selects?|chooses?|determines?)\b|\bcontinues?\s+to\s+(?:control|define|set|select|choose|determine)\b/i;
  const activeBehaviorAfterMention =
    /\b(?:appl(?:y|ies)|works?|controls?|defines?|selects?|chooses?|determines?)\b/gi;

  for (const context of contexts) {
    for (const match of context.matchAll(mention)) {
      const localIndex = match.index ?? 0;
      const before = context.slice(0, localIndex);
      const clauseStart = Math.max(
        before.lastIndexOf("."),
        before.lastIndexOf(";"),
        before.lastIndexOf("!"),
        before.lastIndexOf("?"),
      );
      const sameClauseBefore = before.slice(clauseStart + 1);
      const after = context.slice(localIndex + match[0].length);

      for (const action of sameClauseBefore.matchAll(actionBeforeMention)) {
        const suffix = sameClauseBefore.slice((action.index ?? 0) + action[0].length);
        if (/^(?:support|use)$/i.test(action[0]) && /^\s+(?:for|of)\b/i.test(suffix)) continue;
        if (/\b(?:instead of|rather than)\s*`?$/i.test(suffix)) continue;
        if (!actionIsNegated(sameClauseBefore, action.index)) return true;
      }
      if (affirmativeAfterMention.test(after)) return true;
      if (hasAffirmativeAction(after, activeBehaviorAfterMention)) return true;
      if (!rejection.test(context)) return true;
    }
  }
  return false;
}

function createBaseContradiction(sentence) {
  const clauses = contrastClauses(sentence);
  const reuseScope = /reused? target|target[^.]{0,40}reuse/i.test(sentence);
  const successScope = /success(?:ful)?[^.]{0,80}repositor|repositor[^.]{0,80}success/i.test(
    sentence,
  );
  const failureScope = /(?:failure|resolution error)[^.]{0,120}repositor|repositor[^.]{0,120}(?:failure|resolution error)/i.test(
    sentence,
  );
  const standaloneScope = /standalone/i.test(sentence);
  let carryAffirmativeFailureInclude = false;

  for (const clause of clauses) {
    if (
      reuseScope &&
      /derived from (?:the )?(?:requested )?base/i.test(clause) &&
      !/does not[^.;]{0,100}(?:represent|claim)[^.;]{0,100}derived/i.test(
        clause,
      ) &&
      hasAffirmativeAction(clause, /\b(?:derived|represented|reported|claimed)\b/gi)
    ) {
      return "falsely derives a reused target from the requested base";
    }

    if (successScope && /alphabetic(?:al|ally)?/i.test(clause)) {
      const alphabeticalIndex = clause.search(/alphabetic(?:al|ally)?/i);
      const selectedBeforeRather = /selected(?:-set| repository)? order[^.;]*rather than[^.;]*alphabetic/i.test(
        clause,
      );
      if (!selectedBeforeRather && !actionIsNegated(clause, alphabeticalIndex)) {
        return "sorts success repositories alphabetically instead of selected-set order";
      }
    }

    const affirmativeFailureInclude = hasAffirmativeAction(
      clause,
      /\b(?:include|includes|included|including|contain|contains)\b/gi,
    );
    const dependentFailureInclude =
      carryAffirmativeFailureInclude && /^also\b/i.test(clause);
    if (
      failureScope &&
      /unaffected repositor/i.test(clause) &&
      (affirmativeFailureInclude || dependentFailureInclude)
    ) {
      return "includes unaffected selected repositories in failure output";
    }
    carryAffirmativeFailureInclude =
      affirmativeFailureInclude && /\bnot only\b/i.test(clause);

    if (
      standaloneScope &&
      /defaults\.create\.baseBranch/i.test(clause) &&
      hasAffirmativeAction(clause, /\b(?:load|loads|loaded|persist|persists|persisted|read|reads)\b/gi)
    ) {
      return "persists or loads create-base configuration in standalone mode";
    }
  }
  return undefined;
}

function baseVariableAssertionIsExplicitlyNegative(assertion) {
  const variable = "ARASHI_BASE_BRANCH";
  const beforeVariable = `[^.;]{0,160}\\b${variable}\\b`;
  const afterVariable = `\\b${variable}\\b[^.;]{0,160}`;

  return [
    new RegExp(
      `\\b(?:do|does|did|is|are|was|were|will|must|should|can|may)\\s+not\\b${beforeVariable}`,
      "i",
    ),
    new RegExp(`\\bnever\\b${beforeVariable}`, "i"),
    new RegExp(`\\bnot\\s+to\\b${beforeVariable}`, "i"),
    new RegExp(`\\bwithout\\b${beforeVariable}`, "i"),
    new RegExp(
      `${afterVariable}\\b(?:is|are|was|were|will|must|should|can|may)\\s+not\\b`,
      "i",
    ),
    new RegExp(
      `${afterVariable}\\b(?:forbidden|unsupported|unavailable|absent)\\b`,
      "i",
    ),
    new RegExp(`\\bno\\b${beforeVariable}`, "i"),
  ].some((pattern) => pattern.test(assertion));
}

function unsupportedBaseVariableClaim(sentence) {
  if (!/ARASHI_BASE_BRANCH/i.test(sentence)) return false;

  return contrastClauses(sentence)
    .flatMap((clause) => clause.split(/\s+\band\b\s+/i))
    .filter((assertion) => /ARASHI_BASE_BRANCH/i.test(assertion))
    .some((assertion) => !baseVariableAssertionIsExplicitlyNegative(assertion));
}

function validatePackageWideClaims(root, label) {
  for (const { content, path } of installableGuidanceFiles(root)) {
    const relativePath = relative(root, path);
    assert.equal(
      removedCreateBaseGuidanceContradiction(content),
      false,
      `${label}/${relativePath} recommends or describes behavior for the removed defaults.create.baseBranch key`,
    );
    for (const sentence of semanticSentences(content)) {
      const contradiction = createBaseContradiction(sentence);
      assert.equal(
        contradiction,
        undefined,
        `${label}/${relativePath} ${contradiction}: ${sentence}`,
      );
      assert.equal(
        unsupportedBaseVariableClaim(sentence),
        false,
        `${label}/${relativePath} advertises an unsupported ARASHI_BASE_BRANCH variable: ${sentence}`,
      );
    }
  }
}

function validateSkill(root, label) {
  const commands = readFileSync(
    join(root, "references", "commands", "create.md"),
    "utf8",
  );
  const guidance = section(commands, "Create from a Coordinated Base Branch");

  for (const required of [
    "root `baseBranch`",
    "`meta.baseBranch`",
    "`repos.<name>.baseBranch`",
    "shared repository base policy for `create`, `clone`, `status`, `pull`",
    "aw create <target> --base <branch>",
    "aw clone --base <branch>",
    "`--repo-base <repository=branch>`",
    "`@meta`",
    "For create and clone, precedence is repository CLI > invocation CLI > repository config > workspace config",
    "Status, pull, push fallback, handoff, and doctor apply repository config then root policy",
    "complete effective selected set",
    "before hooks, managed-ignore reconciliation, Git refs, or filesystem mutation",
    "local branch first and then `origin/<branch>`",
    "coordinated target branch",
    "creation point",
    "does not reset, rebase, rewrite, or ancestry-check",
    "`defaults.create.baseBranch`",
    "is unsupported",
    "Move a workspace-wide value to root `baseBranch`",
    "before repository or hook discovery",
    "implicit standalone mode",
    "invocation-only",
    "rejects `--repo-base`",
    "does not add standalone clone support",
    "Human `--dry-run`",
    "`data.base.repositories`",
    "`requestedBranch` is normalized",
    "`repositoryIdentity` is the canonical selector identity",
    "`repositoryName` is the repository display name",
    "`repositoryPath` is its canonical absolute path",
    "`resolvedRef`",
    "`resolvedOid`",
    "`targetAction` is exactly `created` or `reused`",
    "`BASE_BRANCH_POLICY_INVALID`",
    "`error.details.issues`",
    "`CREATE_BASE_RESOLUTION_FAILED`",
    "`error.details.repositories`",
    "`attemptedRefs`",
    "`refs/heads/<branch>`",
    "`refs/remotes/origin/<branch>`",
    "`ARASHI_BRANCH_NAME`",
    "do not invent `ARASHI_BASE_BRANCH`",
  ]) {
    assert.ok(
      guidance.includes(required),
      `${label}/references/commands/create.md create-base guidance is missing ${JSON.stringify(required)}`,
    );
  }

  assert.match(
    guidance,
    /For create and clone, precedence is repository CLI > invocation CLI > repository config > workspace config[\s\S]*Status, pull, push fallback, handoff, and doctor apply repository config then root policy/,
    `${label}/references/commands/create.md must state exact per-repository precedence`,
  );
  assert.doesNotMatch(
    guidance,
    /workspace-generic `defaults\.create\.baseBranch` setting/,
    `${label}/references/commands/create.md still presents the legacy create-only key as canonical`,
  );

  const workspace = readFileSync(
    join(root, "references", "commands", "workspace.md"),
    "utf8",
  );
  const cloneGuidance = section(workspace, "Repository Cloning and Recovery");
  for (const required of [
    "root `baseBranch`",
    "`repos.<name>.baseBranch`",
    "`--base <branch>`",
    "`--repo-base <repository=branch>`",
    "coordinated target branch",
    "creation point",
    "reuses it unchanged",
    "before managed-ignore reconciliation or destination creation",
    "with no effective base policy",
    "When a base policy applies",
    "`data.base`",
    "`BASE_BRANCH_POLICY_INVALID`",
    "`CLONE_BASE_PREFLIGHT_FAILED`",
    "`error.details.repositories`",
    "`gitUrl`",
    "When an effective base policy applies, successful policy evidence appears under `data.base`",
  ]) {
    assert.ok(
      cloneGuidance.includes(required),
      `${label}/references/commands/workspace.md clone-base guidance is missing ${JSON.stringify(required)}`,
    );
  }

  const workflows = readFileSync(join(root, "references", "workflows.md"), "utf8");
  const workflowGuidance = section(workflows, "Create from a coordinated base");
  for (const required of [
    "independent effective base",
    "`--repo-base`",
    "coordinated target branch",
  ]) {
    assert.ok(
      workflowGuidance.includes(required),
      `${label}/references/workflows.md coordinated-base workflow is missing ${JSON.stringify(required)}`,
    );
  }
  assert.doesNotMatch(
    workflowGuidance,
    /start from the same base/,
    `${label}/references/workflows.md still claims every repository shares one base`,
  );

  validatePackageWideClaims(root, label);
}

function validateContracts() {
  const contract = JSON.parse(
    readFileSync(
      join(repositoryRoot, "contracts", "create-base-branch.json"),
      "utf8",
    ),
  );
  assert.deepEqual(contract, expectedContract, "repository-base semantic contract is stale");

  const precedenceDrift = structuredClone(contract);
  precedenceDrift.semanticPolicy.repositoryBase.precedence = [
    "cli",
    "repository-cli",
    "repository-config",
    "workspace-config",
    "legacy-create-config",
    "legacy-omitted",
  ];
  assert.throws(
    () => assert.deepEqual(precedenceDrift, expectedContract, "repository-base semantic contract is stale"),
    /repository-base semantic contract is stale/,
    "contract checker accepted incorrect repository/global CLI precedence",
  );

  const createPrecedenceDrift = structuredClone(contract);
  createPrecedenceDrift.semanticPolicy.createBase.precedence = [
    "repository-cli",
    "cli",
    "repository-config",
    "workspace-config",
    "defaults.create.baseBranch",
    "legacy-omitted",
  ];
  assert.throws(
    () => assert.deepEqual(createPrecedenceDrift, expectedContract, "repository-base semantic contract is stale"),
    /repository-base semantic contract is stale/,
    "contract checker accepted the removed defaults.create.baseBranch precedence source",
  );

  const coverage = JSON.parse(
    readFileSync(
      join(repositoryRoot, "contracts", "command-coverage.json"),
      "utf8",
    ),
  );
  for (const commandName of ["create", "clone"]) {
    const command = coverage.commands.find(({ name }) => name === commandName);
    assert.ok(command, `command coverage is missing ${commandName}`);
    for (const option of ["--base", "--repo-base"]) {
      assert.ok(
        command.requiredOptions?.includes(option),
        `${commandName} command coverage is missing ${option}`,
      );
    }
  }
  for (const commandName of ["status", "doctor"]) {
    const command = coverage.commands.find(({ name }) => name === commandName);
    assert.ok(command, `command coverage is missing ${commandName}`);
    assert.equal(
      command.reference,
      "references/commands/automation.md",
      `${commandName} command coverage must route to configured-base guidance`,
    );
  }
}

function validateDeliberateDrift(fixtureSkillRoot = sourceSkillRoot) {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "arashi-repository-base-guidance-"));
  try {
    for (const [name, relativePath, from, to, expected] of [
      [
        "precedence",
        join("references", "commands", "create.md"),
        "For create and clone, precedence is repository CLI > invocation CLI > repository config > workspace config",
        "For create and clone, precedence is workspace config > repository config > invocation CLI > repository CLI",
        /precedence|missing/i,
      ],
      [
        "clone-alignment",
        join("references", "commands", "workspace.md"),
        "coordinated target branch",
        "effective base branch",
        /coordinated|missing/i,
      ],
      [
        "standalone-repository-base",
        join("references", "commands", "create.md"),
        "rejects `--repo-base`",
        "accepts `--repo-base`",
        /standalone|missing/i,
      ],
    ]) {
      const root = join(temporaryRoot, name);
      cpSync(fixtureSkillRoot, root, { recursive: true });
      const path = join(root, relativePath);
      const original = readFileSync(path, "utf8");
      assert.equal(original.split(from).length - 1, 1, `${name} drift marker must occur once`);
      writeFileSync(path, original.replace(from, to));
      assert.throws(() => validateSkill(root, name), expected);
    }

    const legacyGuidanceRoot = join(temporaryRoot, "removed-create-base-guidance");
    cpSync(fixtureSkillRoot, legacyGuidanceRoot, { recursive: true });
    const legacyTutorialPath = join(legacyGuidanceRoot, "references", "tutorial.md");
    writeFileSync(
      legacyTutorialPath,
      `${readFileSync(legacyTutorialPath, "utf8")}
\`defaults.create.baseBranch\` remains a deprecated create-only compatibility input.
Set \`defaults.create.baseBranch\` to choose the create base.
Although \`defaults.create.baseBranch\` was removed from the schema, create still accepts it.
\`defaults.create.baseBranch\` was removed from the schema, but you can still use it.
\`defaults.create.baseBranch\` was removed from the schema but continues to control create.
The removed \`defaults.create.baseBranch\` controls the create base.
\`defaults.create.baseBranch\` controls create, while editor-scoped defaults are unsupported.
- \`defaults.create.baseBranch\` was removed.
- \`defaults.create.baseBranch\` controls the create base
`,
    );
    assert.throws(
      () => validateSkill(legacyGuidanceRoot, "removed-create-base-guidance"),
      /removed defaults\.create\.baseBranch|recommends/i,
    );

    const negatedGuidanceRoot = join(temporaryRoot, "negated-create-base-guidance");
    cpSync(fixtureSkillRoot, negatedGuidanceRoot, { recursive: true });
    const negatedTutorialPath = join(negatedGuidanceRoot, "references", "tutorial.md");
    writeFileSync(
      negatedTutorialPath,
      `${readFileSync(negatedTutorialPath, "utf8")}
\`defaults.create.baseBranch\` never applies. Do not set \`defaults.create.baseBranch\`. Replace \`defaults.create.baseBranch\` with root \`baseBranch\`; it is no longer supported.
Configuration supports root \`baseBranch\`; \`defaults.create.baseBranch\` was removed.
Configuration does not support \`defaults.create.baseBranch\`.
Support for \`defaults.create.baseBranch\` was removed.
Use of \`defaults.create.baseBranch\` is forbidden.
\`defaults.create.baseBranch\` is not supported.
Use root \`baseBranch\` instead of \`defaults.create.baseBranch\`.

## \`defaults.create.baseBranch\`

This property is unsupported; migrate to root \`baseBranch\`.
`,
    );
    validateSkill(negatedGuidanceRoot, "negated-create-base-guidance");

    const environmentRoot = join(temporaryRoot, "invented-hook-environment");
    cpSync(fixtureSkillRoot, environmentRoot, { recursive: true });
    const tutorialPath = join(environmentRoot, "references", "tutorial.md");
    writeFileSync(
      tutorialPath,
      `${readFileSync(tutorialPath, "utf8")}
Create hooks receive ARASHI_BASE_BRANCH with the requested base.
`,
    );
    assert.throws(
      () => validateSkill(environmentRoot, "invented-hook-environment"),
      /ARASHI_BASE_BRANCH|unsupported/i,
    );
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

function main() {
  if (suppliedSkillRoot) {
    const packagedSkillRoot = resolve(suppliedSkillRoot);
    validateSkill(packagedSkillRoot, "package");
    validateDeliberateDrift(packagedSkillRoot);
    console.log(
      "create-base guidance self-test passed for packaged skill and adversarial fixtures",
    );
    return;
  }

  validateSkill(sourceSkillRoot, "source");
  validateContracts();
  validateDeliberateDrift();
  console.log(
    "create-base guidance self-test passed for source, contracts, and deliberate drift",
  );
}

main();
