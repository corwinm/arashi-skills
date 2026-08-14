#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceSkillRoot = join(repositoryRoot, "skills", "arashi");
const skillRootArgumentIndex = process.argv.indexOf("--skill-root");
const suppliedSkillRoot =
  skillRootArgumentIndex >= 0 ? process.argv[skillRootArgumentIndex + 1] : undefined;

if (skillRootArgumentIndex >= 0 && !suppliedSkillRoot) {
  throw new Error("--skill-root requires a path");
}

function markdownFiles(root) {
  const files = [];
  const visit = (directory) => {
    for (const name of readdirSync(directory).sort()) {
      const path = join(directory, name);
      if (statSync(path).isDirectory()) {
        visit(path);
      } else if (name.endsWith(".md")) {
        files.push(path);
      }
    }
  };
  visit(root);
  return files;
}

function section(content, heading) {
  const marker = `## ${heading}`;
  const start = content.indexOf(marker);
  assert.notEqual(start, -1, `missing section ${JSON.stringify(marker)}`);
  const end = content.indexOf("\n## ", start + marker.length);
  return content.slice(start, end === -1 ? content.length : end);
}

function validateSkill(root, label) {
  const commandsPath = join(root, "references", "commands.md");
  const troubleshootingPath = join(root, "references", "troubleshooting.md");
  const commands = readFileSync(commandsPath, "utf8");
  const troubleshooting = readFileSync(troubleshootingPath, "utf8");
  const aliasGuidance = section(commands, "SSH Remote Aliases for Add and Clone");

  for (const command of [
    "arashi add git@work-github:acme/api.git",
    "arashi add work-github:acme/api.git",
    "arashi add ssh://git@work-github/acme/api.git",
    "arashi add ssh://work-github/acme/api.git"
  ]) {
    assert.ok(aliasGuidance.includes(command), `${label}/commands.md is missing ${command}`);
  }

  for (const required of [
    "Git/OpenSSH owns host resolution and authentication",
    "does not read, manage, or resolve SSH configuration",
    "does not run an independent SSH connectivity probe",
    "preserves every configured SSH URL byte-for-byte",
    "never automatically rewrites an SSH remote to HTTPS",
    "HTTPS-to-SSH conversion remains supported",
    "normal add rollback boundary",
    "clone continues with the remaining repositories and reports partial success",
    "SSH aliases are machine-local",
    "canonical committed remote",
    "local Git `url.<base>.insteadOf` rule",
    "Arashi does not install or synchronize that rewrite"
  ]) {
    assert.ok(
      aliasGuidance.includes(required),
      `${label}/commands.md SSH alias section is missing ${JSON.stringify(required)}`
    );
  }

  assert.match(
    aliasGuidance,
    /If HTTPS is inferred or selected[^\n]*preserves every configured SSH URL byte-for-byte[^\n]*never automatically rewrites an SSH remote to HTTPS/,
    `${label}/commands.md does not bind HTTPS selection to exact SSH preservation`
  );
  assert.match(
    aliasGuidance,
    /shared configuration[^\n]*canonical committed remote[^\n]*local Git `url\.<base>\.insteadOf` rule/,
    `${label}/commands.md does not bind shared portability to canonical remotes and local Git rewriting`
  );

  assert.match(
    troubleshooting,
    /\| SSH alias clone fails to resolve or authenticate \|[^\n]*Git\/OpenSSH[^\n]*\|[^\n]*normal add rollback[^\n]*clone continues[^\n]*partial success[^\n]*Arashi does not read or probe SSH configuration[^\n]*\|/,
    `${label}/troubleshooting.md is missing the Git-owned failure and retained safety row`
  );

  const allGuidance = markdownFiles(root)
    .map((path) => ({ path: relative(root, path), content: readFileSync(path, "utf8") }));
  const forbiddenClaims = [
    /Arashi reads (?:the )?SSH configuration/i,
    /Arashi manages (?:the )?SSH configuration/i,
    /Arashi resolves SSH host aliases/i,
    /Arashi probes SSH connectivity/i,
    /https:\/\/work-github\/acme\/api\.git/
  ];
  for (const { path, content } of allGuidance) {
    for (const forbidden of forbiddenClaims) {
      assert.doesNotMatch(content, forbidden, `${label}/${path} contains forbidden SSH guidance`);
    }
  }
}

function validateWorkflowWiring() {
  for (const relativePath of [
    ".github/workflows/security-audit.yml",
    ".github/workflows/release-security-gate.yml"
  ]) {
    const workflow = readFileSync(join(repositoryRoot, relativePath), "utf8");
    assert.match(
      workflow,
      /^\s*(?:run:\s*)?node scripts\/ssh-host-alias-guidance-selftest\.mjs\s*$/m,
      `${relativePath} does not run the SSH host-alias source guidance check`
    );
    assert.match(
      workflow,
      /^\s*node scripts\/ssh-host-alias-guidance-selftest\.mjs --skill-root package-check\/skills\/arashi\s*$/m,
      `${relativePath} does not run the extracted-package SSH host-alias guidance check`
    );
  }
}

function validateDeliberateDrift() {
  const driftRoot = mkdtempSync(join(tmpdir(), "arashi-ssh-alias-drift-"));
  try {
    const preservationRoot = join(driftRoot, "preservation", "arashi");
    cpSync(sourceSkillRoot, preservationRoot, { recursive: true });
    const preservationPath = join(preservationRoot, "references", "commands.md");
    const preservation = readFileSync(preservationPath, "utf8");
    assert.equal(
      preservation.split("preserves every configured SSH URL byte-for-byte").length - 1,
      1,
      "preservation drift marker must occur exactly once"
    );
    writeFileSync(
      preservationPath,
      preservation.replace(
        "preserves every configured SSH URL byte-for-byte",
        "rewrites every configured SSH URL to the selected protocol"
      )
    );
    assert.throws(
      () => validateSkill(preservationRoot, "preservation-drift"),
      /exact SSH preservation|preserves every configured SSH URL byte-for-byte|HTTPS selection/,
      "checker must reject automatic SSH protocol rewriting"
    );

    const portabilityRoot = join(driftRoot, "portability", "arashi");
    cpSync(sourceSkillRoot, portabilityRoot, { recursive: true });
    const portabilityPath = join(portabilityRoot, "references", "commands.md");
    const portability = readFileSync(portabilityPath, "utf8");
    assert.equal(
      portability.split("canonical committed remote").length - 1,
      1,
      "portability drift marker must occur exactly once"
    );
    writeFileSync(
      portabilityPath,
      portability.replace("canonical committed remote", "committed machine-local alias")
    );
    assert.throws(
      () => validateSkill(portabilityRoot, "portability-drift"),
      /canonical committed remote|shared portability/,
      "checker must reject non-portable shared alias guidance"
    );
  } finally {
    rmSync(driftRoot, { recursive: true, force: true });
  }
}

function main() {
  if (suppliedSkillRoot) {
    validateSkill(resolve(suppliedSkillRoot), "package");
    console.log("SSH host-alias guidance self-test passed for packaged skill");
    return;
  }

  validateSkill(sourceSkillRoot, "source");
  validateWorkflowWiring();
  validateDeliberateDrift();
  console.log("SSH host-alias guidance self-test passed for source, workflows, and deliberate drift");
}

main();
