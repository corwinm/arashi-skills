#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  cpSync,
  mkdtempSync,
  readFileSync,
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
  skillRootArgumentIndex >= 0
    ? process.argv[skillRootArgumentIndex + 1]
    : undefined;
if (skillRootArgumentIndex >= 0 && !suppliedSkillRoot) {
  throw new Error("--skill-root requires a path");
}

const requirements = new Map([
  [
    "references/commands.md",
    [
      "new window or independent managed session",
      "`--tab` is a one-shot CLI-only launch disposition",
      "never persisted in `.arashi/config.json`",
      "arashi switch --tab feature-auth",
      "arashi switch --tab --vscode feature-auth",
      "arashi switch --tab --herdr feature-auth",
      "`switch --tab` expresses explicit launch intent",
      "overrides configured or contextual parent-shell `cd`",
      "bypasses configured launcher defaults",
      "automatic launcher resolution without another override",
      "conflicts only with explicit `--cd`",
      "composes with canonical `--launch`, `--ignore-configured-launcher`, and launcher selectors",
      "`switch --tab --json` returns `JSON_UNSUPPORTED_FOR_MODE`",
      "`details.mode: \"launch\"`",
      "exits `2`",
      '"command": "switch"',
      "exactly one JSON document on stdout and keeps stderr silent",
      "Commander action boundary and the exported executor",
      "before option or context validation and before workspace, configuration, or terminal discovery",
      "`switch --tab --launch` and `switch --tab --ignore-configured-launcher` are compatible same-intent combinations",
      "arashi create feature-auth --tab",
      "arashi create feature-auth --tab --no-launch --no-switch",
      "arashi create feature-auth --tab --dry-run",
      "`create --tab` implies launch and switch",
      "wins over `--no-launch` and `--no-switch`",
      "bypasses configured generic or editor-scoped launch defaults",
      "`create --tab --launch` and `create --tab --switch` are compatible",
      "`create --tab --json` returns `JSON_UNSUPPORTED_FOR_MODE`",
      "`details.mode: \"interactive-or-launch\"`",
      "exits `1`",
      '"command": "create"',
      "Both JSON guards run before option-conflict or contextual validation",
      "stdout remains exactly one JSON document",
      "before managed-ignore reconciliation, hooks, branch creation, or worktree creation",
      "Dry-run previews tab intent without mutation",
      "preserves every successfully created worktree",
      "Managed context outranks the outer terminal",
      "Ghostty inside tmux uses a tmux window",
      "Ghostty inside Herdr uses a Herdr tab",
      "cmux uses a workspace (its vertical-tab equivalent)",
      "Bare macOS Ghostty 1.3+ uses a Ghostty tab",
      "Bare Terminal.app returns `TAB_DISPOSITION_UNSUPPORTED` before target preflight, AppleScript, command execution, or fallback launch",
      "press Command-T manually, then run `arashi switch --cd`",
      "requires active Arashi shell integration",
      "when automatic launcher resolution selects Terminal.app",
      "Bare Git Bash/MinTTY returns an actionable `TAB_DISPOSITION_UNSUPPORTED`",
      "does not fall back to a new window",
      "An automatically detected IDE whose CLI is unavailable continues canonical terminal/platform resolution",
      "do not classify the unavailable IDE as a selected unsupported IDE",
      "missing target or supported-version evidence returns `TAB_DISPOSITION_UNSUPPORTED` before any process, automation, or fallback attempt",
      "Denied or failed automation for a supported macOS tab adapter returns `LAUNCH_FAILED`",
      "Denied or failed read-only macOS automation preflight for a supported tab adapter returns `LAUNCH_FAILED` before create mutation or switch launch, with no fallback",
      "preserves the selected app, profile, shell, and cwd",
      "never silently falls back",
      "Configured and implicit-standalone `switch --tab` and `create --tab` use the same resolver and failure semantics",
      "do not create or persist `.arashi` configuration",
      "Default Herdr launch continues to use `herdr worktree open`",
      "requires a non-bare source checkout",
      "`--tab --herdr` instead runs `herdr tab create` in the active workspace",
      "does not require a non-bare source checkout",
    ],
  ],
  [
    "references/prerequisites.md",
    [
      "Default Herdr workspace launch uses `herdr worktree open`",
      "requires a non-bare main checkout",
      "`--tab --herdr` uses `herdr tab create` in the active workspace",
      "does not require a non-bare source checkout",
      "non-empty `HERDR_WORKSPACE_ID`",
    ],
  ],
  [
    "references/session-shortcuts.md",
    [
      "arashi switch --tab feature-auth",
      "arashi create feature-auth --tab",
      "tmux window",
      "Herdr tab",
      "cmux workspace",
      "Bare macOS Ghostty 1.3+",
    ],
  ],
  [
    "references/workflows.md",
    [
      "Default launch opens a new window or independent managed session",
      "Use `--tab` only for a one-invocation tab request",
      "Ghostty+tmux → tmux window",
      "Ghostty+Herdr → Herdr tab",
      "cmux → workspace/vertical-tab",
    ],
  ],
  [
    "references/troubleshooting.md",
    [
      "`TAB_DISPOSITION_UNSUPPORTED`",
      "Git Bash/MinTTY",
      "unmanaged Kitty",
      "Linux Ghostty",
      "IDE workspace",
      "generic terminal fallback",
      "Do not retry as a window",
      "created worktrees remain intact",
      "missing `WEZTERM_PANE`, `HERDR_WORKSPACE_ID`, exact macOS target, or supported Ghostty version",
      "`TAB_DISPOSITION_UNSUPPORTED` before any process or fallback attempt",
      "Denied or failed read-only macOS automation preflight for iTerm2 or Ghostty",
      "`LAUNCH_FAILED` without fallback as authoritative before create mutation or switch launch",
      "Default Herdr launch still needs a non-bare source checkout",
      "`--tab --herdr` does not",
    ],
  ],
]);

