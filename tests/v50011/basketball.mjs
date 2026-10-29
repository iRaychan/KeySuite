import assert from 'node:assert/strict';import {createBasketball,addPlayer,stepBasketball,aiInput} from '../../keyhq/campus/basketball-core.js';
const s=createBasketball();addPlayer(s,'a',0);addPlayer(s,'b',1,true);assert.equal(addPlayer(s,'c',0),null);
for(let t=0;t<2400;t++)stepBasketball(s,{a:aiInput(s,'a',.05),b:aiInput(s,'b',.05)},.05);
assert(s.basketball.shots>2);assert(s.scores.A>0&&s.scores.B>0);assert.equal(s.basketball.status,'playing');assert.equal(Object.keys({...s.players,...s.bots}).length,2);console.log('PASS: two-player scoring, retrieval and alternating turns',s.scores,s.basketball.shots);
