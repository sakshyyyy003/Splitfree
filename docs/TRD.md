# Technical Requirements Document (TRD)
## SplitFree — Expense Splitting Web Application

**Version:** 2.0
**Date:** 2026-03-18
**Status:** Draft
**Reference:** PRD.md v1.0

---

## 1. System Architecture

### 1.1 High-Level Architecture

```
┌──────────────────────────┐         ┌──────────────────────────────────┐
│  Next.js 15 (Vercel)     │         │  Supabase                        │
│                          │         │                                  │
│  ┌────────────────────┐  │         │  ┌────────────┐                  │
│  │  Server Components │──┼────────▶│  │  Postgres  │                  │
│  │  Server Actions    │  │  SDK    │  │  (Database) │                  │
│  └────────────────────┘  │         │  └────────────┘                  │
│                          │         │  ┌────────────┐                  │
│  ┌────────────────────┐  │         │  │  Auth      │                  │
│  │  Client Components │──┼────────▶│  │  (Users +  │                  │
│  │  (Browser)         │  │  SDK    │  │   OAuth)   │                  │
│  └────────────────────┘  │         │  └────────────┘                  │
│                          │         │  ┌────────────┐                  │
│  ┌────────────────────┐  │         │  │  Storage   │                  │
│  │  Middleware         │  │         │  │  (Images)  │                  │
│  │  (Auth + Redirects)│  │         │  └────────────┘                  │
│  └────────────────────┘  │         │  ┌────────────┐                  │
│                          │         │  │  Realtime   │                  │
│  ┌────────────────────┐  │         │  │  (WebSocket)│                  │
│  │  Route Handlers    │  │         │  └────────────┘                  │
│  │  (Cron, Webhooks)  │  │         │  ┌────────────┐                  │
│  └────────────────────┘  │         │  │  Edge Funcs │                  │
│                          │         │  │  (Email)    │                  │
└──────────────────────────┘         └──────────────────────────────────┘
```

No separate backend server. Next.js Server Actions handle all business logic. Supabase provides the database, auth, file storage, realtime subscriptions, and edge functions.

### 1.2 Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Framework** | Next.js 15 (App Router) + TypeScript | SSR/SSG, file-based routing, Server Actions eliminate need for a separate API server |
| **Styling** | Tailwind CSS v4 | CSS-first config, utility-first, rapid UI development |
| **UI Components** | shadcn/ui | Accessible, composable primitives — copied into project, fully customizable |
| **Database** | Supabase (PostgreSQL) | Managed Postgres with RLS, realtime, auth, and storage built-in |
| **DB Client** | `@supabase/supabase-js` + `@supabase/ssr` | Type-safe SDK with SSR helpers for Next.js |
| **Auth** | Supabase Auth (email/password + Google OAuth) | Built-in session management, token refresh, OAuth providers |
| **Storage** | Supabase Storage | Image uploads with CDN, access policies, image transforms |
| **Realtime** | Supabase Realtime | WebSocket subscriptions on Postgres changes — replaces Socket.io |
| **Email** | Resend | Transactional emails (settlements, invites, weekly summaries) |
| **Cron** | Vercel Cron Jobs | Scheduled tasks (recurring expenses) |
| **Validation** | Zod | Schema validation in Server Actions and client forms |
| **CI/CD** | GitHub Actions | Automated linting and deployment |
| **Hosting** | Vercel (Next.js) + Supabase (managed) | Zero-config deployment, global edge network |

---

## 2. Data Models

### 2.1 Entity Relationship

```
auth.users ──── profiles ──┬──< group_members >──── groups
                           │                          │
                           ├──< expenses >────────────┘
                           │       │
                           │       ├──< expense_splits
                           │       └──< expense_audit_log
                           │
                           ├──< settlements
                           └──< friends
```

`auth.users` is managed by Supabase Auth. The `profiles` table extends it with app-specific fields.

### 2.2 Database Schema

#### profiles
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, references auth.users(id) ON DELETE CASCADE |
| email | VARCHAR(255) | NOT NULL (synced from auth.users) |
| name | VARCHAR(100) | NOT NULL |
| avatar_url | VARCHAR(500) | |
| description | VARCHAR(500) | |
| created_at | TIMESTAMPTZ | NOT NULL, default NOW() |
| updated_at | TIMESTAMPTZ | NOT NULL, default NOW() |

**Indexes:** `email`
**PRD Ref:** AUTH-1, AUTH-2, AUTH-3

