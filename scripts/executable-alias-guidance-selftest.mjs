#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceSkillRoot = join(repositoryRoot, "skills", "arashi");
const skillRootArgumentIndex = process.argv.indexOf("--skill-root");
const suppliedSkillRoot =
  skillRootArgumentIndex >= 0 ? process.argv[skillRootArgumentIndex + 1] : undefined;
if (skillRootArgumentIndex >= 0 && !suppliedSkillRoot) {
  throw new Error("--skill-root requires a path");
}

const aliasGuidance = [
  "`aw` is the supported **Arashi Workspace** executable shorthand",
  "Supported npm and direct installations provide equivalent `arashi` and `aw` executable names",
  "`arashi` remains the canonical product and command vocabulary",
  "not a Commander command alias or a second command vocabulary",
  "Keep workflow examples and command discovery canonical: use `arashi --version`, `arashi --help`, and `arashi <command> --help`",
  "installation-channel details about collision handling, shell integration, completion, updates, and manual installation",
];

const actionableAwCommandPatterns = [
  /`aw\s+[^`\s]+(?:\s+[^`]*)?`/im,
  /`aw`\s+-{1,2}\S+/im,
  /\b(?:run|execute|invoke|use|try)\s+`aw`(?=[\s.,;:!?]|$)/im,
  /^\s*aw\s*$/im,
  /^\s*aw\s*(?=&&|\|\||[|;<>])/im,
  /(?<![`\w])aw\s+(?:-{1,2}\S+|[A-Za-z0-9][\w:-]*)/im,
];

function normalizeProse(content) {
  return content.replace(/[`*_]/g, "").replace(/\s+/g, " ");
}

function definesExecutableAlias(content) {
  const prose = normalizeProse(content);
  return [
    /\baw\b[^.!?]{0,80}\b(?:is|remains|serves as)\b[^.!?]{0,50}\b(?:(?:a|an|another|the)\s+)?(?:supported\s+)?(?:executable\s+)?(?:shorthand|entrypoint|alias|name)\b/i,
    /\baw\b[^.!?]{0,100}\b(?:supported|available|provided|equivalent)\b[^.!?]{0,100}\b(?:executable|entrypoint|shorthand|alias|name)\b/i,
    /\b(?:supported|available|provided|equivalent)\b[^.!?]{0,100}\baw\b[^.!?]{0,100}\b(?:executable|entrypoint|shorthand|alias|name)\b/i,
    /\b(?:ships?|provides?|offers?|has)\b[^.!?]{0,80}\b(?:executable|entrypoint|alias)\s+names?\b[^.!?]{0,80}\baw\b/i,
  ].some((pattern) => pattern.test(prose));
}

function claimsCommanderAssociation(content) {
  const approvedNegation = /\bnot\s+(?:a\s+|an\s+)?Commander command alias\b/i;
  const contextualReference = /\b(?:it|this|that|the shorthand|the alias)\b/i;
  return content.split(/\n\s*\n/).some((rawParagraph) => {
    const paragraph = normalizeProse(rawParagraph);
    const statements = paragraph.split(
      /(?:(?<=[.!?;])\s+|\s*,?\s+(?:but|however|yet|although|though)\s+)/i,
    );
    let awContext = false;
    return statements.some((statement) => {
      const mentionsAw = /\baw\b/i.test(statement);
      const refersToAw = mentionsAw || (awContext && contextualReference.test(statement));
      if (mentionsAw) awContext = true;
      return refersToAw && /\bCommander\b/i.test(statement) && !approvedNegation.test(statement);
    });
  });
}

function containsActionableAwInvocation(content) {
  const logicalCommands = content
    .replace(/\\\r?\n\s*/g, " ")
    .replace(/(["'])aw\1/g, "aw");
  return actionableAwCommandPatterns.some((pattern) => pattern.test(logicalCommands));
}

function walkMarkdown(root, directory = root) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) return walkMarkdown(root, absolutePath);
    return entry.name.endsWith(".md") ? [absolutePath] : [];
  });
}

