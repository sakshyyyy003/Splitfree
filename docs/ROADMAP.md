# SplitFree — Roadmap

## Milestone 1: Foundation

> Project scaffolding, database setup, authentication, and basic app shell.

- [ ] **#1 Initialize Next.js 15 project with TypeScript and Tailwind v4**
  Set up project with App Router, configure `next.config.ts`, install shadcn/ui, set up `components.json`, add base dependencies (`@supabase/supabase-js`, `@supabase/ssr`, `zod`, `lucide-react`, `sonner`)

- [ ] **#2 Set up Supabase projects (dev + prod)**
  Create two Supabase projects, configure environment variables in Vercel (per-environment), set up Google OAuth provider in Supabase Auth dashboard

- [ ] **#3 Create database migrations: profiles table + auth trigger**
  Write SQL migration for `profiles` table, create `handle_new_user()` trigger function on `auth.users` insert, add RLS policies for profiles
  `PRD: AUTH-1, AUTH-2, AUTH-3`

- [ ] **#4 Create database migrations: groups and group_members tables**
  Write SQL migrations with indexes, RLS policies for groups (member-only SELECT, admin-only UPDATE/DELETE) and group_members
  `PRD: GRP-1, GRP-2`

- [ ] **#5 Create database migrations: expenses, expense_splits, expense_audit_log tables**
  Write SQL migrations with partial indexes, RLS policies, audit log trigger
  `PRD: EXP-1, EXP-2, EXP-7`

- [ ] **#6 Create database migrations: settlements and friends tables**
  Write SQL migrations with constraints, RLS policies
  `PRD: BAL-4, EXP-8`

- [ ] **#7 Set up Supabase client utilities**
  Create `src/lib/supabase/client.ts` (browser), `server.ts` (server components/actions), `service.ts` (service role for cron/admin)

- [ ] **#8 Implement Next.js middleware for auth**
  Session refresh via `supabase.auth.getUser()`, redirect unauthenticated users to `/login`, redirect authenticated users away from auth pages to `/dashboard`

- [ ] **#9 Build auth pages: Login and Register**
  Email/password sign up and sign in forms using `react-hook-form` + `zod`, Server Actions calling Supabase Auth, form error handling and loading states
  `PRD: AUTH-1`

- [ ] **#10 Implement Google OAuth sign-in**
  "Sign in with Google" button, OAuth callback route handler at `/auth/callback`, exchange code for session
  `PRD: AUTH-2`

- [ ] **#11 Build profile page**
  Display and edit name, description. Upload avatar to Supabase Storage `avatars` bucket. Server Action for `updateProfile` and `uploadAvatar`
  `PRD: AUTH-3`

- [ ] **#12 Create app shell layout for protected routes**
  `(protected)/layout.tsx` with sidebar navigation (desktop) and bottom nav (mobile), responsive breakpoints, user avatar + sign out in nav

---

## Milestone 2: Groups

> Full group lifecycle — create, view, manage members, invite system.

- [ ] **#13 Create `createGroup` Server Action + "New Group" page**
  Form: name, category (trip/home/couple/other), cover image upload to `group-covers` bucket. Auto-add creator as admin. Generate invite code.
  `PRD: GRP-1`

- [ ] **#14 Build dashboard page — group list**
  Server Component fetching user's groups via `getUserGroups()` query. Show group card with name, category, member count, net balance preview. Empty state for no groups.
  `PRD: GRP-4`

- [ ] **#15 Build group detail page**
  Server Component with parallel data fetching (group info, expenses, balances). Tab/section layout for expenses list, balances, and members.
  `PRD: GRP-4`

- [ ] **#16 Implement invite system — generate link and join group**
  `regenerateInviteCode` Server Action, `joinGroup(inviteCode)` Server Action, `/join/[inviteCode]` page (handles both logged-in and unauthenticated users)
  `PRD: GRP-2`

- [ ] **#17 Build group members list + remove member**
  Display members with roles (admin/member) on group detail page. Admin can remove members. `removeMember` Server Action.
  `PRD: GRP-2`

- [ ] **#18 Build group settings page**
  Edit group name, category, cover image. Delete group (admin only). `updateGroup` and `deleteGroup` Server Actions.
  `PRD: GRP-1`

- [ ] **#19 Implement user search for adding members**
  `searchProfiles(query)` — search by name or email. Used in invite flow and direct expense creation.
  `PRD: GRP-2`

