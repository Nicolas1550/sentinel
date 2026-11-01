'use client';

import { useCallback, useEffect, useState } from 'react';
import { BookOpenText, Link2, Pencil, PlusCircle, Save, Trash2 } from 'lucide-react';
import type { Earthquake } from '@/lib/types';
import type { Investigation } from './ResearchDesk';

type LinkedEvent = { id: string; earthquakeId: string; title: string; magnitude: number;
  depth: number; occurredAt: string; url: string; note: string; addedAt: string };
type Props = { investigations: Investigation[]; selectedEvent: Earthquake | null; onUpdated: () => Promise<void> };
async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: 'no-store', credentials: 'same-origin' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Error al consultar PostgreSQL.');
  return data as T;
}
export default function InvestigationWorkspace({ investigations, selectedEvent, onUpdated }: Props) {
  const [id, setId] = useState(investigations[0]?.id ?? '');
  const current = investigations.find(item => item.id === id) ?? investigations[0];
  const [events, setEvents] = useState<LinkedEvent[]>([]);
  const [title, setTitle] = useState(current?.title ?? '');
  const [notes, setNotes] = useState(current?.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const refresh = useCallback(async (researchId: string) => {
    if (!researchId) { setEvents([]); return; }
    try {
      const data = await api<{ events: LinkedEvent[] }>(`/api/investigations/${researchId}/events`);
      setEvents(data.events);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudieron cargar eventos.'); }
  }, []);
  useEffect(() => {
    if (!current) return;
    setId(current.id);
    setTitle(current.title); setNotes(current.notes);
    void refresh(current.id);
  }, [current?.id, current?.title, current?.notes, refresh]);

  async function updateResearch() {
    if (!current) return;
    setBusy(true); setMessage('');
    try {
      await api(`/api/investigations/${current.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, notes }) });
      await onUpdated(); setMessage('Expediente actualizado en Neon.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo actualizar.'); }
    finally { setBusy(false); }
  }
  async function attach() {
    if (!current || !selectedEvent) return;
    setBusy(true); setMessage('');
    try {
      const data = await api<{ added: boolean }>(`/api/investigations/${current.id}/events`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ earthquakeId: selectedEvent.id }),
      });
      await refresh(current.id);
      setMessage(data.added ? 'Terremoto verificado en USGS y vinculado al expediente.' : 'Este terremoto ya estaba vinculado.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo vincular el evento.'); }
    finally { setBusy(false); }
  }
  async function updateEvent(item: LinkedEvent, note: string) {
    if (!current) return;
    setBusy(true); setMessage('');
    try {
      await api(`/api/investigations/${current.id}/events/${item.id}`, { method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note }) });
      await refresh(current.id); setMessage('Nota del terremoto guardada.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo guardar la nota.'); }
    finally { setBusy(false); }
  }
  async function removeEvent(item: LinkedEvent) {
    if (!current || !window.confirm(`¿Quitar «${item.title}» de esta investigación?`)) return;
    setBusy(true); setMessage('');
    try {
      await api(`/api/investigations/${current.id}/events/${item.id}`, { method: 'DELETE' });
      await refresh(current.id); setMessage('Evento desvinculado; no se eliminó de USGS ni de tus favoritos.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo quitar.'); }
    finally { setBusy(false); }
  }
  if (!current) return null;
  return <section className="panel v4-workspace" aria-label="Expediente de investigación avanzado">
    <div className="v4-workspace-heading"><div><span className="section-kicker">ATLAS V4 · INVESTIGATION WORKSPACE</span><h3><BookOpenText size={20}/> Expediente de investigación</h3><p>Vinculá terremotos reales, editá conclusiones y guardá notas individuales.</p></div><label>Investigación activa<select value={current.id} onChange={e => setId(e.target.value)}>{investigations.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label></div>
    <div className="v4-workspace-grid"><div className="v4-workspace-editor"><label>Título<input value={title} onChange={e => setTitle(e.target.value)} maxLength={100}/></label><label>Conclusiones / notas generales<textarea rows={5} value={notes} onChange={e => setNotes(e.target.value)} maxLength={2000}/></label><button className="button button-primary" onClick={() => void updateResearch()} disabled={busy || title.trim().length < 3}><Save size={15}/> Guardar cambios</button></div>
    <div className="v4-workspace-attach"><h4><Link2 size={16}/> Asociar un terremoto</h4><p>Elegí un evento real en «Exploración» y regresá a «Laboratorio».</p><div className="v4-attach-preview"><strong>{selectedEvent ? `M ${selectedEvent.magnitude.toFixed(1)} · ${selectedEvent.place}` : 'Ningún evento seleccionado'}</strong><small>{selectedEvent?.id ?? 'Seleccioná un evento del mapa o de Actividad reciente.'}</small></div><button className="button button-outline" disabled={busy || !selectedEvent || selectedEvent.id.startsWith('demo-')} onClick={() => void attach()}><PlusCircle size={15}/> Vincular evento USGS</button><p>El servidor verifica el ID directamente en USGS antes de guardarlo.</p></div></div>
    <div className="v4-linked-head"><h4>Terremotos del expediente <span>{events.length}</span></h4></div>
    {events.length === 0 ? <p className="v4-empty">Todavía no vinculaste terremotos a esta investigación.</p> : <div className="v4-linked-list">{events.map(item => <LinkedEventCard key={item.id} item={item} busy={busy} onSave={note => void updateEvent(item, note)} onRemove={() => void removeEvent(item)}/>)}</div>}
    {message && <p className="v3-message" role="status">{message}</p>}
  </section>;
}
function LinkedEventCard({ item, busy, onSave, onRemove }: { item: LinkedEvent; busy: boolean; onSave: (note: string) => void; onRemove: () => void }) {
  const [note, setNote] = useState(item.note);
  useEffect(() => { setNote(item.note); }, [item.note]);
  return <article className="v4-linked-item"><div><strong>M {item.magnitude.toFixed(1)} · {item.title}</strong><small>{new Date(item.occurredAt).toLocaleDateString('es-AR')} · {item.depth.toFixed(1)} km</small>{item.url && <a href={item.url} target="_blank" rel="noopener noreferrer">Ficha USGS ↗</a>}</div><div className="v4-linked-note"><textarea aria-label={`Nota de ${item.title}`} rows={2} maxLength={1000} value={note} onChange={e => setNote(e.target.value)} placeholder="Tu análisis de este terremoto…"/><button title="Guardar nota" disabled={busy || note === item.note} onClick={() => onSave(note)}><Pencil size={15}/> Guardar nota</button><button title="Quitar evento" disabled={busy} onClick={onRemove}><Trash2 size={15}/></button></div></article>;
}
