import {getSession,unauthorized} from '@/lib/auth';import {query} from '@/lib/db';
export const dynamic='force-dynamic';
export async function GET(){const user=await getSession();if(!user)return unauthorized();const logs=await query('SELECT id,action,resource_type,details,created_at FROM audit_logs WHERE organization_id=$1 ORDER BY created_at DESC LIMIT 100',[user.organization_id]);return Response.json({logs})}
