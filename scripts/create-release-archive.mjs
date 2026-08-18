#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdtempSync,
  renameSync,
  rmSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { createGzip } from "node:zlib";

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

export async function createReleaseArchive({
  repositoryRoot,
  outputPath,
  spawnSyncImpl = spawnSync,
}) {
  const root = resolve(repositoryRoot);
  const output = resolve(outputPath);
  const relativeOutput = relative(root, output);
  const outputIsWithinRoot =
    relativeOutput !== "" &&
    relativeOutput !== ".." &&
    !relativeOutput.startsWith(`..${sep}`) &&
    !isAbsolute(relativeOutput);
  const outputTopLevel = relativeOutput.split(sep)[0];
  const stagingParent =
    outputIsWithinRoot && (outputTopLevel === "skills" || outputTopLevel === "security")
      ? root
      : dirname(output);
  const temporaryRoot = mkdtempSync(join(stagingParent, ".arashi-release-archive-"));
  const temporaryTar = join(temporaryRoot, "canonical.tar");
  let adjacentTemporaryRoot;
  try {
    rmSync(output, { force: true });
    const tarResult = spawnSyncImpl("tar", ["-cf", temporaryTar, ...CANONICAL_RELEASE_MEMBERS], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, COPYFILE_DISABLE: "1" },
    });
    if (tarResult.error || tarResult.status !== 0) {
      return {
        ok: false,
        output,
        defects: [`archive creation failed: ${tarResult.error?.message ?? tarResult.stderr.trim()}`],
        members: [],
      };
    }

    adjacentTemporaryRoot = mkdtempSync(join(dirname(output), ".arashi-release-output-"));
    const temporaryGzip = join(adjacentTemporaryRoot, "canonical.tar.gz");
    try {
      await pipeline(
        createReadStream(temporaryTar),
        createGzip({ mtime: 0 }),
        createWriteStream(temporaryGzip, { flags: "wx" }),
      );
    } catch (error) {
      return {
        ok: false,
        output,
        defects: [`archive compression failed: ${error.message}`],
        members: [],
      };
    }

    renameSync(temporaryGzip, output);
    const verification = verifyReleaseArchive(output);
    return { ...verification, output };
  } finally {
    if (adjacentTemporaryRoot) rmSync(adjacentTemporaryRoot, { recursive: true, force: true });
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
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
      : await createReleaseArchive({ repositoryRoot: args.root, outputPath: args.output });
    printResult(result, !args.verify);
    process.exitCode = result.ok ? 0 : 1;
  } catch (error) {
    console.error(`Release archive boundary failed:\n- ${error.message}`);
    process.exitCode = 1;
  }
}
