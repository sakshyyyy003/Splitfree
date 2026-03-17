---
name: pr-review-follow-up
description: Follow-up PR review to verify fixes after changes are pushed. Use when re-reviewing a PR after initial review feedback has been addressed.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash(git:*, gh:*)
  - WebSearch
  - WebFetch
user-invocable: false
---

# PR Review Follow-up

## Purpose

Re-review a pull request after the author has pushed changes in response to initial review feedback. Verify that previous issues are fixed and check for any new issues introduced.

## When to Use

- After initial PR review when changes have been pushed
- When verifying review feedback has been addressed
- When re-evaluating a PR after modifications

## Prerequisites

- Previous review must exist (from pr-review skill)
- Get previous issues from PR comments, review thread, or conversation history

## Follow-up Process

1. **Gather previous issues**
   - List all blocking and minor issues from previous review
   - Note the file:line locations

2. **Identify changed files**
   - Get commits since last review
   - List files modified since last review

3. **Research dependencies (if applicable)**
   - If fixes involve third-party libraries, verify against latest documentation
   - Use WebSearch to confirm fixes align with correct usage patterns
   - Check for any new recommendations since initial review
   - This is especially important if initial review raised concerns about library usage

4. **Verify previous issues**
   - For each previous issue, check if it's addressed
   - Mark status using indicators below
   - For API-related fixes, verify against researched best practices

5. **Review new changes only**
   - Don't re-review unchanged code
   - Focus on files modified since last review
   - Check for new issues introduced by fixes

6. **Apply verdict logic**
   - Use follow-up verdict guidelines below

## Status Indicators

| Status             | Meaning                           | When to Use                    |
| ------------------ | --------------------------------- | ------------------------------ |
| ✅ Fixed           | Issue has been addressed          | Code changed correctly         |
| ❌ Still Present   | Issue remains unchanged           | No change or wrong change      |
| ⚠️ Partially Fixed | Attempted but incomplete          | Some aspects fixed, others not |
| 🔄 Changed         | Code changed, needs re-evaluation | Different approach taken       |

## Dependency Research in Follow-ups

Research is required in follow-up reviews when:

| Condition                                      | Research Action                     |
| ---------------------------------------------- | ----------------------------------- |
| Initial review flagged incorrect library usage | Verify fix against latest docs      |
| Fix changed how a dependency is used           | Confirm usage is correct per docs   |
| New dependency added in the fix                | Full research on new dependency     |
| Fix involves library configuration             | Verify configuration is appropriate |

### Verification Checklist

When fixes involve third-party dependencies:

- [ ] Fix aligns with current official documentation
- [ ] Library is being used as intended
- [ ] No common mistakes introduced in the fix
- [ ] Any new usage patterns are correct

## Agent Selection

Both agents always run in follow-up reviews. Each covers the same focus lane as the full review — Architect owns structure and architecture, SDE2 owns code quality and correctness.

## Output Format

```markdown
## {Agent Name} Follow-up — Verdict: {VERDICT}

### Unresolved Issues

| #   | Original Issue | File         | Status           | Notes                |
| --- | -------------- | ------------ | ---------------- | -------------------- |
| 1   | {description}  | `file.ts:42` | ❌ Still Present | {what's still wrong} |
| 2   | {description}  | `file.ts:15` | ⚠️ Partial       | {what's missing}     |

### New Issues

| #   | Severity    | File         | Issue         | Suggestion                   |
| --- | ----------- | ------------ | ------------- | ---------------------------- |
| 1   | ❌ Blocking | `file.ts:10` | {description} | {only if fix is non-obvious} |
```

**Rules:**

- `Unresolved Issues`: only include rows for issues that are ❌ Still Present or ⚠️ Partial. No ✅ Fixed rows.
- If all previous issues are resolved, replace the table with: _All previous issues resolved._
- `New Issues`: omit section entirely if no new issues found
- No Issue Resolution Summary counters
- No New Changes Assessment table (only surface problems, not a file-by-file audit)
- No praise or "what's done well"

## Returning Findings

**Do NOT post the review yourself.** The calling command is responsible for posting.

Return your findings in this structured format so the caller can post:

```
REVIEW_BODY:
{your follow-up review body using the output format above}

INLINE_COMMENTS:
[
  {"path": "src/utils/format.ts", "line": 15, "body": "❌ **Still Present:** The null check is still missing."},
  {"path": "src/components/button.tsx", "line": 42, "body": "⚠️ **New Issue:** Consider using optional chaining here."}
]

VERDICT: APPROVE | COMMENT | REQUEST_CHANGES
```

## Follow-up Verdict Guidelines

### SDE2 Verdict Logic

| Condition                                            | Verdict            |
| ---------------------------------------------------- | ------------------ |
| All previous blocking issues fixed, no new issues    | `APPROVED`         |
| Previous issues fixed, only minor new issues         | `MINOR CHANGES`    |
| Blocking issues still present OR new blocking issues | `CHANGES REQUIRED` |

### Principal Architect Verdict Logic

| Condition                                 | Verdict            |
| ----------------------------------------- | ------------------ |
| Previous architectural concerns addressed | `APPROVED`         |
| Minor questions remain, non-blocking      | `NEEDS DISCUSSION` |
| Significant architectural issues remain   | `CHANGES REQUIRED` |