function validateSkill(root, label) {
  const manifestPath = join(root, "SKILL.md");
  const tutorialPath = join(root, "references", "commands", "setup.md");
  const manifest = readFileSync(manifestPath, "utf8");
  const tutorial = readFileSync(tutorialPath, "utf8");

  for (const expected of [
    "verify_arashi: arashi --version",
    "discover_commands: arashi --help",
    "Use installed `arashi --help` and `arashi <command> --help` as parameter authority",
  ]) {
    assert.ok(manifest.includes(expected), `${label}/SKILL.md is missing canonical discovery command ${JSON.stringify(expected)}`);
  }

  for (const expected of aliasGuidance) {
    assert.ok(
      tutorial.includes(expected),
      `${label}/references/commands/setup.md is missing executable-alias guidance ${JSON.stringify(expected)}`,
    );
  }
  const tutorialDefinitionParagraphs = tutorial
    .split(/\n\s*\n/)
    .filter((paragraph) => definesExecutableAlias(paragraph));
  assert.equal(
    tutorialDefinitionParagraphs.length,
    1,
    `${label}/references/commands/setup.md must contain exactly one executable-alias identity and availability definition`,
  );

  assert.doesNotMatch(
    manifest,
    /\baw\b/,
    `${label}/SKILL.md must remain a minimal canonical routing surface without executable-alias guidance`,
  );

  for (const path of walkMarkdown(root)) {
    const content = readFileSync(path, "utf8");
    const relativePath = path.slice(root.length + 1);
    for (const [pattern, description] of [
      [/\baw\b[^\n]{0,40}\b(?:is|becomes) (?:a|the) (?:separate|second|alternative) (?:product|command vocabulary)/i, "separate product or command vocabulary"],
      [/\baw\b[^\n]{0,40}\b(?:provides|uses) (?:a|the) (?:separate|second) command vocabulary/i, "separate command vocabulary"],
      [/(?:prefer|replace[^\n]*with) `?aw`?/i, "preferred replacement"],
    ]) {
      assert.doesNotMatch(
        content,
        pattern,
        `${label}/${relativePath} incorrectly presents aw as a ${description}`,
      );
    }
    assert.equal(
      claimsCommanderAssociation(content),
      false,
      `${label}/${relativePath} incorrectly claims an affirmative Commander association for aw`,
    );
    if (path !== tutorialPath) {
      assert.equal(
        definesExecutableAlias(content),
        false,
        `${label}/${relativePath} contains an executable-alias definition that must be owned only by references/commands/setup.md`,
      );
    }
    assert.equal(
      containsActionableAwInvocation(content),
      false,
      `${label}/${relativePath} duplicates workflows with aw command spellings`,
    );
  }
}

