import {createHmac,randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
import {cookies,headers} from 'next/headers';
import {query} from './db';
const COOKIE='sentinel_session';
const secret=()=>{const s=process.env.SESSION_SECRET;if(!s||s.length<32)throw new Error('SESSION_SECRET must contain at least 32 characters');return s};
export function hashPassword(password:string){const salt=randomBytes(16).toString('hex');return `scrypt:${salt}:${scryptSync(password,salt,64).toString('hex')}`}
export function verifyPassword(password:string,stored:string){try{const [kind,salt,hash]=stored.split(':');if(kind!=='scrypt')return false;const a=Buffer.from(hash,'hex');const b=scryptSync(password,salt,a.length);return a.length===b.length&&timingSafeEqual(a,b)}catch{return false}}
function sign(payload:string){return createHmac('sha256',secret()).update(payload).digest('base64url')}
export function setSession(userId:string){const payload=Buffer.from(JSON.stringify({uid:userId,exp:Date.now()+7*86400000})).toString('base64url');cookies().set(COOKIE,payload+'.'+sign(payload),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:7*86400})}
export function clearSession(){cookies().delete(COOKIE)}
export async function getSession(){try{const token=cookies().get(COOKIE)?.value;if(!token)return null;const [payload,sig]=token.split('.');if(!payload||!sig)return null;const a=Buffer.from(sig),b=Buffer.from(sign(payload));if(a.length!==b.length||!timingSafeEqual(a,b))return null;const parsed=JSON.parse(Buffer.from(payload,'base64url').toString());if(parsed.exp<Date.now()||typeof parsed.uid!=='string')return null;const rows=await query<{id:string;name:string;email:string;organization_id:string;role:string}>(`SELECT u.id,u.name,u.email,m.organization_id,m.role FROM users u JOIN organization_members m ON m.user_id=u.id WHERE u.id=$1 AND u.is_active=true ORDER BY m.joined_at LIMIT 1`,[parsed.uid]);return rows[0]??null}catch{return null}}
export function validOrigin(req:Request){const origin=req.headers.get('origin');if(!origin)return false;try{return new URL(origin).host===new URL(req.url).host}catch{return false}}
export function unauthorized(){return Response.json({error:'Iniciá sesión para continuar'},{status:401})}

// Return the authenticated user ID, or null when there is no valid session.
export async function getUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.id ?? null;
}
