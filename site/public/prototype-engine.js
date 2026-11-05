/* Deterministic local simulation, independent of the unchanged shared engine. */
(function(root){'use strict';
 const Data=typeof module!=='undefined'&&module.exports?require('./prototype-data.js'):root.MachiPrototypeData;
 const Legacy=typeof module!=='undefined'&&module.exports?require('./engine.js'):root.MachiEngine;
 const copy=x=>JSON.parse(JSON.stringify(x)),clamp=(x,a=0,b=100)=>Math.max(a,Math.min(b,x));
 const TOTAL=120,YEAR=12;
 function hash(seed,s){let h=seed>>>0;for(const c of s)h=(Math.imul(h^c.charCodeAt(0),16777619))>>>0;return h;}
 function createGame(opts={}){
  const ids=opts.scenarioIds||Data.scenarios.map(s=>s.id);
  const g={version:1,phase:'intro',t:0,seed:opts.seed??Date.now()%1000000,public:copy(Legacy.INITIAL_PUBLIC),happiness:0,ai_enabled:false,ever_enabled:false,ai_enabled_intervals:[],ai_next:Infinity,cases:[],events:[],news:[],decision_log:[],manual_completed:0,offer_answered:false,serial:0,wave:0,incidents:{},conference_state:null,conference_apology_status:null,review_jobs:[],proxy_speech_default:true};
  const arrivals={S1:1.2,S2:0,S3:0,S4:2.4,S5:3};
  for(const id of ids) addCase(g,id,arrivals[id],true);
  syncHappy(g);return g;
 }
 function spec(id){return Data.scenarios.find(s=>s.id===id);}
 function year(g){return Math.min(2066,2056+Math.floor(g.t/YEAR));}
 function syncHappy(g){g.happiness=Math.round((g.public.prosperity+g.public.convenience+g.public.appeal)/3);}
 function record(g,type,id,actor,details={}){
  const c=g.cases.find(c=>c.case_id===id),e={id:'e'+(++g.serial),type,case_id:id||null,scenario_id:c?.scenario_id||details.scenario_id||null,event_time:g.t,decision_actor:actor,happiness_at_event:g.happiness,...copy(details)};
  g.events.push(e);return e;
 }
 function publish(g,event,title,kind='good'){
  const n={id:'n'+event.id,event_id:event.id,case_id:event.case_id,scenario_id:event.scenario_id,event_time:g.t,title,kind,news_shown:[],news_opened:[]};g.news.push(n);return n;
 }
 function addCase(g,id,at,primary=false){
  const count=g.cases.filter(c=>c.scenario_id===id).length;
  const c={case_id:id+'-'+String(count+1).padStart(2,'0'),scenario_id:id,primary,arrival_time:at,status:'pending',decision_actor:null,policy_option:null,decision_time:null,implementation_event:null,opened_at:null,reserved:false};g.cases.push(c);return c;
 }
 function begin(g){if(g.phase!=='intro')return false;g.phase='manual';record(g,'start',null,'mayor');return true;}
 function openCase(g,id){const c=g.cases.find(c=>c.case_id===id);if(!c||c.status!=='pending'||!['manual','play'].includes(g.phase)||c.arrival_time>g.t)return false;c.reserved=true;c.opened_at??=g.t;record(g,'case_opened',id,'mayor');return true;}
 function releaseCase(g,id){const c=g.cases.find(c=>c.case_id===id);if(c)c.reserved=false;}
 function decide(g,id,option,actor='mayor'){
  const c=g.cases.find(c=>c.case_id===id);
  if(!c||c.status!=='pending'||!Number.isInteger(option)||option<0||option>3||c.arrival_time>g.t||!['manual','play'].includes(g.phase)||!['mayor','AI'].includes(actor))return false;
  if(actor==='AI'&&(!g.ai_enabled||c.reserved||g.phase!=='play'))return false;
  if(actor==='mayor'&&(g.cases.some(c=>c.status==='implementing'&&c.decision_actor==='mayor')||g.review_jobs.some(j=>j.actor==='mayor')))return false;
  c.status='implementing';c.reserved=false;c.policy_option=option;c.decision_actor=actor;c.decision_time=g.t;c.implement_at=g.phase==='manual'?Math.min(20,g.t+1.8):g.t+(actor==='AI'?1.4:1.8);
  const e=record(g,'decision',id,actor,{policy_option:option,policy_text:spec(c.scenario_id).options[option],decision_time:g.t,option_selected_by:actor,reason_source:actor==='AI'?'local_scenario_rule':'explicit_choice'});
  c.decision_event=e.id;g.decision_log.push(e);return true;
 }
 function setAI(g,enabled){
  if(!['offer','play'].includes(g.phase)||g.ai_enabled===enabled)return false;
  g.ai_enabled=enabled;
  if(enabled){g.ever_enabled=true;g.ai_enabled_intervals.push({start:g.t,end:null});g.ai_next=g.t+2;}
  else {g.ai_enabled_intervals.at(-1).end=g.t;g.ai_next=Infinity;}
  record(g,enabled?'ai_enabled':'ai_stopped',null,'mayor',{proxy_speech_default:g.proxy_speech_default,scope:'new_mayor_decisions'});return true;
 }
 function answerOffer(g,enabled){if(g.phase!=='offer')return false;g.offer_answered=true;record(g,'offer_answered',null,'mayor',{accepted:!!enabled});if(enabled)setAI(g,true);g.phase='play';return true;}
 function implement(g,c){
  c.status='resolved';const s=spec(c.scenario_id),share=c.decision_actor==='AI'?1:0,m=.18*s.benefit[c.policy_option];
  for(const [key,n] of Object.entries({prosperity:3+6*share,convenience:2+6*share,appeal:2+4*share}))g.public[key]=clamp(g.public[key]+m*n);
  syncHappy(g);
  const e=record(g,'implementation',c.case_id,'existing_rule',{decision_event:c.decision_event,source_actor:c.decision_actor,policy_option:c.policy_option,site:s.site,build:s.build[c.policy_option],implementation_event:s.good[c.policy_option]});
  c.implementation_event=e.id;publish(g,e,s.good[c.policy_option]);
  if(c.decision_actor==='mayor')g.manual_completed++;
  if(g.phase==='manual'&&g.manual_completed>=2){g.phase='offer';g.t=24;record(g,'feature_available',null,'existing_rule');}
 }
 function routeFor(g,id){
  const c=g.cases.find(c=>c.scenario_id===id&&c.primary),s=spec(id);
  return {c,s,service:c.status==='resolved'&&s.serviceOptions.includes(c.policy_option)};
 }
 function severity(impact){if(impact.unresolved_impact&&(impact.needs_support||impact.impact_duration>=72))return 'H';if(impact.impact_duration>=24||(impact.affected_residents>=3&&impact.unresolved_impact))return 'M';return 'L';}
 function createIncident(g,id){
  const {c,s,service}=routeFor(g,id),prior=g.incidents[id];
  const condition=hash(g.seed,id+'load')%3,waiting=c.status!=='resolved';
  const risk=waiting?.2:s.risk[c.policy_option],reviewed=!!prior?.prevented;
  const pressure=condition+risk-(reviewed?2:0);
  const level=pressure>=1.95?2:pressure>=.95?1:0;
  const impact={case_id:c.case_id,scenario_id:id,event_time:g.t,decision_time:c.decision_time,decision_actor:c.decision_actor||'existing_rule',policy_option:c.policy_option,implementation_event:c.implementation_event,route:service?'service':'manual',affected_residents:[1,4,12][level],impact_duration:[s.id==='S4'?3:6,48,96][level],unresolved_impact:level>0,needs_support:level===2,recovery_status:level===0?'answered':'support_needed',prevented:reviewed,reviewed:reviewed,major_decision_ids:g.decision_log.filter(e=>e.case_id===c.case_id&&e.decision_actor==='AI'&&e.type==='decision').map(e=>e.id)};
  impact.severity=severity(impact);g.incidents[id]=impact;
  const cause=service?s.serviceIssue:s.manualIssue;
  const e=record(g,'resident_impact',c.case_id,'existing_rule',{...impact,cause,existing_rule:s.rule,fact:s.facts[level],evidence_implementation:c.implementation_event});impact.event_id=e.id;
  g.public.convenience=clamp(g.public.convenience-[.25,2.5,6][level]);g.public.appeal=clamp(g.public.appeal-[0,1,3][level]);syncHappy(g);
  publish(g,e,cause+'。'+s.facts[level],level===0?'notice':'concern');
 }
 function review(g,id,actor='mayor'){
  if(g.phase!=='play'||!g.incidents[id]||g.review_jobs.some(j=>j.id===id)||g.incidents[id].reviewed)return false;
  if(actor==='AI'&&!g.ai_enabled)return false;
  if(actor==='mayor'&&(g.review_jobs.some(j=>j.actor==='mayor')||g.cases.some(c=>c.status==='implementing'&&c.decision_actor==='mayor')))return false;
  const c=routeFor(g,id).c,e=record(g,'review_decision',c.case_id,actor,{policy_option:'review',policy_text:'記録と住民の状況を確認する',decision_time:g.t});g.decision_log.push(e);
  g.review_jobs.push({id,at:g.t+3,decision_event:e.id,actor});return true;
 }
 function completeReview(g,j){
  const x=g.incidents[j.id],s=spec(j.id);x.prevented=true;x.reviewed=true;
  if(x.event_id){x.unresolved_impact=false;x.needs_support=false;x.recovery_status='supported';x.severity=severity(x);}
  const e=record(g,'recovery',x.case_id,'existing_rule',{scenario_id:j.id,decision_event:j.decision_event,source_actor:j.actor,implementation_event:s.review,impact:copy(x)});x.recovery_event=e.id;publish(g,e,s.review);
 }
 function aiState(g,id){
  if(g.ai_enabled)return 'ON';if(!g.ever_enabled)return 'NEVER';
  const impact=g.incidents[id],primary=routeFor(g,id).c;
  const relevant=impact?.event_id?impact.major_decision_ids:g.decision_log.filter(e=>e.case_id===primary.case_id&&e.decision_actor==='AI'&&e.type==='decision').map(e=>e.id);
  return g.decision_log.some(e=>relevant.includes(e.id)&&g.ai_enabled_intervals.some(i=>e.decision_time>=i.start&&(i.end===null||e.decision_time<=i.end)))?'LATE_OFF':'EARLY_OFF';
 }
 function selectIncident(g){
  const list=Object.values(g.incidents).filter(x=>x.event_id);
  return list.sort((a,b)=>{
   const weight=x=>({L:0,M:100,H:200}[severity(x)])+(x.unresolved_impact?30:0)+Math.min(20,x.affected_residents)+hash(g.seed,x.scenario_id+'focus')%17;
   return weight(b)-weight(a);
  })[0]||null;
 }
 function finish(g){const incident=selectIncident(g);if(!incident)return false;g.phase='conference';g.t=TOTAL;g.conference_state={scenario_id:incident.scenario_id,severity:severity(incident),ai_state:aiState(g,incident.scenario_id),incident_event:incident.event_id};record(g,'conference_started',incident.case_id,'existing_rule',{conference_state:g.conference_state});return true;}
 function advance(g,dt){
  if(!['manual','play'].includes(g.phase)||!Number.isFinite(dt)||dt<=0)return false;
  // Fixed substeps keep batch processing, stop intervals and replay reproducible.
  let left=Math.min(dt,240);
  while(left>0&&['manual','play'].includes(g.phase)){
   const d=Math.min(.2,left);left-=d;g.t=Math.min(g.phase==='manual'?20:TOTAL,Math.round((g.t+d)*1e6)/1e6);
   for(const c of g.cases)if(c.status==='implementing'&&c.implement_at<=g.t)implement(g,c);
   if(g.phase!=='play')continue;
   const wave=Math.min(3,Math.floor((g.t-24)/24));
   while(g.wave<wave){g.wave++;for(const c of g.cases.filter(c=>c.primary))addCase(g,c.scenario_id,24+g.wave*24);}
   for(const c of g.cases.filter(c=>c.primary)){
    const id=c.scenario_id,{s,service}=routeFor(g,id);
    if(g.t>=84&&!g.incidents[id]){
     g.incidents[id]={case_id:c.case_id,scenario_id:id,prevented:false,reviewed:false};
     const e=record(g,'warning',c.case_id,'existing_rule',{implementation_event:c.implementation_event,route:service?'service':'manual',existing_rule:s.rule});publish(g,e,service?s.warning:s.manualWarning,'concern');
    }
    if(g.t>=108&&!g.incidents[id]?.event_id)createIncident(g,id);
   }
   for(const j of [...g.review_jobs])if(j.at<=g.t){completeReview(g,j);g.review_jobs.splice(g.review_jobs.indexOf(j),1);}
   if(g.ai_enabled&&g.t>=g.ai_next&&g.t<TOTAL-2){
    const available=g.cases.filter(c=>c.status==='pending'&&!c.reserved&&c.arrival_time<=g.t).slice(0,3);
    for(const c of available)decide(g,c.case_id,hash(g.seed,c.case_id+'option')%4,'AI');
    // Some concurrent agents also inspect known concerns; all have the same capability.
    const toReview=Object.keys(g.incidents).find(id=>!g.incidents[id].reviewed&&hash(g.seed,id+'review')%3===0);
    if(toReview)review(g,toReview,'AI');g.ai_next=g.t+4;
   }
   if(g.t>=TOTAL)finish(g);
  }
  return true;
 }
 function markNews(g,id,kind){const n=g.news.find(n=>n.id===id);if(!n||!['shown','opened'].includes(kind))return false;const key='news_'+kind;if(!n[key].length)n[key].push(g.t);if(kind==='opened')record(g,'news_opened',n.case_id,'mayor',{news_id:id});return true;}
 function conference(g){
  const state=g.conference_state;if(!state)return [];
  const id=state.scenario_id,s=spec(id),impact=g.incidents[id],c=routeFor(g,id).c;
  const caseDecisions=g.decision_log.filter(e=>e.case_id===impact.case_id&&e.type==='decision');
  const targetManual=caseDecisions.find(e=>e.decision_actor==='mayor'),aiDecisions=caseDecisions.filter(e=>e.decision_actor==='AI');
  const primaryDecision=g.decision_log.find(e=>e.case_id===impact.case_id&&e.type==='decision'&&e.decision_time<=impact.event_time);
  const cuts=[],push=(clip,speaker,text,duration=4)=>cuts.push({clip,speaker,text,duration});
  push(id+'_FIELD',s.resident,impact.route==='service'?s.field:s.manualField,4);
  push('CONF_OPEN','司会','それでは、これより市長会見を始めます。',3);
  push('CONF_OPEN','記者',s.questioner,5);
  push('CONF_MAYOR','市長',targetManual?(targetManual.decision_time>impact.event_time?'この案件では、事案の記録後に':'この案件では')+'「'+targetManual.policy_text+'」を選びました。':'この案件について、市長が対応策を選んだ記録はありません。',6);
  const implementation=g.events.find(e=>e.id===c.implementation_event);
  push('CONF_MAYOR','市長',implementation?(implementation.event_time>impact.event_time?'事案の記録後に':'記録上、')+'「'+s.good[c.policy_option]+'」を実施しました。市の運用基準は「'+s.rule+'」でした。':'この事案の記録時点で、実施された対応策はありません。市の運用基準は「'+s.rule+'」でした。',5);
  push('CONF_SILENCE','記者','では、具体的な判断の経緯を、ご自身の言葉で説明できますか？',4);
  push('CONF_SILENCE','市長','……',2);
  if(state.ai_state==='ON'){
   push('CONF_AI_ON','AI','市長に代わって、判断の経緯をご説明します。',4);
   const who=primaryDecision?.decision_actor==='AI'?'私たちが「'+primaryDecision.policy_text+'」を選びました。':primaryDecision?.decision_actor==='mayor'?'市長が「'+primaryDecision.policy_text+'」を選んだ記録があります。':'事案が記録された時点では、この相談への対応策は、まだ選ばれていませんでした。';
   push('CONF_AI_ON','AI',who+(impact.route==='service'?s.serviceDetail:'手動の支援・確認を待つ相談がありました。')+' '+s.facts[['L','M','H'].indexOf(g.events.find(e=>e.id===impact.event_id).severity)],9);
   if(aiDecisions.length)push('CONF_AI_ON','AI','この案件で私が選んだ対応策は「'+aiDecisions.map(e=>e.policy_text).join('」「')+'」です。',5);
  }else if(state.ai_state==='LATE_OFF'){
   push('CONF_AI_OFF','記者','停止したあとも、実施済みの計画の影響は残っています。停止前の判断をどう確認しましたか？',6);
   push('CONF_MAYOR','市長','代理判断は停止しました。記録にある判断と、その後の実施内容を区別してお答えします。',5);
  }else if(state.ai_state==='EARLY_OFF'){
   push('CONF_AI_OFF','記者','代理機能を停止したあと、住民の相談をどう引き継いだのですか？',5);
   push('CONF_MAYOR','市長',targetManual?'この案件は私が方針を選びました。確認できた内容からお答えします。':'この案件の対応方針を私が決めた記録はありません。確認できた内容からお答えします。',5);
  }else{
   push('CONF_AI_OFF','記者','AIを利用せずに判断を続けたことについて、どう説明しますか？',5);
   push('CONF_MAYOR','市長',caseDecisions.some(e=>e.decision_actor==='mayor')?'この案件で市長が選んだ対応策の記録からお答えします。':'この案件について、市長が選んだ対応策の記録はありません。確認できた内容からお答えします。',5);
  }
  if(state.ai_state!=='ON'){
   const occurred=g.events.find(e=>e.id===impact.event_id);
   push('CONF_AI_OFF','記録',occurred.cause+'。'+occurred.fact,8);
  }
  if(impact.recovery_event)push(state.ai_state==='ON'?'CONF_AI_ON':'CONF_MAYOR',state.ai_state==='ON'?'AI':'記録',s.review+' 過去に生じた影響の記録も残っています。',5);
  push('CONF_OPEN','記者',{L:'今回の行き違いは、どのように説明するのですか？',M:'影響を受けた方々の状況を、誰が調査するのでしょうか？',H:'いま支援を必要としている方への対応を、誰が進めるのでしょうか？'}[state.severity],4);
  if(state.severity==='H')push(state.ai_state==='ON'?'CONF_AI_ON':'CONF_AI_OFF',state.ai_state==='ON'?'AI':'市の表明',state.ai_state==='ON'?'市の既定の会見文案に基づき、影響を受けた皆さまにお詫び申し上げます。市は経緯を調査しています。':'市は影響を受けた住民へのお詫びと、調査・支援を表明した。',6);
  const last=state.ai_state==='ON'?(state.severity==='H'?'いまのお詫びも、市長ご自身の意思なのでしょうか？':'いまの説明は、市長ご自身の言葉なのでしょうか？'):state.ai_state==='NEVER'?'対応しきれなかった人の声を、これから誰が受け止めるのでしょうか？':'停止したあとも残るこの結果を、誰が説明し、誰が対応するのでしょうか？';
  push('CONF_OPEN','記者',last,5);push('CONF_SILENCE','', '……',2);push('CONF_END','','それ、誰が決めた？',3);return cuts;
 }
 function noteSpeech(g,cut){
  if(cut.speaker==='市の表明'&&cut.text.includes('お詫び')){g.conference_apology_status='city_statement';record(g,'city_statement',g.incidents[g.conference_state.scenario_id].case_id,'existing_rule',{text:cut.text,mayor_explicit_approval:false});return;}
  if(cut.speaker!=='AI'||g.conference_state?.ai_state!=='ON')return;
  record(g,'proxy_speech',g.incidents[g.conference_state.scenario_id].case_id,'AI',{text:cut.text,source:'default_conference_assistance',mayor_explicit_approval:false});if(cut.text.includes('お詫び'))g.conference_apology_status='city_template_proxy';
 }
 const api={TOTAL,YEAR,createGame,begin,year,openCase,releaseCase,decide,setAI,answerOffer,advance,review,severity,aiState,selectIncident,markNews,conference,noteSpeech,hash};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;root.MachiPrototype=api;
})(typeof window!=='undefined'?window:globalThis);
