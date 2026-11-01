import { createHmac } from 'node:crypto';
import { getDb } from './db';

function digest(email: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET no configurado.');
  return createHmac('sha256', secret).update(email.trim().toLowerCase()).digest('hex');
}

export async function isLoginBlocked(email: string): Promise<boolean> {
  const sql = getDb();
  const rows = await sql`SELECT locked_until FROM auth_login_attempts WHERE email_digest = ${digest(email)}`;
  return Boolean(rows[0]?.locked_until && new Date(String(rows[0].locked_until)).getTime() > Date.now());
}

export async function recordLoginFailure(email: string): Promise<void> {
  const sql = getDb();
  const hash = digest(email);
  await sql`INSERT INTO auth_login_attempts (email_digest, attempts, last_attempt, locked_until)
    VALUES (${hash}, 1, NOW(), NULL)
    ON CONFLICT (email_digest) DO UPDATE SET
      attempts = CASE WHEN auth_login_attempts.last_attempt < NOW() - INTERVAL '15 minutes'
        THEN 1 ELSE auth_login_attempts.attempts + 1 END,
      last_attempt = NOW(),
      locked_until = CASE WHEN auth_login_attempts.last_attempt < NOW() - INTERVAL '15 minutes'
        THEN NULL WHEN auth_login_attempts.attempts >= 4
        THEN NOW() + INTERVAL '15 minutes' ELSE auth_login_attempts.locked_until END`;
}

export async function clearLoginFailures(email: string): Promise<void> {
  const sql = getDb();
  await sql`DELETE FROM auth_login_attempts WHERE email_digest = ${digest(email)}`;
}
