# Security Baseline Findings

Date captured: 2026-02-23
Scope: `skills/arashi/**`, repository root documentation, and packaging guidance in `arashi-skills`

## External Audit Baseline (skills.sh)

Source: `https://skills.sh/corwinm/arashi-skills/arashi`

- Gen Agent Trust Hub: **FAIL** (CRITICAL)
  - Remote code execution pattern from pipe-to-shell installer guidance
  - Privileged install step using elevated binary move guidance
  - Dynamic command execution concerns around hook setup and shell substitutions
- Socket: **FAIL** (HIGH)
  - Malware-style indicator on pipe-to-shell installer pattern in `SKILL.md`
- Snyk: **WARN** (MEDIUM)
  - Third-party content exposure and unverifiable runtime URL usage

## Local Pattern Baseline (pre-remediation)

High-risk command patterns identified in docs before this change:

- remote pipe-to-shell installer commands: 8 matches
- privileged binary move command examples: 1 match
- unpinned global npm install examples: 9 matches
- direct shell substitution for worktree selection: 9 matches

## Target State

- No unsuppressed CRITICAL/HIGH/MEDIUM findings from repository-defined gate rules
- No pipe-to-shell install instructions in published skill content
- Security gate enforced in both PR and release workflows
- Exceptions managed only through `security/audit-exceptions.json` with owner and expiration metadata
