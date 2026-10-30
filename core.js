import { soloLife, soloYears, pairLife, realmForState } from './gm-realms.js';
import { paceFlow } from './pacing.js';
export const VERSION = 1;
export const HEROES = ['kolya', 'maks', 'vanya', 'yarik'];
export const CHARACTERS = {
  kolya: {name:'Коля', power:'Лёд', color:'#a5d6ed', description:'Упрямство крепче льда. Привык идти первым — и редко признаёт, что ему страшно.'},
  maks: {name:'Макс', power:'Живые корни', color:'#b5cf9d', description:'Прячет тревогу в шутках. Всё ещё хочет победить Колю, даже когда приходится спасать его.'},
  vanya: {name:'Ваня', power:'Тени', color:'#c9adeb', description:'Знает запасной выход из каждой комнаты. На этот раз придётся решить, стоит ли уходить.'},
  yarik: {name:'Ярик', power:'Электричество', color:'#e8ad91', description:'Умеет чинить почти всё. Но людей и собственные ошибки нельзя исправить одним разрядом.'},
  lida: {name:'Лида', power:'Капитан Армения', color:'#ecad8b'},
  polina: {name:'Полина', power:'Гравитация', color:'#9ec6a4'},
  sasha: {name:'Саша', power:'Иллюзии', color:'#d6badf'},
  katya: {name:'Катя', power:'Звуковые волны', color:'#a0dcd9'},
  vera: {name:'Валерия', power:'Возврат секунд', color:'#e7d2a0'},
  valerka: {name:'Валерка', power:'Вернувшаяся из ГМ', color:'#cabfa9'},
  'yarik-future': {name:'Будущий Ярик', power:'Человек за голосом', color:'#d39c9c'},
  ilya: {name:'Илья', power:'Свидетель', color:'#c9c5aa'},
  opossum: {name:'Опоссум', power:'Единственный', color:'#ddbac3'},
};
export const GIRLS = ['lida','polina','sasha','katya','vera'];
export const CHAPTERS = [null,
  ['Кто выключил город','У каждого из вас есть причина молчать.'],
  ['Две стороны одной лжи','Союзы заключают до того, как узнают цену.'],
  ['Предатель среди своих','Самые убедительные улики тоже умеют лгать.'],
  ['Кого ты оставишь','Иногда страшнее не дверь, а тот, кто её закрывает.'],
  ['По ту сторону обещаний','Одинаковые лица. Разные жизни.'],
  ['Пока ты держишь','Один город. Один час. Двое, которые не умеют доверять.'],
  ['Последняя дверь','Не каждому будущему нужно случиться.'],
];
export const CLUES = {
  note: ['Записка хранителя','«ГМ нельзя открывать снова». Надпись продавлена на бумаге.'],
  thread: ['Золотая нить','Осталась под ногтями хранителя. Часть чужого рукава.'],
  access: ['Чужой допуск','Хранилище открыли служебным ключом Ярика.'],
  route: ['Маршрут к вокзалу','Старое помещение потребляет электричество, словно в нём шесть этажей.'],
  video: ['Человек без лица','На записи пропало лицо, но слышен звон кольца.'],
  blood: ['Кровь вне повтора','Область вернулась назад, пятно на рукаве осталось.'],
  voices: ['Два голоса','Пленница и посредник говорят из разных помещений.'],
  contracts: ['Архив экспедиций','Подпись одного из «добровольцев» появилась после его исчезновения.'],
  watches: ['Не та рука','На старом фото Валерка пишет правой. Рядом с Лидой — левой.'],
  ten: ['Десять связей','Для закрытия ГМ нужны отдельные добровольные решения всех носителей.'],
  ring: ['Кольцо из будущего','На старой записи — Ярик. Кольцо на его руке принадлежит Ване.'],
};
const PAIRS = [
 ['kolya','lida'],['maks','lida'],['vanya','lida'],['yarik','lida'],
 ['kolya','polina'],['maks','polina'],['vanya','polina'],['yarik','polina'],
 ['kolya','sasha'],['maks','sasha'],['vanya','sasha'],['yarik','sasha'],
 ['kolya','katya'],['maks','katya'],['vanya','katya'],['yarik','katya'],
 ['kolya','vera'],['maks','vera'],['vanya','vera'],['yarik','vera'],
 ['kolya','vanya'],['kolya','yarik'],['vanya','yarik'],
];
let DATA;
export function configure(data) { DATA=data; }
export function romanceId(a,b) { const i=PAIRS.findIndex(p=>p.includes(a)&&p.includes(b)); return i<0?null:`R${String(i+1).padStart(2,'0')}`; }
export function canRomance(a,b) { return Boolean(a!==b && romanceId(a,b)); }
export function displayName(id, chapter=7) { return id==='vera'&&chapter<5?'Валерка':CHARACTERS[id]?.name||id; }
// Идентификаторы вводных и иллюстраций не обязаны начинаться с номера главы.
export function chapterForNode(s,id=s.node){
 const node=buildFlow(s).find(n=>n.id===id);
 if(node)return node.chapter;
 return Number(String(id).match(/(?:chapter-|(?:^|\.))([1-7])(?:[.-]|$)/)?.[1])||7;
}
export function newState(hero) {
  if(!HEROES.includes(hero)) throw Error('Неизвестный герой');
  return {v:VERSION,hero,node:'chapter-1',line:0,flags:{},rel:Object.fromEntries(Object.keys(CHARACTERS).map(x=>[x,HEROES.includes(x)?2:0])),clues:[],partner:null,interest:null,friend:HEROES.find(x=>x!==hero),visited:[],history:[],updatedAt:Date.now(),complete:false};
}
export function validateState(value) {
  if(!value||value.v!==VERSION||!HEROES.includes(value.hero)||typeof value.node!=='string'||value.node.length>100) return null;
  const s=newState(value.hero);
  s.node=value.node;s.line=Math.max(0,Math.min(300,Math.floor(Number(value.line)||0)));
  for(const [k,v] of Object.entries(value.flags||{}))if(/^[a-zA-Z0-9_-]{1,45}$/.test(k)&&['string','number','boolean'].includes(typeof v))s.flags[k]=typeof v==='string'?v.slice(0,120):v;
  for(const id of Object.keys(s.rel))s.rel[id]=Math.max(-10,Math.min(30,Number(value.rel?.[id])||0));
  s.clues=[...new Set((Array.isArray(value.clues)?value.clues:[]).filter(x=>CLUES[x]))];
  for(const key of ['partner','interest']) s[key]=canRomance(s.hero,value[key])?value[key]:null;
  s.friend=CHARACTERS[value.friend]&&value.friend!==s.hero?value.friend:s.friend;
  s.visited=Array.isArray(value.visited)?value.visited.filter(x=>typeof x==='string'&&x.length<100).slice(-500):[];
  s.history=Array.isArray(value.history)?value.history.filter(x=>x&&typeof x.text==='string'&&typeof x.name==='string').map(x=>({name:x.name.slice(0,60),text:x.text.slice(0,1600)})).slice(-80):[];
  s.updatedAt=Number(value.updatedAt)||0;s.complete=Boolean(value.complete);
  return s;
}
export function happyRequirements(s) {
  return [
    ['Обе Валерки свободны',Boolean(s.flags.protectBoth)],
    ['Коля и Макс вернулись вместе без усиления',s.flags.exit==='together'],
    ['Лида передала признание',Boolean(s.flags.transparent)],
    ['Ваня и Ярик приняли ответственность',Boolean(s.flags.accountable)],
    ['Ваня отверг чужое будущее',Boolean(s.flags.reality)],
    ['Механизм ГМ подтверждён уликами',s.clues.includes('ten')&&s.clues.length>=6],
  ].map(([label,met])=>({label,met}));
}
export function applyEffects(s,e={}) {
  Object.assign(s.flags,e.flags||{});
  for(const [id,delta] of Object.entries(e.rel||{}))s.rel[id]=(s.rel[id]||0)+delta;
  for(const clue of e.clues||[])if(CLUES[clue]&&!s.clues.includes(clue))s.clues.push(clue);
  for(const key of ['partner','interest','friend'])if(Object.hasOwn(e,key))s[key]=e[key];
  if(s.partner&&!canRomance(s.hero,s.partner))s.partner=null;
  s.updatedAt=Date.now();return s;
}
export function enterNode(s,node) {
  if(!s.visited.includes(node.id)){applyEffects(s,node.enter);s.visited.push(node.id);}
}
export function commitChoice(s,node,index) {
  const option=node.choices?.[index];
  if(!option||option.disabled)throw Error('Выбор недоступен');
  applyEffects(s,option.effects);
  return option;
}
const frame=(speaker,text)=>({speaker,text});
const narration=text=>frame('',text);
// Только постановочные действия; редакторские условия и названия веток не показываем.
const VISIBLE_ACTIONS = /^(За окном гаснут|Удар снизу|На бумаге продавленная|Изображение рвётся|Журнал показывает|Пауза\. Ваня|Лида на секунду|Экран гаснет|Чашка соскальзывает|Она уменьшает щит|Звук исчезает|Запись с Валеркой|Катя выкладывает|Лида смотрит|Она кладёт ручку|Лида дописывает|Герой возвращает часы|Она ставит запись|В воздухе перед|Герой ловит браслет|Она пытается прикрутить|Полина отдаёт|Распыление\. Двери|«Обе стороны|Опоссум останавливается|Коля спускается|Илья вздрагивает|Входит Саша|Ярик замолкает|Повтор записи|Макс кладёт договор|На дне ящика|Связь на большом экране|Лида выключает звук|Ваня отправляет координаты|Вокзальные часы|Заброшенный вокзал|Катя показывает список|Охрана преграждает|Щит ударяет|Ваня перенаправляет|Катя слушает потолок|Возвращение в зал|Обломок падает|Катя смотрит на свою запись|Ярик касается кольца|Две Валерки видят|Обе оборачиваются|Копия смотрит|Структура начинает|Лида прикрывает эвакуацию|Потолок падает|Пункт помощи|Нет ответа|Слышны три|Настоящая Валерка держит|Записка:|Полминуты повторяются|Они пересекают границу|Опоссум возвращается|Кокон оказывается|Другой город|Корни растут|03:17|Макс получает записку|За стеклом пункт|Пауза\. За стеклом|Архив\. Несколько|Коля опускает|Запись экспедиции|Связь с настоящим|Изображение стабилизируется|Ваня достаёт переписку|Будущий Ярик тянется)/;
function parse(raw) {
  return raw.split('\n').flatMap(line=>{
    const action=line.match(/^\[([^\n]+)\]$/);
    if(action&&VISIBLE_ACTIONS.test(action[1]))return [narration(action[1])];
    const m=line.match(/^([А-ЯЁ][^:\n]{0,75}):\s+(.+)$/);
    return m&&!m[1].startsWith('ВЫБОР')?[frame(m[1],m[2])]:[];
  });
}
function rawPart(raw,{after,before,head=false}={}) {
  if(after){const i=raw.indexOf(after);raw=i<0?'':raw.slice(i+after.length);}
  if(before){const i=raw.indexOf(before);if(i>=0)raw=raw.slice(0,i);}
  if(head){const i=raw.indexOf('ВЫБОР');if(i>=0)raw=raw.slice(0,i);}
  return raw;
}
const read=(id,opts={})=>parse(rawPart(DATA.sections[id]?.raw||'',opts));
function personal(s,phase) {
  const id=romanceId(s.hero,s.interest||s.partner);
  if(!id)return [];
  const raw=DATA.sections[id]?.raw||'';
  const pieces=raw.split(/^### /m).slice(1);
  if(phase===2&&id==='R22'&&s.flags.yarikStayed)return [frame('Коля','Ты тогда остался. Не думай, что я не заметил.'),frame('Ярик','Это не отменяет того, что я открыл доступ.'),frame('Коля','Не отменяет. Но и ты не отменяй всё хорошее, что сделал. Я хочу тебя живым.')];
  return parse((pieces[phase]||'').split('\n[Если ')[0]);
}
export function resolveSpeaker(raw,s,chapter) {
  let id=null,name=raw.split(',')[0];
  const ally=s.partner||s.interest||s.friend;
  if(['Герой','ОСТАЮЩИЙСЯ','Остающийся'].includes(name))id=s.hero;
  else if(['Спутник','Партнёр','Близкий','БЛИЗКИЙ','Друг','Пленник'].includes(name))id=ally;
  else if(name==='Копия'||name==='Валерия')id='vera';
  else if(name==='Настоящая Валерка')id='valerka';
  else if(name==='Валерка')id=chapter<5?'vera':'valerka';
  else id=Object.keys(CHARACTERS).find(x=>CHARACTERS[x].name===name)||null;
  if(raw.includes('голос из записи')&&chapter<4)return {id:null,name:'Голос из записи',aside:'запись'};
  if(name==='Посредник')id=null;
  if(id)name=displayName(id,chapter);
  const aside=raw.includes(',')?raw.split(',').slice(1).join(',').trim():'';
  return {id,name:name||'',aside:/по связи|мысль|сообщение|запись|тихо|за кадром/.test(aside)?aside:''};
}
export function buildFlow(s) {
  if(!DATA)throw Error('Сценарий не загружен');
  const f=[],F=s.flags;
  let chapter=1,bg='01-башня-ночь';
  const add=(id,frames=[],opts={})=>{if(opts.bg)bg=opts.bg;const n={id,chapter,bg,frames,...opts};f.push(n);return n;};
  const scene=(id,opts={})=>{if(opts.bg)bg=opts.bg;return add(id,opts.frames||read(id,opts),{title:DATA.sections[id]?.title||'',...opts});};
  const choose=(id,prompt,choices)=>add(id,[narration(prompt)],{choices});
  const option=(label,effects={},hint='',disabled='')=>({label,effects,hint,disabled});
  const note=(id,text,opts={})=>add(id,[narration(text)],opts);
  const start=n=>{chapter=n;add(`chapter-${n}`,[],{kind:'chapter',title:CHAPTERS[n][0],subtitle:CHAPTERS[n][1]});};
  const reaction=(id,entries)=>add(`${id}.reaction`,entries);
  const cg=(id,condition=true)=>{if(condition){const raw=DATA.cgSections[id.slice(0,2)]?.raw||'';const dialogue=parse(raw.split('\n').filter(line=>! /^(Место|Выбор|Текст|ВЫБОР):/.test(line)).join('\n'));add(`cg.${id}`,dialogue,{illustration:id,title:DATA.cgSections[id.slice(0,2)]?.title});}};
  start(1);
  bg=s.hero==='kolya'?'27-лифт':s.hero==='maks'?'02-лестница-башни':'04-служебный-коридор';
  const names={kolya:'Коля',maks:'Макс',vanya:'Ваня',yarik:'Ярик'};
  const introRaw=DATA.sections['1.01'].raw;
  const intro=rawPart(introRaw,{after:`[Выбран ${names[s.hero]}.`}).split('[Выбран ')[0];
  add('1.01',read('1.01').length?parse(intro):[],{title:'Четыре входа'});
  scene('1.02',{bg:'01-башня-ночь',head:true});
  choose('1.02.choice','Снизу доносится удар. Что ты сделаешь?',[
    option('Первым вниз',{flags:{first:'rush'},rel:{kolya:1}},'Увидеть следы раньше остальных'),
    option('Проверить, кто что скрывает',{flags:{first:'watch'},clues:['access']},'Замечать детали'),
    option('Удержать лестницу',{flags:{first:'hold'},rel:{yarik:1,maks:1}},'Позаботиться о пути назад'),
  ]);
  reaction('1.02',F.first==='rush'?read('1.02',{after:'[Первым вниз.]',before:'[Проверить остальных.]'}):F.first==='watch'?read('1.02',{after:'[Проверить остальных.]',before:'[Удержать лестницу.]'}):read('1.02',{after:'[Удержать лестницу.]'}));
  scene('1.03',{bg:'03-лаборатория',frames:[narration('Под башней оказывается лаборатория. Хранитель лежит у открытого сейфа. Он не дышит.'),...read('1.03',{before:'[Ваня-протагонист:'}).filter(x=>s.hero!=='vanya'||x.text!=='Если бы знал, не стоял бы здесь.'),...(s.hero==='vanya'?read('1.03',{after:'[Ваня-протагонист:',head:true}):[])],enter:{clues:['note']}});
  const inspection=[['body','Осмотреть тело','Тело.','Крепление.','thread'],['vault','Проверить крепление ключа','Крепление.','Пульт.','access'],['panel','Изучить пульт','Пульт.',null,'route']];
  choose('1.03.choice','Времени хватит на два объекта. С чего начать?',inspection.map(([key,label,,,clue])=>option(label,{flags:{inspect:key},clues:[clue]})));
  const inspect=inspection.find(x=>x[0]===F.inspect)||inspection[0];
  add('1.03.inspect',read('1.03',{after:`[${inspect[2]}]`,...(inspect[3]?{before:`[${inspect[3]}]`}:{})}));
  choose('1.03.second','Что осмотреть следующим?',inspection.filter(x=>x[0]!==F.inspect).map(([key,label,,,clue])=>option(label,{flags:{inspect2:key},clues:[clue]})));
  const inspect2=inspection.find(x=>x[0]===F.inspect2)||inspection.find(x=>x[0]!==F.inspect)||inspection[1];
  add('1.03.inspect2',read('1.03',{after:`[${inspect2[2]}]`,...(inspect2[3]?{before:`[${inspect2[3]}]`}:{})}));
  scene('1.04',{head:true,enter:{clues:['video']}});
  choose('1.04.choice','Ваня признаёт, что получил доступ к хранилищу. Как ответишь?',[
    option('Покажи оригинал переписки',{flags:{vanyaResponse:'messages'},rel:{vanya:1}}),
    option('Сначала перенесём хранителя',{flags:{vanyaResponse:'body'},rel:{maks:1}}),
    option('До объяснений ты остаёшься здесь',{flags:{vanyaResponse:'arrest'},rel:{vanya:-1}}),
  ]);
  const responses=read('1.04',{after:'ВЫБОР:'});
  reaction('1.04',responses.slice(F.vanyaResponse==='body'?2:F.vanyaResponse==='arrest'?5:0,F.vanyaResponse==='body'?5:F.vanyaResponse==='arrest'?9:2));
  choose('1.05.friend','С кем остаться наедине после обыска?',HEROES.filter(x=>x!==s.hero).map(id=>option(displayName(id),{friend:id,rel:{[id]:1}},'Личный разговор')));
  const friendName=names[s.friend]||'Коля';
  const friendRaw=DATA.sections['1.05'].raw;
  const friendBlock=friendRaw.split(/\n(?=\[)/).find(x=>x.startsWith(`[${friendName};`)||x.startsWith(`[${friendName}.`));
  add('1.05',parse(friendBlock||''),{bg:'04-служебный-коридор'});
  scene('1.06',{bg:'03-лаборатория'});
  start(2);
  scene('2.01',{bg:'01-башня-ночь',head:true});
  choose('2.01.choice','Лида требует вернуть ключ. На чём настоять?',[
    option('Нужен договор, а не ультиматум',{rel:{lida:1},flags:{lidaContract:true}}),
    option('Пусть Валерка сама расскажет о крови',{rel:{vera:1},flags:{listenVera:true}}),
    option('Сначала убери щит',{rel:{lida:-1},flags:{confrontLida:true}}),
  ]);
  scene('2.02',{enter:{flags:{metGirls:true}}});
  const privateScenes={lida:'2.03',vera:'2.04',katya:'2.05',polina:'2.06',sasha:'2.07'};
  const privateBg={lida:'01-башня-ночь',vera:'04-служебный-коридор',katya:'05-радиостанция',polina:'06-мастерская',sasha:'10-улица-день'};
  choose('2.private1','До аукциона есть время поговорить наедине. К кому подойти?',GIRLS.map(id=>option(displayName(id,2),{flags:{private1:id},rel:{[id]:2}})));
  const p1=F.private1||'lida';scene(privateScenes[p1],{id:'2.private-scene1',bg:privateBg[p1],frames:read(privateScenes[p1],{head:true})});
  choose('2.private2','Есть время ещё для одного разговора.',GIRLS.filter(id=>id!==F.private1).map(id=>option(displayName(id,2),{flags:{private2:id},rel:{[id]:2}})));
  const p2=F.private2||'katya';scene(privateScenes[p2],{id:'2.private-scene2',bg:privateBg[p2],frames:read(privateScenes[p2],{head:true})});
  add('2.password',[frame('Катя','На случай, если кто-то заговорит моим голосом: «Чайник кипит». Ответишь: «А кружек нет». Запомни пару целиком.')],{bg:'05-радиостанция',enter:{flags:{password:true}}});
  scene('2.08',{bg:'09-аукцион',head:true});
  choose('2.08.choice','Двери захлопываются. Способности пропадают. Что важнее сейчас?',[
    option('Вытащить человека рядом',{flags:{auction:'person'},rel:{[s.friend]:1}},'Подставить плечо'),
    option('Сохранить накопитель',{flags:{auction:'data'},clues:['route']},'Не потерять след'),
    option('Отключить распыление',{flags:{auction:'vent'},rel:{katya:1}},'Дать остальным время'),
  ]);
  reaction('2.08',F.auction==='data'?read('2.08',{after:'[Накопитель.]',before:'[Распыление.]'}):F.auction==='vent'?read('2.08',{after:'[Распыление.]'}):read('2.08',{after:'[Спасение.]',before:'[Накопитель.]'}));
  scene('2.09',{bg:'04-служебный-коридор',enter:{clues:['blood']}});
  scene('2.10',{bg:'10-улица-день',before:'[Ваня-протагонист.'});
  if(s.hero==='vanya')add('2.10.vanya',read('2.10',{after:'[Ваня-протагонист.',before:'ВЫБОР ВАНИ:'}));
  choose('2.10.choice',s.hero==='vanya'?'Посредник нарушил договор. Предупредить остальных?':'Телефон Вани остался у лестницы. Что сделать с перепиской?',[
    option(s.hero==='vanya'?'Отправить предупреждение':'Сохранить переписку целиком',{flags:{warning:true},rel:{vanya:1}}),
    option(s.hero==='vanya'?'Сохранить канал и найти посредника':'Пока оставить находку при себе',{flags:{warning:false},rel:{vanya:-1}}),
  ]);
  note('2.last','На экране появляется новая строка: «Следующий этап — вокзал».');
  start(3);bg='10-улица-день';cg('07-коля-опоссум');scene('3.01');
  scene('3.02',{bg:'11-пункт-помощи'});scene('3.03',{head:true});
  choose('3.witness','Кому доверить Илью?',[
    option('Он сам выберет, кто будет на допросе',{flags:{witness:'free'},rel:{katya:1}},'Независимое свидетельство'),
    option('Пусть его охраняет Лида',{flags:{witness:'lida'},rel:{lida:1}},'Безопасность под контролем'),
    option('Записать показания с Катей',{flags:{witness:'radio'},rel:{katya:1}},'Сначала спросить согласие'),
  ]);
  choose('3.investigation1','Улики ведут в три места. Куда идти первым?',[
    option('Радиостанция',{flags:{investigate1:'voices'},clues:['voices']}),
    option('Архив экспедиций',{flags:{investigate1:'contracts'},clues:['contracts']}),
    option('Старая квартира Валерки',{flags:{investigate1:'watches'},clues:['watches']}),
  ]);
  const investigations={voices:['3.04','05-радиостанция'],contracts:['3.05','08-архив'],watches:['3.06','07-квартира-валерки']};
  const i1=investigations[F.investigate1]||investigations.voices;
  scene(i1[0],{id:'3.investigation-scene1',bg:i1[1],frames:read(i1[0],{head:true})});
  choose('3.investigation2','Второй маршрут. На третий отправится союзник.',Object.keys(investigations).filter(x=>x!==F.investigate1).map(x=>option({voices:'Радиостанция',contracts:'Архив экспедиций',watches:'Квартира Валерки'}[x],{flags:{investigate2:x},clues:[x]})));
  const i2=investigations[F.investigate2]||investigations.contracts;
  scene(i2[0],{id:'3.investigation-scene2',bg:i2[1],frames:read(i2[0],{head:true})});
  scene('3.07',{bg:'06-мастерская',head:true});
  choose('3.polina','Полина готова выдать Сашу ради безопасности Кати. Что ответить?',[
    option('Скажи им сама',{flags:{polinaPlan:'confess'},rel:{polina:1}},'Право услышать правду'),
    option('Я сам расскажу',{flags:{polinaPlan:'expose'},rel:{sasha:1,polina:-1}}),
    option('Пока оставим это между нами',{flags:{polinaPlan:'hide'},rel:{polina:1,sasha:-1}},'Это ещё может всплыть'),
  ]);
  scene('3.08',{bg:'05-радиостанция'});
  const possible=Object.keys(CHARACTERS).filter(x=>canRomance(s.hero,x));
  choose('3.interest','Перед вокзалом. С кем хочется поговорить не только о деле?',[
    ...possible.map(id=>option(displayName(id,3),{interest:id,rel:{[id]:1}},'Попробовать сблизиться')),
    option('Остаться с другом',{interest:null},'Романтика необязательна'),
  ]);
  if(s.interest)add('3.personal',personal(s,0),{bg:'20-крыша'});
  else add('3.personal',read(s.hero==='maks'?'F03':'F01',{before:'[Перед финалом.]'}),{bg:'20-крыша'});

  scene('3.09',{bg:'12-вокзал-целый',frames:read('3.09',{after:'[Индивидуальная сцена',before:'[Ваня отправляет'})});
  start(4);scene('4.01',{bg:'12-вокзал-целый'});scene('4.02',{head:true});
  choose('4.fight','Два союза начали бой. Кому помочь?',[
    option('Защитить эвакуационную лестницу',{flags:{battle:'stairs'},rel:{lida:1}}),
    option('Вывести раненых',{flags:{battle:'people'},rel:{katya:1}}),
    option('Остановить Колю и Макса',{flags:{battle:'rivals'},rel:{kolya:1,maks:1}}),
  ]);
  reaction('4.fight',F.battle==='rivals'?read('4.02',{after:'[Остановить спор.]',before:'[Катя слушает'}):[narration('Ты уходишь с линии удара и помогаешь тем, кто не успел добраться до лестницы. Над залом трещат опоры.')]);
  note('4.tunnel','Обломки отрезают служебный тоннель. На минуту здесь остаются только двое.',{bg:'13-тоннель-вокзала'});
  if(s.interest){
    choose('4.romance','Сказать сейчас то, что откладывали?',[
      option('Я хочу быть с тобой',{flags:{romance:'yes'},partner:s.interest},'Начать отношения',(s.rel[s.interest]||0)<2?'Пока не хватает взаимного доверия':''),
      option('Не будем торопиться',{flags:{romance:'later'}},'Оставить возможность поговорить позже'),
      option('Ты мне дорог как друг',{flags:{romance:'friend'},partner:null},'Дружба — полноценный выбор'),
    ]);
    if(F.romance==='yes'){
      add('4.personal',personal(s,1));
      choose('4.touch','Можно остаться близко, не обещая больше, чем хочется.',[
        option('Спросить, можно ли поцеловать',{flags:{kiss:true}},'Только после взаимного согласия'),
        option('Просто побыть рядом',{flags:{kiss:false}},'Отношения сохраняются'),
      ]);
      add('4.consent',[frame(displayName(s.partner||s.interest,4),F.kiss?'Да. Я хочу.': 'Хорошо. Побудь рядом ещё немного.')]);
      const r=romanceId(s.hero,s.partner);
      cg('01-ваня-ярик',r==='R23');cg('02-коля-лида',r==='R01');cg('03-макс-саша',r==='R10');
    }else add('4.personal',[frame(displayName(s.interest,4),F.romance==='friend'?'Спасибо за прямой ответ. Мне нужно немного времени, но я не собираюсь исчезать.':'Хорошо. Не будем считать это обещанием. Когда будем готовы — поговорим.')]);
  }else note('4.personal','Вы договариваетесь искать друг друга, если связь пропадёт. Без признаний — просто обещание не оставить человека одного.');
  scene('4.04',{bg:'12-вокзал-целый',before:'[Если герой знал'});
  if(F.polinaPlan==='hide')add('4.hidden',read('4.04',{after:'[Если герой знал',before:'[Если Полина раньше'}));
  scene('4.05',{bg:'15-дверь-гм'});
  scene('4.06',{head:true,enter:{flags:{twinsRevealed:true}}});
  choose('4.twins','Перед вами две Валерки. Как поступить?',[
    option('У каждой право на свою жизнь',{flags:{protectBoth:true},rel:{vera:2,valerka:2}},'Помочь обеим выйти'),
    option('Мне нужно время, но выйдем все',{flags:{protectBoth:true},rel:{vera:1}}),
    option('Забрать только настоящую',{flags:{protectBoth:false},rel:{vera:-3}},'Ты отталкиваешь копию'),
  ]);
  scene('4.07',{bg:'14-вокзал-руины',before:'[Основная ветка.]'});
  if(s.hero==='yarik'){
    choose('4.yarik','Ваня зовёт в проход. Коля и Макс держат рушащуюся арку.',[
      option('Остаться и помочь эвакуации',{flags:{yarikStayed:true},rel:{kolya:2,maks:2}}),
      option('Уйти с Ваней к пульту',{flags:{yarikStayed:false},rel:{kolya:-1,maks:-1}},'Ты оставляешь их держать арку'),
    ]);
  }
  add('4.departure',F.yarikStayed?read('4.07',{after:'[Если игрок — Ярик, выбор остаться.]',before:'[Импульс'}):read('4.07',{after:'[Основная ветка.]',before:'[Если игрок — Ярик'}));
  note('4.collapse','Коля замораживает арку. Макс стягивает её корнями. Ярик исчезает из виду. Связь обрывается, и потолок падает.');
  start(5);scene('5.01',{bg:'11-пункт-помощи',before:'[Если играем Колей/Максом'});
  note('5.pov','Снаружи Катя пытается услышать тех, кто остался под завалом. У дверей ждёт единственный огромный опоссум.');
  scene('5.02',{head:true});
  choose('5.lida','Лида признаёт, что знала о подмене шесть лет.',[
    option('Сохранить признание для расследования',{flags:{transparent:true},rel:{valerka:1}}),
    option('Отстранить её, но сохранить запись',{flags:{transparent:true},rel:{lida:-1}}),
    option('Пока оставить всё в тайне',{flags:{transparent:false},rel:{lida:1}}),
  ]);
  scene('5.03',{enter:{flags:{renamed:true}}});cg('05-две-валерки');
  if(!F.protectBoth){
    choose('5.rescue','Копия всё ещё у прохода. Вернуться за ней?',[
      option('Да. Она не виновата в своём появлении',{flags:{protectBoth:true},rel:{vera:1}}),
      option('Нет. Я уже решил',{flags:{protectBoth:false}},'Общий добровольный отказ будет невозможен'),
    ]);
  }
  if(s.partner==='vera'){
    add('5.vera',[frame('Валерия','Я не хочу быть половиной выбора между нами. Наши разговоры были моими. И я хочу знать, помнишь ли ты это.')]);
    choose('5.relationship','Что ответить Валерии?',[
      option('Я выбираю отношения с тобой',{rel:{vera:1}}),
      option('Мне нужна пауза',{partner:null,flags:{romancePaused:true}}),
      option('Продолжать было бы нечестно',{partner:null,flags:{romanceEnded:true}}),
    ]);
  }
  scene('5.05');cg('04-полина-катя');
  scene('5.06',{bg:'16-комната-повторов'});scene('5.07',{before:'ВЫБОР ДЛЯ'});
  choose('5.accountability','Теперь нельзя исправить прошлое удобной формулировкой.',[
    option('Признать всё, без оправданий',{flags:{accountable:true},rel:{vanya:1,yarik:1}}),
    option('Во всём виноват посредник',{flags:{accountable:false}},'Свои решения останутся непризнанными'),
  ]);
  scene('5.08',{bg:'14-вокзал-руины'});
  start(6);note('6.pov','На время этой главы ты управляешь Колей и Максом по очереди. Их выборы определят, выйдут ли они вместе.',{bg:'17-пустой-город'});
  scene('6.01');scene('6.02',{head:true});
  choose('6.invites','Коле и Максу предлагают разные выходы. Поделиться приглашениями?',[
    option('Показать друг другу',{flags:{invitations:'share'},rel:{kolya:1,maks:1}}),
    option('Проверить условный сигнал',{flags:{invitations:'check'},clues:['voices']},'«Чайник кипит» — «А кружек нет»'),
    option('Скрыть приглашения',{flags:{invitations:'hide'}},'У каждого появится свой план'),
  ]);
  scene('6.03',{bg:'18-квартира-гм',head:true});
  choose('6.kolya','Выбор Коли. Разбить узел, который удерживает Макса?',[
    option('Отказаться',{flags:{kolyaChoice:'refuse'}}),
    option('Притвориться согласным',{flags:{kolyaChoice:'trick'}}),
    option('Нанести один удар',{flags:{kolyaChoice:'hurt'}},'Максу станет больно'),
  ]);
  const kMarkers={refuse:['Коля, отказ:','Коля, обман:'],trick:['Коля, обман:','Коля, предательство:'],hurt:['Коля, предательство:',null]};
  const km=kMarkers[F.kolyaChoice]||kMarkers.refuse;
  const kr=DATA.sections['6.03'].raw;let kp=kr.slice(kr.indexOf(km[0]));if(km[1])kp=kp.split(km[1])[0];add('6.kolya-reaction',parse(kp));
  scene('6.04',{bg:'28-переход-с-окном',head:true});
  choose('6.maks','Выбор Макса. За стеклом будто бы настоящий выход.',[
    option('Вернуться за Колей',{flags:{maksChoice:'return'}}),
    option('Оставить корневой якорь и проверить',{flags:{maksChoice:'anchor'}}),
    option('Попытаться уйти одному',{flags:{maksChoice:'leave'}},'Остаться вместе станет труднее'),
  ]);
  scene('6.05',{bg:'20-крыша',frames:[...read('6.05',{before:'[Честный отказ.]'}),...read('6.05',{after:F.kolyaChoice==='hurt'?'[Признание попытки предать.]':'[Честный отказ.]',before:F.kolyaChoice==='hurt'?'[Макс признаёт':'[Признание попытки предать.]'}),...(F.maksChoice==='leave'?read('6.05',{after:'[Макс признаёт',before:'[При взаимной честности.]'}):[]),...read('6.05',{after:'[При взаимной честности.]'})]});
  scene('6.06',{bg:'19-архив-гм'});scene('6.07',{enter:{clues:['ten']}});
  scene('6.08',{bg:'15-дверь-гм',head:true});
  choose('6.exit','Корни нашли путь наружу. Но силы не проходят целиком.',[
    option('Вдвоём. Силы отпускаем',{flags:{exit:'together'}},'Оба вернутся ослабленными'),
    option('Сначала я',{flags:{exit:'alone'}},'Второй останется в ГМ'),
    option('Забрать всё',{flags:{exit:'power'}},'Широкая щель выпустит кого-то ещё'),
  ]);
  if(F.exit==='power')choose('6.power-confirm','В щели появляется чужой силуэт. Ещё можно отпустить усиление.',[
    option('Отпустить. Вывести обоих',{flags:{exit:'together'}}),
    option('Удержать силу',{flags:{exit:'power'}},'Это лишит вас общего безопасного выхода'),
  ]);
  note('6.return',F.exit==='alone'?'Один выходит первым. Когда оборачивается, вместо второго видит закрывающийся проход.': 'Они выходят вдвоём. На этот раз Макс возвращается за Колей. Оба живы, хотя ещё не умеют говорить об этом без шуток.',{bg:'11-пункт-помощи'});
  scene('6.09',{enter:{clues:['ring']}});
  start(7);scene('7.01',{bg:'15-дверь-гм'});scene('7.02',{bg:'25-пульт-гм'});cg('06-илья-будущий-ярик');
  scene('7.03');
  if(s.hero==='maks'&&s.partner==='sasha')add('7.false-home',[
    narration('Будущий Ярик поворачивает один из экранов. На нём — утро в квартире, которого у Макса и Саши ещё никогда не было. Изображение повторяет движение занавески с одинаковой точностью.'),
    frame('Саша','Это ты придумал или он вытащил у тебя из головы?'),
    frame('Макс','Я бы хотя бы цветок не забыл полить.'),
    frame('Будущий Ярик','Достаточно согласиться. Всё остальное можно настроить.'),
    frame('Саша','Включая то, захотим ли мы уйти?'),
    frame('Макс','Сначала отвечай на вопросы. Квартиру пока не бронируем.'),
    narration('Экран продолжает показывать утро. Они всё ещё стоят перед пультом; ни один из возможных финалов пока не наступил.'),
  ],{illustration:'13-финал-макс-саша-петля',bg:'25-пульт-гм',title:'Дом, который предлагают вместо ответа'});
  scene('7.04',{bg:'19-архив-гм',before:'[Игра показывает'});
  if(!F.transparent)choose('7.reveal','У Кати всё ещё нет признания Лиды. Передать запись сейчас?',[
    option('Да. Больше никаких вырезанных страниц',{flags:{transparent:true}}),
    option('Сохранить прежнее решение',{flags:{transparent:false}}),
  ]);
  if(!F.accountable)choose('7.confess','Осталась возможность сказать правду перед всеми.',[
    option('Признать собственную ответственность',{flags:{accountable:true}}),
    option('Не возвращаться к этому',{flags:{accountable:false}}),
  ]);
  scene('7.05',{bg:'15-дверь-гм',before:'[Ярик, оставшийся'});
  if(s.partner)add('7.personal',personal({...s,interest:s.partner},2),{bg:'13-тоннель-вокзала'});
  else add('7.personal',[frame(displayName(s.friend,7),'Я хочу, чтобы ты вышел. Не ради награды. Потому что после всего нам ещё нужно научиться разговаривать в обычный день.')],{bg:'13-тоннель-вокзала'});
  scene('7.07',{bg:'26-финальный-разлом'});
  choose('7.reality','Будущий Ярик обещает вернуть всё, что было потеряно.',[
    option('Мы не будем жить вместо ваших мёртвых',{flags:{reality:true}},'Отказаться от навязанного будущего'),
    option('А если дать ему ещё одну попытку?',{flags:{reality:false}},'Он уже много раз пробовал'),
  ]);
  const req=happyRequirements(s);const missing=req.filter(x=>!x.met);
  choose('7.ending','Последняя дверь. Как ты закончишь эту историю?',[
    option('Запереть изнутри',{flags:{ending:'E1'}},'Один человек останется по ту сторону'),
    option('Уйти в отдельный мир',{flags:{ending:'E2'}},'Только вы вдвоём',!s.partner?'Нужны взаимные отношения и согласие партнёра':''),
    option('Забрать управление',{flags:{ending:'E3'}},'Каждое исправление заберёт воспоминание'),
    option('Отступить без закрытия',{flags:{ending:'E4'}},'Спасти успевших выйти'),
    option('Всем отказаться от сил',{flags:{ending:'E5'}},'Каждый решает за себя',missing.length?missing.map(x=>x.label).join(' · '):''),
  ]);
  if(F.ending){
    const end=F.ending;
    if(end==='E1'){
      scene('E1',{bg:'15-дверь-гм',frames:[...read('E1',{before:'[Если оставлен пленник'}),...read('E1',{after:'[Дверь сужается.]',before:'[Год спустя.'})]});
      f.push(...soloLife(s));
      add('E1.last',read('E1',{after:'[Год спустя.'}),{bg:'24-запечатанная-стена'});
      f.push(...soloYears(s));
    }else if(end==='E2'){
      add('E2.consent',[frame(displayName(s.partner,7),'Это мой выбор. Я хочу уйти с тобой. Но не говори потом, что мы не понимали, кого оставляем.')],{bg:'15-дверь-гм'});
      f.push(...pairLife(s));
    }else if(end==='E3')scene('E3',{bg:'25-пульт-гм'});
    else if(end==='E4'){
      scene('E4',{bg:'26-финальный-разлом',before:'[Годы спустя.'});
      add('E4.last',read('E4',{after:'[Годы спустя.'}),{bg:'23-мемориал'});
    }else if(end==='E5'){
      scene('E5',{bg:'26-финальный-разлом'});
      scene('E5.1',{bg:'21-кафе',head:true});
      choose('E5.seat','На этот раз можно выбрать просто место за столом.',[
        ...(s.partner?[option('Сесть рядом с любимым человеком',{flags:{seat:'love'}})]:[]),
        option('Сесть рядом с другом',{flags:{seat:'friend'}}),
        option('Сдвинуть столы для всех',{flags:{seat:'all'}}),
      ]);
      const lastRaw=DATA.sections['E5.1'].raw;
      const label=F.seat==='love'?'[Роман.]':F.seat==='friend'?'[Дружба.]':'[Общий стол.]';
      add('E5.table',parse(lastRaw.slice(lastRaw.indexOf(label)).split(/\n\[/)[0]||''));
      if(!s.partner)add('E5.chat',read('X04'),{bg:'22-квартира-эпилог'});
      note('E5.last','Сегодня можно было никуда не спешить.',{bg:'21-кафе'});
    }
    add('finish',[],{kind:'finish',ending:end,title:realmForState(s)?.title||DATA.sections[end]?.title});
  }
  return paceFlow(f,s);
}
