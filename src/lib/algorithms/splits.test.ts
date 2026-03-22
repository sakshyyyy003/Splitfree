import { describe, it, expect } from 'vitest';
import {
  calculateEqualSplit,
  calculateExactSplit,
  calculatePercentageSplit,
  calculateSharesSplit,
  calculateSplit,
} from './splits';

describe('calculateEqualSplit', () => {
  it('splits evenly among participants', () => {
    const result = calculateEqualSplit(300, ['a', 'b', 'c']);
    expect(result).toHaveLength(3);
    expect(result.every((r) => r.amount === 100)).toBe(true);
    expect(result.every((r) => r.shareValue === 1)).toBe(true);
  });

  it('allocates remainder cents to last participant', () => {
    const result = calculateEqualSplit(100, ['a', 'b', 'c']);
    // 100 / 3 = 33.33... → 3333 cents / 3 = 1111 each, remainder 0
    // Actually: 10000 cents / 3 = 3333 per person, remainder 1 cent
    expect(result[0].amount).toBe(33.33);
    expect(result[1].amount).toBe(33.33);
    expect(result[2].amount).toBe(33.34); // gets the extra cent
  });

  it('handles single participant', () => {
    const result = calculateEqualSplit(500, ['a']);
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(500);
    expect(result[0].userId).toBe('a');
  });

  it('handles two participants with odd amount', () => {
    const result = calculateEqualSplit(10.01, ['a', 'b']);
    expect(result[0].amount).toBe(5.00);
    expect(result[1].amount).toBe(5.01);
  });

  it('preserves user IDs', () => {
    const result = calculateEqualSplit(100, ['user-1', 'user-2']);
    expect(result[0].userId).toBe('user-1');
    expect(result[1].userId).toBe('user-2');
  });

  it('throws for zero amount', () => {
    expect(() => calculateEqualSplit(0, ['a'])).toThrow('greater than zero');
  });

  it('throws for negative amount', () => {
    expect(() => calculateEqualSplit(-100, ['a'])).toThrow('greater than zero');
  });

  it('throws for no participants', () => {
    expect(() => calculateEqualSplit(100, [])).toThrow('At least one participant');
  });

  it('throws for non-finite amount', () => {
    expect(() => calculateEqualSplit(Infinity, ['a'])).toThrow('finite number');
    expect(() => calculateEqualSplit(NaN, ['a'])).toThrow('finite number');
  });

  it('amounts sum to total', () => {
    const result = calculateEqualSplit(999.99, ['a', 'b', 'c', 'd', 'e', 'f', 'g']);
    const sum = result.reduce((s, r) => s + Math.round(r.amount * 100), 0);
    expect(sum).toBe(99999);
  });
});

describe('calculateExactSplit', () => {
  it('accepts assignments that sum to total', () => {
    const result = calculateExactSplit(100, [
      { userId: 'a', amount: 60 },
      { userId: 'b', amount: 40 },
    ]);
    expect(result[0].amount).toBe(60);
    expect(result[1].amount).toBe(40);
    expect(result.every((r) => r.shareValue === null)).toBe(true);
  });

  it('throws when amounts do not sum to total', () => {
    expect(() =>
      calculateExactSplit(100, [
        { userId: 'a', amount: 50 },
        { userId: 'b', amount: 30 },
      ])
    ).toThrow('must sum to the total');
  });

  it('throws for negative assignment', () => {
    expect(() =>
      calculateExactSplit(100, [
        { userId: 'a', amount: -10 },
        { userId: 'b', amount: 110 },
      ])
    ).toThrow('must not be negative');
  });

  it('throws for no assignments', () => {
    expect(() => calculateExactSplit(100, [])).toThrow('At least one assignment');
  });

  it('allows zero assignment for one participant', () => {
    const result = calculateExactSplit(100, [
      { userId: 'a', amount: 100 },
      { userId: 'b', amount: 0 },
    ]);
    expect(result[0].amount).toBe(100);
    expect(result[1].amount).toBe(0);
  });
});

