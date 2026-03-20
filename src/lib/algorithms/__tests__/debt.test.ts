import { describe, expect, it } from "vitest";

import {
  simplifyDebts,
  type MemberBalance,
  type SimplifiedDebt,
} from "@/lib/algorithms/debt";

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

/** Sum all debt amounts (in cents) and verify no money appears or vanishes. */
function expectDebtsSumToBalance(
  debts: SimplifiedDebt[],
  balances: MemberBalance[],
): void {
  const totalOwed = balances
    .filter((b) => b.balance > 0)
    .reduce((sum, b) => sum + Math.round(b.balance * 100), 0);

  const totalDebtCents = debts.reduce(
    (sum, d) => sum + Math.round(d.amount * 100),
    0,
  );

  expect(totalDebtCents).toBe(totalOwed);
}

/** Assert the n-1 upper bound: simplified debts never exceed memberCount - 1. */
function expectAtMostNMinusOneDebts(
  debts: SimplifiedDebt[],
  memberCount: number,
): void {
  const upperBound = Math.max(memberCount - 1, 0);
  expect(debts.length).toBeLessThanOrEqual(upperBound);
}

// -------------------------------------------------------------------
// Empty input
// -------------------------------------------------------------------

describe("simplifyDebts — empty input", () => {
  it("returns no debts for an empty balances array", () => {
    const debts = simplifyDebts([]);

    expect(debts).toEqual([]);
  });
});

// -------------------------------------------------------------------
// Single user
// -------------------------------------------------------------------

describe("simplifyDebts — single user", () => {
  it("returns no debts when there is only one member with a positive balance", () => {
    const debts = simplifyDebts([{ userId: "alice", balance: 50 }]);

    expect(debts).toEqual([]);
  });

  it("returns no debts when there is only one member with a negative balance", () => {
    const debts = simplifyDebts([{ userId: "bob", balance: -30 }]);

    expect(debts).toEqual([]);
  });

  it("returns no debts when there is only one member with zero balance", () => {
    const debts = simplifyDebts([{ userId: "carol", balance: 0 }]);

    expect(debts).toEqual([]);
  });
});

// -------------------------------------------------------------------
// All-settled / zero balances
// -------------------------------------------------------------------

describe("simplifyDebts — all-settled / zero balances", () => {
  it("returns no debts when all balances are zero", () => {
    const debts = simplifyDebts([
      { userId: "alice", balance: 0 },
      { userId: "bob", balance: 0 },
      { userId: "carol", balance: 0 },
    ]);

    expect(debts).toEqual([]);
  });
});

// -------------------------------------------------------------------
// Two users
// -------------------------------------------------------------------

describe("simplifyDebts — two users", () => {
  it("produces a single debt from debtor to creditor", () => {
    const balances: MemberBalance[] = [
      { userId: "alice", balance: 50 },
      { userId: "bob", balance: -50 },
    ];
    const debts = simplifyDebts(balances);

    expect(debts).toHaveLength(1);
    expect(debts[0]).toEqual({
      fromUserId: "bob",
      toUserId: "alice",
      amount: 50,
    });
    expectDebtsSumToBalance(debts, balances);
    expectAtMostNMinusOneDebts(debts, 2);
  });

  it("handles amounts with cents correctly", () => {
    const balances: MemberBalance[] = [
      { userId: "alice", balance: 25.75 },
      { userId: "bob", balance: -25.75 },
    ];
    const debts = simplifyDebts(balances);

    expect(debts).toHaveLength(1);
    expect(debts[0]).toEqual({
      fromUserId: "bob",
      toUserId: "alice",
      amount: 25.75,
    });
    expectDebtsSumToBalance(debts, balances);
  });

  it("handles small amounts (0.01)", () => {
    const balances: MemberBalance[] = [
      { userId: "alice", balance: 0.01 },
      { userId: "bob", balance: -0.01 },
    ];
    const debts = simplifyDebts(balances);

    expect(debts).toHaveLength(1);
    expect(debts[0].amount).toBe(0.01);
    expectDebtsSumToBalance(debts, balances);
  });
});

// -------------------------------------------------------------------
// Three+ users (multiple creditors and debtors)
// -------------------------------------------------------------------

