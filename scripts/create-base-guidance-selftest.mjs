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
    join(root, "references", "commands.md"),
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
    "local branch first and then `origin/<branch>`",
    "every effective selected repository",
    "including repositories whose target will be reused",
    "`--only` and `--group`",
    "all resolution failures are aggregated",
    "before hooks or any workspace mutation",
    "captured commit OID",
    "`REUSE_EXISTING`",
    "base resolution remains required",
    "no mutation",
    "does not assert or check ancestry",
    "does not represent or claim that the reused target was derived from the requested base",
    "invocation-only",
    "does not load or persist `defaults.create.baseBranch`",
    "Human `--dry-run` output",
    "exactly one JSON document",
    "`CREATE_BASE_RESOLUTION_FAILED`",
    "normalized logical branch after removing at most one leading `origin/`",
    "`source` is exactly `cli` or `config`",
    "`targetAction` is exactly `created` or `reused`",
    "`repositoryPath` is canonical absolute",
    "effective selected-repository order",
    "complete selected set",
    "exactly `repositoryName`, `repositoryPath`, `resolvedRef`, `resolvedOid`, and `targetAction`",
    "error details contain exactly `requestedBranch`, `source`, and `repositories`",
    "only affected repositories from the selected set",
    "unaffected selected repositories are excluded",
    "`repositoryName`, `repositoryPath`, and `attemptedRefs`",
    "`refs/heads/<branch>` followed by `refs/remotes/origin/<branch>`",
    "`resolvedRef`",
    "`resolvedOid`",
    "`targetAction`",
    "`ARASHI_BRANCH_NAME` remains the target-branch hook context",
    "do not invent `ARASHI_BASE_BRANCH`",
    "pre-create target branches",
    'SELECTORS=(--group docs)',
    'arashi exec "${SELECTORS[@]}" -- git branch "$TARGET_BRANCH" "$BASE_BRANCH" || exit 1',
    'WORKSPACE_ROOT="$(git rev-parse --show-toplevel)"',
    'test -f "$WORKSPACE_ROOT/.arashi/config.json"',
    'git -C "$WORKSPACE_ROOT" branch "$TARGET_BRANCH" "$BASE_BRANCH" || exit 1',
    'arashi create "$TARGET_BRANCH" "${SELECTORS[@]}" --conflict REUSE_EXISTING',
    "same selectors on both commands",
    "Managed children, not the parent",
  ]) {
    assert.ok(
      guidance.includes(required),
      `${label}/references/commands.md create-base guidance is missing ${JSON.stringify(required)}`,
    );
  }

  assert.match(
    guidance,
    /CLI > configuration > legacy behavior[^\n]*--base[^\n]*defaults\.create\.baseBranch/,
    `${label}/references/commands.md does not bind precedence to CLI and config sources`,
  );
  assert.match(
    guidance,
    /every effective selected repository[^\n]*including repositories whose target will be reused[^\n]*local branch first and then `origin\/<branch>`[^\n]*all resolution failures are aggregated[^\n]*before hooks or any workspace mutation/,
    `${label}/references/commands.md does not bind selected-set resolution to aggregated pre-mutation failure`,
  );
  assert.match(
    guidance,
    /`--conflict REUSE_EXISTING`[^\n]*base resolution remains required[^\n]*no mutation[^\n]*does not assert or check ancestry[^\n]*does not represent or claim that the reused target was derived from the requested base/,
    `${label}/references/commands.md does not bind reuse to required base resolution, non-mutation, and ancestry non-assertion`,
  );
  assert.match(
    guidance,
    /Successful base data[^\n]*complete selected set[^\n]*exactly `repositoryName`, `repositoryPath`, `resolvedRef`, `resolvedOid`, and `targetAction`[^\n]*canonical absolute[^\n]*effective selected-repository order/,
    `${label}/references/commands.md does not bind the exact success repository shape`,
  );
  assert.match(
    guidance,
    /`CREATE_BASE_RESOLUTION_FAILED`[^\n]*exactly `requestedBranch`, `source`, and `repositories`[^\n]*only affected repositories from the selected set[^\n]*unaffected selected repositories are excluded[^\n]*exactly `repositoryName`, `repositoryPath`, and `attemptedRefs`[^\n]*canonical absolute[^\n]*effective selected-repository order[^\n]*`refs\/heads\/<branch>` followed by `refs\/remotes\/origin\/<branch>`/,
    `${label}/references/commands.md does not bind the exact failure repository shape`,
  );
  assert.doesNotMatch(
    guidance,
    /^A reused target (?:is|was|reported as|represented as|claimed as)[^\n]*derived from the requested base/im,
    `${label}/references/commands.md falsely derives a reused target from the requested base`,
  );
  assert.doesNotMatch(
    guidance,
    /(?:failure|resolution error)[^\n]*(?:every|all|complete)[^\n]*selected repositor/i,
    `${label}/references/commands.md includes unaffected selected repositories in failure output`,
  );
  assert.doesNotMatch(
    guidance,
    /^Success repositories use [^\n]*(?:relative|alphabetical|omit)[^\n]*$/im,
    `${label}/references/commands.md contradicts exact success fields, path, or ordering`,
  );
  assert.doesNotMatch(
    guidance,
    /^Failure repositories use [^\n]*(?:relative|alphabetical|reverse|resolvedOid)[^\n]*$/im,
    `${label}/references/commands.md contradicts exact failure fields, path, ordering, or attemptedRefs`,
  );
  assert.match(
    guidance,
    /implicit standalone[^\n]*invocation-only[^\n]*does not load or persist `defaults\.create\.baseBranch`/i,
    `${label}/references/commands.md does not bind standalone --base to CLI-only non-persistence`,
  );
  assert.match(
    guidance,
    /SELECTORS=\(--group docs\)[\s\S]*arashi exec "\$\{SELECTORS\[@\]\}" -- git branch "\$TARGET_BRANCH" "\$BASE_BRANCH"[\s\S]*WORKSPACE_ROOT="\$\(git rev-parse --show-toplevel\)"[\s\S]*test -f "\$WORKSPACE_ROOT\/\.arashi\/config\.json"[\s\S]*git -C "\$WORKSPACE_ROOT" branch "\$TARGET_BRANCH" "\$BASE_BRANCH"[\s\S]*arashi create "\$TARGET_BRANCH" "\$\{SELECTORS\[@\]\}" --conflict REUSE_EXISTING/,
    `${label}/references/commands.md does not bind parent branch creation to a verified workspace root while repeating identical selectors`,
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

function validateWorkflowWiring() {
  for (const relativePath of [
    ".github/workflows/security-audit.yml",
    ".github/workflows/release-security-gate.yml",
  ]) {
    const workflow = readFileSync(join(repositoryRoot, relativePath), "utf8");
    assert.match(
      workflow,
      /^\s*(?:run:\s*)?node scripts\/create-base-guidance-selftest\.mjs\s*$/m,
      `${relativePath} does not run the create-base source guidance check`,
    );
    assert.match(
      workflow,
      /^\s*node scripts\/create-base-guidance-selftest\.mjs --skill-root package-check\/skills\/arashi\s*$/m,
      `${relativePath} does not run the extracted-package create-base guidance check`,
    );
  }
}

function validateDeliberateDrift(fixtureSkillRoot = sourceSkillRoot) {
  const driftRoot = mkdtempSync(join(tmpdir(), "arashi-create-base-drift-"));
  try {
    const selectedSetRoot = join(driftRoot, "selected-set", "arashi");
    cpSync(fixtureSkillRoot, selectedSetRoot, { recursive: true });
    const selectedSetPath = join(selectedSetRoot, "references", "commands.md");
    const selectedSetGuidance = readFileSync(selectedSetPath, "utf8");
    writeFileSync(
      selectedSetPath,
      selectedSetGuidance.replace(
        "every effective selected repository",
        "only repositories receiving a newly created target",
      ),
    );
    assert.throws(
      () => validateSkill(selectedSetRoot, "selected-set-drift"),
      /every effective selected repository|selected-set resolution/,
      "checker accepted drift that skipped reused targets during preflight",
    );

    const standaloneRoot = join(driftRoot, "standalone", "arashi");
    cpSync(fixtureSkillRoot, standaloneRoot, { recursive: true });
    const standalonePath = join(standaloneRoot, "references", "commands.md");
    const standaloneGuidance = readFileSync(standalonePath, "utf8");
    writeFileSync(
      standalonePath,
      standaloneGuidance.replace(
        "does not load or persist `defaults.create.baseBranch`",
        "loads and persists `defaults.create.baseBranch`",
      ),
    );
    assert.throws(
      () => validateSkill(standaloneRoot, "standalone-drift"),
      /does not load or persist|CLI-only non-persistence/,
      "checker accepted drift that persisted standalone create-base configuration",
    );

    const contradictions = [
      {
        name: "reuse-derived",
        text: "A reused target is represented as derived from the requested base.",
        error: /falsely derives a reused target/,
      },
      {
        name: "failure-membership",
        text: "Resolution error output includes every selected repository, including unaffected repositories.",
        error: /includes unaffected selected repositories/,
      },
      {
        name: "success-shape",
        text: "Success repositories use only repositoryName, resolvedOid, and targetAction, a relative repositoryPath, and alphabetical order.",
        error: /contradicts exact success fields, path, or ordering/,
      },
      {
        name: "failure-shape",
        text: "Failure repositories use resolvedOid instead of attemptedRefs, a relative repositoryPath, reverse attempted-ref order, and alphabetical repository order.",
        error: /contradicts exact failure fields, path, ordering, or attemptedRefs/,
      },
    ];
    for (const contradiction of contradictions) {
      const contradictionRoot = join(driftRoot, contradiction.name, "arashi");
      cpSync(fixtureSkillRoot, contradictionRoot, { recursive: true });
      const contradictionPath = join(contradictionRoot, "references", "commands.md");
      const contradictionContent = readFileSync(contradictionPath, "utf8");
      const compatibilityHeading = "### Compatibility workaround for older Arashi releases";
      assert.ok(
        contradictionContent.includes(compatibilityHeading),
        `${contradiction.name} fixture section boundary is missing`,
      );
      writeFileSync(
        contradictionPath,
        contradictionContent.replace(
          compatibilityHeading,
          `${contradiction.text}\n\n${compatibilityHeading}`,
        ),
      );
      assert.throws(
        () => validateSkill(contradictionRoot, `${contradiction.name}-drift`),
        contradiction.error,
        `checker accepted ${contradiction.name} contradictory guidance`,
      );
    }


    const adversarialClaims = [
      {
        name: "reuse-derived-after-contrast",
        text: "Although a reused target receives no mutation, it is represented as derived from the requested base.",
        error: /falsely derives a reused target/,
      },
      {
        name: "reuse-derived-before-contrast",
        text: "It is represented as derived from the requested base; however, a reused target receives no mutation.",
        error: /falsely derives a reused target/,
      },
      {
        name: "success-alphabetical-after-contrast",
        text: "Although entries preserve selected-set order, successful base repositories are sorted alphabetically.",
        error: /sorts success repositories alphabetically/,
      },
      {
        name: "success-alphabetical-before-contrast",
        text: "Successful base repositories are sorted alphabetically; however, entries preserve selected-set order.",
        error: /sorts success repositories alphabetically/,
      },
      {
        name: "success-alphabetical-rather-than-selected",
        text: "Successful base repositories are sorted alphabetically rather than in selected-set order.",
        error: /sorts success repositories alphabetically/,
      },
      {
        name: "success-rather-than-selected-first",
        text: "Rather than preserving selected-set order, successful base repositories are sorted alphabetically.",
        error: /sorts success repositories alphabetically/,
      },
      {
        name: "failure-unaffected-after-contrast",
        text: "Although affected-only membership is documented, create-base resolution failure data also includes unaffected repositories.",
        error: /includes unaffected selected repositories/,
      },
      {
        name: "failure-unaffected-before-contrast",
        text: "Create-base resolution failure data includes unaffected repositories; however, affected-only membership is also documented.",
        error: /includes unaffected selected repositories/,
      },
      {
        name: "failure-unaffected-not-only-second",
        text: "Create-base resolution failure data includes not only affected repositories but also unaffected repositories.",
        error: /includes unaffected selected repositories/,
      },
      {
        name: "failure-unaffected-not-only-first",
        text: "Create-base resolution failure data includes unaffected repositories, not only affected repositories.",
        error: /includes unaffected selected repositories/,
      },
      {
        name: "standalone-persists-after-contrast",
        text: "Although standalone `--base` is invocation-only, standalone create persists `defaults.create.baseBranch`.",
        error: /persists or loads create-base configuration/,
      },
      {
        name: "standalone-persists-before-contrast",
        text: "Standalone create persists `defaults.create.baseBranch`; however, standalone `--base` is called invocation-only.",
        error: /persists or loads create-base configuration/,
      },
    ];
    const acceptedClaims = [];
    for (const claim of adversarialClaims) {
      const claimRoot = join(driftRoot, claim.name, "arashi");
      cpSync(fixtureSkillRoot, claimRoot, { recursive: true });
      const claimPath = join(claimRoot, "references", "tutorial.md");
      writeFileSync(
        claimPath,
        `${readFileSync(claimPath, "utf8")}\n\n## Create-base note\n\n${claim.text}\n`,
      );
      try {
        validateSkill(claimRoot, `${claim.name}-drift`);
        acceptedClaims.push(claim.name);
      } catch (error) {
        if (!claim.error.test(String(error?.message))) {
          acceptedClaims.push(`${claim.name} (wrong diagnostic: ${error?.message})`);
        }
      }
    }
    assert.deepEqual(
      acceptedClaims,
      [],
      `checker accepted package-wide create-base contradictions: ${acceptedClaims.join(", ")}`,
    );

    const legitimateClaimsRoot = join(driftRoot, "legitimate-claims", "arashi");
    cpSync(fixtureSkillRoot, legitimateClaimsRoot, { recursive: true });
    const legitimateClaimsPath = join(
      legitimateClaimsRoot,
      "references",
      "tutorial.md",
    );
    writeFileSync(
      legitimateClaimsPath,
      `${readFileSync(legitimateClaimsPath, "utf8")}\n\n## Create-base safeguards\n\nA reused target is not represented as derived from the requested base. Success repositories preserve selected-set order rather than alphabetical order. Create-base resolution failures do not include unaffected repositories, but do report all selected repository failures that were affected. Standalone create does not load or persist \`defaults.create.baseBranch\`.\n`,
    );
    assert.doesNotThrow(
      () => validateSkill(legitimateClaimsRoot, "legitimate-negated-claims"),
      "checker rejected legitimate negated create-base guidance",
    );

    const negatedEnvironmentRoot = join(driftRoot, "negated-environment", "arashi");
    cpSync(fixtureSkillRoot, negatedEnvironmentRoot, { recursive: true });
    const negatedEnvironmentPath = join(
      negatedEnvironmentRoot,
      "references",
      "tutorial.md",
    );
    writeFileSync(
      negatedEnvironmentPath,
      `${readFileSync(negatedEnvironmentPath, "utf8")}\nArashi does not provide ARASHI_BASE_BRANCH to create hooks.\nCreate hooks never export ARASHI_BASE_BRANCH.\nARASHI_BASE_BRANCH is not available to lifecycle hooks.\nDo not use ARASHI_BASE_BRANCH in create hooks.\nCompatibility guidance tells users not to invent ARASHI_BASE_BRANCH.\n`,
    );
    assert.doesNotThrow(
      () => validateSkill(negatedEnvironmentRoot, "negated-environment-guidance"),
      "checker rejected legitimate negated ARASHI_BASE_BRANCH guidance",
    );

    const affirmativeEnvironmentClaims = [
      "Export ARASHI_BASE_BRANCH=feature/base for create hooks.",
      "Arashi provides ARASHI_BASE_BRANCH to create hooks.",
      "Create hooks export ARASHI_BASE_BRANCH for the requested base.",
      "ARASHI_BASE_BRANCH is available to lifecycle hooks.",
      "Lifecycle hooks receive ARASHI_BASE_BRANCH for create.",
      "Use ARASHI_BASE_BRANCH in create hooks.",
    ];
    const acceptedEnvironmentClaims = [];
    for (const [index, claim] of affirmativeEnvironmentClaims.entries()) {
      const environmentRoot = join(driftRoot, `environment-${index}`, "arashi");
      cpSync(fixtureSkillRoot, environmentRoot, { recursive: true });
      const environmentPath = join(environmentRoot, "references", "tutorial.md");
      writeFileSync(
        environmentPath,
        `${readFileSync(environmentPath, "utf8")}\n${claim}\n`,
      );
      try {
        validateSkill(environmentRoot, `environment-${index}-drift`);
        acceptedEnvironmentClaims.push(claim);
      } catch (error) {
        if (!/unsupported ARASHI_BASE_BRANCH variable/.test(String(error?.message))) {
          acceptedEnvironmentClaims.push(`${claim} (wrong diagnostic: ${error?.message})`);
        }
      }
    }
    assert.deepEqual(
      acceptedEnvironmentClaims,
      [],
      `checker accepted affirmative ARASHI_BASE_BRANCH guidance: ${acceptedEnvironmentClaims.join(" | ")}`,
    );

    const installableFormatClaims = [
      {
        name: "environment-text",
        relativePath: join("references", "base-note.txt"),
        content: "Lifecycle hooks receive ARASHI_BASE_BRANCH for create.\n",
      },
      {
        name: "environment-json",
        relativePath: join("references", "base-note.json"),
        content: `${JSON.stringify({ note: "Lifecycle hooks receive ARASHI_BASE_BRANCH for create." }, null, 2)}\n`,
      },
    ];
    const acceptedInstallableFormatClaims = [];
    for (const fixture of installableFormatClaims) {
      const formatRoot = join(driftRoot, fixture.name, "arashi");
      cpSync(fixtureSkillRoot, formatRoot, { recursive: true });
      writeFileSync(join(formatRoot, fixture.relativePath), fixture.content);
      try {
        validateSkill(formatRoot, `${fixture.name}-drift`);
        acceptedInstallableFormatClaims.push(fixture.relativePath);
      } catch (error) {
        if (!/unsupported ARASHI_BASE_BRANCH variable/.test(String(error?.message))) {
          acceptedInstallableFormatClaims.push(
            `${fixture.relativePath} (wrong diagnostic: ${error?.message})`,
          );
        }
      }
    }
    assert.deepEqual(
      acceptedInstallableFormatClaims,
      [],
      `checker accepted affirmative ARASHI_BASE_BRANCH guidance in installable formats: ${acceptedInstallableFormatClaims.join(" | ")}`,
    );

    const environmentRoot = join(driftRoot, "environment", "arashi");
    cpSync(fixtureSkillRoot, environmentRoot, { recursive: true });
    const environmentPath = join(environmentRoot, "references", "commands.md");
    writeFileSync(
      environmentPath,
      `${readFileSync(environmentPath, "utf8")}\nExport ARASHI_BASE_BRANCH=feature/base for create hooks.\n`,
    );
    assert.throws(
      () => validateSkill(environmentRoot, "environment-drift"),
      /unsupported ARASHI_BASE_BRANCH variable/,
      "checker accepted guidance advertising ARASHI_BASE_BRANCH",
    );
  } finally {
    rmSync(driftRoot, { recursive: true, force: true });
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
  validateWorkflowWiring();
  validateDeliberateDrift();
  console.log(
    "create-base guidance self-test passed for source, contracts, workflows, and deliberate drift",
  );
}

main();
