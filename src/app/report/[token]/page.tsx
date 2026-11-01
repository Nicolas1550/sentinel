import { notFound } from 'next/navigation';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { FileText, Globe2, ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';
export default async function PublicReport({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isDatabaseConfigured() || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) notFound();
  let row: Record<string, unknown> | undefined;
  try {
    const sql = getDb();
    const rows = await sql`SELECT title, source, event_count, max_magnitude, summary, created_at
      FROM generated_reports WHERE share_token = ${token} AND is_public = TRUE LIMIT 1`;
    row = rows[0] as Record<string, unknown> | undefined;
  } catch { notFound(); }
  if (!row) notFound();
  const summary = row.summary && typeof row.summary === 'object' && !Array.isArray(row.summary)
    ? row.summary as Record<string, unknown> : {};
  const region = typeof summary.regionName === 'string' ? summary.regionName.slice(0, 100) : 'No especificada';
  const range = summary.range === 'week' ? '7 días' : '24 horas';
  const minMag = typeof summary.minMag === 'number' && Number.isFinite(summary.minMag) ? summary.minMag.toFixed(1) : '—';
  const avgDepth = typeof summary.avgDepth === 'number' && Number.isFinite(summary.avgDepth) ? `${summary.avgDepth} km` : '—';
  const createdAt = new Date(String(row.created_at)).toLocaleString('es-AR', { timeZone: 'UTC' });
  return <main className="v4-public-report">
    <div className="v4-public-top"><div><Globe2 size={27}/><strong>ATLAS<span>.</span> EARTH INTELLIGENCE</strong></div><a href="/">Explorar ATLAS ↗</a></div>
    <article className="v4-public-paper"><div className="v4-public-heading"><div><span>INTELLIGENCE REPORT · SOLO LECTURA</span><h1>{String(row.title)}</h1><p>Resumen estadístico guardado por un usuario de ATLAS.</p></div><FileText size={36}/></div>
      <div className="v4-public-kpis"><div><span>EVENTOS ANALIZADOS</span><strong>{Number(row.event_count)}</strong></div><div><span>MAGNITUD MÁXIMA</span><strong>{row.max_magnitude === null ? '—' : Number(row.max_magnitude).toFixed(1)}</strong></div><div><span>PROFUNDIDAD MEDIA</span><strong>{avgDepth}</strong></div></div>
      <dl className="v4-public-details"><div><dt>Período</dt><dd>{range}</dd></div><div><dt>Región</dt><dd>{region}</dd></div><div><dt>Magnitud mínima</dt><dd>M {minMag}</dd></div><div><dt>Fecha de registro</dt><dd>{createdAt} UTC</dd></div><div><dt>Origen de datos</dt><dd>{row.source === 'usgs' ? 'USGS' : 'SIMULACIÓN (no real)'}</dd></div></dl>
      <p className="v4-public-warning"><ShieldCheck size={16}/> Informe generado a partir de una instantánea estadística. No contiene un PDF almacenado, no es una predicción sísmica ni una alerta oficial de emergencias.</p>
      <p className="v4-public-foot">Para guardar como PDF, utilizá Imprimir (Ctrl+P) → Guardar como PDF.</p>
    </article>
  </main>;
}
