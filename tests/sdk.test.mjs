import test from 'node:test';import assert from 'node:assert/strict';import {SentinelClient} from '../sdk/sentinel-client.mjs';
test('SDK validates configuration',()=>{assert.throws(()=>new SentinelClient({url:'',apiKey:''}));});
test('SDK strips trailing slash',()=>{assert.equal(new SentinelClient({url:'http://localhost:3001/',apiKey:'test'}).url,'http://localhost:3001');});
