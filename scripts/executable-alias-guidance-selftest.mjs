#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rootIndex = process.argv.indexOf("--skill-root");
if (rootIndex >= 0 && !process.argv[rootIndex + 1]) throw new Error("--skill-root requires a path");
const skillRoot = rootIndex >= 0 ? resolve(process.argv[rootIndex + 1]) : join(repositoryRoot, "skills/arashi");

const commands = [
  "add", "clone", "completion", "create", "doctor", "exec", "handoff", "init",
  "install", "list", "move", "prune", "pull", "push", "remove", "setup", "shell",
  "status", "switch", "sync", "update",
];
const legacyInvocation = new RegExp(
  String.raw`(?:\bcommand\s+)?(?<![./@-])\barashi\s+(?:--(?:help|version)\b|-[hV]\b|<command>(?=\s|\x60|$)|(?:${commands.join("|")})\b)`,
  "g",
);
const compatibilityNote = "`arashi` executable remains supported for existing scripts and workflows";

export function findPreferredArashiInvocations(content, source) {
  return content.split(/\r?\n/).flatMap((line, index) => {
    if (line.includes(compatibilityNote)) return [];
    legacyInvocation.lastIndex = 0;
    return legacyInvocation.test(line)
      ? [`${source}:${index + 1}: preferred examples must use aw: ${line.trim()}`]
      : [];
  });
}

function markdownFiles(root, directory = root) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(root, absolute);
    return entry.name.endsWith(".md") ? [absolute] : [];
  });
}

function validate(root) {
  const defects = markdownFiles(root).flatMap((absolute) =>
    findPreferredArashiInvocations(readFileSync(absolute, "utf8"), relative(root, absolute)),
  );
  const combined = markdownFiles(root).map((file) => readFileSync(file, "utf8")).join("\n");
  const noteCount = combined.split(compatibilityNote).length - 1;
  if (noteCount !== 1) defects.push(`skill guidance must contain exactly one compatibility note; found ${noteCount}`);
  return defects;
}

const negative = findPreferredArashiInvocations(
  "Run `arashi status`.\n```bash\narashi create topic\ncommand arashi completion zsh\narashi -h\n```",
  "negative.md",
);
assert.equal(negative.length, 4, "preferred arashi fixtures must be rejected");
assert.ok(negative.every((error) => error.startsWith("negative.md:")), "rejections need source locations");

const positive = [
  "npm install -g arashi",
  "https://github.com/corwinm/arashi",
  "`.arashi/config.json` and `ARASHI_CONFIG_PATH`",
  "`arashi-windows-x64.exe`, `arashi.ps1`, and `arashi.binaryPath`",
  "Historical docs used the arashi spelling.",
  "The `arashi` executable remains supported for existing scripts and workflows; `arashi status` remains valid there.",
  "Run `aw status`.",
].join("\n");
assert.deepEqual(findPreferredArashiInvocations(positive, "positive.md"), []);

const defects = validate(skillRoot);
assert.deepEqual(defects, [], `primary documented command policy failed:\n${defects.join("\n")}`);
console.log(`Primary documented command policy passed for ${skillRoot} with positive/negative fixtures.`);
