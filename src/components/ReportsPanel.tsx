'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, Database, Download, FileText, Printer, RefreshCw, ShieldCheck, Share2, LockKeyhole } from 'lucide-react';
import type { Earthquake, User } from '@/lib/types';

type Report = { id: string; title: string; source: string; eventCount: number; maxMagnitude: number | null; createdAt: string; isPublic: boolean; shareToken: string | null };
type Props = { events: Earthquake[]; source: 'usgs' | 'demo' | 'loading'; user: User | null; range: 'day' | 'week'; regionName: string; minMag: number };
export default function ReportsPanel({ events, source, user, range, regionName, minMag }: Props) {
  const [title, setTitle] = useState('ATLAS · Informe de actividad sísmica');
  const [saved, setSaved] = useState<Report[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const max = useMemo(() => events.length ? Math.max(...events.map(item => item.magnitude)) : 0, [events]);
  const avgDepth = useMemo(() => events.length ? events.reduce((sum, item) => sum + item.depth, 0) / events.length : 0, [events]);
  const strongest = useMemo(() => [...events].sort((a, b) => b.magnitude - a.magnitude).slice(0, 12), [events]);
  const refresh = useCallback(async () => {
    if (!user) { setSaved([]); return; }
    try { const response = await fetch('/api/reports', { cache: 'no-store' }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setSaved(data.reports); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudieron cargar informes.'); }
  }, [user]);
  useEffect(() => { void refresh(); }, [refresh]);
  async function save() {
    if (!user) { setMessage('Iniciá sesión para guardar el resumen en PostgreSQL. Podés imprimir sin iniciar sesión.'); return; }
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, source: source === 'usgs' ? 'usgs' : 'demo', eventCount: events.length,
          maxMagnitude: events.length ? max : null, summary: { range, regionName, minMag, avgDepth: Math.round(avgDepth), generatedAt: new Date().toISOString() } }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar.');
      await refresh(); setMessage('Resumen guardado en Neon. Para obtener el PDF usá «Imprimir / Guardar PDF».');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo guardar.'); }
    finally { setBusy(false); }
  }
  async function toggleShare(report: Report) {
    setBusy(true); setMessage('');
    try {
      const response = await fetch(`/api/reports/${report.id}/share`, { method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: !report.isPublic }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo compartir.');
      await refresh();
      if (data.isPublic && data.token) {
        const url = `${window.location.origin}/report/${data.token}`;
        try { await navigator.clipboard.writeText(url); setMessage('Enlace público de solo lectura copiado.'); }
        catch { setMessage(`Informe publicado: ${url}`); }
      } else setMessage('Informe privado nuevamente. El enlace público dejó de funcionar.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Error al compartir.'); }
    finally { setBusy(false); }
  }
  async function copyLink(report: Report) {
    if (!report.shareToken) return;
    const url = `${window.location.origin}/report/${report.shareToken}`;
    try { await navigator.clipboard.writeText(url); setMessage('Enlace público copiado.'); }
    catch { setMessage(url); }
  }
  return <section className="v3-module reports-panel" aria-label="Informes sísmicos">
    <div className="panel v3-hero"><span className="section-kicker">ATLAS / MÓDULO 06 · INTELLIGENCE REPORTS</span><h2>Report <em>Studio.</em></h2><p>Prepará un informe a partir de los filtros activos. Guardá estadísticas en PostgreSQL, exportá la vista como PDF con el navegador y publicá enlaces de solo lectura.</p><div className="v3-chips"><span><FileText size={14}/> Informe imprimible</span><span><BarChart3 size={14}/> Datos actuales</span><span><Database size={14}/> Archivo de informes</span></div></div>
    <div className="panel v3-report-actions"><label>Título del informe<input value={title} onChange={event => setTitle(event.target.value)} maxLength={100}/></label><button className="button button-outline" onClick={() => window.print()}><Printer size={16}/> Imprimir / Guardar PDF</button><button className="button button-primary" disabled={busy || source === 'loading' || title.trim().length < 3} onClick={() => void save()}><Download size={16}/> {busy ? 'Guardando…' : 'Guardar resumen en Neon'}</button></div>
    {message && <p className="v3-message" role="status">{message}</p>}
    <article className="panel v3-report-paper report-print"><div className="v3-report-top"><div><span>ATLAS · EARTH INTELLIGENCE</span><h2>{title}</h2><p>Informe exploratorio basado en los datos que la aplicación consultó a USGS.</p></div><ShieldCheck size={36}/></div>
      <div className="v3-report-meta"><span>Período: {range === 'week' ? 'Últimos 7 días' : 'Últimas 24 horas'}</span><span>Región: {regionName}</span><span>Magnitud mínima: M {minMag.toFixed(1)}</span><span>Generado: {new Date().toLocaleString('es-AR')}</span></div>
      <div className="v3-report-stats"><div><small>EVENTOS ANALIZADOS</small><strong>{events.length}</strong></div><div><small>MAGNITUD MÁXIMA</small><strong>{max.toFixed(1)}</strong></div><div><small>PROFUNDIDAD MEDIA</small><strong>{avgDepth.toFixed(0)} km</strong></div></div>
      <h3>Eventos de mayor magnitud</h3><table><thead><tr><th>Ubicación</th><th>Magnitud</th><th>Profundidad</th><th>Fecha UTC</th></tr></thead><tbody>{strongest.map(event => <tr key={event.id}><td>{event.place}</td><td>M {event.magnitude.toFixed(1)}</td><td>{event.depth.toFixed(0)} km</td><td>{new Date(event.time).toLocaleDateString('es-AR', { timeZone: 'UTC' })}</td></tr>)}</tbody></table>
      <p className="v3-report-disclaimer">FUENTE: {source === 'usgs' ? 'USGS Earthquake Hazards Program' : source === 'demo' ? 'DATOS SIMULADOS — NO USAR COMO INFORME REAL' : 'CARGANDO'} · Datos según el feed y filtros activos al generar la vista. No es una predicción ni un informe oficial de emergencias.</p>
    </article>
    <div className="panel v3-card"><div className="v3-card-head"><Database size={19}/><div><span className="section-kicker">ARCHIVO PERSONAL</span><h3>Informes guardados <small>{saved.length}</small></h3></div><button className="v3-icon" onClick={() => void refresh()} title="Actualizar"><RefreshCw size={16}/></button></div>{!user ? <p className="v3-empty">Iniciá sesión para guardar resúmenes en Neon. La exportación a PDF funciona también sin cuenta.</p> : saved.length === 0 ? <p className="v3-empty">Todavía no guardaste ningún resumen.</p> : <div className="v3-saved-reports">{saved.map(report => <div className="v4-report-row" key={report.id}><FileText size={16}/><strong>{report.title}</strong><span>{report.eventCount} eventos · {new Date(report.createdAt).toLocaleDateString('es-AR')}</span><button disabled={busy} title={report.isPublic ? 'Volver privado' : 'Publicar enlace'} onClick={() => void toggleShare(report)}>{report.isPublic ? <LockKeyhole size={13}/> : <Share2 size={13}/>} {report.isPublic ? 'Privatizar' : 'Compartir'}</button>{report.isPublic && <button disabled={busy} onClick={() => void copyLink(report)}>Copiar URL</button>}</div>)}</div>}</div>
    <p className="v3-subnote">«Guardar resumen» almacena estadísticas, no un archivo PDF. Los enlaces públicos muestran únicamente esos datos, nunca tus credenciales, favoritos ni investigaciones. Para el PDF usá el diálogo de impresión.</p>
  </section>;
}
