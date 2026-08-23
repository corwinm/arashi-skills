#!/usr/bin/env node

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readme = readFileSync(resolve(root, "README.md"), "utf8");

for (const text of [
  "npx skills add https://github.com/corwinm/arashi-skills --skill arashi",
  "https://skills.sh/corwinm/arashi-skills/arashi",
  "https://arashi.haphazard.dev/getting-started/",
  "aw --version",
  "aw --help",
  "aw <command> --help",
]) {
  assert.ok(readme.includes(text), `README.md must include ${JSON.stringify(text)}`);
}

for (const path of ["skills/arashi/SKILL.md", "skills/arashi/README.md", "security/policy.md"]) {
  assert.ok(existsSync(resolve(root, path)), `README.md target must exist: ${path}`);
  assert.ok(readme.includes(`](./${path})`), `README.md must link to ./${path}`);
}

console.log("README onboarding contract passed.");
