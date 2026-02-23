#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

const SEVERITY_ORDER = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const CONTENT_RULES = [
  {
    code: "ATH001",
    key: "no-pipe-to-shell",
    severity: "critical",
    pattern: /curl\s+-fsSL\s+\S+\s*\|\s*(bash|sh)\b/i,
    why: "Pipe-to-shell executes remote code immediately and bypasses integrity review.",
    fix: "Replace with a version-pinned install flow that verifies checksums before execution.",
  },
  {
    code: "ATH002",
    key: "no-sudo-install",
    severity: "high",
    pattern: /\bsudo\s+mv\b/i,
    why: "Installing unverified binaries with elevated privileges increases blast radius.",
    fix: "Install into a user-owned path (for example $HOME/.local/bin) after verification.",
  },
  {
    code: "ATH003",
    key: "no-unpinned-global-npm-install",
    severity: "medium",
    pattern: /npm\s+install(?:\s+--global|\s+-g)\s+arashi(?:\s|$|`)/i,
    why: "Unpinned package installs are non-deterministic and can drift unexpectedly.",
    fix: "Pin an explicit version (for example arashi@1.7.0) and verify installed version output.",
  },
  {
    code: "ATH004",
    key: "no-unsafe-command-substitution",
    severity: "low",
    pattern: /\$\(\s*arashi\s+list\s*\|\s*fzf[^)]*\)/i,
    why: "Direct command substitution can ingest untrusted text into shell commands.",
    fix: "Use a reviewed two-step flow with explicit quoting and manual confirmation.",
  },
  {
    code: "ATH005",
    key: "no-eval",
    severity: "high",
    pattern: /\beval\s+/i,
    why: "eval executes dynamically assembled shell content and is difficult to audit safely.",
    fix: "Use explicit commands and avoid dynamic code execution patterns.",
  },
];

const DISALLOWED_PATH_RULES = [
  {
    code: "ATH101",
    key: "no-env-files",
    severity: "high",
    pattern: /(^|\/)\.env(\.|$)/i,
    why: "Environment files often contain secrets and should not be packaged in skill artifacts.",
    fix: "Remove the file from tracked artifacts and rotate any exposed credentials.",
  },
  {
    code: "ATH102",
    key: "no-private-keys",
    severity: "critical",
    pattern: /(^|\/)(id_rsa|id_ed25519|.+\.pem|.+\.key)$/i,
    why: "Private key material must never be included in published artifacts.",
    fix: "Delete the key material, rotate credentials, and keep secrets in a vault.",
  },
];

function normalizePath(pathValue) {
  return pathValue.split(sep).join("/");
}

function parseArgs(argv) {
  const parsed = {
    root: process.cwd(),
    exceptions: "security/audit-exceptions.json",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--root") {
      parsed.root = argv[i + 1] ?? parsed.root;
      i += 1;
    } else if (arg === "--exceptions") {
      parsed.exceptions = argv[i + 1] ?? parsed.exceptions;
      i += 1;
    }
  }

  parsed.root = resolve(parsed.root);
  parsed.exceptions = resolve(parsed.root, parsed.exceptions);
  return parsed;
}

function collectFiles(root) {
  const out = [];
  const skip = new Set([".git", "node_modules"]);

  function walk(current) {
    for (const entry of readdirSync(current)) {
      if (skip.has(entry)) {
        continue;
      }

      const fullPath = join(current, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (stat.isFile()) {
        out.push(fullPath);
      }
    }
  }

  walk(root);
  return out;
}

function parseExceptions(exceptionsPath, nowIso) {
  if (!existsSync(exceptionsPath)) {
    return {
      validExceptions: [],
      validationFindings: [],
    };
  }

  let payload;
  try {
    payload = JSON.parse(readFileSync(exceptionsPath, "utf8"));
  } catch {
    return {
      validExceptions: [],
      validationFindings: [
        {
          code: "ATHE01",
          key: "exceptions-json-invalid",
          severity: "high",
          path: normalizePath(exceptionsPath),
          line: 1,
          why: "Exception file is not valid JSON.",
          fix: "Fix JSON syntax in security/audit-exceptions.json.",
        },
      ],
    };
  }

  const validationFindings = [];
  const validExceptions = [];

  if (!payload || typeof payload !== "object" || !Array.isArray(payload.exceptions)) {
    validationFindings.push({
      code: "ATHE02",
      key: "exceptions-shape-invalid",
      severity: "high",
      path: normalizePath(exceptionsPath),
      line: 1,
      why: "Exception file must include an exceptions array.",
      fix: "Use the documented schema with { version, exceptions: [] }.",
    });
    return { validExceptions, validationFindings };
  }

  payload.exceptions.forEach((entry, index) => {
    const itemPath = `${normalizePath(exceptionsPath)}#exceptions[${index}]`;
    const requiredKeys = ["id", "finding", "path", "owner", "rationale", "expiresAt"];
    const missing = requiredKeys.filter((key) => !entry || typeof entry[key] !== "string" || entry[key].trim() === "");
    if (missing.length > 0) {
      validationFindings.push({
        code: "ATHE03",
        key: "exception-metadata-missing",
        severity: "high",
        path: itemPath,
        line: 1,
        why: `Exception entry is missing required fields: ${missing.join(", ")}.`,
        fix: "Populate all required metadata fields before using the exception.",
      });
      return;
    }

    const expiry = new Date(entry.expiresAt);
    if (Number.isNaN(expiry.getTime())) {
      validationFindings.push({
        code: "ATHE04",
        key: "exception-expiry-invalid",
        severity: "high",
        path: itemPath,
        line: 1,
        why: "expiresAt must be an ISO-8601 date.",
        fix: "Set expiresAt to a valid ISO timestamp like 2026-03-01T00:00:00Z.",
      });
      return;
    }

    if (expiry.getTime() <= new Date(nowIso).getTime()) {
      validationFindings.push({
        code: "ATHE05",
        key: "exception-expired",
        severity: "high",
        path: itemPath,
        line: 1,
        why: `Exception ${entry.id} is expired (${entry.expiresAt}).`,
        fix: "Remediate the underlying finding or renew the exception with justification and new expiry.",
      });
      return;
    }

    validExceptions.push(entry);
  });

  return { validExceptions, validationFindings };
}

