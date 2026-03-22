import { describe, it, expect } from 'vitest';
import { loginSchema, signupSchema } from './auth';
import { createGroupSchema, updateGroupSchema } from './group';
import {
  expenseSchema,
  splitSchema,
  createExpenseWithSplitsSchema,
  createDirectExpenseSchema,
  deleteExpenseSchema,
} from './expense';
import { settlementSchema } from './settlement';
import { updateProfileSchema } from './profile';
import { addMemberSchema, removeMemberSchema } from './group-member';

const UUID = '550e8400-e29b-41d4-a716-446655440000';
const UUID2 = '660e8400-e29b-41d4-a716-446655440001';

// -------------------------------------------------------
// Auth validators
// -------------------------------------------------------

describe('loginSchema', () => {
  it('accepts valid email and password', () => {
    const result = loginSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects short password (< 6 chars)', () => {
    const result = loginSchema.safeParse({
      email: 'test@example.com',
      password: '12345',
    });
    expect(result.success).toBe(false);
  });

  it('accepts password with exactly 6 chars', () => {
    const result = loginSchema.safeParse({
      email: 'test@example.com',
      password: '123456',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing fields', () => {
    expect(loginSchema.safeParse({}).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'a@b.com' }).success).toBe(false);
    expect(loginSchema.safeParse({ password: '123456' }).success).toBe(false);
  });
});

describe('signupSchema', () => {
  it('accepts valid signup data', () => {
    const result = signupSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects short password (< 8 chars)', () => {
    const result = signupSchema.safeParse({
      email: 'test@example.com',
      password: '1234567',
      confirmPassword: '1234567',
    });
    expect(result.success).toBe(false);
  });

  it('rejects mismatched passwords', () => {
    const result = signupSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'different123',
    });
    expect(result.success).toBe(false);
  });

  it('accepts password with exactly 8 chars', () => {
    const result = signupSchema.safeParse({
      email: 'test@example.com',
      password: '12345678',
      confirmPassword: '12345678',
    });
    expect(result.success).toBe(true);
  });
});

// -------------------------------------------------------
// Group validators
// -------------------------------------------------------

