#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const guardPath = resolve("scripts/check-guidance-registration.mjs");
const checkerNames = [
  "scripts/alpha-guidance-selftest.mjs",
  "scripts/beta-guidance-selftest.mjs",
];

function fixture(entries = checkerNames) {
  const root = mkdtempSync(join(tmpdir(), "arashi-guidance-registration-"));
  mkdirSync(join(root, "scripts"), { recursive: true });
  for (const identity of checkerNames) {
    writeFileSync(join(root, identity), "#!/usr/bin/env node\n");
  }
  writeFileSync(join(root, "scripts", "guidance-checkers.json"), `${JSON.stringify(entries, null, 2)}\n`);
  return root;
}

function run(root) {
  return spawnSync(process.execPath, [guardPath, "--root", root], { encoding: "utf8" });
}

function output(result) {
  return `${result.stdout}${result.stderr}`;
}

function expectFailure(root, patterns) {
  const result = run(root);
  assert.notEqual(result.status, 0, `registration unexpectedly passed:\n${output(result)}`);
  for (const pattern of patterns) assert.match(output(result), pattern);
}

function main() {
  const roots = [];
  try {
    const valid = fixture();
    roots.push(valid);
    const validResult = run(valid);
    assert.equal(validResult.status, 0, output(validResult));
    assert.match(validResult.stdout, /Guidance checker registration passed: 2 checkers\./);

    const omitted = fixture([checkerNames[0]]);
    roots.push(omitted);
    expectFailure(omitted, [/omitted maintained checker/i, /scripts\/beta-guidance-selftest\.mjs/]);

    const stale = fixture([...checkerNames, "scripts/stale-guidance-selftest.mjs"]);
    roots.push(stale);
    expectFailure(stale, [/stale manifest entry/i, /scripts\/stale-guidance-selftest\.mjs/]);

    const duplicate = fixture([checkerNames[0], checkerNames[0], checkerNames[1]]);
    roots.push(duplicate);
    expectFailure(duplicate, [/duplicate manifest entry/i, /scripts\/alpha-guidance-selftest\.mjs/]);

    const unsorted = fixture([...checkerNames].reverse());
    roots.push(unsorted);
    expectFailure(unsorted, [/ascending bytewise UTF-8 order/i]);

    for (const identity of [
      "/tmp/absolute-guidance-selftest.mjs",
      "scripts/../escape-guidance-selftest.mjs",
      "scripts\\portable-guidance-selftest.mjs",
      "scripts/Bad-guidance-selftest.mjs",
      "scripts/-leading-guidance-selftest.mjs",
    ]) {
      const malformed = fixture([...checkerNames, identity].sort());
      roots.push(malformed);
      expectFailure(malformed, [/invalid checker identity/i, new RegExp(identity.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))]);
    }

    const symlinked = fixture();
    roots.push(symlinked);
    rmSync(join(symlinked, checkerNames[1]));
    symlinkSync(join(symlinked, checkerNames[0]), join(symlinked, checkerNames[1]));
    expectFailure(symlinked, [/symlink/i, /scripts\/beta-guidance-selftest\.mjs/]);

    const complete = fixture([
      "scripts/stale-guidance-selftest.mjs",
      checkerNames[1],
      checkerNames[1],
    ]);
    roots.push(complete);
    expectFailure(complete, [
      /ascending bytewise UTF-8 order/i,
      /duplicate manifest entry/i,
      /omitted maintained checker.*scripts\/alpha-guidance-selftest\.mjs/i,
      /stale manifest entry.*scripts\/stale-guidance-selftest\.mjs/i,
    ]);

    console.log("guidance registration self-test passed");
  } finally {
    for (const root of roots) rmSync(root, { recursive: true, force: true });
  }
}

main();
