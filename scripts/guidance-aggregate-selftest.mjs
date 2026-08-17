#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  appendFileSync,
  cpSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const repositoryRoot = resolve(".");
const runnerPath = join(repositoryRoot, "scripts", "validate-guidance.mjs");
const realSkillRoot = join(repositoryRoot, "skills", "arashi");

function output(result) {
  return `${result.stdout}${result.stderr}`;
}

function makeFixture(checkers) {
  const root = mkdtempSync(join(tmpdir(), "arashi-guidance-aggregate-"));
  mkdirSync(join(root, "scripts"), { recursive: true });
  cpSync(join(repositoryRoot, "scripts", "check-guidance-registration.mjs"), join(root, "scripts", "check-guidance-registration.mjs"));
  cpSync(runnerPath, join(root, "scripts", "validate-guidance.mjs"));
  const identities = checkers.map(({ name }) => `scripts/${name}-guidance-selftest.mjs`).sort();
  writeFileSync(join(root, "scripts", "guidance-checkers.json"), `${JSON.stringify(identities, null, 2)}\n`);
  for (const checker of checkers) {
    writeFileSync(join(root, "scripts", `${checker.name}-guidance-selftest.mjs`), checker.source);
  }
  return root;
}

function runFixture(root, args = [], env = {}) {
  return spawnSync(process.execPath, [join(root, "scripts", "validate-guidance.mjs"), ...args], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
}

const recorder = (name) => `#!/usr/bin/env node
import { appendFileSync } from "node:fs";
appendFileSync(process.env.MARKER, ${JSON.stringify(name)} + ":" + JSON.stringify(process.argv.slice(2)) + "\\n");
console.log(${JSON.stringify(`${name} diagnostic`)});
`;

async function main() {
  const roots = [];
  try {
    const ordered = makeFixture([
      { name: "beta", source: recorder("beta") },
      { name: "alpha", source: recorder("alpha") },
    ]);
    roots.push(ordered);
    const marker = join(ordered, "marker.log");
    const success = runFixture(ordered, [], { MARKER: marker });
    assert.equal(success.status, 0, output(success));
    const alphaHeading = success.stdout.indexOf("== Guidance checker: scripts/alpha-guidance-selftest.mjs ==");
    const betaHeading = success.stdout.indexOf("== Guidance checker: scripts/beta-guidance-selftest.mjs ==");
    assert.ok(
      alphaHeading >= 0 && alphaHeading < betaHeading,
      `${success.stdout}\n${success.stderr}\nalphaHeading=${alphaHeading} betaHeading=${betaHeading}`,
    );
    assert.match(success.stdout, /alpha diagnostic/);
    assert.match(success.stdout, /beta diagnostic/);
    assert.match(success.stdout, /Guidance aggregate passed: 2\/2 checkers completed\./);
    assert.deepEqual(readFileSync(marker, "utf8").trim().split("\n"), ["alpha:[]", "beta:[]"]);

    rmSync(marker);
    const packageRoot = join(ordered, "extracted", "skills", "arashi");
    mkdirSync(packageRoot, { recursive: true });
    const packaged = runFixture(ordered, ["--skill-root", packageRoot], { MARKER: marker });
    assert.equal(packaged.status, 0, output(packaged));
    assert.deepEqual(readFileSync(marker, "utf8").trim().split("\n"), [
      `alpha:["--skill-root",${JSON.stringify(packageRoot)}]`,
      `beta:["--skill-root",${JSON.stringify(packageRoot)}]`,
    ]);

    const preflight = makeFixture([{ name: "alpha", source: recorder("alpha") }]);
    roots.push(preflight);
    writeFileSync(
      join(preflight, "scripts", "guidance-checkers.json"),
      `${JSON.stringify(["scripts/missing-guidance-selftest.mjs"], null, 2)}\n`,
    );
    const blockedMarker = join(preflight, "blocked.log");
    const blocked = runFixture(preflight, [], { MARKER: blockedMarker });
    assert.notEqual(blocked.status, 0);
    assert.match(output(blocked), /omitted maintained checker.*scripts\/alpha-guidance-selftest\.mjs/i);
    assert.throws(() => readFileSync(blockedMarker), /ENOENT/, "no checker may run after source preflight failure");

    const blockedPackage = runFixture(
      preflight,
      ["--skill-root", packageRoot],
      { MARKER: blockedMarker },
    );
    assert.notEqual(blockedPackage.status, 0);
    assert.match(
      output(blockedPackage),
      /omitted maintained checker.*scripts\/alpha-guidance-selftest\.mjs/i,
    );
    assert.throws(
      () => readFileSync(blockedMarker),
      /ENOENT/,
      "no checker may run after package preflight failure",
    );

    const failures = makeFixture([
      { name: "alpha", source: "#!/usr/bin/env node\nconsole.error('alpha inherited diagnostic');\nprocess.exit(7);\n" },
      { name: "beta", source: "#!/usr/bin/env node\nconsole.log('beta still ran');\n" },
      { name: "gamma", source: "#!/usr/bin/env node\nprocess.kill(process.pid, 'SIGTERM');\n" },
    ]);
    roots.push(failures);
    const failed = runFixture(failures);
    assert.notEqual(failed.status, 0);
    assert.match(output(failed), /alpha inherited diagnostic/);
    assert.match(output(failed), /beta still ran/);
    assert.match(output(failed), /NONZERO.*scripts\/alpha-guidance-selftest\.mjs.*status 7/i);
    assert.match(output(failed), /SIGNAL.*scripts\/gamma-guidance-selftest\.mjs.*SIGTERM/i);
    assert.match(output(failed), /Guidance aggregate failed: 2 failures; 3\/3 checkers completed\./);

    const runnerModule = await import(`${pathToFileURL(runnerPath).href}?selftest=${Date.now()}`);
    let startupDiagnostics = "";
    const startupResult = runnerModule.runGuidanceAggregate({
      repositoryRoot: ordered,
      nodePath: join(ordered, "does-not-exist"),
      writeStdout: (text) => { startupDiagnostics += text; },
      writeStderr: (text) => { startupDiagnostics += text; },
    });
    assert.equal(startupResult.ok, false);
    assert.match(startupDiagnostics, /STARTUP.*scripts\/alpha-guidance-selftest\.mjs.*ENOENT/i);
    assert.match(startupDiagnostics, /STARTUP.*scripts\/beta-guidance-selftest\.mjs.*ENOENT/i);
    assert.match(startupDiagnostics, /2 failures; 2\/2 checkers completed/);

    const extracted = mkdtempSync(join(tmpdir(), "arashi-guidance-extracted-"));
    roots.push(extracted);
    cpSync(realSkillRoot, extracted, { recursive: true });
    const source = spawnSync(process.execPath, [runnerPath], { cwd: repositoryRoot, encoding: "utf8" });
    assert.equal(source.status, 0, output(source));
    const skillManifest = join(extracted, "SKILL.md");
    writeFileSync(skillManifest, readFileSync(skillManifest, "utf8").replace("Zero-config standalone mode", "Standalone mode"));
    const drifted = spawnSync(process.execPath, [runnerPath, "--skill-root", extracted], {
      cwd: repositoryRoot,
      encoding: "utf8",
    });
    assert.notEqual(drifted.status, 0, "extracted-only drift must fail the package aggregate");
    assert.match(output(drifted), /scripts\/standalone-guidance-selftest\.mjs/);
    assert.match(output(drifted), /zero-config standalone/);

    console.log("guidance aggregate self-test passed");
  } finally {
    for (const root of roots) rmSync(root, { recursive: true, force: true });
  }
}

main();
