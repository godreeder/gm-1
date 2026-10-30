import { REALMS } from './realms-data.js';
const NAMES={kolya:'Коля',maks:'Макс',vanya:'Ваня',yarik:'Ярик',lida:'Лида',polina:'Полина',sasha:'Саша',katya:'Катя',vera:'Валерия'};
const narr=text=>({speaker:'',text});
const speech=(id,text)=>({speaker:NAMES[id]||id,text});
const sentences=text=>text.match(/[^.!?]+[.!?]+(?:[»”])?|[^.!?]+$/gu)?.map(x=>narr(x.trim())).filter(x=>x.text)||[narr(text)];
export function realmForState(s){
 const cast=s.flags.ending==='E1'?[s.hero]:s.flags.ending==='E2'&&s.partner?[s.hero,s.partner]:[];
 return REALMS.find(w=>w.cast.length===cast.length&&w.cast.every(id=>cast.includes(id)))||null;
}
const heroNotes={kolya:'Он всё ещё спорит с тем, что не может заставить ответить. Только теперь замечает, когда называет победой отсутствие возражений.',maks:'Он по-прежнему шутит, когда становится страшно. Здесь слишком много времени, чтобы услышать, что остаётся после шутки.',vanya:'Он знает, как исчезнуть из любой комнаты. Здесь впервые не остаётся комнаты, в которую можно было бы вернуться незаметно.',yarik:'Он умеет поддерживать работу системы. Здесь приходится каждый день вспоминать, что исправность не означает, что человек внутри не одинок.'};
const speakers={
 'kolya-lida':['kolya','lida','lida','kolya'],
 'maks-polina':['maks','polina','maks','maks'],
 'maks-katya':['maks','katya','katya','maks'],
 'vanya-polina':['vanya','polina','vanya','vanya'],
 'yarik-polina':['polina','yarik','yarik','polina'],
};
function quote(w,index,s){
 if(w.cast.length===1){
  const other=w.tone==='evil'?{vanya:'Пленница',kolya:'Житель ледяного города'}:{vanya:'Тень',yarik:'Диспетчер, запись',kolya:'Герой, мысль',maks:'Герой, мысль'};
  return speech(index===1?other[s.hero]:s.hero,w.quotes[index]);
 }
 const ids=(w.tone==='evil'?null:speakers[w.cast.join('-')])||[w.cast[0],w.cast[1],w.cast[0],w.cast[1]];
 return speech(ids[index],w.quotes[index]);
}
function context(w,id,phase,frames,options={}){
 const time=['Первые недели','Несколько месяцев спустя','Первый год внутри ГМ','Годы спустя'][phase];
 const title=[w.title,'Цена привычного мира','То, что нельзя отложить','То, что осталось жить'][phase];
 const bg=w.cast.length===1&&w.cast[0]==='yarik'?'12-вокзал-целый':'17-пустой-город';
 const base={chapter:7,bg,realmArt:w.art,realmStage:true,place:w.place,sceneTitle:w.title};
 return [
  {...base,id:id+'.arrival',kind:'scene',title,time,goal:['Увидеть, какой стала жизнь после закрытия двери.','Понять, чем место оплачивает ваше завтра.','Выбрать цену, с которой придётся жить дальше.','Увидеть последствия прожитых лет.'][phase],summary:frames.filter(f=>!f.speaker).map(f=>f.text),frames:[]},
  {...base,id,frames,...options},
 ];
}
function choice(w,id,s){
 const solo=w.cast.length===1;
 return {id,chapter:7,bg:'17-пустой-город',realmArt:w.art,realmStage:true,place:w.place,sceneTitle:w.title,
  frames:[narr(w.tone==='evil'?'Выход из ГМ не закрывает возможность остановиться. Но сейчас ты выбираешь способ продолжить — уже зная, кому будет причинён вред.':solo?'Это не изменит того, что ты остался внутри. Но изменит жизнь, которую ты здесь проживёшь.':'Вы обсуждаете решение до конца. Мир не позволяет сохранить всё, но цена не даёт права выбирать за второго.')],
  choices:w.choice.map((label,index)=>({label,hint:w.tone==='evil'?'Жертвы не соглашались на эту цену.':solo?'Последствия останутся с тобой.':'Общее решение после разговора.',effects:{flags:{[solo?'gmSoloDecision':'gmPairDecision']:index}},disabled:''})),
 };
}
function phaseThree(w,s,prefix){
 const solo=w.cast.length===1;
 const index=s.flags[solo?'gmSoloDecision':'gmPairDecision']===1?1:0;
 const after=[...sentences(w.outcomes[index])];
 if(w.tone==='evil'){
  after.push(speech(w.cast[0],solo?'Я мог остановиться. Значит, не буду говорить, что выбора не было.':'Мы оба знали, что делаем. Не оставляй мне удобную версию, в которой виноват только один.'));
 }else if(!solo){
  after.unshift(speech(w.cast[1],'Это мой выбор тоже. Не делай из него разрешение решать за меня дальше.'));
  after.push(speech(w.cast[0],'Я останусь рядом с последствиями. Не только с той частью, которую проще оправдать.'));
 }else after.push(speech(s.hero,'Я не буду каждый день притворяться, что за меня это решило место.'));
 return [choice(w,prefix+'.decision',s),{id:prefix+'.consequence',chapter:7,bg:'17-пустой-город',realmArt:w.art,realmStage:true,place:w.place,sceneTitle:w.title,frames:after}];
}
export function soloLife(s){
 const w=realmForState(s);if(!w||w.cast.length!==1)return [];
 return [
  ...context(w,'E1.realm.begin',0,[...sentences(w.opening),quote(w,0,s),narr(w.tone==='evil'?'Сначала он объясняет себе каждый приказ необходимостью. Потом замечает, что объяснение больше не требуется, и не воспринимает это как повод остановиться.':heroNotes[s.hero]),narr('Сначала всё ещё хочется назвать это временным устройством. Потом приходится выбрать место, куда ставить единственную чашку.')]),
  ...context(w,'E1.realm.months',1,[...sentences(w.discovery),quote(w,1,s),narr('Он начинает замечать изменения, которым раньше не дал бы названия: другую паузу перед сном, другую причину отложить работу, другой способ не ждать ответа каждую минуту.'),speech(s.hero,'Если я всё ещё живу здесь, придётся отвечать не только за ту ночь. За следующий день — тоже.')]),
  ...context(w,'E1.realm.price',2,[...sentences(w.crisis),quote(w,2,s)]),
  ...phaseThree(w,s,'E1.realm'),
 ];
}
export function soloYears(s){
 const w=realmForState(s);if(!w||w.cast.length!==1)return [];
 return context(w,'E1.realm.years',3,[
  narr('Снаружи годовщина давно закончилась. Внутри ГМ прошло ещё несколько зим. Он узнаёт их не по календарю, а по тому, с какой мыслью теперь начинает утро.'),
  ...sentences(w.last),quote(w,3,s),
  narr(w.tone==='evil'?'Жертва, которой он когда-то спас город, не оправдала того, что он сделал после. Внутри ГМ жизнь продолжилась — и у этой жизни появились жертвы.':'Жизнь не закончилась в момент прощания. Это не отменило потери. Только заставило прожить всё, что раньше помещалось в одно героическое решение.'),
 ]);
}
export function pairLife(s){
 const w=realmForState(s);if(!w||w.cast.length!==2)return [];
 return [
  ...context(w,'E2',0,[...sentences(w.opening),quote(w,0,s),speech(w.cast[1],w.tone==='evil'?'Я вижу, что происходит. Не прячь от меня записи и не притворяйся, что я остался в неведении.':'Я здесь по своему решению. Но нам придётся ещё много раз спрашивать друг друга, как жить после него.'),narr('Первые привычки появляются раньше, чем уверенность. У каждого остаётся право не назвать этот мир домом только потому, что второй уже пытается.')]),
  ...context(w,'E2.realm.months',1,[...sentences(w.discovery),quote(w,1,s),speech(w.cast[0],'Нужно говорить об этом до того, как мы начнём считать чужое молчание согласием.'),narr('Некоторые разговоры повторяются. Другие не удаётся повторить даже извинением. Они узнают разницу не сразу.')]),
  ...context(w,'E2.realm.price',2,[...sentences(w.crisis),quote(w,2,s)]),
  ...phaseThree(w,s,'E2.realm'),
  ...context(w,'E2.realm.years',3,[...sentences(w.last),quote(w,3,s),narr('За пределами этого мира по-прежнему есть люди, перед которыми они не смогли ответить. Никакая близость внутри не стала доказательством, что однажды было правильно их оставить.'),narr(w.tone==='evil'?'Они не потеряли способность любить друг друга. Они решили, что этого достаточно, чтобы не считаться с остальными. Именно поэтому их близость никого не спасла.':'И всё же завтрашнее решение нельзя принять вместо другого. Перед тем как погасить свет, они снова спрашивают, остаться ли рядом. Ответ всё ещё должен прозвучать вслух.')]),
 ];
}
export function realmArt(n){return n.realmArt||null;}
export function realmEndingArt(s){return realmForState(s)?.art||null;}
