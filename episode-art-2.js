export const NEXT_EPISODES = [
 {art:'31-запись-без-лица',node:'1.04',title:'Камера стирает лицо',chapter:1,batch:2},
 {art:'32-лида-переписывает-договор',node:'2.private-scene1',title:'Лида — допиши нижние кварталы',chapter:2,batch:2,flags:{private1:'lida'}},
 {art:'33-валерка-боится-памяти',node:'2.private-scene1',title:'Валерка — часы и провалы',chapter:2,batch:2,flags:{private1:'vera'}},
 {art:'34-катя-пароль-в-эфире',node:'2.private-scene1',title:'Катя — не верь одному голосу',chapter:2,batch:2,flags:{private1:'katya'}},
 {art:'35-полина-проверка-доверия',node:'2.private-scene1',title:'Полина — просьба допускает отказ',chapter:2,batch:2,flags:{private1:'polina'}},
 {art:'36-саша-граница-иллюзии',node:'2.private-scene1',title:'Саша — спросить без обмана',chapter:2,batch:2,flags:{private1:'sasha'}},
 {art:'37-полина-тайная-сделка',node:'3.07',title:'Полина — предательство по имени',chapter:3,batch:2},
 {art:'38-ваня-показывает-ключ',node:'3.08',title:'Ваня — ключ был у меня',chapter:3,batch:2},
 {art:'39-предательство-перед-своими',node:'4.04',title:'Катя и Саша узнают сделку',chapter:4,batch:2},
 {art:'40-правила-вместо-прощения',node:'5.05',title:'Троица — работать рядом не значит простить',chapter:5,batch:2},
 {art:'41-пустой-город-час',node:'6.01',title:'Коля и Макс — час без людей',chapter:6,batch:2},
 {art:'42-коля-ледяной-узел',node:'6.03',title:'Испытание Коли — один удар',chapter:6,batch:2},
 {art:'43-макс-выход-за-стеклом',node:'6.04',title:'Испытание Макса — знакомый голос',chapter:6,batch:2},
 {art:'44-десятая-связь',node:'6.07',title:'Десять добровольных решений',chapter:6,batch:2},
 {art:'45-будущий-ярик-рассказывает',node:'7.02',title:'Будущий Ярик — один правильный час',chapter:7,batch:2},
];
export function nextIllustration(n,s){
 const id=n.id;
 if(id==='1.04'||id.startsWith('1.04.'))return NEXT_EPISODES[0].art;
 if(id==='2.private-scene1'||id==='2.private-scene2'){
  const person=s.flags[id.endsWith('1')?'private1':'private2']||(id.endsWith('1')?'lida':'katya');
  return {lida:NEXT_EPISODES[1].art,vera:NEXT_EPISODES[2].art,katya:NEXT_EPISODES[3].art,polina:NEXT_EPISODES[4].art,sasha:NEXT_EPISODES[5].art}[person]||null;
 }
 if(id==='3.07'||id==='3.polina')return NEXT_EPISODES[6].art;
 if(id==='3.08')return NEXT_EPISODES[7].art;
 if(id==='4.04'||id==='4.hidden')return NEXT_EPISODES[8].art;
 if(id==='5.05')return NEXT_EPISODES[9].art;
 if(id==='6.01')return NEXT_EPISODES[10].art;
 if(['6.03','6.kolya','6.kolya-reaction'].includes(id))return NEXT_EPISODES[11].art;
 if(id==='6.04'||id==='6.maks')return NEXT_EPISODES[12].art;
 if(id==='6.07')return NEXT_EPISODES[13].art;
 if(id==='7.02')return NEXT_EPISODES[14].art;
 return null;
}
export function extendEpisodeFrames(n,s){
 const f=(speaker,text)=>({speaker,text});
 if((n.id==='2.private-scene1'||n.id==='2.private-scene2')&&(s.flags[n.id.endsWith('1')?'private1':'private2']||(n.id.endsWith('1')?'lida':'katya'))==='sasha'){
  return [...n.frames,
   f('Герой','Если хочешь узнать мою реакцию, спроси меня. Не показывай мне человека, которому я доверяю.'),
   f('Саша','А если на меня настоящую ты так не посмотришь?'),
   f('Герой','Тогда хотя бы будешь знать, на кого я смотрю.'),
   f('Саша','Звучит просто. У меня с простыми способами плохо.'),
   f('Герой','Сложный у тебя уже не сработал.'),
   f('Саша','Ладно. Начнём заново. Меня зовут Саша. Я хочу поговорить с тобой без чужого лица.'),
   f('Герой','Вот теперь я слушаю.'),
  ];
 }
 if(n.id==='6.03')return [...n.frames,
  f('','В ледяном узле проходит тонкая трещина. Где-то за стеной Макс резко втягивает воздух. Коля отводит руку, ещё не прикоснувшись к поверхности.'),
  f('Коля','Он меня слышит?'),
  f('Голос','Пока связан с тобой — да. Разорви связь, и он перестанет мешать.'),
  f('Коля','Очень удобное слово. «Мешать».'),
  f('Голос','Ты всю жизнь хотел, чтобы он уступил.'),
  f('Коля','Я хотел, чтобы он признал, что проиграл. Это не одно и то же.'),
 ];
 return n.frames;
}
