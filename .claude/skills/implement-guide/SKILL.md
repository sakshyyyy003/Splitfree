---
name: implement-guide
description: Implement a single task with production-quality code. Used by SDE2 when called by the implement command coordinator for each task in the plan.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Edit
  - Write
  - WebSearch
  - WebFetch
user-invocable: false
---

# Implement Guide

## Purpose

Implement a single task from an approved plan. You receive a specific task, context of what's already been built, and the full plan. Explore, research, implement, verify, and return a summary.

## Process

### Step 1: Understand the Task

Read the task description and all context provided:

- What exactly needs to be built
- What's already been completed (from `completed_tasks_log`)
- Architectural notes from the plan
- How your task fits into the overall feature

Do not start coding yet.

### Step 2: Explore Existing Code

Before writing anything:

1. Find similar implementations — how do existing features work?
2. Identify reusable utilities, hooks, and types
3. Note file structure and naming conventions
4. Understand patterns already established by completed tasks (check the diff provided)

### Step 3: Research Dependencies (MANDATORY)

Before writing any code, research every third-party dependency you will use:

```
"{library} best practices {current year}"
"{library} {version} documentation"
"{library} common mistakes"
```

This is mandatory — do not guess how a library works. Verify correct usage, configuration options, and common pitfalls.

### Step 4: Implement

1. Follow existing patterns in the codebase exactly
2. Use proper TypeScript types — no `any`
3. Handle errors appropriately
4. Keep code readable and explicit
5. Implement **only this task** — do not begin the next one

### Step 5: Verify

Run after completing:

```bash
npm run typecheck    # TypeScript
npm run lint         # ESLint
```

Fix all errors before returning your summary.

## Output Format

Return this structure:

```markdown
### Task Complete: {task name}

#### Changes Made

| File               | Change        |
| ------------------ | ------------- |
| `path/to/file.tsx` | {description} |

#### Key Code

{Most important snippet with file:line reference}

#### Verification

- TypeScript: {No errors | N errors fixed}
- Lint: {No warnings | N warnings fixed}

#### Notes

{Decisions made, patterns established, or anything the next task should know}
```

## Principles

1. **Read before write** — understand existing patterns first
2. **Research before coding** — look up libraries, never guess
3. **Follow loaded rules** — conventions from `.claude/rules/` are the source of truth
4. **One task only** — do not implement beyond your assigned scope
5. **Ask when blocked** — if something is ambiguous, surface it in your summary rather than assuming
