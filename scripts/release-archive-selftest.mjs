#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { validateReleaseArchiveMembers } from "./create-release-archive.mjs";

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

function main() {
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

main();
