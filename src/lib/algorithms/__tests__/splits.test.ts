import { describe, expect, it } from "vitest";

import {
  calculateEqualSplit,
  calculateExactSplit,
  calculatePercentageSplit,
  calculateSharesSplit,
  calculateSplit,
  SPLIT_TYPES,
  type SplitResult,
} from "@/lib/algorithms/splits";

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

/** Assert the integer-cent rounding invariant: sum of output cents === total cents. */
function expectCentsSumToMatch(
  splits: SplitResult[],
  totalAmount: number,
): void {
  const totalCents = Math.round(totalAmount * 100);
  const sumCents = splits.reduce(
    (sum, s) => sum + Math.round(s.amount * 100),
    0,
  );
  expect(sumCents).toBe(totalCents);
}

function userIds(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `user-${i + 1}`);
}

// -------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------

describe("SPLIT_TYPES", () => {
  it("contains the four expected split types", () => {
    expect(SPLIT_TYPES).toEqual(["equal", "exact", "percentage", "shares"]);
  });
});

// -------------------------------------------------------------------
// calculateEqualSplit
// -------------------------------------------------------------------

describe("calculateEqualSplit", () => {
  it("splits evenly among 2 participants", () => {
    const splits = calculateEqualSplit(100, userIds(2));

    expect(splits).toHaveLength(2);
    expect(splits[0]).toEqual({ userId: "user-1", amount: 50 });
    expect(splits[1]).toEqual({ userId: "user-2", amount: 50 });
    expectCentsSumToMatch(splits, 100);
  });

  it("splits evenly among 4 participants (100 / 4 = 25)", () => {
    const splits = calculateEqualSplit(100, userIds(4));

    expect(splits).toHaveLength(4);
    for (const split of splits) {
      expect(split.amount).toBe(25);
    }
    expectCentsSumToMatch(splits, 100);
  });

  it("handles uneven split among 3 participants with remainder on last", () => {
    // 100.00 / 3 = 3333 cents each, 1 cent remainder -> last gets 3334
    const splits = calculateEqualSplit(100, userIds(3));

    expect(splits).toHaveLength(3);
    expect(splits[0].amount).toBe(33.33);
    expect(splits[1].amount).toBe(33.33);
    expect(splits[2].amount).toBe(33.34);
    expectCentsSumToMatch(splits, 100);
  });

  it("handles a single participant", () => {
    const splits = calculateEqualSplit(42.99, ["solo"]);

    expect(splits).toHaveLength(1);
    expect(splits[0]).toEqual({ userId: "solo", amount: 42.99 });
    expectCentsSumToMatch(splits, 42.99);
  });

  it("handles a very small amount (0.01) among 3 participants", () => {
    // 1 cent total: floor(1/3) = 0 cents each, remainder 1 cent on last
    const splits = calculateEqualSplit(0.01, userIds(3));

    expect(splits).toHaveLength(3);
    expect(splits[0].amount).toBe(0);
    expect(splits[1].amount).toBe(0);
    expect(splits[2].amount).toBe(0.01);
    expectCentsSumToMatch(splits, 0.01);
  });

  it("preserves participant order and user IDs", () => {
    const ids = ["alice", "bob", "carol"];
    const splits = calculateEqualSplit(90, ids);

    expect(splits.map((s) => s.userId)).toEqual(["alice", "bob", "carol"]);
  });

  // -- Error cases --

  it("throws for zero total amount", () => {
    expect(() => calculateEqualSplit(0, userIds(2))).toThrow(
      "Total amount must be greater than zero",
    );
  });

  it("throws for negative total amount", () => {
    expect(() => calculateEqualSplit(-50, userIds(2))).toThrow(
      "Total amount must be greater than zero",
    );
  });

  it("throws for empty participants array", () => {
    expect(() => calculateEqualSplit(100, [])).toThrow(
      "At least one participant is required",
    );
  });

  it("throws for non-finite total amount", () => {
    expect(() => calculateEqualSplit(Infinity, userIds(2))).toThrow(
      "Total amount must be a finite number",
    );
    expect(() => calculateEqualSplit(NaN, userIds(2))).toThrow(
      "Total amount must be a finite number",
    );
  });
});

// -------------------------------------------------------------------
// calculateExactSplit
// -------------------------------------------------------------------