Auto-populated via database trigger on `auth.users` insert:
```sql
CREATE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

#### groups
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, default gen_random_uuid() |
| name | VARCHAR(100) | NOT NULL |
| cover_image_url | VARCHAR(500) | |
| category | VARCHAR(20) | NOT NULL — enum: trip, home, couple, other |
| invite_code | VARCHAR(20) | UNIQUE, NOT NULL |
| is_archived | BOOLEAN | default FALSE |
| is_pinned | BOOLEAN | default FALSE |
| created_by | UUID | FK → profiles(id), NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL, default NOW() |
| updated_at | TIMESTAMPTZ | NOT NULL, default NOW() |

**Indexes:** `invite_code`, `created_by`
**PRD Ref:** GRP-1, GRP-2, GRP-5, GRP-6

#### group_members
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, default gen_random_uuid() |
| group_id | UUID | FK → groups(id) ON DELETE CASCADE |
| user_id | UUID | FK → profiles(id) ON DELETE CASCADE |
| role | VARCHAR(20) | default 'member' — enum: admin, member |
| joined_at | TIMESTAMPTZ | NOT NULL, default NOW() |

**Unique:** `(group_id, user_id)`
**PRD Ref:** GRP-2

#### expenses
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, default gen_random_uuid() |
| group_id | UUID | FK → groups(id), NULL for 1:1 expenses |
| description | VARCHAR(255) | NOT NULL |
| amount | DECIMAL(12,2) | NOT NULL, CHECK > 0 |
| currency | VARCHAR(3) | default 'INR' |
| date | DATE | NOT NULL, default CURRENT_DATE |
| paid_by | UUID | FK → profiles(id), NOT NULL |
| split_type | VARCHAR(20) | NOT NULL — enum: equal, exact, percentage, shares |
| category | VARCHAR(30) | default 'other' — enum: food, transport, accommodation, entertainment, utilities, shopping, other |
| image_url | VARCHAR(500) | |
| notes | TEXT | |
| is_recurring | BOOLEAN | default FALSE |
| recurrence_rule | VARCHAR(50) | iCal RRULE format |
| is_deleted | BOOLEAN | default FALSE (soft delete) |
| created_by | UUID | FK → profiles(id), NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL, default NOW() |
| updated_at | TIMESTAMPTZ | NOT NULL, default NOW() |

**Indexes:** `group_id` (partial, WHERE is_deleted = FALSE), `paid_by`, `date`, `category`
**PRD Ref:** EXP-1 through EXP-9

#### expense_splits
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, default gen_random_uuid() |
| expense_id | UUID | FK → expenses(id) ON DELETE CASCADE |
| user_id | UUID | FK → profiles(id) |
| amount | DECIMAL(12,2) | NOT NULL (computed owed amount) |
| share_value | DECIMAL(10,4) | Raw input value |

**Unique:** `(expense_id, user_id)`
**PRD Ref:** EXP-2

#### expense_audit_log
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, default gen_random_uuid() |
| expense_id | UUID | FK → expenses(id) |
| action | VARCHAR(20) | NOT NULL — enum: created, updated, deleted |
| changed_by | UUID | FK → profiles(id) |
| old_values | JSONB | |
| new_values | JSONB | |
| created_at | TIMESTAMPTZ | NOT NULL, default NOW() |

**PRD Ref:** EXP-7

#### settlements
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, default gen_random_uuid() |
| group_id | UUID | FK → groups(id), NULL for 1:1 |
| paid_by | UUID | FK → profiles(id), NOT NULL |
| paid_to | UUID | FK → profiles(id), NOT NULL |
| amount | DECIMAL(12,2) | NOT NULL, CHECK > 0 |
| notes | TEXT | |
| created_at | TIMESTAMPTZ | NOT NULL, default NOW() |

**PRD Ref:** BAL-4, BAL-5

#### friends
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, default gen_random_uuid() |
| user_id | UUID | FK → profiles(id) |
| friend_id | UUID | FK → profiles(id) |
| created_at | TIMESTAMPTZ | NOT NULL, default NOW() |

**Unique:** `(user_id, friend_id)`, **Check:** `user_id <> friend_id`
**PRD Ref:** EXP-8

### 2.3 Row Level Security (RLS) Policies

RLS enforces authorization at the database layer. All tables have `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.

#### profiles
| Operation | Policy |
|-----------|--------|
| SELECT | Any authenticated user (needed for search, member lists) |
| UPDATE | `auth.uid() = id` (own profile only) |
| INSERT | Handled by trigger on `auth.users` |

#### groups
| Operation | Policy |
|-----------|--------|
| SELECT | User is a member: `EXISTS (SELECT 1 FROM group_members WHERE group_id = id AND user_id = auth.uid())` |
| INSERT | Any authenticated user |
| UPDATE | User is admin: `EXISTS (SELECT 1 FROM group_members WHERE group_id = id AND user_id = auth.uid() AND role = 'admin')` |
| DELETE | User is admin (same as UPDATE) |

#### group_members
| Operation | Policy |
|-----------|--------|
| SELECT | User is a member of the group |
| INSERT | User is admin of the group, OR user is joining via invite (handled in Server Action with service role) |
| DELETE | User is admin, OR `user_id = auth.uid()` (leave group) |

#### expenses
| Operation | Policy |
|-----------|--------|
| SELECT | User is a group member, OR user is payer/split participant for 1:1 expenses |
| INSERT | User is a group member |
| UPDATE | `created_by = auth.uid()` OR user is group admin |
| DELETE | `created_by = auth.uid()` OR user is group admin |

