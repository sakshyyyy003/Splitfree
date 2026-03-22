import { describe, it, expect } from 'vitest';
import { simplifyDebts, type MemberBalance } from './debt';

describe('simplifyDebts', () => {
  it('returns empty array when all balances are zero', () => {
    const balances: MemberBalance[] = [
      { userId: 'a', balance: 0 },
      { userId: 'b', balance: 0 },
    ];
    expect(simplifyDebts(balances)).toEqual([]);
  });

  it('returns empty array for empty input', () => {
    expect(simplifyDebts([])).toEqual([]);
  });

  it('handles simple two-person debt', () => {
    const balances: MemberBalance[] = [
      { userId: 'a', balance: 100 },  // creditor
      { userId: 'b', balance: -100 }, // debtor
    ];
    const debts = simplifyDebts(balances);
    expect(debts).toHaveLength(1);
    expect(debts[0]).toEqual({
      fromUserId: 'b',
      toUserId: 'a',
      amount: 100,
    });
  });

  it('handles three-person debt simplification', () => {
    const balances: MemberBalance[] = [
      { userId: 'a', balance: 200 },  // owed 200
      { userId: 'b', balance: -120 }, // owes 120
      { userId: 'c', balance: -80 },  // owes 80
    ];
    const debts = simplifyDebts(balances);
    expect(debts).toHaveLength(2);

    const totalPaid = debts.reduce((s, d) => s + d.amount, 0);
    expect(totalPaid).toBe(200);

    // b pays a 120, c pays a 80
    expect(debts.find((d) => d.fromUserId === 'b')?.amount).toBe(120);
    expect(debts.find((d) => d.fromUserId === 'c')?.amount).toBe(80);
  });

  it('simplifies complex multi-person debts', () => {
    const balances: MemberBalance[] = [
      { userId: 'a', balance: 300 },
      { userId: 'b', balance: -100 },
      { userId: 'c', balance: -50 },
      { userId: 'd', balance: -150 },
    ];
    const debts = simplifyDebts(balances);

    // Total debts should equal total credits
    const totalFrom = debts.reduce((s, d) => s + d.amount, 0);
    expect(totalFrom).toBe(300);

    // Should produce at most n-1 = 3 transactions
    expect(debts.length).toBeLessThanOrEqual(3);
  });

  it('handles multiple creditors and debtors', () => {
    const balances: MemberBalance[] = [
      { userId: 'a', balance: 150 },
      { userId: 'b', balance: 50 },
      { userId: 'c', balance: -100 },
      { userId: 'd', balance: -100 },
    ];
    const debts = simplifyDebts(balances);

    const totalDebts = debts.reduce((s, d) => s + d.amount, 0);
    expect(totalDebts).toBe(200);

    // All fromUserIds should be debtors
    for (const debt of debts) {
      expect(['c', 'd']).toContain(debt.fromUserId);
      expect(['a', 'b']).toContain(debt.toUserId);
      expect(debt.amount).toBeGreaterThan(0);
    }
  });

  it('skips members with zero balance', () => {
    const balances: MemberBalance[] = [
      { userId: 'a', balance: 50 },
      { userId: 'b', balance: 0 },
      { userId: 'c', balance: -50 },
    ];
    const debts = simplifyDebts(balances);
    expect(debts).toHaveLength(1);
    expect(debts[0].fromUserId).toBe('c');
    expect(debts[0].toUserId).toBe('a');
    expect(debts[0].amount).toBe(50);
  });

  it('handles floating-point amounts correctly', () => {
    const balances: MemberBalance[] = [
      { userId: 'a', balance: 33.33 },
      { userId: 'b', balance: -16.67 },
      { userId: 'c', balance: -16.66 },
    ];
    const debts = simplifyDebts(balances);
    const totalPaid = debts.reduce((s, d) => s + Math.round(d.amount * 100), 0);
    expect(totalPaid).toBe(3333);
  });

  it('produces correct direction (from debtor to creditor)', () => {
    const balances: MemberBalance[] = [
      { userId: 'rich', balance: 500 },
      { userId: 'poor', balance: -500 },
    ];
    const debts = simplifyDebts(balances);
    expect(debts[0].fromUserId).toBe('poor');
    expect(debts[0].toUserId).toBe('rich');
  });

  it('handles single creditor with many debtors', () => {
    const balances: MemberBalance[] = [
      { userId: 'a', balance: 300 },
      { userId: 'b', balance: -100 },
      { userId: 'c', balance: -100 },
      { userId: 'd', balance: -100 },
    ];
    const debts = simplifyDebts(balances);
    expect(debts).toHaveLength(3);
    expect(debts.every((d) => d.toUserId === 'a')).toBe(true);
    expect(debts.every((d) => d.amount === 100)).toBe(true);
  });
});
