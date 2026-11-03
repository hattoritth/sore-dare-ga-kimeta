/* Shared game rules: one city, one decision per round. No AI API is called. */
(function(global){
 'use strict';
 const EPISODES = [
  {agent:'ヒカリ',role:'住民の声',site:'clinic',heading:'診療所を増やす？',hint:'診療所は1か所。駅前は利用者が多く、郊外は通院の負担を減らせます。',human:'住民に聞いて決める',ai:'需要予測で進める',humanNow:'地域ごとの必要を拾う',humanLater:'必要な場所へ届けるには話し合いが要る',aiNow:'予測に合わせて早く整える',aiLater:'想定から外れた地区の声は残る',resultHuman:'住民の要望を聞き、診療所を整えた。',resultAI:'需要予測をもとに診療所を整えた。',humanBuild:'clinic',aiBuild:'clinic',impact:{human:{prosperity:-4,convenience:2,appeal:1,trust:4,fairness:2,resilience:1},ai:{prosperity:11,convenience:10,appeal:4,trust:2,fairness:-8,resilience:-21}}},
  {agent:'ソラ',role:'都市計画',site:'office',heading:'駅前の空き地をどうする？',hint:'新しい企業が進出を希望。',human:'使い道を話し合う',ai:'収益予測を優先する',humanNow:'地域の望む使い方を選ぶ',humanLater:'話し合いで声の大きい地区に偏ることも',aiNow:'仕事の拠点を広げる',aiLater:'予測の前提が偏ると、投資先も偏ることがある',resultHuman:'相談の結果、街に市場が生まれた。',resultAI:'予測をもとに、仕事の拠点が増えた。',humanBuild:'market',aiBuild:'dc',impact:{human:{prosperity:1,convenience:0,appeal:1,trust:3,fairness:-6,resilience:1},ai:{prosperity:14,convenience:7,appeal:-2,trust:-11,fairness:3,resilience:-3}}},
  {agent:'ナギ',role:'施設整備',site:'waterfront',heading:'海辺を開発する？',hint:'集客施設か、防災対策か。',human:'暮らす人の声を聞く',ai:'効率的な開発を進める',humanNow:'高潮に備える設備を整える',humanLater:'集客や便利さへの投資は控えめ',aiNow:'商業施設で人を呼び込む',aiLater:'にぎわいが増えても高潮への備えは別に必要',resultHuman:'高潮に備える設備が整った。',resultAI:'予測をもとに、海辺に商業施設ができた。',humanBuild:'floodgate',aiBuild:'market',impact:{human:{prosperity:-6,convenience:-3,appeal:2,trust:2,fairness:1,resilience:14},ai:{prosperity:12,convenience:3,appeal:9,trust:-10,fairness:-4,resilience:-22}}},
  {agent:'ミドリ',role:'環境・調査',site:'energy',heading:'新しい電力をどう確保する？',hint:'街の使用電力が増えている。',human:'将来の負荷も調べる',ai:'今の需要に合わせる',humanNow:'先の需要まで見て電源を選ぶ',humanLater:'今すぐの成長や便利さはゆるやか',aiNow:'今の需要に合わせて施設を増やす',aiLater:'需要が急増すると、長期の備えが足りないことも',resultHuman:'長く使える発電設備が整った。',resultAI:'需要予測をもとに、効率的な情報施設を整えた。',humanBuild:'solar',aiBuild:'dc',impact:{human:{prosperity:-4,convenience:-1,appeal:2,trust:1,fairness:1,resilience:14},ai:{prosperity:14,convenience:9,appeal:1,trust:-10,fairness:-4,resilience:4}}},
  {agent:'ソラ',role:'都市計画',site:'transit',heading:'新しい交通の拠点は？',hint:'駅までの移動が不便という声。',human:'移動の実態を確認',ai:'データから最適化',humanNow:'遠い地区も交通でつなぐ',humanLater:'広く移動を支え、成長は穏やか',aiNow:'駅前に商業施設を増やす',aiLater:'利用の少ない地区の不便は残る',resultHuman:'街をつなぐ交通拠点ができた。',resultAI:'予測をもとに、駅前に商業施設が増えた。',humanBuild:'transit',aiBuild:'market',impact:{human:{prosperity:-5,convenience:11,appeal:1,trust:2,fairness:2,resilience:1},ai:{prosperity:6,convenience:12,appeal:5,trust:-10,fairness:-20,resilience:-13}}},
  {agent:'ヒカリ',role:'住民の声',site:'parkA',heading:'中央公園を変える？',hint:'土地の活用を求める提案。',human:'公園の役割を残す',ai:'新しい施設へ転用',humanNow:'公園と施設を両立する',humanLater:'大きな商業利用の余地は小さくなる',aiNow:'中心に便利な施設を設ける',aiLater:'緑の場所と街の魅力が失われることも',resultHuman:'公園と施設を両立する形にした。',resultAI:'予測をもとに、街の中心に情報施設ができた。',humanBuild:'mixed',aiBuild:'dc',impact:{human:{prosperity:1,convenience:-1,appeal:5,trust:2,fairness:4,resilience:4},ai:{prosperity:15,convenience:5,appeal:-45,trust:-10,fairness:-30,resilience:-8}}},
  {agent:'ミドリ',role:'環境・調査',site:'school',heading:'学びの場所を増やす？',hint:'子どもの数が増えている。',human:'将来の人口まで調べる',ai:'今すぐ住まいを増やす',humanNow:'次の世代の学びを準備する',humanLater:'今すぐの住宅増加はゆるやか',aiNow:'今の住宅需要にすばやく応える',aiLater:'人口が増えると学びの場所が足りないことも',resultHuman:'次の世代のための学びの場ができた。',resultAI:'予測をもとに、新しい住宅が完成した。',humanBuild:'school',aiBuild:'homes',impact:{human:{prosperity:-2,convenience:2,appeal:2,trust:1,fairness:5,resilience:5},ai:{prosperity:4,convenience:11,appeal:10,trust:-10,fairness:3,resilience:-5}}}
 ];
 const INITIAL_PUBLIC={prosperity:61,convenience:63,appeal:67};
 const INITIAL_SHADOW={trust:82,fairness:78,resilience:77};
 const SOLO_STORY=[0,4,2,3];
 // Small, deterministic solo-only follow-through. Each option moves distinct metrics;
 // these apply after the normal episode proposal and never alter shared votes.
 const SOLO_DETAIL_IMPACT={
  clinicPlace:{station:{prosperity:2,convenience:4,fairness:-3},suburb:{prosperity:-1,convenience:1,appeal:2,fairness:4}},
  clinicReason:{total:{prosperity:2,convenience:1},access:{convenience:1,trust:1,fairness:2}},
  strategy:{voices:{prosperity:-2,convenience:1,appeal:1,trust:3},balance:{prosperity:-1,convenience:-1,trust:1,fairness:3,resilience:2}},
  response:{review:{convenience:-1,trust:4,fairness:2},support:{prosperity:-1,convenience:3,appeal:1,fairness:1},revise:{prosperity:-1,convenience:-2,trust:1,fairness:3}}
 };
 const episodeFor=game=>EPISODES[game.storyMode==='solo'?SOLO_STORY[game.round]:game.round];
 const maxRounds=game=>game.storyMode==='solo'?SOLO_STORY.length:EPISODES.length;
 // These thresholds apply to both visible and hidden metrics. Strictly below, not equal.
 const MAX_ROUNDS=EPISODES.length,ROUND_MS=23000,REVEAL_MS=50000,WARN_THRESHOLD=30,END_THRESHOLD=10;
 const SIGNALS={
  prosperity:{warning:'街の仕事に不安が広がる',detail:'働く場所を守れるのか、住民から声が上がっています。',incident:'街の財政が立ち行かなくなった',description:'仕事と収入が減り、必要な公共サービスを維持できなくなりました。',visual:'economy'},
  convenience:{warning:'街の移動に混乱が生まれる',detail:'移動や生活に支障が出る地区が増えています。',incident:'街の交通網が止まった',description:'日々の移動に必要な仕組みが機能しなくなりました。',visual:'transit'},
  appeal:{warning:'住民が街を離れ始める',detail:'街で暮らし続けることに迷う人が出ています。',incident:'街から人が離れていった',description:'暮らし続けたいと思う人が減り、街の活気が失われました。',visual:'departure'},
  trust:{warning:'住民が説明を求めている',detail:'誰が何を決めたのか、わからないという声が広がっています。',incident:'住民の反対運動が広がった',description:'説明のない決定が重なり、住民の協力が得られなくなりました。',visual:'protest'},
  fairness:{warning:'地区ごとに不満が高まっている',detail:'同じ街なのに扱いが違う、と感じる住民がいます。',incident:'住民同士の分断が深まった',description:'公平さを欠いた決定が積み重なり、街のつながりが失われました。',visual:'divide'},
  resilience:{warning:'街の設備に異変が起きている',detail:'便利さの陰で、災害への備えが追いついていません。',incident:'豪雨で街が浸水した',description:'備えの不足が重なり、街を守る設備が限界を迎えました。',visual:'flood'}
 };
 // Each repeated one-sided decision creates a growing, topic-specific unattended cost.
 // It is measured by actual resolved choices, never by which button happens to be clicked.
 // Mixed/tied/absent votes incur no unilateral penalty. No extra rounds are added.
 const OPERATING_PRESSURE={human:[0,0,23,28,34,48,58],ai:[0,0,10,28,34,48,58]};
 const PRESSURE_FOCUS={
  human:['convenience','prosperity','prosperity','prosperity','convenience','appeal','convenience'],
  ai:['resilience','trust','resilience','resilience','fairness','appeal','trust']
 };
 const ENDINGS={
  prosperity:{heading:'仕事の灯が、消えた街。',description:'決めるための話し合いは重ねた。それでも計画は前に進まず、店が閉まり、働く場所が消えた。人の声を聞くことと、実現する力の両方が必要だった。'},
  convenience:{heading:'行きたい場所へ、行けない街。',description:'丁寧に決めようとしているうちに、交通も日々のサービスも追いつかなくなった。住民の希望を形にするには、データと実行の速さも必要だった。'},
  appeal:{heading:'帰りたい場所が、なくなった街。',description:'数字では活用できたはずの土地から、いつもの公園や居場所が消えていった。効率だけでは、暮らし続けたくなる理由を計れなかった。'},
  trust:{heading:'誰も、説明できなくなった街。',description:'判断の根拠をたどっても、責任者の言葉が見つからない。正確そうな提案に任せるほど、「誰が決めた？」という声だけが大きくなった。'},
  fairness:{heading:'見えない境界線が、街を分けた。',description:'予測に選ばれる地区と、見落とされる地区。便利になった場所の隣で、同じ街の住民が取り残された。平均値の向こうに、一人ひとりがいた。'},
  resilience:{heading:'備えのない街に、雨が降った。',description:'成長と便利さを急いだ街に豪雨が押し寄せた。警報はあったのに、誰も備えを確かめなかった。判断を任せても、最後の責任まで消えるわけではない。'}
 };
 const metricEntries=game=>[...Object.entries(game.public),...Object.entries(game.shadow)];
 const criticalRisks=(game,threshold)=>metricEntries(game).filter(([,v])=>v<threshold).sort((a,b)=>a[1]-b[1]);
 function publicWarning(game){
  const risks=criticalRisks(game,WARN_THRESHOLD);
  if(!risks.length)return null;
  const x=SIGNALS[risks[0][0]];
  // Signals describe lived experiences; they deliberately never expose hidden keys/values.
  return {title:x.warning,detail:x.detail,action:['prosperity','convenience'].includes(risks[0][0])
   ?'現場の声に加えてAIの分析も活用し、実行が遅れない方法を探しましょう。'
   :'AIの提案だけに任せず、人が見落としや説明責任を確かめましょう。',count:risks.length};
 }
 function publicIncident(game){
  const risks=criticalRisks(game,END_THRESHOLD);
  if(!risks.length)return null;
  const [metric]=risks[0],x=SIGNALS[metric];
  return {metric,title:x.incident,description:x.description,visual:x.visual};
 }
 const clamp=x=>Math.min(100,Math.max(0,Math.round(x)));
 const copy=x=>JSON.parse(JSON.stringify(x));
 const tally=game=>Object.values(game.votes).reduce((a,v)=>(a[v]++,a),{human:0,ai:0});
 function createGame(now=Date.now(),opts={}){
   const game={phase:opts.autostart?'active':'waiting',storyMode:opts.storyMode==='solo'?'solo':null,createdAt:now,round:0,roundStartedAt:now,roundEndsAt:opts.autostart?now+ROUND_MS:0,revealEndsAt:0,public:copy(INITIAL_PUBLIC),shadow:copy(INITIAL_SHADOW),built:{},history:[],votes:{},participants:{},outcome:null,lastEvent:null};
   if(game.storyMode==='solo'){game.soloDetails={};game.awaitingClinicResponse=false;}
   return game;
 }
 const connected=(game,now)=>Object.values(game.participants).filter(x=>now-x.lastSeen<90000);
 function canStart(game,now=Date.now()){const players=connected(game,now);return game.phase==='lobby'&&players.length>0&&players.every(x=>x.ready);}
 function ready(game,id,value,now=Date.now()){
   if(game.phase!=='lobby'||!game.participants[id]||typeof value!=='boolean')return false;
   game.participants[id].ready=value;game.participants[id].lastSeen=now;return true;
 }
 function start(game,now=Date.now()){if(!canStart(game,now))return false;game.phase='active';game.roundStartedAt=now;game.roundEndsAt=now+ROUND_MS;return true;}
 function join(game,id,name,now=Date.now()){
   if(game.phase==='reveal')return false;
   const previous=game.participants[id];
   game.participants[id]={ready:false,eligibleFromRound:game.storyMode!=='solo'&&game.phase==='active'&&now>game.roundStartedAt?game.round+1:game.round,...previous,name:String(name||'参加者').replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,16)||'参加者',joinedAt:previous?.joinedAt??now,lastSeen:now};
   if(game.phase==='waiting')game.phase='lobby';
   return true;
 }
 function vote(game,id,choice,now=Date.now()){
   if(game.phase!=='active'||game.awaitingClinicResponse||!['human','ai'].includes(choice)||!game.participants[id]||(game.participants[id].eligibleFromRound||0)>game.round||now>=game.roundEndsAt)return false;
   game.votes[id]=choice;game.participants[id].lastSeen=now;return true;
 }
 function chooseSoloDetail(game,id,detail){
  if(game.storyMode!=='solo'||game.phase!=='active'||game.awaitingClinicResponse||game.votes[id]||!game.participants[id]||(game.participants[id].eligibleFromRound||0)>game.round||!detail||typeof detail!=='object')return false;
  if(game.round===0){
   if(detail.kind!=='clinic'||!['station','suburb'].includes(detail.place)||!['total','access'].includes(detail.reason)||game.soloDetails[0])return false;
  }else{
   if(detail.kind!=='strategy'||!['voices','balance'].includes(detail.strategy)||game.soloDetails[game.round])return false;
  }
  game.soloDetails[game.round]=copy(detail);return true;
 }
 function applySoloImpact(game,impact){
  for(const [key,delta] of Object.entries(impact||{})){
   const pool=Object.hasOwn(game.public,key)?game.public:game.shadow;
   pool[key]=clamp(pool[key]+delta);
  }
 }
 function clinicResponse(game,id,response,now=Date.now()){
  if(game.storyMode!=='solo'||game.phase!=='active'||game.round!==1||!game.awaitingClinicResponse||!game.participants[id]||Object.keys(game.participants).length!==1||!Object.hasOwn(SOLO_DETAIL_IMPACT.response,response))return false;
  const event=game.history[0];if(!event||event.chosen!=='human'||event.clinicResponseApplied)return false;
  const before={...game.public};applySoloImpact(game,SOLO_DETAIL_IMPACT.response[response]);
  const lines={review:'住民の評価を調べ直し、根拠の説明と地区ごとの状況を確かめました。',support:'通院支援を先に進め、利用のしやすさを補いました。',revise:'計画を見直し、各地区の事情を反映しました。'};
  const responseDelta=Object.fromEntries(Object.keys(game.public).map(k=>[k,game.public[k]-before[k]]));
  event.result+=' '+lines[response];event.clinicResponse=response;event.clinicResponseApplied=true;event.responseDelta=responseDelta;event.visible=copy(game.public);event.hidden=copy(game.shadow);
  if(game.lastEvent){game.lastEvent.result=event.result;game.lastEvent.clinicResponseApplied=true;game.lastEvent.responseDelta=responseDelta;}
  game.awaitingClinicResponse=false;
  const lost=criticalRisks(game,END_THRESHOLD)[0];
  if(lost||game.round>=maxRounds(game)){game.phase='reveal';game.outcome=lost?'collapse':game.history.every(x=>x.deferred)?'undecided':'survived';game.revealEndsAt=now+REVEAL_MS;}
  else{game.roundStartedAt=now;game.roundEndsAt=Number.MAX_SAFE_INTEGER;}
  return {public:{...game.public},delta:responseDelta,phase:game.phase};
 }
 function resolve(game,now){
   const n=tally(game),total=n.human+n.ai,noVotes=total===0,aiShare=noVotes?0:n.ai/total;
   const e=episodeFor(game);
   const chosen=noVotes?'none':aiShare>0.5?'ai':aiShare<0.5?'human':'mixed';
   // Without a majority, neither proposal is implemented. Both metrics and buildings stay put.
   const deferred=noVotes||chosen==='mixed';
   // Capture a warning before applying the next decision: a human-led choice can intervene.
   const risksBefore=criticalRisks(game,WARN_THRESHOLD);
   // Human oversight repairs social/safety risks; data-led execution can repair throughput.
  // Neither method is a universal cure for all six metrics.
  const repairable=chosen==='human'?['trust','fairness','resilience','appeal']:
    chosen==='ai'?['prosperity','convenience']:[];
  const interventions=risksBefore.filter(([metric])=>repairable.includes(metric));
  const intervened=interventions.length>0;
   // Each proposal has a distinct trade-off; group decisions blend the two options by vote share.
   if(!deferred){
    for(const key of Object.keys(game.public)){
      const delta=Math.round(e.impact.human[key]*(1-aiShare)+e.impact.ai[key]*aiShare);
      game.public[key]=clamp(game.public[key]+delta);
    }
    for(const key of Object.keys(game.shadow)){
      const delta=Math.round(e.impact.human[key]*(1-aiShare)+e.impact.ai[key]*aiShare);
      game.shadow[key]=clamp(game.shadow[key]+delta);
    }
   }
   const soloDetail=game.storyMode==='solo'&&chosen==='human'?game.soloDetails[game.round]:null;
   if(soloDetail?.kind==='clinic'){
    applySoloImpact(game,SOLO_DETAIL_IMPACT.clinicPlace[soloDetail.place]);
    applySoloImpact(game,SOLO_DETAIL_IMPACT.clinicReason[soloDetail.reason]);
   }else if(soloDetail?.kind==='strategy')applySoloImpact(game,SOLO_DETAIL_IMPACT.strategy[soloDetail.strategy]);
   // Recurring dependence on one decision method accumulates real operational debt.
   // Every episode has a different neglected dimension; penalty is vote-share weighted.
   const priorSame=game.history.filter(x=>x.chosen===chosen).length;
   const focus=PRESSURE_FOCUS[chosen]?.[game.storyMode==='solo'?SOLO_STORY[game.round]:game.round];
   const pressure=focus?Math.round((OPERATING_PRESSURE[chosen][Math.min(priorSame,OPERATING_PRESSURE[chosen].length-1)]||0)
     *(chosen==='ai'?aiShare:1-aiShare)):0;
   if(pressure){
     const pool=Object.hasOwn(game.public,focus)?game.public:game.shadow;
     pool[focus]=clamp(pool[focus]-pressure);
   }
   const beforeIntervention={...game.public,...game.shadow};
   if(intervened)for(const [metric] of interventions){
     const group=Object.hasOwn(game.public,metric)?game.public:game.shadow;
     group[metric]=clamp(group[metric]+Math.round(8*(chosen==='ai'?aiShare:1-aiShare)));
   }
   const crisisAverted=intervened?interventions.filter(([metric])=>beforeIntervention[metric]<END_THRESHOLD&&((Object.hasOwn(game.public,metric)?game.public:game.shadow)[metric]>=END_THRESHOLD)).map(([metric])=>metric):[];
   const warningRecovered=intervened?interventions.filter(([metric])=>((Object.hasOwn(game.public,metric)?game.public:game.shadow)[metric]>=WARN_THRESHOLD)).map(([metric])=>metric):[];
   if(!deferred){
    const built=chosen==='ai'?e.aiBuild:e.humanBuild;
    game.built[e.site]=built;
   }
   const detailLine=soloDetail?.kind==='clinic'?`${soloDetail.place==='station'?'駅前':'郊外'}を選び、${soloDetail.reason==='total'?'利用者数':'通院の届きやすさ'}を優先した。`:soloDetail?.kind==='strategy'?(soloDetail.strategy==='voices'?'現地の声を確かめる方針を実施した。':'複数地区の希望を調整する方針を実施した。'):'';
   const message=noVotes?'投票がなかったため、この議題は判断を保留しました。街の状態を維持して次の議題へ進みます。':chosen==='mixed'?'人とAIの票が同数のため、両案の実施を保留しました。施設も指標も変えず、次の議題へ進みます。':(chosen==='ai'?e.resultAI:e.resultHuman)+(detailLine?' '+detailLine:'')
    +(pressure?chosen==='human'?' 人だけで決め続け、調整と整備の遅れが街に積み重なっている。':' AIに任せ続け、現場で確かめなかった影響が現れ始めた。':'')
    +(intervened?' 異変に気づき、足りなかった視点から対策を進めた。':'');
   game.lastEvent={round:game.round+1,heading:e.heading,agent:e.agent,result:message,chosen,human:n.human,ai:n.ai,time:now,intervened,interventionAttempted:intervened,crisisAverted,warningRecovered,noVotes,deferred};
   game.history.push({...game.lastEvent,visible:copy(game.public),hidden:copy(game.shadow)});
   game.votes={};game.round++;
   const awaitClinic=game.storyMode==='solo'&&game.round===1&&chosen==='human'&&soloDetail?.kind==='clinic';
   if(game.storyMode==='solo')game.awaitingClinicResponse=awaitClinic;
   const lost=awaitClinic?null:criticalRisks(game,END_THRESHOLD)[0];
   if(lost||game.round>=maxRounds(game)){game.phase='reveal';game.outcome=lost?'collapse':game.history.every(x=>x.deferred)?'undecided':'survived';game.revealEndsAt=now+REVEAL_MS;}
   else if(awaitClinic)game.roundEndsAt=Number.MAX_SAFE_INTEGER;
   else {game.roundStartedAt=now;game.roundEndsAt=now+ROUND_MS;}
 }
 function advance(game,now=Date.now()){
  if(game.phase==='active'&&!game.awaitingClinicResponse&&now>=game.roundEndsAt){resolve(game,now);return true;}
   if(game.phase==='reveal'&&now>=game.revealEndsAt)return 'restart';
   return false;
 }
 // TRUE is a reveal-only accolade for accountable, topic-appropriate roles plus
 // follow-through. Keep this deterministic and derived from resolved history.
 const TRUE_METRIC_FLOOR=40;
 function trueRoleRoute(game){
   if(game.phase!=='reveal'||game.outcome!=='survived'||criticalRisks(game,WARN_THRESHOLD).length||game.history.length!==maxRounds(game))return false;
   const choices=game.history.map(x=>x.chosen);
   if(game.storyMode==='solo'){
     const clinic=game.soloDetails?.[0],event=game.history[0];
     return choices.join(',')==='human,human,human,ai'&&clinic?.kind==='clinic'&&
       ['station','suburb'].includes(clinic.place)&&clinic.reason==='access'&&
       event?.clinicResponseApplied===true&&['review','support','revise'].includes(event.clinicResponse)&&
       Object.values({...game.public,...game.shadow}).every(value=>value>=TRUE_METRIC_FLOOR);
   }
   if(game.storyMode!==null)return false;
   // Human responsibility: resident access, flood safety, park and future schooling.
   // AI must execute the energy plan and at least one data-led office/transit task.
   // Both are needed, rather than scoring merely by how many AI buttons were used.
   if(choices[0]!=='human'||choices[2]!=='human'||choices[3]!=='ai'||choices[5]!=='human'||choices[6]!=='human')return false;
   if(choices[1]!=='ai'&&choices[4]!=='ai')return false;
   if(game.history.some((event,i)=>event.round!==i+1||event.noVotes||event.deferred||!['human','ai'].includes(event.chosen)||
       game.built[EPISODES[i].site]!==EPISODES[i][event.chosen==='ai'?'aiBuild':'humanBuild']))return false;
   return Object.values({...game.public,...game.shadow}).every(value=>value>=TRUE_METRIC_FLOOR);
 }
 function endingFor(game){
   if(game.phase!=='reveal')return null;
   const labels={prosperity:'繁栄',convenience:'便利さ',appeal:'街の魅力',trust:'信頼',fairness:'公正',resilience:'持続性'};
   const risks=criticalRisks(game,WARN_THRESHOLD).map(([metric,value])=>({metric,value,label:labels[metric],title:SIGNALS[metric].warning,detail:SIGNALS[metric].detail,visual:SIGNALS[metric].visual}));
   if(criticalRisks(game,END_THRESHOLD).length){
     const [metric,value]=criticalRisks(game,END_THRESHOLD)[0],ending=ENDINGS[metric];
     return {kind:'collapse',metric,metricLabel:labels[metric],value,heading:ending.heading,description:ending.description,risks};
   }
   if(game.history.length&&game.history.every(x=>x.noVotes))return {kind:'undecided',heading:'誰も決めなかった街。',description:'すべての議題が無投票でした。街は変わらず、必要な判断が残っています。次の街で、何を誰に任せるか考えてみませんか。',risks};
   if(game.history.length&&game.history.every(x=>x.deferred))return {kind:'undecided',heading:'決めきれなかった街。',description:'同数票や無投票で、すべての計画を保留しました。異なる意見をどう確かめ、次の判断につなげますか。',risks};
   if(risks.length)return {kind:'warning',heading:'街は続く。課題も、残る。',description:risks.map(x=>x.label+' '+x.value).join('・')+' は警告水準です。便利さや成長の先で、誰の暮らしを支える対策が必要でしょう。',risks};
   if(trueRoleRoute(game))return {kind:'true',heading:'街を託す先を、考え抜いた。',
     description:game.storyMode==='solo'
       ?'診療所の通いやすさ・緑・防災を人が確かめ、電力の需要分析にAIを活用した。診療所の対応まで責任を持って実行し、6つの指標も守った。'
       :'住民の通院・防災・緑・学びを人が守り、電力と交通・仕事のデータ分析にはAIを活用した。案の実施だけでなく、街の6つの状態も守った。',
     risks};
   return {kind:'stable',heading:'街は続いていく。',description:'6つの指標は、いまはすべて30以上です。誰の声を聞き、何をAIに任せたのか。これからも確かめる責任は残ります。',risks};
 }
 // Generate a categorical three-metric forecast using exactly the real rules.
 // Never send numeric hidden deltas or hidden metric keys during play.
 const IMPACT_KEYS=['prosperity','convenience','appeal'];
 const impactMark=delta=>delta===0?'±0':
   (delta>0?'+':'−').repeat(Math.abs(delta)>=12?3:Math.abs(delta)>=5?2:1);
 function publicImpactPreview(game){
   const preview={};
   for(const choice of ['human','ai']){
     if(game.storyMode==='solo'&&choice==='human'){
       const variants=game.round===0
         ?['station','suburb'].flatMap(place=>['total','access'].map(reason=>({kind:'clinic',place,reason})))
         :game.round>0&&game.round<maxRounds(game)
           ?['voices','balance'].map(strategy=>({kind:'strategy',strategy}))
           :[];
       const outcomes=variants.map(detail=>{
         const simulated=copy(game);
         simulated.votes={forecast:choice};
         simulated.soloDetails[game.round]=detail;
         resolve(simulated,game.roundEndsAt);
         return IMPACT_KEYS.map(key=>simulated.public[key]-game.public[key]);
       });
       preview[choice]=Object.fromEntries(IMPACT_KEYS.map((key,i)=>{
         const signs=new Set(outcomes.map(row=>Math.sign(row[i])));
         return [key,signs.size===1?(signs.has(0)?'±0':signs.has(1)?'+':'−'):'±'];
       }));
       continue;
     }
     const simulated=copy(game);
     simulated.votes={forecast:choice}; // hypothetical unanimous choice
     resolve(simulated,game.roundEndsAt);
     preview[choice]=Object.fromEntries(IMPACT_KEYS.map(key=>
       [key,impactMark(simulated.public[key]-game.public[key])]));
   }
   return preview;
 }
 function publicState(game,token='',now=Date.now()){
   const n=tally(game);
   const online=Object.values(game.participants).filter(x=>now-x.lastSeen<90000).length;
   const safeLastEvent=game.lastEvent?{...game.lastEvent,crisisAverted:undefined,warningRecovered:undefined}:null;
   const data={phase:game.phase,cityStartedAt:game.createdAt,round:game.round,roundTotal:maxRounds(game),endsAt:game.phase==='active'?game.roundEndsAt:game.phase==='reveal'?game.revealEndsAt:0,public:copy(game.public),built:copy(game.built),participantCount:Object.keys(game.participants).length,onlineCount:online,isParticipant:!!game.participants[token],voteCount:n.human+n.ai,hasVoted:!!game.votes[token],myVote:game.votes[token]||null,lastEvent:safeLastEvent,outcome:game.outcome,alert:game.phase==='active'?publicWarning(game):null,incident:game.phase==='reveal'&&game.outcome==='collapse'?publicIncident(game):null,episode:game.phase==='active'?{...publicEpisode(episodeFor(game)),impactPreview:publicImpactPreview(game)}:null,history:game.phase==='reveal'?copy(game.history):game.history.map(x=>({round:x.round,heading:x.heading,agent:x.agent,result:x.result,human:x.human,ai:x.ai,chosen:x.chosen,intervened:!!x.intervened,interventionAttempted:!!x.interventionAttempted,noVotes:!!x.noVotes})),serverNow:now};
   const players=connected(game,now),player=game.participants[token];
   data.readyCount=players.filter(x=>x.ready).length;data.myReady=!!player?.ready;
   data.canStart=!!player&&canStart(game,now);
   data.joiningNextRound=game.phase==='active'&&!!player&&(player.eligibleFromRound||0)>game.round;
   data.canVote=game.phase==='active'&&!!player&&!data.joiningNextRound;
   if(game.phase==='reveal'){data.shadow=copy(game.shadow);data.ending=endingFor(game);}
   return data;
 }
 const publicEpisode=e=>({agent:e.agent,role:e.role,site:e.site,heading:e.heading,hint:e.hint,human:e.human,ai:e.ai,humanNow:e.humanNow,humanLater:e.humanLater,aiNow:e.aiNow,aiLater:e.aiLater});
 const API={EPISODES:EPISODES.map(publicEpisode),ENDING_METRICS:Object.freeze(Object.keys(ENDINGS)),INITIAL_PUBLIC,INITIAL_SHADOW,ROUND_MS,MAX_ROUNDS,REVEAL_MS,WARN_THRESHOLD,END_THRESHOLD,TRUE_METRIC_FLOOR,createGame,start,ready,join,vote,chooseSoloDetail,clinicResponse,advance,publicState};
 if(typeof module!=='undefined'&&module.exports)module.exports=API;
 global.MachiEngine=API;
})(typeof window!=='undefined'?window:globalThis);