describe('calculatePercentageSplit', () => {
  it('splits by percentage', () => {
    const result = calculatePercentageSplit(1000, [
      { userId: 'a', percent: 60 },
      { userId: 'b', percent: 40 },
    ]);
    expect(result[0].amount).toBe(600);
    expect(result[1].amount).toBe(400);
    expect(result[0].shareValue).toBe(60);
    expect(result[1].shareValue).toBe(40);
  });

  it('handles remainder cents on uneven percentages', () => {
    const result = calculatePercentageSplit(100, [
      { userId: 'a', percent: 33.33 },
      { userId: 'b', percent: 33.33 },
      { userId: 'c', percent: 33.34 },
    ]);
    const sum = result.reduce((s, r) => s + Math.round(r.amount * 100), 0);
    expect(sum).toBe(10000);
  });

  it('throws when percentages do not sum to 100', () => {
    expect(() =>
      calculatePercentageSplit(100, [
        { userId: 'a', percent: 50 },
        { userId: 'b', percent: 30 },
      ])
    ).toThrow('must sum to 100');
  });

  it('throws for negative percentage', () => {
    expect(() =>
      calculatePercentageSplit(100, [
        { userId: 'a', percent: -10 },
        { userId: 'b', percent: 110 },
      ])
    ).toThrow('must not be negative');
  });

  it('allows 100% to one person', () => {
    const result = calculatePercentageSplit(500, [
      { userId: 'a', percent: 100 },
    ]);
    expect(result[0].amount).toBe(500);
  });
});

describe('calculateSharesSplit', () => {
  it('splits proportionally by shares', () => {
    const result = calculateSharesSplit(1000, [
      { userId: 'a', shares: 2 },
      { userId: 'b', shares: 3 },
    ]);
    expect(result[0].amount).toBe(400);
    expect(result[1].amount).toBe(600);
    expect(result[0].shareValue).toBe(2);
    expect(result[1].shareValue).toBe(3);
  });

  it('handles equal shares', () => {
    const result = calculateSharesSplit(300, [
      { userId: 'a', shares: 1 },
      { userId: 'b', shares: 1 },
      { userId: 'c', shares: 1 },
    ]);
    expect(result.every((r) => r.amount === 100)).toBe(true);
  });

  it('allocates remainder to last participant', () => {
    const result = calculateSharesSplit(100, [
      { userId: 'a', shares: 1 },
      { userId: 'b', shares: 1 },
      { userId: 'c', shares: 1 },
    ]);
    const sum = result.reduce((s, r) => s + Math.round(r.amount * 100), 0);
    expect(sum).toBe(10000);
  });

  it('throws when total shares is zero', () => {
    expect(() =>
      calculateSharesSplit(100, [
        { userId: 'a', shares: 0 },
        { userId: 'b', shares: 0 },
      ])
    ).toThrow('greater than zero');
  });

  it('throws for negative shares', () => {
    expect(() =>
      calculateSharesSplit(100, [
        { userId: 'a', shares: -1 },
        { userId: 'b', shares: 2 },
      ])
    ).toThrow('must not be negative');
  });

  it('handles large share ratios', () => {
    const result = calculateSharesSplit(1000, [
      { userId: 'a', shares: 1 },
      { userId: 'b', shares: 99 },
    ]);
    expect(result[0].amount).toBe(10);
    expect(result[1].amount).toBe(990);
  });
});

describe('calculateSplit dispatcher', () => {
  it('dispatches to equal split', () => {
    const result = calculateSplit({
      splitType: 'equal',
      totalAmount: 200,
      participants: ['a', 'b'],
    });
    expect(result).toHaveLength(2);
    expect(result[0].amount).toBe(100);
  });

  it('dispatches to exact split', () => {
    const result = calculateSplit({
      splitType: 'exact',
      totalAmount: 100,
      participants: [
        { userId: 'a', amount: 70 },
        { userId: 'b', amount: 30 },
      ],
    });
    expect(result[0].amount).toBe(70);
  });

  it('dispatches to percentage split', () => {
    const result = calculateSplit({
      splitType: 'percentage',
      totalAmount: 500,
      participants: [
        { userId: 'a', percent: 80 },
        { userId: 'b', percent: 20 },
      ],
    });
    expect(result[0].amount).toBe(400);
    expect(result[1].amount).toBe(100);
  });

  it('dispatches to shares split', () => {
    const result = calculateSplit({
      splitType: 'shares',
      totalAmount: 900,
      participants: [
        { userId: 'a', shares: 1 },
        { userId: 'b', shares: 2 },
      ],
    });
    expect(result[0].amount).toBe(300);
    expect(result[1].amount).toBe(600);
  });
});
