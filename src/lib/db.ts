import { Pool } from 'pg';
const globalForPg = globalThis as unknown as { sentinelPool?: Pool };
export const pool = globalForPg.sentinelPool ?? new Pool({connectionString:process.env.DATABASE_URL, max:5, connectionTimeoutMillis:8000, ssl: {rejectUnauthorized:true}});
if(process.env.NODE_ENV!=='production') globalForPg.sentinelPool=pool;
export async function query<T extends Record<string,unknown> = Record<string,unknown>>(sql:string, params:unknown[]=[]):Promise<T[]> {const result=await pool.query(sql,params);return result.rows as T[];}
