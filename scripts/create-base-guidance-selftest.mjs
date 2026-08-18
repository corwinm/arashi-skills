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
    legacyCreateOnly: "defaults.create.baseBranch",
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
    "legacy-create-config",
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
    repositoryOverride: "configured-only",
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
    "defaults.create.baseBranch",
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
      sources: ["repository-cli", "cli", "repository-config", "workspace-config"],
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
  schemaVersion: 8,
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
    "configured `create` and `clone`",
    "aw create <target> --base <branch>",
    "aw clone --base <branch>",
    "`--repo-base <repository=branch>`",
    "`@meta`",
    "shared precedence is repository CLI > invocation CLI > repository config > workspace config",
    "Configured create then considers deprecated `defaults.create.baseBranch` before legacy omitted behavior",
    "clone skips that create-only key",
    "complete effective selected set",
    "before hooks, managed-ignore reconciliation, Git refs, or filesystem mutation",
    "local branch first and then `origin/<branch>`",
    "coordinated target branch",
    "creation point",
    "does not reset, rebase, rewrite, or ancestry-check",
    "`defaults.create.baseBranch`",
    "deprecated create-only compatibility input",
    "migrate it to root `baseBranch`",
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
    /shared precedence is repository CLI > invocation CLI > repository config > workspace config[\s\S]*configured create then considers deprecated `defaults\.create\.baseBranch` before legacy omitted behavior[\s\S]*clone skips that create-only key/i,
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
    "legacy-omitted",
  ];
  assert.throws(
    () => assert.deepEqual(createPrecedenceDrift, expectedContract, "repository-base semantic contract is stale"),
    /repository-base semantic contract is stale/,
    "contract checker accepted create precedence without defaults.create.baseBranch",
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
}

function validateDeliberateDrift(fixtureSkillRoot = sourceSkillRoot) {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "arashi-repository-base-guidance-"));
  try {
    for (const [name, relativePath, from, to, expected] of [
      [
        "precedence",
        join("references", "commands", "create.md"),
        "Configured create then considers deprecated `defaults.create.baseBranch` before legacy omitted behavior",
        "Configured create skips the deprecated key and proceeds directly to omitted behavior",
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