function wildcardToRegex(pattern) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`);
}

function isSuppressed(finding, exceptions) {
  return exceptions.some((exception) => {
    if (exception.finding !== finding.key) {
      return false;
    }

    try {
      const matcher = wildcardToRegex(exception.path);
      return matcher.test(finding.path);
    } catch {
      return false;
    }
  });
}

function formatFinding(finding) {
  const location = finding.line ? `${finding.path}:${finding.line}` : finding.path;
  return [
    `[${finding.severity.toUpperCase()}] ${finding.code} ${finding.key} ${location}`,
    `  Why: ${finding.why}`,
    `  Fix: ${finding.fix}`,
  ].join("\n");
}

function readLines(filePath) {
  return readFileSync(filePath, "utf8").split(/\r?\n/);
}

function shouldScanMarkdown(relativePath) {
  return relativePath === "README.md" || relativePath.startsWith("skills/");
}

function scanContent(files, root) {
  const findings = [];

  for (const filePath of files) {
    if (!filePath.endsWith(".md")) {
      continue;
    }

    const relativePath = normalizePath(relative(root, filePath));
    if (!shouldScanMarkdown(relativePath)) {
      continue;
    }

    const lines = readLines(filePath);

    lines.forEach((line, index) => {
      CONTENT_RULES.forEach((rule) => {
        if (rule.pattern.test(line)) {
          findings.push({
            code: rule.code,
            key: rule.key,
            severity: rule.severity,
            path: relativePath,
            line: index + 1,
            why: rule.why,
            fix: rule.fix,
          });
        }
      });
    });
  }

  return findings;
}

function scanDisallowedPaths(files, root) {
  const findings = [];
  for (const fullPath of files) {
    const relativePath = normalizePath(relative(root, fullPath));
    DISALLOWED_PATH_RULES.forEach((rule) => {
      if (rule.pattern.test(relativePath)) {
        findings.push({
          code: rule.code,
          key: rule.key,
          severity: rule.severity,
          path: relativePath,
          line: null,
          why: rule.why,
          fix: rule.fix,
        });
      }
    });
  }
  return findings;
}

function scanDependencyManifest(root) {
  const findings = [];
  const manifestPath = join(root, "package.json");
  if (!existsSync(manifestPath)) {
    return findings;
  }

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    findings.push({
      code: "ATH201",
      key: "package-json-invalid",
      severity: "high",
      path: "package.json",
      line: 1,
      why: "Invalid package.json blocks dependency validation.",
      fix: "Fix package.json syntax so dependency security checks can run.",
    });
    return findings;
  }

  const fields = ["dependencies", "devDependencies", "optionalDependencies"];
  for (const field of fields) {
    const section = manifest[field];
    if (!section || typeof section !== "object") {
      continue;
    }

    Object.entries(section).forEach(([name, version]) => {
      if (typeof version !== "string") {
        return;
      }

      if (/(^latest$|\*$|github:|git\+https?:|https?:\/\/)/i.test(version.trim())) {
        findings.push({
          code: "ATH202",
          key: "dependency-version-unpinned",
          severity: "medium",
          path: "package.json",
          line: 1,
          why: `${name} uses an unpinned or remote dependency source (${version}).`,
          fix: "Use a deterministic semver range or exact version from a trusted registry.",
        });
      }
    });
  }

  return findings;
}

function printSummary(findings, suppressedCount) {
  console.log("== Arashi Skills Security Gate ==");
  console.log(`Findings: ${findings.length}`);
  console.log(`Suppressed by active exceptions: ${suppressedCount}`);

  if (findings.length === 0) {
    console.log("Result: PASS");
    return;
  }

  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const finding of findings) {
    counts[finding.severity] += 1;
  }

  console.log(
    `Severity counts: critical=${counts.critical}, high=${counts.high}, medium=${counts.medium}, low=${counts.low}`,
  );
  console.log("\nActionable findings:");
  findings
    .slice()
    .sort((a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity])
    .forEach((finding) => {
      console.log(formatFinding(finding));
    });
}

function main() {
  const nowIso = new Date().toISOString();
  const args = parseArgs(process.argv.slice(2));
  const files = collectFiles(args.root);

  const { validExceptions, validationFindings } = parseExceptions(args.exceptions, nowIso);

  const rawFindings = [
    ...validationFindings,
    ...scanDependencyManifest(args.root),
    ...scanDisallowedPaths(files, args.root),
    ...scanContent(files, args.root),
  ];

  const unsuppressed = [];
  let suppressedCount = 0;
  for (const finding of rawFindings) {
    if (isSuppressed(finding, validExceptions)) {
      suppressedCount += 1;
    } else {
      unsuppressed.push(finding);
    }
  }

  printSummary(unsuppressed, suppressedCount);
  process.exitCode = unsuppressed.length > 0 ? 1 : 0;
}

main();
