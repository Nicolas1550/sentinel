import {createHmac} from 'node:crypto';
// Optional server-side webhook. Set SENTINEL_ALERT_WEBHOOK_URL to an HTTPS endpoint.
export async function notifyIncident(incidentId:string,appId:string){
 const url=process.env.SENTINEL_ALERT_WEBHOOK_URL;
 if(!url)return;
 try{
  const parsed=new URL(url);
  if(parsed.protocol!=='https:'||parsed.username||parsed.password)throw Error('Webhook must be HTTPS');
  const host=parsed.hostname.toLowerCase().replace(/\.$/,'');
  if(host==='localhost'||host.endsWith('.localhost')||host.endsWith('.local')||host.endsWith('.internal')||host.endsWith('.test')||host.endsWith('.invalid')||/^\d+\.\d+\.\d+\.\d+$/.test(host)||host.includes(':'))throw Error('Webhook destination not allowed');
  // For production, prefer an allowlisted trusted receiver; DNS rebinding protection requires egress controls.
  if(process.env.SENTINEL_ALERT_WEBHOOK_ALLOWED_HOST && host!==process.env.SENTINEL_ALERT_WEBHOOK_ALLOWED_HOST.toLowerCase())throw Error('Webhook host not allowlisted');
  const body=JSON.stringify({type:'incident.created',incident_id:incidentId,application_id:appId,timestamp:new Date().toISOString()});
  const secret=process.env.SENTINEL_ALERT_WEBHOOK_SECRET;
  const signature=secret?createHmac('sha256',secret).update(body).digest('hex'):undefined;
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),3000);
  try{const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...(signature?{'X-Sentinel-Signature':'sha256='+signature}:{})},body,signal:controller.signal,cache:'no-store'});if(!response.ok)console.warn('[SENTINEL] alert webhook HTTP',response.status)}finally{clearTimeout(timer)}
 }catch{console.warn('[SENTINEL] alert webhook unavailable')}
}
