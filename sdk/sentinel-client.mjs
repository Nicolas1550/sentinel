/** SENTINEL SDK: server-side only. Node 18+ / any runtime with fetch. */
export class SentinelClient {
 constructor({url,apiKey,timeoutMs=3000}){if(!url||!apiKey)throw Error('SENTINEL_URL and SENTINEL_API_KEY are required');this.url=url.replace(/\/$/,'');this.apiKey=apiKey;this.timeoutMs=timeoutMs;}
 async track(event){const response=await fetch(this.url+'/api/events',{method:'POST',headers:{'authorization':'Bearer '+this.apiKey,'content-type':'application/json'},body:JSON.stringify(event),signal:AbortSignal.timeout(this.timeoutMs)});if(!response.ok)throw Error('SENTINEL rejected event: HTTP '+response.status);return response.json();}
 async safeTrack(event){try{return await this.track(event)}catch(e){console.warn('[SENTINEL]',e.message);return null}}
}
