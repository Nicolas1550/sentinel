import {createHash} from 'node:crypto';
import {query} from './db';
// Requires migrations/001_v4.sql. Database-backed to work across serverless instances.
export async function rateLimit(scope:string, identifier:string, max:number, seconds:number){
 const key=createHash('sha256').update(scope+':'+identifier).digest('hex');
 const rows=await query<{count:number}>(`INSERT INTO rate_limit_buckets(key,count,expires_at) VALUES($1,1,NOW()+($2::int*interval '1 second')) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN rate_limit_buckets.expires_at<NOW() THEN 1 ELSE rate_limit_buckets.count+1 END,expires_at=CASE WHEN rate_limit_buckets.expires_at<NOW() THEN NOW()+($2::int*interval '1 second') ELSE rate_limit_buckets.expires_at END RETURNING count`,[key,seconds]);
 return rows[0].count<=max;
}
export function requestIp(req:Request){return req.headers.get('x-real-ip')||req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown'}
