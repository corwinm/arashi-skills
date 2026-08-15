#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  printRegistrationResult,
  validateGuidanceRegistration,
} from "./check-guidance-registration.mjs";

function parseArgs(argv) {
  let skillRoot;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--skill-root") {
      if (!argv[index + 1]) throw new Error("--skill-root requires a path");
      skillRoot = resolve(argv[index + 1]);
      index += 1;
    } else {
      throw new Error(`unknown argument: ${argv[index]}`);
    }
  }
  return { skillRoot };
}

export function runGuidanceAggregate({
  repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), ".."),
  skillRoot,
  nodePath = process.execPath,
  writeStdout = (text) => process.stdout.write(text),
  writeStderr = (text) => process.stderr.write(text),
} = {}) {
  const root = resolve(repositoryRoot);
  const registration = validateGuidanceRegistration(root);
  printRegistrationResult(registration, writeStdout, writeStderr);
  if (!registration.ok) {
    writeStderr("Guidance aggregate aborted before child execution because registration preflight failed.\n");
    return { ok: false, completed: 0, total: registration.entries.length, failures: [] };
  }

  const failures = [];
  let completed = 0;
  for (const identity of registration.entries) {
    writeStdout(`\n== Guidance checker: ${identity} ==\n`);
    const args = [join(root, identity)];
    if (skillRoot) args.push("--skill-root", resolve(skillRoot));
    const result = spawnSync(nodePath, args, {
      cwd: root,
      encoding: "utf8",
      env: process.env,
    });
    completed += 1;
    if (result.stdout) writeStdout(result.stdout);
    if (result.stderr) writeStderr(result.stderr);

    if (result.error) {
      failures.push({ identity, kind: "STARTUP", detail: result.error.code ?? result.error.message });
    } else if (result.signal) {
      failures.push({ identity, kind: "SIGNAL", detail: result.signal });
    } else if (result.status !== 0) {
      failures.push({ identity, kind: "NONZERO", detail: String(result.status) });
    }
  }

  if (failures.length === 0) {
    writeStdout(`\nGuidance aggregate passed: ${completed}/${registration.entries.length} checkers completed.\n`);
    return { ok: true, completed, total: registration.entries.length, failures };
  }

  writeStderr("\nGuidance aggregate actionable failures:\n");
  for (const failure of failures) {
    if (failure.kind === "STARTUP") {
      writeStderr(`- [STARTUP] ${failure.identity} could not start (${failure.detail})\n`);
    } else if (failure.kind === "SIGNAL") {
      writeStderr(`- [SIGNAL] ${failure.identity} terminated by ${failure.detail}\n`);
    } else {
      writeStderr(`- [NONZERO] ${failure.identity} exited with status ${failure.detail}\n`);
    }
  }
  writeStderr(
    `Guidance aggregate failed: ${failures.length} failures; ${completed}/${registration.entries.length} checkers completed.\n`,
  );
  return { ok: false, completed, total: registration.entries.length, failures };
}

const isDirect =
  process.argv[1] &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
if (isDirect) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const result = runGuidanceAggregate(args);
    process.exitCode = result.ok ? 0 : 1;
  } catch (error) {
    console.error(`Guidance aggregate failed before preflight: ${error.message}`);
    process.exitCode = 1;
  }
}