describe("calculateExactSplit", () => {
  it("returns exact amounts when they sum to the total", () => {
    const splits = calculateExactSplit(100, [
      { userId: "alice", amount: 60 },
      { userId: "bob", amount: 40 },
    ]);

    expect(splits).toHaveLength(2);
    expect(splits[0]).toEqual({ userId: "alice", amount: 60 });
    expect(splits[1]).toEqual({ userId: "bob", amount: 40 });
    expectCentsSumToMatch(splits, 100);
  });

  it("handles amounts with cents", () => {
    const splits = calculateExactSplit(50.75, [
      { userId: "a", amount: 25.25 },
      { userId: "b", amount: 15.50 },
      { userId: "c", amount: 10.00 },
    ]);

    expect(splits).toHaveLength(3);
    expectCentsSumToMatch(splits, 50.75);
  });

  it("handles a single assignment", () => {
    const splits = calculateExactSplit(99.99, [
      { userId: "solo", amount: 99.99 },
    ]);

    expect(splits).toHaveLength(1);
    expect(splits[0].amount).toBe(99.99);
    expectCentsSumToMatch(splits, 99.99);
  });

  // -- Error cases --

  it("throws when amounts do not sum to the total", () => {
    expect(() =>
      calculateExactSplit(100, [
        { userId: "a", amount: 60 },
        { userId: "b", amount: 30 },
      ]),
    ).toThrow("Exact amounts must sum to the total");
  });

  it("throws for negative assignment amount", () => {
    expect(() =>
      calculateExactSplit(100, [
        { userId: "a", amount: -10 },
        { userId: "b", amount: 110 },
      ]),
    ).toThrow("must not be negative");
  });

  it("throws for empty assignments", () => {
    expect(() => calculateExactSplit(100, [])).toThrow(
      "At least one assignment is required",
    );
  });

  it("throws for zero total amount", () => {
    expect(() =>
      calculateExactSplit(0, [{ userId: "a", amount: 0 }]),
    ).toThrow("Total amount must be greater than zero");
  });
});

// -------------------------------------------------------------------
// calculatePercentageSplit
// -------------------------------------------------------------------

describe("calculatePercentageSplit", () => {
  it("splits 50/50", () => {
    const splits = calculatePercentageSplit(100, [
      { userId: "a", percent: 50 },
      { userId: "b", percent: 50 },
    ]);

    expect(splits).toHaveLength(2);
    expect(splits[0].amount).toBe(50);
    expect(splits[1].amount).toBe(50);
    expect(splits[0].shareValue).toBe(50);
    expect(splits[1].shareValue).toBe(50);
    expectCentsSumToMatch(splits, 100);
  });

  it("splits 33.33/33.33/33.34 with remainder on last", () => {
    const splits = calculatePercentageSplit(100, [
      { userId: "a", percent: 33.33 },
      { userId: "b", percent: 33.33 },
      { userId: "c", percent: 33.34 },
    ]);

    expect(splits).toHaveLength(3);
    // floor(33.33/100 * 10000) = floor(3333) = 3333 cents
    // floor(33.34/100 * 10000) = floor(3334) = 3334 cents
    // allocated = 3333 + 3333 + 3334 = 10000, remainder = 0
    expectCentsSumToMatch(splits, 100);
  });

  it("handles uneven percentages where rounding produces remainder", () => {
    // 60/40 split on $33.33
    const splits = calculatePercentageSplit(33.33, [
      { userId: "a", percent: 60 },
      { userId: "b", percent: 40 },
    ]);

    expect(splits).toHaveLength(2);
    expectCentsSumToMatch(splits, 33.33);
  });

  it("sets shareValue to the percent for each participant", () => {
    const splits = calculatePercentageSplit(200, [
      { userId: "a", percent: 70 },
      { userId: "b", percent: 30 },
    ]);

    expect(splits[0].shareValue).toBe(70);
    expect(splits[1].shareValue).toBe(30);
  });

  // -- Error cases --

  it("throws when percentages do not sum to 100", () => {
    expect(() =>
      calculatePercentageSplit(100, [
        { userId: "a", percent: 50 },
        { userId: "b", percent: 40 },
      ]),
    ).toThrow("Percentages must sum to 100");
  });

  it("throws for negative percentage", () => {
    expect(() =>
      calculatePercentageSplit(100, [
        { userId: "a", percent: -10 },
        { userId: "b", percent: 110 },
      ]),
    ).toThrow("must not be negative");
  });

  it("throws for empty assignments", () => {
    expect(() => calculatePercentageSplit(100, [])).toThrow(
      "At least one assignment is required",
    );
  });
});

// -------------------------------------------------------------------
// calculateSharesSplit
// -------------------------------------------------------------------