const launcherMatrixRows = [
  "| Windows Terminal | `wt.exe -w new new-tab`, preserving non-empty `WT_PROFILE_ID` with `-p` and exact path with `-d` | `wt.exe -w 0 new-tab` with the same profile/path handling; failure returns `LAUNCH_FAILED` without fallback |",
  "| Standalone Git Bash / configured MinTTY | Existing `git-bash.exe --no-cd` path, direct detached MinTTY compatibility fallback, then safe shell fallback for an independent window | `TAB_DISPOSITION_UNSUPPORTED`; the host exposes no stable tab target, so use the default window or Windows Terminal |",
  "| WezTerm | `wezterm cli spawn --new-window --cwd <path>` in the current domain, with a process-start fallback that still explicitly requests an independent window | `wezterm cli spawn --pane-id <WEZTERM_PANE> --cwd <path>` in the exact current GUI context; missing non-empty `WEZTERM_PANE` returns `TAB_DISPOSITION_UNSUPPORTED` before process execution |",
  "| Managed Kitty | Exact Arashi worktree session creation/focus/reuse, documented as the independent-session equivalent | The same exact managed Kitty tab/session primitive, reported as the tab equivalent rather than a window fallback |",
  "| Unmanaged Kitty | New Kitty OS window at the exact worktree path | `TAB_DISPOSITION_UNSUPPORTED` unless managed remote-control evidence is present; never probe an unrelated Kitty instance |",
  "| tmux and sesh | Existing `tmux new-window -c <path>` and sesh connect primitive, documented as the independent-session equivalent | The same tmux/sesh managed primitive, explicitly reported as the tab equivalent |",
  "| cmux | Existing create-and-focus workspace operation, documented as the independent-session equivalent | The same workspace/vertical-tab primitive, explicitly treated as cmux's in-session tab equivalent |",
  "| Herdr | Existing `herdr worktree open` open/focus of the exact worktree workspace, requiring a non-bare source checkout | `herdr tab create` in non-empty exact `HERDR_WORKSPACE_ID`; missing active-workspace evidence returns `TAB_DISPOSITION_UNSUPPORTED`, and this tab path does not require a non-bare source checkout |",
  "| Automatically detected IDE with unavailable CLI | Continue canonical terminal/platform resolution; use the selected terminal/platform launcher's default window or independent-session mapping | Continue canonical terminal/platform resolution, then apply that selected launcher's tab mapping/capability; do not classify the unavailable IDE as a selected unsupported IDE |",
  "| VS Code / Cursor / Kiro | Existing explicit `--new-window <exact-worktree-path>` workspace launch | `TAB_DISPOSITION_UNSUPPORTED`; editor workspaces are not terminal tabs |",
  "| Linux Ghostty | `ghostty +new-window --working-directory <path>` | `TAB_DISPOSITION_UNSUPPORTED`; never map the request to `+new-window` |",
  "| macOS Ghostty older than 1.3 or missing supported-version evidence | Existing explicit independent-process window mapping | `TAB_DISPOSITION_UNSUPPORTED`; no supported tab API is available |",
  "| macOS Ghostty 1.3+ | AppleScript `new window with configuration`, preserving exact cwd and current shell as data | AppleScript `new tab in <captured-window> with configuration`; missing supported-version evidence or an exact target window returns `TAB_DISPOSITION_UNSUPPORTED` before automation |",
  "| Terminal.app | One static AppleScript transaction creates a new window/tab object with exact cwd, current shell, and captured settings when available | `TAB_DISPOSITION_UNSUPPORTED`; supported Terminal.app automation cannot safely create a true tab in an exact selected window |",
  "| iTerm2 | One static AppleScript transaction creates a new window with the captured current profile when available | One static AppleScript transaction creates a tab in the exact captured target window with the captured profile; a missing target returns `TAB_DISPOSITION_UNSUPPORTED` |",
  "| Generic Linux/macOS/Windows fallback | Existing platform-specific independent process/window sequence | `TAB_DISPOSITION_UNSUPPORTED`; no generic cross-terminal tab protocol exists |",
];

