# Maintainer Publication Policy

This repository-level document covers release and discoverability work for maintainers. It is intentionally excluded from the installed `skills/arashi` package.

Repository-based distribution is the baseline. Optional marketplace or directory listing is appropriate only when the account and platform policy permit it; otherwise record listing status as `not_applicable` and continue repository distribution.

## Readiness

- `skills/arashi/SKILL.md` frontmatter is current.
- Every installed relative link resolves.
- Installation and verification guidance uses current canonical documentation rather than a hard-coded historical package tag.
- Source and extracted-package guidance checks pass.
- The repository security gate passes under local policy.
- A fresh environment can install the CLI, run `arashi --version`, and complete one documented workflow.

## Verification

1. Create the intended repository release reference.
2. Run the registered guidance suite and security gate.
3. Build the canonical release archive and inspect its members.
4. Extract the archive and run package-capable checks against the extracted `skills/arashi` root.
5. Verify installation and one workflow from a clean environment.
6. Record the outcomes in release notes.

## Evidence template

```text
Publication Status: ready | published | not_applicable | failed
Release Reference: <tag-or-commit>
Source Validation: pass | fail
Extracted Package Validation: pass | fail
Install Verification: pass | fail
Workflow Verification: pass | fail
Discoverability Proof: <link-or-note>
Policy Notes: <optional account/platform constraints>
```

Do not copy this maintainer policy into installed operational guidance.
