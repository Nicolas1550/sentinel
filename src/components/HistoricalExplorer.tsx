'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { CalendarDays, Clock3, Database, Globe2, MapPin, Radio, Search, Waves } from 'lucide-react';
import Globe from './Globe';
import TimeMachine from './TimeMachine';
import type { Earthquake, User } from '@/lib/types';

const day = (offset: number) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
type HistoricalResponse = { events: Earthquake[]; truncated: boolean; period: { start: string; end: string }; source: 'usgs' };
export default function HistoricalExplorer({ user, onLogin }: { user: User | null; onLogin: () => void }) {
  const [start, setStart] = useState(() => day(-8));
  const [end, setEnd] = useState(() => day(-1));
  const [mag, setMag] = useState('4.5');
  const [events, setEvents] = useState<Earthquake[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [selected, setSelected] = useState<Earthquake | null>(null);
  const [heatMode, setHeatMode] = useState(false);
  const [densityMode, setDensityMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const [message, setMessage] = useState('');
  const [archiving, setArchiving] = useState(false);
  const [archiveCount, setArchiveCount] = useState<number | null>(null);
  const [origin, setOrigin] = useState<'usgs' | 'neon'>('usgs');
  const [loadedQuery, setLoadedQuery] = useState<{ start: string; end: string; mag: number } | null>(null);
  const visible = useMemo(() => cursor === null ? events : events.filter(item => item.time <= cursor), [events, cursor]);
  const strongest = useMemo(() => events.length ? Math.max(...events.map(item => item.magnitude)) : 0, [events]);

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setMessage(''); setCursor(null); setLoaded(false);
    try {
      const params = new URLSearchParams({ start, end, mag });
      const response = await fetch(`/api/historical?${params}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'USGS no respondió.');
      const result = data as HistoricalResponse;
      setEvents(result.events); setSelected(result.events[0] ?? null); setTruncated(result.truncated); setLoaded(true); setOrigin('usgs'); setLoadedQuery({ start, end, mag: Number(mag) });
      if (result.truncated) setMessage('USGS devolvió el máximo de 400 eventos. Acortá el intervalo para ver más.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Error al consultar USGS.'); }
    finally { setLoading(false); }
  }
  async function searchArchive() {
    setLoading(true); setMessage(''); setCursor(null); setLoaded(false);
    try {
      const params = new URLSearchParams({ start, end, mag });
      const response = await fetch(`/api/archive?${params}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Neon no respondió.');
      const result = data as { events: Earthquake[]; truncated: boolean };
      setEvents(result.events); setSelected(result.events[0] ?? null);
      setTruncated(result.truncated); setLoaded(true); setOrigin('neon'); setLoadedQuery(null);
      if (!result.events.length) setMessage('No hay eventos archivados para esas fechas. Probá USGS o ejecutá la sincronización automática.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo leer Neon.'); }
    finally { setLoading(false); }
  }
  async function archive() {
    if (!user) { onLogin(); return; }
    if (!loadedQuery) return;
    setArchiving(true); setMessage('Archivando eventos USGS en Neon…');
    try {
      const response = await fetch('/api/historical/archive', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loadedQuery) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Error al archivar.');
      setMessage(`${result.archived} eventos nuevos archivados de ${result.inspected} consultados. Sin duplicados.`);
      const countResponse = await fetch('/api/historical/archive', { cache: 'no-store' });
      if (countResponse.ok) setArchiveCount((await countResponse.json()).total);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Error al archivar.'); }
    finally { setArchiving(false); }
  }
  return <section className="v3-module" aria-label="Explorador histórico de terremotos">
    <div className="panel v3-hero"><span className="section-kicker">ATLAS / MÓDULO 05 · USGS FDSN</span><h2>Historical <em>Explorer.</em></h2><p>Elegí fechas, consultá terremotos históricos reales y reproducí su aparición sobre el planeta 3D.</p><div className="v3-chips"><span><CalendarDays size={14}/> Fechas personalizadas</span><span><Globe2 size={14}/> Globo 3D</span><span><Radio size={14}/> Fuente USGS</span></div></div>
    <form className="panel v3-history-form" onSubmit={event => void search(event)}><label>Desde<input type="date" value={start} onChange={event => setStart(event.target.value)} required/></label><label>Hasta<input type="date" value={end} onChange={event => setEnd(event.target.value)} required/></label><label>Magnitud mínima<select value={mag} onChange={event => setMag(event.target.value)}><option value="3.5">M 3.5+</option><option value="4">M 4.0+</option><option value="4.5">M 4.5+</option><option value="5">M 5.0+</option><option value="6">M 6.0+</option><option value="7">M 7.0+</option></select></label><button className="button button-primary" type="submit" disabled={loading}><Search size={15}/>{loading ? 'Consultando USGS…' : 'Explorar historia'}</button></form>
    <div className="v3-archive-bar"><p>USGS: hasta 30 días por consulta. Neon: consultá el archivo persistente de hasta 366 días. Son fuentes distintas, siempre identificadas.</p><button className="button button-outline" disabled={loading} onClick={() => void searchArchive()}><Database size={15}/> Consultar archivo Neon</button><button className="button button-outline" disabled={!loaded || origin !== 'usgs' || !events.length || archiving} onClick={() => void archive()}><Database size={15}/>{archiving ? 'Archivando…' : user ? 'Archivar hasta 100 en Neon' : 'Ingresar para archivar'}</button>{archiveCount !== null && <span>{archiveCount} eventos públicos en el archivo compartido</span>}</div>
    {message && <p className="v3-message" role="status">{message}</p>}
    {loaded && <>
      <div className="v3-history-kpis"><div className="panel"><span>EVENTOS HISTÓRICOS</span><strong>{events.length}</strong></div><div className="panel"><span>MAGNITUD MÁXIMA</span><strong>{strongest.toFixed(1)}</strong></div><div className="panel"><span>FUENTE</span><strong>{origin === 'neon' ? 'NEON' : 'USGS'}</strong></div></div>
      {events.length ? <><div className="globe-panel v3-historical-globe"><div className="globe-topline"><div className="globe-label"><span className="radar-icon"><Clock3 size={16}/></span><div><strong>RECONSTRUCCIÓN HISTÓRICA</strong><span>{visible.length} / {events.length} EVENTOS VISIBLES</span></div></div><div className="globe-top-actions"><button className={`globe-rotate-button ${heatMode ? 'globe-heat-active' : ''}`} onClick={() => setHeatMode(value => !value)}><Waves size={14}/> Intensidad</button><button className={`globe-rotate-button ${densityMode ? 'globe-heat-active' : ''}`} onClick={() => setDensityMode(value => !value)}><MapPin size={14}/> Densidad</button></div></div><Globe events={visible} selectedId={selected?.id ?? null} onSelect={setSelected} autoRotate={false} heatMode={heatMode} densityMode={densityMode}/><div className="globe-bottomline"><span>{origin === 'neon' ? 'NEON · USGS ARCHIVE' : 'USGS · FDSN EVENT QUERY'}</span><span className="render-tag">WEBGL · THREE.JS</span></div></div><TimeMachine events={events} cursor={cursor} onCursorChange={setCursor} onSelect={setSelected}/>
        {selected && <div className="panel v3-history-selected"><span className="v3-quake-mag">M {selected.magnitude.toFixed(1)}</span><div><strong>{selected.place}</strong><span>{new Date(selected.time).toLocaleString('es-AR', { timeZone: 'UTC' })} UTC · {selected.depth.toFixed(1)} km profundidad</span></div>{selected.url && <a href={selected.url} target="_blank" rel="noopener noreferrer">Ver en USGS ↗</a>}</div>}
      </> : <div className="panel v3-empty">USGS no encontró eventos para estos filtros. Probá con una magnitud menor o más días.</div>}
      {truncated && <p className="v3-subnote">Resultados limitados a 400. Las estadísticas representan únicamente la muestra devuelta.</p>}
    </>}
  </section>;
}