describe("calculateSharesSplit", () => {
  it("splits equally with 1:1:1 shares", () => {
    const splits = calculateSharesSplit(90, [
      { userId: "a", shares: 1 },
      { userId: "b", shares: 1 },
      { userId: "c", shares: 1 },
    ]);

    expect(splits).toHaveLength(3);
    expect(splits[0].amount).toBe(30);
    expect(splits[1].amount).toBe(30);
    expect(splits[2].amount).toBe(30);
    expectCentsSumToMatch(splits, 90);
  });

  it("splits with 2:1:1 shares", () => {
    const splits = calculateSharesSplit(100, [
      { userId: "a", shares: 2 },
      { userId: "b", shares: 1 },
      { userId: "c", shares: 1 },
    ]);

    expect(splits).toHaveLength(3);
    // Total shares = 4, totalCents = 10000
    // a: floor(2/4 * 10000) = 5000
    // b: floor(1/4 * 10000) = 2500
    // c: 2500 + remainder (0)
    expect(splits[0].amount).toBe(50);
    expect(splits[1].amount).toBe(25);
    expect(splits[2].amount).toBe(25);
    expectCentsSumToMatch(splits, 100);
  });

  it("handles uneven shares with remainder on last", () => {
    // 100.00 with shares 1:1:1 => totalShares = 3
    // floor(1/3 * 10000) = 3333 each, remainder = 1
    const splits = calculateSharesSplit(100, [
      { userId: "a", shares: 1 },
      { userId: "b", shares: 1 },
      { userId: "c", shares: 1 },
    ]);

    expect(splits[0].amount).toBe(33.33);
    expect(splits[1].amount).toBe(33.33);
    expect(splits[2].amount).toBe(33.34);
    expectCentsSumToMatch(splits, 100);
  });

  it("sets shareValue to the share count for each participant", () => {
    const splits = calculateSharesSplit(100, [
      { userId: "a", shares: 3 },
      { userId: "b", shares: 7 },
    ]);

    expect(splits[0].shareValue).toBe(3);
    expect(splits[1].shareValue).toBe(7);
  });

  it("handles one participant with zero shares among others", () => {
    const splits = calculateSharesSplit(100, [
      { userId: "a", shares: 0 },
      { userId: "b", shares: 1 },
    ]);

    expect(splits).toHaveLength(2);
    // a gets floor(0/1 * 10000) = 0, b gets the rest
    expect(splits[0].amount).toBe(0);
    expect(splits[1].amount).toBe(100);
    expectCentsSumToMatch(splits, 100);
  });

  // -- Error cases --

  it("throws when all shares are zero", () => {
    expect(() =>
      calculateSharesSplit(100, [
        { userId: "a", shares: 0 },
        { userId: "b", shares: 0 },
      ]),
    ).toThrow("Total shares must be greater than zero");
  });

  it("throws for negative shares", () => {
    expect(() =>
      calculateSharesSplit(100, [
        { userId: "a", shares: -1 },
        { userId: "b", shares: 2 },
      ]),
    ).toThrow("must not be negative");
  });

  it("throws for empty assignments", () => {
    expect(() => calculateSharesSplit(100, [])).toThrow(
      "At least one assignment is required",
    );
  });
});

// -------------------------------------------------------------------
// calculateSplit (dispatcher)
// -------------------------------------------------------------------

describe("calculateSplit", () => {
  it("routes 'equal' to calculateEqualSplit", () => {
    const splits = calculateSplit({
      splitType: "equal",
      totalAmount: 60,
      participants: userIds(3),
    });

    expect(splits).toHaveLength(3);
    expect(splits[0].amount).toBe(20);
    expectCentsSumToMatch(splits, 60);
  });

  it("routes 'exact' to calculateExactSplit", () => {
    const splits = calculateSplit({
      splitType: "exact",
      totalAmount: 100,
      participants: [
        { userId: "a", amount: 70 },
        { userId: "b", amount: 30 },
      ],
    });

    expect(splits).toHaveLength(2);
    expect(splits[0].amount).toBe(70);
    expectCentsSumToMatch(splits, 100);
  });

  it("routes 'percentage' to calculatePercentageSplit", () => {
    const splits = calculateSplit({
      splitType: "percentage",
      totalAmount: 200,
      participants: [
        { userId: "a", percent: 75 },
        { userId: "b", percent: 25 },
      ],
    });

    expect(splits).toHaveLength(2);
    expect(splits[0].amount).toBe(150);
    expect(splits[1].amount).toBe(50);
    expectCentsSumToMatch(splits, 200);
  });

  it("routes 'shares' to calculateSharesSplit", () => {
    const splits = calculateSplit({
      splitType: "shares",
      totalAmount: 120,
      participants: [
        { userId: "a", shares: 2 },
        { userId: "b", shares: 1 },
      ],
    });

    expect(splits).toHaveLength(2);
    expect(splits[0].amount).toBe(80);
    expect(splits[1].amount).toBe(40);
    expectCentsSumToMatch(splits, 120);
  });

  it("propagates errors from underlying functions", () => {
    expect(() =>
      calculateSplit({
        splitType: "equal",
        totalAmount: -10,
        participants: userIds(2),
      }),
    ).toThrow("Total amount must be greater than zero");
  });
});
