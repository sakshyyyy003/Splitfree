---
name: pr-fix-guide
description: Fix issues identified in PR reviews, addressing blocking and minor concerns. Use after receiving PR review feedback or when PR has requested changes.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Edit
  - Write
user-invocable: false
---

# PR Fix

## Purpose

Fix issues identified in PR reviews, addressing both blocking and minor concerns systematically.

## When to Use

- After receiving PR review feedback
- When PR has requested changes
- To address review comments before merge

## Task-Specific Rules

Before fixing, check for relevant rule files in `.claude/rules/` that apply to the changed files. Load and follow all applicable rules.

## Fix Process

### Phase 1: Gather Review Context

1. **Fetch PR details:**

   ```bash
   gh pr view {pr_number} --json number,title,body,headRefName,baseRefName,author,url
   ```

2. **Get review comments:**

   ```bash
   gh api repos/{owner}/{repo}/pulls/{pr_number}/reviews
   gh api repos/{owner}/{repo}/pulls/{pr_number}/comments
   ```

3. **Get changed files:**
   ```bash
   gh pr diff {pr_number}
   ```

### Phase 2: Categorize Issues

1. **Extract all issues from reviews:**
   - Inline comments (file:line specific)
   - General review comments
   - Review verdicts and reasons

2. **Categorize by severity:**

   | Category    | Indicator                                       | Priority   |
   | ----------- | ----------------------------------------------- | ---------- |
   | Blocking ❌ | "must", "required", "blocking", REQUEST_CHANGES | Fix first  |
   | Minor ⚠️    | "consider", "suggestion", "nit", COMMENT        | Fix second |

3. **Order fixes:** blocking issues first, minor issues second.

### Phase 3: Load Context

1. **Read each affected file** (full content, not just diff)

2. **Load relevant rules** based on file paths

3. **Understand the original intent** from PR description

### Phase 4: Fix Issues

Fix all issues autonomously — do NOT stop for user confirmation between individual fixes.

1. **Work through issues one at a time:**
   - Mark todo as `in_progress` before starting
   - Mark as `completed` immediately after finishing
   - Fix all blocking issues first, then minor issues

2. **For each fix:**
   - Read the specific comment/issue
   - Understand what's being asked
   - Make the change following loaded rules

3. **Only pause for user input if:**
   - The fix is genuinely ambiguous (the reviewer's intent is unclear)
   - The fix requires an architectural decision beyond the scope of the comment
   - A fix introduces a conflict with another pending fix

### Phase 5: Verify Fixes

1. **Run checks:**

   ```bash
   yarn typecheck
   yarn lint
   yarn test
   ```

2. **Review against original comments:**
   - Does each fix address the feedback?
   - Any unintended side effects?

3. **Fix any new issues introduced**

## Output Format

After all fixes are complete:

```markdown
## ✅ PR Fixes Complete

### PR: #{pr_number} - {title}

### Issues Addressed

| Issue               | File               | Status   |
| ------------------- | ------------------ | -------- |
| {issue description} | `path/file.tsx:42` | ✅ Fixed |
| {issue description} | `path/file.tsx:78` | ✅ Fixed |

### Changes Made

| File               | Change        |
| ------------------ | ------------- |
| `path/to/file.tsx` | {description} |

### Key Code Changes

{Relevant code snippets with file:line references}

### Verification

- [ ] TypeScript: ✅ No errors
- [ ] Lint: ✅ No warnings
- [ ] Tests: ✅ All passing
- [ ] All review comments addressed: ✅

### Next Steps

{Commit and push, or any remaining items}
```

## Principles to Follow

1. **Address the actual feedback** — Don't assume, read carefully
2. **Follow loaded rules** — Rules files are source of truth
3. **One fix at a time** — Fix incrementally, but without stopping between fixes
4. **Run autonomously** — User approved the plan upfront; don't ask again unless truly blocked
5. **Don't over-fix** — Only change what was requested
