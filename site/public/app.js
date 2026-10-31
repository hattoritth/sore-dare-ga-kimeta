/* Client presentation and interaction. Shared state is always server-authoritative. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),shell=$('shell'),params=new URLSearchParams(location.search);
 let view=params.get('view')==='display'?'display':params.get('mode')==='solo'?'solo':params.get('mode')==='group'?'group':'home';
 let scene,artModel,soloGame=null,state=null,offset=0,everJoined=false,failedRequests=0,prologueIndex=0,dialogueRound=null,dialogueAt=0,dialogueOpen=false;
 const prologueLines=[['あなたの心の声','……ここは、どこだろう。'],['案内人','ようこそ。ここは、AIが動かす未来の街です。'],['案内人','仕事が増え、暮らしは便利になりました。でも、街のすべてが数字に映るわけではありません。'],['案内人','この街の未来を、誰が決めるのでしょう。']];
 const voices={ヒカリ:{line:'みんなの暮らしを思い浮かべてみて。',human:'うん、一緒に考えてくれてありがとう。',ai:'わかった、予測を頼りに進めるね。'},ソラ:{line:'街のこれからに関わる選択だね。',human:'いいね。人の視点も大事にしよう。',ai:'了解。データをもとに進めてみよう。'},ナギ:{line:'どちらにも、守りたいものがあるね。',human:'そうだね。暮らしから考えてみよう。',ai:'わかった。効率を確かめて進めるよ。'},ミドリ:{line:'少し先の未来も、想像してみて。',human:'ありがとう。未来も見ながら進めよう。',ai:'了解。今のデータから考えてみるね。'}};
 shell.dataset.view=view;
  const faceColors={ヒカリ:['#bc7d8c','#df9aa2'],ソラ:['#4c799a','#8bb4cf'],ナギ:['#a47a46','#e3b97c'],ミドリ:['#387a63','#87b89b']};
 const portraits={
 ヒカリ:{hair:'#704d52',back:'#c98c96',suit:'#dcb19d',shirt:'#fff1dc',cut:'M46 86 Q40 18 90 17 Q142 19 134 91 L125 164 L54 164Z',bang:'M54 67 Q55 22 88 23 Q129 23 128 67 Q112 58 103 43 Q86 65 54 67Z',detail:'<circle cx="130" cy="65" r="5" fill="#f4d18d"/>'},
 ソラ:{hair:'#354f62',back:'#91b5bd',suit:'#4f7181',shirt:'#f4eee0',cut:'M48 91 Q42 21 90 21 Q138 23 133 91 L125 112 L55 112Z',bang:'M53 65 Q53 24 89 25 Q129 23 128 67 Q108 60 98 43 Q82 61 53 65Z',detail:'<path d="M80 145 L90 156 L100 145" fill="#d6b06c"/>'},
 ナギ:{hair:'#5b4c39',back:'#d3ba93',suit:'#ac805a',shirt:'#fff1d7',cut:'M48 91 Q43 19 91 20 Q140 24 132 94 L121 118 L55 118Z',bang:'M52 67 Q50 24 91 25 Q126 25 128 67 Q106 53 94 47 Q75 63 52 67Z',detail:'<path d="M67 144 l-9 22 M113 144 l9 22" stroke="#d9bb8a" stroke-width="5"/>'},
 ミドリ:{hair:'#364e42',back:'#a5c5a3',suit:'#5d8466',shirt:'#f5edda',cut:'M44 90 Q42 17 91 18 Q139 18 136 99 L130 146 L50 146Z',bang:'M52 65 Q50 22 89 22 Q130 22 130 67 Q113 61 99 43 Q80 62 52 65Z',detail:'<path d="M129 52 q17 -16 14 -1 q-3 10 -14 8" fill="#abc47e"/>'}
 };
 function portrait(name){const a=portraits[name]||portraits.ソラ;return `<svg viewBox="0 0 180 220" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="portraitBg" x2="1" y2="1"><stop stop-color="#f4ead9"/><stop offset="1" stop-color="${a.back}"/></linearGradient></defs><rect width="180" height="220" rx="65" fill="url(#portraitBg)"/><circle cx="141" cy="36" r="18" fill="#fff7e5" opacity=".36"/><path d="${a.cut}" fill="${a.hair}"/><path d="M27 220 Q28 156 64 140 L90 152 L116 140 Q152 156 153 220Z" fill="${a.suit}"/><path d="M72 137 L72 151 Q90 170 108 151 L108 137" fill="#ddb298"/><path d="M61 66 Q61 34 90 34 Q119 34 119 66 L119 94 Q117 128 90 136 Q63 128 61 94Z" fill="#f2c9aa"/><path d="${a.bang}" fill="${a.hair}"/><path d="M63 75 Q57 72 58 84 Q59 92 63 92 M117 75 Q123 72 122 84 Q121 92 117 92" fill="#efc19f"/><ellipse cx="78" cy="84" rx="2.8" ry="4.5" fill="#304a46"/><ellipse cx="102" cy="84" rx="2.8" ry="4.5" fill="#304a46"/><path d="M74 74 Q78 71 82 73 M98 73 Q102 71 106 74" stroke="#765d53" fill="none" stroke-width="2" stroke-linecap="round"/><path d="M88 84 q-2 9 2 9" stroke="#d69d84" fill="none" stroke-linecap="round"/><path class="mouth-neutral" d="M84 105 Q90 108 96 105" stroke="#ae6d68" stroke-width="2" fill="none" stroke-linecap="round"/><path class="mouth-warm" d="M82 104 Q90 114 98 104" stroke="#ae6d68" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M69 145 L90 165 L111 145 L105 180 L75 180Z" fill="${a.shirt}"/>${a.detail}<circle cx="90" cy="171" r="3" fill="#d1b77d"/></svg>`;}
 const hiddenNames={trust:'信頼',fairness:'公正',resilience:'持続性'};
 const clamp=x=>Math.min(100,Math.max(0,Number(x)||0));
 function initArt(){
  artModel=new window.F5City.CityModel('M');
  artModel.paused=false;artModel.year=1;
  scene=new window.F5CityScene($('townCanvas'),artModel);
  scene.setArtMode('illustrated');scene.reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  scene.resetView();
  let last=performance.now(),drawn=0;
  function run(ts){const dt=Math.min((ts-last)/1000,.12);last=ts;if(ts-drawn>40){try{scene.render(dt);}catch(err){console.error('city draw:',err);return;}drawn=ts;}requestAnimationFrame(run);}
  requestAnimationFrame(run);
  window.addEventListener('resize',()=>{scene.lastLayout='';scene.layout();});
 }
 function syncArt(s){
  if(!artModel||!s)return;
  if(s.phase==='waiting'&&Object.keys(s.built||{}).length===0&&artModel.sites.some(x=>x.state==='done')){artModel.reset('M');scene.buildCache();}
  artModel.year=1+Math.min(8,s.round||0);artModel.t=(s.round||0)*90+Math.max(0,(EngineNow()- (s.endsAt||0) + 23000)/1000);
  Object.entries(s.built||{}).forEach(([id,current])=>{const site=artModel.site(id);if(site&&site.current!==current){site.current=current;site.state='done';site.from=current;site.choice=current;site.level=3;scene.buildCache();}});
 }
 function EngineNow(){return Date.now()+offset;}
 function show(id,on){$(id).hidden=!on;}
 function renderHud(s){if(!s)return;for(const [k,v] of Object.entries(s.public)){const el=document.querySelector(`[data-stat="${k}"]`);if(!el)continue;const n=String(Math.round(v)),value=el.querySelector('strong');el.querySelector('i').style.width=clamp(v)+'%';if(value.textContent!==n){value.textContent=n;value.classList.remove('stat-changed');void value.offsetWidth;value.classList.add('stat-changed');}}}
 function progressLabel(i){return ['第一','第二','第三','第四','第五','第六','第七'][i]||'次';}
 function clock(ms){const secs=Math.max(0,Math.ceil(ms/1000));return `${String(Math.floor(secs/60)).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}`;}
 function renderQuestion(s){
  if(!s?.episode)return;
  const e=s.episode;
  if(dialogueRound!==s.round){dialogueRound=s.round;dialogueAt=Date.now();dialogueOpen=!!s.hasVoted;}
  if(s.hasVoted||Date.now()-dialogueAt>=3000||(view==='group'&&s.endsAt-EngineNow()<=12000))dialogueOpen=true;
  const voice=voices[e.agent]||voices.ソラ;
  if($('agentPortrait').dataset.agent!==e.agent){$('agentPortrait').dataset.agent=e.agent;$('agentPortrait').innerHTML=portrait(e.agent);}
  $('agentPortrait').dataset.mood=s.hasVoted?'warm':'neutral';
  $('agentLine').textContent=s.hasVoted?(s.myVote==='ai'?voice.ai:voice.human):voice.line;
  show('decisionOptions',dialogueOpen);show('dialogueSkip',!dialogueOpen);
  $('progressLabel').textContent=progressLabel(s.round)+'の決定';
  $('countdown').textContent=clock((s.endsAt||0)-EngineNow());
  $('agentName').textContent=e.agent;$('agentRole').textContent=e.role;
  const c=faceColors[e.agent]||faceColors.ソラ;
  $('agentPortrait').style.setProperty('--agent-dark',c[0]);$('agentPortrait').style.setProperty('--agent-light',c[1]);
  $('questionTitle').textContent=e.heading;$('questionHint').textContent=e.hint;
  $('humanText').textContent=e.human;$('aiText').textContent=e.ai;
  for(const b of document.querySelectorAll('[data-vote]')){
   b.disabled=false;b.setAttribute('aria-pressed',String(s.myVote===b.dataset.vote));
  }
  $('voteFeedback').textContent=s.hasVoted?'あなたの判断を受け取りました。':view==='solo'?'自分の判断で、街の未来が変わる。':'あなたなら、どうする？';
  $('peopleCount').textContent=(s.onlineCount||0)+'人が参加中';$('votedCount').textContent=s.voteCount+'人が判断済み';
  show('communityStatus',view==='group');
 }
 function resultDescription(s){
  if(s.outcome==='collapse'){
   const entries=Object.entries(s.shadow||{}),min=entries.sort((a,b)=>a[1]-b[1])[0];
   const label=hiddenNames[min?.[0]]||'信頼';
   return {heading:'街は輝いていた。',sub:`でも、「${label}」が先に限界を迎えていた。`};
  }
  return {heading:'街は続いていく。',sub:'目に見えないものを、まだ守れている。'};
 }
 function renderResult(s){
  if(!s?.shadow)return;
  const result=resultDescription(s);
  $('endingTitle').textContent=result.heading;$('endingText').textContent=result.sub;
  $('endingKicker').textContent=s.outcome==='collapse'?'THE HIDDEN CITY':'THE CITY CONTINUES';
  const root=$('shadowMetrics');root.replaceChildren();
  for(const [key,label] of Object.entries(hiddenNames)){
   const v=clamp(s.shadow[key]);let row=document.createElement('div');row.className='reveal-stat'+(v<=25?' low':'');
   const title=document.createElement('span');title.textContent=label;
   const track=document.createElement('div');track.className='stat-track';const fill=document.createElement('i');fill.style.width=v+'%';track.append(fill);
   const value=document.createElement('strong');value.textContent=String(v);row.append(title,track,value);root.append(row);
  }
  $('resultNote').textContent='数字に現れなかったことも、街の未来を変えていた。';
  $('replayButton').textContent=view==='solo'?'もう一度、遊ぶ →':'次の街は、もうすぐ。';
  $('replayButton').disabled=view!=='solo';
 }
 function renderDisplay(s){
  if(view!=='display')return;
  const count=s?.onlineCount||0;$('displayCount').replaceChildren();
  const b=document.createElement('b');b.textContent=count;$('displayCount').append(b,document.createTextNode(' 人が参加'));
  $('displayOverline').textContent=s?.phase==='active'?'今、街が動いている':s?.phase==='reveal'?'街のもうひとつの姿':'みんなでつくる、ひとつの街';
  if(s?.phase==='active'){
   $('displayHeading').textContent=s.episode.heading;
   $('displayStory').textContent=`${s.episode.agent}からの相談 · ${progressLabel(s.round)}の決定 · あと${clock(s.endsAt-EngineNow())}`;
  }else if(s?.phase==='reveal'){
   const result=resultDescription(s);$('displayHeading').textContent=result.heading;
   $('displayStory').textContent=result.sub+'  信頼 '+s.shadow.trust+' / 公正 '+s.shadow.fairness+' / 持続性 '+s.shadow.resilience;
  }else{
   $('displayHeading').textContent='この街の未来を、\nあなたの手で。';
   $('displayStory').textContent='AIに任せるか。人が決めるか。';
  }
  $('displayCount').hidden=!!(s?.phase==='reveal');
 }
 function render(s){
  if(!s)return;state=s;
  renderHud(s);syncArt(s);
  $('yearStamp').innerHTML=`${2035+Math.min(8,Math.max(1,s.round+1))} <i>·</i> ${['春','夏','秋','冬'][s.round%4]}`;
  $('cityStatus').textContent=s.phase==='reveal'?'街に、変化が起きた':s.phase==='waiting'?'街の暮らしは続いている':s.episode?.agent+'が考えている';
  const ticker=s.phase==='reveal'?'すべての決定には、続きがある。':s.lastEvent?.result||'街は、今日も少しずつ変わっていく。';if($('cityTicker').textContent!==ticker){$('cityTicker').textContent=ticker;$('cityTicker').classList.remove('ticker-arrived');void $('cityTicker').offsetWidth;$('cityTicker').classList.add('ticker-arrived');}
  $('cityLocation').textContent='まちの中心から';$('cityWeather').textContent=['穏やかな風','夏の陽射し','秋の気配','冬の空'][s.round%4];
  renderDisplay(s);
  if(view==='home')return;
  if(view==='display'){show('displayFrame',true);return;}
  if(view==='group'){
   show('joinPanel',!everJoined&&s.phase!=='reveal');
   show('questionPanel',everJoined&&s.phase==='active');
   show('resultPanel',s.phase==='reveal');
   show('waitingPanel',everJoined&&s.phase==='waiting');
  }
  if(view==='solo'){
   show('joinPanel',false);show('questionPanel',s.phase==='active');show('resultPanel',s.phase==='reveal');show('waitingPanel',false);
  }
  if(s.phase==='active')renderQuestion(s);
  if(s.phase==='reveal')renderResult(s);
 }
 async function request(url,opts={}){
  const response=await fetch(url,{credentials:'same-origin',cache:'no-store',...opts});
  if(!response.ok)throw Error((await response.json().catch(()=>({error:'通信できませんでした。'}))).error||'通信できませんでした。');
  return response.json();
 }
 async function fetchState(){
  try{
   const x=await request('/api/state');offset=x.serverNow-Date.now();failedRequests=0;
   if(view==='group')everJoined=!!x.isParticipant;
   render(x);
  }catch(err){failedRequests++;if(failedRequests===3){$('cityStatus').textContent='通信を確認してください';$('cityTicker').textContent='ネットワークの接続を確認してください。';}}
 }
 function startSolo(){soloGame=MachiEngine.createGame(Date.now(),{autostart:true});MachiEngine.join(soloGame,'solo','あなた',Date.now());soloGame.votes={};render(MachiEngine.publicState(soloGame,'solo'));}
 async function joinGroup(e){e.preventDefault();$('joinForm').querySelector('button[type=submit]').disabled=true;
  try{const x=await request('/api/join',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:$('nameInput').value})});everJoined=true;offset=x.state.serverNow-Date.now();render(x.state);}catch(err){$('cityTicker').textContent=err.message;}finally{$('joinForm').querySelector('button[type=submit]').disabled=false;}
 }
 async function choose(choice){
  if(view==='solo'){if(!soloGame||soloGame.phase!=='active')return;MachiEngine.vote(soloGame,'solo',choice,Date.now());render(MachiEngine.publicState(soloGame,'solo'));return;}
  if(view==='group'){
   try{const x=await request('/api/vote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({choice,round:state?.round})});render(x.state);}catch(err){$('voteFeedback').textContent=err.message;fetchState();}
  }
 }
 function goto(href){window.location.assign(href);}
 function setupQR(){
  const url=location.origin+'/';
  $('joinUrl').textContent=location.host+'/';
  $('qrImg').src='/api/qr.svg?url='+encodeURIComponent(url);
  $('qrImg').onerror=()=>{const box=$('qrBox');box.textContent='参加URLをご利用ください';box.style.fontSize='13px';box.style.padding='15px';};
 }
 function tick(){
  if(view==='solo'&&soloGame){const changed=MachiEngine.advance(soloGame,Date.now());if(changed==='restart'){startSolo();return;}render(MachiEngine.publicState(soloGame,'solo'));}
  else if(state?.phase==='active'){
    if(view==='group'&&everJoined){$('countdown').textContent=clock(state.endsAt-EngineNow());renderQuestion(state);}
    if(view==='display')renderDisplay(state);
  }
 }
 function renderPrologue(){const line=prologueLines[prologueIndex];$('prologueSpeaker').textContent=line[0];$('prologueText').textContent=line[1];$('prologueProgress').textContent=String(prologueIndex+1).padStart(2,'0')+' / 04';$('prologueProgress').setAttribute('aria-label','全4場面のうち'+(prologueIndex+1)+'場面');$('prologueNext').innerHTML=prologueIndex===3?'街へ進む <span aria-hidden="true">→</span>':'次へ <span aria-hidden="true">→</span>';}
 function finishPrologue(){show('prologue',false);show('modeChoice',true);}
 function init(){
  initArt();
  if(view==='home'){
   show('landing',true);show('sidePanel',false);$('cityStatus').textContent='誰が、未来を決める？';
  }else if(view==='solo')startSolo();
  else {setupQR();fetchState();setInterval(fetchState,1250);}
  $('prologueNext').onclick=()=>{if(prologueIndex<3){prologueIndex++;renderPrologue();}else finishPrologue();};$('prologueSkip').onclick=finishPrologue;$('dialogueSkip').onclick=()=>{dialogueOpen=true;if(state)renderQuestion(state);};
  $('openShared').onclick=()=>goto('/?mode=group');$('openSolo').onclick=()=>goto('/?mode=solo');
  $('trySolo').onclick=()=>goto('/?mode=solo');$('joinForm').onsubmit=joinGroup;
  for(const b of document.querySelectorAll('[data-vote]'))b.onclick=()=>choose(b.dataset.vote);
  $('replayButton').onclick=()=>{if(view==='solo')startSolo();};
  $('switchButton').onclick=()=>goto('/');
  setInterval(tick,250);
 }
 init();
})();
