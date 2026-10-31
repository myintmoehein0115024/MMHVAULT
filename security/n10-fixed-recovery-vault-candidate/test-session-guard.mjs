// Offline synthetic tests; JWT payloads are NOT signed or authenticated.
// The production handler MUST validate the same token with Supabase Auth FIRST.
import assert from 'node:assert/strict';
import {sessionIdFromVerifiedJwt} from './session-guard.mjs';
const base='https://ldivswlhtgmznzwhzsoi.supabase.co';
const user='123e4567-e89b-12d3-a456-426614174000';
const session='890d7813-a962-4a70-8ca9-9ef68b25bc53';
const exp=Math.floor(Date.now()/1000)+300;
const mk=(changes={})=>'header.'+Buffer.from(JSON.stringify({
 sub:user,iss:base+'/auth/v1',exp,session_id:session,...changes
})).toString('base64url')+'.signature';
const tests=[
 ['valid post-verified session ID',()=>assert.equal(sessionIdFromVerifiedJwt(mk(),user,base),session)],
 ['different owner',()=>assert.equal(sessionIdFromVerifiedJwt(mk({sub:'other'}),user,base),null)],
 ['different project issuer',()=>assert.equal(sessionIdFromVerifiedJwt(mk({iss:'https://other.example/auth/v1'}),user,base),null)],
 ['expired token',()=>assert.equal(sessionIdFromVerifiedJwt(mk({exp:1}),user,base),null)],
 ['missing expiry',()=>assert.equal(sessionIdFromVerifiedJwt(mk({exp:null}),user,base),null)],
 ['missing session ID',()=>assert.equal(sessionIdFromVerifiedJwt(mk({session_id:null}),user,base),null)],
 ['malformed session ID',()=>assert.equal(sessionIdFromVerifiedJwt(mk({session_id:'not-a-uuid'}),user,base),null)],
 ['no jwt segments',()=>assert.equal(sessionIdFromVerifiedJwt('abc',user,base),null)],
 ['corrupt JSON',()=>assert.equal(sessionIdFromVerifiedJwt('a.e30v.b',user,base),null)],
 ['wrong JWT type',()=>assert.equal(sessionIdFromVerifiedJwt(null,user,base),null)],
 ['uppercase UUID normalized',()=>assert.equal(sessionIdFromVerifiedJwt(mk({session_id:session.toUpperCase()}),user,base),session)],
 ['trailing slash accepted',()=>assert.equal(sessionIdFromVerifiedJwt(mk(),user,base+'/'),session)],
];
let fails=0;for(const [title,test] of tests){try{test();console.log('PASS',title)}catch(e){fails++;console.error('FAIL',title,e.message)}}
console.log((tests.length-fails)+'/'+tests.length+' synthetic cases passed');
if(fails)process.exitCode=1;
