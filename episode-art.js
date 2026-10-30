import { NEXT_EPISODES, nextIllustration } from './episode-art-2.js';
// Арт держится под всем разговором, его выборами и реакцией, а не отдельной заставкой.
export const EPISODES = [
 {art:'16-четверо-за-картой',node:'1.02',title:'Четверо делят город',chapter:1},
 {art:'17-лаборатория-хранителя',node:'1.03',title:'У пустого сейфа',chapter:1},
 {art:'18-радио-два-голоса',node:'3.investigation-scene1',title:'Катя и Ярик — два голоса',chapter:3,flags:{investigate1:'voices'}},
 {art:'19-завтрак-под-щитом',node:'2.01',title:'Лида и Валерка — условия',chapter:2},
 {art:'20-троица-против-лиды',node:'2.02',title:'Катя, Полина и Саша входят',chapter:2},
 {art:'21-аукцион-ловушка',node:'2.08',title:'Аукцион захлопывается',chapter:2},
 {art:'22-илья-свидетель',node:'3.02',title:'Илья узнаёт Сашу',chapter:3},
 {art:'23-архив-подписи',node:'3.investigation-scene1',title:'Макс и Саша — подпись после смерти',chapter:3,flags:{investigate1:'contracts'}},
 {art:'24-квартира-валерки',node:'3.investigation-scene1',title:'Лида, Валерка и старый альбом',chapter:3,flags:{investigate1:'watches'}},
 {art:'25-лида-полина-бой',node:'4.02',title:'Щит против гравитации',chapter:4},
 {art:'26-две-валерки-встреча',node:'4.06',title:'У двери — одно лицо на двоих',chapter:4},
 {art:'27-признание-лиды',node:'5.02',title:'Шесть лет молчания',chapter:5},
 {art:'28-ваня-ярик-повтор',node:'5.06',title:'Три рации и один повтор',chapter:5},
 {art:'29-коля-макс-крыша',node:'6.05',title:'На крыше — сказать правду',chapter:6},
 {art:'30-эвакуация-города',node:'E4',title:'Последний мост',chapter:7,flags:{ending:'E4',exit:'together'}},
];
export function episodeIllustration(n,s){
 const next=nextIllustration(n,s);if(next)return next;
 const id=n.id;
 if(id==='1.02'||id.startsWith('1.02.'))return EPISODES[0].art;
 if(id==='1.03'||id.startsWith('1.03.'))return EPISODES[1].art;
 if(id==='2.01'||id.startsWith('2.01.'))return EPISODES[3].art;
 if(id==='2.02')return EPISODES[4].art;
 if(id==='2.08'||id.startsWith('2.08.'))return EPISODES[5].art;
 if(['3.02','3.03','3.witness'].includes(id))return EPISODES[6].art;
 if(id==='3.investigation-scene1'||id==='3.investigation-scene2'){
  const key=s.flags[id.endsWith('1')?'investigate1':'investigate2']||(id.endsWith('1')?'voices':'contracts');
  return {voices:EPISODES[2].art,contracts:EPISODES[7].art,watches:EPISODES[8].art}[key]||null;
 }
 if(id==='4.02'||id==='4.fight'||id==='4.fight.reaction')return EPISODES[9].art;
 if(id==='4.06'||id==='4.twins')return EPISODES[10].art;
 if(id==='5.02'||id==='5.lida')return EPISODES[11].art;
 if(['5.06','5.07','5.accountability'].includes(id))return EPISODES[12].art;
 if(id==='6.05')return EPISODES[13].art;
 if(id==='E4')return EPISODES[14].art;
 return null;
}
