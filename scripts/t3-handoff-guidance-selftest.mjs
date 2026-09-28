#!/usr/bin/env node

import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceSkillRoot = join(repositoryRoot, "skills", "arashi");
const argumentIndex = process.argv.indexOf("--skill-root");
const suppliedRoot = argumentIndex >= 0 ? process.argv[argumentIndex + 1] : undefined;
if (argumentIndex >= 0 && !suppliedRoot) throw new Error("--skill-root requires a path");

const requirements = new Map([
  [
    "references/commands/create.md",
    [
      "aw create feature/example --t3 \"Implement the accepted task\"",
      "aw create feature/example --t3 --prompt-file task.md",
      "@bvdm/t3code-cli@0.1.2",
      "Node.js 22.16",
      "approval-required",
      "auto-accept-edits",
      "full-access",
      "--checkout current",
      "--open none",
      "objective, accepted constraints and decisions",
      "original conversation remains attached to main",
      "desktop or mobile client",
      "--conflict REUSE_EXISTING",
      "indeterminate receipt blocks blind duplication",
      "remove only the exact reported receipt",
      "do not claim Windows, Linux, or mobile end-to-end validation",
    ],
  ],
  [
    "references/workflows.md",
    [
      "aw create feature/skill-integration --t3 --prompt-file task.md",
      "exact created parent checkout",
      "opens no host UI",
      "safe-retry versus reconciliation",
    ],
  ],
]);

function validate(root, label) {
  for (const [relativePath, expected] of requirements) {
    const content = readFileSync(join(root, relativePath), "utf8");
    for (const text of expected) {
      assert.ok(content.includes(text), `${label}/${relativePath} is missing ${JSON.stringify(text)}`);
    }
  }
  const router = readFileSync(join(root, "SKILL.md"), "utf8");
  assert.ok(router.includes("references/commands/create.md"), `${label}/SKILL.md must route create tasks`);
  assert.ok(router.length < 7000, `${label}/SKILL.md must remain a compact router`);
}

if (suppliedRoot) {
  validate(resolve(suppliedRoot), "package");
  console.log("T3 handoff guidance self-test passed for packaged skill");
} else {
  validate(sourceSkillRoot, "source");
  const packageRoot = mkdtempSync(join(tmpdir(), "arashi-t3-guidance-"));
  try {
    const packaged = join(packageRoot, "arashi");
    cpSync(sourceSkillRoot, packaged, { recursive: true });
    validate(packaged, "package");
  } finally {
    rmSync(packageRoot, { force: true, recursive: true });
  }
  console.log("T3 handoff guidance self-test passed for source and packaged skill");
}