describe("simplifyDebts — three+ users", () => {
  it("settles three users with one creditor and two debtors", () => {
    // Alice is owed $60, Bob owes $40, Carol owes $20
    const balances: MemberBalance[] = [
      { userId: "alice", balance: 60 },
      { userId: "bob", balance: -40 },
      { userId: "carol", balance: -20 },
    ];
    const debts = simplifyDebts(balances);

    expect(debts).toHaveLength(2);
    // Bob (largest debtor) pays Alice first, then Carol pays Alice
    expect(debts[0]).toEqual({
      fromUserId: "bob",
      toUserId: "alice",
      amount: 40,
    });
    expect(debts[1]).toEqual({
      fromUserId: "carol",
      toUserId: "alice",
      amount: 20,
    });
    expectDebtsSumToBalance(debts, balances);
    expectAtMostNMinusOneDebts(debts, 3);
  });

  it("settles three users with two creditors and one debtor", () => {
    // Alice is owed $30, Bob is owed $20, Carol owes $50
    const balances: MemberBalance[] = [
      { userId: "alice", balance: 30 },
      { userId: "bob", balance: 20 },
      { userId: "carol", balance: -50 },
    ];
    const debts = simplifyDebts(balances);

    expect(debts).toHaveLength(2);
    // Carol pays Alice (largest creditor) first, then Bob
    expect(debts[0]).toEqual({
      fromUserId: "carol",
      toUserId: "alice",
      amount: 30,
    });
    expect(debts[1]).toEqual({
      fromUserId: "carol",
      toUserId: "bob",
      amount: 20,
    });
    expectDebtsSumToBalance(debts, balances);
    expectAtMostNMinusOneDebts(debts, 3);
  });

  it("settles four users with two creditors and two debtors", () => {
    // Alice +40, Bob +10, Carol -30, Dave -20
    const balances: MemberBalance[] = [
      { userId: "alice", balance: 40 },
      { userId: "bob", balance: 10 },
      { userId: "carol", balance: -30 },
      { userId: "dave", balance: -20 },
    ];
    const debts = simplifyDebts(balances);

    // Creditors sorted desc: Alice(40), Bob(10)
    // Debtors sorted desc:   Carol(30), Dave(20)
    // Step 1: Carol pays Alice min(40,30) = 30 => Alice has 10 left, Carol done
    // Step 2: Dave pays Alice min(10,20) = 10  => Alice done, Dave has 10 left
    // Step 3: Dave pays Bob min(10,10) = 10    => both done
    expect(debts).toHaveLength(3);
    expect(debts[0]).toEqual({
      fromUserId: "carol",
      toUserId: "alice",
      amount: 30,
    });
    expect(debts[1]).toEqual({
      fromUserId: "dave",
      toUserId: "alice",
      amount: 10,
    });
    expect(debts[2]).toEqual({
      fromUserId: "dave",
      toUserId: "bob",
      amount: 10,
    });
    expectDebtsSumToBalance(debts, balances);
    expectAtMostNMinusOneDebts(debts, 4);
  });

  it("handles a mix of zero and non-zero balances", () => {
    const balances: MemberBalance[] = [
      { userId: "alice", balance: 50 },
      { userId: "bob", balance: 0 },
      { userId: "carol", balance: -50 },
    ];
    const debts = simplifyDebts(balances);

    expect(debts).toHaveLength(1);
    expect(debts[0]).toEqual({
      fromUserId: "carol",
      toUserId: "alice",
      amount: 50,
    });
    expectDebtsSumToBalance(debts, balances);
  });
});

// -------------------------------------------------------------------
// Floating-point remainder handling
// -------------------------------------------------------------------

describe("simplifyDebts — floating-point remainder handling", () => {
  it("handles 33.33 type amounts without drift", () => {
    // Three-way split of $100: two owe 33.33, one is owed 66.66
    // (the last cent may differ from a perfect split, but the algorithm
    //  receives pre-computed balances, so we test what we give it)
    const balances: MemberBalance[] = [
      { userId: "alice", balance: 66.66 },
      { userId: "bob", balance: -33.33 },
      { userId: "carol", balance: -33.33 },
    ];
    const debts = simplifyDebts(balances);

    expect(debts).toHaveLength(2);
    expect(debts[0].amount).toBe(33.33);
    expect(debts[1].amount).toBe(33.33);
    expectDebtsSumToBalance(debts, balances);
  });

  it("handles amounts like 0.10 without floating-point artifacts", () => {
    // 0.1 + 0.2 !== 0.3 in IEEE-754, but toCents avoids this
    const balances: MemberBalance[] = [
      { userId: "alice", balance: 0.3 },
      { userId: "bob", balance: -0.1 },
      { userId: "carol", balance: -0.2 },
    ];
    const debts = simplifyDebts(balances);

    expect(debts).toHaveLength(2);

    const totalCents = debts.reduce(
      (sum, d) => sum + Math.round(d.amount * 100),
      0,
    );
    expect(totalCents).toBe(30);
    expectDebtsSumToBalance(debts, balances);
  });

  it("handles amounts with long decimal representations", () => {
    // 10.01 in IEEE-754 is 10.0099999... — toCents must round correctly
    const balances: MemberBalance[] = [
      { userId: "alice", balance: 10.01 },
      { userId: "bob", balance: -10.01 },
    ];
    const debts = simplifyDebts(balances);

    expect(debts).toHaveLength(1);
    expect(debts[0].amount).toBe(10.01);
  });
});

