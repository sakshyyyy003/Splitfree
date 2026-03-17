# PR Fix

Fix issues identified in PR reviews using the SDE2 agent.

## Agent Used

| Agent                     | Skill                                           | Purpose           |
| ------------------------- | ----------------------------------------------- | ----------------- |
| [SDE2](../agents/sde2.md) | [pr-fix-guide](../skills/pr-fix-guide/SKILL.md) | Fix review issues |

## Required Input

- **PR Number**: $ARGUMENTS (e.g., `8`)

If no PR number provided, ask the user for it.

## Flow

```
┌─────────────────────────────────────────┐
│             /pr-fix 8                   │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│            Fetch PR Reviews             │
│  • Get PR details                       │
│  • Get review comments                  │
│  • Get inline comments                  │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│       Show Issue Plan to User           │
│  • List blocking issues (❌)            │
│  • List minor issues (⚠️)              │
│  • WAIT for approval                    │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│          Spawn SDE2 Agent               │
│  • Use Agent tool with subagent_type     │
│  • Pass PR context + approved plan      │
│  • Agent executes pr-fix skill          │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│          SDE2 Executes pr-fix           │
│  • Fix all issues autonomously          │
│  • Blocking first, then minor           │
│  • Verify fixes                         │
└─────────────────────────────────────────┘
```

## Execution

### Phase 1: Gather Review Context

1. **Fetch PR details:**

   ```bash
   gh pr view {pr_number} --json number,title,body,headRefName,baseRefName,author,url
   ```

2. **Extract GitHub issue** from PR body (`Closes #123`)

3. **Get all review feedback:**

   ```bash
   gh api repos/{owner}/{repo}/pulls/{pr_number}/reviews
   gh api repos/{owner}/{repo}/pulls/{pr_number}/comments
   ```

4. **Get changed files:**
   ```bash
   gh pr diff {pr_number}
   ```

### Phase 2: Show Issue Plan

After gathering all review context, categorize and present the issues to the user:

```markdown
## PR Fix Plan: #{pr_number} — {title}

### Blocking Issues ❌ (fix first)

1. `{file:line}` — {issue description}
2. `{file:line}` — {issue description}

### Minor Issues ⚠️ (fix after blocking)

1. `{file:line}` — {issue description}

Does this look right? I'll fix all issues autonomously and report back when done.
```

**WAIT for user approval before proceeding.**

If the user wants to skip or adjust any items, update the list accordingly.

### Phase 3: Spawn SDE2 Agent

**IMPORTANT: You MUST use the Agent tool to spawn the SDE2 agent. Do NOT execute the skill yourself.**

```
Agent(
  subagent_type: "sde2",
  description: "Fix PR review issues",
  prompt: """
  Fix issues identified in PR #{pr_number} review. Fix all issues autonomously without waiting for user input between fixes.

  ## PR Details
  - Title: {pr_title}
  - Branch: {branch_name}
  - GitHub Issue: #{issue_number}

  ## Approved Issue Plan

  ### Blocking Issues (❌) — fix first
  {list of blocking issues with file:line references}

  ### Minor Issues (⚠️) — fix after blocking
  {list of minor issues with file:line references}

  ## Changed Files
  {list of files changed in PR}

  ## Instructions
  1. Load appropriate rules based on changed files
  2. Fix all blocking issues first, then all minor issues
  3. Fix issues one at a time but do NOT stop for user confirmation between fixes
  4. Only pause if a fix is genuinely ambiguous or requires an architectural decision
  5. Verify all fixes with typecheck and lint at the end
  6. Return a complete summary of everything fixed
  """
)
```

The SDE2 agent will:

- Load the pr-fix skill and follow its workflow
- Fix all issues autonomously (blocking first, then minor)
- Only pause if a fix is ambiguous or requires an architectural decision
- Verify all fixes with typecheck/lint at the end

### Phase 4: Report Completion

After all fixes are complete, output:

```markdown
## ✅ PR Fixes Complete

### PR: #{pr_number} - {title}

### Issues Addressed

| Issue         | File        | Status   |
| ------------- | ----------- | -------- |
| {description} | `file:line` | ✅ Fixed |

### Changes Made

| File           | Change        |
| -------------- | ------------- |
| `path/to/file` | {description} |

### Verification

- [ ] TypeScript: ✅
- [ ] Lint: ✅
- [ ] Tests: ✅
- [ ] All comments addressed: ✅

### Next Steps

1. Review the fixes
2. Commit and push changes
3. Request re-review if needed
```

## Issue Priority

The SDE2 agent fixes issues in this order:

| Priority | Type        | Indicators                          |
| -------- | ----------- | ----------------------------------- |
| 1st      | Blocking ❌ | "must", "required", REQUEST_CHANGES |
| 2nd      | Minor ⚠️    | "consider", "suggestion", "nit"     |

## Error Handling

| Error                             | Action                       |
| --------------------------------- | ---------------------------- |
| PR not found                      | Ask user to verify PR number |
| No reviews found                  | Inform user, nothing to fix  |
| Review comment unclear            | Ask user for clarification   |
| Fix requires architectural change | Ask user (no patches!)       |

## Important Notes

- **No patches:** SDE2 will ask user if a proper fix is unclear or requires an architectural decision
- **One at a time:** Fixes are applied incrementally (blocking first, then minor), but without stopping between them
- **Single wait:** User approves the issue plan upfront — SDE2 then runs all fixes autonomously
