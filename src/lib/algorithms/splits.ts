// -------------------------------------------------------
// Split calculation algorithms
//
// Pure functions — no Next.js, Supabase, or server/client imports.
// All internal math uses integer-cent arithmetic to avoid
// floating-point drift. Remainder cents go to the last participant.
// -------------------------------------------------------

// -------------------------------------------------------
// Constants & types
// -------------------------------------------------------

export const SPLIT_TYPES = ["equal", "exact", "percentage", "shares"] as const;

export type SplitType = (typeof SPLIT_TYPES)[number];

export type SplitResult = {
  userId: string;
  amount: number;
  shareValue?: number;
};

type ExactAssignment = { userId: string; amount: number };
type PercentageAssignment = { userId: string; percent: number };
type SharesAssignment = { userId: string; shares: number };

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

function toCents(amount: number): number {
  return Math.round(amount * 100);
}

function toDollars(cents: number): number {
  return cents / 100;
}

function validateTotalAmount(totalAmount: number): void {
  if (!Number.isFinite(totalAmount)) {
    throw new Error("Total amount must be a finite number");
  }
  if (totalAmount <= 0) {
    throw new Error("Total amount must be greater than zero");
  }
}

// -------------------------------------------------------
// Equal split
// -------------------------------------------------------

export function calculateEqualSplit(
  totalAmount: number,
  participantIds: string[],
): SplitResult[] {
  validateTotalAmount(totalAmount);

  if (participantIds.length === 0) {
    throw new Error("At least one participant is required");
  }

  const totalCents = toCents(totalAmount);
  const perPersonCents = Math.floor(totalCents / participantIds.length);
  const remainderCents = totalCents - perPersonCents * participantIds.length;

  return participantIds.map((userId, index) => {
    const isLast = index === participantIds.length - 1;
    const cents = isLast ? perPersonCents + remainderCents : perPersonCents;
    return { userId, amount: toDollars(cents) };
  });
}

// -------------------------------------------------------
// Exact split
// -------------------------------------------------------

export function calculateExactSplit(
  totalAmount: number,
  assignments: ExactAssignment[],
): SplitResult[] {
  validateTotalAmount(totalAmount);

  if (assignments.length === 0) {
    throw new Error("At least one assignment is required");
  }

  for (const assignment of assignments) {
    if (assignment.amount < 0) {
      throw new Error(
        `Exact amount for user "${assignment.userId}" must not be negative`,
      );
    }
  }

  const totalCents = toCents(totalAmount);
  const sumCents = assignments.reduce(
    (sum, a) => sum + toCents(a.amount),
    0,
  );

  if (sumCents !== totalCents) {
    throw new Error(
      `Exact amounts must sum to the total. Expected ${toDollars(totalCents)}, got ${toDollars(sumCents)}`,
    );
  }

  return assignments.map(({ userId, amount }) => ({
    userId,
    amount: toDollars(toCents(amount)),
  }));
}

// -------------------------------------------------------
// Percentage split
// -------------------------------------------------------

export function calculatePercentageSplit(
  totalAmount: number,
  assignments: PercentageAssignment[],
): SplitResult[] {
  validateTotalAmount(totalAmount);

  if (assignments.length === 0) {
    throw new Error("At least one assignment is required");
  }

  for (const assignment of assignments) {
    if (assignment.percent < 0) {
      throw new Error(
        `Percentage for user "${assignment.userId}" must not be negative`,
      );
    }
  }

  const percentSum = assignments.reduce((sum, a) => sum + a.percent, 0);
  if (Math.abs(percentSum - 100) > 0.001) {
    throw new Error(
      `Percentages must sum to 100. Got ${percentSum}`,
    );
  }

  const totalCents = toCents(totalAmount);
  const perPersonCents = assignments.map((a) =>
    Math.floor((a.percent / 100) * totalCents),
  );
  const allocatedCents = perPersonCents.reduce((sum, c) => sum + c, 0);
  const remainderCents = totalCents - allocatedCents;

  return assignments.map(({ userId, percent }, index) => {
    const isLast = index === assignments.length - 1;
    const cents = isLast
      ? perPersonCents[index] + remainderCents
      : perPersonCents[index];
    return { userId, amount: toDollars(cents), shareValue: percent };
  });
}

// -------------------------------------------------------
// Shares split
// -------------------------------------------------------

export function calculateSharesSplit(
  totalAmount: number,
  assignments: SharesAssignment[],
): SplitResult[] {
  validateTotalAmount(totalAmount);

  if (assignments.length === 0) {
    throw new Error("At least one assignment is required");
  }

  for (const assignment of assignments) {
    if (assignment.shares < 0) {
      throw new Error(
        `Shares for user "${assignment.userId}" must not be negative`,
      );
    }
  }

  const totalShares = assignments.reduce((sum, a) => sum + a.shares, 0);
  if (totalShares === 0) {
    throw new Error("Total shares must be greater than zero");
  }

  const totalCents = toCents(totalAmount);
  const perPersonCents = assignments.map((a) =>
    Math.floor((a.shares / totalShares) * totalCents),
  );
  const allocatedCents = perPersonCents.reduce((sum, c) => sum + c, 0);
  const remainderCents = totalCents - allocatedCents;

  return assignments.map(({ userId, shares }, index) => {
    const isLast = index === assignments.length - 1;
    const cents = isLast
      ? perPersonCents[index] + remainderCents
      : perPersonCents[index];
    return { userId, amount: toDollars(cents), shareValue: shares };
  });
}

// -------------------------------------------------------
// Dispatcher
// -------------------------------------------------------

type CalculateSplitParams =
  | { splitType: "equal"; totalAmount: number; participants: string[] }
  | {
      splitType: "exact";
      totalAmount: number;
      participants: ExactAssignment[];
    }
  | {
      splitType: "percentage";
      totalAmount: number;
      participants: PercentageAssignment[];
    }
  | {
      splitType: "shares";
      totalAmount: number;
      participants: SharesAssignment[];
    };

export function calculateSplit(params: CalculateSplitParams): SplitResult[] {
  switch (params.splitType) {
    case "equal":
      return calculateEqualSplit(params.totalAmount, params.participants);
    case "exact":
      return calculateExactSplit(params.totalAmount, params.participants);
    case "percentage":
      return calculatePercentageSplit(params.totalAmount, params.participants);
    case "shares":
      return calculateSharesSplit(params.totalAmount, params.participants);
  }
}
