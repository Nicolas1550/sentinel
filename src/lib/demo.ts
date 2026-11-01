import {pool} from './db';
export async function ensureDemo(){
 const client=await pool.connect();
 try {await client.query('BEGIN');
 const org=await client.query("INSERT INTO organizations(name,slug) VALUES ('Sentinel Demo','sentinel-demo') ON CONFLICT(slug) DO UPDATE SET name=EXCLUDED.name RETURNING id");
 const orgId=org.rows[0].id as string;
 const app=await client.query("INSERT INTO monitored_applications(organization_id,name,slug,website_url,status) VALUES ($1,'Sentinel Lab','sentinel-lab','https://example.com','active') ON CONFLICT(organization_id,slug) DO UPDATE SET status='active' RETURNING id",[orgId]);
 const rule=await client.query("SELECT id FROM detection_rules WHERE organization_id=$1 AND rule_type='failed_login_burst' LIMIT 1",[orgId]);
 if(!rule.rowCount) await client.query("INSERT INTO detection_rules(organization_id,name,description,rule_type,severity,config) VALUES ($1,'Repeated failed logins','5 failed logins from one IP within 60 seconds','failed_login_burst','high',$2::jsonb)",[orgId,JSON.stringify({threshold:5,window_seconds:60})]);
 await client.query('COMMIT');return {orgId,appId:app.rows[0].id as string};
 } catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}
// Canonical event names preserve compatibility with existing ATLAS versions.
export function canonicalEventType(value:string){
 const key=value.trim().toLowerCase().replace(/[_.\s-]+/g,'.');
 const aliases:Record<string,string>={'failed.login':'login.failed','login.failure':'login.failed','successful.login':'login.success','login.successful':'login.success','login.blocked':'login.blocked','registration.failed':'registration.failed','unauthorized.access':'unauthorized.access','rate.limit.exceeded':'rate.limit.exceeded'};
 return aliases[key]??key;
}
export function classifyEvent(value:string){
 const type=canonicalEventType(value);
 if(type==='login.blocked'||type==='rate.limit.exceeded')return 'high';
 if(type==='unauthorized.access')return 'medium';
 if(type==='login.failed'||type==='registration.failed')return 'low';
 return 'info';
}
export async function ingestEvent(appId:string,event:{event_type:string;source_ip:string;user_identifier?:string;message?:string;external_event_id?:string;metadata?:Record<string,unknown>}){
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  const app=await client.query('SELECT organization_id FROM monitored_applications WHERE id=$1',[appId]);
  if(!app.rowCount)throw new Error('Application not found');
  const orgId=app.rows[0].organization_id as string;
  const type=canonicalEventType(event.event_type),severity=classifyEvent(type);
  // Advisory lock prevents concurrent requests from creating duplicate incidents for one IP/app.
  if(type==='login.failed'||type==='login.blocked')await client.query('SELECT pg_advisory_xact_lock(hashtext($1),hashtext($2))',[appId,event.source_ip]);
  const inserted=await client.query(`INSERT INTO security_events(organization_id,application_id,external_event_id,event_type,severity,source_ip,user_identifier,message,metadata) VALUES($1,$2,$3,$4,$5,$6::inet,$7,$8,$9::jsonb) ON CONFLICT(application_id,external_event_id) DO NOTHING RETURNING id`,[orgId,appId,event.external_event_id??null,type,severity,event.source_ip,event.user_identifier??null,event.message??null,JSON.stringify(event.metadata??{})]);
  if(!inserted.rowCount){await client.query('COMMIT');return {duplicate:true,incident:false};}
  const eventId=inserted.rows[0].id as string;
  let incident=false,incidentId:string|undefined;
  if(type==='login.blocked'){
   const description=`Login blocked from ${event.source_ip}`;
   const existing=await client.query("SELECT id FROM incidents WHERE application_id=$1 AND title='Login blocked by application' AND description=$2 AND status IN ('open','investigating') AND detected_at>NOW()-interval '15 minutes' LIMIT 1 FOR UPDATE",[appId,description]);
   if(existing.rowCount)incidentId=existing.rows[0].id;
   else{const created=await client.query("INSERT INTO incidents(organization_id,application_id,title,description,severity) VALUES($1,$2,'Login blocked by application',$3,'high') RETURNING id",[orgId,appId,description]);incidentId=created.rows[0].id;incident=true;}
  }
  if(type==='login.failed'){
   // Works for every organization; V4 demo-only rules are optional overrides.
   const rules=await client.query("SELECT id,config FROM detection_rules WHERE organization_id=$1 AND rule_type='failed_login_burst' AND is_enabled=true LIMIT 1",[orgId]);
   const config=(rules.rows[0]?.config??{}) as {threshold?:number;window_seconds?:number};
   const threshold=Math.max(2,Math.min(100,Number(config.threshold)||5));
   const seconds=Math.max(10,Math.min(3600,Number(config.window_seconds)||60));
   const matching=await client.query("SELECT id FROM security_events WHERE application_id=$1 AND source_ip=$2::inet AND event_type IN ('login.failed','failed.login','login.failed') AND occurred_at>=NOW()-($3::int*interval '1 second') ORDER BY occurred_at DESC LIMIT 100",[appId,event.source_ip,seconds]);
   if(matching.rows.length>=threshold){
    const description=`Suspicious failed login activity from ${event.source_ip}`;
    const existing=await client.query("SELECT id FROM incidents WHERE application_id=$1 AND title='Repeated failed login attempts' AND description=$2 AND status IN ('open','investigating') AND detected_at>NOW()-($3::int*interval '1 second') LIMIT 1 FOR UPDATE",[appId,description,seconds]);
    if(existing.rowCount)incidentId=existing.rows[0].id;
    else{const created=await client.query("INSERT INTO incidents(organization_id,application_id,rule_id,title,description,severity) VALUES($1,$2,$3,'Repeated failed login attempts',$4,'high') RETURNING id",[orgId,appId,rules.rows[0]?.id??null,description]);incidentId=created.rows[0].id;incident=true;}
    for(const row of matching.rows)await client.query('INSERT INTO incident_events(incident_id,event_id,organization_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[incidentId,row.id,orgId]);
   }
  }
  if(incidentId)await client.query('INSERT INTO incident_events(incident_id,event_id,organization_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[incidentId,eventId,orgId]);
  await client.query('COMMIT');
  return {duplicate:false,incident,incidentId};
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}
