import {getSession,unauthorized} from '@/lib/auth';
import {query} from '@/lib/db';
import {NextRequest} from 'next/server';
export const dynamic='force-dynamic';
export async function GET(_req:NextRequest,{params}:{params:{id:string}}){
 const user=await getSession();if(!user)return unauthorized();
 if(!/^[0-9a-f-]{36}$/i.test(params.id))return Response.json({error:'ID inválido'},{status:400});
 const incidents=await query('SELECT id,title,description,severity,status,detected_at FROM incidents WHERE id=$1 AND organization_id=$2',[params.id,user.organization_id]);
 if(!incidents.length)return Response.json({error:'No encontrado'},{status:404});
 const events=await query(`SELECT e.id,e.event_type,e.severity,e.source_ip::text,e.user_identifier,e.message,e.metadata,e.occurred_at FROM incident_events ie JOIN security_events e ON e.id=ie.event_id AND e.organization_id=ie.organization_id WHERE ie.incident_id=$1 AND ie.organization_id=$2 ORDER BY e.occurred_at DESC LIMIT 100`,[params.id,user.organization_id]);
 return Response.json({incident:incidents[0],events});
}
