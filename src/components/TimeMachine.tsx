'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Clock3, Pause, Play, Radio, RotateCcw, SkipForward, Zap } from 'lucide-react';
import type { Earthquake } from '@/lib/types';

type Props = {
  events: Earthquake[];
  cursor: number | null;
  onCursorChange: (cursor: number | null) => void;
  onSelect: (event: Earthquake) => void;
};

function stamp(time: number) {
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }).format(new Date(time));
}

export default function TimeMachine({ events, cursor, onCursorChange, onSelect }: Props) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const sorted = useMemo(() => [...events].sort((a, b) => a.time - b.time), [events]);
  const first = sorted[0]?.time ?? 0;
  const last = sorted[sorted.length - 1]?.time ?? 0;
  const duration = Math.max(1, last - first);
  const progress = cursor === null ? 100 : Math.max(0, Math.min(100, (cursor - first) / duration * 100));
  const visibleCount = cursor === null ? sorted.length : sorted.filter(event => event.time <= cursor).length;

  useEffect(() => {
    if (!playing || cursor === null || sorted.length === 0) return;
    const timer = window.setInterval(() => {
      onCursorChange(Math.min(last, cursor + duration / 70 * speed));
      if (cursor + duration / 70 * speed >= last) setPlaying(false);
    }, 100);
    return () => window.clearInterval(timer);
  }, [playing, cursor, sorted.length, last, duration, speed, onCursorChange]);

  useEffect(() => { if (!sorted.length) setPlaying(false); }, [sorted.length]);

  const startReplay = () => {
    if (!sorted.length) return;
    if (cursor === null || cursor >= last) onCursorChange(first);
    setPlaying(true);
  };
  const returnLive = () => { setPlaying(false); onCursorChange(null); };
  const seek = (percent: number) => {
    setPlaying(false);
    onCursorChange(first + duration * percent / 100);
  };

  return (
    <section className="time-machine panel" aria-label="Time Machine, reproducción cronológica">
      <div className="tm-heading">
        <div className="tm-brand"><span className="tm-brand-icon"><Clock3 size={19}/></span><div><span className="section-kicker">ATLAS / MÓDULO 01</span><h2>TIME MACHINE <span>↗</span></h2><p>Reproducí cómo evoluciona la actividad sísmica sobre el planeta.</p></div></div>
        <span className={`tm-mode ${cursor === null ? 'tm-live' : ''}`}><Radio size={13}/> {cursor === null ? 'VISTA EN VIVO' : 'REPRODUCCIÓN HISTÓRICA'}</span>
      </div>
      <div className="tm-controls">
        <button className="tm-play" onClick={() => { if (playing) setPlaying(false); else startReplay(); }} disabled={!sorted.length} aria-label={playing ? 'Pausar reproducción' : 'Iniciar reproducción'}>
          {playing ? <Pause size={18}/> : <Play size={18} fill="currentColor"/>}
        </button>
        <div className="tm-track-wrap">
          <div className="tm-times"><span>{sorted.length ? stamp(first) : 'Sin datos'}</span><strong>{cursor === null ? 'AHORA · EN VIVO' : stamp(cursor)}</strong><span>{sorted.length ? stamp(last) : '—'}</span></div>
          <input type="range" min="0" max="100" step="0.1" value={progress} disabled={!sorted.length} aria-label="Posición de la línea de tiempo" className="tm-range" style={{ '--progress': `${progress}%` } as CSSProperties} onChange={event => seek(Number(event.target.value))}/>
          <div className="tm-ticks"><span>INICIO</span><span>{visibleCount} / {sorted.length} EVENTOS VISIBLES</span><span>FINAL</span></div>
        </div>
        <button className="tm-speed" onClick={() => setSpeed(value => value === 1 ? 2 : value === 2 ? 4 : 1)} title="Cambiar velocidad"><Zap size={13}/> {speed}×</button>
        <button className="tm-live-button" onClick={returnLive} title="Volver a vista en vivo"><RotateCcw size={15}/> En vivo</button>
      </div>
      {cursor !== null && sorted.length > 0 && <div className="tm-moment"><span>ÚLTIMO EVENTO EN ESTE MOMENTO</span>{sorted.filter(event => event.time <= cursor).slice(-1).map(event => <button key={event.id} onClick={() => onSelect(event)}><strong>M {event.magnitude.toFixed(1)}</strong> {event.place}<SkipForward size={13}/></button>)}</div>}
      <p className="tm-disclaimer">Los puntos se reproducen a partir del feed USGS consultado (24 h o 7 días). No es una transmisión sísmica continua ni un sistema de alertas.</p>
    </section>
  );
}