const jsonBoundaryEnvelopes = [
  {
    expected: {
      ok: false,
      command: "switch",
      schemaVersion: 1,
      error: {
        code: "JSON_UNSUPPORTED_FOR_MODE",
        message: "JSON output is not supported for this mode",
        details: { mode: "launch" },
      },
      warnings: [],
    },
    exitCode: 2,
    guidance:
      '`switch --tab --json` returns `JSON_UNSUPPORTED_FOR_MODE` with `details.mode: "launch"` and exits `2`.',
  },
  {
    expected: {
      ok: false,
      command: "create",
      schemaVersion: 1,
      error: {
        code: "JSON_UNSUPPORTED_FOR_MODE",
        message: "JSON output is not supported for this mode",
        details: { mode: "interactive-or-launch" },
      },
      warnings: [],
    },
    exitCode: 1,
    guidance:
      '`create --tab --json` returns `JSON_UNSUPPORTED_FOR_MODE` with `details.mode: "interactive-or-launch"` and exits `1`.',
  },
];

function validateSkill(root, label) {
  for (const [relativePath, expectedTexts] of requirements) {
    const content = readFileSync(join(root, relativePath), "utf8");
    for (const expected of expectedTexts) {
      assert.ok(
        content.includes(expected),
        `${label}/${relativePath} is missing ${JSON.stringify(expected)}`,
      );
    }
  }

  const commands = readFileSync(join(root, "references", "commands.md"), "utf8");
  for (const row of launcherMatrixRows) {
    assert.ok(
      commands.includes(row),
      `${label}/references/commands.md is missing complete launcher matrix row ${JSON.stringify(row)}`,
    );
  }
  assert.doesNotMatch(
    commands,
    /\| Tab disposition support \| Mapping \|/,
    `${label}/references/commands.md regressed to the abbreviated tab-only mapping`,
  );
  assert.doesNotMatch(
    commands,
    /cd "\$\(arashi switch --launch --ignore-configured-launcher\)"/,
    `${label}/references/commands.md must not recommend launch-mode output as a path-only command substitution`,
  );

  const dispositionSection = commands.slice(
    commands.indexOf("### Launch disposition (`--tab`)"),
    commands.indexOf("## Create and Switch Defaults and Overrides"),
  );
  const documentedEnvelopes = [
    ...dispositionSection.matchAll(/```json\n([\s\S]*?)\n```/g),
  ]
    .map(([, body]) => {
      try {
        return JSON.parse(body);
      } catch {
        return undefined;
      }
    })
    .filter(Boolean);
  assert.equal(
    documentedEnvelopes.length,
    jsonBoundaryEnvelopes.length,
    `${label}/references/commands.md must contain exactly the two parsed tab JSON boundary envelopes`,
  );
  for (const { expected, exitCode, guidance } of jsonBoundaryEnvelopes) {
    const { command } = expected;
    const envelope = documentedEnvelopes.find(
      (candidate) => candidate.command === command,
    );
    assert.ok(
      envelope,
      `${label}/references/commands.md is missing the exact ${command} JSON boundary envelope`,
    );
    assert.deepEqual(
      envelope,
      expected,
      `${command} JSON boundary envelope must match exactly with no extra or missing fields`,
    );
    assert.ok(
      commands.includes(guidance),
      `${label}/references/commands.md must associate ${command} JSON exit ${exitCode} with its exact command guidance`,
    );
  }

  const skill = readFileSync(join(root, "SKILL.md"), "utf8");
  assert.doesNotMatch(
    skill,
    /TAB_DISPOSITION|--tab/,
    `${label}/SKILL.md must remain minimal; disposition details belong in references`,
  );
}

