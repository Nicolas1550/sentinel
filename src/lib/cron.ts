import { createHash, timingSafeEqual } from 'node:crypto';

export function authorizedCron(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32 || secret.includes('REEMPLAZAR') || !header?.startsWith('Bearer ')) return false;
  const received = createHash('sha256').update(header.slice(7)).digest();
  const expected = createHash('sha256').update(secret).digest();
  return timingSafeEqual(received, expected);
}
