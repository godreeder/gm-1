import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {configure,newState,validateState,buildFlow,commitChoice,enterNode,canRomance,romanceId,happyRequirements,resolveSpeaker} from '../core.js';

const data=JSON.parse(fs.readFileSync(new URL('../data/story.json',import.meta.url)));
configure(data);

function walk(hero,ending='E5',overrides={}){
 const s=newState(hero);const seen=new Set();
 const defaults={
  '1.02.choice':0,'1.03.choice':0,'1.03.second':0,'1.04.choice':0,'1.05.friend':0,
  '2.01.choice':0,'2.private1':0,'2.private2':0,'2.08.choice':0,'2.10.choice':0,
  '3.witness':0,'3.investigation1':0,'3.investigation2':0,'3.polina':0,'3.interest':0,
  '4.fight':0,'4.romance':0,'4.touch':0,'4.twins':0,'4.yarik':0,
  '5.lida':0,'5.rescue':0,'5.relationship':0,'5.accountability':0,
  '6.invites':0,'6.kolya':0,'6.maks':0,'6.exit':0,'6.power-confirm':0,
  '7.reveal':0,'7.confess':0,'7.reality':0,'7.ending':['E1','E2','E3','E4','E5'].indexOf(ending),'E5.seat':0,
  ...overrides,
 };
 for(;;){
  assert.ok(!seen.has(s.node),'Loop '+s.node);seen.add(s.node);
  const flow=buildFlow(s),n=flow.find(x=>x.id===s.node);assert.ok(n,'Missing node '+s.node);
  assert.equal(new Set(flow.map(x=>x.id)).size,flow.length,'Duplicate node IDs');
  if(n.bg)assert.ok(data.assets[n.bg],'Missing background '+n.bg);
  if(n.art)assert.ok(data.assets[n.art],'Missing CG '+n.art);
  if(n.illustration)assert.ok(data.assets[n.illustration],'Missing illustration '+n.illustration);
  enterNode(s,n);
  if(n.kind==='finish'){assert.equal(n.ending,ending);return s;}
  const index=flow.indexOf(n),fallback=flow[index+1]?.id;
  if(n.choices){assert.ok(Object.hasOwn(defaults,n.id),'Uncovered choice '+n.id);commitChoice(s,n,defaults[n.id]);}
  const updated=buildFlow(s),now=updated.findIndex(x=>x.id===n.id);
  const next=now>=0?updated[now+1]:updated.find(x=>x.id===fallback);
  assert.ok(next,'No next after '+n.id);s.node=next.id;s.line=0;
 }
}

test('all four heroes can reach the shared happy ending',()=>{
 for(const hero of ['kolya','maks','vanya','yarik']){
  const s=walk(hero);assert.ok(happyRequirements(s).every(r=>r.met));
 }
});
test('all five endings have reachable complete paths',()=>{
 for(const e of ['E1','E2','E3','E4','E5'])assert.ok(walk('kolya',e));
});
test('Maks cannot start or import a romance with any man',()=>{
 for(const other of ['kolya','vanya','yarik']){assert.equal(canRomance('maks',other),false);assert.equal(romanceId('maks',other),null);}
 for(const girl of ['lida','polina','sasha','katya','vera'])assert.ok(canRomance('maks',girl));
 const save=newState('maks');save.partner='vanya';save.interest='kolya';const restored=validateState(save);assert.equal(restored.partner,null);assert.equal(restored.interest,null);
});
test('friendship route can reach the happy ending without romance',()=>{
 const s=newState('maks');const f=buildFlow(s),c=f.find(n=>n.id==='3.interest');
 const route=walk('maks','E5',{'3.interest':c.choices.length-1});assert.equal(route.partner,null);assert.ok(happyRequirements(route).every(x=>x.met));
});
test('leaving a companion or retaining powers blocks the safe shared ending',()=>{
 for(const exit of ['alone','power']){
  const s=newState('vanya');s.flags={protectBoth:true,transparent:true,accountable:true,reality:true,exit};s.clues=['ten','ring','note','video','blood','voices'];
  assert.equal(happyRequirements(s).every(x=>x.met),false);
  assert.ok(buildFlow(s).find(n=>n.id==='7.ending').choices[4].disabled);
 }
});
test('save round trip retains choices and supported state, rejects wrong versions',()=>{
 const s=walk('yarik');s.node='6.05';s.line=2;const r=validateState(JSON.parse(JSON.stringify(s)));
 assert.equal(r.hero,'yarik');assert.equal(r.node,'6.05');assert.equal(r.line,2);assert.deepEqual(r.clues,s.clues);assert.deepEqual(r.flags,s.flags);
 assert.equal(validateState({...s,v:99}),null);assert.equal(validateState({...s,hero:'unknown'}),null);
});
test('the Valerka reveal and Valeria name do not leak before their scenes',()=>{
 const s=newState('kolya');assert.equal(resolveSpeaker('Валерка',s,2).name,'Валерка');
 assert.equal(resolveSpeaker('Настоящая Валерка, голос из записи Кати',s,3).name,'Голос из записи');
 assert.equal(resolveSpeaker('Валерия',s,5).name,'Валерия');
});


