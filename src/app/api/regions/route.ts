import { NextResponse } from 'next/server';
import { defaultRegions } from '@/lib/regions';
import { getDb, isDatabaseConfigured } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  if (!isDatabaseConfigured()) return NextResponse.json({ regions: defaultRegions, source: 'local' });
  try {
    const sql = getDb();
    const rows = await sql`SELECT id, name, min_lat, max_lat, min_lon, max_lon FROM regions ORDER BY CASE WHEN id = 'global' THEN 0 ELSE 1 END, name`;
    if (!rows.length) return NextResponse.json({ regions: defaultRegions, source: 'local' });
    const regions = rows.map(row => ({
      id: String(row.id), name: String(row.name),
      minLat: Number(row.min_lat), maxLat: Number(row.max_lat),
      minLon: Number(row.min_lon), maxLon: Number(row.max_lon),
    }));
    return NextResponse.json({ regions, source: 'database' });
  } catch {
    return NextResponse.json({ regions: defaultRegions, source: 'local' });
  }
}
