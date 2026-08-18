#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import {
  createReleaseArchive,
  validateReleaseArchiveMembers,
} from "./create-release-archive.mjs";

const repositoryRoot = resolve(".");
const producerPath = join(repositoryRoot, "scripts", "create-release-archive.mjs");

function output(result) {
  return `${result.stdout}${result.stderr}`;
}

function listMembers(archive) {
  const result = spawnSync("tar", ["-tzf", archive], { encoding: "utf8" });
  assert.equal(result.status, 0, output(result));
  return result.stdout.trim().split("\n").filter(Boolean);
}

function createFixture() {
  const root = mkdtempSync(join(tmpdir(), "arashi-release-archive-"));
  mkdirSync(join(root, "skills", "arashi"), { recursive: true });
  mkdirSync(join(root, "security"), { recursive: true });
  mkdirSync(join(root, "scripts"), { recursive: true });
  writeFileSync(join(root, "skills", "arashi", "SKILL.md"), "fixture\n");
  writeFileSync(join(root, "skills", "arashi", "large-fixture.bin"), Buffer.alloc(17 * 1024 * 1024, "x"));
  writeFileSync(join(root, "security", "policy.md"), "fixture\n");
  writeFileSync(join(root, "scripts", "maintainer.mjs"), "fixture\n");
  writeFileSync(join(root, "README.md"), "fixture\n");
  writeFileSync(join(root, "LICENSE"), "fixture\n");
  return root;
}

function makeArchive(root, archive, members) {
  const result = spawnSync("tar", ["-czf", archive, ...members], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, output(result));
}