function validateDeliberateDrift() {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "arashi-executable-alias-guidance-"));
  const acceptedDrifts = [];
  const requireRejection = (validate, diagnostic, description) => {
    try {
      validate();
      acceptedDrifts.push(description);
    } catch (error) {
      assert.match(error.message, diagnostic, `wrong diagnostic for ${description}`);
    }
  };
  try {
    const fixtureRoots = [
      ["source-drift", join(fixtureRoot, "source", "arashi")],
      ["extracted-package-drift", join(fixtureRoot, "extracted", "skills", "arashi")],
    ];

    for (const [fixtureLabel, fixtureSkillRoot] of fixtureRoots) {
      cpSync(sourceSkillRoot, fixtureSkillRoot, { recursive: true });
      const tutorialPath = join(fixtureSkillRoot, "references", "commands", "setup.md");
      const originalTutorial = readFileSync(tutorialPath, "utf8");
      const aliasDefinitionParagraph = originalTutorial
        .split(/\n\s*\n/)
        .find((paragraph) => aliasGuidance.every((expected) => paragraph.includes(expected)));
      assert.ok(aliasDefinitionParagraph, "fixture could not locate the owning alias-definition paragraph");

      writeFileSync(
        tutorialPath,
        `${originalTutorial}\n\`aw\` is a separate product with an alternative command vocabulary.\n`,
      );
      requireRejection(
        () => validateSkill(fixtureSkillRoot, `${fixtureLabel}-identity`),
        /separate product or command vocabulary/,
        `incorrect separate-product claim in ${fixtureLabel}`,
      );

      writeFileSync(tutorialPath, originalTutorial);
      const manifestPath = join(fixtureSkillRoot, "SKILL.md");
      const originalManifest = readFileSync(manifestPath, "utf8");
      writeFileSync(
        manifestPath,
        originalManifest.replace(
          "discover_commands: arashi --help",
          "discover_commands: aw --help",
        ),
      );
      requireRejection(
        () => validateSkill(fixtureSkillRoot, `${fixtureLabel}-discovery`),
        /canonical discovery command|minimal canonical routing surface/,
        `non-canonical entry-command discovery in ${fixtureLabel}`,
      );

      writeFileSync(manifestPath, originalManifest);
      const workflowsPath = join(fixtureSkillRoot, "references", "workflows.md");
      const originalWorkflows = readFileSync(workflowsPath, "utf8");
      writeFileSync(
        workflowsPath,
        `${originalWorkflows}\nRun aw status for the shorthand workflow.\n`,
      );
      requireRejection(
        () => validateSkill(fixtureSkillRoot, `${fixtureLabel}-vocabulary`),
        /duplicates workflows with aw command spellings/,
        `duplicate aw workflow vocabulary in ${fixtureLabel}`,
      );

      writeFileSync(workflowsPath, originalWorkflows);
      writeFileSync(
        workflowsPath,
        `${originalWorkflows}\n${aliasDefinitionParagraph}\n`,
      );
      requireRejection(
        () => validateSkill(fixtureSkillRoot, `${fixtureLabel}-duplicate-definition`),
        /executable-alias definition.*owned only by references\/commands\/setup\.md/,
        `duplicate executable-alias definition guidance in ${fixtureLabel}`,
      );

      writeFileSync(
        workflowsPath,
        `${originalWorkflows}\n\`aw\` is another executable name for Arashi.\n`,
      );
      requireRejection(
        () => validateSkill(fixtureSkillRoot, `${fixtureLabel}-duplicate-executable-name-definition`),
        /executable-alias definition.*owned only by references\/commands\/setup\.md/,
        `duplicate executable-name definition guidance in ${fixtureLabel}`,
      );

      writeFileSync(
        workflowsPath,
        `${originalWorkflows}\nArashi ships with executable names \`arashi\` and \`aw\`.\n`,
      );
      requireRejection(
        () => validateSkill(fixtureSkillRoot, `${fixtureLabel}-plural-executable-names-definition`),
        /executable-alias definition.*owned only by references\/commands\/setup\.md/,
        `plural executable-names definition guidance in ${fixtureLabel}`,
      );

      writeFileSync(workflowsPath, originalWorkflows);
      writeFileSync(
        tutorialPath,
        `${originalTutorial}\nRun \`aw status\` to inspect the shorthand workflow.\n`,
      );
      requireRejection(
        () => validateSkill(fixtureSkillRoot, `${fixtureLabel}-tutorial-workflow`),
        /duplicates workflows with aw command spellings/,
        `actionable aw workflow in the owning tutorial for ${fixtureLabel}`,
      );

      writeFileSync(tutorialPath, originalTutorial);
      writeFileSync(
        workflowsPath,
        `${originalWorkflows}\nThe \`aw\` executable alias is registered by Commander.\n`,
      );
      requireRejection(
        () => validateSkill(fixtureSkillRoot, `${fixtureLabel}-commander-registration`),
        /Commander association/,
        `semantic Commander registration claim in ${fixtureLabel}`,
      );

      writeFileSync(
        workflowsPath,
        `${originalWorkflows}\nCommander defines \`aw\` as an executable alias.\n`,
      );
      requireRejection(
        () => validateSkill(fixtureSkillRoot, `${fixtureLabel}-commander-definition`),
        /Commander association/,
        `semantic Commander definition claim in ${fixtureLabel}`,
      );

      for (const [claim, driftName] of [
        ["The Commander parser exposes `aw` as an executable alias.", "commander-parser-exposes"],
        ["The Commander parser recognizes `aw` as the executable shorthand.", "commander-parser-recognizes"],
        ["Commander routes `aw` to the canonical executable.", "commander-routes"],
        ["The Commander parser exposes\n`aw` as an executable alias.", "commander-wrapped-sentence"],
      ]) {
        writeFileSync(workflowsPath, `${originalWorkflows}\n${claim}\n`);
        requireRejection(
          () => validateSkill(fixtureSkillRoot, `${fixtureLabel}-${driftName}`),
          /Commander association/,
          `${driftName} claim in ${fixtureLabel}`,
        );
      }

      writeFileSync(workflowsPath, originalWorkflows);
      for (const [invocation, driftName] of [
        ["Run `aw -h` to discover the shorthand command workflow.", "tutorial-aw-short-help"],
        ["Run aw -V to inspect the shorthand version.", "tutorial-aw-short-version"],
        ["Run `aw`.", "tutorial-aw-bare-inline"],
        ["Run:\n```bash\naw\n```", "tutorial-aw-bare-fence"],
        ["Run:\n```bash\naw && echo done\n```", "tutorial-aw-shell-list"],
        ["Run:\n```bash\naw | cat\n```", "tutorial-aw-pipeline"],
        ["Run:\n```bash\naw > output.txt\n```", "tutorial-aw-redirection"],
        ["Run:\n```bash\naw; echo done\n```", "tutorial-aw-semicolon-list"],
        ["Run:\n```bash\n\"aw\" status\n'aw' --help\n```", "tutorial-aw-quoted-command"],
        ["Run:\n```bash\naw \\\n  status\n```", "tutorial-aw-line-continuation"],
      ]) {
        writeFileSync(tutorialPath, `${originalTutorial}\n${invocation}\n`);
        requireRejection(
          () => validateSkill(fixtureSkillRoot, `${fixtureLabel}-${driftName}`),
          /duplicates workflows with aw command spellings/,
          `${driftName} invocation in ${fixtureLabel}`,
        );
      }

      writeFileSync(workflowsPath, originalWorkflows);
      writeFileSync(
        tutorialPath,
        originalTutorial.replace(
          "not a Commander command alias or a second command vocabulary",
          "not a Commander command alias or a second command vocabulary; Commander nevertheless registers it there",
        ),
      );
      requireRejection(
        () => validateSkill(fixtureSkillRoot, `${fixtureLabel}-commander-pronoun-contradiction`),
        /Commander association/,
        `Commander pronoun contradiction in ${fixtureLabel}`,
      );

      writeFileSync(
        tutorialPath,
        originalTutorial.replace(
          "not a Commander command alias or a second command vocabulary",
          "not a Commander command alias or a second command vocabulary, although Commander registers aw there",
        ),
      );
      requireRejection(
        () => validateSkill(fixtureSkillRoot, `${fixtureLabel}-commander-concessive-contradiction`),
        /Commander association/,
        `Commander concessive contradiction in ${fixtureLabel}`,
      );

      writeFileSync(workflowsPath, originalWorkflows);
      writeFileSync(
        tutorialPath,
        `${originalTutorial}\nThe standalone \`aw\` identity remains distribution-level prose.\n`,
      );
      validateSkill(fixtureSkillRoot, `${fixtureLabel}-standalone-identity`);
    }
    assert.deepEqual(
      acceptedDrifts,
      [],
      `checker accepted deliberate drift:\n- ${acceptedDrifts.join("\n- ")}`,
    );
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

function main() {
  if (suppliedSkillRoot) {
    validateSkill(resolve(suppliedSkillRoot), "package");
    console.log("Executable-alias guidance self-test passed for packaged skill");
    return;
  }

  validateSkill(sourceSkillRoot, "source");
  validateDeliberateDrift();
  console.log("Executable-alias guidance self-test passed for source and deliberate drift");
}

main();
