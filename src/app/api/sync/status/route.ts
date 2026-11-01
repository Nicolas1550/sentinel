import { NextResponse } from 'next/server';
import { getDb, isDatabaseConfigured } from '@/lib/db';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  if (!isDatabaseConfigured()) return NextResponse.json({ lastRun: null });
  try {
    const sql = getDb();
    const rows = await sql`SELECT status, scanned, archived, notifications_created, rules_checked,
      truncated, started_at, completed_at FROM sync_runs ORDER BY started_at DESC LIMIT 1`;
    const row = rows[0];
    return NextResponse.json({ lastRun: row ? {
      status: String(row.status), scanned: Number(row.scanned), archived: Number(row.archived),
      notified: Number(row.notifications_created), rulesChecked: Number(row.rules_checked),
      truncated: Boolean(row.truncated), startedAt: new Date(String(row.started_at)).toISOString(),
      completedAt: row.completed_at ? new Date(String(row.completed_at)).toISOString() : null,
    } : null }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ lastRun: null }); }
}
