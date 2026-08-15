#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const repositoryRoot = resolve(".");
const workflows = new Map([
  [".github/workflows/security-audit.yml", readFileSync(join(repositoryRoot, ".github/workflows/security-audit.yml"), "utf8")],
  [".github/workflows/release-security-gate.yml", readFileSync(join(repositoryRoot, ".github/workflows/release-security-gate.yml"), "utf8")],
]);

const sourceCommand = "node scripts/validate-guidance.mjs";
const producerCommand = "node scripts/create-release-archive.mjs --output arashi-skill-package.tar.gz";
const extractCommand = "tar -xzf arashi-skill-package.tar.gz -C package-check";
const packageCommand = "node scripts/validate-guidance.mjs --skill-root package-check/skills/arashi";

function countExactCommand(content, command) {
  return content.split(/\r?\n/).filter((line) => {
    const trimmed = line.trim();
    return trimmed === command || trimmed === `run: ${command}`;
  }).length;
}

function validateWorkflow(path, content) {
  const errors = [];
  for (const command of [sourceCommand, producerCommand, extractCommand, packageCommand]) {
    const count = countExactCommand(content, command);
    if (count !== 1) errors.push(`${path}: expected exactly one ${command}, found ${count}`);
  }

  const indexes = [sourceCommand, producerCommand, extractCommand, packageCommand].map((command) => content.indexOf(command));
  if (!indexes.every((value, index) => index === 0 || value > indexes[index - 1])) {
    errors.push(`${path}: source, canonical archive, extraction, and package aggregate are out of order`);
  }

  const featureSpecific = content.match(/node scripts\/[a-z0-9-]+-guidance-selftest\.mjs(?:\s|$)/g) ?? [];
  if (featureSpecific.length > 0) errors.push(`${path}: feature-specific guidance command ${featureSpecific.join(", ")}`);
  if (/node scripts\/check-guidance-registration\.mjs/.test(content)) {
    errors.push(`${path}: registration guard must not be a separate workflow step`);
  }

  if (!content.includes("node scripts/security-gate.mjs --root . --exceptions security/audit-exceptions.json")) {
    errors.push(`${path}: security gate is missing`);
  }
  if (!content.includes("node scripts/security-gate-selftest.mjs")) {
    errors.push(`${path}: security gate self-test is missing`);
  }

  if (path.endsWith("security-audit.yml")) {
    if (!/^\s{2}pull_request:\s*$/m.test(content)) errors.push(`${path}: unfiltered pull_request trigger changed`);
    if (!/^\s{2}push:\s*\n\s{4}branches:\s*\n\s{6}- main\s*$/m.test(content)) {
      errors.push(`${path}: main push trigger changed`);
    }
    if (/\n\s+paths(?:-ignore)?:/.test(content)) errors.push(`${path}: path filtering narrows the trigger`);
  } else {
    if (!/^\s{2}push:\s*\n\s{4}tags:\s*\n\s{6}- ["']skill-\*["']\s*$/m.test(content)) {
      errors.push(`${path}: skill-* tag trigger changed`);
    }
    if (/\n\s+paths(?:-ignore)?:/.test(content)) errors.push(`${path}: release path filtering is inapplicable`);
    if (!/uses: actions\/upload-artifact@v7/.test(content)) errors.push(`${path}: release upload is missing`);
    if (content.indexOf(packageCommand) > content.indexOf("uses: actions/upload-artifact@v7")) {
      errors.push(`${path}: release upload occurs before package validation`);
    }
  }

  return errors;
}

function expectMutationFailure(path, content, pattern) {
  const errors = validateWorkflow(path, content);
  assert.ok(errors.some((error) => pattern.test(error)), `expected ${pattern}, got:\n${errors.join("\n")}`);
}

function main() {
  for (const [path, content] of workflows) {
    assert.deepEqual(validateWorkflow(path, content), []);

    expectMutationFailure(path, content.replace(sourceCommand, "true"), /expected exactly one.*validate-guidance/);
    expectMutationFailure(path, content.replace(packageCommand, sourceCommand), /expected exactly one.*--skill-root/);
    expectMutationFailure(path, content.replace(extractCommand, "true"), /expected exactly one.*tar -xzf/);
    expectMutationFailure(
      path,
      content.replace(producerCommand, "tar -czf arashi-skill-package.tar.gz skills/"),
      /expected exactly one.*create-release-archive/,
    );
    expectMutationFailure(
      path,
      content.replace(sourceCommand, `${sourceCommand}\n          ${sourceCommand}`),
      /expected exactly one.*found 2/,
    );
    expectMutationFailure(
      path,
      content.replace(packageCommand, "node scripts/standalone-guidance-selftest.mjs --skill-root package-check/skills/arashi"),
      /feature-specific guidance command/,
    );
    expectMutationFailure(
      path,
      content
        .replace(extractCommand, "__EXTRACT_COMMAND__")
        .replace(packageCommand, extractCommand)
        .replace("__EXTRACT_COMMAND__", packageCommand),
      /out of order/,
    );
  }

  const securityPath = ".github/workflows/security-audit.yml";
  const security = workflows.get(securityPath);
  expectMutationFailure(securityPath, security.replace("  pull_request:\n", "  pull_request:\n    paths:\n      - 'skills/**'\n"), /path filtering/);

  const releasePath = ".github/workflows/release-security-gate.yml";
  const release = workflows.get(releasePath);
  expectMutationFailure(releasePath, release.replace('      - "skill-*"', '      - "release-*"'), /tag trigger changed/);

  console.log("workflow composition self-test passed");
}

main();
