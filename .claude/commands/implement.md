# Implement

Implements features using Principal Architect for planning and SDE2 for execution. Architect always creates the task list. Use `--review` to enable per-task architect review with an automatic fix loop.

## Agents Used

| Agent                                                   | When                                                                                         |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| [Principal Architect](../agents/principal-architect.md) | Always — creates the implementation plan. With `--review`, also reviews after each task.     |
| [SDE2](../agents/sde2.md)                               | Always — implements each task. With `--review`, also runs fixes when architect flags issues. |

## Input

- **$ARGUMENTS**: GitHub issue number, file path, or description
- **Optional flag**: `--review` / `-r`

```
Examples:
  /implement                     → Conversation context, no per-task review
  /implement #42                 → GitHub issue, no per-task review
  /implement ./specs/feature.md  → Markdown spec, no per-task review
  /implement #42 --review        → GitHub issue + per-task architect review
  /implement #42 -r              → Short flag
```

## Flow

```
Detect Context
     │
     ▼
Branch Setup
     │
     ▼
Spawn Architect → returns task list
     │
     ▼
Show plan to user → WAIT for approval → create TodoWrite
     │
     ▼
┌─── For each task ──────────────────────────────────────┐
│                                                        │
│   Mark in_progress                                     │
│   Spawn SDE2 → implements task                         │
│                                                        │
│   If --review:                                         │
│     Spawn Architect → reviews diff                     │
│     ├── APPROVED → mark completed → next task          │
│     └── ISSUES → fix loop (max 2 attempts)             │
│           ├── Attempt: Spawn SDE2 fix → Architect re-review │
│           ├── APPROVED → mark completed → next task    │
│           └── Still failing after 2 → ask user        │
│                                                        │
│   If no --review:                                      │
│     Mark completed → next task                         │
└────────────────────────────────────────────────────────┘
     │
     ▼
Report summary
```

---

## Execution

### Phase 1: Detect Context

Parse `$ARGUMENTS`:

```
If #123 found   → gh issue view 123 --json number,title,body,labels,state,url
If .md path     → Read file content
Otherwise       → Use conversation context
```

Also parse for `--review` or `-r` flag. Store as `review_mode = true/false`.

Collect:

- Full requirements text
- Acceptance criteria (explicit or inferred)
- Any design references or constraints

### Phase 2: Branch Setup

1. Check current branch:

   ```bash
   git branch --show-current
   ```

2. Derive branch name:

   | Context      | Branch name pattern                           |
   | ------------ | --------------------------------------------- |
   | GitHub issue | `{username}/issue-{number}-{slugified-title}` |
   | Spec file    | `{username}/{slugified-filename}`             |
   | Conversation | Ask user                                      |

3. Check if branch exists:

   ```bash
   git branch --list "{branch_name}"
   git ls-remote --heads origin "{branch_name}"
   ```

   - Exists locally → ask user: checkout existing or create new?
   - Exists on remote only → fetch and checkout

4. Ask user for base branch (default: `dev`)

5. Create and checkout:

   ```bash
   git checkout -b {branch_name} {base_branch}
   ```

6. Confirm to user:

   ```
   On branch: {branch_name} (based on {base_branch})
   ```

### Phase 3: Architect Planning

**Use the Agent tool. Do NOT plan yourself.**

```
Agent(
  subagent_type: "principal-architect",
  description: "Create implementation plan",
  prompt: """
  Create an ordered task list for this implementation.

  ## Context
  - Source: {GitHub issue #123 | spec file path | conversation summary}
  - Requirements:
  {full requirements text}

  ## Instructions
  1. Read the design-plan skill at `.claude/skills/design-plan/SKILL.md`
  2. Explore the existing codebase structure before planning
  3. Break the work into ordered, independently implementable tasks
  4. Each task should be completable by a single SDE2 agent spawn
  5. Return the plan in the exact output format below

  ## Output Format

  ### Tasks
  1. {Task name} — {what to build and where}
  2. {Task name} — {what to build and where}
  ...

  ### Architectural Notes
  {Decisions, constraints, or patterns SDE2 must follow across all tasks}
  """
)
```

### Phase 4: Plan Approval

After architect returns the plan:

1. Create TodoWrite from the task list
2. Present to user:

   ```markdown
   ## Implementation Plan

   {architect's numbered task list}

   **Architectural Notes:** {architect's notes}

   **Mode:** {With per-task architect review | Implementation only}

   Does this plan look good? Let me know if you'd like any changes before we start.
   ```

3. **WAIT for user approval**

4. If user requests changes → adjust the plan, update TodoWrite, present again

### Phase 5: Implementation Loop

Maintain a `completed_tasks_log` (list of task name + SDE2 summary) to pass context forward.

For each task in the approved plan:

#### Step A — Mark in_progress

Update the todo item to `in_progress`.

