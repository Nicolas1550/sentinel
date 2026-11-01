'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Bell, BellRing, CheckCheck, Database, LockKeyhole, Plus, Radar, RefreshCw, ShieldAlert, Trash2 } from 'lucide-react';
import type { Region, User } from '@/lib/types';
import SyncStatus from './SyncStatus';

type Rule = { id: string; name: string; regionId: string; minMagnitude: number; maxDepth: number | null; enabled: boolean; createdAt: string };
type Notice = { id: string; earthquakeId: string; title: string; magnitude: number; occurredAt: string; createdAt: string; read: boolean; ruleName: string };
type Props = { user: User | null; regions: Region[]; onLogin: () => void };
async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, credentials: 'same-origin', cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Error al consultar el servidor.');
  return data as T;
}

export default function AlertCenter({ user, regions, onLogin }: Props) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [name, setName] = useState('Terremotos fuertes');
  const [regionId, setRegionId] = useState('global');
  const [magnitude, setMagnitude] = useState('5.0');
  const [depth, setDepth] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    if (!user) { setRules([]); setNotices([]); return; }
    setLoading(true);
    try {
      const [r, n] = await Promise.all([api<{ rules: Rule[] }>('/api/alerts'), api<{ notifications: Notice[] }>('/api/notifications')]);
      setRules(r.rules); setNotices(n.notifications);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Error de conexión.'); }
    finally { setLoading(false); }
  }, [user]);
  useEffect(() => { void refresh(); }, [refresh]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      await api('/api/alerts', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, regionId, minMagnitude: Number(magnitude), maxDepth: depth ? Number(depth) : null }) });
      await refresh(); setMessage('Regla guardada en PostgreSQL. Podés comprobar ahora; en producción también se evaluará con el cron diario.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo crear la regla.'); }
    finally { setBusy(false); }
  }
  async function check() {
    setBusy(true); setMessage('Consultando eventos reales de USGS…');
    try {
      const result = await api<{ checked: number; newNotifications: number; message: string }>('/api/alerts/check', { method: 'POST' });
      await refresh(); setMessage(`${result.message} ${result.newNotifications} notificaciones nuevas para ${result.checked} reglas.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo comprobar.'); }
    finally { setBusy(false); }
  }
  async function toggle(rule: Rule) {
    setBusy(true);
    try {
      await api(`/api/alerts/${rule.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: !rule.enabled }) });
      await refresh(); setMessage(rule.enabled ? 'Regla pausada.' : 'Regla activada.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo actualizar.'); }
    finally { setBusy(false); }
  }
  async function remove(rule: Rule) {
    if (!window.confirm(`¿Eliminar la regla «${rule.name}»?`)) return;
    setBusy(true);
    try { await api(`/api/alerts/${rule.id}`, { method: 'DELETE' }); await refresh(); setMessage('Regla eliminada.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo eliminar.'); }
    finally { setBusy(false); }
  }
  async function markRead() {
    setBusy(true);
    try { await api('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'read-all' }) }); await refresh(); setMessage('Notificaciones marcadas como leídas.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudieron actualizar.'); }
    finally { setBusy(false); }
  }

  return <section className="v3-module" aria-label="Centro de alertas">
    <div className="panel v3-hero"><span className="section-kicker">ATLAS / MÓDULO 04 · NEON POSTGRESQL</span><h2>Alert <em>Center.</em></h2><p>Creá reglas geográficas, comparalas contra eventos reales de USGS y almacená coincidencias en tu cuenta.</p><div className="v3-chips"><span><BellRing size={14}/> Alertas por magnitud</span><span><Database size={14}/> Persistencia real</span><span><Radar size={14}/> Manual + tarea programada</span></div></div>
    <div className="v3-notice"><ShieldAlert size={18}/><span><strong>No es una alerta temprana ni un servicio de emergencias.</strong> En producción, una tarea diaria puede revisar USGS si configurás CRON_SECRET y Vercel Cron. También podés usar «Comprobar ahora». No hay notificaciones push ni garantía de tiempo real.</span></div>
    <SyncStatus/>
    {!user ? <div className="panel v3-locked"><LockKeyhole size={32}/><h3>Tu centro de alertas</h3><p>Iniciá sesión para crear reglas y guardar coincidencias en Neon.</p><button className="button button-primary" onClick={onLogin}>Ingresar a ATLAS</button></div> : <>
      <div className="v3-two-col">
        <form className="panel v3-card v3-form" onSubmit={event => void create(event)}><div className="v3-card-head"><Plus size={20}/><div><span className="section-kicker">NUEVA REGLA</span><h3>Definí tu vigilancia</h3></div></div>
          <label>Nombre de la regla<input value={name} onChange={event => setName(event.target.value)} required minLength={3} maxLength={80}/></label>
          <label>Región<select value={regionId} onChange={event => setRegionId(event.target.value)}>{regions.map(region => <option value={region.id} key={region.id}>{region.name}</option>)}</select></label>
          <div className="v3-field-grid"><label>Magnitud mínima<input type="number" step="0.1" min="0" max="9" value={magnitude} onChange={event => setMagnitude(event.target.value)} required/></label><label>Profundidad máxima (km)<input type="number" min="0" max="800" step="1" value={depth} onChange={event => setDepth(event.target.value)} placeholder="Sin límite"/></label></div>
          <button className="button button-primary" disabled={busy || rules.length >= 20} type="submit">Crear regla <Plus size={15}/></button><small>Hasta 20 reglas por cuenta. Regiones aproximadas según sus coordenadas.</small>
        </form>
        <div className="panel v3-card"><div className="v3-card-head"><Bell size={20}/><div><span className="section-kicker">TUS REGLAS</span><h3>Configuradas <small>{rules.length}</small></h3></div><button className="v3-icon" title="Actualizar" onClick={() => void refresh()} disabled={loading}><RefreshCw size={17}/></button></div>
          <div className="v3-rule-list">{rules.length === 0 ? <p className="v3-empty">Todavía no tenés reglas. Creá una a la izquierda.</p> : rules.map(rule => <div className="v3-rule" key={rule.id}><div><strong>{rule.name}</strong><span>{regions.find(region => region.id === rule.regionId)?.name || rule.regionId} · M ≥ {rule.minMagnitude.toFixed(1)} {rule.maxDepth !== null ? `· ≤ ${rule.maxDepth} km` : ''}</span></div><div className="v3-rule-actions"><button onClick={() => void toggle(rule)} disabled={busy} className={rule.enabled ? 'v3-active' : ''}>{rule.enabled ? 'Activa' : 'Pausada'}</button><button onClick={() => void remove(rule)} disabled={busy} title="Eliminar regla" aria-label={`Eliminar ${rule.name}`}><Trash2 size={15}/></button></div></div>)}</div>
          <button className="button button-primary v3-check" onClick={() => void check()} disabled={busy || !rules.some(rule => rule.enabled)}><Radar size={16}/>{busy ? 'Procesando…' : 'Comprobar ahora contra USGS'}</button>
        </div>
      </div>
      <div className="panel v3-card"><div className="v3-card-head"><BellRing size={20}/><div><span className="section-kicker">COINCIDENCIAS REGISTRADAS</span><h3>Notificaciones <small>{notices.filter(item => !item.read).length} sin leer</small></h3></div><button className="v3-text-button" disabled={busy || !notices.some(item => !item.read)} onClick={() => void markRead()}><CheckCheck size={15}/> Marcar leídas</button></div>
        {notices.length === 0 ? <p className="v3-empty">Sin notificaciones. Creá una regla y ejecutá «Comprobar ahora».</p> : <div className="v3-notifications">{notices.map(item => <div key={item.id} className={`v3-notification ${item.read ? '' : 'unread'}`}><span className="v3-quake-mag">M {item.magnitude.toFixed(1)}</span><div><strong>{item.title}</strong><small>{item.ruleName} · {new Date(item.occurredAt).toLocaleString('es-AR', { timeZone: 'UTC' })} UTC</small></div>{!item.read && <span className="v3-unread-dot"/>}</div>)}</div>}
      </div>
    </>}
    {message && <p className="v3-message" role="status">{message}</p>}
  </section>;
}