#### expense_splits
| Operation | Policy |
|-----------|--------|
| SELECT | User is a member of the expense's group |
| INSERT / UPDATE / DELETE | Managed atomically with expenses via Postgres functions (service role) |

#### expense_audit_log
| Operation | Policy |
|-----------|--------|
| SELECT | User is a member of the expense's group |
| INSERT | Service role only (via trigger or Server Action) |

#### settlements
| Operation | Policy |
|-----------|--------|
| SELECT | User is a group member, OR `paid_by = auth.uid()` OR `paid_to = auth.uid()` |
| INSERT | `paid_by = auth.uid()` OR `paid_to = auth.uid()` |

#### friends
| Operation | Policy |
|-----------|--------|
| SELECT | `user_id = auth.uid()` OR `friend_id = auth.uid()` |
| INSERT | `user_id = auth.uid()` |
| DELETE | `user_id = auth.uid()` OR `friend_id = auth.uid()` |

### 2.4 Database Functions (RPC)

Complex operations that require atomicity or multi-table logic are implemented as Postgres functions, called via `supabase.rpc()`.

#### `create_expense_with_splits(expense_data, splits_data)`
Creates an expense and its splits in a single transaction. Inserts an audit log entry. Returns the created expense.

#### `update_expense_with_splits(expense_id, expense_data, splits_data)`
Updates an expense and replaces its splits atomically. Logs old and new values to audit log. Uses `updated_at` check for optimistic locking.

#### `calculate_group_balances(p_group_id)`
Returns net balance per user and simplified debts for a group. Runs the balance computation and debt simplification algorithm in SQL for performance.

#### `calculate_overall_balances(p_user_id)`
Returns the user's net balance with every other user across all groups.

#### `process_recurring_expenses()`
Called by cron. Queries recurring expenses due today, clones them with new splits. Called with service role.

---

## 3. Application Logic

### 3.1 Conventions

- **Server Actions** (`src/actions/`) — all mutations (create, update, delete). Validated with Zod. Return `{ data }` or `{ error }`.
- **Data queries** (`src/lib/queries/`) — all reads, called from Server Components. Return typed data.
- **Route Handlers** (`src/app/api/`) — only for cron jobs and webhooks (not general API).
- **Supabase clients:**
  - `createServerClient()` — used in Server Actions, Server Components, and Middleware. Respects the user's session and RLS.
  - `createBrowserClient()` — used in Client Components for realtime subscriptions and direct storage uploads.
  - `createServiceClient()` — service role, bypasses RLS. Used only in cron jobs and admin operations.
- **Pagination:** Cursor-based — `{ cursor, limit }` params, default limit 20.
- **Error shape:**
```typescript
type ActionResult<T> =
  | { data: T; error: null }
  | { data: null; error: { code: string; message: string } }
```

### 3.2 Server Actions (Mutations)

#### Auth Actions (`src/actions/auth.ts`) — AUTH-1, AUTH-2, AUTH-3
| Action | Description |
|--------|-------------|
| `signUp(formData)` | Register with email + password via `supabase.auth.signUp()` |
| `signIn(formData)` | Login with email + password via `supabase.auth.signInWithPassword()` |
| `signInWithGoogle()` | Initiate Google OAuth via `supabase.auth.signInWithOAuth()` |
| `signOut()` | Logout via `supabase.auth.signOut()` |
| `updateProfile(formData)` | Update name, description in profiles table |
| `uploadAvatar(formData)` | Upload to Supabase Storage `avatars` bucket, update `avatar_url` |

#### Group Actions (`src/actions/groups.ts`) — GRP-1 through GRP-6
| Action | Description |
|--------|-------------|
| `createGroup(formData)` | Insert group + add creator as admin member (transaction) |
| `updateGroup(groupId, formData)` | Update group name, category, cover image |
| `deleteGroup(groupId)` | Delete group (cascade deletes members, expenses) |
| `toggleArchive(groupId)` | Toggle `is_archived` |
| `togglePin(groupId)` | Toggle `is_pinned` |
| `regenerateInviteCode(groupId)` | Generate new invite code |
| `joinGroup(inviteCode)` | Look up group by invite code, add current user as member |
| `removeMember(groupId, userId)` | Remove member from group |

#### Expense Actions (`src/actions/expenses.ts`) — EXP-1 through EXP-9
| Action | Description |
|--------|-------------|
| `createExpense(formData)` | Validate splits, call `create_expense_with_splits` RPC |
| `updateExpense(expenseId, formData)` | Validate splits, call `update_expense_with_splits` RPC |
| `deleteExpense(expenseId)` | Soft-delete (`is_deleted = true`), log to audit |
| `createDirectExpense(formData)` | Create 1:1 expense (group_id = NULL) |

#### Settlement Actions (`src/actions/settlements.ts`) — BAL-4, BAL-5
| Action | Description |
|--------|-------------|
| `recordSettlement(formData)` | Insert settlement record |
| `settleAll(groupId)` | Compute all debts, create settlement records for each |

