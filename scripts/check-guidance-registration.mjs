#!/usr/bin/env node

import { lstatSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const CHECKER_PATTERN = /^scripts\/[a-z0-9](?:[a-z0-9-]*[a-z0-9])?-guidance-selftest\.mjs$/;
const INVENTORY_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?-guidance-selftest\.mjs$/;

function bytewiseCompare(left, right) {
  return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}

function normalizePath(value) {
  return value.split(sep).join("/");
}

function hasSymlinkComponent(root, identity) {
  let current = root;
  for (const segment of identity.split("/")) {
    current = join(current, segment);
    try {
      if (lstatSync(current).isSymbolicLink()) return true;
    } catch {
      return false;
    }
  }
  return false;
}

export function validateGuidanceRegistration(repositoryRoot) {
  const root = resolve(repositoryRoot);
  const manifestPath = join(root, "scripts", "guidance-checkers.json");
  const defects = [];
  let entries = [];

  try {
    const parsed = JSON.parse(readFileSync(manifestPath, "utf8"));
    if (!Array.isArray(parsed) || parsed.some((entry) => typeof entry !== "string")) {
      defects.push("malformed manifest: scripts/guidance-checkers.json must be a JSON array of strings");
    } else {
      entries = parsed;
    }
  } catch (error) {
    defects.push(`malformed manifest: scripts/guidance-checkers.json could not be read as JSON (${error.code ?? error.message})`);
  }

  for (let index = 1; index < entries.length; index += 1) {
    if (bytewiseCompare(entries[index - 1], entries[index]) > 0) {
      defects.push(
        `manifest entries are not in ascending bytewise UTF-8 order: ${JSON.stringify(entries[index - 1])} precedes ${JSON.stringify(entries[index])}`,
      );
    }
  }

  const seen = new Set();
  for (const identity of entries) {
    if (seen.has(identity)) defects.push(`duplicate manifest entry: ${identity}`);
    seen.add(identity);

    const segments = identity.split("/");
    if (
      isAbsolute(identity) ||
      identity.includes("\\") ||
      segments.includes(".") ||
      segments.includes("..") ||
      !CHECKER_PATTERN.test(identity)
    ) {
      defects.push(`invalid checker identity: ${identity}`);
      continue;
    }

    const candidate = resolve(root, identity);
    const relativeCandidate = normalizePath(relative(root, candidate));
    if (relativeCandidate.startsWith("../") || relativeCandidate === "..") {
      defects.push(`checker identity escapes repository: ${identity}`);
      continue;
    }

    try {
      const stat = lstatSync(candidate);
      if (hasSymlinkComponent(root, identity) || stat.isSymbolicLink()) {
        defects.push(`checker identity resolves through a symlink: ${identity}`);
      } else if (!stat.isFile()) {
        defects.push(`checker identity is not a regular file: ${identity}`);
      } else {
        const realRoot = realpathSync(root);
        const realCandidate = realpathSync(candidate);
        const realRelative = normalizePath(relative(realRoot, realCandidate));
        if (realRelative.startsWith("../") || realRelative === "..") {
          defects.push(`checker identity escapes repository after resolution: ${identity}`);
        }
      }
    } catch {
      // Set-equality reporting below provides the canonical stale diagnostic.
    }
  }

  let inventory = [];
  try {
    inventory = readdirSync(join(root, "scripts"), { withFileTypes: true })
      .filter((entry) => INVENTORY_PATTERN.test(entry.name))
      .map((entry) => `scripts/${entry.name}`)
      .sort(bytewiseCompare);
  } catch (error) {
    defects.push(`maintained checker inventory could not be read (${error.code ?? error.message})`);
  }

  const manifestSet = new Set(entries);
  const inventorySet = new Set(inventory);
  for (const identity of inventory) {
    if (!manifestSet.has(identity)) defects.push(`omitted maintained checker: ${identity}`);
  }
  for (const identity of [...manifestSet].sort(bytewiseCompare)) {
    if (!inventorySet.has(identity)) defects.push(`stale manifest entry: ${identity}`);
  }

  return { ok: defects.length === 0, entries, inventory, defects };
}

function parseRoot(argv) {
  let root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--root") {
      if (!argv[index + 1]) throw new Error("--root requires a path");
      root = resolve(argv[index + 1]);
      index += 1;
    } else {
      throw new Error(`unknown argument: ${argv[index]}`);
    }
  }
  return root;
}

export function printRegistrationResult(result, writeStdout = (text) => process.stdout.write(text), writeStderr = (text) => process.stderr.write(text)) {
  if (result.ok) {
    writeStdout(`Guidance checker registration passed: ${result.entries.length} checkers.\n`);
    return;
  }
  writeStderr("Guidance checker registration failed:\n");
  for (const defect of result.defects) writeStderr(`- ${defect}\n`);
}

const isDirect = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirect) {
  try {
    const result = validateGuidanceRegistration(parseRoot(process.argv.slice(2)));
    printRegistrationResult(result);
    process.exitCode = result.ok ? 0 : 1;
  } catch (error) {
    console.error(`Guidance checker registration failed:\n- ${error.message}`);
    process.exitCode = 1;
  }
}