---

## Milestone 3: Expenses & Splits

> Core expense creation, all split types, editing, and 1:1 expenses.

- [ ] **#20 Create `create_expense_with_splits` Postgres function**
  Atomic transaction: insert expense + insert all splits + insert audit log entry. Accept expense data and splits array. Return created expense.
  `PRD: EXP-1, EXP-2, EXP-7`

- [ ] **#21 Implement split calculation algorithm**
  `src/lib/algorithms/splits.ts` — equal, exact, percentage, shares. Rounding remainder assigned to last participant. Sum validation. Shared between Server Actions and client-side preview.
  `PRD: EXP-2`

- [ ] **#22 Build "Add Expense" page**
  Form: description, amount (INR), date, payer selection, split type selector, participant picker, category selector. Live split preview. `createExpense` Server Action.
  `PRD: EXP-1, EXP-2, EXP-4`

- [ ] **#23 Build expense detail page**
  Show expense info, split breakdown per participant, category, date, payer. Link to edit.
  `PRD: EXP-1`

- [ ] **#24 Implement expense editing**
  Create `update_expense_with_splits` Postgres function (atomic update + re-split + audit log with old/new values). `updateExpense` Server Action. Optimistic locking via `updated_at`.
  `PRD: EXP-7`

- [ ] **#25 Implement expense soft-delete**
  `deleteExpense` Server Action — sets `is_deleted = true`, logs to audit. Deleted expenses hidden from UI but preserved in DB.
  `PRD: EXP-7`

- [ ] **#26 Implement 1:1 (direct) expenses**
  `createDirectExpense` Server Action — `group_id = NULL`, involves exactly 2 users. Auto-add to friends table. `getDirectExpenses` query for listing.
  `PRD: EXP-8`

- [ ] **#27 Build expense list on group detail page**
  Paginated (cursor-based) expense list. Show description, amount, payer, date, category icon. Infinite scroll or "load more".
  `PRD: EXP-1`

---

## Milestone 4: Balances & Settlements

> Balance calculation, simplified debts, settlement recording, overall balances.

- [ ] **#28 Create `calculate_group_balances` Postgres function**
  Compute net balance per user (paid - owed - settlements_out + settlements_in). Run simplified debt algorithm in SQL. Return balances array + simplified debts array.
  `PRD: BAL-1, BAL-2`

- [ ] **#29 Implement simplified debt algorithm**
  `src/lib/algorithms/debt.ts` — greedy net-balance matching. Also implemented in the Postgres function. Produces at most n-1 transactions.
  `PRD: BAL-2`

- [ ] **#30 Build balance display on group detail page**
  Show each member's net balance (positive = owed, negative = owes). Show simplified debts as "X owes Y ₹Z". Visual balance bars.
  `PRD: BAL-1, BAL-2`

- [ ] **#31 Build "Settle Up" page**
  Show who owes whom in the group. Select a debt to settle. `recordSettlement` Server Action. Revalidate balances after settlement.
  `PRD: BAL-4`

- [ ] **#32 Create `calculate_overall_balances` Postgres function**
  Net balance with every other user across all groups and 1:1 expenses.
  `PRD: BAL-3`

- [ ] **#33 Build overall balance view on dashboard**
  Show total "you are owed" and "you owe" across all groups. Per-person breakdown. Link to settle.
  `PRD: BAL-3`

- [ ] **#34 Implement "balance with specific user" query**
  `getBalanceWithUser(userId)` — net balance with a specific person across all shared groups and direct expenses.
  `PRD: BAL-3`

---

## Milestone 5: Analytics

> Spending breakdowns and group summaries with charts.

- [ ] **#35 Implement monthly spending breakdown query**
  `getMonthlyBreakdown(month)` — aggregate expenses by category for a given month. Return category totals for chart rendering.
  `PRD: RPT-1`

- [ ] **#36 Implement group spending summary query**
  `getGroupSummary(groupId)` — total spent, per-member spending, category breakdown, date range.
  `PRD: RPT-2`

- [ ] **#37 Build analytics page**
  Month picker, pie chart (category breakdown), bar chart (daily/weekly spending). Use `recharts`. Server Component data fetching.
  `PRD: RPT-1, RPT-2`

- [ ] **#38 Add group spending summary section to group detail**
  Total group spending, top categories, top spenders. Link to full analytics.
  `PRD: RPT-2`