### 3.3 Data Queries (Reads)

Called from Server Components using the server Supabase client. All queries respect RLS.

#### Profile Queries (`src/lib/queries/profiles.ts`)
| Function | Description |
|----------|-------------|
| `getCurrentProfile()` | Get current user's profile |
| `searchProfiles(query)` | Search by name or email (for adding members) |

#### Group Queries (`src/lib/queries/groups.ts`)
| Function | Description |
|----------|-------------|
| `getUserGroups()` | List current user's groups (with member count, recent activity) |
| `getGroupDetail(groupId)` | Group info + members + summary |
| `getGroupMembers(groupId)` | List members with profiles |
| `getGroupBalances(groupId)` | Call `calculate_group_balances` RPC |

#### Expense Queries (`src/lib/queries/expenses.ts`)
| Function | Description |
|----------|-------------|
| `getGroupExpenses(groupId, cursor?)` | Paginated group expenses with splits |
| `getExpenseDetail(expenseId)` | Single expense with splits + audit log |
| `getDirectExpenses(cursor?)` | Paginated 1:1 expenses for current user |

#### Settlement Queries (`src/lib/queries/settlements.ts`)
| Function | Description |
|----------|-------------|
| `getGroupSettlements(groupId)` | List settlements for a group |

#### Balance Queries (`src/lib/queries/balances.ts`)
| Function | Description |
|----------|-------------|
| `getOverallBalances()` | Call `calculate_overall_balances` RPC |
| `getBalanceWithUser(userId)` | Net balance with a specific user |

#### Analytics Queries (`src/lib/queries/analytics.ts`)
| Function | Description |
|----------|-------------|
| `getMonthlyBreakdown(month)` | Monthly spending by category |
| `getGroupSummary(groupId)` | Group spending summary |

### 3.4 Route Handlers

Minimal — only for endpoints that cannot be Server Actions.

| Route | Purpose |
|-------|---------|
| `app/auth/callback/route.ts` | Supabase OAuth callback (exchanges code for session) |
| `app/api/cron/recurring-expenses/route.ts` | Vercel Cron — process recurring expenses daily |
| `app/api/webhooks/email/route.ts` | Resend webhook for delivery status (optional) |

### 3.5 Key Examples

**Create Expense Server Action:**
```typescript
'use server'

import { createServerClient } from '@/lib/supabase/server'
import { expenseSchema } from '@/lib/validators/expense'

export async function createExpense(formData: FormData) {
  const supabase = await createServerClient()
  const parsed = expenseSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } }
  }

  const splits = calculateSplits(parsed.data)
  const { data, error } = await supabase.rpc('create_expense_with_splits', {
    expense_data: parsed.data,
    splits_data: splits,
  })

  if (error) return { data: null, error: { code: 'DB_ERROR', message: error.message } }
  revalidatePath(`/groups/${parsed.data.group_id}`)
  return { data, error: null }
}
```

**Server Component data fetching:**
```typescript
// app/(protected)/groups/[id]/page.tsx
import { getGroupDetail } from '@/lib/queries/groups'
import { getGroupExpenses } from '@/lib/queries/expenses'
import { getGroupBalances } from '@/lib/queries/balances'

export default async function GroupDetailPage({ params }: { params: { id: string } }) {
  const [group, expenses, balances] = await Promise.all([
    getGroupDetail(params.id),
    getGroupExpenses(params.id),
    getGroupBalances(params.id),
  ])
  return <GroupDetailView group={group} expenses={expenses} balances={balances} />
}
```

**Realtime subscription (Client Component):**
```typescript
'use client'

import { createBrowserClient } from '@/lib/supabase/client'
import { useEffect } from 'react'

export function useGroupRealtime(groupId: string, onUpdate: () => void) {
  useEffect(() => {
    const supabase = createBrowserClient()
    const channel = supabase
      .channel(`group-${groupId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'expenses',
        filter: `group_id=eq.${groupId}`,
      }, onUpdate)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'settlements',
        filter: `group_id=eq.${groupId}`,
      }, onUpdate)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [groupId, onUpdate])
}
```

---

## 4. Core Algorithms

### 4.1 Split Calculation (EXP-2)

All split types must produce amounts that sum exactly to the expense total. Rounding remainders will be assigned to the last participant. Implemented in `src/lib/algorithms/splits.ts` and reused in Server Actions and client-side preview.

| Split Type | Logic |
|-----------|-------|
| **Equal** | `floor(total / n)` per person, remainder added to last |
| **Exact** | Validate sum === total, use provided amounts directly |
| **Percentage** | `round(total × pct / 100)` per person, remainder adjusted on last |
| **Shares** | `round(total × shares / totalShares)` per person, remainder adjusted on last |

### 4.2 Simplified Debt Algorithm (BAL-2)

Minimizes the number of transactions needed to settle all debts using a greedy net-balance approach. Implemented both in TypeScript (`src/lib/algorithms/debt.ts`) for client preview and as a Postgres function for server-side computation.

1. Compute net balance per user (total paid − total owed ± settlements)
2. Separate into creditors (positive) and debtors (negative)
3. Sort both descending by absolute amount
4. Greedily match largest debtor → largest creditor, settle `min(debt, credit)`
5. Repeat until all balances are zero

Produces at most `n - 1` transactions for `n` users.

### 4.3 Balance Computation (BAL-1)

Per-user net balance in a group:

```
net_balance = total_paid_for_expenses
            − total_owed_from_splits
            − total_settlements_paid_out
            + total_settlements_received
