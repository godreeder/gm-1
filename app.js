import {configure, HEROES, CHARACTERS, CHAPTERS, CLUES, newState, validateState, buildFlow, enterNode, commitChoice, resolveSpeaker, displayName, happyRequirements} from './core.js';

const $=s=>document.querySelector(s);
const app=$('#app'),modal=$('#modal');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY='gm.autosave.v1',META='gm.collection.v1',SETTINGS='gm.settings.v1';
const icons={
 menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
 back:'<path d="m14 5-7 7 7 7"/>',
 close:'<path d="m6 6 12 12M18 6 6 18"/>',
 book:'<path d="M4 4h7l1 2 1-2h7v15h-7l-1 2-1-2H4zM12 6v15"/>',
 history:'<path d="M4 9a8 8 0 1 1 0 7M4 4v5h5M12 7v6l3 2"/>',
 settings:'<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="18" r="2"/>',
 sound:'<path d="m4 9 4 0 5-4v14l-5-4H4zM16 8q5 4 0 8M18 5q8 7 0 14"/>',
 heart:'<path d="M12 20 4 12C-2 5 8 0 12 7c4-7 14-2 8 5z"/>',
 save:'<path d="M5 3h12l4 4v14H3V3zM7 3v6h10V3M7 21v-7h10v7"/>',
};
const icon=(name,action,label)=>`<button class="icon-button" data-action="${action}" aria-label="${esc(label)}" title="${esc(label)}"><svg viewBox="0 0 24 24" aria-hidden="true">${icons[name]||icons.menu}</svg></button>`;
function readStorage(key,fallback=null){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
let storageFailed=false;
function writeStorage(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{if(!storageFailed){storageFailed=true;toast('Не удалось записать на устройство. Можно экспортировать сохранение в меню.');}return false;}}
let DATA,state=validateState(readStorage(KEY)),flow=[],node=null,view='loading',selectedHero='kolya',stageIds=[],sceneId='',renderToken=0;
let meta=readStorage(META,{cg:[],endings:[]});
if(!meta||!Array.isArray(meta.cg)||!Array.isArray(meta.endings))meta={cg:[],endings:[]};
let settings={speed:22,size:19,sound:false,auto:false,...readStorage(SETTINGS,{})};
settings.speed=[0,22,38].includes(settings.speed)?settings.speed:22;
settings.size=[17,19,22].includes(settings.size)?settings.size:19;
let typeTimer=null,autoTimer=null,typing=false,fullText='',toastTimer,cloudTimer,telegram=null,cloud=null,cloudReady=false;
let cloudQueue=Promise.resolve(),audioContext=null,audioMaster=null;
document.documentElement.style.setProperty('--text-size',settings.size+'px');

function asset(id){return DATA?.assets[id]?.url||'';}
function imageUrl(id){return encodeURI(asset(id));}
function toast(text){const el=$('#toast');el.textContent=text;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),3800);}
function stopTimers(){clearInterval(typeTimer);clearTimeout(autoTimer);typing=false;}
function openModal(title,body,art=false){
  clearTimeout(autoTimer);modal.className=art?'art-modal':'';
  modal.innerHTML=`<header class="modal-head"><h2 id="modal-title">${esc(title)}</h2>${icon('close','close','Закрыть')}</header><div class="modal-body">${body}</div>`;
  if(!modal.open)modal.showModal();
}
function closeModal(){modal.close();scheduleAuto();}
modal.addEventListener('click',e=>{if(e.target===modal)closeModal();});
modal.addEventListener('cancel',()=>{setTimeout(scheduleAuto,0);});
function save(){if(!state)return;state.updatedAt=Date.now();writeStorage(KEY,state);clearTimeout(cloudTimer);if(cloud)cloudTimer=setTimeout(()=>queueCloudSave(),900);}
function saveMeta(){writeStorage(META,meta);}

