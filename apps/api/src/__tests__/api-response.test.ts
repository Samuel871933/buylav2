import { describe, it, expect } from 'vitest';
import { success, paginated, error } from '../lib/api-response';

function createMockRes() {
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(data: any) {
      res.body = data;
      return res;
    },
  };
  return res;
}

describe('API Response helpers', () => {
  describe('success', () => {
    it('returns success response with data', () => {
      const res = createMockRes();
      success(res, { foo: 'bar' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ success: true, data: { foo: 'bar' } });
    });

    it('supports custom status code', () => {
      const res = createMockRes();
      success(res, { id: 1 }, 201);

      expect(res.statusCode).toBe(201);
    });
  });

  describe('paginated', () => {
    it('returns paginated response with calculated totalPages', () => {
      const res = createMockRes();
      paginated(res, [1, 2, 3], { page: 1, limit: 3, total: 10 });

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([1, 2, 3]);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(3);
      expect(res.body.pagination.total).toBe(10);
      expect(res.body.pagination.totalPages).toBe(4); // ceil(10/3) = 4
    });

    it('handles single page', () => {
      const res = createMockRes();
      paginated(res, [1], { page: 1, limit: 20, total: 1 });

      expect(res.body.pagination.totalPages).toBe(1);
    });

    it('includes extra data when provided', () => {
      const res = createMockRes();
      paginated(res, [], {
        page: 1,
        limit: 20,
        total: 0,
        extra: { level2Count: 5, totalSponsorEarnings: 100 },
      });

      expect(res.body.level2Count).toBe(5);
      expect(res.body.totalSponsorEarnings).toBe(100);
    });
  });

  describe('error', () => {
    it('returns error response with code and message', () => {
      const res = createMockRes();
      error(res, 'NOT_FOUND', 'Ressource introuvable', 404);

      expect(res.statusCode).toBe(404);
      expect(res.body).toEqual({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Ressource introuvable' },
      });
    });

    it('returns 500 for internal errors', () => {
      const res = createMockRes();
      error(res, 'INTERNAL_ERROR', 'Erreur interne', 500);

      expect(res.statusCode).toBe(500);
    });
  });
});
