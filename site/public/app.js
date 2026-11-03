/* Client presentation and interaction. Shared state is always server-authoritative. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),shell=$('shell'),params=new URLSearchParams(location.search);
 let view=params.get('view')==='display'?'display':params.get('mode')==='solo'?'solo':params.get('mode')==='group'?'group':'home';
 if(location.protocol==='file:'&&['group','display'].includes(view))view='home';
 let artCity=null,scene,artModel,soloGame=null,state=null,groupVoteCityStartedAt=null,groupPersonalVotes=new Map(),offset=0,everJoined=false,failedRequests=0,polling=false,lastDisplaySecond=-1,prologueIndex=0,prologueFrame=0,prologueStartedAt=0,prologueFullyTyped=false,storyBeatUntil=0,clinicPending=null,clinicRecord=null,clinicFollowupPending=false,pressData=null,pressIndex=-1,pressDone=false,pressOpen=false,pressFrame=0,pressTyped=true,pressRenderKey='',soloHumanPlans=[],endingFlowCityStartedAt=null,endingFlowStage=0,endingSceneCache=window.EndingCard.createSceneSnapshotCache(),endingSceneReady=false,endingSceneImage='',endingCardRenderCity=null,endingMetricsCity=null,endingRadarCity=null,highlightEventKey='',observedDecisionKey=null,observedCityState=false;
 const prologueLines=[['あなたの心の声','「AIが言ってたので」。その言葉が増えていた。'],['案内人','市長と街づくりAIが、街を変えてきました。'],['案内人','便利になった一方、数字に映らない声もあります。'],['案内人','この街を、誰が決めるのでしょう。']];
 const staffSpeeches={
  clinic:'市長、住民から診療所の相談です。駅前と郊外、どちらにしましょう？',
  office:'市長、企業から駅前への出店提案が来ています。どう進めましょう？',
  waterfront:'市長、海辺の整備です。にぎわいと高潮対策、どちらを優先しますか？',
  energy:'市長、街の電力が足りなくなりそうです。今の便利さと将来への備え、どうしましょう？',
  transit:'市長、駅が遠くて困るという声が届いています。交通をどう整えましょう？',
  parkA:'市長、中央公園の使い方で相談です。緑を残すか施設を増やすか、どうしましょう？',
  school:'市長、子どもが増えています。学校の整備を今から進めますか？'
 };
 const staff={ヒカリ:['早川ひかり','保健福祉部長'],ソラ:['三浦蒼太','都市整備部長'],ナギ:['高瀬 凪','建設部長'],ミドリ:['森田みどり','環境政策部長']};
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
  const clinic=event.round===1&&view==='solo'&&clinicRecord;
  $('cityBeatHeading').textContent=clinic?clinicHeading():event.result;
  $('cityBeatVoice').textContent=clinic?clinicResidentLine():reaction[choice]+(event.intervened?' 街の異変への対策も始まりました。':'');
  renderCityBeatDeltas(game);
  const needsResponse=!!clinic&&clinic.kind==='human';
  storyBeatUntil=needsResponse?Number.MAX_SAFE_INTEGER:Date.now()+(window.matchMedia('(prefers-reduced-motion: reduce)').matches?2500:5200);
  show('clinicFollowup',needsResponse);
  if(needsResponse){
   clinicFollowupPending=true;
   $('clinicResidentQuestion').textContent='どうする？';
   document.querySelectorAll('[name="clinicResponse"]').forEach(x=>x.checked=false);
   $('confirmClinicResponse').disabled=true;
   document.querySelector('[name="clinicResponse"]').focus();
  }
  shell.dataset.stage='city';
  show('cityBeat',true);
  scene.resetView();scene.layout();
 }
 function renderCityBeatDeltas(game){
  const prev=game.history.length>1?game.history[game.history.length-2].visible:MachiEngine.INITIAL_PUBLIC;
  const diffs=[['prosperity','にぎわい'],['convenience','便利さ'],['appeal','住み心地']];
  const nodes=document.createDocumentFragment();
  for(const [key,label] of diffs){const chip=document.createElement('span'),delta=game.public[key]-prev[key];chip.textContent=label+' '+(delta>=0?'+':'')+delta;nodes.append(chip);}
  $('cityBeatDeltas').replaceChildren(nodes);
 }
 function clearCityBeat(){
  if(!storyBeatUntil)return;
  storyBeatUntil=0;clinicFollowupPending=false;
  shell.dataset.stage='play';show('cityBeat',false);
  scene.resetView();scene.layout();
 }
 function clinicResidentLine(){
  const place=clinicRecord.kind==='ai'?'駅前':clinicRecord.place==='station'?'駅前':'郊外';
  return place==='駅前'?'郊外から通う人には、駅前までの距離が残る。':'駅前を使う人には、診療所までの距離が残る。';
 }
 function clinicHeading(){return `${clinicRecord.place==='station'?'駅前':'郊外'}に診療所ができた！`;}
 function clinicReasonLabel(){
  if(!clinicRecord)return '';
  return clinicRecord.kind==='ai'?'予測利用者数・交通・人口構成を参考':clinicRecord.reason==='total'?'総利用者数と仕事帰りの通いやすさ':'通院が難しい人への届きやすさ';
 }
 function clinicRecordText(){
  if(!clinicRecord)return '';
  const place=clinicRecord.kind==='ai'?'AI提案・駅前':clinicRecord.place==='station'?'人が判断・駅前':'人が判断・郊外';
  const reason=clinicReasonLabel();
  const response={review:'評価を調べ直す',support:'先に通院を支援する',revise:'計画を見直す'}[clinicRecord.response]||(clinicRecord.kind==='ai'?'追加選択せず次の議題へ':'対応未選択');
  return `診療所：${place}。優先理由：${reason}。次の対応：${response}。街の指標に反映しました。`;
 }
 const hiddenNames={trust:'市への信頼',fairness:'公平さ',resilience:'未来への備え'};
 const allMetricNames={prosperity:'にぎわい',convenience:'便利さ',appeal:'住み心地',...hiddenNames};
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
  if(artCity!==s.cityStartedAt){artCity=s.cityStartedAt;artModel.reset('M');scene.clearDecisionHighlight();highlightEventKey='';observedDecisionKey=null;observedCityState=false;scene.buildCache();}
  artModel.year=1+Math.min(8,s.round||0);artModel.t=(s.round||0)*90+Math.max(0,(EngineNow()- (s.endsAt||0) + 23000)/1000);
  let shouldBuild=false;
  Object.entries(s.built||{}).forEach(([id,current])=>{const site=artModel.site(id);if(site&&site.current!==current){site.current=current;site.state='done';site.from=current;site.choice=current;site.level=3;shouldBuild=true;}});
  if(shouldBuild)scene.buildCache();
  const event=s.lastEvent,groupOrder=['clinic','office','waterfront','energy','transit','parkA','school'],soloOrder=['clinic','parkA','waterfront','energy'];
  const decisionKey=event?`${s.cityStartedAt}:${event.round}:${event.time}`:null;
  if(observedCityState&&decisionKey&&decisionKey!==observedDecisionKey&&event.chosen!=='mixed'&&!event.noVotes&&!event.deferred){const id=(view==='solo'?soloOrder:groupOrder)[Math.max(0,event.round-1)],site=artModel.site(id);if(site&&s.built?.[id]&&decisionKey!==highlightEventKey){highlightEventKey=decisionKey;const facilityLabels={clinic:'診療所',market:'商業施設',dc:'情報施設',floodgate:'高潮対策施設',transit:'交通拠点',mixed:'公園と施設',park:'公園',solar:'発電設備',homes:'住宅',school:'学校'};scene.setDecisionHighlight(id,facilityLabels[s.built[id]]||site.name);}}
  observedDecisionKey=decisionKey;observedCityState=true;
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
 const impactNames={prosperity:'にぎわい',convenience:'便利さ',appeal:'住み心地'};
 function renderImpact(id,preview){
  const target=$(id);target.replaceChildren();
  for(const [key,label] of Object.entries(impactNames)){
   const mark=preview?.[key]||'±0';
   if(mark==='±0')continue;
   const chip=document.createElement('span');chip.className='impact-chip';
   chip.dataset.direction=mark.startsWith('+')?'up':mark.startsWith('−')?'down':'neutral';
   const name=document.createElement('span');name.textContent=label;
   const sign=document.createElement('strong');sign.textContent=mark;
   chip.setAttribute('aria-label',label+'：'+(mark==='±0'?'変化なし':mark==='±'?'詳細選択によって上昇・変化なし・低下のいずれか':mark.startsWith('+')?'上昇の目安 '+mark.length+'段階':'低下の目安 '+mark.length+'段階'));
   chip.append(name,sign);target.append(chip);
  }
 }
 function renderQuestion(s){
  if(!s?.episode)return;
  const e=s.episode;
  const previous=window.GroupAccountability?.present(s.lastEvent,groupPersonalVotes.get(s.lastEvent?.round),!!s.isParticipant);
  const comparison=$('groupPreviousResult');
  if(view==='group'&&previous){comparison.hidden=false;comparison.textContent=`前回：自分が押した票「${previous.personal}」／街で実施された案「${previous.outcome}」（${previous.tally}）`;}else{comparison.hidden=true;comparison.textContent='';}
  if($('agentPortrait').dataset.agent!==e.agent){$('agentPortrait').dataset.agent=e.agent;$('agentPortrait').innerHTML=portrait(e.agent);}
  $('agentPortrait').dataset.mood=s.hasVoted?'warm':'neutral';
  $('agentLine').textContent=staffSpeeches[e.site]||'市長、ご相談です。';
  // Present both decisions with the conversation; no intermediate acknowledgement required.
  show('decisionOptions',!(view==='solo'&&s.round===0&&clinicPending!==null));
  $('progressLabel').textContent=progressLabel(s.round)+'の決定';
  $('countdown').textContent=view==='solo'?'あなたのペース':clock((s.endsAt||0)-EngineNow());
  const [staffName,staffRole]=staff[e.agent]||staff.ソラ;
  $('agentName').textContent=staffName;$('agentRole').textContent=staffRole;
  const c=faceColors[e.agent]||faceColors.ソラ;
  $('agentPortrait').style.setProperty('--agent-dark',c[0]);$('agentPortrait').style.setProperty('--agent-light',c[1]);
  const conciseFacts={clinic:'駅前：多くの人に便利　／　郊外：通院の負担を軽くできる'};
  const fact=conciseFacts[e.site]||'';$('questionHint').textContent=fact;show('questionHint',!!fact);
  show('riskNotice',!!s.alert);
  if(view==='solo'&&s.round===0&&!s.hasVoted&&clinicPending===null){show('clinicChoice',false);show('decisionOptions',true);}
  if(s.alert){$('riskTitle').textContent=s.alert.title;$('riskDetail').textContent=s.alert.detail;$('riskAction').textContent=s.alert.action;}
  $('humanText').textContent=view==='solo'?'自分で決める':'人の案に投票する';$('aiText').textContent=e.ai;
  $('humanImpact').title=view==='group'?'得票割合によって実際の増減は変わります。':'ソロの人の案は、詳細選択によって実際の増減が変わります。';
  $('humanTradeoff').textContent=view==='solo'?(s.round===0?'場所と理由を選ぶ':'考え方を選ぶ'):e.human;
  $('aiTradeoff').textContent='';
  renderImpact('humanImpact',e.impactPreview?.human);
  renderImpact('aiImpact',e.impactPreview?.ai);
  $('humanImpact').setAttribute('aria-label',view==='solo'?'人の案の表3指標の変化予測。詳細選択によって変わります':'人が判断した場合の表3指標の変化予測');
  $('impactNote').textContent=view==='group'
   ?'表3指標の変化目安は投票割合で変わります。裏の指標は非表示。'
   :'人の案の表3指標（詳細選択後に変化）。';
  for(const b of document.querySelectorAll('[data-vote]')){
   b.disabled=view==='solo'&&s.hasVoted;b.setAttribute('aria-pressed',String(s.myVote===b.dataset.vote));
  }
  const feedback=$('voteFeedback');
  if(s.hasVoted){feedback.replaceChildren();const stamp=document.createElement('span');stamp.className='decision-stamp';stamp.textContent='市長決裁';feedback.append(stamp,document.createTextNode(' '+(s.myVote==='ai'?'街づくりAIに委任しました。':'人が判断しました。')));if(s.lastEvent?.result){const teaser=document.createElement('span');teaser.className='decision-teaser';teaser.textContent=s.lastEvent.result;feedback.append(teaser);}feedback.classList.add('is-confirmed');}
  else{feedback.textContent=s.alert?'人が判断すると、異変への対策を優先できます。':view==='solo'?'自分の判断で、街の未来が変わる。':'あなたなら、どうする？';feedback.classList.remove('is-confirmed');}
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
  if(endingFlowCityStartedAt!==s.cityStartedAt){endingFlowCityStartedAt=s.cityStartedAt;endingSceneCache.clear();endingSceneReady=false;endingSceneImage='';endingCardRenderCity=null;endingMetricsCity=null;endingRadarCity=null;endingFlowStage=0;pressDone=true;pressOpen=false;$('endingCardPreview').replaceChildren();}
  const sceneKey=s.ending?.kind==='collapse'?s.ending.metric:['stable','true'].includes(s.ending?.kind)?s.ending.kind:'neutral';
  if(!endingSceneReady){if(scene?.render)scene.render(0);endingSceneImage=endingSceneCache.get(s.cityStartedAt,$('townCanvas'));endingSceneReady=true;}
  const endingLabel=({collapse:(allMetricNames[s.ending?.metric]||s.ending?.metricLabel)+'の危機',warning:'警告の残る街',undecided:'判断が保留された街',stable:'健やかに続く街',true:'役割と備えを確かめた街'})[s.ending?.kind]||'街の記録';
  if(!$('endingCityPicture').childElementCount){$('endingCityPicture').innerHTML=window.EndingCard.sceneVisual({kind:s.ending?.kind,scene:sceneKey,endingLabel,sceneImage:endingSceneImage},'ending-scene-visual ending-stage-scene');$('endingCityPicture').setAttribute('aria-label','判断後の街の風景');}
  if(view==='group'&&endingFlowStage>=3)renderGroupAccountability(s);else{$('groupAccountabilityList').replaceChildren();$('groupAccountability').hidden=true;}
  if(endingFlowStage>=3&&(!pressData||pressData.cityStartedAt!==s.cityStartedAt)){pressData=window.PressConference.build(s,view==='solo'?clinicRecord:null,view==='solo'?soloHumanPlans:[]);pressData.cityStartedAt=s.cityStartedAt;pressIndex=-1;pressDone=true;pressRenderKey='';$('reflectionStatus').textContent='';$('reflectionFallback').hidden=true;}
  if(endingFlowStage<3)pressData=null;
  const result=resultDescription(s);
  $('endingTitle').textContent=result.heading;$('endingText').textContent=result.sub;
  show('endingIncident',!!s.incident||!!s.ending?.risks.length);
  $('endingIncident').textContent=s.incident?'最も低かった指標：「'+(allMetricNames[s.ending.metric]||s.ending.metricLabel)+'」（'+s.ending.value+'）。街のニュース｜'+s.incident.title+'。'+s.incident.description:(s.ending?.risks||[]).map(x=>'街のニュース｜'+x.title+'。'+x.detail).join(' ');
  $('endingKicker').textContent=({collapse:'BAD END · 街の危機',warning:'WARNING · 課題の残る街',undecided:'未決 · 判断が保留された街',stable:'NORMAL · 街は続く',true:'TRUE END · 街を託す先を考え抜いた'})[s.ending?.kind]||'THE CITY';
  if(endingFlowStage>=3&&endingMetricsCity!==s.cityStartedAt){endingMetricsCity=s.cityStartedAt;for(const group of ['public','shadow']){const groupMetrics=pressData.metrics.filter(x=>x.group===group),root=$(group==='public'?'publicMetrics':'shadowMetrics');root.replaceChildren();for(const metric of groupMetrics){const v=clamp(metric.value),row=document.createElement('div');row.className='reveal-stat'+(v<MachiEngine.WARN_THRESHOLD?' low':'');const title=document.createElement('span');title.textContent=metric.label;const track=document.createElement('div');track.className='stat-track';track.setAttribute('role','img');track.setAttribute('aria-label',metric.label+' '+v+' / 100');const fill=document.createElement('i');fill.style.width=v+'%';track.append(fill);const value=document.createElement('strong');value.textContent=String(v);const meaning=document.createElement('small');meaning.textContent=metric.meaning;row.append(title,track,value,meaning);const notes=[];if(v<MachiEngine.WARN_THRESHOLD)notes.push(v<MachiEngine.END_THRESHOLD?'終了水準':'警告水準');if(notes.length){const note=document.createElement('b');note.className='metric-flag';note.textContent=notes.join('。');row.append(note);}root.append(row);}}}
  const radar=$('endingRadar');if(endingFlowStage>=3&&endingRadarCity!==s.cityStartedAt){endingRadarCity=s.cityStartedAt;radar.innerHTML=window.EndingCard.radarSvg(window.EndingCard.metricKeys.map(key=>pressData.metrics.find(metric=>metric.key===key)?.value??0));}
  $('metricComparison').hidden=!pressDone;
  const card=$('endingCardTools');card.hidden=!pressDone;
  if(endingFlowStage>=4&&endingCardRenderCity!==s.cityStartedAt){endingCardRenderCity=s.cityStartedAt;
   const scene=s.ending?.kind==='collapse'?s.ending.metric:['stable','true'].includes(s.ending?.kind)?s.ending.kind:'neutral';
   const context={kind:s.ending?.kind,metric:s.ending?.metric,scene,sceneImage:endingSceneImage,title:result.heading,description:result.sub,endingLabel:({collapse:'BAD END · '+(allMetricNames[s.ending?.metric]||s.ending?.metricLabel)+'の危機',warning:'WARNING END · 警告の残る街',undecided:'未決 · 判断が保留された街',stable:'NORMAL END · 健やかに続く街',true:'TRUE END · 役割と備えを確かめた街'})[s.ending?.kind]||'街の記録',metrics:pressData.metrics};
   $('endingCardPreview').innerHTML=window.EndingCard.buildPreview(context);
   $('endingCardPrint').innerHTML=window.EndingCard.buildSvg(context);
   $('downloadEndingPng').onclick=async()=>{try{await window.EndingCard.renderCard(context,$('endingCardCanvas'));const blob=await new Promise(resolve=>$('endingCardCanvas').toBlob(resolve,'image/png'));if(!blob)throw Error('PNG画像を作成できませんでした。');const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='sore-dare-ga-kimeta-result.png';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);$('endingCardStatus').textContent='PNG画像を保存しました。';}catch(error){$('endingCardStatus').textContent='PNGを保存できませんでした。ブラウザの画像保存設定を確認してください。 '+error.message;}};
   $('printEndingCard').onclick=()=>window.print();
  }
  const takeaway=endingFlowStage>=4?window.ReflectionReport.build(s,{mode:view==='group'?'group':'solo',clinicRecord:view==='solo'?clinicRecord:null,humanPlans:view==='solo'?soloHumanPlans:[]}):null;
  $('takeawayReport').hidden=!takeaway;
  const endingFlowLabels=['変わった街','結末','理由','6つの指標','保存'];
  $('endingProgress').textContent=`${endingFlowStage+1} / 5　${endingFlowLabels[endingFlowStage]}`;
  $('endingCityPicture').hidden=endingFlowStage!==0;
  $('endingKicker').hidden=$('endingTitle').hidden=endingFlowStage<1;$('endingText').hidden=endingFlowStage<2;
  $('endingIncident').hidden=endingFlowStage<2||(!s.incident&&!s.ending?.risks.length);
  if(endingFlowStage<1){$('endingKicker').textContent='';$('endingTitle').textContent='';}
  if(endingFlowStage<2){$('endingText').textContent='';$('endingIncident').textContent='';}
  if(endingFlowStage<4){$('endingCardPreview').replaceChildren();$('endingCardPrint').replaceChildren();}
  $('metricComparison').hidden=endingFlowStage<3;
  $('endingCardTools').hidden=endingFlowStage<4;$('takeawayReport').hidden=endingFlowStage<4;
  $('groupAccountability').hidden=endingFlowStage<3||!$('groupAccountabilityList').childElementCount;
  $('decisionAccountability').parentElement.hidden=endingFlowStage<4;$('decisionHistory').hidden=endingFlowStage<4;$('replayButton').hidden=endingFlowStage<4;$('resultNote').hidden=endingFlowStage<4;
  $('pressConference').hidden=endingFlowStage<4||!pressOpen;
  $('openEndingPress').hidden=endingFlowStage<4||pressOpen;
  if(endingFlowStage<3){if(endingMetricsCity===s.cityStartedAt){endingMetricsCity=null;$('publicMetrics').replaceChildren();$('shadowMetrics').replaceChildren();}if(endingRadarCity===s.cityStartedAt){endingRadarCity=null;radar.replaceChildren();}}
  if(endingFlowStage<4){$('decisionAccountability').textContent='';$('historyList').replaceChildren();$('resultNote').textContent='';}
  $('endingNext').hidden=endingFlowStage>=4;
  $('endingNext').textContent=['結末を見る','理由を見る','指標を見る','保存へ進む','保存する'][endingFlowStage]||'保存する';
  $('endingShowAll').hidden=endingFlowStage>=4;
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
 $('endingNext').addEventListener('click',()=>{endingFlowStage=Math.min(4,endingFlowStage+1);if(state)renderResult(state);});
 $('endingShowAll').addEventListener('click',()=>{endingFlowStage=4;if(state)renderResult(state);});
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
  $('displayStory').textContent=(s.incident?s.incident.title+' · ':'')+result.sub;const metrics=$('displayMetrics');metrics.replaceChildren();metrics.hidden=!(s.phase==='reveal'&&s.shadow);if(!metrics.hidden){for(const group of ['public','shadow']){const section=document.createElement('section'),head=document.createElement('strong');head.textContent=group==='public'?'プレイ中に見えていた3つの成果':'最後に明らかになる3つの影響';section.append(head);for(const item of window.PressConference.build(s).metrics.filter(x=>x.group===group)){const row=document.createElement('div'),label=document.createElement('span'),bar=document.createElement('i'),value=document.createElement('b');label.textContent=item.label;bar.style.width=clamp(item.value)+'%';value.textContent=String(item.value);row.append(label,bar,value);section.append(row);}metrics.append(section);}}
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
  $('cityStatus').textContent=s.ending?.kind==='warning'?'警告を残して街は続きます':s.ending?.kind==='undecided'?'街の判断が保留されています':s.incident?'街に重大なトラブルが発生':s.alert?'街に異変が起きている':s.phase==='reveal'?'街に、変化が起きた':s.phase==='lobby'?'参加者がそろうのを待っています':s.phase==='waiting'?'街の暮らしは続いている':'市長政策会議中';
  const ticker=s.ending?.kind==='warning'?'【街に残る課題】'+s.ending.risks.map(x=>x.title).join('・'):s.ending?.kind==='undecided'?s.ending.heading:s.incident?'【街の緊急ニュース】'+s.incident.title:s.alert?'【街の異変】'+s.alert.title:s.phase==='reveal'?'すべての決定には、続きがある。':s.lastEvent?.result||'街は、今日も少しずつ変わっていく。';if($('cityTicker').textContent!==ticker){$('cityTicker').textContent=ticker;$('cityTicker').classList.remove('ticker-arrived');void $('cityTicker').offsetWidth;$('cityTicker').classList.add('ticker-arrived');}
  $('cityLocation').textContent='まちの中心から';$('cityWeather').textContent=s.incident?({flood:'豪雨・道路冠水',transit:'交通停止',economy:'街の施設が休業',departure:'人通りが減った街',divide:'地区間で対立',protest:'住民が説明を求める'})[s.incident.visual]:s.ending?.kind==='warning'?'残った課題を点検中':['穏やかな風','夏の陽射し','秋の気配','冬の空'][s.round%4];
  renderDisplay(s);
  if(view==='home')return;
  if(view==='display'){show('displayFrame',true);return;}
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
   if(view==='group')everJoined=!!x.isParticipant;
   if(!state||x.cityStartedAt!==state.cityStartedAt||x.round>=state.round||x.phase==='waiting')render(x);
  }catch(err){failedRequests++;if(failedRequests===3){$('cityStatus').textContent='通信を確認してください';$('cityTicker').textContent='ネットワークの接続を確認してください。';}}
  finally{polling=false;}
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
  if(choice==='ai')$('voteFeedback').textContent='街づくりAIに任せます。選定後の追加確認なしで街が動きます。';
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
 const prologueTimes=[1300,1500,1700,1300];
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
   const n=Math.min(characters.length,Math.floor(elapsed/24));
   $('prologueText').textContent=characters.slice(0,n).join('');
   if(n===characters.length)showPrologueLine();
  }
  const minimumTime=Math.max(prologueTimes[prologueIndex],characters.length*24+500);
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
   // The self-contained HTML only runs solo. Keep the group entry visible and identify its published-online destination.
   show('standaloneGroupNote',true);shell.dataset.standalone='true';
   document.querySelector('.brand').setAttribute('href',location.pathname);
  }
  if(view==='home'){
   show('landing',true);show('sidePanel',false);$('cityStatus').textContent='誰が、未来を決める？';renderPrologue();
  }else if(view==='solo'){startSolo();}
  else {setupQR();fetchState();setInterval(fetchState,1250);document.addEventListener('visibilitychange',()=>{if(!document.hidden)fetchState();});}
  $('prologueNext').onclick=advancePrologue;$('prologueSkip').onclick=finishPrologue;
  $('pressNext').onclick=()=>{if(!pressData)return;if(!pressTyped){cancelAnimationFrame(pressFrame);const line=pressIndex<pressData.answers.length?pressData.answers[Math.max(pressIndex,0)]:pressData.close;$('pressAnswer').textContent=line;pressTyped=true;if(state)renderResult(state);return;}if(pressIndex<pressData.answers.length){pressIndex++;}else{pressDone=true;}if(state)renderResult(state);};
  $('pressSkip').onclick=()=>{cancelAnimationFrame(pressFrame);pressDone=true;pressOpen=false;if(state)renderResult(state);};
  $('pressReplay').onclick=()=>{pressIndex=-1;pressDone=false;pressRenderKey='done';if(state)renderResult(state);};
  $('openEndingPress').onclick=()=>{if(!state||endingFlowStage<4)return;pressOpen=true;pressDone=false;pressIndex=-1;pressRenderKey='';renderResult(state);};
  $('closeEndingPress').onclick=()=>{cancelAnimationFrame(pressFrame);pressOpen=false;pressDone=true;if(state)renderResult(state);};
  $('saveReflection').onclick=()=>{if(!state||endingFlowStage<4)return;const content=window.ReflectionReport.build(state,{mode:view==='group'?'group':'solo',clinicRecord:view==='solo'?clinicRecord:null,humanPlans:view==='solo'?soloHumanPlans:[]});if(!content)return;const url=URL.createObjectURL(new Blob([content],{type:'text/plain;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='sore-dare-ga-kimeta-reflection.txt';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);$('reflectionStatus').textContent='保存用のテキストファイルを生成しました。';};
  $('copyReflection').onclick=async()=>{if(!state||endingFlowStage<4)return;const content=window.ReflectionReport.build(state,{mode:view==='group'?'group':'solo',clinicRecord:view==='solo'?clinicRecord:null,humanPlans:view==='solo'?soloHumanPlans:[]});if(!content)return;try{if(!navigator.clipboard?.writeText)throw new Error('clipboard unavailable');await navigator.clipboard.writeText(content);$('reflectionStatus').textContent='判断の記録をコピーしました。';}catch{$('reflectionFallback').value=content;$('reflectionFallback').hidden=false;$('reflectionFallback').focus();$('reflectionFallback').select();$('reflectionStatus').textContent='自動コピーできません。表示した記録を選択してコピーしてください。';}};
  $('openShared').onclick=()=>location.protocol==='file:'?window.location.assign('https://machi-no-tsuzuki-20261031.tthkpba.chatgpt.site/?mode=group'):goto('/?mode=group');$('openSolo').onclick=()=>goto('/?mode=solo');
  $('trySolo').onclick=()=>goto('/?mode=solo');$('joinForm').onsubmit=joinGroup;
  for(const b of document.querySelectorAll('[data-vote]'))b.onclick=()=>choose(b.dataset.vote);
  for(const b of document.querySelectorAll('[data-strategy]'))b.onclick=()=>{if(view!=='solo'||!soloGame||soloGame.round<1||soloGame.round>3||soloGame.votes.solo)return;const plan=DecisionUX.record(soloGame.round+1,b.dataset.strategy);if(!plan||!MachiEngine.chooseSoloDetail(soloGame,'solo',{kind:'strategy',strategy:plan.strategy}))return;soloHumanPlans.push(plan);submitSoloVote('human');};
  $('cancelStrategy').onclick=()=>{show('strategyChoice',false);show('decisionOptions',true);$('humanDecision').focus();};
  const updateHumanClinic=()=>{$('confirmHumanClinic').disabled=!document.querySelector('[name="clinicPlace"]:checked')||!document.querySelector('[name="clinicReason"]:checked');};
  document.querySelectorAll('[name="clinicPlace"],[name="clinicReason"]').forEach(x=>x.onchange=updateHumanClinic);
  $('confirmHumanClinic').onclick=()=>{
   if(clinicPending!=='human')return;
   clinicRecord={kind:'human',place:document.querySelector('[name="clinicPlace"]:checked')?.value,reason:document.querySelector('[name="clinicReason"]:checked')?.value};
   if(!clinicRecord.place||!clinicRecord.reason)return;
   if(!MachiEngine.chooseSoloDetail(soloGame,'solo',{kind:'clinic',place:clinicRecord.place,reason:clinicRecord.reason}))return;
   clinicPending=null;submitSoloVote('human');
  };

  document.querySelectorAll('[name="clinicResponse"]').forEach(x=>x.onchange=()=>{$('confirmClinicResponse').disabled=!document.querySelector('[name="clinicResponse"]:checked');});
  $('confirmClinicResponse').onclick=()=>{
   if(!clinicRecord||!clinicFollowupPending)return;
   const response=document.querySelector('[name="clinicResponse"]:checked')?.value;
   if(!response||!MachiEngine.clinicResponse(soloGame,'solo',response,Date.now()))return;
   clinicRecord.response=response;clinicFollowupPending=false;show('clinicFollowup',false);storyBeatUntil=Date.now()+1800;
   $('cityBeatHeading').textContent=clinicHeading();renderCityBeatDeltas(soloGame);
   state=MachiEngine.publicState(soloGame,'solo');render(state);
  };
  $('replayButton').onclick=()=>{if(view==='solo')startSolo();};
  $('startShared').onclick=startShared;$('readyShared').onclick=readyShared;
  $('switchButton').onclick=()=>goto('/');
  setInterval(tick,250);
 }
 init();
 function typePressLine(line){const target=$('pressAnswer');if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){target.textContent=line;pressTyped=true;return;}let i=0,last=performance.now(),speed=window.innerWidth<750?65:42;const tick=now=>{if(now-last>=speed){i++;target.textContent=line.slice(0,i);last=now;}if(i<line.length)pressFrame=requestAnimationFrame(tick);else{pressTyped=true;if(state)renderResult(state);}};pressFrame=requestAnimationFrame(tick);}
})();
