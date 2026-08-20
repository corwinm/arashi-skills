#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
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
const contract = JSON.parse(
  readFileSync(
    join(repositoryRoot, "contracts", "add-onboarding-guidance.json"),
    "utf8",
  ),
);
const skillRootIndex = process.argv.indexOf("--skill-root");
const suppliedSkillRoot =
  skillRootIndex >= 0 ? process.argv[skillRootIndex + 1] : undefined;
if (skillRootIndex >= 0 && !suppliedSkillRoot)
  throw new Error("--skill-root requires a path");
const isControlledFixtureChild =
  process.env.ARASHI_ONBOARDING_CONTROLLED_FIXTURE === "1";
const checkerPath = fileURLToPath(import.meta.url);
const hookBodyCanary = 'ARASHI_ONBOARDING_HOOK_BODY_CANARY:$HOME\n"quoted"';

const contradictionFixtures = [
  {
    id: "workspace-hooks-exception",
    diagnostic: "contradictory workspace-hook onboarding scope",
    claim:
      "However, onboarding may also configure workspace hooks when they are requested.",
  },
  {
    id: "overwrite-exception",
    diagnostic: "contradictory existing-path overwrite exception",
    claim: "Existing hook paths may be overwritten when `--force` is active.",
  },
  {
    id: "second-confirmation",
    diagnostic: "contradictory additional final confirmation",
    claim:
      "Add then requests a second final confirmation before applying the result.",
  },
  {
    id: "second-config-save",
    diagnostic: "contradictory additional configuration save",
    claim:
      "Add saves the configuration a second time after scripts are installed.",
  },
  {
    id: "native-helper",
    diagnostic: "contradictory native-helper installation claim",
    claim: "Installation uses a native helper to close the race completely.",
  },
  {
    id: "absolute-race-freedom",
    diagnostic: "contradictory absolute race-freedom claim",
    claim:
      "Installation is completely race-free against local ancestor substitution.",
  },
  {
    id: "mixed-polarity-workspace-hooks-exception",
    diagnostic: "contradictory workspace-hook onboarding scope",
    claim:
      "Onboarding does not configure workspace hooks by default, but may configure them when requested.",
  },
  {
    id: "mixed-polarity-overwrite-force-exception",
    diagnostic: "contradictory existing-path overwrite exception",
    claim:
      "Existing hook paths are not overwritten by default, but are overwritten when `--force` is active.",
  },
  {
    id: "mixed-polarity-second-confirmation",
    diagnostic: "contradictory additional final confirmation",
    claim:
      "Add does not request a second final confirmation normally, but requests one for hook scripts.",
  },
  {
    id: "mixed-polarity-second-config-save",
    diagnostic: "contradictory additional configuration save",
    claim:
      "Add does not save the configuration a second time normally, but saves it again after scripts are installed.",
  },
  {
    id: "mixed-polarity-native-helper-contention",
    diagnostic: "contradictory native-helper installation claim",
    claim:
      "Installation does not use a native helper normally, but uses one under contention.",
  },
  {
    id: "mixed-polarity-absolute-race-freedom-parent-exists",
    diagnostic: "contradictory absolute race-freedom claim",
    claim:
      "Publication does not guarantee absolute race freedom generally, but guarantees it when the parent exists.",
  },
];

const truthfulNegationFixtures = [
  "Onboarding does not configure workspace hooks.",
  "Existing hook paths may not be overwritten.",
  "Add does not request a second final confirmation.",
  "Add does not save the configuration a second time.",
  "Installation does not use or require a native helper.",
  "Installation cannot guarantee absolute race freedom against a hostile local process.",
];