#### Step B — Spawn SDE2

Capture all committed work on this branch before spawning:

```bash
git diff {base_branch}...HEAD
```

This shows only committed changes from previous tasks — not uncommitted work in progress.

**Use the Agent tool. Do NOT implement yourself.**

```
Agent(
  subagent_type: "sde2",
  description: "Implement: {task name}",
  prompt: """
  Implement this task as part of a larger feature.

  ## Full Plan
  {complete numbered task list from architect}

  ## Architectural Notes
  {architect's notes}

  ## Completed So Far
  {completed_tasks_log — each entry: task name + summary of what was built}

  ## Codebase State (committed changes from previous tasks)
  {output of git diff {base_branch}...HEAD, or "No changes yet" if first task}

  ## Your Task
  Task {n}: {task name}
  {task description}

  ## Instructions
  1. Explore existing code before writing anything
  3. Research any third-party dependencies before using them
  4. Implement only this task — do not start the next one
  5. Run typecheck and lint after completing
  6. Commit your changes: `git add -p && git commit -m "task {n}: {task name}"`
  7. Return a summary following the skill's output format
  """
)
```

Append SDE2's summary to `completed_tasks_log`.

#### Step C — Architect Review (only if `review_mode = true`)

Capture changes made by SDE2:

```bash
git diff HEAD~1
```

**Use the Agent tool. Do NOT review yourself.**

```
Agent(
  subagent_type: "principal-architect",
  description: "Review: {task name}",
  prompt: """
  Review this implementation for correctness and architectural fit.

  ## Task Goal
  Task {n}: {task name}
  {task description}

  ## Acceptance Criteria
  {from original requirements}

  ## Changes Made (diff)
  {output of git diff HEAD~1}

  ## SDE2 Summary
  {SDE2's returned summary}

  ## Instructions
  1. Focus on: architectural fit, correctness, conventions, edge cases
  3. Do NOT re-review already completed tasks
  4. Return verdict in the exact format below

  ## Output Format

  **Verdict:** APPROVED | ISSUES

  {If ISSUES:}
  ### Issues
  - `{file:line}` — {issue description and what to fix}
  """
)
```

**If APPROVED:** mark task completed, continue to Step D.

**If ISSUES:** enter fix loop below.

#### Fix Loop (max 2 attempts)

Run up to 2 rounds of: SDE2 fixes → Architect re-reviews.

**Fix prompt for SDE2:**

```
Agent(
  subagent_type: "sde2",
  description: "Fix review issues: {task name}",
  prompt: """
  Fix issues found in the architect's review of task {n}.

  ## Task Context
  Task {n}: {task name}
  {task description}

  ## Architect's Issues
  {issues list from architect}

  ## Current Code (diff)
  {git diff HEAD~1}

  ## Instructions
  1. Address each issue specifically
  2. Do not change anything outside the scope of the issues
  3. Run typecheck and lint after fixing
  4. Commit your changes: `git add -p && git commit -m "task {n}: {task name} — fix attempt {attempt_number}"`
  5. Return a summary of what was changed
  """
)
```

**Re-review prompt for Architect:** same as Step C review prompt, updated with new diff.

After 2 failed attempts, ask user:

```markdown
Architect flagged issues in **Task {n}: {task name}** after 2 fix attempts.

**Remaining issues:**
{issues list}

**What SDE2 last built:**
{latest SDE2 summary}

How should we proceed?

1. Try a different approach (describe it)
2. Accept as-is and move to the next task
3. Skip this task entirely
4. Stop here and review manually
```

**Wait for user guidance before continuing.**

#### Step D — Mark completed

Update todo item to `completed`.

### Phase 6: Report

After all tasks are done:

```markdown
## Implementation Complete

### Task Reference

{GitHub Issue #123 — title | Spec: filename.md | Request: summary}

### Completed Tasks

| #   | Task        | Status |
| --- | ----------- | ------ |
| 1   | {task name} | Done   |
| 2   | {task name} | Done   |

### Files Modified

| File               | Change        |
| ------------------ | ------------- |
| `path/to/file.tsx` | {description} |

### Verification

- TypeScript: No errors
- Lint: No warnings

### Next Steps

- Review changes: `git diff main`
- Create PR: `gh pr create` or `/pr-review`
```

---

## When to Ask User

| Situation                                      | Action                                  |
| ---------------------------------------------- | --------------------------------------- |
| After architect creates plan                   | Always show plan and WAIT for approval  |
| Branch already exists                          | Ask: checkout existing or create new?   |
| Branch name unknown (conversation)             | Ask user for branch name                |
| SDE2 blocked on ambiguous requirements         | Ask for clarification before continuing |
| Architect raises a design decision (not a bug) | Ask user — SDE2 cannot resolve this     |
| Fix loop hits 2 failed attempts                | Ask user for guidance                   |
