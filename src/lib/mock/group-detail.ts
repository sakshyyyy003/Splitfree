import expenseDetails from "../../../mockdata/expense-details.json";
import groupBalances from "../../../mockdata/group-balances.json";
import groupDetails from "../../../mockdata/group-details.json";
import groupExpenses from "../../../mockdata/group-expenses.json";
import groupMembers from "../../../mockdata/group-members.json";

import type {
  GroupBalance,
  GroupBalanceSummary,
  GroupDetail,
  GroupExpenseDetail,
  GroupExpense,
  GroupMember,
} from "@/types/group-detail";

type GroupCollection<T> = Record<string, T[]>;

const details = groupDetails as GroupDetail[];
const expenseDetailsById = expenseDetails as Record<string, GroupExpenseDetail>;
const expensesByGroup = groupExpenses as GroupCollection<GroupExpense>;
const balanceSummaryByGroup = groupBalances as Record<string, GroupBalanceSummary>;
const membersByGroup = groupMembers as GroupCollection<GroupMember>;

export async function getMockGroupDetail(groupId: string) {
  return details.find((group) => group.id === groupId) ?? null;
}

export async function getMockGroupExpenses(groupId: string) {
  return expensesByGroup[groupId] ?? [];
}

export async function getMockGroupBalances(groupId: string) {
  return balanceSummaryByGroup[groupId]?.balances ?? [];
}

export async function getMockGroupBalanceSummary(groupId: string) {
  return (
    balanceSummaryByGroup[groupId] ?? {
      balances: [] as GroupBalance[],
      simplifiedDebts: [],
    }
  );
}

export async function getMockGroupMembers(groupId: string) {
  return membersByGroup[groupId] ?? [];
}

export async function getMockExpenseDetail(groupId: string, expenseId: string) {
  const expense = expenseDetailsById[expenseId];

  if (!expense || expense.groupId !== groupId) {
    return null;
  }

  return expense;
}