const validGuidance = `# Workspace and repositories

## Optional Repository Onboarding During Add

Run \`aw add <remote>\`. Optional onboarding is eligible only when stdin and stdout are TTYs and neither \`--json\` nor \`--force\` is active. The first onboarding prompt defaults to no and a decline continues with the minimal repository entry. Non-TTY, \`--json\`, and \`--force\` invocations stay on that minimal path without discovery or onboarding prompts. Onboarding configures only the repository being added, never workspace hooks or unsupported fields.

Every optional section starts unselected: \`copy\`, \`symlink\`, \`pre-create\`, \`post-create\`, \`pre-remove\`, and \`post-remove\`. Copy and symlink discovery is a bounded, root-only metadata scan whose suggestions remain unselected path names; never read, inspect, or disclose their contents. Manual entries remain available, pass canonical path validation, and receive the dependency-sharing warning when applicable. Follow [Repository Worktree File Materialization](create.md#repository-worktree-file-materialization) for copy-versus-symlink behavior and safety.

For hooks, choose exactly one source per selected lifecycle: a user-supplied inline command or an editable active native script. Inline commands are always user supplied in Bash shorthand or canonical \`bash\`, \`powershell\`, and \`cmd\` interpreter shapes. Follow the [Lifecycle Hooks reference](../hooks.md) for canonical repository ownership and runtime behavior.

A create script is installed under the active configuration root at \`.arashi/hooks/<pre|post-create>.<repo><ext>\`. A remove script path is beneath the runtime-resolved target repository from that same active root plus \`repos.<name>.path\`, at \`.arashi/hooks/<pre|post-remove><ext>\`; in linked-parent mode this is the linked active child worktree, not the canonical clone. POSIX creates only \`.sh\` at mode \`0755\`, while Windows deterministically creates one \`.ps1\`. Generated scripts are safe, silent successful no-op scaffolds, not \`.example\` files, and need no rename, \`chmod\`, or activation step. They are immediately runtime-ready and never overwrite an existing path.

Installation privately prepares each complete scaffold, then uses atomic no-replace publication at the active path. It rejects observable symlink traversal and unsafe parents, and validates parent identities before and after publication. This is the strongest practical pure Node/Bun safety, not absolute race freedom: a hostile local process with workspace write access can still substitute an ancestor between validation and publication.

Treat hook source as sensitive: never print, repeat, preview, diagnose, or report inline or generated-script bodies. Add shows one sanitized final summary and confirmation, then performs at most one configuration save. Its transaction owns script installation, and rollback removes only unchanged scripts created by that invocation. The initial default-no decline continues minimal add, but final-confirmation decline or Ctrl+C after opting in is cancellation and performs no config save.

Do not misuse \`aw add\` to edit an existing entry. Until the interactive editor tracked by #316 ships, directly edit and validate \`.arashi/config.json\` using the installed schema and the focused materialization and hook references above.
`;

function section(content) {
  const marker = "## Optional Repository Onboarding During Add";
  const start = content.indexOf(marker);
  if (start < 0) return undefined;
  const end = content.indexOf("\n## ", start + marker.length);
  return content.slice(start, end < 0 ? content.length : end);
}

function installableText(root) {
  const values = [];
  const visit = (directory) => {
    for (const name of readdirSync(directory).sort()) {
      const path = join(directory, name);
      const stat = statSync(path);
      if (stat.isDirectory()) visit(path);
      else if (/\.(?:md|txt|json)$/i.test(name))
        values.push({ path, content: readFileSync(path, "utf8") });
    }
  };
  visit(root);
  return values;
}

function validateSkill(root, label) {
  const defects = [];
  const focusedPath = join(root, contract.focusedReference);
  let content;
  try {
    content = readFileSync(focusedPath, "utf8");
  } catch (error) {
    return [
      `${label}/${contract.focusedReference} could not be read (${error.code ?? error.message})`,
    ];
  }
  const guidance = section(content);
  if (!guidance) {
    defects.push(
      `${label}/${contract.focusedReference} is missing Optional Repository Onboarding During Add`,
    );
    return defects;
  }

  for (const link of contract.requiredLinks) {
    if (!guidance.includes(`](${link})`))
      defects.push(
        `${label}/${contract.focusedReference} must link to ${link}`,
      );
  }
  for (const requirement of contract.requirements) {
    if (!new RegExp(requirement.pattern, "i").test(guidance)) {
      defects.push(
        `${label}/${contract.focusedReference} is missing ${requirement.diagnostic}`,
      );
    }
  }
  for (const contradiction of contract.contradictionPatterns) {
    if (new RegExp(contradiction.pattern, "i").test(guidance)) {
      defects.push(
        `${label}/${contract.focusedReference} contains ${contradiction.diagnostic}`,
      );
    }
  }
  for (const forbidden of contract.forbiddenPatterns) {
    if (new RegExp(forbidden.pattern, "i").test(guidance)) {
      defects.push(
        `${label}/${contract.focusedReference} contains ${forbidden.diagnostic}`,
      );
    }
  }

  for (const { path, content: installedContent } of installableText(root)) {
    if (/ARASHI_ONBOARDING_HOOK_BODY_CANARY/.test(installedContent)) {
      defects.push(
        `${label}/${relative(root, path)} contains protected hook-body content`,
      );
    }
  }
  return defects;
}

function writeFixture(root, guidance = validGuidance) {
  mkdirSync(join(root, "references", "commands"), { recursive: true });
  writeFileSync(join(root, "SKILL.md"), "# Fixture router\n");
  writeFileSync(join(root, "references", "commands", "workspace.md"), guidance);
  writeFileSync(
    join(root, "references", "commands", "create.md"),
    "# Create\n\n## Repository Worktree File Materialization\n",
  );
  writeFileSync(join(root, "references", "hooks.md"), "# Hooks\n");
}

