import { describe, it, expect } from 'vitest';
import {
  emailSchema,
  passwordSchema,
  nameSchema,
  referralCodeSchema,
  registerSchema,
  loginSchema,
  paginationSchema,
} from '../validation';

describe('emailSchema', () => {
  it('accepts valid emails', () => {
    expect(emailSchema.safeParse('user@example.com').success).toBe(true);
    expect(emailSchema.safeParse('a.b@c.fr').success).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(emailSchema.safeParse('notanemail').success).toBe(false);
    expect(emailSchema.safeParse('').success).toBe(false);
    expect(emailSchema.safeParse('@missing.com').success).toBe(false);
  });
});

describe('passwordSchema', () => {
  it('accepts valid passwords', () => {
    expect(passwordSchema.safeParse('MyPass123').success).toBe(true);
    expect(passwordSchema.safeParse('StrongP4ss!').success).toBe(true);
  });

  it('rejects too short passwords', () => {
    expect(passwordSchema.safeParse('Ab1').success).toBe(false);
  });

  it('rejects passwords without uppercase', () => {
    expect(passwordSchema.safeParse('mypass123').success).toBe(false);
  });

  it('rejects passwords without digits', () => {
    expect(passwordSchema.safeParse('MyPassword').success).toBe(false);
  });
});

describe('nameSchema', () => {
  it('accepts valid names', () => {
    expect(nameSchema.safeParse('Jean Dupont').success).toBe(true);
    expect(nameSchema.safeParse('AB').success).toBe(true);
  });

  it('rejects too short names', () => {
    expect(nameSchema.safeParse('A').success).toBe(false);
  });

  it('rejects empty names', () => {
    expect(nameSchema.safeParse('').success).toBe(false);
  });
});

describe('referralCodeSchema', () => {
  it('accepts valid 8-char alphanumeric codes', () => {
    expect(referralCodeSchema.safeParse('ABCD1234').success).toBe(true);
    expect(referralCodeSchema.safeParse('XYZ98765').success).toBe(true);
  });

  it('rejects wrong length', () => {
    expect(referralCodeSchema.safeParse('ABC').success).toBe(false);
    expect(referralCodeSchema.safeParse('ABCDEFGHI').success).toBe(false);
  });

  it('rejects lowercase', () => {
    expect(referralCodeSchema.safeParse('abcd1234').success).toBe(false);
  });
});

describe('registerSchema', () => {
  it('validates full registration data', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'MyPass123',
      name: 'Jean Dupont',
    });
    expect(result.success).toBe(true);
  });

  it('accepts optional referral_code', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'MyPass123',
      name: 'Jean Dupont',
      referral_code: 'ABCD1234',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing required fields', () => {
    expect(registerSchema.safeParse({}).success).toBe(false);
    expect(registerSchema.safeParse({ email: 'a@b.com' }).success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('validates login data', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'any',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('paginationSchema', () => {
  it('uses defaults when no values provided', () => {
    const result = paginationSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('coerces string values', () => {
    const result = paginationSchema.parse({ page: '3', limit: '50' });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(50);
  });

  it('rejects limit > 100', () => {
    expect(paginationSchema.safeParse({ limit: 200 }).success).toBe(false);
  });

  it('rejects negative page', () => {
    expect(paginationSchema.safeParse({ page: -1 }).success).toBe(false);
  });
});