test('scene arrivals explain location and objective before dialogue, without changing old save IDs',()=>{
 const s=newState('kolya'),flow=buildFlow(s);
 for(const id of ['1.01','1.02','1.03','2.02','3.02','4.06','5.06','6.01','7.01']){
  const i=flow.findIndex(x=>x.id===id);
  assert.equal(flow[i-2].kind,'scene');assert.ok(flow[i-2].place);assert.ok(flow[i-2].goal);
  assert.equal(flow[i-1].introduction,true);assert.ok(flow[i-1].frames.length>=1);
 }
 const dialogue=flow.find(x=>x.id==='1.02').frames;
 assert.ok(dialogue.some(x=>!x.speaker&&x.text.includes('гаснут кварталы')));
 assert.ok(dialogue.some(x=>!x.speaker&&x.text.includes('Удар снизу')));
 assert.ok(!dialogue.some(x=>x.text.includes('ВЫБОР:')));
 s.node='1.02';s.line=3;const restored=validateState(s);
 assert.equal(buildFlow(restored).find(x=>x.id===restored.node).frames[3].speaker,'Ваня');
});


test('character illustrations follow actual choices and romance cast',()=>{
 const s=newState('yarik');s.flags.yarikStayed=true;
 assert.equal(buildFlow(s).find(n=>n.id==='4.departure').illustration,null);
 s.flags.yarikStayed=false;assert.equal(buildFlow(s).find(n=>n.id==='4.departure').illustration,'10-ярик-уходит-с-ваней');
 s.flags.ending='E3';s.friend='kolya';assert.equal(buildFlow(s).find(n=>n.id==='E3').illustration,null);
 s.friend='vanya';assert.equal(buildFlow(s).find(n=>n.id==='E3').illustration,'14-финал-ярик-память');
 const m=newState('maks');m.flags.ending='E2';m.partner='lida';assert.equal(buildFlow(m).find(n=>n.id==='E2').illustration,null);
 m.partner='sasha';assert.equal(buildFlow(m).find(n=>n.id==='E2').illustration,'13-финал-макс-саша-петля');
});


test('all fifteen new artworks hold at least ten successive dialogue windows',async()=>{
 const {EPISODES}=await import('../episode-art.js');assert.equal(EPISODES.length,15);
 for(const spec of EPISODES){
  const s=newState('kolya');Object.assign(s.flags,spec.flags||{});
  const n=buildFlow(s).find(n=>n.id===spec.node);
  assert.equal(n.illustration,spec.art);assert.ok(n.frames.length>=10,spec.title);
  assert.ok(data.assets[spec.art]);assert.ok(fs.existsSync(new URL('../'+data.assets[spec.art].url,import.meta.url)));
  for(let line=0;line<n.frames.length;line++){
   s.node=n.id;s.line=line;
   assert.equal(buildFlow(s).find(x=>x.id===s.node).illustration,spec.art,'Art changed within dialogue');
  }
 }
});
test('illustrated scenes retain their art across decisions and follow the chosen investigation',()=>{
 const s=newState('kolya');let flow=buildFlow(s),n=flow.find(x=>x.id==='1.02.choice');
 assert.equal(n.illustration,'16-четверо-за-картой');commitChoice(s,n,1);
 assert.equal(buildFlow(s).find(x=>x.id==='1.02.reaction').illustration,n.illustration);
 s.flags.investigate1='contracts';s.flags.investigate2='watches';flow=buildFlow(s);
 assert.equal(flow.find(x=>x.id==='3.investigation-scene1').illustration,'23-архив-подписи');
 assert.equal(flow.find(x=>x.id==='3.investigation-scene2').illustration,'24-квартира-валерки');
 assert.equal(flow.find(x=>x.id==='4.twins').illustration,'26-две-валерки-встреча');
 assert.equal(flow.find(x=>x.id==='5.accountability').illustration,'28-ваня-ярик-повтор');
});


test('the next fifteen illustrations support complete conversations for each protagonist',async()=>{
 const {NEXT_EPISODES}=await import('../episode-art-2.js');assert.equal(NEXT_EPISODES.length,15);
 for(const hero of ['kolya','maks','vanya','yarik'])for(const spec of NEXT_EPISODES){
  const s=newState(hero);Object.assign(s.flags,spec.flags||{});
  const n=buildFlow(s).find(x=>x.id===spec.node);
  assert.equal(n.illustration,spec.art);assert.ok(n.frames.length>=9,spec.title);
  assert.ok(fs.existsSync(new URL('../'+data.assets[spec.art].url,import.meta.url)));
 }
});
test('private conversations and rival trials keep the correct artwork through their decisions',()=>{
 const s=newState('maks');s.flags={private1:'sasha',private2:'vera'};
 let flow=buildFlow(s);
 assert.equal(flow.find(n=>n.id==='2.private-scene1').illustration,'36-саша-граница-иллюзии');
 assert.equal(flow.find(n=>n.id==='2.private-scene2').illustration,'33-валерка-боится-памяти');
 assert.ok(flow.find(n=>n.id==='2.private-scene1').frames.some(f=>f.text.includes('без чужого лица')));
 const before=flow.find(n=>n.id==='6.03').illustration;commitChoice(s,flow.find(n=>n.id==='6.kolya'),0);flow=buildFlow(s);
 assert.equal(flow.find(n=>n.id==='6.kolya-reaction').illustration,before);
 assert.equal(flow.find(n=>n.id==='6.maks').illustration,'43-макс-выход-за-стеклом');
});


test('saved chapter numbers follow interludes and artwork rather than their ID prefix',async()=>{
 const {chapterForNode}=await import('../core.js');
 const s=newState('kolya');
 for(const [id,chapter] of [['arrival.1.02',1],['bridge.2.01',2],['cg.07-коля-опоссум',3],['cg.01-ваня-ярик',4],['chapter-6',6],['6.05',6]]){
  if(id==='cg.01-ваня-ярик'){s.partner='vanya';s.hero='yarik';s.flags.romance='yes';s.interest='vanya';}
  s.node=id;assert.equal(chapterForNode(s),chapter,id);
 }
 const slot=newState('maks');slot.node='bridge.3.02';assert.equal(chapterForNode(slot),3);
});
