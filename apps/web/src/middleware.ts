import { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import {
  COOKIE_AMB_REF_MAX_AGE,
  COOKIE_VISITOR_ID_MAX_AGE,
} from '@buyla/shared';

const intlMiddleware = createMiddleware(routing);

const API_URL = process.env.API_URL || 'http://localhost:4000';

export default function middleware(request: NextRequest) {
  const response = intlMiddleware(request);

  const ref = request.nextUrl.searchParams.get('ref');
  if (!ref) return response;

  // Last-click attribution: always overwrite amb_ref
  response.cookies.set('amb_ref', ref, {
    maxAge: COOKIE_AMB_REF_MAX_AGE,
    path: '/',
    sameSite: 'lax',
  });

  // Persist visitor_id if not already set
  let visitorId = request.cookies.get('visitor_id')?.value;
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    response.cookies.set('visitor_id', visitorId, {
      maxAge: COOKIE_VISITOR_ID_MAX_AGE,
      path: '/',
      sameSite: 'lax',
    });
  }

  // Fire & forget: track the visit without awaiting
  fetch(`${API_URL}/api/tracking/visit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref, visitor_id: visitorId, url: request.url }),
  }).catch(() => {
    // Silently ignore tracking errors
  });

  return response;
}

export const config = {
  matcher: ['/', '/(fr|en)/:path*'],
};
