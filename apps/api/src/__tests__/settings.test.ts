import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@buyla/db', () => ({
  Setting: {
    findOne: vi.fn(),
    update: vi.fn(),
  },
  AuditLog: {
    create: vi.fn(),
  },
}));

import { getSetting, getSettingNumber, getSettingBoolean, invalidateSettingsCache } from '../lib/settings';
import { Setting } from '@buyla/db';

const mockFindOne = Setting.findOne as ReturnType<typeof vi.fn>;

describe('Settings helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateSettingsCache(); // Clear cache between tests
  });

  describe('getSetting', () => {
    it('returns value from DB', async () => {
      mockFindOne.mockResolvedValue({ value: 'hello' });

      const result = await getSetting('test_key');
      expect(result).toBe('hello');
    });

    it('returns empty string when setting not found', async () => {
      mockFindOne.mockResolvedValue(null);

      const result = await getSetting('missing_key');
      expect(result).toBe('');
    });

    it('caches result after first call', async () => {
      mockFindOne.mockResolvedValue({ value: 'cached' });

      await getSetting('cached_key');
      await getSetting('cached_key');

      // Only one DB call
      expect(mockFindOne).toHaveBeenCalledTimes(1);
    });
  });

  describe('getSettingNumber', () => {
    it('returns numeric value', async () => {
      mockFindOne.mockResolvedValue({ value: '42' });

      const result = await getSettingNumber('num_key');
      expect(result).toBe(42);
    });

    it('returns NaN for non-numeric', async () => {
      mockFindOne.mockResolvedValue({ value: 'abc' });

      const result = await getSettingNumber('nan_key');
      expect(isNaN(result)).toBe(true);
    });
  });

  describe('getSettingBoolean', () => {
    it('returns true for "true"', async () => {
      mockFindOne.mockResolvedValue({ value: 'true' });

      expect(await getSettingBoolean('bool_true')).toBe(true);
    });

    it('returns true for "1"', async () => {
      mockFindOne.mockResolvedValue({ value: '1' });
      invalidateSettingsCache();

      expect(await getSettingBoolean('bool_one')).toBe(true);
    });

    it('returns false for other values', async () => {
      mockFindOne.mockResolvedValue({ value: 'false' });

      expect(await getSettingBoolean('bool_false')).toBe(false);
    });

    it('returns false for empty string', async () => {
      mockFindOne.mockResolvedValue(null);

      expect(await getSettingBoolean('bool_empty')).toBe(false);
    });
  });
});
