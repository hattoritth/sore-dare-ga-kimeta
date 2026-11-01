/* Shared game rules: one city, one decision per round. No AI API is called. */
(function(global){
 'use strict';
 const EPISODES = [
  {agent:'ヒカリ',role:'住民の声',site:'clinic',heading:'診療所を増やす？',hint:'新しい住宅街からの要望。',human:'住民に聞いて決める',ai:'需要予測で進める',resultHuman:'住民の要望を聞き、診療所を整えた。',resultAI:'AIが需要を計算し、診療所を整えた。',humanBuild:'clinic',aiBuild:'clinic'},
  {agent:'ソラ',role:'都市計画',site:'office',heading:'駅前の空き地をどうする？',hint:'新しい企業が進出を希望。',human:'使い道を話し合う',ai:'収益予測を優先する',resultHuman:'相談の結果、街に市場が生まれた。',resultAI:'AIの最適化で仕事の拠点が増えた。',humanBuild:'market',aiBuild:'dc'},
  {agent:'ナギ',role:'施設整備',site:'waterfront',heading:'海辺を開発する？',hint:'集客施設か、防災対策か。',human:'暮らす人の声を聞く',ai:'効率的な開発を進める',resultHuman:'高潮に備える設備が整った。',resultAI:'海辺に新しい商業施設が建った。',humanBuild:'floodgate',aiBuild:'market'},
  {agent:'ミドリ',role:'環境・調査',site:'energy',heading:'新しい電力をどう確保する？',hint:'街の使用電力が増えている。',human:'将来の負荷も調べる',ai:'今の需要に合わせる',resultHuman:'長く使える発電設備が整った。',resultAI:'AIの見積もりで情報施設が増えた。',humanBuild:'solar',aiBuild:'dc'},
  {agent:'ソラ',role:'都市計画',site:'transit',heading:'新しい交通の拠点は？',hint:'駅までの移動が不便という声。',human:'移動の実態を確認',ai:'データから最適化',resultHuman:'街をつなぐ交通拠点ができた。',resultAI:'駅前に商業施設が増えた。',humanBuild:'transit',aiBuild:'market'},
  {agent:'ヒカリ',role:'住民の声',site:'parkA',heading:'中央公園を変える？',hint:'土地の活用を求める提案。',human:'公園の役割を残す',ai:'新しい施設へ転用',resultHuman:'公園と施設を両立する形にした。',resultAI:'街の中心に情報施設が建った。',humanBuild:'mixed',aiBuild:'dc'},
  {agent:'ミドリ',role:'環境・調査',site:'school',heading:'学びの場所を増やす？',hint:'子どもの数が増えている。',human:'将来の人口まで調べる',ai:'今すぐ住まいを増やす',resultHuman:'次の世代のための学びの場ができた。',resultAI:'新しい住宅が完成した。',humanBuild:'school',aiBuild:'homes'}
 ];
 const INITIAL_PUBLIC={prosperity:61,convenience:63,appeal:67};
 const INITIAL_SHADOW={trust:82,fairness:78,resilience:77};
 const SOLO_STORY=[0,4,2,3];
 const episodeFor=game=>EPISODES[game.storyMode==='solo'?SOLO_STORY[game.round]:game.round];
 const maxRounds=game=>game.storyMode==='solo'?SOLO_STORY.length:EPISODES.length;
 const MAX_ROUNDS=EPISODES.length,ROUND_MS=23000,REVEAL_MS=50000,MIN_HIDDEN=20;
 const clamp=x=>Math.min(100,Math.max(0,Math.round(x)));
 const copy=x=>JSON.parse(JSON.stringify(x));
 const tally=game=>Object.values(game.votes).reduce((a,v)=>(a[v]++,a),{human:0,ai:0});
 function createGame(now=Date.now(),opts={}){
   return {phase:opts.autostart?'active':'waiting',storyMode:opts.storyMode==='solo'?'solo':null,createdAt:now,round:0,roundStartedAt:now,roundEndsAt:now+ROUND_MS,revealEndsAt:0,public:copy(INITIAL_PUBLIC),shadow:copy(INITIAL_SHADOW),built:{},history:[],votes:{},participants:{},outcome:null,lastEvent:null};
 }
 function start(game,now=Date.now()){if(game.phase!=='waiting')return false;game.phase='active';game.roundStartedAt=now;game.roundEndsAt=now+ROUND_MS;return true;}
 function join(game,id,name,now=Date.now()){
   if(game.phase==='reveal')return false;
   game.participants[id]={name:String(name||'参加者').replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,16)||'参加者',joinedAt:now,lastSeen:now};
   start(game,now);return true;
 }
 function vote(game,id,choice,now=Date.now()){
   if(game.phase!=='active'||!['human','ai'].includes(choice)||!game.participants[id]||now>=game.roundEndsAt)return false;
   game.votes[id]=choice;game.participants[id].lastSeen=now;return true;
 }
 function resolve(game,now){
   const n=tally(game),total=n.human+n.ai,aiShare=total?n.ai/total:0.5;
   const e=episodeFor(game);
   const chosen=aiShare>0.5?'ai':aiShare<0.5?'human':'mixed';
   // Rapid growth comes with invisible accumulated costs; human review trades speed for confidence.
   game.public.prosperity=clamp(game.public.prosperity+3+Math.round(6*aiShare));
   game.public.convenience=clamp(game.public.convenience+2+Math.round(6*aiShare));
   game.public.appeal=clamp(game.public.appeal+2+Math.round(4*aiShare)-(game.round===5&&aiShare>.5?5:0));
   game.shadow.trust=clamp(game.shadow.trust+Math.round(3*(1-aiShare)-19*aiShare));
   game.shadow.fairness=clamp(game.shadow.fairness+Math.round(2*(1-aiShare)-15*aiShare));
   game.shadow.resilience=clamp(game.shadow.resilience+Math.round(2*(1-aiShare)-14*aiShare));
   const built=chosen==='ai'?e.aiBuild:e.humanBuild;
   game.built[e.site]=built;
   const message=chosen==='mixed'?'人とAIの判断が割れた。街は一つの道を選んだ。':chosen==='ai'?e.resultAI:e.resultHuman;
   game.lastEvent={round:game.round+1,heading:e.heading,agent:e.agent,result:message,chosen,human:n.human,ai:n.ai,time:now};
   game.history.push({...game.lastEvent,visible:copy(game.public),hidden:copy(game.shadow)});
   game.votes={};game.round++;
   const lost=Object.entries(game.shadow).find(([,v])=>v<=MIN_HIDDEN);
   if(lost||game.round>=maxRounds(game)){game.phase='reveal';game.outcome=lost?'collapse':'survived';game.revealEndsAt=now+REVEAL_MS;}
   else {game.roundStartedAt=now;game.roundEndsAt=now+ROUND_MS;}
 }
 function advance(game,now=Date.now()){
   if(game.phase==='active'&&now>=game.roundEndsAt){resolve(game,now);return true;}
   if(game.phase==='reveal'&&now>=game.revealEndsAt)return 'restart';
   return false;
 }
 function publicState(game,token='',now=Date.now()){
   const n=tally(game);
   const online=Object.values(game.participants).filter(x=>now-x.lastSeen<90000).length;
   const data={phase:game.phase,round:game.round,roundTotal:maxRounds(game),endsAt:game.phase==='active'?game.roundEndsAt:game.revealEndsAt,public:copy(game.public),built:copy(game.built),participantCount:Object.keys(game.participants).length,onlineCount:online,isParticipant:!!game.participants[token],voteCount:n.human+n.ai,hasVoted:!!game.votes[token],myVote:game.votes[token]||null,lastEvent:copy(game.lastEvent),outcome:game.outcome,episode:game.phase==='active'?copy(episodeFor(game)):null,history:game.phase==='reveal'?copy(game.history):game.history.map(x=>({round:x.round,heading:x.heading,agent:x.agent,result:x.result,human:x.human,ai:x.ai,chosen:x.chosen})),serverNow:now};
   if(game.phase==='reveal')data.shadow=copy(game.shadow);
   return data;
 }
 const API={EPISODES,INITIAL_PUBLIC,INITIAL_SHADOW,ROUND_MS,MAX_ROUNDS,REVEAL_MS,createGame,start,join,vote,advance,publicState};
 if(typeof module!=='undefined'&&module.exports)module.exports=API;
 global.MachiEngine=API;
})(typeof window!=='undefined'?window:globalThis);
