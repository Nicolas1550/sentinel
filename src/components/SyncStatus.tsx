'use client';
import { useEffect, useState } from 'react';
import { Activity, Clock3, RefreshCw } from 'lucide-react';
type Run = { status: string; scanned: number; archived: number; notified: number;
  rulesChecked: number; truncated: boolean; startedAt: string; completedAt: string | null };
export default function SyncStatus() {
  const [run, setRun] = useState<Run | null>(null);
  const [loading, setLoading] = useState(true);
  async function refresh() {
    setLoading(true);
    try {
      const response = await fetch('/api/sync/status', { cache: 'no-store' });
      const data = await response.json();
      setRun(response.ok ? data.lastRun : null);
    } catch { setRun(null); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);
  return <div className="panel v4-sync-status"><div className="v4-sync-title"><Activity size={18}/><div><span className="section-kicker">ATLAS V4 · SERVER AUTOMATION</span><h3>Sincronización programada</h3></div><button className="v3-icon" onClick={() => void refresh()} disabled={loading} title="Actualizar estado"><RefreshCw size={16}/></button></div>
    {run ? <><div className="v4-sync-metrics"><div><span>ESTADO</span><strong>{run.status === 'success' ? 'COMPLETADA' : run.status === 'failed' ? 'ERROR' : 'EN PROCESO'}</strong></div><div><span>EVENTOS USGS</span><strong>{run.scanned}</strong></div><div><span>ARCHIVADOS NUEVOS</span><strong>{run.archived}</strong></div><div><span>NOTIFICACIONES</span><strong>{run.notified}</strong></div></div><p><Clock3 size={13}/> Última ejecución: {new Date(run.startedAt).toLocaleString('es-AR')} · {run.rulesChecked} reglas revisadas{run.truncated ? ' · resultados limitados' : ''}.</p></> : <p><Clock3 size={13}/> Todavía no hay sincronizaciones registradas. Para activarlas en producción, configurá CRON_SECRET y desplegá el cron diario de Vercel.</p>}
    <small>Programación propuesta: todos los días a las 10:00 UTC. No envía SMS, correos ni avisos de emergencia; genera notificaciones dentro de ATLAS.</small>
  </div>;
}