function showMenu(){
  stopTimers();view='menu';sceneId='';stageIds=[];telegram?.BackButton?.hide();
  app.innerHTML=`<section class="screen scenic menu" style="background-image:url('${imageUrl('17-пустой-город')}')"><div class="screen-content">
  <div class="menu-top"><span class="eyebrow">ИНТЕРАКТИВНАЯ ИСТОРИЯ</span>${icon('settings','settings','Настройки')}</div>
  <div class="menu-title"><span class="wordmark">ГМ</span><h1>Последняя дверь</h1><div class="divider"></div><p>Четыре героя. Чужие тайны.<br>И место, которое нельзя открывать снова.</p></div>
  <div class="menu-actions">${state&&!state.complete?`<button class="primary" data-action="continue"><span class="resume-label">Продолжить<small>${esc(displayName(state.hero))} · Глава ${chapterOf(state.node)}</small></span><span>→</span></button>`:''}
  <button class="${state&&!state.complete?'secondary':'primary'}" data-action="new">Новая история <span>↗</span></button></div>
  <nav class="menu-links"><button class="text-button" data-action="saves">Сохранения</button><button class="text-button" data-action="gallery">Коллекция</button><button class="text-button" data-action="about">Об истории</button></nav>
  <div class="menu-foot">7 ГЛАВ &nbsp; · &nbsp; 4 ГЕРОЯ &nbsp; · &nbsp; 5 ФИНАЛОВ<span>${cloudReady?'Прогресс связан с Telegram':'Прогресс сохраняется на устройстве'}</span></div>
  </div></section>`;
}
function chapterOf(id){return Number(String(id).match(/(?:chapter-|^)([1-7])/)?.[1])||7;}
function showHeroes(){
  stopTimers();view='heroes';telegram?.BackButton?.show();
  app.innerHTML=`<section class="screen hero-screen"><header class="page-header">${icon('back','menu','Вернуться')}<div><span class="eyebrow">ТВОЯ ТОЧКА ЗРЕНИЯ</span><h2>Выбери героя</h2></div></header><div class="hero-body"><p class="hero-intro">Они попадут в одну историю.<br>Но у каждого — своя правда и свои причины молчать.</p><div class="hero-grid">${HEROES.map(id=>`<button class="hero-card ${selectedHero===id?'selected':''}" data-action="hero" data-id="${id}" aria-pressed="${selectedHero===id}"><img src="${imageUrl(id)}" alt="${esc(CHARACTERS[id].name)}" loading="${id===selectedHero?'eager':'lazy'}"><span class="card-caption"><strong>${esc(CHARACTERS[id].name)}</strong><small>${esc(CHARACTERS[id].power)}</small></span></button>`).join('')}</div><p class="hero-description">${esc(CHARACTERS[selectedHero].description)}</p><p class="hero-note">${selectedHero==='maks'?'Романтические ветки Макса — только с девушками.':'Можно выбирать романтические отношения или дружбу.'}</p><button class="primary" data-action="start">Начать за ${esc({kolya:'Колю',maks:'Макса',vanya:'Ваню',yarik:'Ярика'}[selectedHero])} <span>→</span></button></div></section>`;
}
function begin(){
  if(state&&!state.complete){openModal('Начать заново?',`<p>Автосохранение текущей истории будет заменено. Ручные сохранения и коллекция останутся.</p><div class="modal-actions"><button class="secondary" data-action="close">Отмена</button><button class="primary" data-action="confirm-start">Начать</button></div>`);return;}
  startNew();
}
function requestGameFullscreen(){try{telegram?.requestFullscreen?.();}catch{}}
function startNew(){if(modal.open)modal.close();state=newState(selectedHero);save();play();toggleAudio();requestGameFullscreen();}
function play(){stopTimers();view='game';sceneId='';stageIds=[];flow=buildFlow(state);telegram?.BackButton?.show();buildGameUI();renderCurrent();}
function buildGameUI(){
  app.innerHTML=`<section class="screen game-screen"><div id="stage" class="stage"></div><div id="characters" class="character-stage"></div><div class="game-bottom-shade"></div>
  <button class="tap-area" data-action="advance" aria-label="Следующая реплика"></button>
  <header class="game-top">${icon('menu','pause','Меню игры')}<div class="chapter-status"><span class="chapter-num" id="chapter-num"></span><span class="chapter-name" id="chapter-name"></span></div>${icon('book','notebook','Досье и отношения')}${icon('history','history','История реплик')}${icon('settings','settings','Настройки')}</header><div class="chapter-progress"><i id="progress"></i></div><button class="scene-caption" id="scene-caption" data-action="context" aria-label="Где мы сейчас?"></button>
  <section class="speech-panel" id="speech-panel" aria-label="Диалог"><div class="speaker-row" id="speaker-row"><i class="speaker-line"></i><span class="speaker-name" id="speaker-name"></span><span class="speaker-aside" id="speaker-aside"></span></div><p class="dialogue-text" id="dialogue-text" aria-live="polite"></p><div id="choices" class="choices"></div><div class="speech-foot"><span id="speech-hint">Нажми, чтобы продолжить</span><span class="advance-glyph">▸</span></div></section><div id="special"></div></section>`;
}
const seenImages=new Set();
function preload(id){const url=imageUrl(id);if(!url||seenImages.has(url))return;seenImages.add(url);const im=new Image();im.src=url;}
function setBackground(id,cg=false){
  const el=$('#stage');if(!el)return;
  const url=imageUrl(id);if(el.dataset.asset!==id){el.style.backgroundImage=`url("${url}")`;el.dataset.asset=id;}
  el.classList.toggle('cg-stage',cg);preload(id);
}
function current(){flow=buildFlow(state);return flow.find(n=>n.id===state.node);}
function renderCurrent(){
  stopTimers();node=current();
  if(!node){state.node=`chapter-${chapterOf(state.node)}`;state.line=0;node=current();if(!node){state=newState(state.hero);node=current();}}
  const before=state.clues.length;enterNode(state,node);if(state.clues.length>before)toast(`Новая улика: ${CLUES[state.clues.at(-1)][0]}`);
  save();
  if(node.kind==='finish'){finish();return;}
  const token=++renderToken;
  setBackground(node.art||node.bg,node.kind==='cg');
  $('#chapter-num').textContent=`ГЛАВА ${node.chapter} ИЗ 7`;
  $('#chapter-name').textContent=CHAPTERS[node.chapter][0];
  const inChapter=flow.filter(n=>n.chapter===node.chapter),pos=inChapter.findIndex(n=>n.id===node.id);
  $('#progress').style.width=`${(pos+1)/inChapter.length*100}%`;
  $('#special').innerHTML='';$('#speech-panel').hidden=false;
  $('#scene-caption').textContent=node.place||'';
  if(node.kind==='scene'){
    $('#speech-panel').hidden=true;$('#characters').innerHTML='';stageIds=[];sceneId='';
    $('#special').innerHTML=`<section class="scene-interlude"><span class="eyebrow">${esc(node.time)}</span><div class="scene-rule"></div><p class="scene-place">${esc(node.place)}</p><h2>${esc(node.title)}</h2><p class="scene-goal">${esc(node.goal)}</p><button class="primary" data-action="advance">Войти в сцену <span>→</span></button></section>`;
    return;
  }
  if(node.kind==='chapter'){
    $('#speech-panel').hidden=true;$('#characters').innerHTML='';stageIds=[];
    $('#special').innerHTML=`<section class="chapter-interlude"><span class="chapter-roman">${['','I','II','III','IV','V','VI','VII'][node.chapter]}</span><span class="eyebrow">ГЛАВА ${node.chapter}</span><h2>${esc(node.title)}</h2><p>${esc(node.subtitle)}</p><button class="primary" data-action="advance">Продолжить <span>→</span></button></section>`;return;
  }
  if(node.kind==='cg'){
    $('#speech-panel').hidden=true;$('#characters').innerHTML='';stageIds=[];
    if(!meta.cg.includes(node.art)){meta.cg.push(node.art);saveMeta();}
    $('#special').innerHTML='<button class="cg-pause" data-action="advance" aria-label="Продолжить после иллюстрации"><span>Продолжить →</span></button>';return;
  }
  if(!node.frames.length){nextNode();return;}
  state.line=Math.min(state.line,node.frames.length-1);
  const item=node.frames[state.line];const speaker=resolveSpeaker(item.speaker,state,node.chapter);
  if(node.introduction){$('#characters').innerHTML='';stageIds=[];sceneId='';}else stageCharacters(speaker.id,/по связи|сообщение|запись/.test(speaker.aside));
  $('#speaker-row').style.visibility=speaker.name?'visible':'hidden';
  $('#speaker-name').textContent=speaker.name;$('#speaker-aside').textContent=speaker.aside|| (speaker.id&&!stageIds.includes(speaker.id)&&!node.introduction?'в общем разговоре':'');
  $('#speaker-row').style.setProperty('--speaker-color',CHARACTERS[speaker.id]?.color||'#d7bc91');
  const text=$('#dialogue-text');text.classList.toggle('narration',!item.speaker);text.textContent='';fullText=item.text;
  $('#choices').innerHTML='';$('#speech-panel').classList.remove('has-choices');
  $('#speech-hint').textContent=node.choices?'Твой выбор меняет историю':node.introduction?'Вводная сцена · нажми, чтобы продолжить':'Нажми, чтобы продолжить';
  const signature=`${state.node}:${state.line}`;
  if(state._lastLine!==signature){state._lastLine=signature;state.history.push({name:speaker.name||'История',text:item.text});state.history=state.history.slice(-80);}
  if(!settings.speed||window.matchMedia('(prefers-reduced-motion: reduce)').matches){text.textContent=fullText;finishTyping();}
  else {let i=0;typing=true;typeTimer=setInterval(()=>{if(token!==renderToken){clearInterval(typeTimer);return;}i+=2;text.textContent=fullText.slice(0,i);if(i>=fullText.length)finishTyping();},settings.speed);}
  const next=flow[flow.findIndex(n=>n.id===node.id)+1];if(next)preload(next.art||next.bg);
}
function stageCharacters(active,remote=false){
  if(sceneId!==(node.sceneKey||node.id)){sceneId=node.sceneKey||node.id;stageIds=[];}
  const safe=!remote&&active&&CHARACTERS[active]&&active!=='opossum'?active:null;
  if(!stageIds.length){
    const ids=node.frames.map(x=>{const who=resolveSpeaker(x.speaker,state,node.chapter);return /по связи|сообщение|запись/.test(who.aside)?null:who.id;}).filter(x=>x&&CHARACTERS[x]&&x!=='opossum');
    stageIds=[...new Set(ids)].slice(0,2);
    if(!stageIds.length&&node.chapter<6)stageIds=[state.hero];
  }
  if(safe&&!stageIds.includes(safe)){if(stageIds.length<2)stageIds.push(safe);else { /* Другой участник говорит из общего пространства, без смены стоящих спрайтов. */ }}
  $('#characters').innerHTML=stageIds.map((id,i)=>{
    let art=id;
    if(node.chapter>=6&&node.chapter<7&&['kolya','maks'].includes(id))art=id+'-wounded';
    if(node.id==='4.06'&&id==='vera')art='vera-shocked';
    if(['5.02','5.03'].includes(node.id)&&id==='lida')art='lida-guilt';
    return `<img class="character ${stageIds.length===1?'single':i===0?'left':'right'} ${id===active?'speaking':''}" src="${imageUrl(art)}" alt="${esc(displayName(id,node.chapter))}">`;
  }).join('');
}
function finishTyping(){
  clearInterval(typeTimer);typing=false;const el=$('#dialogue-text');if(el)el.textContent=fullText;
  if(node?.choices)renderChoices();else scheduleAuto();
}
function renderChoices(){
  $('#speech-panel').classList.add('has-choices');
  $('#choices').innerHTML=node.choices.map((o,i)=>`<button class="choice" data-action="choice" data-index="${i}" ${o.disabled?'disabled':''}><span class="choice-index">${String(i+1).padStart(2,'0')}</span><span>${esc(o.label)}${o.disabled||o.hint?`<small>${esc(o.disabled||o.hint)}</small>`:''}</span></button>`).join('');
}
function scheduleAuto(){clearTimeout(autoTimer);if(settings.auto&&view==='game'&&!typing&&!modal.open&&node&&!node.kind&&!node.choices)autoTimer=setTimeout(()=>advance(),Math.max(2200,fullText.length*40));}
function advance(){
  if(view!=='game'||modal.open)return;
  if(typing){finishTyping();return;}
  if(node.choices)return;
  if(state.line+1<node.frames.length){state.line++;renderCurrent();}else nextNode();
}
function nextNode(fallback=null){
  const oldFlow=flow,index=oldFlow.findIndex(n=>n.id===state.node),nextFallback=fallback||oldFlow[index+1]?.id;
  flow=buildFlow(state);const now=flow.findIndex(n=>n.id===state.node);
  const next=now>=0?flow[now+1]:flow.find(n=>n.id===nextFallback);
  if(!next){if(state.flags.ending){state.node='finish';renderCurrent();}return;}
  state.node=next.id;state.line=0;sceneId='';renderCurrent();
}
function choose(index){
  if(view!=='game'||!node.choices)return;
  const beforeClues=state.clues.length,oldFlow=flow,idx=flow.findIndex(n=>n.id===node.id),fallback=flow[idx+1]?.id;
  const option=commitChoice(state,node,index);state.history.push({name:'Твой выбор',text:option.label});
  if(state.clues.length>beforeClues)toast(`Новая улика: ${CLUES[state.clues.at(-1)][0]}`);
  telegram?.HapticFeedback?.selectionChanged?.();save();flow=oldFlow;nextNode(fallback);
}
function finish(){
  view='finish';stopTimers();state.complete=true;save();
  if(!meta.endings.includes(node.ending)){meta.endings.push(node.ending);saveMeta();}
  const arts={E1:'24-запечатанная-стена',E2:'22-квартира-эпилог',E3:'25-пульт-гм',E4:'23-мемориал',E5:'21-кафе'};
  const desc={E1:'Город будет жить. Кто-то остался по ту сторону.',E2:'Вы вместе. Но каждое утро немного похоже на вчера.',E3:'Город спасён. Только вспомнить, ради кого, становится всё труднее.',E4:'Некоторые успели выйти. Сообщения от остальных продолжают приходить.',E5:'Сил больше нет. Впервые за всю историю никто не должен уходить.'};
  app.innerHTML=`<section class="screen scenic" style="background-image:url('${imageUrl(arts[node.ending])}')"><div class="screen-content finish"><span class="ending-mark">${node.ending==='E5'?'✧':'◇'}</span><span class="eyebrow">КОНЕЦ ИСТОРИИ · ${meta.endings.length} ИЗ 5 ФИНАЛОВ</span><h1>${esc(node.title)}</h1><p>${esc(desc[node.ending])}</p><button class="primary" data-action="menu">В главное меню</button><button class="secondary" data-action="gallery">Открыть коллекцию</button></div></section>`;
}
function pause(){
  openModal('На паузе',`<p>${esc(displayName(state.hero))} · Глава ${node.chapter}<br>${esc(CHAPTERS[node.chapter][0])}</p><div class="menu-actions"><button class="primary" data-action="close">Продолжить</button><button class="secondary" data-action="saves">Сохранить или загрузить</button><button class="secondary" data-action="notebook">Досье и отношения</button><button class="secondary" data-action="settings">Настройки</button><button class="text-button" data-action="leave">Главное меню</button></div>`);
}
function sceneContext(){
  const index=flow.findIndex(x=>x.id===state.node);
  const info=flow.slice(0,index+1).findLast(x=>x.kind==='scene');
  if(!info)return;
  openModal('Где мы сейчас?',`<span class="eyebrow">${esc(info.time)}</span><h3>${esc(info.title)}</h3><p class="muted">${esc(info.place)}</p>${info.summary.map(text=>`<p>${esc(text)}</p>`).join('')}<div class="divider"></div><p><strong>Сейчас:</strong> ${esc(info.goal)}</p><button class="primary" data-action="close">Понятно, продолжить</button>`);
}
function notebook(){
  if(!state)return;
  const chap=node?.chapter||chapterOf(state.node);
  const known=Object.keys(CHARACTERS).filter(id=>id!==state.hero&&(HEROES.includes(id)||(state.flags.metGirls&&['lida','polina','sasha','katya','vera'].includes(id))||(chap>=4&&id==='valerka')||(chap>=3&&id==='ilya')));
  openModal('Досье',`<span class="eyebrow">ОТНОШЕНИЯ</span>${known.map(id=>`<div class="relationship"><img class="mini-avatar" src="${imageUrl(id)}" alt=""><div class="rel-info">${esc(displayName(id,chap))}<small>${state.partner===id?'Взаимные отношения':id===state.friend?'Близкий союзник':(state.rel[id]||0)<0?'Доверие пошатнулось':(state.rel[id]||0)>=3?'Возникает доверие':'Вы присматриваетесь друг к другу'}</small><div class="rel-meter"><i style="width:${Math.max(5,Math.min(100,((state.rel[id]||0)+2)*10))}%"></i></div></div>${state.partner===id?'<span class="heart">♡</span>':''}</div>`).join('')}<div class="divider"></div><span class="eyebrow">УЛИКИ · ${state.clues.length}</span>${state.clues.length?state.clues.map(id=>`<article class="clue"><span class="clue-mark">◇</span><div><h3>${esc(CLUES[id][0])}</h3><p>${esc(CLUES[id][1])}</p></div></article>`).join(''):'<p class="empty-state">Важные находки будут появляться здесь.<br>Некоторые ответы стоит проверить дважды.</p>'}${chap===7?`<div class="divider"></div><span class="eyebrow">ОБЩИЙ ВЫХОД</span>${happyRequirements(state).map(x=>`<p>${x.met?'✓':'○'} ${esc(x.label)}</p>`).join('')}`:''}`);
}
function history(){openModal('Уже сказано',state?.history?.length?state.history.map(x=>`<article class="history-entry"><b>${esc(x.name)}</b><p>${esc(x.text)}</p></article>`).join(''):'<p class="empty-state">Здесь появятся прочитанные реплики.</p>');setTimeout(()=>modal.scrollTop=modal.scrollHeight,20);}
function showSettings(){
  openModal('Настройки',`<div class="settings-row"><span>Скорость текста</span><div class="segmented">${[[38,'Тише'],[22,'Обычно'],[0,'Сразу']].map(([v,t])=>`<button data-action="speed" data-value="${v}" class="${settings.speed===v?'selected':''}">${t}</button>`).join('')}</div></div><div class="settings-row"><span>Размер текста</span><div class="segmented">${[17,19,22].map(v=>`<button data-action="size" data-value="${v}" class="${settings.size===v?'selected':''}">А${v===22?'а':''}</button>`).join('')}</div></div><div class="settings-row"><span>Атмосферный звук<small>Тихий фон без озвучки реплик</small></span><button class="toggle ${settings.sound?'on':''}" data-action="sound" role="switch" aria-checked="${settings.sound}" aria-label="Атмосферный звук"></button></div><div class="settings-row"><span>Автопереход<small>Выборы всегда остаются за тобой</small></span><button class="toggle ${settings.auto?'on':''}" data-action="auto" role="switch" aria-checked="${settings.auto}" aria-label="Автопереход"></button></div><p>Нажатие завершает печать реплики. Следующее — продолжает историю. На компьютере работают пробел и стрелка вправо.</p>`);
}
function gallery(){
  const cards=Object.values(DATA.assets).filter(a=>a.kind==='cg');
  openModal('Коллекция',`<span class="eyebrow">МГНОВЕНИЯ · ${meta.cg.length} ИЗ 7</span><p>Иллюстрации открываются по ходу истории. Романтические кадры — только в соответствующих отношениях.</p><div class="gallery-grid">${cards.map(a=>{const id=Object.keys(DATA.assets).find(k=>DATA.assets[k]===a),open=meta.cg.includes(id);return `<button class="gallery-card" ${open?`data-action="art" data-id="${id}"`:'disabled'}>${open?`<img src="${encodeURI(a.url)}" loading="lazy" alt="${esc(a.title)}">`:'<div class="locked-art">◇</div>'}<span>${open?esc(a.title):'Ещё не случилось'}</span></button>`;}).join('')}</div><div class="divider"></div><span class="eyebrow">ФИНАЛЫ · ${meta.endings.length} ИЗ 5</span>${['E1','E2','E3','E4','E5'].map((id,i)=>`<div class="ending-list"><span>${meta.endings.includes(id)?'✧':'◇'}</span><div>${meta.endings.includes(id)?esc(DATA.sections[id].title):`Неизвестный финал ${i+1}`}<small>${meta.endings.includes(id)?'Эта история уже была твоей':'Откроется после прохождения'}</small></div></div>`).join('')}`);
}
function saves(){
  openModal('Сохранения',`<p>Автосохранение обновляется после каждой реплики. Эти три слота можно оставить перед важным решением.</p>${[1,2,3].map(i=>{const slot=validateState(readStorage(`gm.slot.${i}`));return `<article class="save-slot"><h3>Слот ${i}${slot?` · ${esc(displayName(slot.hero))}`:''}</h3><p>${slot?`Глава ${chapterOf(slot.node)} · ${new Date(slot.updatedAt).toLocaleString('ru-RU')}`:'Пока пусто'}</p><div class="slot-actions"><button data-action="save-slot" data-id="${i}" ${!state?'disabled':''}>Сохранить</button><button data-action="load-slot" data-id="${i}" ${!slot?'disabled':''}>Загрузить</button></div></article>`;}).join('')}<div class="file-actions"><button class="secondary" data-action="export" ${!state?'disabled':''}>Экспорт файла</button><button class="secondary" data-action="import">Импорт файла</button><input id="import-file" type="file" accept="application/json,.json"></div><p class="codex-note">Ручные слоты хранятся на этом устройстве. Файл сохранения можно перенести. В Telegram доступно облачное автосохранение, если его поддерживает клиент.</p>`);
}
function confirmLoad(slot){openModal('Вернуться к сохранению?',`<p>Текущий момент заменится сохранённым. Другие ручные слоты останутся.</p><div class="modal-actions"><button class="secondary" data-action="saves">Отмена</button><button class="primary" data-action="confirm-load" data-id="${slot}">Загрузить</button></div>`);}
function about(){openModal('Об истории',`<span class="eyebrow">ГМ · ПЕРВЫЙ СЕЗОН</span><p>Четверо суперзлодеев находят пустое хранилище. Пропал ключ от места, откуда люди возвращаются другими. За одной тайной обнаруживается другая — и даже знакомое лицо не доказывает, что перед тобой тот же человек.</p><p>Выбери Колю, Макса, Ваню или Ярика. Доверяй, проверяй, заключай союзы. Романтика необязательна: дружба позволяет добраться до общего счастливого финала.</p><p>Настоящая Валерка сохраняет своё имя. Её копия после раскрытия выбирает имя Валерия. Максу доступны романтические ветки только с девушками.</p><p class="codex-note">Вымышленная история. Все персонажи совершеннолетние. Версия 0.2: семь глав, ключевые развилки и пять концовок. Основные спрайты и несколько особых состояний; полной лицевой анимации пока нет.</p>`);}