function secrecyDerivatives(secret) {
  const bytes = Buffer.from(secret, "utf8");
  return [
    ["raw", secret],
    ["truncated-prefix", secret.slice(0, 24)],
    ["truncated-suffix", secret.slice(-16)],
    ["base64", bytes.toString("base64")],
    ["base64url", bytes.toString("base64url")],
    ["hex", bytes.toString("hex")],
    ["escaped", JSON.stringify(secret).slice(1, -1)],
    ["sha256", createHash("sha256").update(bytes).digest("hex")],
    ["length-derived", `hook-body-length=${bytes.length}`],
  ];
}

function validateCheckerSecrecyFixture(root, mode) {
  writeFixture(root);
  writeFileSync(join(root, "references", "hooks.md"), `${hookBodyCanary}\n`);
  const result = spawnSync(
    process.execPath,
    [checkerPath, "--skill-root", root],
    {
      cwd: repositoryRoot,
      encoding: "utf8",
      env: { ...process.env, ARASHI_ONBOARDING_CONTROLLED_FIXTURE: "1" },
    },
  );
  const combinedOutput = `${result.stdout}${result.stderr}`;
  assert.notEqual(
    result.status,
    0,
    `${mode} checker must reject protected hook-body content`,
  );
  const exposed = secrecyDerivatives(hookBodyCanary)
    .filter(([, derivative]) => combinedOutput.includes(derivative))
    .map(([label]) => label);
  const defects = [];
  if (
    !/references\/hooks\.md.*protected hook-body content/i.test(combinedOutput)
  ) {
    defects.push("missing sanitized file/invariant diagnostic");
  }
  if (exposed.length > 0)
    defects.push(`exposed derivatives: ${exposed.join(", ")}`);
  if (defects.length > 0) {
    throw new Error(
      `${mode} checker secrecy fixture failed: ${defects.join("; ")}`,
    );
  }
}

function validateControlledFixtures() {
  const roots = [];
  const missedContradictions = [];
  try {
    for (const mode of ["authored-source", "extracted-package"]) {
      const fixture = mkdtempSync(
        join(tmpdir(), `arashi-add-onboarding-${mode}-`),
      );
      roots.push(fixture);
      const root =
        mode === "authored-source"
          ? fixture
          : join(fixture, "skills", "arashi");
      writeFixture(root);
      assert.deepEqual(validateSkill(root, `${mode}-control`), []);
      validateCheckerSecrecyFixture(root, mode);

      for (const requirement of contract.requirements) {
        const pattern = new RegExp(requirement.pattern, "i");
        const match = validGuidance.match(pattern);
        assert.ok(
          match,
          `controlled fixture does not exercise ${requirement.id}`,
        );
        const drifted = validGuidance.replace(
          pattern,
          `[drifted ${requirement.id}]`,
        );
        writeFixture(root, drifted);
        assert.ok(
          validateSkill(root, `${mode}-${requirement.id}`).some((defect) =>
            defect.includes(requirement.diagnostic),
          ),
          `${mode} checker accepted drift for ${requirement.id}`,
        );
      }

      for (const contradiction of contradictionFixtures) {
        writeFixture(root, `${validGuidance}\n${contradiction.claim}\n`);
        if (
          !validateSkill(root, `${mode}-${contradiction.id}`).some((defect) =>
            defect.includes(contradiction.diagnostic),
          )
        ) {
          missedContradictions.push(
            `${mode}/${contradiction.id}: ${contradiction.claim}`,
          );
        }
      }

      for (const negation of truthfulNegationFixtures) {
        writeFixture(root, `${validGuidance}\n${negation}\n`);
        assert.deepEqual(
          validateSkill(root, `${mode}-truthful-negation`),
          [],
          `${mode} checker rejected truthful negation: ${negation}`,
        );
      }

      for (const forbidden of contract.forbiddenPatterns) {
        writeFixture(
          root,
          `${validGuidance}\n${forbidden.pattern.includes("arashi add") ? "Run arashi add for onboarding." : forbidden.pattern.includes("selected") ? "Suggestions are automatically selected." : "Print the hook body in the final report."}\n`,
        );
        assert.ok(
          validateSkill(root, `${mode}-forbidden`).some((defect) =>
            defect.includes(forbidden.diagnostic),
          ),
          `${mode} checker accepted ${forbidden.diagnostic}`,
        );
      }
    }
    assert.deepEqual(
      missedContradictions,
      [],
      `checker accepted deliberate contradictions:\n${missedContradictions.join("\n")}`,
    );
  } finally {
    for (const root of roots) rmSync(root, { recursive: true, force: true });
  }
}

function main() {
  const root = suppliedSkillRoot ? resolve(suppliedSkillRoot) : sourceSkillRoot;
  const label = suppliedSkillRoot ? "package" : "source";
  const defects = validateSkill(root, label);
  assert.deepEqual(defects, [], defects.join("\n"));
  if (!isControlledFixtureChild) validateControlledFixtures();
  console.log(
    `add-onboarding guidance self-test passed for ${label} and controlled authored/package fixtures`,
  );
}

main();
