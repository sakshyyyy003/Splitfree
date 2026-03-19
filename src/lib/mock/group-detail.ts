import groupBalances from "../../../mockdata/group-balances.json";
import groupDetails from "../../../mockdata/group-details.json";
import groupExpenses from "../../../mockdata/group-expenses.json";
import groupMembers from "../../../mockdata/group-members.json";

import type {
  GroupBalance,
  GroupDetail,
  GroupExpense,
  GroupMember,
} from "@/types/group-detail";

type GroupCollection<T> = Record<string, T[]>;

const details = groupDetails as GroupDetail[];
const expensesByGroup = groupExpenses as GroupCollection<GroupExpense>;
const balancesByGroup = groupBalances as GroupCollection<GroupBalance>;
const membersByGroup = groupMembers as GroupCollection<GroupMember>;

export async function getMockGroupDetail(groupId: string) {
  return details.find((group) => group.id === groupId) ?? null;
}

export async function getMockGroupExpenses(groupId: string) {
  return expensesByGroup[groupId] ?? [];
}

export async function getMockGroupBalances(groupId: string) {
  return balancesByGroup[groupId] ?? [];
}

export async function getMockGroupMembers(groupId: string) {
  return membersByGroup[groupId] ?? [];
}