async function toggleAudio(){
  if(!settings.sound){if(audioMaster)audioMaster.gain.setTargetAtTime(0,audioContext.currentTime,.4);return;}
  try{
    if(!audioContext){
      audioContext=new (window.AudioContext||window.webkitAudioContext)();audioMaster=audioContext.createGain();audioMaster.gain.value=0;audioMaster.connect(audioContext.destination);
      [110,164.81,220.3,277.18].forEach((freq,i)=>{const osc=audioContext.createOscillator(),g=audioContext.createGain();osc.type='sine';osc.frequency.value=freq;g.gain.value=[.22,.1,.07,.045][i];osc.connect(g).connect(audioMaster);osc.start();const lfo=audioContext.createOscillator(),lg=audioContext.createGain();lfo.frequency.value=.05+i*.017;lg.gain.value=.6;lfo.connect(lg).connect(osc.frequency);lfo.start();});
    }
    await audioContext.resume();audioMaster.gain.setTargetAtTime(.16,audioContext.currentTime,.8);
  }catch{settings.sound=false;toast('Звук недоступен в этом браузере.');}
}
function saveSettings(){writeStorage(SETTINGS,settings);document.documentElement.style.setProperty('--text-size',settings.size+'px');}

document.addEventListener('click',e=>{
  const button=e.target.closest('[data-action]');if(!button||button.disabled)return;
  const action=button.dataset.action,id=button.dataset.id,value=Number(button.dataset.value);
  if(action==='close')closeModal();
  else if(action==='menu'){if(modal.open)modal.close();showMenu();}
  else if(action==='new')showHeroes();
  else if(action==='hero'){selectedHero=id;showHeroes();}
  else if(action==='start')begin();
  else if(action==='confirm-start')startNew();
  else if(action==='continue'){play();toggleAudio();requestGameFullscreen();if(!node.kind)sceneContext();}
  else if(action==='advance')advance();
  else if(action==='choice')choose(Number(button.dataset.index));
  else if(action==='pause')pause();
  else if(action==='leave'){save();modal.close();showMenu();}
  else if(action==='notebook')notebook();
  else if(action==='context')sceneContext();
  else if(action==='history')history();
  else if(action==='settings')showSettings();
  else if(action==='gallery')gallery();
  else if(action==='about')about();
  else if(action==='art')openModal(DATA.assets[id].title,`<img class="art-full" src="${imageUrl(id)}" alt="${esc(DATA.assets[id].title)}">`,true);
  else if(action==='speed'){settings.speed=value;saveSettings();showSettings();}
  else if(action==='size'){settings.size=value;saveSettings();showSettings();}
  else if(action==='sound'){settings.sound=!settings.sound;saveSettings();toggleAudio();showSettings();}
  else if(action==='auto'){settings.auto=!settings.auto;saveSettings();showSettings();}
  else if(action==='saves')saves();
  else if(action==='save-slot'){
    const existing=validateState(readStorage(`gm.slot.${id}`));
    if(existing){openModal('Перезаписать слот?',`<p>Слот ${esc(id)}: ${esc(displayName(existing.hero))}, глава ${chapterOf(existing.node)}.</p><div class="modal-actions"><button class="secondary" data-action="saves">Отмена</button><button class="primary" data-action="confirm-save" data-id="${esc(id)}">Перезаписать</button></div>`);}
    else{save();writeStorage(`gm.slot.${id}`,state);toast('Сохранено');saves();}
  }else if(action==='confirm-save'){save();writeStorage(`gm.slot.${id}`,state);toast('Сохранено');saves();}
  else if(action==='load-slot')confirmLoad(id);
  else if(action==='confirm-load'){const slot=validateState(readStorage(`gm.slot.${id}`));if(slot){state=slot;save();modal.close();play();}}
  else if(action==='export'){
    save();const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`gm-${state.hero}-chapter-${chapterOf(state.node)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }else if(action==='import')$('#import-file')?.click();
  else if(action==='reload')location.reload();
  else if(action==='use-cloud'){if(pendingCloud){state=pendingCloud;writeStorage(KEY,state);pendingCloud=null;modal.close();showMenu();toast('Облачное сохранение загружено');}}
});
document.addEventListener('change',async e=>{
  if(e.target.id!=='import-file')return;const file=e.target.files?.[0];if(!file)return;
  try{if(file.size>1024*1024)throw Error();const imported=validateState(JSON.parse(await file.text()));if(!imported||!buildFlow(imported).some(n=>n.id===imported.node))throw Error();state=imported;save();modal.close();play();toast('Сохранение загружено');}catch{toast('Это не подходящий файл сохранения ГМ.');}
});
document.addEventListener('keydown',e=>{
  if(modal.open||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
  if(view==='game'&&[' ','ArrowRight','Enter'].includes(e.key)){e.preventDefault();advance();}
  else if(view==='game'&&e.key==='Escape')pause();
  else if(view==='game'&&node?.choices&&/^[1-9]$/.test(e.key)){const i=Number(e.key)-1;if(node.choices[i]&&!node.choices[i].disabled)choose(i);}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(state)save();clearTimeout(autoTimer);if(audioMaster)audioMaster.gain.setTargetAtTime(0,audioContext.currentTime,.2);}else{toggleAudio();scheduleAuto();}});
window.addEventListener('pagehide',()=>{if(state)writeStorage(KEY,state);});

function cloudCall(method,...args){return new Promise((resolve,reject)=>{try{cloud[method](...args,(error,result)=>error?reject(error):resolve(result));}catch(e){reject(e);}});}
let pendingCloud=null;
async function syncFromCloud(){
  try{
    const headRaw=await cloudCall('getItem','gm_save_head');if(!headRaw)return;
    const head=JSON.parse(headRaw);if(!Array.isArray(head.keys)||head.keys.length>20||head.keys.some(k=>!/^gm_[a-z0-9_]+$/.test(k)))return;
    const parts=await cloudCall('getItems',head.keys);const parsed=JSON.parse(head.keys.map(k=>parts[k]||'').join(''));
    const candidate=validateState(parsed.state);if(!candidate)return;
    if(!buildFlow(candidate).some(n=>n.id===candidate.node))return;
    if(!state){state=candidate;writeStorage(KEY,state);if(view==='menu')showMenu();}
    else if(candidate.updatedAt>state.updatedAt+1500){pendingCloud=candidate;openModal('Нашлось продолжение',`<p>В Telegram есть более новое сохранение: ${esc(displayName(candidate.hero))}, глава ${chapterOf(candidate.node)}.</p><div class="modal-actions"><button class="secondary" data-action="close">Оставить местное</button><button class="primary" data-action="use-cloud">Загрузить</button></div>`);}
    if(parsed.meta){meta.cg=[...new Set([...meta.cg,...(parsed.meta.cg||[]).filter(id=>DATA.assets[id]?.kind==='cg')])];meta.endings=[...new Set([...meta.endings,...(parsed.meta.endings||[]).filter(id=>/^E[1-5]$/.test(id))])];saveMeta();}
  }catch{ /* Device save remains available. */ }
}
function queueCloudSave(){
  if(!cloud||!state||pendingCloud)return;
  const snapshot=JSON.parse(JSON.stringify(state));delete snapshot.history;delete snapshot._lastLine;
  const payload=JSON.stringify({state:snapshot,meta});
  cloudQueue=cloudQueue.catch(()=>{}).then(async()=>{
    const stamp=Date.now().toString(36),chunks=[];for(let i=0;i<payload.length;i+=3500)chunks.push(payload.slice(i,i+3500));
    if(chunks.length>15)return;
    let old=null;try{old=JSON.parse(await cloudCall('getItem','gm_save_head'));}catch{}
    const keys=chunks.map((_,i)=>`gm_${stamp}_${i}`);
    try{for(let i=0;i<chunks.length;i++)await cloudCall('setItem',keys[i],chunks[i]);await cloudCall('setItem','gm_save_head',JSON.stringify({keys,at:snapshot.updatedAt}));if(old?.keys?.length)await cloudCall('removeItems',old.keys.filter(k=>/^gm_[a-z0-9_]+$/.test(k)));cloudReady=true;}catch{/* Local progress is not discarded on cloud errors. */}
  });
}
let sdkAttached=false;
function initTelegram(){
  const tg=window.Telegram?.WebApp;if(!tg||sdkAttached||!DATA)return;
  if(!tg.initData)return;
  sdkAttached=true;telegram=tg;
  try{tg.ready();tg.expand();tg.setHeaderColor('#10151d');tg.setBackgroundColor('#10151d');tg.disableVerticalSwipes?.();}catch{}
  const safe=()=>{const top=Math.max(tg.safeAreaInset?.top||0,tg.contentSafeAreaInset?.top||0),bottom=tg.safeAreaInset?.bottom||0;document.documentElement.style.setProperty('--safe-top',`max(env(safe-area-inset-top, 0px), ${top}px)`);document.documentElement.style.setProperty('--safe-bottom',`max(env(safe-area-inset-bottom, 0px), ${bottom}px)`);};
  safe();tg.onEvent?.('safeAreaChanged',safe);tg.onEvent?.('contentSafeAreaChanged',safe);
  tg.BackButton?.onClick(()=>{if(modal.open)closeModal();else if(view==='game')pause();else showMenu();});
  if(tg.CloudStorage){cloud=tg.CloudStorage;cloudReady=true;syncFromCloud();if(view==='menu')showMenu();}
}
window.addEventListener('telegram-ready',initTelegram);

async function boot(){
  try{
    const response=await fetch(new URL('./data/story.json',import.meta.url));if(!response.ok)throw Error(`HTTP ${response.status}`);
    DATA=await response.json();configure(DATA);showMenu();initTelegram();
  }catch(error){app.innerHTML=`<section class="error-panel"><span class="eyebrow">НЕ УДАЛОСЬ ОТКРЫТЬ ИСТОРИЮ</span><h1>Дверь пока закрыта</h1><p>Проверь подключение и попробуй снова. Сохранения на устройстве останутся.</p><button class="primary" data-action="reload">Повторить</button></section>`;console.error(error);}
}
boot();
