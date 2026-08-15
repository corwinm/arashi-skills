#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const CANONICAL_RELEASE_MEMBERS = Object.freeze([
  "skills",
  "README.md",
  "LICENSE",
  "security",
]);

export function validateReleaseArchiveMembers(members) {
  const defects = [];
  const normalized = members.filter(Boolean);
  const required = {
    skills: false,
    "README.md": false,
    LICENSE: false,
    security: false,
  };

  for (const member of normalized) {
    const pathWithoutTrailingSlash = member.endsWith("/")
      ? member.slice(0, -1)
      : member;
    const segments = pathWithoutTrailingSlash.split("/");
    if (
      member.startsWith("/") ||
      member.startsWith("./") ||
      member.includes("\\") ||
      member.includes("\0") ||
      segments.some((segment) => segment === "" || segment === "." || segment === "..")
    ) {
      defects.push(`non-canonical archive member: ${member}`);
      continue;
    }
    if (segments.some((segment) => segment.startsWith("._"))) {
      defects.push(`AppleDouble metadata is forbidden: ${member}`);
    }
    if (member === "README.md") required["README.md"] = true;
    else if (member === "LICENSE") required.LICENSE = true;
    else if (member === "skills" || member === "skills/" || member.startsWith("skills/")) required.skills = true;
    else if (member === "security" || member === "security/" || member.startsWith("security/")) required.security = true;
    else defects.push(`forbidden archive member: ${member}`);
  }

  for (const [member, present] of Object.entries(required)) {
    if (!present) defects.push(`required archive member is missing: ${member}`);
  }
  return { ok: defects.length === 0, defects, members: normalized };
}

function listArchive(archivePath) {
  const result = spawnSync("tar", ["-tzf", archivePath], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    throw new Error(`could not list archive ${archivePath}: ${result.error?.message ?? result.stderr.trim()}`);
  }
  return result.stdout.split(/\r?\n/).filter(Boolean);
}

export function verifyReleaseArchive(archivePath) {
  const archive = resolve(archivePath);
  if (!existsSync(archive)) return { ok: false, defects: [`archive does not exist: ${archive}`], members: [] };
  try {
    return validateReleaseArchiveMembers(listArchive(archive));
  } catch (error) {
    return { ok: false, defects: [error.message], members: [] };
  }
}

export function createReleaseArchive({ repositoryRoot, outputPath }) {
  const root = resolve(repositoryRoot);
  const output = resolve(outputPath);
  const result = spawnSync("tar", ["-czf", output, ...CANONICAL_RELEASE_MEMBERS], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, COPYFILE_DISABLE: "1" },
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    return {
      ok: false,
      output,
      defects: [`archive creation failed: ${result.error?.message ?? result.stderr.trim()}`],
      members: [],
    };
  }
  const verification = verifyReleaseArchive(output);
  return { ...verification, output };
}

function printResult(result, created) {
  if (!result.ok) {
    console.error("Release archive boundary failed:");
    for (const defect of result.defects) console.error(`- ${defect}`);
    return;
  }
  if (created) console.log(`Canonical release archive created: ${result.output}`);
  console.log(`Release archive boundary passed: ${result.members.length} members.`);
}

function parseArgs(argv) {
  const parsed = {
    root: resolve(dirname(fileURLToPath(import.meta.url)), ".."),
    output: resolve("arashi-skill-package.tar.gz"),
    verify: undefined,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") {
      if (!argv[index + 1]) throw new Error("--root requires a path");
      parsed.root = resolve(argv[++index]);
    } else if (arg === "--output") {
      if (!argv[index + 1]) throw new Error("--output requires a path");
      parsed.output = resolve(argv[++index]);
    } else if (arg === "--verify") {
      if (!argv[index + 1]) throw new Error("--verify requires an archive path");
      parsed.verify = resolve(argv[++index]);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  if (parsed.verify && argv.some((arg) => arg === "--root" || arg === "--output")) {
    throw new Error("--verify cannot be combined with --root or --output");
  }
  return parsed;
}

const isDirect = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirect) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const result = args.verify
      ? verifyReleaseArchive(args.verify)
      : createReleaseArchive({ repositoryRoot: args.root, outputPath: args.output });
    printResult(result, !args.verify);
    process.exitCode = result.ok ? 0 : 1;
  } catch (error) {
    console.error(`Release archive boundary failed:\n- ${error.message}`);
    process.exitCode = 1;
  }
}
