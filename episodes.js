const $=s=>document.querySelector(s);
let episodes=[],selected=0,line=0;
function draw(){
 const e=episodes[selected],f=e.frames[line];
 $('#art').style.backgroundImage=`url("${encodeURI(e.url)}")`;
 $('#chapter').textContent=`ГЛАВА ${e.chapter} · СЦЕНА ${selected+1} ИЗ ${episodes.length}`;
 $('#title').textContent=e.title;$('#place').textContent=e.place;
 $('#speaker').textContent=f.name+(f.aside?` · ${f.aside}`:'');$('#speaker').style.color=f.color;
 $('#text').textContent=f.text;$('#text').classList.toggle('narration',!f.name);$('#text').scrollTop=0;
 $('#counter').textContent=`Реплика ${line+1} из ${e.frames.length}`;
 $('#previous').disabled=line===0;$('#next').textContent=line===e.frames.length-1?'С начала ↻':'Следующая реплика →';
 $('#episode-select').value=String(selected);
 $('#episode-detail').textContent=`${e.frames.length} последовательных окон текста на одном арте · ${e.place}`;
 for(const b of document.querySelectorAll('[data-episode]'))b.classList.toggle('active',Number(b.dataset.episode)===selected);
}
function next(){line=(line+1)%episodes[selected].frames.length;draw();}
function choose(index){selected=index;line=0;draw();}
$('#next').addEventListener('click',next);$('#tap').addEventListener('click',next);
$('#previous').addEventListener('click',()=>{if(line>0){line--;draw();}});
$('#episode-select').addEventListener('change',e=>choose(Number(e.target.value)));
$('#episode-list').addEventListener('click',e=>{const b=e.target.closest('[data-episode]');if(b)choose(Number(b.dataset.episode));});
document.addEventListener('keydown',e=>{if(['SELECT','BUTTON'].includes(e.target.tagName))return;if(e.key==='ArrowRight'||e.key===' '){e.preventDefault();next();}else if(e.key==='ArrowLeft'&&line>0){line--;draw();}});
try{
 const set=new URLSearchParams(location.search).get('set');const secondSet=set==='2',realms=set==='gm',thirdSet=set==='3';
 const response=await fetch(thirdSet?'data/episodes-3.json':realms?'data/gm-realms-preview.json':secondSet?'data/episodes-2.json':'data/episodes.json');if(!response.ok)throw Error('Не удалось загрузить диалоги');episodes=await response.json();
 if(realms){document.querySelector('.intro').textContent='27 разных жизней внутри ГМ: 16 злых и 11 трагичных. Четыре временных этапа на каждом арте. Здесь показан первый вариант последствий; оба решения доступны в игре. Сохранения не меняются.';document.querySelector('aside h1').textContent='По ту сторону жизни.';}
 if(thirdSet){document.querySelector('.intro').textContent='15 новых артов и 8 ранних иллюстраций, которые теперь стали разговорами. Листай последовательные реплики поверх кадра; сюжетные выборы находятся в игре. Сохранения не меняются.';}
 document.title=thirdSet?'ГМ · Ещё больше сюжетных сцен':realms?'ГМ · 27 разных жизней':secondSet?'ГМ · Ещё 15 сцен':'ГМ · 15 живых сцен';
 episodes.forEach((e,i)=>{const option=document.createElement('option');option.value=i;option.textContent=`${String(i+1).padStart(2,'0')} · ${e.title}`;$('#episode-select').append(option);const b=document.createElement('button');b.dataset.episode=i;b.textContent=`${String(i+1).padStart(2,'0')} · ${e.title} · ${e.frames.length} окон`;$('#episode-list').append(b);});draw();
}catch(e){$('#text').textContent=e.message;$('#next').disabled=true;}
