import 'server-only';
import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import type { NextRequest } from 'next/server';

/** Best-effort, server-side delivery. ATLAS auth never depends on SENTINEL uptime. */
export async function sendSecurityEvent(
  request: NextRequest,
  eventType: 'failed_login' | 'successful_login' | 'user_registered' | 'login_blocked' | 'registration_failed' | 'unauthorized_access' | 'logout',
  email: string,
  message: string,
): Promise<void> {
  const endpoint = process.env.SENTINEL_URL?.trim().replace(/\/$/, '');
  const key = process.env.SENTINEL_API_KEY?.trim();
  if (!endpoint || !key) { if (process.env.NODE_ENV !== 'production') console.warn('[ATLAS/SENTINEL] Missing SENTINEL_URL or SENTINEL_API_KEY'); return; }
  let url: URL;
  try {
    url = new URL('/api/events', endpoint);
    if (!['https:', 'http:'].includes(url.protocol)) return;
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') return;
  } catch { return; }

  // Forwarded headers are trustworthy only when provided by the hosting proxy.
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
  const realIp = request.headers.get('x-real-ip')?.trim() ?? '';
  const ip = [forwarded, realIp].find(value => isIP(value) !== 0) ?? '0.0.0.0';
  const secret = process.env.JWT_SECRET;
  const identifier = secret && email
    ? createHmac('sha256', secret).update(email.toLowerCase()).digest('hex').slice(0, 32)
    : undefined;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({
        event_type: eventType,
        source_ip: ip,
        user_identifier: identifier,
        message,
        metadata: { source: 'ATLAS', category: 'authentication' },
      }),
      signal: AbortSignal.timeout(2500),
      cache: 'no-store',
    });
    if (!response.ok) console.warn(`[ATLAS/SENTINEL] ${eventType} rejected: HTTP ${response.status}`);
    else if (process.env.NODE_ENV !== 'production') console.info(`[ATLAS/SENTINEL] ${eventType} accepted: HTTP ${response.status}`);
  } catch {
    console.warn(`[ATLAS/SENTINEL] ${eventType} delivery unavailable`);
  }
}
