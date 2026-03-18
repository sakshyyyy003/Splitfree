# Product Requirements Document (PRD)
## SplitFree — Expense Splting App

**Version:** 1.0
**Date:** 2026-03-18
**Status:** Draft

---

## 1. Overview

### 1.1 Problem Statement
Splitting expenses among friends, roommates, and travel companions is a common pain point. Users need a simple and reliable tool to track shared expenses and settle balances.

### 1.2 Product Vision
SplitFree is a simple web-based expense-splitting app focused on core shared expense tracking and settlement flows.

### 1.3 Target Users
- Roommates splitting rent, utilities, groceries
- Friend groups sharing dining, entertainment, and travel costs
- Couples managing shared finances
- Coworkers managing team lunches and shared purchases

---

## 2. Goals

### 2.1 Goals
| Goal | Description |
|------|-------------|
| **G1** | Provide core expense-splitting features |
| **G2** | Deliver a clean and intuitive user experience |
| **G3** | Enable quick expense entry and balance tracking |

---

## 3. Core Features

### 3.1 User Accounts & Authentication

| ID | Requirement | Priority |
|----|-------------|----------|
| AUTH-1 | Sign up / log in via email + password | P0 |
| AUTH-2 | Sign up / log in via Google OAuth | P0 |
| AUTH-3 | Profile management (name, avatar, description) | P0 |

### 3.2 Groups

| ID | Requirement | Priority |
|----|-------------|----------|
| GRP-1 | Create groups with a name, cover image, and category (Trip, Home, Couple, Other) | P0 |
| GRP-2 | Invite members via link, phone contact, or username | P0 |
| GRP-3 | INR is the only supported currency in the app | P0 |
| GRP-4 | Group-level expense summary and balances | P0 |
| GRP-5 | Archive/delete groups | P1 |
| GRP-6 | Pin frequently used groups | P2 |

### 3.3 Expense Management

| ID | Requirement | Priority |
|----|-------------|----------|
| EXP-1 | Add an expense with: description, amount, date, payer, split participants | P0 |
| EXP-2 | Split types: equal, exact amounts, percentage, shares/ratio | P0 |
| EXP-3 | Add image as an optional attachment to an expense | P1 |
| EXP-4 | Categorize expenses (Food, Transport, Accommodation, Entertainment, Utilities, Shopping, Other) | P0 |
| EXP-5 | Add notes/comments to expenses | P1 |
| EXP-6 | Recurring expenses (monthly rent, subscriptions) | P1 |
| EXP-7 | Edit and delete expenses (with audit trail) | P0 |
| EXP-8 | Expense between two people without a group (1:1 expense) | P0 |
| EXP-9 | Itemized bill splitting (split by individual items) | P1 |

### 3.4 Balances & Settlements

| ID | Requirement | Priority |
|----|-------------|----------|
| BAL-1 | Real-time balance calculation per group | P0 |
| BAL-2 | Simplified debt algorithm (minimize number of transactions to settle) | P0 |
| BAL-3 | Overall balance view across all groups | P0 |
| BAL-4 | Record a cash/manual settlement | P0 |
| BAL-5 | "Settle all" option to mark all debts as cleared | P1 |

### 3.5 Analytics & Reports

| ID | Requirement | Priority |
|----|-------------|----------|
| RPT-1 | Monthly spending breakdown by category (charts) | P0 |
| RPT-2 | Group spending summary | P0 |

---

## 4. User Flows

### 4.1 Add an Expense (Happy Path)
```text
1. User opens group and taps "+" button
2. Enters description
3. Enters amount (INR)
4. Selects payer
5. Selects split type
6. Optionally adds image, category, and note
7. Taps "Save"
8. Expense is added to the group
9. Balances update in real time
```

### 4.2 Settle Up
```text
1. User views group balance
2. User sees who owes whom
3. User records a manual settlement
4. Balances update
```

### 4.3 Create a Group
```text
1. User taps "New Group"
2. Names the group
3. Selects category
4. Currency is fixed as INR
5. Invites members
6. Group is created and members can add expenses
```

---
