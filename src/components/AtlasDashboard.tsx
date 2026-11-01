'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3, BellRing, Bookmark, CalendarDays, Check, ChevronRight,
  Clock3, Crosshair, Database, Download, ExternalLink, FlaskConical, Globe2, Layers3, LockKeyhole,
  FileText, LogIn, LogOut, MapPin, Pause, Play, Radio, RefreshCw, Search, ShieldCheck,
  Share2, SlidersHorizontal, Sparkles, UserRound, Waves, X,
} from 'lucide-react';
import Globe from './Globe';
import TimeMachine from './TimeMachine';
import AnalyticsPanel from './AnalyticsPanel';
import ResearchDesk, { type ResearchFilters } from './ResearchDesk';
import AlertCenter from './AlertCenter';
import HistoricalExplorer from './HistoricalExplorer';
import ReportsPanel from './ReportsPanel';
import { defaultRegions } from '@/lib/regions';
import type { Earthquake, Favorite, QuakeResponse, Region, User } from '@/lib/types';

type Tab = 'explore' | 'analytics' | 'research' | 'favorites' | 'alerts' | 'history' | 'reports';
type Range = 'day' | 'week';
type AuthMode = 'login' | 'register';

function magnitudeClass(magnitude: number) {
  return magnitude >= 5 ? 'danger' : magnitude >= 3.5 ? 'warning' : 'normal';
}
function magnitudeLabel(magnitude: number) {
  return magnitude >= 5 ? 'Fuerte' : magnitude >= 3.5 ? 'Moderado' : 'Leve';
}
function relativeTime(timestamp: number) {
  const diff = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Ahora';
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  return `Hace ${Math.floor(hours / 24)} d`;
}
function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(timestamp));
}
function formatCoords(lat: number, lon: number) {
  return `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'} / ${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? 'E' : 'O'}`;
}
async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, credentials: 'same-origin', cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'No se pudo completar la solicitud.');
  return data as T;
}