function verify(archive) {
  return spawnSync(process.execPath, [producerPath, "--verify", archive], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
}

async function main() {
  const roots = [];
  try {
    const fixture = createFixture();
    roots.push(fixture);
    const archive = join(fixture, "canonical.tar.gz");
    const created = spawnSync(
      process.execPath,
      [producerPath, "--root", fixture, "--output", archive],
      { cwd: repositoryRoot, encoding: "utf8" },
    );
    assert.equal(created.status, 0, output(created));
    assert.match(created.stdout, /Canonical release archive created/);
    assert.match(created.stdout, /Release archive boundary passed/);

    const members = listMembers(archive);
    assert.ok(members.some((member) => member === "skills/" || member.startsWith("skills/")));
    assert.ok(members.includes("README.md"));
    assert.ok(members.includes("LICENSE"));
    assert.ok(members.some((member) => member === "security/" || member.startsWith("security/")));
    assert.equal(members.some((member) => member.startsWith("scripts/")), false);
    assert.equal(members.some((member) => /(^|\/)\._/.test(member)), false);
    for (const member of members) {
      assert.match(member, /^(?:skills(?:\/|$)|README\.md$|LICENSE$|security(?:\/|$))/);
    }

    const repeatedArchive = join(fixture, "canonical-repeated.tar.gz");
    const repeated = spawnSync(
      process.execPath,
      [producerPath, "--root", fixture, "--output", repeatedArchive],
      { cwd: repositoryRoot, encoding: "utf8" },
    );
    assert.equal(repeated.status, 0, output(repeated));
    assert.deepEqual(
      readFileSync(repeatedArchive),
      readFileSync(archive),
      "canonical release archive must regenerate byte-for-byte from unchanged inputs",
    );

    const exdevPreload = join(fixture, "simulate-exdev.cjs");
    writeFileSync(
      exdevPreload,
      `const fs = require("node:fs");
const { syncBuiltinESMExports } = require("node:module");
const originalRenameSync = fs.renameSync;
fs.renameSync = (source, destination) => {
  if (!source.startsWith(process.env.EXDEV_DESTINATION_ROOT)) {
    const error = new Error("simulated cross-device rename");
    error.code = "EXDEV";
    throw error;
  }
  return originalRenameSync(source, destination);
};
syncBuiltinESMExports();
`,
    );
    const crossFilesystemArchive = join(fixture, "cross-filesystem.tar.gz");
    const crossFilesystem = spawnSync(
      process.execPath,
      [producerPath, "--root", fixture, "--output", crossFilesystemArchive],
      {
        cwd: repositoryRoot,
        encoding: "utf8",
        env: {
          ...process.env,
          EXDEV_DESTINATION_ROOT: fixture,
          NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --require=${exdevPreload}`.trim(),
        },
      },
    );
    assert.equal(
      crossFilesystem.status,
      0,
      `release creation must not rename across filesystems:\n${output(crossFilesystem)}`,
    );

    const commands = [];
    const noExternalGzipArchive = join(fixture, "no-external-gzip.tar.gz");
    const noExternalGzip = await createReleaseArchive({
      repositoryRoot: fixture,
      outputPath: noExternalGzipArchive,
      spawnSyncImpl(command, args, options) {
        commands.push(command);
        if (command === "gzip") {
          return {
            error: Object.assign(new Error("spawnSync gzip ENOENT"), { code: "ENOENT" }),
            status: null,
            stderr: "",
          };
        }
        return spawnSync(command, args, options);
      },
    });
    assert.equal(noExternalGzip.ok, true, noExternalGzip.defects.join("\n"));
    assert.ok(commands.includes("tar"), "archive creation must use the injected tar runner");
    assert.equal(commands.includes("gzip"), false, "archive creation must not require external gzip");

    const nestedArchive = join(fixture, "skills", "nested-output.tar.gz");
    const nested = spawnSync(
      process.execPath,
      [producerPath, "--root", fixture, "--output", nestedArchive],
      { cwd: repositoryRoot, encoding: "utf8" },
    );
    assert.equal(nested.status, 0, output(nested));
    assert.equal(
      listMembers(nestedArchive).some((member) => member.includes(".arashi-release-archive-")),
      false,
      "staging directories must not become packaged members",
    );
    const firstNestedMembers = listMembers(nestedArchive);
    const repeatedNested = spawnSync(
      process.execPath,
      [producerPath, "--root", fixture, "--output", nestedArchive],
      { cwd: repositoryRoot, encoding: "utf8" },
    );
    assert.equal(repeatedNested.status, 0, output(repeatedNested));
    assert.equal(
      listMembers(nestedArchive).includes("skills/nested-output.tar.gz"),
      false,
      "an existing nested destination must not include itself",
    );
    assert.deepEqual(
      listMembers(nestedArchive),
      firstNestedMembers,
      "a nested destination must regenerate the same member listing from unchanged inputs",
    );

    const repoArchive = join(fixture, "repository.tar.gz");
    const repoCreated = spawnSync(
      process.execPath,
      [producerPath, "--root", repositoryRoot, "--output", repoArchive],
      { cwd: repositoryRoot, encoding: "utf8" },
    );
    assert.equal(repoCreated.status, 0, output(repoCreated));
    assert.equal(listMembers(repoArchive).some((member) => member.startsWith("scripts/")), false);

    const leaked = join(fixture, "leaked.tar.gz");
    makeArchive(fixture, leaked, ["skills", "README.md", "LICENSE", "security", "scripts"]);
    const leakedResult = verify(leaked);
    assert.notEqual(leakedResult.status, 0);
    assert.match(output(leakedResult), /forbidden archive member.*scripts\//i);

    const appleDoubleResult = validateReleaseArchiveMembers([
      "skills/",
      "skills/._SKILL.md",
      "README.md",
      "LICENSE",
      "security/",
    ]);
    assert.equal(appleDoubleResult.ok, false);
    assert.match(appleDoubleResult.defects.join("\n"), /AppleDouble.*skills\/\._SKILL\.md/i);

    for (const member of [
      "skills/../scripts/leak",
      "/skills/arashi/SKILL.md",
      "./skills/arashi/SKILL.md",
      "skills//arashi/SKILL.md",
      "skills\\arashi\\SKILL.md",
    ]) {
      const traversalResult = validateReleaseArchiveMembers([
        "skills/",
        member,
        "README.md",
        "LICENSE",
        "security/",
      ]);
      assert.equal(traversalResult.ok, false, `${member} must be rejected`);
      assert.match(
        traversalResult.defects.join("\n"),
        /non-canonical archive member/,
        `${member} must receive an actionable canonical-path diagnostic`,
      );
    }

    const undeclaredRoot = createFixture();
    roots.push(undeclaredRoot);
    writeFileSync(join(undeclaredRoot, "AGENTS.md"), "maintainer only\n");
    const undeclared = join(undeclaredRoot, "undeclared.tar.gz");
    makeArchive(undeclaredRoot, undeclared, ["skills", "README.md", "LICENSE", "security", "AGENTS.md"]);
    const undeclaredResult = verify(undeclared);
    assert.notEqual(undeclaredResult.status, 0);
    assert.match(output(undeclaredResult), /forbidden archive member.*AGENTS\.md/i);

    console.log("release archive self-test passed");
  } finally {
    for (const root of roots) rmSync(root, { recursive: true, force: true });
  }
}

await main();