function validateRepositoryContracts() {
  for (const contractName of ["create-launch-config.json", "switch-config.json"]) {
    const contractText = readFileSync(
      join(repositoryRoot, "contracts", contractName),
      "utf8",
    );
    assert.doesNotMatch(
      contractText,
      /"tab"|--tab/,
      `${contractName} must not persist the one-shot --tab disposition`,
    );
  }

  const coverage = JSON.parse(
    readFileSync(join(repositoryRoot, "contracts", "command-coverage.json"), "utf8"),
  );
  for (const commandName of ["create", "switch"]) {
    const command = coverage.commands.find(({ name }) => name === commandName);
    assert.ok(command, `command coverage is missing ${commandName}`);
    assert.ok(
      command.requiredOptions?.includes("--tab"),
      `${commandName} command coverage is missing --tab`,
    );
  }
}

function validateWorkflowWiring() {
  const workflows = [
    ".github/workflows/security-audit.yml",
    ".github/workflows/release-security-gate.yml",
  ];
  for (const workflowPath of workflows) {
    const workflow = readFileSync(join(repositoryRoot, workflowPath), "utf8");
    assert.match(
      workflow,
      /^\s*(?:run:\s*)?node scripts\/tab-launch-disposition-guidance-selftest\.mjs\s*$/m,
      `${workflowPath} does not run the source tab-disposition self-test`,
    );
    assert.match(
      workflow,
      /^\s*node scripts\/tab-launch-disposition-guidance-selftest\.mjs --skill-root package-check\/skills\/arashi\s*$/m,
      `${workflowPath} does not run the extracted-package tab-disposition self-test`,
    );
    assert.match(
      workflow,
      /^\s*(?:run:\s*)?tar -czf arashi-skill-package\.tar\.gz skills\/(?: README\.md LICENSE security\/)?\s*$/m,
      `${workflowPath} does not build the release-shaped skill archive`,
    );
    assert.match(
      workflow,
      /^\s*tar -xzf arashi-skill-package\.tar\.gz -C package-check\s*$/m,
      `${workflowPath} does not extract the skill archive before package validation`,
    );
  }
}

function validateDeliberateDrift() {
  const driftRoot = mkdtempSync(join(tmpdir(), "arashi-tab-guidance-drift-"));
  try {
    const packagedSkillRoot = join(driftRoot, "arashi");
    cpSync(sourceSkillRoot, packagedSkillRoot, { recursive: true });
    const commandsPath = join(packagedSkillRoot, "references", "commands.md");
    const commands = readFileSync(commandsPath, "utf8");
    const sectionMarker = "### Launch disposition (`--tab`)";
    const sectionIndex = commands.indexOf(sectionMarker);
    const marker = '"schemaVersion": 1';
    assert.equal(
      commands.slice(sectionIndex).split(marker).length - 1,
      2,
      "semantic drift fixture requires two parsed tab JSON schemaVersion fields",
    );
    writeFileSync(
      commandsPath,
      `${commands.slice(0, sectionIndex)}${commands
        .slice(sectionIndex)
        .replace(marker, '"schemaVersion": 2')}`,
    );
    assert.throws(
      () => validateSkill(packagedSkillRoot, "deliberate-drift"),
      /switch JSON boundary envelope must match exactly/,
      "checker accepted deliberate parsed switch JSON schemaVersion drift",
    );

    writeFileSync(commandsPath, commands);
    const matrixRow = launcherMatrixRows[2];
    assert.equal(
      commands.split(matrixRow).length - 1,
      1,
      "semantic drift fixture requires exactly one WezTerm condition/outcome row",
    );
    writeFileSync(
      commandsPath,
      commands.replace(
        matrixRow,
        matrixRow.replace(
          "missing non-empty `WEZTERM_PANE` returns `TAB_DISPOSITION_UNSUPPORTED`",
          "missing pane evidence falls back to `--new-window`",
        ),
      ),
    );
    assert.throws(
      () => validateSkill(packagedSkillRoot, "deliberate-launcher-drift"),
      /complete launcher matrix row.*WezTerm/,
      "checker accepted deliberate WezTerm condition/outcome drift",
    );
  } finally {
    rmSync(driftRoot, { recursive: true, force: true });
  }
}

function main() {
  if (suppliedSkillRoot) {
    validateSkill(resolve(suppliedSkillRoot), "package");
    console.log("tab launch-disposition guidance self-test passed for packaged skill");
    return;
  }

  validateSkill(sourceSkillRoot, "source");
  validateRepositoryContracts();
  validateWorkflowWiring();
  validateDeliberateDrift();
  console.log(
    `tab launch-disposition guidance self-test passed for source, contracts, workflows, and deliberate drift (${requirements.size} surfaces)`,
  );
}

main();
