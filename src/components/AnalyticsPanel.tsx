'use client';

import { useMemo } from 'react';
import { Activity, ArrowDownRight, BarChart3, Database, Download, GitCompareArrows, TrendingUp } from 'lucide-react';
import type { Earthquake, Region } from '@/lib/types';

type Props = { events: Earthquake[]; allEvents: Earthquake[]; regions: Region[]; source: 'usgs' | 'demo' | 'loading'; onExport: () => void };
const fmt = (value: number) => value.toLocaleString('es-AR');

export default function AnalyticsPanel({ events, allEvents, regions, source, onExport }: Props) {
  const trend = useMemo(() => {
    if (!events.length) return [];
    const earliest = Math.min(...events.map(e => e.time));
    const latest = Math.max(...events.map(e => e.time));
    const buckets = Math.min(18, Math.max(6, Math.ceil(events.length / 8)));
    const width = Math.max(1, latest - earliest);
    return Array.from({ length: buckets }, (_, i) => ({
      label: new Date(earliest + width * (i + 0.5) / buckets).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }),
      count: events.filter(e => Math.min(buckets - 1, Math.floor((e.time - earliest) / width * buckets)) === i).length,
    }));
  }, [events]);
  const maxTrend = Math.max(1, ...trend.map(x => x.count));
  const trendPoints = trend.map((item, index) => `${35 + index * 630 / Math.max(1, trend.length - 1)},${164 - item.count / maxTrend * 125}`).join(' ');
  const compare = useMemo(() => regions.filter(r => r.id !== 'global').map(r => ({
    name: r.name,
    count: allEvents.filter(e => e.latitude >= r.minLat && e.latitude <= r.maxLat && e.longitude >= r.minLon && e.longitude <= r.maxLon).length,
  })).sort((a, b) => b.count - a.count).slice(0, 5), [allEvents, regions]);
  const maxCompare = Math.max(1, ...compare.map(item => item.count));
  const sorted = useMemo(() => [...events].sort((a, b) => b.magnitude - a.magnitude).slice(0, 5), [events]);
  const averageMag = events.length ? events.reduce((a, e) => a + e.magnitude, 0) / events.length : 0;
  const medianDepth = events.length ? [...events].map(e => e.depth).sort((a,b)=>a-b)[Math.floor(events.length/2)] : 0;

  return <section className="analytics-panel" aria-label="Análisis sísmico">
    <div className="analytics-hero panel"><div><span className="section-kicker">ATLAS / MÓDULO 02 · INTELLIGENCE</span><h2>Seismic <em>Analytics.</em></h2><p>Estadísticas calculadas a partir de los eventos que estás explorando. Los gráficos responden a tus filtros.</p></div><button className="button button-outline" onClick={onExport} disabled={!events.length}><Download size={15}/> Exportar CSV</button></div>
    <div className="analytics-kpis"><div className="panel"><Activity size={18}/><span>EVENTOS ANALIZADOS</span><strong>{fmt(events.length)}</strong><small>Según filtros actuales</small></div><div className="panel"><TrendingUp size={18}/><span>MAGNITUD PROMEDIO</span><strong>{averageMag.toFixed(2)}</strong><small>Escala reportada por USGS</small></div><div className="panel"><ArrowDownRight size={18}/><span>PROFUNDIDAD MEDIANA</span><strong>{medianDepth.toFixed(0)} <small>km</small></strong><small>Menos sensible a valores extremos</small></div></div>
    <div className="analytics-chart-grid">
      <div className="panel analytics-card"><div className="analytics-card-heading"><div><span className="section-kicker">01 / ACTIVIDAD</span><h3><BarChart3 size={17}/> Eventos a lo largo del tiempo</h3></div><span className="analytics-pill">{events.length} registros</span></div>{trend.length ? <><svg className="trend-svg" viewBox="0 0 700 190" role="img" aria-label="Gráfico de cantidad de eventos en intervalos temporales"><defs><linearGradient id="trend-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#55dfdb" stopOpacity=".35"/><stop offset="1" stopColor="#55dfdb" stopOpacity="0"/></linearGradient></defs>{[40,80,120,164].map(y=><line key={y} x1="35" x2="665" y1={y} y2={y} stroke="#305065" strokeOpacity=".5" strokeDasharray="4 6"/>)}<polygon points={`35,164 ${trendPoints} 665,164`} fill="url(#trend-fill)"/><polyline points={trendPoints} fill="none" stroke="#72e5df" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>{trend.map((x,i)=><circle key={i} cx={35+i*630/Math.max(1,trend.length-1)} cy={164-x.count/maxTrend*125} r="3.5" fill="#d3ffff"/>)}</svg><div className="trend-labels"><span>{trend[0]?.label}</span><span>INTENSIDAD DE ACTIVIDAD</span><span>{trend[trend.length-1]?.label}</span></div></> : <div className="analytics-empty">No hay eventos con estos filtros.</div>}</div>
      <div className="panel analytics-card"><div className="analytics-card-heading"><div><span className="section-kicker">02 / GEOGRAFÍA</span><h3><GitCompareArrows size={17}/> Comparación regional</h3></div></div><p className="analytics-card-subtitle">Eventos del feed completo por región. Algunas regiones se superponen.</p><div className="region-bars">{compare.map(r=><div className="region-bar" key={r.name}><div><span>{r.name}</span><strong>{fmt(r.count)}</strong></div><div className="region-bar-track"><span style={{width:`${r.count/maxCompare*100}%`}}/></div></div>)}</div></div>
    </div>
    <div className="panel analytics-card analytics-top"><div className="analytics-card-heading"><div><span className="section-kicker">03 / EVENTOS DESTACADOS</span><h3>Top 5 por magnitud</h3></div></div><div className="analytics-table"><div className="analytics-table-head"><span>UBICACIÓN</span><span>MAGNITUD</span><span>PROFUNDIDAD</span></div>{sorted.map(e=><div className="analytics-table-row" key={e.id}><span>{e.place}</span><strong>M {e.magnitude.toFixed(1)}</strong><span>{e.depth.toFixed(0)} km</span></div>)}</div><div className="analytics-source"><Database size={14}/>{source === 'usgs' ? 'Fuente: USGS Earthquake Hazards Program. No es un sistema de emergencias.' : source === 'demo' ? 'ATENCIÓN: datos ficticios de demostración; no representan eventos reales.' : 'Consultando fuente de datos…'}</div></div>
  </section>;
}