describe('createGroupSchema', () => {
  it('accepts valid group data', () => {
    const result = createGroupSchema.safeParse({
      name: 'Goa Trip',
      category: 'trip',
    });
    expect(result.success).toBe(true);
  });

  it('accepts all valid categories', () => {
    const categories = ['trip', 'home', 'couple', 'work', 'friends', 'other'];
    for (const category of categories) {
      const result = createGroupSchema.safeParse({ name: 'Test', category });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid category', () => {
    const result = createGroupSchema.safeParse({
      name: 'Test',
      category: 'invalid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = createGroupSchema.safeParse({
      name: '',
      category: 'trip',
    });
    expect(result.success).toBe(false);
  });

  it('rejects name over 100 chars', () => {
    const result = createGroupSchema.safeParse({
      name: 'x'.repeat(101),
      category: 'trip',
    });
    expect(result.success).toBe(false);
  });

  it('accepts name with exactly 100 chars', () => {
    const result = createGroupSchema.safeParse({
      name: 'x'.repeat(100),
      category: 'trip',
    });
    expect(result.success).toBe(true);
  });
});

describe('updateGroupSchema', () => {
  it('accepts valid update data', () => {
    const result = updateGroupSchema.safeParse({
      groupId: UUID,
      name: 'Updated Name',
      category: 'home',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid UUID for groupId', () => {
    const result = updateGroupSchema.safeParse({
      groupId: 'not-a-uuid',
      name: 'Test',
      category: 'trip',
    });
    expect(result.success).toBe(false);
  });
});

// -------------------------------------------------------
// Expense validators
// -------------------------------------------------------

describe('expenseSchema', () => {
  const validExpense = {
    description: 'Dinner',
    amount: 500,
    paid_by: UUID,
    created_by: UUID,
  };

  it('accepts valid expense with defaults', () => {
    const result = expenseSchema.safeParse(validExpense);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currency).toBe('INR');
      expect(result.data.split_type).toBe('equal');
      expect(result.data.category).toBe('other');
      expect(result.data.is_recurring).toBe(false);
    }
  });

  it('rejects zero amount', () => {
    const result = expenseSchema.safeParse({ ...validExpense, amount: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects negative amount', () => {
    const result = expenseSchema.safeParse({ ...validExpense, amount: -100 });
    expect(result.success).toBe(false);
  });

  it('rejects amount over maximum', () => {
    const result = expenseSchema.safeParse({ ...validExpense, amount: 10000000000 });
    expect(result.success).toBe(false);
  });

  it('rejects empty description', () => {
    const result = expenseSchema.safeParse({ ...validExpense, description: '' });
    expect(result.success).toBe(false);
  });

  it('rejects description over 255 chars', () => {
    const result = expenseSchema.safeParse({
      ...validExpense,
      description: 'x'.repeat(256),
    });
    expect(result.success).toBe(false);
  });

  it('accepts all valid split types', () => {
    for (const split_type of ['equal', 'exact', 'percentage', 'shares']) {
      const result = expenseSchema.safeParse({ ...validExpense, split_type });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid split type', () => {
    const result = expenseSchema.safeParse({ ...validExpense, split_type: 'half' });
    expect(result.success).toBe(false);
  });

  it('accepts all valid categories', () => {
    const cats = ['food', 'transport', 'accommodation', 'entertainment', 'utilities', 'shopping', 'other'];
    for (const category of cats) {
      const result = expenseSchema.safeParse({ ...validExpense, category });
      expect(result.success).toBe(true);
    }
  });

  it('accepts optional group_id', () => {
    const result = expenseSchema.safeParse({ ...validExpense, group_id: UUID });
    expect(result.success).toBe(true);
  });

  it('rejects invalid paid_by UUID', () => {
    const result = expenseSchema.safeParse({ ...validExpense, paid_by: 'bad' });
    expect(result.success).toBe(false);
  });
});

describe('createExpenseWithSplitsSchema', () => {
  const validPayload = {
    expense: {
      description: 'Dinner',
      amount: 100,
      paid_by: UUID,
      created_by: UUID,
    },
    splits: [
      { user_id: UUID, amount: 50, share_value: 1 },
      { user_id: UUID2, amount: 50, share_value: 1 },
    ],
  };

  it('accepts valid expense with matching splits', () => {
    const result = createExpenseWithSplitsSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('rejects when splits do not sum to expense amount', () => {
    const result = createExpenseWithSplitsSchema.safeParse({
      ...validPayload,
      splits: [
        { user_id: UUID, amount: 30, share_value: 1 },
        { user_id: UUID2, amount: 50, share_value: 1 },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty splits array', () => {
    const result = createExpenseWithSplitsSchema.safeParse({
      ...validPayload,
      splits: [],
    });
    expect(result.success).toBe(false);
  });

  it('handles floating-point sum correctly', () => {
    const result = createExpenseWithSplitsSchema.safeParse({
      expense: {
        description: 'Test',
        amount: 10.01,
        paid_by: UUID,
        created_by: UUID,
      },
      splits: [
        { user_id: UUID, amount: 5.00, share_value: 1 },
        { user_id: UUID2, amount: 5.01, share_value: 1 },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe('createDirectExpenseSchema', () => {
  it('accepts valid direct expense with exactly 2 splits', () => {
    const result = createDirectExpenseSchema.safeParse({
      friend_id: UUID2,
      expense: {
        description: 'Coffee',
        amount: 200,
        paid_by: UUID,
        created_by: UUID,
      },
      splits: [
        { user_id: UUID, amount: 100, share_value: 1 },
        { user_id: UUID2, amount: 100, share_value: 1 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects with only 1 split', () => {
    const result = createDirectExpenseSchema.safeParse({
      friend_id: UUID2,
      expense: {
        description: 'Coffee',
        amount: 100,
        paid_by: UUID,
        created_by: UUID,
      },
      splits: [{ user_id: UUID, amount: 100, share_value: 1 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects with 3 splits', () => {
    const result = createDirectExpenseSchema.safeParse({
      friend_id: UUID2,
      expense: {
        description: 'Coffee',
        amount: 300,
        paid_by: UUID,
        created_by: UUID,
      },
      splits: [
        { user_id: UUID, amount: 100, share_value: 1 },
        { user_id: UUID2, amount: 100, share_value: 1 },
        { user_id: '770e8400-e29b-41d4-a716-446655440002', amount: 100, share_value: 1 },
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe('deleteExpenseSchema', () => {
  it('accepts valid UUIDs', () => {
    const result = deleteExpenseSchema.safeParse({
      expense_id: UUID,
      group_id: UUID2,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid UUIDs', () => {
    expect(
      deleteExpenseSchema.safeParse({ expense_id: 'bad', group_id: UUID }).success
    ).toBe(false);
  });
});

// -------------------------------------------------------
// Settlement validator
// -------------------------------------------------------

describe('settlementSchema', () => {
  it('accepts valid settlement', () => {
    const result = settlementSchema.safeParse({
      paid_by: UUID,
      paid_to: UUID2,
      amount: 500,
    });
    expect(result.success).toBe(true);
  });

  it('accepts settlement with group_id', () => {
    const result = settlementSchema.safeParse({
      group_id: UUID,
      paid_by: UUID,
      paid_to: UUID2,
      amount: 100,
    });
    expect(result.success).toBe(true);
  });

  it('accepts settlement with notes', () => {
    const result = settlementSchema.safeParse({
      paid_by: UUID,
      paid_to: UUID2,
      amount: 100,
      notes: 'Paid via UPI',
    });
    expect(result.success).toBe(true);
  });

  it('rejects when paid_by equals paid_to', () => {
    const result = settlementSchema.safeParse({
      paid_by: UUID,
      paid_to: UUID,
      amount: 100,
    });
    expect(result.success).toBe(false);
  });

  it('rejects zero amount', () => {
    const result = settlementSchema.safeParse({
      paid_by: UUID,
      paid_to: UUID2,
      amount: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative amount', () => {
    const result = settlementSchema.safeParse({
      paid_by: UUID,
      paid_to: UUID2,
      amount: -50,
    });
    expect(result.success).toBe(false);
  });

  it('rejects amount over maximum', () => {
    const result = settlementSchema.safeParse({
      paid_by: UUID,
      paid_to: UUID2,
      amount: 10000000000,
    });
    expect(result.success).toBe(false);
  });

  it('rejects notes over 5000 chars', () => {
    const result = settlementSchema.safeParse({
      paid_by: UUID,
      paid_to: UUID2,
      amount: 100,
      notes: 'x'.repeat(5001),
    });
    expect(result.success).toBe(false);
  });
});

// -------------------------------------------------------
// Profile validator
// -------------------------------------------------------

describe('updateProfileSchema', () => {
  it('accepts valid profile data', () => {
    const result = updateProfileSchema.safeParse({
      name: 'John Doe',
    });
    expect(result.success).toBe(true);
  });

  it('accepts with description', () => {
    const result = updateProfileSchema.safeParse({
      name: 'John',
      description: 'Hello world',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = updateProfileSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects name over 100 chars', () => {
    const result = updateProfileSchema.safeParse({ name: 'x'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('rejects description over 500 chars', () => {
    const result = updateProfileSchema.safeParse({
      name: 'Test',
      description: 'x'.repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it('accepts description with exactly 500 chars', () => {
    const result = updateProfileSchema.safeParse({
      name: 'Test',
      description: 'x'.repeat(500),
    });
    expect(result.success).toBe(true);
  });
});

// -------------------------------------------------------
// Group member validators
// -------------------------------------------------------

describe('addMemberSchema', () => {
  it('accepts valid UUIDs', () => {
    const result = addMemberSchema.safeParse({
      groupId: UUID,
      userId: UUID2,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid groupId', () => {
    const result = addMemberSchema.safeParse({
      groupId: 'not-uuid',
      userId: UUID,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid userId', () => {
    const result = addMemberSchema.safeParse({
      groupId: UUID,
      userId: 'bad',
    });
    expect(result.success).toBe(false);
  });
});

describe('removeMemberSchema', () => {
  it('accepts valid UUIDs', () => {
    const result = removeMemberSchema.safeParse({
      groupId: UUID,
      userId: UUID2,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing fields', () => {
    expect(removeMemberSchema.safeParse({}).success).toBe(false);
    expect(removeMemberSchema.safeParse({ groupId: UUID }).success).toBe(false);
  });
});
