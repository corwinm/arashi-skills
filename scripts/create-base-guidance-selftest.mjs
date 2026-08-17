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

const expectedCreateBasePolicy = {
  scope: {
    cli: "invocation-only",
    workspaceDefault: "defaults.create.baseBranch",
    workspaceDefaultScope: "generic-only",
    editorScopedDefault: "rejected",
  },
  precedence: ["cli", "defaults.create.baseBranch", "legacy-omitted"],
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
      sources: ["cli", "config"],
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
  schemaVersion: 7,
  command: "create",
  option: "--base",
  semanticPolicy: {
    ownership: "command",
    persisted: false,
    createBase: expectedCreateBasePolicy,
  },
  compatibilityWorkaround: "precreate-targets-and-reuse-existing",
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
    "`defaults.create.baseBranch`",
    '"baseBranch": "feature/FEAT-1234"',
    "workspace-generic",
    "not editor-scoped or per-repository",
    "arashi create <target> --base <branch>",
    "CLI > configuration > legacy behavior",
    "every effective selected repository",
    "including repositories whose target will be reused",
    "local branch first and then `origin/<branch>`",
    "all resolution failures are aggregated before hooks or any workspace mutation",
    "`--conflict REUSE_EXISTING`",
    "does not assert or check ancestry",
    "does not represent or claim that the reused target was derived from the requested base",
    "implicit standalone mode",
    "invocation-only",
    "does not load or persist `defaults.create.baseBranch`",
    "`CREATE_BASE_RESOLUTION_FAILED`",
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
    /`--conflict REUSE_EXISTING`[^\n]*base resolution remains required[^\n]*no mutation[^\n]*does not assert or check ancestry/,
    `${label}/references/commands/create.md must preserve reuse without target mutation or ancestry claims`,
  );
  assert.doesNotMatch(
    guidance,
    /Each repository entry has exactly|error details contain exactly|Each failure entry has exactly/,
    `${label}/references/commands/create.md still exposes internal result-schema detail`,
  );
  assert.doesNotMatch(
    guidance,
    /Compatibility workaround for older Arashi releases|SELECTORS=\(--group docs\)/,
    `${label}/references/commands/create.md still carries the retired branch-precreation workaround`,
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
  assert.deepEqual(contract, expectedContract, "create-base semantic contract is stale");

  const errorFieldsDrift = structuredClone(contract);
  errorFieldsDrift.semanticPolicy.createBase.output.json.failure.fields = [
    "requestedBranch",
    "source",
    "failures",
  ];
  assert.throws(
    () =>
      assert.deepEqual(
        errorFieldsDrift,
        expectedContract,
        "create-base semantic contract is stale",
      ),
    /create-base semantic contract is stale/,
    "contract checker accepted drift from the exact JSON error field vocabulary",
  );

  const flattenedDrift = {
    schemaVersion: contract.schemaVersion,
    ...contract.semanticPolicy.createBase,
  };
  assert.throws(
    () => assert.deepEqual(flattenedDrift, expectedContract, "create-base semantic contract is stale"),
    /create-base semantic contract is stale/,
    "contract checker accepted the stale flattened create-base policy",
  );

  const coverage = JSON.parse(
    readFileSync(
      join(repositoryRoot, "contracts", "command-coverage.json"),
      "utf8",
    ),
  );
  const create = coverage.commands.find(({ name }) => name === "create");
  assert.ok(create, "command coverage is missing create");
  assert.ok(
    create.requiredOptions?.includes("--base"),
    "create command coverage is missing --base",
  );
}


function validateDeliberateDrift(fixtureSkillRoot = sourceSkillRoot) {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "arashi-create-base-guidance-"));
  try {
    for (const [name, from, to, expected] of [
      [
        "selected-set",
        "every effective selected repository",
        "only repositories receiving a newly created target",
        /selected repository|missing/i,
      ],
      [
        "standalone-persistence",
        "does not load or persist `defaults.create.baseBranch`",
        "loads and persists `defaults.create.baseBranch`",
        /standalone|missing/i,
      ],
      [
        "reuse-ancestry",
        "does not assert or check ancestry",
        "asserts and rewrites ancestry",
        /reuse|ancestry|missing/i,
      ],
    ]) {
      const root = join(temporaryRoot, name);
      cpSync(fixtureSkillRoot, root, { recursive: true });
      const path = join(root, "references", "commands", "create.md");
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