export default function AtlasDashboard() {
  const [tab, setTab] = useState<Tab>('explore');
  const [range, setRange] = useState<Range>('day');
  const [minMag, setMinMag] = useState(2.5);
  const [regionId, setRegionId] = useState('global');
  const [regions, setRegions] = useState<Region[]>(defaultRegions);
  const [search, setSearch] = useState('');
  const [events, setEvents] = useState<Earthquake[]>([]);
  const [source, setSource] = useState<'usgs' | 'demo' | 'loading'>('loading');
  const [updatedAt, setUpdatedAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<Earthquake | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [timeCursor, setTimeCursor] = useState<number | null>(null);
  const [heatMode, setHeatMode] = useState(false);
  const [densityMode, setDensityMode] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'not-configured' | 'error'>('checking');
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');
  const [toast, setToast] = useState('');
  const [clock, setClock] = useState('');

  const loadEvents = useCallback(async (targetRange: Range, silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    try {
      const data = await jsonRequest<QuakeResponse>(`/api/earthquakes?range=${targetRange}`);
      setEvents(data.events);
      setSource(data.source);
      setUpdatedAt(data.updatedAt);
      setSelected(previous => previous && data.events.some(event => event.id === previous.id) ? previous : (data.events[0] ?? null));
    } catch {
      setSource('demo');
      setToast('No se pudo obtener el feed. Actualizá la página para reintentar.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadFavorites = useCallback(async () => {
    try {
      const data = await jsonRequest<{ favorites: Favorite[] }>('/api/favorites');
      setFavorites(data.favorites);
    } catch {
      setFavorites([]);
    }
  }, []);

  useEffect(() => {
    void loadEvents(range);
    const timer = window.setInterval(() => { void loadEvents(range, true); }, 300000);
    return () => window.clearInterval(timer);
  }, [range, loadEvents]);

  useEffect(() => {
    void jsonRequest<{ regions: Region[] }>('/api/regions').then(data => setRegions(data.regions)).catch(() => {});
    void jsonRequest<{ user: User | null }>('/api/auth/me').then(data => {
      setUser(data.user);
      if (data.user) void loadFavorites();
    }).catch(() => {});
    void fetch('/api/health', { cache: 'no-store' }).then(response => response.json()).then(data => {
      setDbStatus(data.database === 'connected' ? 'connected' : data.database === 'not-configured' ? 'not-configured' : 'error');
    }).catch(() => setDbStatus('error'));
    const updateClock = () => setClock(new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }).format(new Date()));
    updateClock();
    const timer = window.setInterval(updateClock, 30000);
    return () => window.clearInterval(timer);
  }, [loadFavorites]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 4800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    // Las vistas compartidas restauran los filtros al abrir el enlace.
    const params = new URLSearchParams(window.location.search);
    const sharedRange = params.get('range');
    const sharedRegion = params.get('region');
    const sharedMag = Number(params.get('mag'));
    const sharedQuery = params.get('q');
    if (sharedRange === 'day' || sharedRange === 'week') setRange(sharedRange);
    if (sharedRegion && /^[a-z0-9-]{2,40}$/.test(sharedRegion)) setRegionId(sharedRegion);
    if (params.has('mag') && Number.isFinite(sharedMag) && sharedMag >= 0 && sharedMag <= 7) setMinMag(sharedMag);
    if (sharedQuery && sharedQuery.length <= 120) setSearch(sharedQuery);
  }, []);

  const region = regions.find(item => item.id === regionId) ?? defaultRegions[0];
  const filtered = useMemo(() => events.filter(event => {
    if (event.magnitude < minMag) return false;
    if (region.id !== 'global' && (event.latitude < region.minLat || event.latitude > region.maxLat || event.longitude < region.minLon || event.longitude > region.maxLon)) return false;
    if (search && !event.place.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es'))) return false;
    return true;
  }).sort((a, b) => b.time - a.time), [events, minMag, region, search]);

  const timelineEvents = useMemo(() => timeCursor === null ? filtered : filtered.filter(event => event.time <= timeCursor), [filtered, timeCursor]);
  const mapEvents = useMemo(() => {
    if (timeCursor !== null || !selected || filtered.some(event => event.id === selected.id)) return timelineEvents;
    return [selected, ...timelineEvents];
  }, [timelineEvents, filtered, selected, timeCursor]);
  const maxMag = filtered.length ? Math.max(...filtered.map(event => event.magnitude)) : 0;
  const strongCount = filtered.filter(event => event.magnitude >= 5).length;
  const averageDepth = filtered.length ? Math.round(filtered.reduce((sum, event) => sum + event.depth, 0) / filtered.length) : 0;
  const histogram = [
    { name: 'M < 3.5', count: filtered.filter(event => event.magnitude < 3.5).length, color: 'cyan' },
    { name: 'M 3.5–4.9', count: filtered.filter(event => event.magnitude >= 3.5 && event.magnitude < 5).length, color: 'yellow' },
    { name: 'M ≥ 5.0', count: strongCount, color: 'orange' },
  ];
  const maxHistogram = Math.max(1, ...histogram.map(item => item.count));
  const favoriteIds = new Set(favorites.map(item => item.earthquakeId));

  function exportCsv() {
    if (!filtered.length) return;
    const safe = (value: string | number) => {
      const raw = String(value);
      const text = /^[=+@\-\t\r]/.test(raw) ? `'${raw}` : raw;
      return `"${text.replaceAll('"', '""')}"`;
    };
    const header = ['ID', 'Lugar', 'Magnitud', 'Latitud', 'Longitud', 'Profundidad_km', 'Fecha_UTC', 'Fuente'];
    const lines = [header.map(safe).join(','), ...filtered.map(e => [e.id, e.place, e.magnitude, e.latitude, e.longitude, e.depth, new Date(e.time).toISOString(), e.url].map(safe).join(','))];
    const blob = new Blob(['\uFEFF', lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `atlas-${range}-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setToast(`CSV exportado: ${filtered.length} eventos ${source === 'demo' ? 'SIMULADOS' : 'del feed USGS'}.`);
  }

  async function shareView() {
    const url = new URL(window.location.href);
    url.search = new URLSearchParams({ range, region: regionId, mag: String(minMag), ...(search ? { q: search } : {}) }).toString();
    try {
      await navigator.clipboard.writeText(url.toString());
      setToast('Enlace de la vista copiado. Funcionará públicamente después de desplegar ATLAS.');
    } catch {
      window.prompt('Copiá el enlace de tu vista:', url.toString());
    }
  }

  async function savePreferences() {
    if (!user) { setAuthMode('login'); setAuthOpen(true); return; }
    try {
      await jsonRequest('/api/preferences', { method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ range, regionId, minMag }) });
      setToast('Tus filtros predeterminados se guardaron en Neon.');
    } catch (error) { setToast(error instanceof Error ? error.message : 'No se pudieron guardar tus filtros.'); }
  }

  async function loadPreferences() {
    if (!user) { setAuthMode('login'); setAuthOpen(true); return; }
    try {
      const data = await jsonRequest<{ preferences: { range: Range; regionId: string; minMag: number } | null }>('/api/preferences');
      if (!data.preferences) { setToast('Todavía no guardaste filtros predeterminados.'); return; }
      setRange(data.preferences.range); setRegionId(data.preferences.regionId);
      setMinMag(data.preferences.minMag); setTimeCursor(null); setTab('explore');
      setToast('Filtros restaurados desde PostgreSQL.');
    } catch (error) { setToast(error instanceof Error ? error.message : 'No se pudieron cargar tus filtros.'); }
  }

  function applyResearch(filters: ResearchFilters) {
    setRange(filters.range);
    setRegionId(filters.regionId);
    setMinMag(filters.minMag);
    setSearch(filters.search);
    setTimeCursor(null);
    setTab('explore');
    setToast('Vista de investigación restaurada desde PostgreSQL.');
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError('');
    setAuthBusy(true);
    try {
      const data = await jsonRequest<{ user: User }>(`/api/auth/${authMode}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: authName, email: authEmail, password: authPassword }),
      });
      setUser(data.user);
      setAuthOpen(false);
      setAuthPassword('');
      setToast(`¡Bienvenido${authMode === 'register' ? ' a ATLAS' : ''}, ${data.user.name}!`);
      void loadFavorites();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Error de autenticación.');
    } finally {
      setAuthBusy(false);
    }
  }

  async function logout() {
    try { await jsonRequest('/api/auth/logout', { method: 'POST' }); } catch { /* limpiar UI igualmente */ }
    setUser(null);
    setFavorites([]);
    setTab('explore');
    setToast('Sesión cerrada.');
  }

  async function toggleFavorite(event: Earthquake) {
    if (source === 'demo' || event.id.startsWith('demo-')) {
      setToast('Los eventos simulados no se guardan. Esperá datos reales de USGS.');
      return;
    }
    if (!user) { setAuthMode('register'); setAuthOpen(true); return; }
    try {
      if (favoriteIds.has(event.id)) {
        await jsonRequest(`/api/favorites/${encodeURIComponent(event.id)}`, { method: 'DELETE' });
        setToast('Evento eliminado de tus favoritos.');
      } else {
        await jsonRequest('/api/favorites', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(event),
        });
        setToast('Evento guardado en PostgreSQL.');
      }
      await loadFavorites();
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'No se pudo actualizar el favorito.');
    }
  }

  function chooseFavorite(favorite: Favorite) {
    setSelected({
      id: favorite.earthquakeId, title: favorite.title, place: favorite.title,
      magnitude: favorite.magnitude, latitude: favorite.latitude, longitude: favorite.longitude,
      depth: favorite.depth, time: favorite.time, url: favorite.url,
    });
    setTab('explore');
    setTimeCursor(null);
    setAutoRotate(false);
  }

  return (
    <div className="atlas-app">
      <div className="background-grid" aria-hidden="true" />
      <header className="topbar">
        <div className="brand" aria-label="ATLAS Earth Intelligence">
          <div className="brand-symbol"><Globe2 size={23} strokeWidth={1.7} /></div>
          <div className="brand-text"><strong>ATLAS<span className="brand-dot">.</span></strong><span>EARTH INTELLIGENCE</span></div>
        </div>
        <nav className="topnav" aria-label="Navegación principal">
          <button aria-label="Exploración" className={`nav-item ${tab === 'explore' ? 'active' : ''}`} onClick={() => setTab('explore')}><Crosshair size={15} /> Exploración</button>
          <button aria-label="Analítica" className={`nav-item ${tab === 'analytics' ? 'active' : ''}`} onClick={() => setTab('analytics')}><BarChart3 size={15}/> Analítica</button>
          <button aria-label="Laboratorio" className={`nav-item ${tab === 'research' ? 'active' : ''}`} onClick={() => setTab('research')}><FlaskConical size={15}/> Laboratorio</button>
          <button aria-label="Favoritos" className={`nav-item ${tab === 'favorites' ? 'active' : ''}`} onClick={() => setTab('favorites')}><Bookmark size={15} /> Favoritos {favorites.length > 0 && <span className="nav-count">{favorites.length}</span>}</button>
        </nav>
        <div className="topbar-actions">
          <span className="utc-clock"><span className="small-pulse" /> {clock || '--:--'} UTC</span>
          {user ? (
            <div className="account-area"><span className="user-avatar"><UserRound size={16}/></span><span className="account-name">{user.name}</span><button className="icon-button" title="Cerrar sesión" onClick={() => void logout()}><LogOut size={16}/></button></div>
          ) : <button className="button button-outline top-login" onClick={() => { setAuthMode('login'); setAuthOpen(true); }}><LogIn size={15}/> Ingresar <ArrowUpRight size={14}/></button>}
        </div>
      </header>

      <main className="main-wrap">
        <section className="intro">
          <div>
            <div className="eyebrow"><span className="eyebrow-line"/> PLATAFORMA DE INTELIGENCIA SÍSMICA <span className="version-tag">V 4.0</span></div>
            <h1>El planeta <em>está vivo.</em></h1>
            <p>Una nueva perspectiva sobre la actividad sísmica de la Tierra. Explorá eventos, descubrí patrones y conectá con datos reales.</p>
          </div>
          <div className="intro-right"><div className={`status-chip ${source === 'usgs' ? 'is-live' : source === 'demo' ? 'is-demo' : ''}`}><span className="status-dot"/>{source === 'loading' ? 'CONECTANDO…' : source === 'usgs' ? 'DATOS USGS EN VIVO' : 'MODO DEMOSTRACIÓN'}</div><span>EXPLORACIÓN GEOFÍSICA · 2026</span><div className="intro-utilities"><button onClick={() => void shareView()}><Share2 size={13}/> Compartir</button><button onClick={exportCsv} disabled={!filtered.length}><Download size={13}/> CSV</button></div></div>
        </section>

        <div className="v3-module-nav" aria-label="Módulos avanzados">
          <span>INTELLIGENCE SUITE <span className="v3-module-version">V4</span></span>
          <button className={tab === 'alerts' ? 'active' : ''} onClick={() => setTab('alerts')}><BellRing size={15}/> Alert Center</button>
          <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}><CalendarDays size={15}/> Historical Explorer</button>
          <button className={tab === 'reports' ? 'active' : ''} onClick={() => setTab('reports')}><FileText size={15}/> Report Studio</button>
        </div>
        {source === 'demo' && <div className="demo-banner"><Waves size={17}/><span><strong>Modo demostración.</strong> Los puntos del mapa son simulados. No representan terremotos reales. Cuando USGS esté disponible, se cargarán los datos auténticos.</span></div>}

        <div className="dashboard-grid">
          <aside className="sidebar-left">
            <div className="panel filters-panel">
              <div className="panel-heading"><span><SlidersHorizontal size={16}/> PARÁMETROS</span><span className="panel-index">01 / 03</span></div>
              <div className="filter-block"><label className="filter-label">PERÍODO DE TIEMPO</label><div className="segmented"><button className={range === 'day' ? 'selected' : ''} onClick={() => { setRange('day'); setTimeCursor(null); }}>24 horas</button><button className={range === 'week' ? 'selected' : ''} onClick={() => { setRange('week'); setTimeCursor(null); }}>7 días</button></div></div>
              <div className="filter-block"><label htmlFor="region-select" className="filter-label">REGIÓN DE INTERÉS</label><div className="select-shell"><MapPin size={16}/><select id="region-select" value={regionId} onChange={event => setRegionId(event.target.value)}>{regions.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div></div>
              <div className="filter-block"><div className="range-header"><label htmlFor="magnitude-range" className="filter-label">MAGNITUD MÍNIMA</label><strong>M {minMag.toFixed(1)}+</strong></div><input id="magnitude-range" className="mag-slider" type="range" min="0" max="7" step="0.5" value={minMag} onChange={event => setMinMag(Number(event.target.value))}/><div className="range-ends"><span>M 0.0</span><span>M 7.0+</span></div></div>
              <div className="filter-block"><label htmlFor="event-search" className="filter-label">BUSCAR UBICACIÓN</label><div className="search-shell"><Search size={15}/><input id="event-search" placeholder="País, ciudad o región..." value={search} onChange={event => setSearch(event.target.value)}/>{search && <button aria-label="Borrar búsqueda" onClick={() => setSearch('')}><X size={13}/></button>}</div></div>
              <div className="filters-bottom"><span><span className="small-pulse"/> {filtered.length} EVENTOS FILTRADOS</span><button onClick={() => { setMinMag(2.5); setRegionId('global'); setSearch(''); }}>Restablecer <ArrowRight size={13}/></button></div><div className="v3-filter-save"><button onClick={() => void savePreferences()}>Guardar mis filtros</button><button onClick={() => void loadPreferences()}>Restaurar filtros</button></div>
            </div>
            <div className="panel distribution-panel">
              <div className="panel-heading"><span><Activity size={16}/> DISTRIBUCIÓN</span><span className="panel-index">02 / 03</span></div>
              <div className="distribution-list">{histogram.map(item => <div className="distribution-row" key={item.name}><div className="distribution-label"><span>{item.name}</span><strong>{item.count}</strong></div><div className="distribution-track"><div className={`distribution-fill ${item.color}`} style={{ width: `${item.count / maxHistogram * 100}%` }}/></div></div>)}</div>
              <div className="distribution-note">Distribución según los filtros activos.</div>
            </div>
            <div className="data-source"><ShieldCheck size={17}/><div><strong>FUENTE DE DATOS</strong><span>USGS Earthquake Hazards Program</span><a href="https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php" target="_blank" rel="noopener noreferrer">Documentación oficial <ArrowUpRight size={12}/></a></div></div>
          </aside>

          <section className="center-stage">
            <div className="stat-grid">
              <div className="stat-card"><span className="stat-caption">EVENTOS DETECTADOS <Activity size={14}/></span><div className="stat-value">{loading ? '—' : filtered.length.toLocaleString('es-AR')}<span className="stat-unit"> eventos</span></div><div className="stat-foot"><span className="stat-indicator teal"/> En el período seleccionado</div></div>
              <div className="stat-card"><span className="stat-caption">MAGNITUD MÁXIMA <Waves size={14}/></span><div className="stat-value">{loading ? '—' : maxMag.toFixed(1)}<span className="stat-unit"> M USGS</span></div><div className="stat-foot"><span className="stat-indicator amber"/> {source === 'demo' ? 'Datos simulados' : 'Valor reportado por USGS'}</div></div>
              <div className="stat-card"><span className="stat-caption">PROFUNDIDAD MEDIA <ArrowDownRight size={14}/></span><div className="stat-value">{loading ? '—' : averageDepth}<span className="stat-unit"> km</span></div><div className="stat-foot"><span className="stat-indicator blue"/> Promedio de los eventos</div></div>
            </div>

            {tab === 'explore' ? (
              <>
              <div className="globe-panel">
                <div className="globe-topline"><div className="globe-label"><span className="radar-icon"><Radio size={16}/></span><div><strong>VISUALIZACIÓN GLOBAL</strong><span>PROYECCIÓN INTERACTIVA 3D</span></div></div><div className="globe-top-actions"><button className={`globe-rotate-button ${heatMode ? 'globe-heat-active' : ''}`} onClick={() => setHeatMode(value => !value)}><Waves size={14}/> {heatMode ? 'Intensidad ON' : 'Intensidad'}</button><button className={`globe-rotate-button ${densityMode ? 'globe-heat-active' : ''}`} onClick={() => setDensityMode(value => !value)}><Layers3 size={14}/> Densidad</button><button className="globe-rotate-button" onClick={() => setAutoRotate(value => !value)}>{autoRotate ? <Pause size={14}/> : <Play size={14}/>} {autoRotate ? 'Pausar rotación' : 'Rotar planeta'}</button></div></div>
                <Globe events={mapEvents} selectedId={selected?.id ?? null} onSelect={event => { setSelected(event); setAutoRotate(false); }} autoRotate={autoRotate} heatMode={heatMode} densityMode={densityMode}/>
                <div className="globe-bottomline"><span><span className="legend-dot cyan"/> M &lt; 3.5</span><span><span className="legend-dot yellow"/> M 3.5–4.9</span><span><span className="legend-dot orange"/> M ≥ 5.0</span><span className="render-tag">WEBGL · THREE.JS</span></div>
              </div>
              <TimeMachine events={filtered} cursor={timeCursor} onCursorChange={setTimeCursor} onSelect={event => { setSelected(event); setAutoRotate(false); }}/>
              </>
            ) : tab === 'analytics' ? (
              <AnalyticsPanel events={filtered} allEvents={events} regions={regions} source={source} onExport={exportCsv}/>
            ) : tab === 'research' ? (
              <ResearchDesk user={user} selectedEvent={selected} filters={{range,regionId,minMag,search}} onApply={applyResearch} onLogin={() => {setAuthMode('login');setAuthOpen(true);}}/>
            ) : tab === 'alerts' ? (
              <AlertCenter user={user} regions={regions} onLogin={() => {setAuthMode('login');setAuthOpen(true);}}/>
            ) : tab === 'history' ? (
              <HistoricalExplorer user={user} onLogin={() => {setAuthMode('login');setAuthOpen(true);}}/>
            ) : tab === 'reports' ? (
              <ReportsPanel events={filtered} source={source} user={user} range={range} regionName={region.name} minMag={minMag}/>
            ) : (
              <div className="favorites-panel"><div className="favorites-heading"><div className="favorites-symbol"><Bookmark size={24}/></div><div><span className="section-kicker">TU ARCHIVO PERSONAL</span><h2>Eventos guardados<span>.</span></h2><p>Los favoritos se almacenan en PostgreSQL y están vinculados a tu cuenta.</p></div></div>{!user ? <div className="empty-state"><LockKeyhole size={32}/><h3>Tu colección te espera</h3><p>Creá una cuenta para guardar eventos sísmicos y volver a consultarlos cuando quieras.</p><button className="button button-primary" onClick={() => { setAuthMode('register'); setAuthOpen(true); }}>Crear cuenta gratis <ArrowRight size={16}/></button></div> : favorites.length === 0 ? <div className="empty-state"><Bookmark size={32}/><h3>Todavía no guardaste eventos</h3><p>Seleccioná un terremoto real en el explorador y presioná “Guardar evento”.</p><button className="button button-outline" onClick={() => setTab('explore')}>Explorar eventos <ArrowRight size={16}/></button></div> : <div className="favorites-list">{favorites.map(item => <button key={item.earthquakeId} className="favorite-row" onClick={() => chooseFavorite(item)}><span className={`quake-mag ${magnitudeClass(item.magnitude)}`}>{item.magnitude.toFixed(1)}</span><span className="favorite-row-info"><strong>{item.title}</strong><small>{formatTime(item.time)} · {item.depth.toFixed(0)} km de profundidad</small></span><ChevronRight size={18}/></button>)}</div>}</div>
            )}

            {tab === 'explore' && <div className="selected-panel"><div className="selected-panel-head"><span><Crosshair size={15}/> EVENTO SELECCIONADO</span><span className="selected-tag">{selected ? `ID ${selected.id.slice(0, 15).toUpperCase()}` : 'SIN SELECCIÓN'}</span></div>{selected ? <div className="selected-main"><div className={`selected-magnitude ${magnitudeClass(selected.magnitude)}`}><span>MAGNITUD</span><strong>{selected.magnitude.toFixed(1)}</strong><small>{magnitudeLabel(selected.magnitude)}</small></div><div className="selected-details"><h3>{selected.place}</h3><div className="selected-meta"><span><MapPin size={14}/> {formatCoords(selected.latitude, selected.longitude)}</span><span><ArrowDownRight size={14}/> {selected.depth.toFixed(1)} km profundidad</span><span><Clock3 size={14}/> {formatTime(selected.time)}</span></div></div><div className="selected-actions"><button className={`button ${favoriteIds.has(selected.id) ? 'button-saved' : 'button-primary'}`} onClick={() => void toggleFavorite(selected)}><Bookmark size={15} fill={favoriteIds.has(selected.id) ? 'currentColor' : 'none'}/>{favoriteIds.has(selected.id) ? 'Guardado en favoritos' : 'Guardar en favoritos'}</button><button className="detail-link" onClick={() => setTab('research')} title="Vincular evento a una investigación"><FlaskConical size={13}/> Investigar evento</button><button className="detail-link" onClick={() => void shareView()} title="Compartir filtros actuales"><Share2 size={13}/> Compartir vista</button>{selected.url && <a className="detail-link" href={selected.url} target="_blank" rel="noopener noreferrer">USGS <ExternalLink size={13}/></a>}</div></div> : <div className="no-selected">Seleccioná un punto del globo o un evento de la lista.</div>}</div>}
          </section>

          <aside className="sidebar-right"><div className="panel activity-panel"><div className="panel-heading activity-heading"><span><Layers3 size={16}/> ACTIVIDAD RECIENTE</span><button title="Actualizar datos" aria-label="Actualizar datos" onClick={() => void loadEvents(range, true)} disabled={refreshing}><RefreshCw size={15} className={refreshing ? 'spinning' : ''}/></button></div><div className="activity-subheading"><span>{source === 'usgs' ? 'FLUJO DE DATOS ACTIVO' : source === 'demo' ? 'DATOS SIMULADOS' : 'CARGANDO EVENTOS'}</span><span>{timelineEvents.length} REGISTROS</span></div><div className="activity-list">{loading && !events.length ? <div className="loading-events"><span className="loading-orbit"/> Consultando USGS…</div> : timelineEvents.length === 0 ? <div className="activity-empty"><Search size={24}/><strong>Sin resultados</strong><span>Probá bajar la magnitud mínima o cambiar de región.</span></div> : timelineEvents.slice(0, 80).map(event => <button key={event.id} className={`event-row ${selected?.id === event.id ? 'event-active' : ''}`} onClick={() => { setSelected(event); setTab('explore'); setAutoRotate(false); }}><span className={`quake-mag ${magnitudeClass(event.magnitude)}`}>{event.magnitude.toFixed(1)}</span><span className="event-body"><strong>{event.place}</strong><small><Clock3 size={11}/> {relativeTime(event.time)} <span>·</span> {event.depth.toFixed(0)} km</small></span><ChevronRight size={15} className="event-chevron"/></button>)}</div><div className="activity-footer"><span><span className="small-pulse"/> {source === 'usgs' ? 'ACTUALIZACIÓN CADA 5 MIN' : 'ESPERANDO CONEXIÓN USGS'}</span><span>{updatedAt ? new Date(updatedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span></div></div><div className="sidebar-callout"><div className="callout-icon"><Sparkles size={19}/></div><div><span>HECHO PARA EXPLORAR</span><h3>Datos que cobran vida.</h3><p>Una experiencia experimental que une ingeniería de software, visualización 3D y datos geoespaciales.</p><div className="callout-tags"><span>Next.js</span><span>Three.js</span><span>PostgreSQL</span></div></div></div><div className="backend-status"><Database size={15}/><span>POSTGRESQL</span><strong className={dbStatus === 'connected' ? 'db-online' : 'db-offline'}>{dbStatus === 'connected' ? 'CONECTADO' : dbStatus === 'checking' ? 'VERIFICANDO' : dbStatus === 'not-configured' ? 'SIN CONFIGURAR' : 'SIN CONEXIÓN'}</strong></div></aside>
        </div>

        <footer className="site-footer"><span>© 2026 ATLAS EARTH INTELLIGENCE · PROYECTO DEMOSTRATIVO</span><span>Datos sísmicos: <a href="https://earthquake.usgs.gov/" target="_blank" rel="noopener noreferrer">USGS <ExternalLink size={11}/></a> · No es un sistema de alerta de emergencias</span><span>DESARROLLADO CON NEXT.JS + THREE.JS</span></footer>
      </main>

      {toast && <div className="toast" role="status"><Check size={17}/>{toast}<button aria-label="Cerrar mensaje" onClick={() => setToast('')}><X size={14}/></button></div>}

      {authOpen && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setAuthOpen(false); }}><div className="auth-modal" role="dialog" aria-modal="true" aria-label={authMode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}><button className="modal-close" onClick={() => setAuthOpen(false)} aria-label="Cerrar"><X size={19}/></button><div className="modal-brand"><Globe2 size={23}/> ATLAS<span>.</span></div><span className="section-kicker">ACCESO A EARTH INTELLIGENCE</span><h2>{authMode === 'login' ? 'Bienvenido de nuevo.' : 'Tu planeta. Tu espacio.'}</h2><p>{authMode === 'login' ? 'Ingresá para acceder a tus eventos guardados.' : 'Creá tu cuenta para empezar a guardar terremotos reales en la base de datos.'}</p><div className="auth-switch"><button className={authMode === 'login' ? 'active' : ''} onClick={() => { setAuthMode('login'); setAuthError(''); }}>Ingresar</button><button className={authMode === 'register' ? 'active' : ''} onClick={() => { setAuthMode('register'); setAuthError(''); }}>Registrarme</button></div><form onSubmit={event => void submitAuth(event)}>{authMode === 'register' && <label>Nombre<input required minLength={2} maxLength={60} value={authName} onChange={event => setAuthName(event.target.value)} placeholder="Tu nombre" autoComplete="name"/></label>}<label>Correo electrónico<input required type="email" value={authEmail} onChange={event => setAuthEmail(event.target.value)} placeholder="nombre@correo.com" autoComplete="email"/></label><label>Contraseña<input required type="password" minLength={8} maxLength={128} value={authPassword} onChange={event => setAuthPassword(event.target.value)} placeholder="Mínimo 8 caracteres" autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}/></label>{authError && <div className="auth-error">{authError}</div>}{dbStatus !== 'connected' && <div className="auth-warning"><Database size={15}/> Para registrarte, primero conectá Neon y ejecutá los archivos SQL.</div>}<button className="button button-primary auth-submit" disabled={authBusy} type="submit">{authBusy ? 'Procesando…' : authMode === 'login' ? 'Ingresar a ATLAS' : 'Crear cuenta gratis'} <ArrowRight size={16}/></button></form><div className="modal-foot"><LockKeyhole size={13}/> Sesiones protegidas con cookies HTTP-only. No hay verificación de correo en esta versión.</div></div></div>}
    </div>
  );
}
