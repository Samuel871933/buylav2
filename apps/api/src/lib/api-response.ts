import type { Response } from 'express';

export function success<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ success: true, data });
}

export function paginated<T>(
  res: Response,
  data: T[],
  pagination: { page: number; limit: number; total: number; extra?: Record<string, unknown> },
): void {
  const { extra, ...pag } = pagination;
  res.json({
    success: true,
    data,
    pagination: {
      ...pag,
      totalPages: Math.ceil(pag.total / pag.limit),
    },
    ...(extra ? extra : {}),
  });
}

export function error(
  res: Response,
  code: string,
  message: string,
  status: number,
): void {
  res.status(status).json({ success: false, error: { code, message } });
}
