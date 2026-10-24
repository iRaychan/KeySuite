import assert from 'node:assert/strict';
import {LocalActor,pathTo,sanitize} from '../keyhq/avatar/controller.js';
const desks=[{x:-.34,y:-.3,facing:1},{x:.34,y:-.3,facing:1},{x:-.34,y:.3,facing:-1},{x:.34,y:.3,facing:-1}];
assert.equal(pathTo({x:-1,y:-1},{x:0,y:0},desks),null);
assert.ok(pathTo({x:-1,y:-1},{x:1,y:-1.5},desks).length>0);
const a=new LocalActor(0);assert.ok(a.command('idle',{target:{x:1,y:-1.5},desks}));assert.equal(a.auto,false);
for(let i=0;i<1000;i++)a.update(.02,i*20,desks);assert.equal(a.state,'idle');assert.equal(a.x,1);assert.equal(a.y,-1.5);
a.command('wave');a.update(.05,1e9,desks);assert.equal(a.state,'wave');assert.equal(a.auto,false);
a.auto=true;a.nextDecision=0;a.update(.05,1e9,desks);assert.equal(a.auto,true);
assert.equal(sanitize({skin:'bad',hair:'invalid',name:'X'.repeat(90)}).name.length,32);assert.equal(sanitize({skin:'bad'}).skin,'#d9a27e');
console.log('PASS: obstacle rejection, route completion, manual priority, auto resume, profile validation');

for(const [i,seat] of desks.entries()){const actor=new LocalActor(i%2);assert(actor.command('work',{target:{x:seat.x,y:seat.y-seat.facing*.43},seat,desks}));for(let j=0;j<1500;j++)actor.update(.02,j*20,desks);assert.equal(actor.state,'work');assert.equal(actor.y,seat.y-seat.facing*.43);assert.equal(actor.facing,seat.facing>0?0:Math.PI)}
console.log('PASS all four corrected chair approaches and desk-facing work states');