---

## Milestone 6: Enhanced Features

> Image uploads, notes, archive/pin, realtime, email notifications.

- [ ] **#39 Implement expense image upload**
  Client-side upload to Supabase Storage `expense-images` bucket. Update `image_url` via Server Action. Display image on expense detail. Type validation (JPEG/PNG), 5MB limit.
  `PRD: EXP-3`

- [ ] **#40 Add notes/comments to expenses**
  `notes` field in expense form (textarea). Display on expense detail page.
  `PRD: EXP-5`

- [ ] **#41 Implement archive/unarchive groups**
  `toggleArchive` Server Action. Archived groups hidden from main dashboard, shown in separate "Archived" section. Filter toggle.
  `PRD: GRP-5`

- [ ] **#42 Implement pin/unpin groups**
  `togglePin` Server Action. Pinned groups shown at top of dashboard group list.
  `PRD: GRP-6`

- [ ] **#43 Set up Supabase Realtime subscriptions**
  `useGroupRealtime` hook — subscribe to expenses, settlements, group_members changes. Trigger `router.refresh()` on change. Show toast for new expenses/settlements.

- [ ] **#44 Implement email notifications with Resend**
  Send email on: settlement recorded (to counterparty), group invite (to invited user). Set up Resend client in `src/lib/email.ts`. Email templates.

---

## Milestone 7: Polish & P1 Features

> Recurring expenses, itemized splitting, settle-all, audit trail, caching, responsive polish.

- [ ] **#45 Implement recurring expenses**
  `is_recurring` + `recurrence_rule` (iCal RRULE) fields in expense form. Vercel Cron Job (`/api/cron/recurring-expenses`) calling `process_recurring_expenses()` Postgres function daily. CRON_SECRET auth.
  `PRD: EXP-6`

- [ ] **#46 Implement itemized bill splitting**
  `expense_items` table (linked to expense). UI for adding line items with per-item participant selection. Compute splits from items.
  `PRD: EXP-9`

- [ ] **#47 Implement "Settle All" flow**
  `settleAll(groupId)` Server Action — compute all simplified debts, create settlement records for each. Confirmation dialog before executing.
  `PRD: BAL-5`

- [ ] **#48 Build audit trail UI**
  Show edit history on expense detail page. Query `expense_audit_log` for the expense. Display old→new values for each change with timestamp and who changed it.
  `PRD: EXP-7`

- [ ] **#49 Implement caching layer**
  Add `revalidatePath()` calls in all Server Actions. Use `unstable_cache` with tags for expensive queries (balances, analytics). `revalidateTag()` on mutations.

- [ ] **#50 Responsive design polish**
  Audit all pages at mobile/tablet/desktop breakpoints. Fix layout issues. Bottom nav on mobile, sidebar on desktop. Touch-friendly tap targets.

- [ ] **#51 Implement weekly summary email (cron)**
  Vercel Cron Job (`/api/cron/weekly-summary`) — Monday 9 AM UTC. Summarize outstanding balances per user. Opt-in preference in profile. Send via Resend.

---

## Milestone 8: Launch

> Security review, monitoring, production deployment.

- [ ] **#52 Security audit — RLS policy review**
  Review every RLS policy against the authorization matrix. Test unauthorized access attempts. Verify service role key is never exposed to client.

- [ ] **#53 Set up Sentry error tracking**
  Install `@sentry/nextjs`. Configure for both client and server. Source maps upload. Alert rules for error spikes.

- [ ] **#54 Set up Vercel Analytics**
  Enable Web Vitals tracking. Monitor server function durations and edge latency.

- [ ] **#55 Set up PostHog for user analytics**
  Page view tracking, feature usage events (expense created, group created, settlement recorded). Funnels for key flows.

- [ ] **#56 Configure production Supabase project**
  Apply all migrations to production. Configure Google OAuth redirect URLs. Set up Storage buckets and policies. Verify RLS policies. Configure Supabase Auth email templates.

- [ ] **#57 Configure production Vercel deployment**
  Set production environment variables. Connect custom domain. SSL auto-provisioned by Vercel. Set up Vercel Cron Jobs for production.

- [ ] **#58 Final smoke test on production**
  Register, create group, invite member, add expense (all split types), settle up, check analytics. Verify realtime, email notifications, and image uploads.
