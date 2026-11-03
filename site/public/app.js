/* Client presentation and interaction. Shared state is always server-authoritative. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),shell=$('shell'),params=new URLSearchParams(location.search);
 let view=params.get('view')==='display'?'display':params.get('mode')==='solo'?'solo':params.get('mode')==='group'?'group':'home';
 if(location.protocol==='file:'&&['group','display'].includes(view))view='home';
 let artCity=null,scene,artModel,soloGame=null,state=null,groupVoteCityStartedAt=null,groupPersonalVotes=new Map(),offset=0,everJoined=false,failedRequests=0,polling=false,lastDisplaySecond=-1,prologueIndex=0,prologueFrame=0,prologueStartedAt=0,prologueFullyTyped=false,storyBeatUntil=0,tutorialActive=false,tutorialChoice=null,clinicPending=null,clinicRecord=null,clinicFollowupPending=false,pressData=null,pressIndex=-1,pressDone=false,pressFrame=0,pressTyped=true,pressRenderKey='',soloHumanPlans=[];
 const prologueLines=[['あなたの心の声','「AIが言ってたので」。便利になった街で、そう答える人が増えていた。'],['案内人','ようこそ。ここは、AIが動かす未来の街です。'],['案内人','仕事が増え、暮らしは便利になりました。でも、街のすべてが数字に映るわけではありません。'],['案内人','この街の未来を、誰が決めるのでしょう。']];
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

 const residentReactions=[
  {human:'「話を聞いてくれたから、通いやすい診療所ができたね。」',ai:'「新しい診療所は立派。でも、遠くの地区からは通いにくいよ。」',mixed:'「診療所はできたね。誰の声が計画に入ったかも知りたいな。」'},
  {human:'「駅へ行く道がつながった。病院にも行きやすくなったよ。」',ai:'「駅前はにぎやか。でも遠い地区のバスは増えなかったね。」',mixed:'「駅前も変わったね。遠い地区の移動も次に考えてほしいな。」'},
  {human:'「海沿いを歩くと、守られている感じがする。」',ai:'「海辺にお店が増えたけど、高潮の日は大丈夫かな。」',mixed:'「海辺に新しい場所ができたね。備えも続けて見ていきたいな。」'},
  {human:'「少しずつでも、未来に残る電力を選んだんだね。」',ai:'「便利な施設が増えたね。夏の電力は足りるかな。」',mixed:'「便利さと備え、両方をどう守るか話し続けたいね。」'}
 ];
 function showCityBeat(game){
  const event=game.lastEvent;
  if(!event)return;
  const choice=event.chosen==='ai'?'ai':event.chosen==='mixed'?'mixed':'human';
  const reaction=residentReactions[Math.min(event.round-1,residentReactions.length-1)];
  $('cityBeatHeading').textContent=event.result;
  const clinic=event.round===1&&view==='solo'&&clinicRecord;
  $('cityBeatVoice').textContent=clinic?clinicResidentLine():reaction[choice]+(event.intervened?' 街の異変への対策も始まりました。':'');
  const prev=game.history.length>1?game.history[game.history.length-2].visible:MachiEngine.INITIAL_PUBLIC;
  const diffs=[['prosperity','繁栄'],['convenience','便利さ'],['appeal','街の魅力']];
  const nodes=document.createDocumentFragment();
  for(const [key,label] of diffs){
   const chip=document.createElement('span'),delta=game.public[key]-prev[key];
   chip.textContent=label+' '+(delta>=0?'+':'')+delta;nodes.append(chip);
  }
  $('cityBeatDeltas').replaceChildren(nodes);
  const needsResponse=!!clinic&&clinic.kind==='human';
  storyBeatUntil=needsResponse?Number.MAX_SAFE_INTEGER:Date.now()+(window.matchMedia('(prefers-reduced-motion: reduce)').matches?2500:5200);
  show('clinicFollowup',needsResponse);
  if(needsResponse){
   clinicFollowupPending=true;
   $('clinicResidentQuestion').textContent=clinicQuestion();
   $('clinicResponseCopy').textContent=clinicRecord.kind==='ai'
    ?'AIは予測利用者数・交通・人口構成を参考に駅前を推奨しました。承認したのはあなたです。ただ、ヒカリの母の事情をどの程度重く扱ったかは、まだ確かめられていません。'
    :'あなたは「'+clinicReasonLabel()+'」を優先して'+(clinicRecord.place==='station'?'駅前':'郊外')+'を選びました。理由は伝えられますが、別の場所を必要とする人の事情も残ります。';
   document.querySelectorAll('[name="clinicResponse"]').forEach(x=>x.checked=false);
   $('confirmClinicResponse').disabled=true;
   document.querySelector('[name="clinicResponse"]').focus();
  }
  shell.dataset.stage='city';
  show('cityBeat',true);
  scene.resetView();scene.layout();
 }
 function clearCityBeat(){
  if(!storyBeatUntil)return;
  storyBeatUntil=0;clinicFollowupPending=false;
  shell.dataset.stage='play';show('cityBeat',false);
  scene.resetView();scene.layout();
 }
 function clinicQuestion(){
  if(clinicRecord.kind==='ai')return 'ヒカリ「母の通院のような事情は、駅前という提案にどう反映されたの？」';
  if(clinicRecord.place==='station')return 'ヒカリ「駅前は便利。でも、母のように通院が難しい人はどうなるの？」';
  return 'ソラ「郊外に届く人はいる。一方で駅前の便利さを必要とする人には、どう説明する？」';
 }
 function clinicResidentLine(){
  const place=clinicRecord.kind==='ai'?'駅前':clinicRecord.place==='station'?'駅前':'郊外';
  return `${place}に診療所ができた。住民から、選ばれなかった場所の人への説明を求める声が上がっている。`;
 }
 function clinicReasonLabel(){
  if(!clinicRecord)return '';
  return clinicRecord.kind==='ai'?'予測利用者数・交通・人口構成を参考':clinicRecord.reason==='total'?'総利用者数と仕事帰りの通いやすさ':'通院が難しい人への届きやすさ';
 }
 function clinicRecordText(){
  if(!clinicRecord)return '';
  const place=clinicRecord.kind==='ai'?'AI提案・駅前':clinicRecord.place==='station'?'人が判断・駅前':'人が判断・郊外';
  const reason=clinicReasonLabel();
  const response={review:'評価を調べ直す',support:'先に通院を支援する',revise:'計画を見直す'}[clinicRecord.response]||(clinicRecord.kind==='ai'?'追加選択せず次の議題へ':'対応未選択');
  return `診療所：${place}。優先理由：${reason}。次の対応：${response}。これは物語上の記録で、街の指標や投票結果には加算されません。`;
 }
 const hiddenNames={trust:'信頼',fairness:'公正',resilience:'持続性'};
 const clamp=x=>Math.min(100,Math.max(0,Number(x)||0));
 function initArt(){
  artModel=new window.F5City.CityModel('M');
  artModel.paused=false;artModel.year=1;
  scene=new window.F5CityScene($('townCanvas'),artModel);
  scene.setArtMode('illustrated');scene.reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  scene.resetView();
  let lastDraw=performance.now(),firstPaintAt=lastDraw;
  function run(ts){
   // The city is costly to paint; avoid invisible rendering and cap frame work on tablets.
   const interval=scene.reduced?1000:window.innerWidth<750?65:42;
   if(document.hidden)lastDraw=ts;
   else if(ts-lastDraw>=interval){
    const dt=Math.min((ts-lastDraw)/1000,.12);lastDraw=ts;
    try{
     scene.render(dt);
     if(!$('cityLoading').hidden&&ts-firstPaintAt>300){
      const canvas=$('townCanvas'),pixel=scene.ctx.getImageData(Math.floor(canvas.width/2),Math.floor(canvas.height/2),1,1).data;
      if(pixel[0]+pixel[1]+pixel[2]>220)show('cityLoading',false);
     }
    }catch(err){console.error('city draw:',err);return;}
   }
   requestAnimationFrame(run);
  }
  requestAnimationFrame(run);
  window.addEventListener('resize',()=>{scene.lastLayout='';scene.layout();});
 }
 function syncArt(s){
  if(!artModel||!s)return;
  if(artCity!==s.cityStartedAt){artCity=s.cityStartedAt;artModel.reset('M');scene.buildCache();}
  artModel.year=1+Math.min(8,s.round||0);artModel.t=(s.round||0)*90+Math.max(0,(EngineNow()- (s.endsAt||0) + 23000)/1000);
  let shouldBuild=false;
  Object.entries(s.built||{}).forEach(([id,current])=>{const site=artModel.site(id);if(site&&site.current!==current){site.current=current;site.state='done';site.from=current;site.choice=current;site.level=3;shouldBuild=true;}});
  if(shouldBuild)scene.buildCache();
  artModel.serviceState=s.incident?.visual==='flood'?'rain':s.incident?.visual==='transit'?'demand':'normal';
  artModel.crisisVisual=s.incident?.visual||'';
  artModel.finalWarning=s.ending?.kind==='warning';
  artModel.warningVisual=s.ending?.risks[0]?.visual||'';
  document.querySelector('.skyline')?.setAttribute('data-crisis',s.incident?.visual||'');
 }
 function EngineNow(){return Date.now()+offset;}
 function show(id,on){$(id).hidden=!on;}
 function renderHud(s){if(!s)return;for(const [k,v] of Object.entries(s.public)){const el=document.querySelector(`[data-stat="${k}"]`);if(!el)continue;const n=String(Math.round(v)),value=el.querySelector('strong');el.querySelector('i').style.width=clamp(v)+'%';if(value.textContent!==n){value.textContent=n;value.classList.remove('stat-changed');void value.offsetWidth;value.classList.add('stat-changed');}}}
 function progressLabel(i){return ['第一','第二','第三','第四','第五','第六','第七'][i]||'次';}
 function clock(ms){const secs=Math.max(0,Math.ceil(ms/1000));return `${String(Math.floor(secs/60)).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}`;}
 const impactNames={prosperity:'繁栄',convenience:'便利さ',appeal:'魅力'};
 function renderImpact(id,preview){
  const target=$(id);target.replaceChildren();
  for(const [key,label] of Object.entries(impactNames)){
   const mark=preview?.[key]||'±0';
   if(mark==='±0')continue;
   const chip=document.createElement('span');chip.className='impact-chip';
   chip.dataset.direction=mark.startsWith('+')?'up':mark.startsWith('−')?'down':'neutral';
   const name=document.createElement('span');name.textContent=label;
   const sign=document.createElement('strong');sign.textContent=mark;
   chip.setAttribute('aria-label',label+'：'+(mark==='±0'?'変化なし':mark.startsWith('+')?'上昇の目安 '+mark.length+'段階':'低下の目安 '+mark.length+'段階'));
   chip.append(name,sign);target.append(chip);
  }
 }
 function renderQuestion(s){
  if(!s?.episode)return;
  const e=s.episode;
  const previous=window.GroupAccountability?.present(s.lastEvent,groupPersonalVotes.get(s.lastEvent?.round),!!s.isParticipant);
  const comparison=$('groupPreviousResult');
  if(view==='group'&&previous){comparison.hidden=false;comparison.textContent=`前回：自分が押した票「${previous.personal}」／街で実施された案「${previous.outcome}」（${previous.tally}）`;}else{comparison.hidden=true;comparison.textContent='';}
  const voice=voices[e.agent]||voices.ソラ;
  if($('agentPortrait').dataset.agent!==e.agent){$('agentPortrait').dataset.agent=e.agent;$('agentPortrait').innerHTML=portrait(e.agent);}
  $('agentPortrait').dataset.mood=s.hasVoted?'warm':'neutral';
  const linked=view==='solo'&&s.lastEvent&&s.round>=1;
  const links={
    1:{ai:'診療所はできたけど、遠くの人はまだ通いにくい。次は交通を考えよう。',human:'診療所の話し合いで、駅まで遠い人の声も聞けた。次は交通だね。',mixed:'診療所を整えた次は、駅までの移動も一緒に考えよう。'},
    2:{ai:'駅前はにぎやか。でも移動の問題が残った。海辺の計画にも影響があるよ。',human:'交通がつながって、海辺に来る人も増えそう。次の整備を考えよう。',mixed:'交通の便利さと街全体のつながり、両方を見て海辺を考えよう。'},
    3:{ai:'海辺にお店が増えて、電力の負担が大きくなってきた。',human:'海辺を守る工事が進んだ。次は長く使う電力を考えたい。',mixed:'海辺のにぎわいと備えを見ながら、次は電力を考えよう。'}
  };
  const clinicNext=view==='solo'&&s.round===1&&clinicRecord?.response?{
   review:'診療所の評価を調べ直すことにした。理由を確かめるには時間がかかる。次は街の移動も考えよう。',
   support:'開設場所はそのままに、通院支援を始めた。ほかの地区の課題は残る。次は交通だね。',
   revise:'診療所の場所を再検討することにした。開設には遅れが出る。次は交通の選択だ。'
  }[clinicRecord.response]:null;
  const lead=clinicNext||(linked?(links[s.round]?.[s.lastEvent.chosen]||voice.line):voice.line);
  $('agentLine').textContent=s.hasVoted?(s.myVote==='ai'?voice.ai:voice.human):lead;
  // Present both decisions with the conversation; no intermediate acknowledgement required.
  show('decisionOptions',!(view==='solo'&&s.round===0&&clinicPending!==null));
  $('progressLabel').textContent=progressLabel(s.round)+'の決定';
  $('countdown').textContent=view==='solo'?'あなたのペース':clock((s.endsAt||0)-EngineNow());
  $('agentName').textContent=e.agent;$('agentRole').textContent=e.role;
  const c=faceColors[e.agent]||faceColors.ソラ;
  $('agentPortrait').style.setProperty('--agent-dark',c[0]);$('agentPortrait').style.setProperty('--agent-light',c[1]);
  $('questionTitle').textContent=e.heading;$('questionHint').textContent=linked?'前の決定が、次の課題につながった。':(s.round===0?(view==='solo'?'ヒカリ「母の通院は、今の診療所まで片道1時間。近くにできれば助かる。」建設できるのは1か所。駅前は総利用者が多く仕事帰りにも便利。郊外は通院の負担が重い人に届く一方、利用者は少ない。':'診療所は1か所。駅前は利用者が多く仕事帰りに便利。郊外は通院の負担が重い人に届きやすい一方、利用者数は少なめです。'):e.hint);
  show('riskNotice',!!s.alert);
  if(view==='solo'&&s.round===0&&!s.hasVoted&&clinicPending===null){show('clinicChoice',false);show('decisionOptions',true);}
  if(s.alert){$('riskTitle').textContent=s.alert.title;$('riskDetail').textContent=s.alert.detail;$('riskAction').textContent=s.alert.action;}
  $('humanText').textContent=e.human;$('aiText').textContent=e.ai;
  if(s.round===0){$('humanText').textContent=view==='solo'?'場所と優先理由を自分で決める':'場所と優先理由を話し合う';$('aiText').textContent=view==='solo'?'AIの駅前提案を確認する':'利用予測や交通を参考にする';}
  $('humanTradeoff').textContent=`人は方針を説明しやすい一方、調整に時間がかかる。今：${e.humanNow}　その先：${e.humanLater}`;
  $('aiTradeoff').textContent='';
  renderImpact('humanImpact',e.impactPreview?.human);
  renderImpact('aiImpact',e.impactPreview?.ai);
  $('impactNote').textContent=view==='group'
   ?'表3指標の変化目安は投票割合で変わります。裏の指標は非表示。'
   :'この街の表3指標の変化目安。裏の指標には別の影響もあります。';
  for(const b of document.querySelectorAll('[data-vote]')){
   b.disabled=view==='solo'&&s.hasVoted;b.setAttribute('aria-pressed',String(s.myVote===b.dataset.vote));
  }
  $('voteFeedback').textContent=s.hasVoted?'あなたの判断を受け取りました。':s.alert?'人が判断すると、異変への対策を優先できます。':view==='solo'?'自分の判断で、街の未来が変わる。':'あなたなら、どうする？';
  $('peopleCount').textContent=(s.onlineCount||0)+'人が参加中';$('votedCount').textContent=s.voteCount+'人が判断済み';
  show('communityStatus',view==='group');
 }
 function resultDescription(s){
  return {heading:s.ending?.heading||'街の判断を振り返る。',sub:s.ending?.description||'判断の記録と、街に残った課題を確かめてください。'};
 }
 function renderGroupAccountability(s){
  const root=$('groupAccountabilityList');if(!root)return;
  root.replaceChildren();
  const rows=window.GroupAccountability.list(s.history||[],groupPersonalVotes,!!s.isParticipant);
  for(const row of rows){
   const item=document.createElement('li'),title=document.createElement('strong'),detail=document.createElement('span');
   title.textContent=`第${row.round}回 · ${row.heading}`;
   detail.textContent=`自分が押した票：${row.personal}。街で実施された案：${row.outcome}。集計：${row.tally}。`;
   item.append(title,detail);root.append(item);
  }
  $('groupAccountability').hidden=rows.length===0;
 }
 function renderResult(s){
  if(!s?.shadow)return;
  if(view==='group')renderGroupAccountability(s);
  if(!pressData||pressData.cityStartedAt!==s.cityStartedAt){pressData=window.PressConference.build(s,view==='solo'?clinicRecord:null,view==='solo'?soloHumanPlans:[]);pressData.cityStartedAt=s.cityStartedAt;pressIndex=-1;pressDone=false;pressRenderKey='';$('reflectionStatus').textContent='';$('reflectionFallback').hidden=true;}
  const result=resultDescription(s);
  $('endingTitle').textContent=result.heading;$('endingText').textContent=result.sub;
  show('endingIncident',!!s.incident||!!s.ending?.risks.length);
  $('endingIncident').textContent=s.incident?'最も低かった指標：「'+s.ending.metricLabel+'」（'+s.ending.value+'）。街のニュース｜'+s.incident.title+'。'+s.incident.description:(s.ending?.risks||[]).map(x=>'街のニュース｜'+x.title+'。'+x.detail).join(' ');
  $('endingKicker').textContent=({collapse:'THE HIDDEN CITY',warning:'THE CITY NEEDS CARE',undecided:'WHO WILL DECIDE?',stable:'THE CITY CONTINUES'})[s.ending?.kind]||'THE CITY';
  for(const group of ['public','shadow']){const groupMetrics=pressData.metrics.filter(x=>x.group===group),values=groupMetrics.map(x=>Number(x.value)),max=Math.max(...values),min=Math.min(...values),root=$(group==='public'?'publicMetrics':'shadowMetrics');root.replaceChildren();for(const metric of groupMetrics){const v=clamp(metric.value),row=document.createElement('div');row.className='reveal-stat'+(v<MachiEngine.WARN_THRESHOLD?' low':'');const title=document.createElement('span');title.textContent=metric.label;const track=document.createElement('div');track.className='stat-track';track.setAttribute('role','img');track.setAttribute('aria-label',metric.label+' '+v+' / 100');const fill=document.createElement('i');fill.style.width=v+'%';track.append(fill);const value=document.createElement('strong');value.textContent=String(v);const meaning=document.createElement('small');meaning.textContent=metric.meaning;row.append(title,track,value,meaning);const notes=[];if(v===max)notes.push('この群の最高');if(v===min)notes.push('この群の最低');if(v<MachiEngine.WARN_THRESHOLD)notes.push(v<MachiEngine.END_THRESHOLD?'終了水準':'警告水準');if(notes.length){const note=document.createElement('b');note.className='metric-flag';note.textContent=notes.join('。');row.append(note);}root.append(row);}}
  $('pressQuestion').textContent=pressData.question;
  const pressLine=pressIndex<pressData.answers.length?pressData.answers[Math.max(pressIndex,0)]:pressData.close;
  const renderKey=pressDone?'done':String(pressIndex);
  if(renderKey!==pressRenderKey){pressRenderKey=renderKey;cancelAnimationFrame(pressFrame);pressTyped=pressIndex<0;$('pressAnswer').textContent='';$('pressAnswer').hidden=pressIndex<0||pressDone;if(pressIndex>=0&&!pressDone)typePressLine(pressLine);}
  $('pressNext').hidden=pressDone;$('pressNext').textContent=pressIndex<0?'会見を始める':!pressTyped?'続きを読む':pressIndex<pressData.answers.length-1?'次の質問へ':pressIndex===pressData.answers.length-1?'最後の問いへ':'会見を終えて結果を見る';
  $('pressSkip').hidden=pressDone;$('pressReplay').hidden=!pressDone;
  $('metricComparison').hidden=!pressDone;
  const takeaway=pressDone?window.ReflectionReport.build(s,{mode:view==='group'?'group':'solo',clinicRecord:view==='solo'?clinicRecord:null,humanPlans:view==='solo'?soloHumanPlans:[]}):null;
  $('takeawayReport').hidden=!takeaway;
  $('resultNote').textContent=view==='group'?'次の街の参加受付まで '+clock(s.endsAt-EngineNow())+'。保留した議題も、次の判断で考えてみてください。':'数字に現れなかった声も、次の判断で確かめてみてください。';
  const choicesCount={human:0,ai:0,mixed:0,none:0};
  for(const event of s.history||[])choicesCount[event.chosen]=(choicesCount[event.chosen]||0)+1;
  const rounds=(s.history||[]).length;
  const record=`人が選んだ ${choicesCount.human} / AIに委ねた ${choicesCount.ai} / 同数票 ${choicesCount.mixed} / 投票なし ${choicesCount.none}（全${rounds}議題）。`;
  $('decisionAccountability').textContent=view==='group'
   ? record+(s.ending?.kind==='undecided'?' 投票がなかったのか、意見が割れたのか。保留の理由を振り返り、次の判断につなげてください。':' AIに委ねる票も参加者が選んだものです。投票と街への影響を、みんなの判断記録として残します。')
   : `${record} AIに何を任せるか決めたのも、あなたの選択です。結果と一緒に振り返ってください。 判断を任せるとき、何を確認しておく必要があったでしょうか。`;
  const list=$('historyList');list.replaceChildren();
  const choices={human:'人が判断',ai:'AIに委任',mixed:'同数票・実施保留',none:'投票なし・判断保留'};
  for(const [i,event] of (s.history||[]).entries()){
   const item=document.createElement('li');
   const label=document.createElement('strong');label.textContent='第'+(i+1)+'回 · '+event.heading;
   const detail=document.createElement('span');
   const votes=view==='group'?'（人 '+event.human+' / AI '+event.ai+'）':'';
   const attempted=event.interventionAttempted??event.intervened;
   const intervention=attempted?(event.crisisAverted?.length?' · 終了に至る危機を回避':event.warningRecovered?.length?' · 警告水準から回復':' · 対策を試みた'):'';
   detail.textContent=(choices[event.chosen]||'判断')+votes+intervention+'。'+event.result+(view==='solo'&&i===0?' '+clinicRecordText():'');
   item.append(label,detail);list.append(item);
  }
  $('historySummary').textContent='各判断の記録を見る · '+(s.history?.length||0)+'件';
  $('replayButton').textContent=view==='solo'?'もう一度、遊ぶ →':'次の街は、もうすぐ。';
  $('replayButton').disabled=view!=='solo';
 }
 function renderDisplay(s){
  if(view!=='display')return;
  const count=s?.onlineCount||0;$('displayCount').replaceChildren();
  const b=document.createElement('b');b.textContent=count;$('displayCount').append(b,document.createTextNode(' 人が参加'));
  $('displayOverline').textContent=s?.phase==='active'?'今、街が動いている':s?.phase==='reveal'?'街のもうひとつの姿':s?.phase==='lobby'?'参加者受付中':'みんなでつくる、ひとつの街';
  if(s?.phase==='active'){
   $('displayHeading').textContent=s.episode.heading;
   $('displayStory').textContent=(s.alert?'【街の異変】'+s.alert.title+' · ':'')+`${s.episode.agent}からの相談 · ${progressLabel(s.round)}の決定 · あと${clock(s.endsAt-EngineNow())}`;
  }else if(s?.phase==='reveal'){
  const result=resultDescription(s);$('displayHeading').textContent=result.heading;
  $('displayStory').textContent=(s.incident?s.incident.title+' · ':'')+result.sub;const metrics=$('displayMetrics');metrics.replaceChildren();metrics.hidden=!(s.phase==='reveal'&&s.shadow);if(!metrics.hidden){for(const group of ['public','shadow']){const section=document.createElement('section'),head=document.createElement('strong');head.textContent=group==='public'?'プレイ中に見えていた成果（表3）':'プレイ中には数値が見えていなかった影響（裏3）';section.append(head);for(const item of window.PressConference.build(s).metrics.filter(x=>x.group===group)){const row=document.createElement('div'),label=document.createElement('span'),bar=document.createElement('i'),value=document.createElement('b');label.textContent=item.label;bar.style.width=clamp(item.value)+'%';value.textContent=String(item.value);row.append(label,bar,value);section.append(row);}metrics.append(section);}}
  }else if(s?.phase==='lobby'){
   $('displayHeading').textContent='参加する人がそろったら、始めよう。';
   $('displayStory').textContent='QRから直接参加 · 準備OK '+s.readyCount+' / 接続中 '+s.onlineCount+' 人。全員の準備後に開始。途中参加は次の議題から。';
  }else{
   $('displayHeading').textContent='この街の未来を、\nあなたの手で。';
   $('displayStory').textContent='AIに任せるか。人が決めるか。';
  }
  $('displayCount').hidden=!!(s?.phase==='reveal');
 }
 function render(s){
  if(!s)return;state=s;
  if(view==='group'){if(groupVoteCityStartedAt!==s.cityStartedAt){groupVoteCityStartedAt=s.cityStartedAt;groupPersonalVotes=new Map();}if(s.phase==='active'&&s.isParticipant&&['human','ai'].includes(s.myVote))groupPersonalVotes.set(s.round+1,s.myVote);}
  renderHud(s);syncArt(s);
  $('lobbyPeople').textContent=String(s.onlineCount||0);
  $('lobbyReadyCount').textContent=String(s.readyCount||0);
  $('readyShared').textContent=s.myReady?'準備OK ✓（取り消す）':'準備OKにする';
  $('readyShared').setAttribute('aria-pressed',String(!!s.myReady));
  $('startShared').disabled=!s.canStart;
  shell.dataset.alert=String(!!s.alert||s.ending?.kind==='warning');
  shell.dataset.ending=s.ending?.kind||'';
  $('shell').setAttribute('data-crisis',s.incident?.visual||'');
  $('yearStamp').innerHTML=`${2035+Math.min(8,Math.max(1,s.round+1))} <i>·</i> ${['春','夏','秋','冬'][s.round%4]}`;
  $('cityStatus').textContent=s.ending?.kind==='warning'?'警告を残して街は続きます':s.ending?.kind==='undecided'?'街の判断が保留されています':s.incident?'街に重大なトラブルが発生':s.alert?'街に異変が起きている':s.phase==='reveal'?'街に、変化が起きた':s.phase==='lobby'?'参加者がそろうのを待っています':s.phase==='waiting'?'街の暮らしは続いている':s.episode?.agent+'が考えている';
  const ticker=s.ending?.kind==='warning'?'【街に残る課題】'+s.ending.risks.map(x=>x.title).join('・'):s.ending?.kind==='undecided'?s.ending.heading:s.incident?'【街の緊急ニュース】'+s.incident.title:s.alert?'【街の異変】'+s.alert.title:s.phase==='reveal'?'すべての決定には、続きがある。':s.lastEvent?.result||'街は、今日も少しずつ変わっていく。';if($('cityTicker').textContent!==ticker){$('cityTicker').textContent=ticker;$('cityTicker').classList.remove('ticker-arrived');void $('cityTicker').offsetWidth;$('cityTicker').classList.add('ticker-arrived');}
  $('cityLocation').textContent='まちの中心から';$('cityWeather').textContent=s.incident?({flood:'豪雨・道路冠水',transit:'交通停止',economy:'街の施設が休業',departure:'人通りが減った街',divide:'地区間で対立',protest:'住民が説明を求める'})[s.incident.visual]:s.ending?.kind==='warning'?'残った課題を点検中':['穏やかな風','夏の陽射し','秋の気配','冬の空'][s.round%4];
  renderDisplay(s);
  if(view==='home')return;
  if(view==='display'){show('displayFrame',true);return;}
  if(tutorialActive&&(view==='solo'||view==='group')){
   for(const id of ['joinPanel','lobbyPanel','questionPanel','lateJoinPanel','resultPanel','waitingPanel'])show(id,false);
   show('tutorialPanel',true);return;
  }
  show('tutorialPanel',false);
  if(view==='group'){
   show('joinPanel',!everJoined&&s.phase!=='reveal');
   show('lobbyPanel',everJoined&&s.phase==='lobby');
   show('questionPanel',everJoined&&s.phase==='active'&&!s.joiningNextRound);
   show('lateJoinPanel',everJoined&&!!s.joiningNextRound);
   $('lateJoinText').textContent=s.round+1>=s.roundTotal?'最後の議題が進行中です。今回は結末を見届け、次の街から参加できます。':'今の議題は進行中です。次の議題から、23秒の判断時間で参加できます。';
   show('resultPanel',s.phase==='reveal');
   show('waitingPanel',everJoined&&s.phase==='waiting');
  }
  if(view==='solo'){
   const beatActive=storyBeatUntil>Date.now();
   show('joinPanel',false);show('questionPanel',!beatActive&&s.phase==='active');
   show('resultPanel',!beatActive&&s.phase==='reveal');show('waitingPanel',false);
   if(beatActive)return;
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
  // Avoid late responses painting an older round over a newly submitted decision.
  if(polling||document.hidden)return;
  polling=true;
  try{
   const x=await request('/api/state');offset=x.serverNow-Date.now();failedRequests=0;
   if(view==='group'){everJoined=!!x.isParticipant;if(everJoined&&tutorialActive)finishTutorial(false);}
   if(!state||x.cityStartedAt!==state.cityStartedAt||x.round>=state.round||x.phase==='waiting')render(x);
  }catch(err){failedRequests++;if(failedRequests===3){$('cityStatus').textContent='通信を確認してください';$('cityTicker').textContent='ネットワークの接続を確認してください。';}}
  finally{polling=false;}
 }
 function startTutorial(){
  tutorialActive=true;tutorialChoice=null;
  $('tutorialTitle').textContent='公園に、ベンチを増やすとしたら？';
  $('tutorialLine').textContent='ヒカリ「公園に新しいベンチを置くよ。まずは、どこに置くかの決め方を練習してみよう！」';
  $('tutorialChoices').hidden=false;show('tutorialFeedback',false);show('tutorialContinue',false);
  $('tutorialSkip').hidden=false;
  if(view==='solo')$('tutorialContinue').textContent='本編の4つの判断へ →';
  else $('tutorialContinue').textContent='参加受付へ進む →';
  show('tutorialPanel',true);
 }
 function practice(choice){
  if(!tutorialActive||tutorialChoice)return;
  tutorialChoice=choice;
  $('tutorialTitle').textContent='ひとつの判断にも、続きがある。';
  $('tutorialLine').textContent='ヒカリ「ありがとう！便利さだけでなく、誰が困るかも考えてみてね。」';
  $('tutorialFeedback').textContent=choice==='human'
   ?'公園を使う人たちが、日陰で休みたいと教えてくれた。時間はかかったけれど、必要な場所が見えてきた。'
   :'AIが混雑している場所をすぐに選んだ。でも、静かな場所で休みたい人のことは、まだ分からない。';
  show('tutorialChoices',false);show('tutorialFeedback',true);show('tutorialContinue',choice==='human');
  $('tutorialSkip').hidden=true;if(choice==='ai'){setTimeout(()=>{if(tutorialActive&&tutorialChoice==='ai')finishTutorial();},3200);}else $('tutorialContinue').focus();
 }
 function finishTutorial(restore=true){
  tutorialActive=false;show('tutorialPanel',false);
  if(restore&&state)render(state);
 }
 function startSolo(){clearCityBeat();clinicPending=null;clinicRecord=null;soloHumanPlans=[];soloGame=MachiEngine.createGame(Date.now(),{autostart:true,storyMode:'solo'});MachiEngine.join(soloGame,'solo','あなた',Date.now());soloGame.votes={};soloGame.roundEndsAt=Number.MAX_SAFE_INTEGER;render(MachiEngine.publicState(soloGame,'solo'));}
 async function joinGroup(e){e.preventDefault();$('joinForm').querySelector('button[type=submit]').disabled=true;
  try{const x=await request('/api/join',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:$('nameInput').value})});everJoined=true;offset=x.state.serverNow-Date.now();render(x.state);}catch(err){$('cityTicker').textContent=err.message;}finally{$('joinForm').querySelector('button[type=submit]').disabled=false;}
 }
 async function startShared(){
  $('startShared').disabled=true;
  try{const x=await request('/api/start',{method:'POST'});offset=x.state.serverNow-Date.now();render(x.state);}
  catch(err){$('cityTicker').textContent=err.message;fetchState();}
  finally{$('startShared').disabled=!state?.canStart;}
 }
 async function readyShared(){
  $('readyShared').disabled=true;
  try{const x=await request('/api/ready',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ready:!state?.myReady})});render(x.state);}
  catch(err){$('cityTicker').textContent=err.message;}
  finally{$('readyShared').disabled=false;}
 }
 async function choose(choice){
  if(view==='solo'){
   if(!soloGame||soloGame.phase!=='active'||soloGame.votes.solo)return;
   if(soloGame.round===0&&choice==='human'){clinicPending='human';show('decisionOptions',false);show('clinicChoice',true);show('humanClinicForm',true);show('aiClinicForm',false);document.querySelectorAll('[name="clinicPlace"],[name="clinicReason"]').forEach(x=>x.checked=false);$('confirmHumanClinic').disabled=true;document.querySelector('[name="clinicPlace"]').focus();return;}
   if(soloGame.round===0&&choice==='ai'){clinicRecord={kind:'ai',place:'station',reason:'forecast'};clinicPending=null;submitSoloVote('ai');return;}
   if(choice==='human'&&soloGame.round>0){show('decisionOptions',false);show('strategyChoice',true);$('strategyChoice').querySelector('[data-strategy="voices"]').focus();return;}
   if(choice==='ai')$('voteFeedback').textContent='支援AIは選定を速く進め、見える成果を伸ばす利点があります。使った項目は示されますが、個別の事情をどう重み付けしたかは十分に追えません。';
   submitSoloVote(choice);return;
  }
  if(view==='group'){
   try{const x=await request('/api/vote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({choice,round:state?.round})});render(x.state);}catch(err){$('voteFeedback').textContent=err.message;fetchState();}
  }
 }
 function submitSoloVote(choice){
  if(!soloGame||soloGame.phase!=='active'||soloGame.votes.solo)return;
  if(!MachiEngine.vote(soloGame,'solo',choice,Date.now()))return;
  show('strategyChoice',false);
  if(clinicRecord)show('clinicChoice',false);
  soloGame.roundEndsAt=Date.now()+1800;render(MachiEngine.publicState(soloGame,'solo'));
 }
 function goto(href){
  // The self-contained HTML can navigate between home and solo without a server.
  if(location.protocol==='file:'){
   const q=href.includes('?')?href.slice(href.indexOf('?')):'';
   window.location.assign(location.pathname+q);
  }else window.location.assign(href);
 }
 function setupQR(){
  const url=location.origin+'/?mode=group';
  $('joinUrl').textContent=location.host+'/?mode=group';
  $('qrImg').src='/api/qr.svg?url='+encodeURIComponent(url);
  $('qrImg').onerror=()=>{const box=$('qrBox');box.textContent='参加URLをご利用ください';box.style.fontSize='13px';box.style.padding='15px';};
 }
 function tick(){
  if(view==='solo'&&soloGame){
   const endedBeat=!!storyBeatUntil&&Date.now()>=storyBeatUntil;
   if(endedBeat)clearCityBeat();
   const changed=MachiEngine.advance(soloGame,Date.now());
   if(changed==='restart'){startSolo();return;}
   if(changed){
    if(soloGame.phase==='active')soloGame.roundEndsAt=Number.MAX_SAFE_INTEGER;
    else if(soloGame.phase==='reveal')soloGame.revealEndsAt=Number.MAX_SAFE_INTEGER;
    showCityBeat(soloGame);
   }
   if(changed||endedBeat)render(MachiEngine.publicState(soloGame,'solo'));
  }
  else if(state?.phase==='active'){
    if(view==='group'&&everJoined)$('countdown').textContent=clock(state.endsAt-EngineNow());
    if(view==='display'){
      const second=Math.ceil((state.endsAt-EngineNow())/1000);
      if(lastDisplaySecond!==second){lastDisplaySecond=second;renderDisplay(state);}
    }
  }
 }
 const introReduce=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const prologueTimes=[2900,3900,5600,4000];
 function showPrologueLine(){
  $('prologueText').textContent=prologueLines[prologueIndex][1];
  $('prologueText').dataset.typing='false';
  $('prologueActivityLabel').textContent=prologueIndex===prologueLines.length-1?'街への案内を準備中…':'次のメッセージを入力中…';
  prologueFullyTyped=true;
 }
 function runPrologue(ts){
  if(view!=='home'||$('prologue').hidden)return;
  // Avoid skipping multiple scenes when the exhibition tab was left in the background.
  if(document.hidden){prologueStartedAt=ts;prologueFrame=requestAnimationFrame(runPrologue);return;}
  const raw=prologueLines[prologueIndex][1],characters=Array.from(raw);
  const elapsed=ts-prologueStartedAt;
  if(!introReduce()&&!prologueFullyTyped){
   const n=Math.min(characters.length,Math.floor(elapsed/42));
   $('prologueText').textContent=characters.slice(0,n).join('');
   if(n===characters.length)showPrologueLine();
  }
  const minimumTime=Math.max(prologueTimes[prologueIndex],characters.length*42+1600);
  if(elapsed>=minimumTime){
   if(prologueIndex===prologueLines.length-1){finishPrologue();return;}
   prologueIndex++;renderPrologue();return;
  }
  prologueFrame=requestAnimationFrame(runPrologue);
 }
 function renderPrologue(){
  cancelAnimationFrame(prologueFrame);
  const line=prologueLines[prologueIndex];
  $('prologueSpeaker').textContent=line[0];
  $('prologueAnnounce').textContent=line[0]+'：'+line[1];
  $('prologueText').textContent='';
  $('prologueText').dataset.typing='true';
  $('prologueActivityLabel').textContent=prologueIndex===0?'物語を入力中…':'案内人が入力中…';
  $('prologueProgress').textContent=String(prologueIndex+1).padStart(2,'0')+' / 04';
  $('prologueProgress').setAttribute('aria-label','全4場面のうち'+(prologueIndex+1)+'場面');
  $('prologueNext').innerHTML=prologueIndex===3?'街へ進む <span aria-hidden="true">→</span>':'次へ <span aria-hidden="true">→</span>';
  prologueFullyTyped=false;
  prologueStartedAt=performance.now();
  if(introReduce())showPrologueLine();
  prologueFrame=requestAnimationFrame(runPrologue);
 }
 function advancePrologue(){
  if(!prologueFullyTyped){showPrologueLine();return;}
  if(prologueIndex<prologueLines.length-1){prologueIndex++;renderPrologue();}
  else finishPrologue();
 }
 function finishPrologue(){
  cancelAnimationFrame(prologueFrame);
  $('prologueText').dataset.typing='false';
  show('prologue',false);show('modeChoice',true);
 }
 function init(){
  initArt();
  if(location.protocol==='file:'){
   // Shared mode requires a running server / D1. Do not advertise a broken choice.
   show('openShared',false);shell.dataset.standalone='true';
   document.querySelector('.brand').setAttribute('href',location.pathname);
  }
  if(view==='home'){
   show('landing',true);show('sidePanel',false);$('cityStatus').textContent='誰が、未来を決める？';renderPrologue();
  }else if(view==='solo'){startTutorial();startSolo();}
  else {if(view==='group')startTutorial();setupQR();fetchState();setInterval(fetchState,1250);document.addEventListener('visibilitychange',()=>{if(!document.hidden)fetchState();});}
  $('prologueNext').onclick=advancePrologue;$('prologueSkip').onclick=finishPrologue;
  $('pressNext').onclick=()=>{if(!pressData)return;if(!pressTyped){cancelAnimationFrame(pressFrame);const line=pressIndex<pressData.answers.length?pressData.answers[Math.max(pressIndex,0)]:pressData.close;$('pressAnswer').textContent=line;pressTyped=true;if(state)renderResult(state);return;}if(pressIndex<pressData.answers.length){pressIndex++;}else{pressDone=true;}if(state)renderResult(state);};
  $('pressSkip').onclick=()=>{cancelAnimationFrame(pressFrame);pressDone=true;if(state)renderResult(state);};
  $('pressReplay').onclick=()=>{pressIndex=-1;pressDone=false;pressRenderKey='done';if(state)renderResult(state);};
  $('saveReflection').onclick=()=>{if(!state||!pressDone)return;const content=window.ReflectionReport.build(state,{mode:view==='group'?'group':'solo',clinicRecord:view==='solo'?clinicRecord:null,humanPlans:view==='solo'?soloHumanPlans:[]});if(!content)return;const url=URL.createObjectURL(new Blob([content],{type:'text/plain;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='sore-dare-ga-kimeta-reflection.txt';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);$('reflectionStatus').textContent='保存用のテキストファイルを生成しました。';};
  $('copyReflection').onclick=async()=>{if(!state||!pressDone)return;const content=window.ReflectionReport.build(state,{mode:view==='group'?'group':'solo',clinicRecord:view==='solo'?clinicRecord:null,humanPlans:view==='solo'?soloHumanPlans:[]});if(!content)return;try{if(!navigator.clipboard?.writeText)throw new Error('clipboard unavailable');await navigator.clipboard.writeText(content);$('reflectionStatus').textContent='判断の記録をコピーしました。';}catch{$('reflectionFallback').value=content;$('reflectionFallback').hidden=false;$('reflectionFallback').focus();$('reflectionFallback').select();$('reflectionStatus').textContent='自動コピーできません。表示した記録を選択してコピーしてください。';}};
  $('tutorialHuman').onclick=()=>practice('human');$('tutorialAi').onclick=()=>practice('ai');
  $('tutorialContinue').onclick=()=>finishTutorial();$('tutorialSkip').onclick=()=>finishTutorial();
  $('openShared').onclick=()=>goto('/?mode=group');$('openSolo').onclick=()=>goto('/?mode=solo');
  $('trySolo').onclick=()=>goto('/?mode=solo');$('joinForm').onsubmit=joinGroup;
  for(const b of document.querySelectorAll('[data-vote]'))b.onclick=()=>choose(b.dataset.vote);
  for(const b of document.querySelectorAll('[data-strategy]'))b.onclick=()=>{if(view!=='solo'||!soloGame||soloGame.round<1||soloGame.round>3||soloGame.votes.solo)return;const plan=DecisionUX.record(soloGame.round+1,b.dataset.strategy);if(!plan)return;soloHumanPlans.push(plan);submitSoloVote('human');};
  $('cancelStrategy').onclick=()=>{show('strategyChoice',false);show('decisionOptions',true);$('humanDecision').focus();};
  const updateHumanClinic=()=>{$('confirmHumanClinic').disabled=!document.querySelector('[name="clinicPlace"]:checked')||!document.querySelector('[name="clinicReason"]:checked');};
  document.querySelectorAll('[name="clinicPlace"],[name="clinicReason"]').forEach(x=>x.onchange=updateHumanClinic);
  $('confirmHumanClinic').onclick=()=>{
   if(clinicPending!=='human')return;
   clinicRecord={kind:'human',place:document.querySelector('[name="clinicPlace"]:checked')?.value,reason:document.querySelector('[name="clinicReason"]:checked')?.value};
   if(!clinicRecord.place||!clinicRecord.reason)return;
   clinicPending=null;submitSoloVote('human');
  };

  document.querySelectorAll('[name="clinicResponse"]').forEach(x=>x.onchange=()=>{$('confirmClinicResponse').disabled=!document.querySelector('[name="clinicResponse"]:checked');});
  $('confirmClinicResponse').onclick=()=>{
   if(!clinicRecord||!clinicFollowupPending)return;
   clinicRecord.response=document.querySelector('[name="clinicResponse"]:checked')?.value;
   if(!clinicRecord.response)return;
   clinicFollowupPending=false;clearCityBeat();if(state)render(state);
  };
  $('replayButton').onclick=()=>{if(view==='solo')startSolo();};
  $('startShared').onclick=startShared;$('readyShared').onclick=readyShared;
  $('switchButton').onclick=()=>goto('/');
  setInterval(tick,250);
 }
 init();
 function typePressLine(line){const target=$('pressAnswer');if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){target.textContent=line;pressTyped=true;return;}let i=0,last=performance.now(),speed=window.innerWidth<750?65:42;const tick=now=>{if(now-last>=speed){i++;target.textContent=line.slice(0,i);last=now;}if(i<line.length)pressFrame=requestAnimationFrame(tick);else{pressTyped=true;if(state)renderResult(state);}};pressFrame=requestAnimationFrame(tick);}
})();
