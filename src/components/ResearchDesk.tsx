'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, BookmarkPlus, Database, FlaskConical, LockKeyhole, RefreshCw, Trash2 } from 'lucide-react';
import type { Earthquake, User } from '@/lib/types';
import InvestigationWorkspace from './InvestigationWorkspace';

export type ResearchFilters = { range: 'day' | 'week'; regionId: string; minMag: number; search: string };
export type Investigation = ResearchFilters & { id: string; title: string; notes: string; createdAt: string };
type Props = { user: User | null; filters: ResearchFilters; selectedEvent: Earthquake | null; onApply: (filters: ResearchFilters) => void; onLogin: () => void };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: 'no-store', credentials: 'same-origin' });
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Error de conexión.');
  return data as T;
}

export default function ResearchDesk({ user, filters, selectedEvent, onApply, onLogin }: Props) {
  const [items, setItems] = useState<Investigation[]>([]);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const refresh = useCallback(async () => {
    if (!user) { setItems([]); return; }
    setLoading(true);
    try { const data = await api<{ investigations: Investigation[] }>('/api/investigations'); setItems(data.investigations); setMessage(''); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudieron cargar las investigaciones.'); }
    finally { setLoading(false); }
  }, [user]);
  useEffect(() => { void refresh(); }, [refresh]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      await api('/api/investigations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...filters, title, notes }) });
      setTitle(''); setNotes('');
      await refresh();
      setMessage('Investigación guardada en Neon PostgreSQL.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo guardar.'); }
    finally { setBusy(false); }
  }
  async function remove(id: string) {
    setBusy(true);
    try { await api(`/api/investigations/${encodeURIComponent(id)}`, { method: 'DELETE' }); await refresh(); setMessage('Investigación eliminada.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo eliminar.'); }
    finally { setBusy(false); }
  }

  return <section className="research-panel" aria-label="Laboratorio de investigaciones">
    <div className="research-hero panel"><span className="section-kicker">ATLAS / MÓDULO 03 · POSTGRESQL</span><h2>Research <em>Desk.</em></h2><p>Guardá configuraciones de exploración, documentá hallazgos y retomá tu investigación desde cualquier dispositivo con tu cuenta.</p><div className="research-chips"><span><Database size={14}/> Neon PostgreSQL</span><span><FlaskConical size={14}/> Investigación persistente</span></div></div>
    {!user ? <div className="panel research-locked"><LockKeyhole size={33}/><h3>Tu espacio de investigación</h3><p>Iniciá sesión para guardar filtros y notas en tu base de datos privada.</p><button className="button button-primary" onClick={onLogin}>Ingresar o crear cuenta <ArrowRight size={15}/></button></div> : <div className="research-grid">
      <form className="panel research-form" onSubmit={event => void save(event)}><div className="research-panel-title"><BookmarkPlus size={19}/><div><span className="section-kicker">NUEVA INVESTIGACIÓN</span><h3>Guardar vista actual</h3></div></div><label htmlFor="research-title">TÍTULO</label><input id="research-title" required minLength={3} maxLength={100} placeholder="Ej. Actividad sísmica en Japón" value={title} onChange={e=>setTitle(e.target.value)}/><label htmlFor="research-notes">NOTAS DE ANÁLISIS</label><textarea id="research-notes" rows={5} maxLength={2000} placeholder="¿Qué observaste? ¿Qué querés comparar?" value={notes} onChange={e=>setNotes(e.target.value)}/><div className="research-current"><strong>FILTROS QUE SE GUARDARÁN</strong><span>{filters.range === 'week' ? '7 días' : '24 horas'} · {filters.regionId} · M ≥ {filters.minMag.toFixed(1)}{filters.search ? ` · ${filters.search}` : ''}</span></div><button type="submit" className="button button-primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar en PostgreSQL'} <Database size={15}/></button></form>
      <div className="panel research-saved"><div className="research-panel-title"><Database size={19}/><div><span className="section-kicker">ARCHIVO PERSONAL</span><h3>Mis investigaciones <small>{items.length}</small></h3></div><button className="research-refresh" onClick={() => void refresh()} title="Actualizar" aria-label="Actualizar investigaciones" disabled={loading}><RefreshCw size={16}/></button></div>{loading ? <p className="research-empty">Cargando investigaciones…</p> : items.length === 0 ? <p className="research-empty">Todavía no hay investigaciones. Guardá la primera a la izquierda y aparecerá acá.</p> : <div className="research-list">{items.map(item=><article key={item.id} className="research-item"><div className="research-item-meta"><span>{new Date(item.createdAt).toLocaleDateString('es-AR')}</span><span>M ≥ {item.minMag.toFixed(1)}</span></div><h4>{item.title}</h4>{item.notes && <p>{item.notes}</p>}<div className="research-item-bottom"><button onClick={() => onApply({ range:item.range, regionId:item.regionId, minMag:item.minMag, search:item.search })}><ArrowRight size={14}/> Abrir vista</button><button className="research-delete" title="Eliminar investigación" aria-label={`Eliminar ${item.title}`} onClick={() => void remove(item.id)} disabled={busy}><Trash2 size={15}/></button></div></article>)}</div>}</div>
    </div>}
    {user && items.length > 0 && <InvestigationWorkspace investigations={items} selectedEvent={selectedEvent} onUpdated={refresh}/>}
    {message && <p className="research-message" role="status">{message}</p>}
    <p className="research-disclaimer">Tus investigaciones y eventos vinculados son privados. Los eventos se verifican con USGS; el archivo global de Neon se administra por separado.</p>
  </section>;
}