// -------------------------------------------------------------------
// Ordering determinism
// -------------------------------------------------------------------

describe("simplifyDebts — ordering determinism", () => {
  it("processes creditors in descending balance order", () => {
    // Two creditors: Bob(20), Alice(40) — Alice should be matched first
    const balances: MemberBalance[] = [
      { userId: "bob", balance: 20 },
      { userId: "alice", balance: 40 },
      { userId: "carol", balance: -60 },
    ];
    const debts = simplifyDebts(balances);

    expect(debts).toHaveLength(2);
    // Largest creditor (Alice, 40) paired first
    expect(debts[0].toUserId).toBe("alice");
    expect(debts[0].amount).toBe(40);
    // Then Bob (20)
    expect(debts[1].toUserId).toBe("bob");
    expect(debts[1].amount).toBe(20);
  });

  it("processes debtors in descending absolute balance order", () => {
    // Two debtors: Bob(-20), Carol(-40) — Carol should be matched first
    const balances: MemberBalance[] = [
      { userId: "alice", balance: 60 },
      { userId: "bob", balance: -20 },
      { userId: "carol", balance: -40 },
    ];
    const debts = simplifyDebts(balances);

    expect(debts).toHaveLength(2);
    // Largest debtor (Carol, 40) paired first
    expect(debts[0].fromUserId).toBe("carol");
    expect(debts[0].amount).toBe(40);
    // Then Bob (20)
    expect(debts[1].fromUserId).toBe("bob");
    expect(debts[1].amount).toBe(20);
  });

  it("produces the same output regardless of input array order", () => {
    const balancesA: MemberBalance[] = [
      { userId: "alice", balance: 40 },
      { userId: "bob", balance: -10 },
      { userId: "carol", balance: 20 },
      { userId: "dave", balance: -50 },
    ];

    // Same balances in a different order
    const balancesB: MemberBalance[] = [
      { userId: "dave", balance: -50 },
      { userId: "carol", balance: 20 },
      { userId: "alice", balance: 40 },
      { userId: "bob", balance: -10 },
    ];

    const debtsA = simplifyDebts(balancesA);
    const debtsB = simplifyDebts(balancesB);

    expect(debtsA).toEqual(debtsB);
  });
});

// -------------------------------------------------------------------
// n-1 upper bound guarantee
// -------------------------------------------------------------------

describe("simplifyDebts — n-1 upper bound guarantee", () => {
  it("produces at most n-1 debts for n members", () => {
    // 5 members: 2 creditors, 3 debtors => at most 4 debts
    const balances: MemberBalance[] = [
      { userId: "a", balance: 100 },
      { userId: "b", balance: 50 },
      { userId: "c", balance: -60 },
      { userId: "d", balance: -50 },
      { userId: "e", balance: -40 },
    ];
    const debts = simplifyDebts(balances);

    expectAtMostNMinusOneDebts(debts, 5);
    expectDebtsSumToBalance(debts, balances);
  });

  it("produces at most n-1 debts for a large group of 10 members", () => {
    const balances: MemberBalance[] = [
      { userId: "u1", balance: 100 },
      { userId: "u2", balance: 80 },
      { userId: "u3", balance: 60 },
      { userId: "u4", balance: -50 },
      { userId: "u5", balance: -40 },
      { userId: "u6", balance: -35 },
      { userId: "u7", balance: -30 },
      { userId: "u8", balance: -25 },
      { userId: "u9", balance: -30 },
      { userId: "u10", balance: -30 },
    ];
    const debts = simplifyDebts(balances);

    expectAtMostNMinusOneDebts(debts, 10);
    expectDebtsSumToBalance(debts, balances);
  });

  it("produces exactly 0 debts for 0 members", () => {
    const debts = simplifyDebts([]);

    expect(debts).toHaveLength(0);
    expectAtMostNMinusOneDebts(debts, 0);
  });

  it("produces exactly 0 debts for 1 member", () => {
    const debts = simplifyDebts([{ userId: "solo", balance: 100 }]);

    expect(debts).toHaveLength(0);
    expectAtMostNMinusOneDebts(debts, 1);
  });
});