```

Computed via the `calculate_group_balances` Postgres function for accuracy and performance.

---

## 5. Authentication & Security

### 5.1 Supabase Auth

| Feature | Detail |
|---------|--------|
| Email/Password | `supabase.auth.signUp()` / `signInWithPassword()` — bcrypt hashing handled by Supabase |
| Google OAuth | `supabase.auth.signInWithOAuth({ provider: 'google' })` — callback at `/auth/callback` |
| Session Management | JWT access token (1 hour) + refresh token, managed via `@supabase/ssr` cookies |
| Token Refresh | Automatic via `@supabase/ssr` middleware — refreshes on every request if needed |
| Profile Creation | Trigger on `auth.users` insert automatically creates `profiles` row |

### 5.2 Security Measures

| Concern | Solution |
|---------|----------|
| Input Validation | Zod schemas on all Server Actions |
| SQL Injection | Parameterized queries via Supabase SDK |
| XSS | React's default escaping + Next.js security headers + Content-Security-Policy |
| CSRF | Built into Next.js Server Actions (origin check + bound tokens) |
| Authorization | Supabase RLS policies enforce access at the database layer |
| Rate Limiting | Supabase Auth built-in rate limits + Next.js Middleware for app-level limits |
| Image Uploads | Supabase Storage policies (type validation: JPEG/PNG, 5MB limit) |
| Audit Trail | All expense mutations logged to expense_audit_log via DB trigger |
| HTTPS | Enforced by Vercel (frontend) and Supabase (backend) |
| Environment Secrets | `SUPABASE_SECRET_KEY` server-only, never exposed to client |

### 5.3 Authorization Matrix

Enforced via RLS policies (see Section 2.3).

| Resource | View | Create | Edit | Delete |
|----------|------|--------|------|--------|
| Group | Members only | Any authenticated user | Admin only | Admin only |
| Expense | Group members | Group members | Creator or admin | Creator or admin |
| Settlement | Group members | Involved parties | — | — |
| 1:1 Expense | Two involved users | Two involved users | Creator | Creator |

### 5.4 Next.js Middleware

`middleware.ts` at project root handles:

1. **Session refresh** — calls `supabase.auth.getUser()` to refresh tokens on every request
2. **Auth redirects** — unauthenticated users hitting `/(protected)/*` routes are redirected to `/login`
3. **Guest redirects** — authenticated users hitting `/(auth)/*` routes are redirected to `/dashboard`

---

## 6. Frontend Architecture

### 6.1 Project Structure

```
splitfree/
├── public/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Root layout (providers, global styles)
│   │   ├── page.tsx                  # Landing → redirect to /dashboard or /login
│   │   ├── (auth)/                   # Auth route group
│   │   │   ├── layout.tsx            # Centered card layout
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (protected)/              # Authenticated route group
│   │   │   ├── layout.tsx            # Sidebar/bottom nav layout
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── groups/
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx
│   │   │   │       ├── settings/page.tsx
│   │   │   │       ├── add-expense/page.tsx
│   │   │   │       └── settle/page.tsx
│   │   │   ├── expenses/
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── analytics/page.tsx
│   │   │   └── profile/page.tsx
│   │   ├── join/
│   │   │   └── [inviteCode]/page.tsx
│   │   ├── auth/
│   │   │   └── callback/route.ts     # Supabase OAuth callback
│   │   └── api/
│   │       └── cron/
│   │           └── recurring-expenses/route.ts
│   ├── actions/                      # Server Actions
│   │   ├── auth.ts
│   │   ├── groups.ts
│   │   ├── expenses.ts
│   │   └── settlements.ts
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts             # Browser client (createBrowserClient)
│   │   │   ├── server.ts             # Server client (createServerClient)
│   │   │   └── service.ts            # Service role client (admin ops, cron)
│   │   ├── queries/                  # Data access functions for Server Components
│   │   │   ├── profiles.ts
│   │   │   ├── groups.ts
│   │   │   ├── expenses.ts
│   │   │   ├── settlements.ts
│   │   │   ├── balances.ts
│   │   │   └── analytics.ts
│   │   ├── validators/               # Zod schemas
│   │   │   ├── auth.ts
│   │   │   ├── group.ts
│   │   │   ├── expense.ts
│   │   │   └── settlement.ts
│   │   ├── algorithms/               # Pure business logic
│   │   │   ├── splits.ts
│   │   │   └── debt.ts
│   │   └── email.ts                  # Resend client
│   ├── components/
│   │   ├── ui/                       # shadcn/ui primitives (Button, Input, Dialog, Card, etc.)
│   │   ├── expenses/                 # ExpenseCard, SplitSelector, CategoryPicker
│   │   ├── groups/                   # GroupCard, MemberList, BalanceBar, InviteModal
│   │   └── charts/                   # PieChart, BarChart (Recharts wrappers)
│   ├── hooks/
│   │   ├── use-realtime.ts           # Supabase Realtime subscriptions
│   │   └── use-optimistic.ts         # Optimistic update helpers
│   ├── types/
│   │   └── database.ts              # Generated: npx supabase gen types typescript
│   ├── utils/                        # Formatting, date helpers
│   └── constants/                    # Categories, enums
├── supabase/
│   ├── migrations/                   # SQL migration files (applied via Supabase Dashboard or CLI)
│   │   ├── 00001_create_profiles.sql
│   │   ├── 00002_create_groups.sql
│   │   ├── 00003_create_expenses.sql
│   │   ├── 00004_create_settlements.sql
│   │   ├── 00005_create_friends.sql
│   │   ├── 00006_rls_policies.sql
│   │   └── 00007_functions.sql
├── middleware.ts                      # Auth session refresh + route protection
├── components.json                   # shadcn/ui configuration
├── next.config.ts
└── package.json
```

### 6.2 Route Structure

Routes are defined via the Next.js App Router file-system convention:

```
/                         → Redirect to /dashboard or /login      (app/page.tsx)
/login                    → LoginPage                              (app/(auth)/login/page.tsx)
/register                 → RegisterPage                           (app/(auth)/register/page.tsx)
/dashboard                → DashboardPage (group list + balance)   (app/(protected)/dashboard/page.tsx)
/groups/new               → CreateGroupPage                        (app/(protected)/groups/new/page.tsx)
/groups/:id               → GroupDetailPage (expenses + balances)  (app/(protected)/groups/[id]/page.tsx)
/groups/:id/settings      → GroupSettingsPage                      (app/(protected)/groups/[id]/settings/page.tsx)
/groups/:id/add-expense   → AddExpensePage                         (app/(protected)/groups/[id]/add-expense/page.tsx)
/groups/:id/settle        → SettleUpPage                           (app/(protected)/groups/[id]/settle/page.tsx)
/expenses/:id             → ExpenseDetailPage                      (app/(protected)/expenses/[id]/page.tsx)
/analytics                → AnalyticsPage                          (app/(protected)/analytics/page.tsx)
/profile                  → ProfilePage                            (app/(protected)/profile/page.tsx)
/join/:inviteCode         → Join group via invite link             (app/join/[inviteCode]/page.tsx)
```

### 6.3 Key Libraries

| Library | Purpose |
|---------|---------|
| `next` | Framework (SSR, routing, Server Actions, bundling) |
| `react` + `react-dom` | UI framework |
| `@supabase/supabase-js` | Supabase SDK |
| `@supabase/ssr` | Supabase SSR helpers (cookie-based auth for Next.js) |
| `tailwindcss` v4 | Styling (CSS-first config via `@theme` in CSS, no `tailwind.config.ts`) |
| `shadcn/ui` | Accessible UI primitives (Dialog, Card, Select, DropdownMenu, etc.) |
| `recharts` | Charts for analytics (RPT-1, RPT-2) |
| `react-hook-form` + `zod` | Form handling + validation |
| `date-fns` | Date formatting |
| `react-dropzone` | Image upload drag-and-drop |
| `lucide-react` | Icons |
| `sonner` | Toast notifications |
| `resend` | Transactional email |

### 6.4 Responsive Design

The web app will be designed **mobile-first** and responsive across breakpoints:

| Breakpoint | Target |
|-----------|--------|
| < 640px | Mobile phones |
| 640–1024px | Tablets |
| > 1024px | Desktop |

The layout will use a sidebar navigation on desktop and a bottom/hamburger nav on mobile viewports.

---

## 7. Supabase Configuration

### 7.1 Storage Buckets

| Bucket | Purpose | Public | Max Size | Allowed Types |
|--------|---------|--------|----------|---------------|
| `avatars` | User profile images | Yes | 2MB | image/jpeg, image/png, image/webp |
| `expense-images` | Expense receipt/bill images | Yes | 5MB | image/jpeg, image/png |
| `group-covers` | Group cover images | Yes | 2MB | image/jpeg, image/png, image/webp |

**Storage policies:**
- `avatars`: Authenticated users can upload to their own folder (`{user_id}/*`). Public read.
- `expense-images`: Group members can upload. Public read.
- `group-covers`: Group admins can upload. Public read.

**Image upload flow (EXP-3):**
1. Client validates file type and size
2. Client uploads directly via `supabase.storage.from('expense-images').upload(path, file)`
3. On success, Server Action updates `expenses.image_url` with the storage path
4. Display via Supabase Storage public URL (CDN-backed)

### 7.2 Realtime

Supabase Realtime provides WebSocket subscriptions on Postgres table changes, replacing the need for Socket.io.

**Subscribed channels:**

| Channel | Table | Events | Use Case |
|---------|-------|--------|----------|
| `group-{id}` | expenses | INSERT, UPDATE, DELETE | Live expense list updates |
| `group-{id}` | settlements | INSERT | Live settlement notifications |
| `group-{id}` | group_members | INSERT, DELETE | Member join/leave |
| `user-{id}` | group_members | INSERT | Notification when added to a group |

Client components subscribe via the `useGroupRealtime` hook and trigger `router.refresh()` to re-fetch Server Component data.

### 7.3 Cron Jobs

| Job | Schedule | Implementation | Description |
|-----|----------|---------------|-------------|
| Recurring expenses | `0 0 * * *` (daily midnight UTC) | Vercel Cron → `app/api/cron/recurring-expenses/route.ts` | Clones due recurring expenses with splits |
| Weekly summary email | `0 9 * * 1` (Monday 9 AM UTC) | Vercel Cron → `app/api/cron/weekly-summary/route.ts` | Sends balance summaries to opted-in users |

Cron route handlers use the service role Supabase client (bypasses RLS) and are protected with a `CRON_SECRET` header check.

### 7.4 Supabase Environments

Two separate Supabase projects (no local dev environment):

| Environment | Purpose | Vercel Branch |
|-------------|---------|---------------|
| **Development** | Day-to-day development and staging | All non-production branches |
| **Production** | Live user-facing app | `main` branch |

Migrations are written as SQL files in `supabase/migrations/` and applied manually via the Supabase Dashboard SQL editor or CLI (`supabase db push --linked`).

### 7.5 Environment Variables

| Variable | Context | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Supabase project URL (different per environment) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Client + Server | Supabase publishable key (safe for browser, RLS enforced) |
| `SUPABASE_SECRET_KEY` | Server only | Bypasses RLS — used in cron jobs and admin operations |
| `RESEND_API_KEY` | Server only | Email sending |
| `CRON_SECRET` | Server only | Vercel Cron job authentication |

Environment variables are configured per-environment in Vercel project settings (Development vs Production).

---

## 8. Notifications

| Channel | Use Case | Implementation |
|---------|----------|---------------|
| **In-app (Realtime)** | Live updates when user is online | Supabase Realtime subscriptions — new expenses, settlements, group invites trigger UI updates and toast notifications via `sonner` |
| **Email** | Offline notifications, summaries | Resend SDK called from Server Actions (settlements, invites) and Vercel Cron (weekly summaries) |

### Notification Events

| Event | Channel | Recipients |
|-------|---------|-----------|
| Expense added | In-app (Realtime) | Group members (excl. creator) |
| Expense updated | In-app (Realtime) | Group members (excl. editor) |
| Settlement recorded | In-app + Email | Counterparty |
| Group invite | In-app + Email | Invited user |
| Weekly summary | Email | All users (opt-in) |

---

## 9. Recurring Expenses (EXP-6)

- Stored with `is_recurring = true` and `recurrence_rule` (iCal RRULE format)
- A **Vercel Cron Job** runs daily at 00:00 UTC → `POST /api/cron/recurring-expenses`:
  1. Authenticate via `CRON_SECRET` header
  2. Use service role Supabase client
  3. Call `process_recurring_expenses()` Postgres function
  4. Function queries all recurring expenses due that day, clones expense + splits as new entries
  5. Realtime broadcasts notify affected group members

---

## 10. Caching Strategy

No Redis. Caching is handled at the Next.js and Supabase layers:

| Layer | Mechanism | Detail |
|-------|-----------|--------|
| **Page-level** | Next.js ISR / `revalidatePath()` | Group detail and dashboard pages revalidated after mutations |
| **Data-level** | `unstable_cache` / `fetch` cache | Expensive queries (balances, analytics) cached with tags, invalidated by Server Actions |
| **Client-level** | React `useOptimistic` + `useState` | Optimistic updates for immediate UI feedback, reconciled on Realtime events |
| **Database-level** | Postgres query planner cache | Indexed queries and materialized balance computation in functions |

Server Actions call `revalidatePath()` or `revalidateTag()` after every mutation to keep cached data fresh.

---

## 11. Error Handling

Centralized error handling across Server Actions:

```typescript
// src/lib/errors.ts
type AppErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_AUTHENTICATED'
  | 'NOT_AUTHORIZED'
  | 'NOT_FOUND'
  | 'INVALID_SPLIT'
  | 'CONFLICT'
  | 'INTERNAL_ERROR'

type ActionResult<T> =
  | { data: T; error: null }
  | { data: null; error: { code: AppErrorCode; message: string } }
```

- Server Actions catch Supabase errors and map them to `AppErrorCode`
- Client components check `result.error` and display via `sonner` toasts
- Unexpected errors are logged and return `INTERNAL_ERROR` without leaking details

---

## 12. Performance Targets

| Metric | Target |
|--------|--------|
| Server Action response (p95) | < 200ms |
| Balance calculation (Postgres function) | < 100ms |
| First Contentful Paint | < 1.5s |
| Largest Contentful Paint | < 2.5s |
| Bundle size (gzipped) | < 200KB initial |
| Image upload (5MB) | < 3s |
| Realtime event delivery | < 500ms |

---

## 13. Deployment Architecture

```
┌────────────────────────┐          ┌─────────────────────────────┐
│  Vercel                │          │  Supabase (Managed)         │
│                        │          │                             │
│  ┌──────────────────┐  │          │  ┌───────────────────┐      │
│  │  Next.js App     │  │   SDK    │  │  PostgreSQL       │      │
│  │  (SSR + Actions) │──┼─────────▶│  │  + RLS policies   │      │
│  └──────────────────┘  │          │  └───────────────────┘      │
│                        │          │  ┌───────────────────┐      │
│  ┌──────────────────┐  │          │  │  Auth             │      │
│  │  Edge Middleware  │  │          │  │  (Sessions, OAuth)│      │
│  └──────────────────┘  │          │  └───────────────────┘      │
│                        │          │  ┌───────────────────┐      │
│  ┌──────────────────┐  │          │  │  Storage (CDN)    │      │
│  │  Vercel Cron     │  │          │  │  (Images)         │      │
│  └──────────────────┘  │          │  └───────────────────┘      │
│                        │          │  ┌───────────────────┐      │
│  ┌──────────────────┐  │          │  │  Realtime         │      │
│  │  Edge Network    │  │          │  │  (WebSocket)      │      │
│  │  (Global CDN)    │  │          │  └───────────────────┘      │
│  └──────────────────┘  │          │                             │
└────────────────────────┘          └─────────────────────────────┘
```

- **Next.js App:** Deployed on Vercel — Server Components, Server Actions, and Route Handlers run on Vercel Serverless/Edge Functions. Static pages served via Vercel's global CDN.
- **Database:** Supabase managed PostgreSQL with RLS, automatic backups, point-in-time recovery.
- **Auth:** Supabase Auth — fully managed, zero infrastructure to maintain.
- **Storage:** Supabase Storage with CDN — images served globally.
- **Realtime:** Supabase Realtime — managed WebSocket infrastructure.
- **Cron:** Vercel Cron Jobs trigger Route Handlers on schedule.

No ECS, no ALB, no RDS, no ElastiCache, no S3 buckets to manage.

---

## 14. Development Phases

| Phase | Scope | Timeline |
|-------|-------|----------|
| **1 — Foundation** | Project setup (Next.js + Supabase), Supabase schema migrations + RLS policies + database functions, Supabase Auth (email + Google OAuth), profile trigger + CRUD, frontend scaffold with App Router + middleware + auth pages | Weeks 1–3 |
| **2 — Core Features** | Group CRUD + invite system, expense CRUD with all 4 split types (via Postgres functions), balance calculation + simplified debts, settlement recording, 1:1 expenses, frontend pages: dashboard, group detail, add expense, settle up | Weeks 4–7 |
| **3 — Enhanced Features** | Image uploads (Supabase Storage), expense categories + notes, analytics pages with charts, Supabase Realtime subscriptions for live updates, email notifications (Resend), archive/pin groups | Weeks 8–10 |
| **4 — Polish & P1** | Recurring expenses (Vercel Cron), itemized bill splitting, settle-all flow, audit trail UI, caching layer (revalidation + unstable_cache), responsive design polish | Weeks 11–13 |
| **5 — Launch** | Security audit (RLS review), domain + SSL (Vercel auto), monitoring + alerting (Sentry), production deployment, Supabase production project setup | Week 14 |

---

## 15. Monitoring & Observability

| Tool | Purpose |
|------|---------|
| **Sentry** | Error tracking (Next.js frontend + Server Actions) |
| **Vercel Analytics** | Web vitals, server function duration, edge latency |
| **Supabase Dashboard** | Database metrics, Auth activity, Storage usage, Realtime connections |
| **PostHog** | User analytics, page views, feature usage |

---

## 16. Open Questions

| # | Question | Recommendation |
|---|----------|---------------|
| 1 | Should the invite link flow require login first or allow sign-up inline? | Allow sign-up inline → redirects to group after account creation |
| 2 | 1:1 expenses — implicit group or standalone? | Standalone with virtual grouping in the UI |
| 3 | Itemized bill splitting (EXP-9) data model? | Separate `expense_items` table linked to `expense_splits` |
| 4 | Notification preferences granularity? | Per-group mute for v1, per-event-type in v2 |
| 5 | PWA support for mobile-like experience? | Defer to v2 — add service worker + manifest for installability |
| 6 | Real-time collaboration (multiple users editing same expense)? | Not needed for v1 — optimistic locking with `updated_at` check is sufficient |
| 7 | Supabase plan tier? | Free tier for dev, Pro ($25/mo) for production — sufficient for initial launch |
