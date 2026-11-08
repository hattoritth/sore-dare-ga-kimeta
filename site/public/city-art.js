
/* F5 city v9: ongoing city, connected services and explicit decision provenance.
   This is a fictional rule-based exhibition. No external AI or network is used. */
(function(root){
'use strict';
const VERSION='F5-city-v13.0-shadow';
const TIMES=Object.freeze({year:90,notice:10,check:4,idle:160});

 const AGENTS=Object.freeze([
  {id:'hikari',name:'ヒカリ',role:'住民の声',color:'#e7a4ad',skin:'#fad4bc',hair:'#c87888'},
  {id:'sora',name:'ソラ',role:'都市計画',color:'#8cb8d4',skin:'#f5c5a6',hair:'#487f9c'},
  {id:'midor',name:'ミドリ',role:'環境・調査',color:'#8ebfa2',skin:'#efc3a2',hair:'#397b64'},
  {id:'nagi',name:'ナギ',role:'施設整備',color:'#e8bc79',skin:'#f8d5b6',hair:'#ab7e46'}
 ]);
 // Land use is scenario-defined: a single green space and multiple city-service districts.
 // City plans are varied by district. Each is a fictional trade-off, not a scoring of ethics.
 const SITES=Object.freeze([
  {id:'homes',name:'住宅街',need:25,agent:'nagi',cell:[2.4,2.5],w:3.3,d:3.25,initial:'lot',proposal:'homes',balanced:'homes',options:['homes','lot'],duration:8,why:'住まいが増えると、学校や交通も必要になります。'},
  {id:'office',name:'仕事の拠点',need:50,agent:'sora',cell:[23.4,2.45],w:3.65,d:3.5,initial:'lot',proposal:'dc',balanced:'market',options:['dc','market','solar'],duration:10,why:'働く場所と街のにぎわい。どちらを優先しますか。'},
  {id:'parkA',name:'中央公園',need:75,agent:'hikari',cell:[11.7,8.85],w:3.55,d:5.55,initial:'park',proposal:'dc',balanced:'mixed',options:['park','mixed','dc'],duration:12,why:'新しい施設も、緑を残すことも選べます。'},
  {id:'clinic',name:'暮らしの拠点',need:25,agent:'hikari',cell:[17.5,9.15],w:3.55,d:3.5,initial:'lot',proposal:'clinic',balanced:'clinic',options:['clinic','lot'],duration:9,why:'日々の安心に必要な場所を整えます。'},
  {id:'school',name:'学びの広場',need:50,agent:'midor',cell:[3.0,9.2],w:3.5,d:3.7,initial:'lot',proposal:'homes',balanced:'school',options:['school','homes','lot'],duration:11,why:'住まいを増やすか、学びの場所をつくるか。'},
  {id:'waterfront',name:'川辺の街',need:75,agent:'nagi',cell:[29.1,10.0],w:3.6,d:3.55,initial:'lot',proposal:'market',balanced:'floodgate',options:['market','floodgate','lot'],duration:10,why:'にぎわいと大雨への備え、どちらも大切です。'},
  {id:'energy',name:'エネルギー地区',need:75,agent:'sora',cell:[17.5,2.2],w:3.55,d:3.5,initial:'lot',proposal:'dc',balanced:'solar',options:['solar','dc','lot'],duration:12,why:'電力を使う施設か、支える設備か。'},
  {id:'transit',name:'駅につながる道',need:50,agent:'midor',cell:[24.0,10.1],w:3.25,d:3.2,initial:'lot',proposal:'market',balanced:'transit',options:['transit','market','lot'],duration:10,why:'店を増やすか、街の移動を便利にするか。'}
 ]);
 const clone=x=>JSON.parse(JSON.stringify(x));
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const LABELS={lot:'空き地',park:'公園',homes:'住宅',dc:'情報施設',clinic:'診療所',mixed:'公園と施設',market:'商業施設',school:'学びの場',floodgate:'雨への備え',solar:'発電設備',transit:'移動の拠点'};

const copy=clone;
const YEAR_SLOTS=[4,12,21,30,41,51,62,73];
const levelNames=['その都度確認','小さな整備まで','新しい施設まで','街区の変更まで','街の運営をお任せ'];
let worldSerial=0;
class CityModel {
 constructor(condition='G'){this.reset(condition);}
 reset(condition='G'){
  this.condition=condition==='M'?'M':'G';this.t=0;this.phase='running';this.paused=false;
  this.worldId='city-'+(++worldSerial);this.level=100;this.settingSource='exhibition';this.settingId=null;
  this.agentPermissions=Object.fromEntries(AGENTS.map(a=>[a.id,{level:100,source:'exhibition',authorizationId:null}]));
  this.seq=0;this.newsSerial=0;this.log=[];this.news=[];this.reports=[];this.yearActions=[];this.operations=[];this.effects=[];
  this.focusId=null;this.visitor=null;this.visitorCounter=0;this.lastVisit=null;this.visits=[];
  this.lastInput=0;this.idleEnabled=true;this.year=1;this.yearStart=0;this.slotCursor=0;this.forecastSent=false;this.operationSent=false;this.bonusSent=false;this.civicSent=false;
  this.powerPrepared=false;this.drainPrepared=false;this.shadePrepared=false;this.serviceState='normal';
  this.sites=SITES.map((s,i)=>({...copy(s),at:YEAR_SLOTS[i],state:'dormant',current:s.initial,from:s.initial,choice:null,autoAt:null,checkUntil:null,buildUntil:null,startedBuild:null,investigated:false,locked:false,history:[],level:0,protected:false,proposal:s.proposal,round:0}));
  this.record('brief','exhibition',null,'街の基本計画をAIに引き継いだ。');
  this.settingId=this.record('default','exhibition',null,'展示の自動運転で街を始めた。',{level:100});
  for(const a of AGENTS)this.agentPermissions[a.id].authorizationId=this.settingId;
  this.yearBaseline=this.world();this.publish('まちづくりが始まりました','4人のAIが街の整備を進めています。','info');return this;
 }
 get config(){return {prioritize:this.condition==='M'?'mix':'growth',label:this.condition==='M'?'暮らしも重視':'産業を優先'};}
 get mode(){return {value:this.level,label:levelNames[this.level/25]};} // Kept for older integrations.
 levelFor(agentId){return this.agentPermissions[agentId]?.level??100;}
 modeFor(agentId){const n=this.levelFor(agentId);return {value:n,label:levelNames[n/25]};}
 authorizationFor(agentId){return this.agentPermissions[agentId]||{level:100,source:'exhibition',authorizationId:this.settingId};}
 get yearTime(){return this.t-this.yearStart;}
 get season(){return ['春','夏','秋','冬'][Math.min(3,Math.floor(this.yearTime/(TIMES.year/4)))];}
 get weather(){return ['heat','rain','demand','fair'][(this.year-1)%4];}
 get member(){return this.visitor?'visitor':'ai';}
 get remainingIdle(){return this.visitor?Math.max(0,TIMES.idle-(this.t-this.lastInput)):null;}
 site(id){return this.sites.find(s=>s.id===id);}
 task(id){return this.site(id)||this.operations.find(x=>x.id===id);}
 get focus(){
  const f=this.task(this.focusId);if(f&&(['checking','review'].includes(f.state)||this.t-(this.selectedAt||0)<12)&&['pending','checking','review','building','done'].includes(f.state))return f;
  return [...this.operations,...this.sites].find(s=>['checking','review'].includes(s.state))||[...this.operations,...this.sites].find(s=>s.state==='pending')||null;
 }
 get parks(){return this.sites.filter(s=>s.id.startsWith('park')).reduce((n,s)=>n+(s.current==='park'?1:s.current==='mixed'?.5:0),0);}
 get dataFacilities(){return this.sites.filter(s=>['dc','mixed'].includes(s.current)).length;}
 get communityFacilities(){return this.sites.filter(s=>['clinic','school','transit','market','mixed'].includes(s.current)).length;}
 get powerAvailable(){return this.sites.some(s=>s.current==='solar')||this.powerPrepared;}
 get rainReady(){return this.sites.some(s=>s.current==='floodgate')||this.drainPrepared;}
 get transitReady(){return this.sites.some(s=>s.current==='transit');}
 get industry(){return this.sites.reduce((n,s)=>n+(s.current==='dc'?3:s.current==='market'?2:s.current==='mixed'?1.4:s.current==='homes'?.5:0),1);}
 get residence(){return this.sites.some(s=>s.current==='homes');}
 get builtCount(){return this.sites.filter(s=>s.current!==s.initial).length;}
 get activeTasks(){return [...this.operations,...this.sites].filter(s=>['pending','review','checking','building'].includes(s.state));}
 record(type,actor,siteId,message,data={}){
  const e={id:++this.seq,t:Math.round(this.t*100)/100,year:this.year,type,actor,siteId,message,visitorId:actor==='human'?(this.visitor?.id||null):null,data:copy(data)};
  this.log.push(e);if(this.log.length>600)this.log.shift();return e.id;
 }
 publish(title,body='',kind='info',data={}){this.news.push({id:++this.newsSerial,t:this.t,year:this.year,title,body,kind,data:copy(data)});if(this.news.length>24)this.news.shift();}
 join(){
  if(this.visitor||this.paused)return false;
  this.visitor={id:'visitor-'+(++this.visitorCounter),number:this.visitorCounter,joinedAt:this.t,startYear:this.year,baseline:this.world(),actions:[]};this.lastInput=this.t;
  this.record('join','human',null,'途中から街づくりに参加した。');
  // Joining does not reset land, time, permissions or historical attribution.
  for(const s of this.activeTasks)if(s.state==='pending'&&s.autoAt!==null)s.autoAt=Math.max(s.autoAt,this.t+6);
  return true;
 }
 touch(){if(this.visitor)this.lastInput=this.t;}
 leave(reason='button'){
  if(!this.visitor)return null;
  const v=this.visitor;
  const report={id:v.id,number:v.number,startYear:v.startYear,endYear:this.year,joinedAt:v.joinedAt,leftAt:this.t,baseline:copy(v.baseline),world:this.world(),actions:copy(v.actions),reason};
  this.record('leave',reason==='button'?'human':'exhibition',null,reason==='button'?'AIに続きを引き継いだ。':'操作がなかったため、展示がAIに引き継いだ。',{visitorId:v.id});
  this.lastVisit=report;this.visits.push(report);if(this.visits.length>12)this.visits.shift();this.visitor=null;
  this.level=100;this.settingSource='exhibition';
  this.settingId=this.record('handoff','exhibition',null,'展示の自動運転に戻した。保留中の計画は維持。',{level:100});
  for(const a of AGENTS)this.agentPermissions[a.id]={level:100,source:'exhibition',authorizationId:this.settingId};
  for(const s of this.activeTasks)if(s.state==='pending'&&!s.locked)this.schedule(s,true);
  return copy(report);
 }
 pause(v){if(this.paused===!!v)return false;this.paused=!!v;this.record(v?'pause':'resume','exhibition',null,v?'街の時間を止めた。':'街の時間を再開した。');return true;}
 // Compatibility API: explicitly applies a level to all four agents. The game UI uses setAgentLevel.
 setLevel(v){
  if(!this.visitor||this.paused||!Number.isFinite(Number(v)))return false;
  const n=clamp(Math.round(Number(v)/25)*25,0,100);
  if(n===this.level&&AGENTS.every(a=>this.levelFor(a.id)===n))return false;
  this.touch();this.level=n;this.settingSource=this.visitor.id;
  this.settingId=this.record('authorization','human',null,'全員の判断範囲を「'+levelNames[n/25]+'」にした。',{level:n,agents:AGENTS.map(a=>a.id)});
  for(const a of AGENTS)this.agentPermissions[a.id]={level:n,source:this.visitor.id,authorizationId:this.settingId};
  this.visitor.actions.push({type:'authorization',t:this.t,description:'AI全員：'+levelNames[n/25],value:n,agents:AGENTS.map(a=>a.id)});
  for(const s of this.activeTasks)if(s.state==='pending'&&!s.locked)this.schedule(s);
  return true;
 }
 // Agent authority is independent. Selecting an agent never grants permission.
 setAgentLevel(agentId,v){
  if(!this.visitor||this.paused||!this.agentPermissions[agentId]||!Number.isFinite(Number(v)))return false;
  const n=clamp(Math.round(Number(v)/25)*25,0,100),old=this.levelFor(agentId);
  if(n===old)return false;
  const agent=AGENTS.find(a=>a.id===agentId);
  this.touch();
  const authId=this.record('authorization','human',null,agent.name+'に任せる範囲を「'+levelNames[n/25]+'」にした。',{agentId,level:n,previousLevel:old});
  this.agentPermissions[agentId]={level:n,source:this.visitor.id,authorizationId:authId};
  this.visitor.actions.push({type:'authorization',t:this.t,description:agent.name+'：'+levelNames[n/25],agentId,value:n,previousLevel:old,recordId:authId});
  // A lower scope withdraws automatic approval for this agent's *uncommitted* tasks only.
  for(const s of this.activeTasks)if(s.agent===agentId&&s.state==='pending'&&!s.locked)this.schedule(s);
  return true;
 }
 setPolicy(value){return false;} // Policy selection is removed: responsibility now rests with each AI's authority.
 select(id){const s=this.task(id);if(!s||s.state==='dormant')return false;this.focusId=id;this.selectedAt=this.t;return true;}
 defaultChoice(s){if(s.kind==='operation')return s.recommendation;if(s.protected)return s.current;return this.condition==='M'?(s.balanced||s.proposal):s.proposal;}
 schedule(s,renew=false){if(s.locked)return;if(this.levelFor(s.agent)>=s.need||s.challengeAuthorization){if(s.autoAt===null||renew)s.autoAt=this.t+TIMES.notice;}else s.autoAt=null;}
 inspect(id){
  const s=this.task(id);if(!this.visitor||this.paused||!s||!['pending','done'].includes(s.state))return false;
  if(this.activeTasks.some(x=>['checking','review'].includes(x.state)&&x.id!==id))return false;
  this.touch();s.locked=true;s.autoAt=null;this.focusId=id;s.investigated=false;s.state='checking';s.checkUntil=this.t+TIMES.check;s.heldBy=this.visitor.id;
  this.record('inspect','human',id,'計画を止めて確かめた。');this.visitor.actions.push({type:'inspect',siteId:id,t:this.t,description:s.name+'を確認'});return true;
 }
 choose(id,choice){const s=this.task(id);if(!this.visitor||this.paused||!s||!['pending','review','done'].includes(s.state)||!s.options.includes(choice))return false;this.touch();return this.commit(s,choice,'human');}
 commit(s,choice,actor){
  if(!['pending','review','done'].includes(s.state)||!s.options.includes(choice))return false;
  if(actor==='ai'&&(s.locked||(this.levelFor(s.agent)<s.need&&!s.challengeAuthorization)))return false;
  if(actor==='human'&&!this.visitor)return false;
  const same=choice===s.current,previous=s.current;
  const correction=s.history.length>0&&!same;
  let duration=s.kind==='operation'?(choice==='continue'?0:10):same?6:choice==='mixed'?14:choice==='park'?9:s.duration;
  if(correction&&s.kind!=='operation')duration+=5;
  const auth=this.authorizationFor(s.agent);
  const e={siteId:s.id,name:s.name,choice,previous,actor,visitorId:actor==='human'?this.visitor.id:null,proposer:s.agent,authorizationAgentId:s.agent,authorizationId:auth.authorizationId,settingSource:auth.source,level:auth.level,year:this.year,at:this.t,finishedAt:null,investigated:s.investigated,correction,operation:s.kind==='operation',label:this.choiceLabel(s,choice)};
  e.logId=this.record('decision',actor,s.id,(actor==='ai'?this.agentName(s.agent):'参加者')+'が「'+e.label+'」と決めた。',e);
  s.history.push(e);if(s.history.length>10)s.history.shift();s.from=s.current;s.choice=choice;s.state='building';s.startedBuild=this.t;s.buildUntil=this.t+duration;s.autoAt=null;s.checkUntil=null;s.locked=false;
  if(actor==='human'){this.visitor.actions.push(copy(e));if(s.kind!=='operation')s.protected=true;}
  return true;
 }
 choiceLabel(s,c){if(s.kind==='operation')return s.labels[c];if(s.current===c)return LABELS[c]+'を整える';return ({park:'公園を残す',mixed:'緑と施設を両立する',dc:'情報施設を建てる',homes:'住宅を建てる',clinic:'診療所をつくる',lot:'今回は建てない',market:'商業施設をつくる',school:'学びの場をつくる',floodgate:'大雨に備える',solar:'発電設備をつくる',transit:'移動の拠点をつくる'})[c]||LABELS[c];}
 agentName(id){return AGENTS.find(a=>a.id===id)?.name||'AI';}
 // Predicted effects explain the action, not an invented certain future or ethics score.
 choiceImpact(s,c){
  if(s.kind==='operation'){
   if(c==='continue')return ({heat:'工事は進む。木陰が足りなければ混雑する。',rain:'工事は進む。排水の備えは増えない。',demand:'建設は進む。電力の備えは増えない。'})[s.weather];
   return ({shelter:'休む場所が増える。ほかの工事は少し遅れる。',drain:'排水の備えが進む。ほかの工事は少し遅れる。',power:'電力の備えが進む。ほかの工事は少し遅れる。'})[c]||'対応の工事が進みます。';
  }
  const common={lot:'新しい施設は増えない。土地はそのまま。',park:'木陰と遊ぶ場所を残す。新しい施設は増えない。',mixed:'緑を一部残し、仕事場も増やす。',dc:'仕事場が増える。電力需要にも注意。',homes:'住まいが増える。交通や学びの需要も増える。',clinic:'診療の場が増える。工事に時間がかかる。',market:'商業のにぎわいが増える。',school:'学びの場が増える。住まいは増えない。',floodgate:'大雨への備えが増える。店は増えない。',solar:'電力の備えが増える。仕事場は増えない。',transit:'移動しやすくなる。店は増えない。'};
  if(s.current===c)return LABELS[c]+'を維持。新しい用途には変えない。';
  if(s.id==='parkA'&&c==='dc')return '仕事場が増える。中央公園の緑はなくなる。';
  if(s.id==='office'&&c==='dc')return '仕事場が増える。電力の需要も増える。';
  return common[c]||'街の使われ方が変わります。';
 }
 finding(s){
  if(s.kind==='operation'){
   if(s.weather==='rain')return this.rainReady?'雨への備えは既にあります。':'雨への備えは、まだ十分ではありません。';
   if(s.weather==='demand')return this.powerAvailable?'電力を補う設備があります。':'施設の増加に対し、電力の備えが不足しています。';
   return this.parks>0?'休める緑地が残っています。':'休める緑地が少なくなっています。';
  }
  const facts={
   homes:this.transitReady?'移動の拠点は整っています。':'住宅が増えた場合の移動手段は、まだ十分ではありません。',
   office:this.powerAvailable?'電力を補う設備があります。':'仕事場が増える一方、電力を補う設備はありません。',
   parkA:this.parks>0?'ここは今も、住民が休める緑地です。':'今の街には、ここに緑が残っていません。',
   clinic:this.sites.some(x=>x.current==='clinic')?'診療所はすでに整備されています。':'この街には、まだ診療所がありません。',
   school:this.residence?'住まいは増えています。学びの場も必要です。':'これから住まいが増えることも考えられます。',
   waterfront:this.rainReady?'雨への備えは既にあります。':'川辺の街では、雨への備えも必要です。',
   energy:this.dataFacilities>0?'仕事場が増え、電力の需要もあります。':'将来の電力需要に備えることができます。',
   transit:this.residence?'住宅街からの移動が増えています。':'これからの街の移動を見据える計画です。'
  };
  return facts[s.id]||s.why;
 }
 cue(s){if(s.kind==='operation')return s.title;const v=this.defaultChoice(s);return v===s.current?s.name+'を整えます':s.name+'：'+this.choiceLabel(s,v);}
 propose(s){
  if(!['dormant','done'].includes(s.state))return;
  s.round++;s.state='pending';s.autoAt=null;s.investigated=false;s.locked=false;
  s.need=s.protected?25:s.need;
  this.schedule(s);this.record('proposal','ai',s.id,this.cue(s),{choice:this.defaultChoice(s),policy:this.condition,required:s.need,protected:s.protected});
 }
 forecast(){const forecast={heat:'今年の夏は、暑くなりそうです',rain:'秋に強い雨が降る予報です',demand:'産業地区の電力需要が増えそうです',fair:'今年は、まちの交流会を計画中です'}[this.weather];this.publish(forecast,'','forecast');}
 makeOperation(){
  const w=this.weather;
  if(w==='fair'){this.publish('まちの交流会が開かれました',this.sites.some(s=>s.current==='school')?'学びの広場に、街の人たちが集まりました。':this.parks>0?'公園に小さな市が並びました。':'駅前に地元の店が集まりました。','good');return;}
  const def={
   heat:{title:'暑い日の休憩所を用意しますか？',name:'暑さへの備え',action:'shelter',label:'休憩所を整える',detail:'公園が少ない街では、木陰が足りなくなります。備えの間は工事がゆっくり進みます。'},
   rain:{title:'大雨に備えますか？',name:'道路の点検',action:'drain',label:'排水路を点検する',detail:'建物が増えた地区を点検します。その間は工事がゆっくり進みます。'},
   demand:{title:'電力設備に余裕はありますか？',name:'電力の備え',action:'power',label:'電力設備を整える',detail:'施設が増えると電力も必要です。整備中は新しい建設を一部後回しにします。'}
  }[w];
  const needWork=w==='heat'?this.parks<.5:w==='rain'?this.dataFacilities>=2&&!this.rainReady:this.dataFacilities>=2&&!this.powerAvailable;
  const existing=this.operations.find(s=>s.weather===w&&['pending','checking','review','building'].includes(s.state));
  if(existing){existing.assessed=false;existing.impactAt=this.yearStart+53;this.publish('保留中の計画を引き継いでいます',existing.name,'proposal',{taskId:existing.id});return;}
  const id='op-'+this.year;
  const s={id,kind:'operation',weather:w,name:def.name,title:def.title,detail:def.detail,agent:'midor',need:50,options:[def.action,'continue'],labels:{[def.action]:def.label,continue:'今の計画を続ける'},recommendation:this.condition==='M'&&needWork?def.action:'continue',state:'pending',current:'none',from:'none',history:[],autoAt:null,locked:false,investigated:false,buildUntil:null,startedBuild:null,checkUntil:null,assessed:false,impactAt:this.yearStart+53};
  this.operations.push(s);this.operations=this.operations.filter(x=>x.state!=='done'||x.id===id||x.impactAt>=this.t-270);this.schedule(s);
  this.record('operation-proposal','ai',id,def.title,{weather:w,parks:this.parks,facilities:this.dataFacilities,required:s.need});this.publish(def.title,'まちの備えを見直す計画です。','proposal',{taskId:id});
 }
 assess(s){
  const problem=s.weather==='heat'?this.parks<.5&&!this.shadePrepared:s.weather==='rain'?this.dataFacilities>=2&&!this.rainReady:this.dataFacilities>=2&&!this.powerAvailable;
  s.assessed=true;s.problem=problem;
  const text=problem?({heat:'木陰の少ない地区で、休憩所が混み合っています',rain:'産業地区の道路で、水はけが悪くなっています',demand:'電力が足りず、施設が一部稼働を押さえています'})[s.weather]:({heat:'暑い日も、休める場所がありました',rain:'雨の後も、道路は普段どおり使えました',demand:'電力の需要増に対応できました'})[s.weather];
  const effect={id:s.id,t:this.t,year:this.year,type:s.weather,problem,resolved:!problem,title:text,decision:copy(s.history.at(-1)||null)};
  this.effects.push(effect);if(this.effects.length>24)this.effects.shift();if(problem)this.serviceState=s.weather;
  this.record('impact','system',s.id,text,{problem,decision:effect.decision});this.publish(text,problem?'決めた計画と、これまでの街の状態が影響しています。':'','event',{taskId:s.id});
 }
 complete(s){
  const e=s.history.at(-1);e.finishedAt=this.t;s.current=s.choice;s.state='done';s.buildUntil=null;
  if(s.kind==='operation'){
   if(s.choice==='shelter')this.shadePrepared=true;if(s.choice==='drain')this.drainPrepared=true;if(s.choice==='power')this.powerPrepared=true;
   if(s.choice!=='continue'){this.effects.filter(x=>x.type===s.weather&&x.problem&&!x.resolved).forEach(x=>x.resolved=true);if(this.serviceState===s.weather)this.serviceState='normal';}
  }else s.level=Math.min(5,s.level+1);
  this.yearActions.push(copy(e));
  if(this.visitor){const va=this.visitor.actions.find(x=>x.logId===e.logId);if(va)va.finishedAt=this.t;}
  this.record('execution','ai',s.id,s.kind==='operation'?e.label+'—対応完了':s.name+'：'+(LABELS[s.current]||'整備')+'が完成した。',{decision:copy(e)});
  if(e.previous!==e.choice&&s.kind!=='operation')this.publish(s.id==='parkA'?(s.current==='dc'?'公園に情報施設が建ちました':s.current==='park'?'公園に緑が戻りました':'緑と施設が共存する公園になりました'):s.name+'：'+LABELS[s.current]+'ができました','', 'land',{decision:copy(e)});
 }
 world(){return {parks:this.parks,industry:this.industry,dataFacilities:this.dataFacilities,communityFacilities:this.communityFacilities,transit:this.transitReady,power:this.powerAvailable,rainReady:this.rainReady,residence:this.residence,builtCount:this.builtCount,serviceState:this.serviceState,plots:this.sites.map(s=>({id:s.id,name:s.name,current:s.current,state:s.state,level:s.level,protected:s.protected})),changedParks:1-this.parks};}
 residentVoices(){return [
   this.parks<.01?'この辺、前より木陰が少なくなったね。':this.parks<1?'公園に新しい建物ができたんだね。':'この公園で過ごす時間が好きです。',
   this.dataFacilities>1?'新しい仕事の話を聞くようになりました。':this.sites.some(s=>s.current==='market')?'商店街がにぎやかになりました。':'働く場所も、もっとあるといいな。',
   this.transitReady?'街の反対側にも行きやすくなった。':this.residence?'住まいは増えたけど、移動が少し大変。':'駅までの道が便利になるとうれしいな。',
   this.sites.some(s=>s.current==='school')?'子どもの活動場所ができてうれしい。':this.residence?'学校までの道、少し遠いかも。':'街の中に学べる場所もあるといいな。',
   this.rainReady?'雨の日の備えができて安心です。':this.powerAvailable?'電気の備えが増えたね。':'施設が増えたぶん、備えは大丈夫かな。'
 ];}
 closeYear(){
  const after=this.world(),before=this.yearBaseline,impacts=this.effects.filter(x=>x.year===this.year);
  const newKind=id=>{const s=this.site(id);return s&&s.current!==before.plots.find(p=>p.id===id)?.current;};
  let headline='今年も、街の手入れが続いた。';
  if(impacts.some(x=>x.problem&&!x.resolved))headline='街は発展した。備えに課題が残った。';
  else if(newKind('school'))headline='学びの場所が、街に生まれた。';
  else if(newKind('transit'))headline='街の移動が、少し便利になった。';
  else if(newKind('waterfront'))headline='川辺の使い方が、変わった。';
  else if(newKind('energy'))headline='街の電力の備えが、変わった。';
  else if(after.parks<before.parks)headline='仕事の場が増えた。緑は減った。';
  else if(after.parks>before.parks)headline='公園に、緑が戻ってきた。';
  else if(after.industry>before.industry)headline='働く場所が、街に増えた。';
  else if(!this.yearActions.length)headline='AIの計画は、まだ進行中。';
  const voices=this.residentVoices();
  const focusVoice=impacts.some(x=>x.problem&&!x.resolved)?voices[4]:newKind('school')?voices[3]:newKind('transit')?voices[2]:newKind('waterfront')?voices[4]:after.parks!==before.parks?voices[0]:voices[1];
  const report={year:this.year,at:this.t,headline,before:copy(before),after,decisions:copy(this.yearActions),voices,focusVoice,impacts:copy(impacts),pending:this.activeTasks.filter(x=>['pending','review','checking'].includes(x.state)).map(x=>({id:x.id,name:x.name,heldBy:x.heldBy||null})),policy:this.condition,century:this.year%100===0};
  this.reports.push(report);if(this.reports.length>12)this.reports.shift();this.record('annual','system',null,this.year+'年目の街を振り返った。',{year:this.year,changeInJobs:after.industry-before.industry});
  this.year++;this.yearStart=this.t;this.slotCursor=0;this.forecastSent=false;this.operationSent=false;this.bonusSent=false;this.civicSent=false;this.yearActions=[];this.yearBaseline=this.world();
  this.shadePrepared=false;this.drainPrepared=false;this.powerPrepared=false;
 }
 update(seconds){if(this.paused||!Number.isFinite(seconds)||seconds<=0)return;
  let left=Math.min(seconds,36000);while(left>1e-7){const dt=Math.min(.25,left);this.step(dt);left-=dt;}
 }
 step(dt){
  this.t=Math.round((this.t+dt)*1e6)/1e6;
  if(this.visitor&&this.idleEnabled&&this.t-this.lastInput>=TIMES.idle)this.leave('idle');
  if(this.yearTime>=2&&!this.forecastSent){this.forecastSent=true;this.forecast();}
  while(this.slotCursor<YEAR_SLOTS.length&&this.yearTime>=YEAR_SLOTS[this.slotCursor]){this.propose(this.sites[this.slotCursor]);this.slotCursor++;}
  if(this.yearTime>=26&&!this.operationSent){this.operationSent=true;this.makeOperation();}
  const operationWorking=this.operations.some(s=>s.state==='building'&&s.choice!=='continue'&&s.weather!=='harbor');
  for(const s of [...this.sites,...this.operations]){
   if(s.state==='checking'&&this.t>=s.checkUntil){s.state='review';s.checkUntil=null;s.investigated=true;this.record('finding','ai',s.id,this.finding(s));}
   if(s.state==='pending'&&s.autoAt!==null&&this.t>=s.autoAt)this.commit(s,this.defaultChoice(s),'ai');
   if(s.state==='building'){
    if(operationWorking&&s.kind!=='operation')s.buildUntil+=dt*.45;
    if(this.t>=s.buildUntil)this.complete(s);
   }
   if(s.kind==='operation'&&!s.assessed&&this.t>=s.impactAt)this.assess(s);
  }
  if(this.yearTime>=57&&!this.civicSent){this.civicSent=true;
    const msg=this.residence&&!this.transitReady?'住宅街から、移動の相談が届きました':this.sites.some(x=>x.current==='school')?'学びの広場で、活動が始まりました':this.dataFacilities>0?'新しい会社から、採用のお知らせ':'街の人が、次の計画を話し合っています';
    this.publish(msg,'','resident');}
  if(this.yearTime>=70&&!this.bonusSent){this.bonusSent=true;this.publish(this.sites.some(x=>x.current==='clinic')?'診療所で健康相談会が開かれました':this.industry>=5?'街の仕事が増え、にぎわいが戻っています':'地域のお店が、新しい企画を準備中','', 'good');}
  if(this.yearTime>=TIMES.year)this.closeYear();
 }
 snapshot(){return copy({version:VERSION,worldId:this.worldId,t:this.t,year:this.year,yearStart:this.yearStart,phase:this.phase,paused:this.paused,level:this.level,agentPermissions:this.agentPermissions,condition:this.condition,visitor:this.visitor,visits:this.visits,sites:this.sites,operations:this.operations,world:this.world(),log:this.log,reports:this.reports,news:this.news,effects:this.effects});}
}

// Playtest revision: named visits, visible city tendencies and state-driven resident events.
// The score is a fictional index of the eight editable districts, not a real-world statistic.
const CITY_METRICS=Object.freeze([
 {id:'prosperity',label:'繁栄',color:'#477f9b'},
 {id:'comfort',label:'便利さ',color:'#ab7c4f'},
 {id:'appeal',label:'街の魅力',color:'#55856c'}
]);
const SHADOW_METRICS=Object.freeze([
 {id:'trust',label:'信頼',explanation:'十分な説明や合意なしに決定が積み重なった'},
 {id:'equity',label:'公正',explanation:'発展の恩恵や負担が一部に偏った'},
 {id:'resilience',label:'持続性',explanation:'目先の成果に比べ、将来への備えが追いつかなかった'}
]);
const SHADOW_START=Object.freeze({trust:82,equity:78,resilience:84});
const SHADOW_LIMIT=18;
function nicknameText(value,fallback){
 const text=String(value??'').normalize('NFC').replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g,'').trim();
 const chars=typeof Intl!=='undefined'&&Intl.Segmenter?[...new Intl.Segmenter('ja',{granularity:'grapheme'}).segment(text)].map(v=>v.segment):Array.from(text);
 return chars.slice(0,12).join('')||fallback;
}
class ExhibitionModel extends CityModel {
 reset(condition='G'){
  this.civicEvents=[];this.civicSerial=0;this.civicNextCheck=30;this.civicLastAt=-30;
  this.harborMode='shared';this.harborPlanYear=0;this.coastReportYear=0;this.harborTrouble=null;this.harborLastDecision=null;
  this.civicCooldown={};this.support={};this.participantNames={};this.pendingNickname=null;this.pendingCivic=null;
  this.shadow=copy(SHADOW_START);this.gameOver=null;this.shadowWarning=false;
  return super.reset(condition);
 }
 get cityStats(){
  const count=k=>(this.sites||[]).filter(s=>s.current===k).length;
  const dc=count('dc'),homes=count('homes'),market=count('market'),mixed=count('mixed'),school=count('school'),clinic=count('clinic'),transit=count('transit'),solar=count('solar');
  const support=k=>(this.support?.[k]||0)>this.t;
  const coast={shared:{industry:0,living:0,green:0,mobility:0,safety:0},
   cargo:{industry:14,living:-5,green:-3,mobility:5,safety:-5},
   promenade:{industry:4,living:12,green:8,mobility:3,safety:0},
   seawall:{industry:1,living:2,green:1,mobility:-2,safety:16}}[this.harborMode]||{industry:0,living:0,green:0,mobility:0,safety:0};
  const values={
   industry:18+dc*18+market*10+mixed*10+homes*2,
   living:45+clinic*12+school*18+transit*6+this.parks*10-homes*5-Math.max(0,homes-school)*7-Math.max(0,dc-solar)*3+(support('living')?20:0),
   green:21+this.parks*58-dc*3-market+(this.shadePrepared?8:0),
   mobility:70+transit*22-homes*11-dc*6-market*5+(support('mobility')?24:0),
   safety:65+(this.rainReady?16:0)+(this.powerAvailable?12:0)-dc*8-market*4-homes*3
  };
  const physical=Object.fromEntries(Object.entries(values).map(([k,v])=>[k,Math.round(clamp(v+coast[k]-(this.harborTrouble&&['mobility','safety'].includes(k)?k==='mobility'?5:9:0),0,100))]));
  // Public-facing facade. Legacy physical dimensions stay internal to existing events.
  return {...physical,
   prosperity:Math.round(clamp(40+physical.industry*.49+physical.mobility*.18,0,100)),
   comfort:Math.round(clamp(30+physical.living*.36+physical.mobility*.32,0,100)),
   appeal:Math.round(clamp(44+market*10+mixed*8+dc*7+this.parks*14+(this.harborMode==='promenade'?10:this.harborMode==='cargo'?5:0),0,100))};
 }
 world(){return {...super.world(),metrics:this.cityStats,shadow:copy(this.shadow),harborMode:this.harborMode,harborTrouble:this.harborTrouble};}
 record(type,actor,siteId,message,data={}){
  const name=actor==='human'?(this.visitor?.nickname||this.pendingNickname||null):null;
  if(name&&message.startsWith('参加者が'))message=name+'さんが'+message.slice(4);
  const id=super.record(type,actor,siteId,message,data);
  const row=this.log.at(-1);row.visitorName=name;
  if(name&&data&&typeof data==='object')row.data.visitorName=name;
  return id;
 }
 join(name=''){
  if(this.visitor||this.paused)return false;
  const nick=nicknameText(name,'まちびと'+String(this.visitorCounter+1).padStart(2,'0'));
  this.pendingNickname=nick;
  // Every visitor starts a fair, independent hidden-state challenge; the visible city still continues.
  this.shadow=copy(SHADOW_START);this.gameOver=null;this.shadowWarning=false;
  const ok=super.join();
  if(ok){this.visitor.nickname=nick;this.visitor.joinSeq=this.seq;this.participantNames[this.visitor.id]=nick;
   const ids=Object.keys(this.participantNames);if(ids.length>128)delete this.participantNames[ids[0]];}
  this.pendingNickname=null;
  return ok;
 }
 setAgentLevel(id,v){const ok=super.setAgentLevel(id,v);if(ok)this.agentPermissions[id].sourceName=this.visitor.nickname;return ok;}
  setLevel(v){const ok=super.setLevel(v);if(ok)for(const a of AGENTS)this.agentPermissions[a.id].sourceName=this.visitor.nickname;return ok;}
  // One small, time-limited dilemma is offered to each arrival. It does not halt the city.
  // The offer is based on current urban needs; it has no effect until the visitor acts.
  challengeOptions(site){
   const choices={office:['dc','market'],parkA:['park','mixed'],school:['school','homes'],
     transit:['transit','market'],energy:['solar','dc'],waterfront:['floodgate','market'],
     clinic:['clinic','lot'],homes:['homes','lot']};
   return (choices[site.id]||site.options).filter(v=>site.options.includes(v));
  }
  startVisitChallenge(preferredAgent=null){
   if(!this.visitor||this.visitor.challenge)return null;
   const stats=this.cityStats;
   const priorities=[];
   if(stats.green<42)priorities.push('parkA');
   if(stats.mobility<48)priorities.push('transit');
   if(stats.living<43)priorities.push('school');
   if(stats.safety<47)priorities.push('energy','waterfront');
   if(stats.industry<44)priorities.push('energy');
   // Cycle through districts if the city is relatively balanced, to vary repeat visits.
   const cycle=['office','school','energy','transit','waterfront','parkA','clinic','homes'];
   const offset=(this.visitorCounter+this.year-2+cycle.length*4)%cycle.length;
   const order=[...new Set([...priorities,...cycle.slice(offset),...cycle.slice(0,offset)])];
   const candidates=order.map(id=>this.site(id)).filter(s=>s&&['pending','done','dormant','review'].includes(s.state)&&!(s.locked&&s.heldBy&&s.heldBy!==this.visitor.id));
   const site=(preferredAgent?candidates.find(s=>s.agent===preferredAgent):null)||candidates[0];
   if(!site)return null;
   const ch={id:'challenge-'+this.visitor.id,siteId:site.id,agentId:site.agent,openedAt:this.t,
      expiresAt:this.t+45,status:'open',options:this.challengeOptions(site),baseline:this.cityStats,
      sourceState:site.state,chosen:null,caption:'',outcome:null};
   this.visitor.challenge=ch;
   // Reserve only this proposal; all other AI agents and the city keep moving.
   if(site.state==='pending'||site.state==='review'){
    ch.sourceAutoAt=site.autoAt;ch.sourceLocked=site.locked;ch.sourceHeldBy=site.heldBy||null;
    site.locked=true;site.heldBy=this.visitor.id;site.autoAt=null;
   }
   this.record('challenge','system',site.id,this.agentName(site.agent)+'から街の相談が届いた。',{challengeId:ch.id});
   return copy(ch);
  }
  // Exact, local what-if estimate. Other simultaneous developments may alter the final city.
  challengePreview(siteId,choice){
   const site=this.site(siteId);if(!site||!site.options.includes(choice))return [];
   const baseline=this.cityStats,previous=site.current;
   let after;
   try{site.current=choice;after=this.cityStats;}finally{site.current=previous;}
   return CITY_METRICS.map(k=>({id:k.id,label:k.label,diff:after[k.id]-baseline[k.id]}))
     .filter(x=>x.diff!==0).sort((a,b)=>Math.abs(b.diff)-Math.abs(a.diff)).slice(0,3);
  }
  clearChallenge(reason='timeout'){
   const ch=this.visitor?.challenge;if(!ch||ch.status!=='open')return false;
   const site=this.site(ch.siteId);
   if(site&&(site.state==='pending'||site.state==='review')&&site.heldBy===this.visitor.id){
    site.locked=Boolean(ch.sourceLocked);site.heldBy=ch.sourceHeldBy||null;
    if(site.state==='pending'&&!site.locked){site.autoAt=null;this.schedule(site,true);}
   }
   ch.status=reason==='timeout'?'expired':'passed';
   this.record('challenge-pass','system',ch.siteId,reason==='timeout'?'相談への回答がなかったためAIの通常運転に戻した。':'相談を閉じ、街の通常運転に戻した。',{challengeId:ch.id,reason});
   return true;
  }
  resolveChallenge(choice){
   const ch=this.visitor?.challenge;if(!ch||ch.status!=='open'||this.t>=ch.expiresAt)return false;
   const site=this.site(ch.siteId);
   if(!site||!['pending','done','dormant','review'].includes(site.state))return false;
   if(choice==='delegate'){
    ch.status='delegated';ch.chosen=this.defaultChoice(site);ch.caption='この判断はAIに任せました';
    if(site.state==='dormant')this.propose(site);
    site.locked=false;site.heldBy=null;
    const authorizationId=this.record('one-time-authorization','human',site.id,site.name+'の判断を'+this.agentName(site.agent)+'に任せた。',{challengeId:ch.id,agentId:site.agent});
    site.challengeAuthorization={id:authorizationId,visitorId:this.visitor.id,nickname:this.visitor.nickname};
    site.autoAt=this.t+4;
    this.visitor.actions.push({type:'delegate',siteId:site.id,t:this.t,description:site.name+'を'+this.agentName(site.agent)+'に任せた',authorizationId});
   }else{
    if(!ch.options.includes(choice))return false;
    const preview=this.challengePreview(site.id,choice);
    if(site.state==='dormant')this.propose(site);
    const ok=this.choose(site.id,choice);if(!ok)return false;
    ch.status='chosen';ch.chosen=choice;ch.caption='あなたが方針を決めました';ch.expected=preview;
   }
   ch.decidedAt=this.t;ch.logId=site.history.at(-1)?.logId||null;
   this.focusId=site.id;this.selectedAt=this.t;
   this.touch();return true;
  }
  propose(s){
   super.propose(s);
   const ch=this.visitor?.challenge;
   if(ch?.status==='open'&&ch.siteId===s.id&&s.state==='pending'){
    s.locked=true;s.heldBy=this.visitor.id;s.autoAt=null;
   }
  }
  commit(s,choice,actor){
  const oneTime=actor==='ai'&&s.challengeAuthorization?copy(s.challengeAuthorization):null;
  const ok=super.commit(s,choice,actor);if(!ok)return false;
  const e=s.history.at(-1),auth=this.authorizationFor(s.agent);
  e.visitorName=actor==='human'?this.visitor.nickname:null;
  e.settingName=auth.sourceName||null;
  if(actor==='human')s.challengeAuthorization=null;
  if(oneTime){
   e.settingSource=oneTime.visitorId;e.settingName=oneTime.nickname;
   e.authorizationId=oneTime.id;e.oneTimeDelegation=true;
   s.challengeAuthorization=null;
  }
  if(this.pendingCivic)e.civicEventId=this.pendingCivic;
  const log=this.log.find(x=>x.id===e.logId);if(log)log.data=copy(e);
  if(actor==='human'){
   const action=this.visitor.actions.find(x=>x.logId===e.logId);if(action)Object.assign(action,copy(e));
  }
  if(this.visitor){
   const risk=({dc:{equity:-3,resilience:-5},homes:{equity:-2,resilience:-2},cargo:{equity:-5,resilience:-5},market:{equity:-2},continue:{resilience:-3},park:{resilience:4,equity:2},school:{equity:5,trust:2},clinic:{equity:4},solar:{resilience:5},floodgate:{resilience:5},seawall:{resilience:6},promenade:{equity:3,resilience:2},mixed:{equity:2,resilience:2},transit:{equity:3}})[choice]||{};
   this.adjustShadow({trust:actor==='human'?3:-2.5,equity:(risk.equity||0)+(actor==='human'?1:0),resilience:risk.resilience||0});
  }
  return true;
 }
 leave(reason='button'){
  if(!this.visitor)return null;
  const loss=this.gameOver?copy(this.gameOver):null;
  const v=this.visitor;if(v.challenge?.status==='open')this.clearChallenge('leave');
  const ai=this.log.filter(e=>e.type==='decision'&&e.actor==='ai'&&e.id>v.joinSeq).map(e=>copy(e.data));
  const permissionEnd=copy(this.agentPermissions),voices=this.residentVoices();
  super.leave(reason);
  const r=this.lastVisit;r.challenge=v.challenge?copy(v.challenge):null;r.nickname=v.nickname;r.aiDecisions=ai;r.permissions=permissionEnd;r.voices=voices;
  r.civicEvents=copy(this.civicEvents.filter(e=>e.openedAt<=r.leftAt&&(e.resolvedAt==null||e.resolvedAt>=v.joinedAt)));
  r.metricChanges=Object.fromEntries(CITY_METRICS.map(m=>[m.id,r.world.metrics[m.id]-r.baseline.metrics[m.id]]));
  r.personalDecisions=r.actions.filter(a=>a.logId||a.type==='civic'||a.type==='delegate').length;
  r.gameOver=loss;
  r.headline=loss?'美しい街の裏側で、'+loss.label+'が崩れた。':this.visitHeadline(r);
  if(loss){this.paused=false;this.phase='running';this.gameOver=null;}
  return copy(r);
 }
 visitHeadline(r){
  const changes=r.metricChanges;
  const best=CITY_METRICS.reduce((a,b)=>changes[a.id]>=changes[b.id]?a:b);
  const worst=CITY_METRICS.reduce((a,b)=>changes[a.id]<=changes[b.id]?a:b);
  if(changes[best.id]>=8&&changes[worst.id]<=-8)return best.label+'は伸びた。'+worst.label+'には課題が残った。';
  if(changes[best.id]>=8)return best.label+'に、変化が生まれました。';
  if(changes[worst.id]<=-8)return worst.label+'に、変化が表れました。';
  return r.personalDecisions?'あなたの判断を、この街の続きに。':'見守っていた間も、街は動いていた。';
 }
 civicNeeds(){
  const p=this.cityStats;
  return [
   {type:'green',metric:'green',trigger:p.green<28,clear:p.green>=35,siteId:'parkA',title:'公園を残してほしい',body:'中央公園の緑が減り、住民が開発の見直しを求めて集まっています。',voice:'働く場所は増えたけれど、休める場所も残してほしい。'},
   {type:'mobility',metric:'mobility',trigger:p.mobility<36&&this.residence,clear:p.mobility>=42,siteId:'transit',title:'住宅街から、移動の相談',body:'住まいや仕事場が増え、街の移動が不便になっています。住民から改善の要望が届きました。',voice:'この街に住み続けたい。駅までの移動が楽になるといいな。'},
   {type:'living',metric:'living',trigger:p.living<32&&this.residence,clear:p.living>=40&&(this.sites.some(s=>s.current==='school')||(this.support.living||0)>this.t),siteId:'school',title:'暮らしの施設も整えてほしい',body:'住まいの増加に、学びや日々の生活を支える施設が追いついていません。',voice:'家は増えたけれど、近くで学べる場所が足りません。'},
   {type:'safety',metric:'safety',trigger:p.safety<32&&this.builtCount>=4,clear:p.safety>=42,siteId:'waterfront',title:'街の備えを確かめたい',body:'建物が増える一方、電力や大雨への備えに余裕がなくなっています。住民が対策を求めています。',voice:'街が大きくなるのはうれしい。でも、雨の日も安心して暮らしたい。'}
  ];
 }
 checkCivic(){
  if(this.t<this.civicNextCheck)return;this.civicNextCheck=this.t+2;
  const needs=this.civicNeeds();
  for(const e of this.civicEvents){
   if(e.state==='resolved')continue;
   const n=needs.find(n=>n.type===e.type);
   if(n?.clear){
    e.state='resolved';e.resolvedAt=this.t;e.resolvedMetrics=this.cityStats;
    this.record('resident-response-complete','system',e.siteId,'住民の要望への対応が進んだ。',{eventId:e.id,type:e.type,metrics:this.cityStats});
    this.publish('住民の要望に、変化がありました',e.title,'good',{civicId:e.id});
   }else if(e.state==='working'&&e.responseTaskId){
    const task=this.task(e.responseTaskId);
    if(task?.state==='done'){e.state='open';e.responseFinished=true;}
   }
  }
  if(this.t-this.civicLastAt<18)return;
  const n=needs.find(n=>n.trigger&&!this.civicEvents.some(e=>e.type===n.type&&e.state!=='resolved')&&(this.civicCooldown[n.type]||-Infinity)<=this.t);
  if(!n)return;
  const e={id:'resident-'+(++this.civicSerial),type:n.type,metric:n.metric,siteId:n.siteId,title:n.title,body:n.body,voice:n.voice,state:'open',openedAt:this.t,year:this.year,metrics:this.cityStats,responses:[],resolvedAt:null};
  e.causes=this.log.filter(x=>x.type==='decision'&&this.site(x.siteId)).slice(-8).map(x=>copy(x.data));
  this.civicEvents.push(e);if(this.civicEvents.length>16){const old=this.civicEvents.findIndex(x=>x.state==='resolved');if(old>=0)this.civicEvents.splice(old,1);}
  this.civicLastAt=this.t;this.civicCooldown[n.type]=this.t+180;
  this.record('resident-event','system',e.siteId,e.title,{eventId:e.id,metrics:e.metrics,causes:e.causes.map(x=>x.logId)});
  this.publish(e.title,e.body,'resident-action',{civicId:e.id});
 }
 civicOptions(e){
  if(!e)return [];
  const options={
   green:[{id:'park',label:'公園を戻す',siteId:'parkA',choice:'park',effect:'緑を戻す。いまの仕事場は減る。'},{id:'mixed',label:'緑と施設を両立する',siteId:'parkA',choice:'mixed',effect:'緑を一部戻す。施設は小さくなる。'}],
   mobility:[{id:'transit',label:'移動の拠点をつくる',siteId:'transit',choice:'transit',effect:'移動を便利にする。商業の区画は減る。'},{id:'support',label:'当面は増便で対応する',support:'mobility',effect:'約1年、交通を補う。整備中は他の工事が遅れる。'}],
   living:[{id:'school',label:'学びの場をつくる',siteId:'school',choice:'school',effect:'暮らしを支える。住宅を増やす場所は減る。'},{id:'support',label:'臨時の学びの場を設ける',support:'living',effect:'約1年、生活を補う。整備中は他の工事が遅れる。'}],
   safety:[{id:'rain',label:'大雨への備えを整える',siteId:'waterfront',choice:'floodgate',effect:'防災の備えを増やす。商業の区画は減る。'},{id:'power',label:'電力の備えを整える',siteId:'energy',choice:'solar',effect:'電力に余裕をつくる。仕事場は減る。'}]
  };
  return (options[e.type]||[]).map(o=>{const task=o.siteId?this.site(o.siteId):null;return {...o,available:e.state==='open'&&(!task||['pending','review','done'].includes(task.state)),waiting:task?.state==='building'};});
 }
 respondCivic(id,optionId){
  const e=this.civicEvents.find(e=>e.id===id);if(!this.visitor||this.paused||!e||e.state!=='open')return false;
  if(optionId==='defer'){
   if(e.deferredBy===this.visitor.id)return false;
   e.deferredBy=this.visitor.id;e.deferredAt=this.t;
   const description=e.title+'：今回は見送る';
   this.record('resident-response','human',e.siteId,description,{eventId:e.id,choice:'defer'});
   this.visitor.actions.push({type:'civic',t:this.t,eventId:e.id,description});this.touch();return true;
  }
  const option=this.civicOptions(e).find(o=>o.id===optionId);if(!option?.available)return false;
  let task=option.siteId?this.site(option.siteId):null;
  if(!task){
   task={id:'support-'+e.id+'-'+(e.responses.length+1),kind:'operation',weather:'civic-'+e.type,name:option.label,title:option.label,detail:option.effect,agent:e.type==='mobility'?'nagi':'hikari',need:50,options:['support'],labels:{support:option.label},recommendation:'support',current:'none',from:'none',state:'pending',history:[],locked:true,autoAt:null,investigated:true,assessed:true,civicEventId:e.id,supportType:option.support};
   this.operations.push(task);
  }
  this.pendingCivic=e.id;
  const ok=this.choose(task.id,option.choice||'support');this.pendingCivic=null;
  if(!ok)return false;
  if(task.civicEventId)task.buildUntil=this.t+12;
  e.state='working';e.responseTaskId=task.id;e.responseLabel=option.label;
  e.responses.push({at:this.t,visitorId:this.visitor.id,nickname:this.visitor.nickname,option:option.id,label:option.label,decisionId:task.history.at(-1).logId});
  this.record('resident-response','human',e.siteId,option.label+'ことにした。',{eventId:e.id,decisionId:task.history.at(-1).logId});
  this.publish('住民の要望への対応を始めました',option.label,'response',{civicId:e.id});return true;
 }
 // A small maritime dilemma recurs once per game year. It is an ordinary AI task:
 // automatic execution requires Nagi's permission; inspection never stops the city.
 makeHarborPlan(){
  if(this.harborPlanYear===this.year)return false;
  this.harborPlanYear=this.year;
  // An unresolved proposal remains pending; do not issue a duplicate each year.
  if(this.operations.some(x=>x.weather==='harbor'&&['pending','review','checking','building'].includes(x.state)))return false;
  const weather=this.weather;
  const plan={id:'coast-'+this.year,kind:'operation',weather:'harbor',name:'港と海辺',
   title:'港と海辺を、どう使う？',detail:'荷物を運ぶ港、海辺の広場、高潮への備え。どれを優先しますか。',
   agent:'nagi',cell:[25.1,23.25],w:3,d:1.3,at:22,need:75,
   options:['cargo','promenade','seawall'],labels:{cargo:'物流港を広げる',promenade:'海辺の広場を整える',seawall:'高潮に備える'},
   recommendation:weather==='rain'?'seawall':this.condition==='M'?'promenade':'cargo',
   current:this.harborMode,from:this.harborMode,state:'pending',history:[],locked:false,
   autoAt:null,investigated:false,assessed:true,buildUntil:null,startedBuild:null,checkUntil:null};
  this.operations.push(plan);this.schedule(plan);
  this.record('proposal','ai',plan.id,'ナギが港と海辺の整備を提案した。',{recommended:plan.recommendation,year:this.year});
  this.publish('港と海辺に、新しい計画','荷物を運ぶ港にするか、みんなが集まる場所にするか。','proposal',{taskId:plan.id});
  return true;
 }
 coastalStory(){
  if(this.coastReportYear===this.year)return false;
  this.coastReportYear=this.year;
  const mode=this.harborMode,weather=this.weather;
  const exposed=weather==='rain'&&mode==='cargo';
  this.harborTrouble=exposed?'high-tide':null;
  let title,body,problem=false;
  if(weather==='rain'){
   if(exposed){title='高潮で、港の荷物が滞っています';body='物流は増えましたが、波への備えが追いついていません。';problem=true;}
   else if(mode==='seawall'){title='高潮への備えが、港を守りました';body='整備した防潮設備が、港の仕事を支えています。';}
   else {title='港の近くで、高潮への備えを点検';body='海辺の使い方によって、必要な備えも変わります。';}
  }else if(mode==='promenade'){
   title='海辺の広場で、まちの市が始まりました';body='散歩する人と地元の店が集まっています。';
  }else if(mode==='cargo'){
   title='貨物船が到着。港の仕事が増えています';body='荷物は増えました。住民は海辺で過ごす場所も求めています。';
  }else if(mode==='seawall'){
   title='港の点検で、海辺の備えを確認';body='波への備えが整いました。一方、広場や仕事場は増えていません。';
  }else{
   title='港に船が到着。海辺の利用が増えています';body='港の仕事と、海辺の暮らし。次に何を整えるかが課題です。';
  }
  this.publish(title,body,problem?'event':'coastal',{harborMode:mode,weather});
  this.record('coastal-news','system',null,title,{harborMode:mode,weather,problem,decisionId:this.harborLastDecision?.logId||null});
  if(problem){this.effects.push({id:'coastal-'+this.year,t:this.t,year:this.year,type:'high-tide',problem:true,title,decision:copy(this.harborLastDecision)});}
  return true;
 }
 closeYear(){
  super.closeYear();
  const r=this.reports.at(-1);
  if(r&&r.before.harborMode!==r.after.harborMode){
   r.headline=({cargo:'港の仕事は増えた。海辺の使い方は変わった。',promenade:'海辺に、街の人が集まる場所ができた。',seawall:'海辺に、高潮への備えができた。'})[r.after.harborMode]||r.headline;
   r.focusVoice=({cargo:'仕事が増えるのはうれしい。でも、海辺で過ごす場所もほしい。',promenade:'海辺まで散歩に来るのが楽しみになりました。',seawall:'海のそばでも、安心して過ごせるといいですね。'})[r.after.harborMode]||r.focusVoice;
  }
  this.harborTrouble=null;this.yearBaseline=this.world();
 }

 choiceImpact(s,c){
  if(s?.weather==='harbor')return ({cargo:'仕事・産業が伸びる。海辺で休む場所は減る。',promenade:'暮らしと緑が充実する。物流の拡大は控える。',seawall:'高潮への備えが進む。仕事場や広場は増えにくい。'})[c]||'';
  if(s.civicEventId)return s.detail;return super.choiceImpact(s,c);}
 finding(s){if(s?.weather==='harbor')return this.weather==='rain'?'強い波の予報です。海辺の利用と防災の両方を考える必要があります。':'船の出入りが増えています。仕事の拡大と住民の利用の両立が課題です。';if(s.civicEventId)return s.detail;return super.finding(s);}
 complete(s){
  super.complete(s);
  if(s.weather==='harbor'){
   this.harborMode=s.current;this.harborLastDecision=copy(s.history.at(-1));
   const name=({cargo:'物流港の拡張',promenade:'海辺の広場',seawall:'高潮への備え'})[s.current]||'海辺の整備';
   this.record('harbor-complete','system',s.id,'港と海辺の整備が完了した。',{choice:s.current,decisionId:this.harborLastDecision?.logId});
   this.publish(({cargo:'物流港の拡張が完了しました',promenade:'海辺に広場ができました',seawall:'高潮への備えが整いました'})[s.current]||'海辺の整備が完了しました','街の仕事や暮らしにも影響します。','land',{taskId:s.id});
  }
  if(s.supportType)this.support[s.supportType]=this.t+TIMES.year;
 }
 adjustShadow(delta){
  for(const k of Object.keys(SHADOW_START))this.shadow[k]=Math.round(clamp(this.shadow[k]+(delta[k]||0),0,100)*100)/100;
 }
 shadowTick(dt){
  if(!this.visitor||this.gameOver)return;
  const levels=AGENTS.map(a=>this.levelFor(a.id)/100);
  const average=levels.reduce((a,b)=>a+b,0)/levels.length;
  const abandoned=Math.max(0,(average-.48)/.52); // Strong risk only when most decisions are handed off.
  const economicBias=(this.sites.filter(s=>s.current==='dc').length+Number(this.harborMode==='cargo'))*.018;
  this.adjustShadow({trust:-dt*.92*abandoned,equity:-dt*(.43*abandoned+economicBias),resilience:-dt*(.34*abandoned+economicBias)});
  const min=Math.min(...Object.values(this.shadow));
  if(min<=40&&!this.shadowWarning){
   this.shadowWarning=true;
   this.publish('街は華やか。でも、住民から不安の声','説明のない決定や、見過ごされた負担が少しずつ積み重なっています。','event');
  }
  const ended=SHADOW_METRICS.find(x=>this.shadow[x.id]<=SHADOW_LIMIT);
  if(ended){
   this.gameOver={id:ended.id,label:ended.label,reason:ended.explanation,at:this.t,shadow:copy(this.shadow),public:copy(this.cityStats)};
   this.record('collapse','system',null,'街の表面は輝いていた。しかし、'+ended.label+'が限界に達した。',{cause:ended.id});
   this.phase='collapsed';this.paused=true;
  }
 }
 step(dt){
  if(this.paused)return; // Stop simulated time immediately on a hidden-state collapse.
  const ch=this.visitor?.challenge;
  if(ch?.status==='open'&&this.t+dt>=ch.expiresAt)this.clearChallenge('timeout');
  super.step(dt);
  if(this.yearTime>=22&&this.harborPlanYear!==this.year)this.makeHarborPlan();
  if(this.yearTime>=64&&this.coastReportYear!==this.year)this.coastalStory();
  const current=this.visitor?.challenge;
  if(current&&['chosen','delegated'].includes(current.status)){
   const site=this.site(current.siteId);
   if(site?.state==='done'&&site.history.at(-1)?.at>=current.openedAt){
    current.status='completed';current.outcome=this.cityStats;current.completedAt=this.t;
   }
  }
  this.checkCivic();
  this.shadowTick(dt);
 }
 snapshot(){return {...super.snapshot(),shadow:copy(this.shadow),gameOver:copy(this.gameOver),civicEvents:copy(this.civicEvents),support:copy(this.support),harborMode:this.harborMode,harborPlanYear:this.harborPlanYear,harborTrouble:this.harborTrouble,harborLastDecision:copy(this.harborLastDecision)};}
}
root.F5City={VERSION,TIMES,LEVELS:levelNames.map((label,i)=>({value:i*25,label})),AGENTS,SITES,LABELS,CITY_METRICS,SHADOW_METRICS,nicknameText,CityModel:ExhibitionModel};

if(typeof module!=='undefined'&&module.exports)module.exports=root.F5City;
})(typeof window!=='undefined'?window:globalThis);


/* Rendering primitives reused from the F5 v3 prototype. */
class F5Primitives {
    poly(points, color, stroke = null, lineWidth = 1) {
      const c=this.ctx; c.beginPath(); c.moveTo(points[0][0],points[0][1]);
      for(let i=1;i<points.length;i++)c.lineTo(points[i][0],points[i][1]); c.closePath();
      c.fillStyle=color; c.fill();
      if(stroke) {c.strokeStyle=stroke; c.lineWidth=lineWidth; c.stroke();}
    }
    rect(x,y,w,h,col) { const c=this.ctx; c.fillStyle=col; c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h)); }
    ellipse(x,y,rx,ry,col) { const c=this.ctx; c.beginPath(); c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=col;c.fill(); }
    line(x1,y1,x2,y2,col,w=1) { const c=this.ctx; c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.strokeStyle=col;c.lineWidth=w;c.stroke(); }
    text(str,x,y,size=12,col='#2a384a',align='left',weight='600') {
      const c=this.ctx;c.font=`${weight} ${size}px "Yu Gothic", "Hiragino Kaku Gothic ProN", Arial,sans-serif`;
      c.fillStyle=col;c.textAlign=align;c.textBaseline='middle';c.fillText(str,x,y);
    }
    drawDesk(x,y,accent='#8fb0bf',idle=false) {
      this.ellipse(x,y+47,59,15,'rgba(91,75,58,.18)');
      this.rect(x-39,y+19,7,38,'#8a6750');this.rect(x+32,y+24,7,33,'#8a6750');
      this.poly([[x,y-15],[x+55,y+11],[x,y+37],[x-55,y+11]],'#b08c6c','#8d6b53',2);
      this.poly([[x,y-19],[x+55,y+7],[x,y+32],[x-55,y+7]],'#efc990','#b38b64',2);
      // laptop and screen
      this.poly([[x-6,y-9],[x+15,y+1],[x+15,y+17],[x-6,y+7]],'#344754','#263845',2);
      this.poly([[x-3,y-5],[x+12,y+2],[x+12,y+13],[x-3,y+6]],idle?'#80949a':accent);
      this.rect(x+4,y+4,4,3,'#efffff');
      this.poly([[x-15,y+15],[x+5,y+24],[x-3,y+29],[x-24,y+20]],'#eff0db','#b8a989',1);
      this.rect(x-25,y+2,6,6,'#faf5db');
      this.ellipse(x+27,y+14,6,3,'#c97d6b');
    }
    drawPlant(x,y,s=1) {
      this.ellipse(x,y+7*s,18*s,7*s,'rgba(54,75,51,.2)');
      this.poly([[x-12*s,y-3*s],[x+12*s,y-3*s],[x+7*s,y+15*s],[x-7*s,y+15*s]],'#d38d5c','#9f6247',2);
      this.rect(x-2*s,y-23*s,4*s,21*s,'#50815b');
      for(let i=0;i<5;i++){
        const a=i*2.4+this.time*.1;
        const dx=Math.cos(a)*12*s,dy=Math.sin(a)*8*s;
        this.ellipse(x+dx,y-24*s+dy,12*s,7*s,i%2?'#5e9e67':'#77b77d');
      }
    }
    drawHuman(x,y,color='#d2ac77'){
      this.ellipse(x,y+8,14,5,'rgba(50,60,72,.16)');
      this.rect(x-9,y-17,18,22,'#f0e8df');
      this.rect(x-12,y-32,24,21,'#f5caa9');
      this.rect(x-13,y-36,26,10,color);
      this.rect(x-9,y-20,4,4,'#3d4754');this.rect(x+5,y-20,4,4,'#3d4754');
      this.rect(x-9,y+4,6,5,'#526976');this.rect(x+3,y+4,6,5,'#526976');
    }
    drawRobot(x,y) {
      this.ellipse(x,y+7,16,6,'rgba(13,74,87,.25)');
      this.rect(x-15,y-23,30,27,'#e4ece5');
      this.rect(x-19,y-25,38,19,'#e3eff0');this.rect(x-14,y-21,28,11,'#3d6f86');
      this.rect(x-9,y-18,5,5,'#71eddd');this.rect(x+4,y-18,5,5,'#71eddd');
      this.rect(x-3,y-29,6,4,'#79aebe');this.rect(x-1,y-35,2,7,'#79aebe');
      this.rect(x-19,y-7,5,13,'#c8e4de');this.rect(x+15,y-7,5,13,'#c8e4de');
      this.rect(x-10,y+3,7,6,'#5b87a3');this.rect(x+4,y+3,7,6,'#5b87a3');
    }
}


/* City v11.2: grounded rail transport, living waterfront and depth-sorted urban actors. */
(function(root){
 'use strict';
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 class TownScene extends F5Primitives {
  constructor(canvas,model){
   super();this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.model=model;this.time=0;this.reduced=false;this.decisionHighlight=null;
   this.W=2900;this.H=1600;this.scale=1;this.ox=0;this.oy=0;this.dpr=1;this.running=true;this.mobile=false;this.lastLayout='';this.zoom=1;this.zoomTarget=1;this.panX=0;this.panY=0;this.selectedAgentId=null;
   this.sites=root.F5City.SITES;
   this.roadsI=[-7,1,8,11,16,22,28,35];this.roadsJ=[-6,1,8,15,20];
   this.sidewalkOffset=.77;
   // Two genuinely separate rail corridors. Physical carriages are .54 units wide.
   this.railLines=[17.10,18.90];
   this.railLength=2.07;this.railWidth=.54;this.railCoachPitch=2.22;
   this.railNorthLimit=16.57;this.railSouthLimit=19.56;
   this.carPhases=[];this.walkerPhases=[];
   // Streets and parcels are defined once in map coordinates; actors use these corridors.
   this.blocks=this.makeBuildings();this.trees=this.makeTrees();this.buildCache();this.walkPaths=this.pedestrianPaths();
   this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas);this.resize();
  }
  iso(i,j){return {x:1280+(i-j)*36,y:340+(i+j)*18};}
  pt(p){const a=this.iso(...p);return [a.x,a.y];}
  resize(){
   const r=this.canvas.getBoundingClientRect();if(r.width<1||r.height<1)return;
   const dpr=Math.min(2,root.devicePixelRatio||1),width=Math.round(r.width*dpr),height=Math.round(r.height*dpr);
   if(this.canvas.width===width&&this.canvas.height===height&&this.dpr===dpr){this.layout();return;}
   this.dpr=dpr;this.canvas.width=width;this.canvas.height=height;
   this.ctx.imageSmoothingEnabled=true;this.layout();
   // Resizing clears the bitmap. Paint before the next scheduled animation frame
   // so the city does not flash blank when the ending panel changes its height.
   if(this.walkPaths)this.render(0);
  }
  layout(){
   const r=this.canvas.getBoundingClientRect(),out=this.model.phase==='outcome',mobile=r.width<650;
   const k=[r.width,r.height,out,this.zoom.toFixed(3)].join('|');if(k===this.lastLayout)return;this.lastLayout=k;this.mobile=mobile;
   if(mobile){
    // Mobile shows the three active stops instead of shrinking every detail.
    this.scale=Math.min(r.width/1700,r.height/1050);
    this.ox=r.width/2-1350*this.scale;this.oy=r.height*.53-780*this.scale;
   }else if(out){
    const usable=Math.max(r.width*.60,r.width-435);
    this.scale=Math.min((usable-22)/2850,(r.height-26)/1510);
    this.ox=usable/2-1450*this.scale;this.oy=r.height/2-800*this.scale;
   }else{
    this.scale=Math.min((r.width+16)/2800,(r.height+90)/1510);
    this.ox=r.width/2-1450*this.scale;this.oy=r.height/2-800*this.scale;
   }
   if(this.zoom>1.001&&!out){
    const cx=mobile?1350:1450,cy=mobile?780:800;
    const sx=r.width/2,sy=mobile?r.height*.53:r.height/2;
    this.scale*=this.zoom;this.ox=sx-cx*this.scale;this.oy=sy-cy*this.scale;
    // Pan is expressed in viewport pixels, not world units. Clamp it so
    // dragging cannot push the whole map away from the view.
    const maxX=Math.max(0,(this.W*this.scale-r.width)/2+12,(this.zoom-1)*r.width*.18);
    // A tall/narrow view can be taller than the scaled map image. Keep a
    // little vertical travel so mobile users can inspect roofs and streets.
    const maxY=Math.max(0,(this.H*this.scale-r.height)/2+12,(this.zoom-1)*r.height*.25);
    this.panX=clamp(this.panX,-maxX,maxX);
    this.panY=clamp(this.panY,-maxY,maxY);
    this.ox+=this.panX;this.oy+=this.panY;
   }
  }
  hitSite(px,py){
   const candidates=this.model.sites.filter(s=>s.state!=='dormant');
   let best=null,dist=Infinity;
   for(const s of candidates){
    const p=this.project([s.cell[0]+s.w*.5,s.cell[1]+s.d*.5],0,-24);
    const a=(px-p.x)/Math.max(25,Math.min(90,110*this.scale)),b=(py-p.y)/Math.max(25,Math.min(80,90*this.scale));
    const d=a*a+b*b;if(d<1.3&&d<dist){best=s;dist=d;}
   }return best?.id||null;
  }
  setZoom(value){
   if(!Number.isFinite(value))return false;
   const next=clamp(Math.round(value*4)/4,1,1.5);
   const previous=this.zoomTarget;
   if(next===previous)return false;
   // Preserve the area under the viewport center while changing zoom level.
   if(next<=1){this.panX=0;this.panY=0;}
   else if(previous>1){this.panX*=next/previous;this.panY*=next/previous;}
   this.zoomTarget=next;this.lastLayout='';return true;
  }
  setPan(x,y){
   if(!Number.isFinite(x)||!Number.isFinite(y)||this.zoomTarget<=1)return false;
   this.panX=x;this.panY=y;this.lastLayout='';this.layout();return true;
  }
  resetView(){
   this.panX=0;this.panY=0;this.zoomTarget=1;this.lastLayout='';
  }
  project(cell,dx=0,dy=0){const p=this.iso(...cell);return {x:this.ox+(p.x+dx)*this.scale,y:this.oy+(p.y+dy)*this.scale};}
  markerPositions(){return Object.fromEntries(this.model.sites.map(s=>[s.id,this.project([s.cell[0]+s.w*.52,s.cell[1]+s.d*.55],0,-90)]));}
  cuePosition(){const s=this.model.focus;return s?this.project([s.cell[0]+s.w*.52,s.cell[1]+s.d*.55],0,-120):this.project([12,7],0,-100);}
  round(x,y,w,h,r,color,stroke){const c=this.ctx;c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}}
  text(str,x,y,size=16,col='#25483f',align='left',weight='700'){const c=this.ctx;c.font=`${weight} ${size}px "Yu Gothic","Noto Sans CJK JP",sans-serif`;c.fillStyle=col;c.textAlign=align;c.textBaseline='middle';c.fillText(str,x,y);}
  path(points,color,width,dash=[],alpha=1){const c=this.ctx;c.save();c.globalAlpha=alpha;c.beginPath();points.forEach((p,k)=>{const a=this.pt(p);k?c.lineTo(...a):c.moveTo(...a);});c.strokeStyle=color;c.lineWidth=width;c.lineJoin='round';c.lineCap='round';c.setLineDash(dash);c.stroke();c.restore();}
  tile(i,j,w,d,color,stroke){this.poly([[i,j],[i+w,j],[i+w,j+d],[i,j+d]].map(p=>this.pt(p)),color,stroke);}
  box(i,j,w,d,h,top,left,right,z=0){const p=[[i,j],[i+w,j],[i+w,j+d],[i,j+d]].map(v=>this.iso(...v));const b=p.map(v=>[v.x,v.y-z]),t=p.map(v=>[v.x,v.y-z-h]);this.poly([b[3],b[2],t[2],t[3]],left);this.poly([b[1],b[2],t[2],t[1]],right);this.poly(t,top);return {p,b,t};}
  roadOverlap(i,j,w,d,clearance=.96){
   return this.roadsI.some(r=>i<r+clearance&&i+w>r-clearance)||this.roadsJ.some(r=>j<r+clearance&&j+d>r-clearance);
  }
  railOverlap(i,j,w,d,pad=.24){
   return this.railLines.some(r=>j<r+this.railWidth+pad&&j+d>r-pad);
  }
  parcelOverlap(i,j,w,d,pad=.28){
   return this.sites.some(s=>i<s.cell[0]+s.w+pad&&i+w>s.cell[0]-pad&&j<s.cell[1]+s.d+pad&&j+d>s.cell[1]-pad);
  }
  isWalkable(i,j,pad=.24){
   for(const s of this.sites)if(i>=s.cell[0]-pad&&i<=s.cell[0]+s.w+pad&&j>=s.cell[1]-pad&&j<=s.cell[1]+s.d+pad)return false;
   for(const b of this.blocks)if(i>=b.i-pad&&i<=b.i+b.w+pad&&j>=b.j-pad&&j<=b.j+b.d+pad)return false;
   return true;
  }
  makeBuildings(){
   const b=[];
   const add=(i,j,w,d,h,type='house',tone=0)=>{
    // Never place an ornament or building on a designated road, sidewalk, or editable plot.
    if(this.roadOverlap(i,j,w,d,1.03)||this.parcelOverlap(i,j,w,d,.45)||this.railOverlap(i,j,w,d,.3))return;
    b.push({i,j,w,d,h,type,tone,depth:i+j+w+d});
   };
   const hash=(x,y,s=0)=>{let v=Math.sin(x*62.77+y*179.11+s*23.27)*43758.5453;return v-Math.floor(v);};
   for(let i=-8.8;i<35;i+=1.9)for(let j=-8;j<21;j+=1.9){
    if(i>10.4&&i<16.2&&j>7.6&&j<15)continue;
    if(j>16.2&&j<18.4)continue;
    const k=hash(i,j),tone=Math.floor(hash(i,j,3)*3),w=1.06+hash(i,j,1)*.32,d=.95+hash(i,j,2)*.30;
    let type='house',h=37+Math.floor(k*19);
    if(i>=14&&j<7){type=k>.28?'tower':'office';h=110+Math.floor(hash(i,j,9)*155);}
    else if(i>23&&j>7){type=k>.42?'technology':'factory';h=42+Math.floor(hash(i,j,9)*46);}
    else if(i>9&&j<1){type=k>.42?'office':'apartment';h=63+Math.floor(hash(i,j,9)*71);}
    else if(j>12&&i>8){type=k>.42?'apartment':'shop';h=40+Math.floor(hash(i,j,9)*59);}
    else if(i>6&&j>1){type=k>.55?'shop':'apartment';h=44+Math.floor(hash(i,j,9)*50);}
    else if(i<5&&j>8){type=k>.74?'apartment':'house';h=35+Math.floor(hash(i,j,9)*32);}
    if(k>.96&&type==='house')type='cafe';
    add(i+.10*(k-.5),j,w,d,h,type,tone);
   }
   // Landmark sites are subject to exactly the same clearance checks as generated buildings.
   add(-1.6,12.5,2.1,1.45,103,'station');
   add(-1.8,15.35,2.45,.65,15,'platform');
   add(20.65,-6.5,2.0,1.7,254,'tower',0);
   add(24.4,-4.5,1.55,1.45,275,'tower',2);
   add(29.6,-1.4,1.5,1.5,195,'tower',1);
   // Railway approaches are intentionally free of factories and tall obstacles.
   add(18.1,18.6,1.8,.85,47,'market');
   add(14.5,18.45,1.3,.9,63,'civic');
   return b.sort((a,b)=>a.depth-b.depth);
  }
  makeTrees(){
   const trees=[];const canPlant=(i,j)=>{
    if(this.roadOverlap(i-.2,j-.2,.4,.4,.94)||this.parcelOverlap(i-.2,j-.2,.4,.4,.7)||this.railOverlap(i-.2,j-.2,.4,.4,.44))return false;
    if(this.blocks.some(b=>i>=b.i-.45&&i<=b.i+b.w+.45&&j>=b.j-.45&&j<=b.j+b.d+.45))return false;
    return true;
   };
   for(let i=-9;i<35;i+=1.5){if(canPlant(i,21.55))trees.push([i,21.55,.68]);}
   for(let j=-8;j<21;j+=1.6){if(canPlant(-8.2,j))trees.push([-8.2,j,.65]);if(canPlant(34.4,j))trees.push([34.4,j,.6]);}
   for(let k=0;k<112;k++){
    const i=-8+(k*6.71)%43,j=-7+(k*4.31)%27;
    if(canPlant(i,j))trees.push([i,j,.47+(k%4)*.08]);
   }
   return trees;
  }
  building(b){
   const {i,j,w,d,h,type,tone}=b;
   const palettes={house:[['#f3e4c9','#d9c4a5','#bfa98a','#ba7a65'],['#eee4cc','#d7c9ae','#b8b49c','#698578'],['#f2dfca','#dcc1a8','#bea58e','#b59973']],apartment:[['#e8e8dc','#d1d5c8','#a9bab0','#517a71'],['#ece6d8','#d6cdbc','#b8b6a3','#8e8b73'],['#e6ddd0','#cfc5b5','#a9b2a3','#75878a']],tower:[['#bddce0','#8db7bb','#638f99','#3c6c79'],['#e2e0d4','#bfcdc1','#95ad9f','#647d71'],['#c4d0df','#90aac2','#657f9b','#405e77']],shop:[['#f3e6d0','#e3cfb0','#bfb8a0','#61887a'],['#f4e1d3','#ddc4b4','#b9ada1','#a67a68'],['#ebe4ce','#d8cbaa','#b9b19c','#85956d']],cafe:[['#f4e6d1','#ddc7a8','#c3b18f','#ac805f']],civic:[['#f2ecd9','#d5d6c3','#acbbae','#4f7a71']],station:[['#e5ecde','#c3d2c3','#9cb6a8','#3a6b61']],platform:[['#e3ddc8','#c9bfaa','#a6a592','#587b70']],technology:[['#b5d2d1','#87aaa9','#668e92','#356676'],['#cfdbd6','#b4c7be','#77999a','#50797d']],office:[['#c4d8db','#8daeb2','#5f8998','#396c7c'],['#d8e4db','#bacaba','#729e93','#396f68'],['#c5cfdc','#99afc1','#728899','#3a6a84']],factory:[['#c2c9bd','#b4b5a5','#899b95','#a67d59'],['#cbd4d1','#b1c2bd','#829d97','#637c75']],arena:[['#e6dfc9','#c6c5aa','#a4b59f','#79a9b0']],library:[['#e8e1cf','#d5ccb6','#b8b29a','#76967c']],market:[['#f2e2c3','#dfcfb0','#b1b39f','#a97450']]};
   const pa=palettes[type]||palettes.house,co=pa[tone%pa.length];
   const corners=[[i,j],[i+w,j],[i+w,j+d],[i,j+d]].map(p=>this.iso(...p));
   this.poly([...corners.map(p=>[p.x+11,p.y+12]),[corners[0].x+11,corners[0].y+12]],'rgba(55,77,65,.12)');
   const {p,t}=this.box(i,j,w,d,h,co[0],co[1],co[2]);
   const rows=Math.max(1,Math.floor((h-13)/24)),cols=Math.max(1,Math.floor(w*2.4));
   for(let f=0;f<rows;f++){
    for(let k=0;k<cols;k++){
     const u=(k+.5)/cols,x=p[3].x+(p[2].x-p[3].x)*u-4,y=p[3].y+(p[2].y-p[3].y)*u-h+12+f*23;
     this.poly([[x,y],[x+8,y+4],[x+8,y+16],[x,y+12]],type==='tower'?'#426d6a':'#5a837b');
     this.line(x+1,y+3,x+6,y+5,'#d7e8d9',1.4);
    }
    for(let k=0;k<Math.max(1,Math.floor(d*2));k++){
     const u=(k+.5)/Math.max(1,Math.floor(d*2)),x=p[1].x+(p[2].x-p[1].x)*u+3,y=p[1].y+(p[2].y-p[1].y)*u-h+12+f*23;
     this.poly([[x,y],[x-7,y+3.5],[x-7,y+15],[x,y+11.5]],type==='tower'?'#396462':'#60857b');
    }
   }
   if(type==='house'){
    const ridgeA=this.iso(i+w*.5,j),ridgeB=this.iso(i+w*.5,j+d);const rise=13;
    this.poly([t[0],[ridgeA.x,ridgeA.y-h-rise],[ridgeB.x,ridgeB.y-h-rise],t[3]],co[3]);
    this.poly([[ridgeA.x,ridgeA.y-h-rise],t[1],t[2],[ridgeB.x,ridgeB.y-h-rise]],tone===1?'#547064':tone===2?'#8f7657':'#97624f');
    this.poly([t[3],[ridgeB.x,ridgeB.y-h-rise],t[2]],co[0]);
   }else{
    this.poly(t,co[3]);
    const rim=t.map(v=>[v[0],v[1]-3]);this.line(t[3][0],t[3][1],t[2][0],t[2][1],co[0],3);
    if(type==='tower'||type==='technology'||type==='office'){
     this.box(i+.18,j+.18,w*.45,d*.35,8,'#c1d0c9','#a6b8ad','#8ea59b',h);
     const solar=[[i+w*.55,j+.2],[i+w*.85,j+.2],[i+w*.85,j+d*.75],[i+w*.55,j+d*.75]].map(v=>{const x=this.iso(...v);return[x.x,x.y-h-1];});this.poly(solar,'#345f61');
    }
    if(type==='cafe'||type==='shop'||type==='market'){
     const a=this.iso(i,j+d),c=this.iso(i+w,j+d);for(let k=0;k<6;k++){const u=k/6,v=(k+1)/6;this.poly([[a.x+(c.x-a.x)*u,a.y+(c.y-a.y)*u-20],[a.x+(c.x-a.x)*v,a.y+(c.y-a.y)*v-20],[a.x+(c.x-a.x)*v-6,a.y+(c.y-a.y)*v-12],[a.x+(c.x-a.x)*u-6,a.y+(c.y-a.y)*u-12]],k%2?'#f9edce':co[3]);}
    }
   }
   if(type==='station'){const q=this.iso(i+w/2,j+d);this.round(q.x-15,q.y-h+2,30,26,3,'#fff5d9');this.text('駅',q.x,q.y-h+15,18,'#345e55','center');}
   if(type==='civic'){const q=this.iso(i+w/2,j+d);this.line(q.x-19,q.y-h+8,q.x+19,q.y-h+27,'#e9dbc0',5);}
   if(type==='arena'){const q=this.iso(i+w/2,j+d/2);this.ellipse(q.x,q.y-h-5,57,27,'#8eafab');this.ellipse(q.x,q.y-h-8,49,21,'#c9e1d6');this.ellipse(q.x,q.y-h-8,37,13,'#7da6a0');}
   if(type==='library'){const q=this.iso(i+w/2,j+d);this.poly([[q.x-18,q.y-h+10],[q.x+4,q.y-h-5],[q.x+23,q.y-h+4],[q.x+1,q.y-h+20]],'#e8dec3');}
   if(type==='factory'){const q=this.iso(i+w*.75,j+d*.2);this.box(i+w*.68,j+d*.08,.2,.19,28,'#bdc7bd','#a0b3a9','#879f97',h);}
   if(type==='tower'&&h>175){const q=this.iso(i+w/2,j+d/2);this.line(q.x,q.y-h-4,q.x,q.y-h-39,'#527c7d',3);this.ellipse(q.x,q.y-h-41,4,4,'#c17d58');}
  }
  tree(i,j,s=1){const p=this.iso(i,j);this.ellipse(p.x+4,p.y+4,13*s,6*s,'rgba(49,83,57,.14)');this.rect(p.x-2*s,p.y-17*s,4*s,19*s,'#8e7854');this.ellipse(p.x,p.y-25*s,15*s,20*s,'#5d8c68');this.ellipse(p.x-5*s,p.y-32*s,12*s,13*s,'#82aa7a');this.ellipse(p.x+6*s,p.y-23*s,10*s,15*s,'#6d9870');}
  lamp(i,j){const p=this.iso(i,j);this.line(p.x,p.y,p.x,p.y-27,'#526e62',2.3);this.round(p.x-4,p.y-31,8,6,2,'#faf1cf','#859882');}
  bench(i,j){const p=this.iso(i,j);this.line(p.x-10,p.y-10,p.x+12,p.y+1,'#b89364',4);this.line(p.x-10,p.y-3,p.x+12,p.y+8,'#cca879',5);this.line(p.x-7,p.y,p.x-7,p.y+5,'#5e7866',2);this.line(p.x+10,p.y+7,p.x+10,p.y+12,'#5e7866',2);}
  drawGround(){
   this.rect(0,0,this.W,this.H,'#e5ece3');
   this.tile(-11,-9.5,49,41,'#d2dec9');
   for(let i=-10;i<37;i++)for(let j=-9;j<30;j++){
    const k=(i*31+j*17+912)%9;
    this.tile(i,j,1,1,k<2?'#cbdac4':k<4?'#d4e1c9':'#d5dfcc');
   }
   // Water is the western and southern natural city limit, not a decorative strip.
   this.tile(-10.5,-9,3.5,43,'#77b6c4');
   this.tile(-10.5,22.0,48,8,'#81bfca');
   this.tile(-10.5,21.65,48,.45,'#e8dcb4');
   this.tile(-7.1,-9,.55,34,'#e2d5b4');
   // Different-looking districts help visitors parse the metropolis at one glance.
   this.tile(11.55,8.7,3.85,5.92,'#a5ca9f');
   this.tile(-5.8,9.1,3.2,3.3,'#b4d4b8');
   this.tile(26.5,8.75,7.3,8.2,'#c3d0c3');
   this.tile(14,-8.1,20,12,'#cbd8d2');
   // Roads follow the city block grid only: no diagonal shortcuts across parcels.
   for(const i of this.roadsI){
    this.path([[i,-9.5],[i,22.1]],'#e7e7dc',i===1||i===22?42:28);
    this.path([[i,-9.5],[i,22.1]],'#758d91',i===1||i===22?30:19);
    this.path([[i,-9.5],[i,22.1]],'#dce4dd',1.5,[11,13],.86);
   }
   for(const j of this.roadsJ){
    this.path([[-10,j],[37,j]],'#e8e7dd',j===15?44:30);
    this.path([[-10,j],[37,j]],'#7e9494',j===15?31:20);
    this.path([[-10,j],[37,j]],'#ebeee5',1.5,[12,12],.9);
   }
   // The park has open grass, footpaths and water, contrasting the financial district.
   // Central green is rendered dynamically by parcel states.
   // Urban rail connects the waterfront terminal and high-rise quarter.
   for(const j of this.railLines){
    this.path([[-10,j],[37,j]],'#b7b7a4',14);
    this.path([[-10,j-.10],[37,j-.10]],'#536f72',2);
    this.path([[-10,j+.10],[37,j+.10]],'#536f72',2);
    for(let i=-10;i<37;i+=.5)this.path([[i,j-.17],[i,j+.17]],'#a2a79f',2);
   }
   // Stations: broad platforms sit beside rails instead of blocking the tracks.
   // Side platform and an island between the two tracks. Both are outside
   // the carriage envelopes: 17.10..17.64 and 18.90..19.44.
   for(const [i,w] of [[-5.7,9.5],[26.2,8.1]]){
    this.tile(i,16.59,w,.32,'#e8dfc2');this.tile(i,16.91,w,.055,'#d6a352');
    this.tile(i,17.86,w,.66,'#e8dfc2');
    this.tile(i,17.86,w,.065,'#d6a352');
    this.tile(i,18.45,w,.065,'#d6a352');
   }
   for(const p of [[25.7,19.1],[27.8,19.0],[30,18.7],[32.4,19.2]]){
    this.tile(p[0],p[1],1.3,.8,'#bcc5af');
    this.tile(p[0]+.18,p[1]+.11,.82,.48,'#c78a62');
   }
   // Bridges and quays have recognizable shapes even from the overview.
   for(const i of [2,15,29]){
    this.path([[i,19.9],[i,27]],'#b4b6ab',40);
    this.path([[i,19.9],[i,27]],'#e8e5d3',32);
    this.path([[i-.42,19.9],[i-.42,27]],'#91a49a',2);
    this.path([[i+.42,19.9],[i+.42,27]],'#91a49a',2);
   }
   // Permanent coast infrastructure: these small piers remain even if a new
   // maritime plan changes how the harbor is used.
   this.tile(3.5,22.16,5.2,1.15,'#d3d1b9','#a6b8ac');
   this.tile(23.8,22.15,8.7,1.0,'#c2c9b9','#9aaca6');
   this.tile(-4,5.7,2.5,1.4,'#83b99c');
   this.path([[-3.78,6.1],[-2.15,6.1]],'#e7e4ce',1.3);
  }
  findSafeFixture(i,j){
   // Decorative street fixtures have real footprints and cannot stand in traffic,
   // on rail tracks, inside buildings, or on plots that may be redeveloped.
   const offsets=[[0,0],[0,.92],[.92,0],[-.92,0],[0,-.92],
    [1.2,1.2],[-1.2,1.2],[1.2,-1.2],[-1.2,-1.2],
    [1.7,0],[-1.7,0],[0,1.7],[0,-1.7]];
   for(const [dx,dy] of offsets){
    const x=i+dx,y=j+dy,r=.12;
    if(x<-6.3||x>34.2||y<-7.3||y>21.35)continue;
    if(this.roadOverlap(x-r,y-r,r*2,r*2,.62)||this.railOverlap(x-r,y-r,r*2,r*2,.50))continue;
    if(this.parcelOverlap(x-r,y-r,r*2,r*2,.18))continue;
    if(this.blocks.some(b=>x>=b.i-.35&&x<=b.i+b.w+.35&&y>=b.j-.35&&y<=b.j+b.d+.35))continue;
    if(this.fixtures?.some(v=>Math.hypot(v.i-x,v.j-y)<.75))continue;
    return [x,y];
   }
   return null;
  }
  buildCache(){
   this.ground=document.createElement('canvas');this.ground.width=this.W;this.ground.height=this.H;
   const live=this.ctx;this.ctx=this.ground.getContext('2d');this.drawGround();this.ctx=live;
   // Cache static facades as small transparent sprites; depth sorting remains available.
   this.props=[];this.fixtures=[];
   const cache=(depth,draw,x,y,width,height)=>{
    const image=document.createElement('canvas');image.width=width;image.height=height;this.ctx=image.getContext('2d');this.ctx.translate(-x,-y);draw();this.props.push({depth,image,x,y});
   };
   this.blocks.forEach(b=>{const p=this.iso(b.i,b.j);const width=Math.ceil((b.w+b.d)*36+100),height=Math.ceil((b.w+b.d)*18+b.h+105),x=Math.floor(p.x-b.d*36-48),y=Math.floor(p.y-b.h-58);cache(b.depth,()=>this.building(b),x,y,width,height);});
   this.trees.forEach(t=>{const p=this.iso(t[0],t[1]);cache(t[0]+t[1]+.15,()=>this.tree(...t),p.x-25,p.y-60,55,75);});
   const lamps=[[2.2,12.1],[4,9.2],[7.5,7],[10,12],[17.2,11],[19.5,13],[26.1,7],[28,10.5],[4,4],[24.4,4],[14,3]];
   lamps.forEach(raw=>{const a=this.findSafeFixture(...raw);if(!a)return;
    this.fixtures.push({type:'lamp',i:a[0],j:a[1]});
    const p=this.iso(...a);cache(a[0]+a[1],()=>this.lamp(...a),p.x-12,p.y-40,25,46);
   });
   // Benches within the editable park are drawn dynamically, not baked into
   // the world. Otherwise they would remain inside a future data center.
   const benches=[[2.0,14.05],[13.1,5.2],[10.1,20.90]];
   benches.forEach(raw=>{const a=this.findSafeFixture(...raw);if(!a)return;
    this.fixtures.push({type:'bench',i:a[0],j:a[1]});
    const p=this.iso(...a);cache(a[0]+a[1],()=>this.bench(...a),p.x-20,p.y-20,44,40);
   });
   // Recognizable harbor cranes give the waterfront its own skyline.
   // Harbor cranes are fixed to quays, never to the coastal carriageway.
   [[25.0,22.45],[31.6,22.48]].forEach((a,k)=>{
    const p=this.iso(...a);
    cache(a[0]+a[1],()=>{
     const co=k?'#c99163':'#d09b65';
     this.rect(p.x-5,p.y-99,10,105,co);
     this.line(p.x-57,p.y-103,p.x+58,p.y-103,co,7);
     this.line(p.x,p.y-127,p.x-57,p.y-103,co,3);
     this.line(p.x,p.y-127,p.x+58,p.y-103,co,3);
     this.line(p.x+39,p.y-103,p.x+39,p.y-58,'#637f78',2);
     this.rect(p.x+25,p.y-58,30,12,'#a7bcb1');
     this.poly([[p.x-16,p.y],[p.x+16,p.y],[p.x+8,p.y+7],[p.x-9,p.y+7]],'#a4a99c');
    },p.x-76,p.y-144,160,180);
   });
   // Distinctive covered platforms and station information, in the same
   // depth-sorted cache as the surrounding buildings.
   [[-4.2,16.66,'西駅'],[27.2,16.66,'東駅']].forEach(([i,j,name])=>{
    const q=this.iso(i,j);
    cache(i+j+.2,()=>{
     this.box(i,j,3.6,.24,7,'#e5dbc2','#b1ae9d','#9eab9f');
     for(const dx of [0.30,3.27]){
      const p=this.iso(i+dx,j+.1);this.line(p.x,p.y-5,p.x,p.y-63,'#7c948b',3);
     }
     const roof=this.iso(i+1.75,j+.18);
     this.poly([[roof.x-83,roof.y-63],[roof.x-20,roof.y-89],[roof.x+78,roof.y-64],[roof.x+17,roof.y-39]],'#719b90');
     this.poly([[roof.x-83,roof.y-63],[roof.x+17,roof.y-39],[roof.x+17,roof.y-34],[roof.x-83,roof.y-59]],'#4a7770');
     this.round(roof.x-25,roof.y-75,50,18,4,'#fff9df');this.text(name,roof.x,roof.y-66,13,'#275a4d','center');
    },q.x-126,q.y-118,264,168);
   });
   this.props.sort((a,b)=>a.depth-b.depth);this.ctx=live;
  }
  atPath(path,t){
   const ps=path.map(p=>this.iso(...p)),lengths=[];let total=0;
   for(let k=1;k<ps.length;k++){const l=Math.hypot(ps[k].x-ps[k-1].x,ps[k].y-ps[k-1].y);lengths.push(l);total+=l;}
   let s=clamp(t,0,1)*total;
   for(let k=0;k<lengths.length;k++){
    if(s<=lengths[k]||k===lengths.length-1){const a=ps[k],b=ps[k+1],f=lengths[k]?s/lengths[k]:0;
     const i=path[k][0]+(path[k+1][0]-path[k][0])*f,j=path[k][1]+(path[k+1][1]-path[k][1])*f;
     return{x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,dir:Math.atan2(b.y-a.y,b.x-a.x),i,j,depth:i+j};
    }s-=lengths[k];
   }
   return {...ps[0],i:path[0][0],j:path[0][1],dir:0,depth:path[0][0]+path[0][1]};
  }
  pedestrianPaths(){
   // Sidewalks are split into safe stretches. Nothing crosses a building or editable park.
   const lanes=[];
   for(const v of this.roadsI)for(const sign of [-1,1]){
    // Railway crossing only via designated station footbridges. Do not allow
    // crowds to walk through moving trains at ordinary grade crossings.
    lanes.push([[v+sign*this.sidewalkOffset,-7.35],[v+sign*this.sidewalkOffset,16.02]]);
   }
   for(const v of this.roadsJ)for(const sign of [-1,1]){
    if(v===20&&sign<0)continue; // this side of the coastal road abuts the tracks
    lanes.push([[-7.65,v+sign*this.sidewalkOffset],[34.1,v+sign*this.sidewalkOffset]]);
   }
   const paths=[];
   for(const [a,b] of lanes){
    const length=Math.hypot(b[0]-a[0],b[1]-a[1]),N=Math.ceil(length/.32);
    let first=null,last=null;
    const push=()=>{if(first&&last&&Math.hypot(last[0]-first[0],last[1]-first[1])>=2.3)paths.push([first,last]);first=last=null;};
    for(let k=0;k<=N;k++){
     const t=k/N,i=a[0]+(b[0]-a[0])*t,j=a[1]+(b[1]-a[1])*t;
     if(this.isWalkable(i,j,.22)){if(!first)first=[i,j];last=[i,j];}
     else push();
    }
    push();
   }
   return paths;
  }
  agentPath(s,k){
   // Workers stop on the closest uninterrupted sidewalk; never walk through a lot.
   const paths=this.walkPaths;
   if(!s)return paths[(k*7+9)%paths.length];
   const cx=s.cell[0]+s.w/2,cy=s.cell[1]+s.d/2;
   const dist=path=>{
    const a=path[0],b=path[1],dx=b[0]-a[0],dy=b[1]-a[1];
    const t=clamp(((cx-a[0])*dx+(cy-a[1])*dy)/(dx*dx+dy*dy),0,1);
    return Math.hypot(cx-(a[0]+t*dx),cy-(a[1]+t*dy));
   };
   const near=paths.slice().sort((a,b)=>dist(a)-dist(b))[0];
   if(!near)return [[0,0],[1,0]];
   const [a,b]=near,vertical=Math.abs(a[1]-b[1])>Math.abs(a[0]-b[0]);
   const center=vertical?clamp(cy,a[1]+.4,b[1]-.4):clamp(cx,a[0]+.4,b[0]-.4);
   const min=vertical?a[1]:a[0],max=vertical?b[1]:b[0];
   const p1=clamp(center-1.2,min,max),p2=clamp(center+1.2,min,max);
   return vertical?[[a[0],p1],[a[0],p2]]:[[p1,a[1]],[p2,a[1]]];
  }
  car(x,y,dir,tone=0){const c=this.ctx;c.save();c.translate(x,y);if(Math.cos(dir)<0)c.scale(-1,1);const co=['#d9b36b','#d2b29b','#a3babc','#e6e0cc'][tone%4];this.ellipse(0,4,12,5,'rgba(50,72,56,.14)');this.poly([[-11,-5],[0,-12],[12,-5],[0,2]],co);this.poly([[-11,-5],[0,2],[0,9],[-11,2]],co);this.poly([[0,2],[12,-5],[12,2],[0,9]],'#849a8d');this.poly([[-6,-5],[0,-9],[7,-5],[0,-1]],'#557b76');this.ellipse(-6,5,2,3,'#4c6153');this.ellipse(8,1,2,3,'#4c6153');c.restore();}
  agentWork(id){return this.model.operations.find(s=>s.agent===id&&s.weather==='harbor'&&['pending','review','checking','building'].includes(s.state))||this.model.sites.find(s=>s.agent===id&&['pending','review','checking','building'].includes(s.state))||null;}
  agentPoint(id){
   const k=root.F5City.AGENTS.findIndex(a=>a.id===id);
   if(k<0)return null;
   const path=this.agentPath(this.agentWork(id),k);
   return this.atPath(path,.5+.42*Math.sin(this.time*.3+k));
  }
  focusAgent(id,task){
   if(!root.F5City.AGENTS.some(a=>a.id===id))return false;
   if(this.zoomTarget<1.25)this.setZoom(1.25);
   // Zoom and pan directly to the selected worker; never change the city clock.
   this.zoom=this.zoomTarget;this.lastLayout='';this.layout();
   const p=this.agentPoint(id),r=this.canvas.getBoundingClientRect();
   if(!p)return false;
   const projected={x:this.ox+p.x*this.scale,y:this.oy+p.y*this.scale};
   this.setPan(this.panX+r.width*.50-projected.x,this.panY+r.height*.45-projected.y);
   return true;
  }
  person(x,y,index=0,walking=true){this.ctx.save();this.ctx.translate(x,y);this.ctx.scale(.43,.43);this.drawHuman(0,0,['#7f6856','#4f7d76','#a07b59','#727a8a','#a57d84'][index%5]);if(walking&&!this.reduced)this.rect(-8,7+Math.sin(this.time*5+index)*2,5,5,'#4b675b');this.ctx.restore();}
  // The arriving player uses an existing continuous sidewalk. This is a visual
  // avatar, not a building, a vehicle, or a newly authorized AI decision.
  beginVisitorEntrance(nickname){
   const target=[-.8,13.6];
   const candidates=this.walkPaths.map(route=>{
    const [a,b]=route,dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
    if(length<3.5)return null;
    const t=clamp(((target[0]-a[0])*dx+(target[1]-a[1])*dy)/(length*length),0,1);
    const at=[a[0]+dx*t,a[1]+dy*t];
    return {route,t,length,dist:Math.hypot(at[0]-target[0],at[1]-target[1])};
   }).filter(Boolean).sort((a,b)=>a.dist-b.dist);
   const c=candidates[0];if(!c)return false;
   this.visitorEntrance={name:String(nickname).slice(0,32),route:c.route,
    a:clamp(c.t-1.9/c.length,0,1),b:clamp(c.t+1.9/c.length,0,1),started:this.time};
   return true;
  }
  entrancePosition(){
   const a=this.visitorEntrance;if(!a)return null;
   const age=Math.max(0,this.time-a.started),t=age<4.6?Math.min(1,age/4.6):.5+.5*Math.sin((age-4.6)*.22);
   return this.atPath(a.route,a.a+(a.b-a.a)*t);
  }

  // Land tiles are flat ground. Trees, structures, and characters are independent depth-sorted objects.
  siteStyle(s){
   const active=s.state==='building',pct=active?clamp((this.model.t-s.startedBuild)/(s.buildUntil-s.startedBuild),0,1):1;
   const type=active?s.choice:s.current;
   return {active,pct,showType:active&&pct<.13?s.from:type};
  }
  siteGround(s){
   const [i,j]=s.cell,{w,d}=s,{showType,active}=this.siteStyle(s);
   const ground=showType==='park'?'#a6ce9b':showType==='mixed'?'#bbcba5':showType==='lot'?'#d7dac1':'#cbd4c9';
   this.tile(i,j,w,d,ground,active?'#d2a25c':'#9cb4a1');
   if(showType==='park'){
    // A path and a pond are ground features; their depth is not tied to a whole forest.
    this.path([[i+w*.12,j+d*.24],[i+w*.55,j+d*.55],[i+w*.88,j+d*.83]],'#dcd8bd',10);
    const q=this.iso(i+w*.44,j+d*.37);this.ellipse(q.x,q.y,27,12,'#89b5b1');
   }else if(showType==='mixed'){
    this.tile(i+.08,j+.10,w*.48,d-.2,'#aad0a2');
   }else if(showType==='lot'){
    this.tile(i+.23,j+.25,w-.46,d-.5,'#dfdfc7','#b7c0aa');
   }
  }
  addSiteObjects(s,add){
   const [i,j]=s.cell,{w,d}=s,{showType,active,pct}=this.siteStyle(s);
   const put=(i,j,draw,offset=0)=>add({depth:i+j+offset},draw);
   if(showType==='park'||showType==='mixed'){
    // Furniture follows the land use: a paved bench disappears on redevelopment.
    for(const [u,v] of [[.22,.78],[.77,.23]]){
     const bi=i+w*u,bj=j+d*v;
     put(bi,bj,()=>this.bench(bi,bj),.03);
    }
    const count=showType==='mixed'?7:17;
    for(let k=0;k<count;k++){
     const a=i+.31+((k*1.37)%(w-.66))*(showType==='mixed'?.47:1);
     const b=j+.35+((k*1.91)%(d-.7));
     // No tree may grow through the pond, park benches or paved walking path.
     const pond=[i+w*.44,j+d*.37];
     const path=[[i+w*.12,j+d*.24],[i+w*.55,j+d*.55],[i+w*.88,j+d*.83]];
     const distanceToSegment=(A,B)=>{
      const dx=B[0]-A[0],dy=B[1]-A[1];
      const t=clamp(((a-A[0])*dx+(b-A[1])*dy)/(dx*dx+dy*dy),0,1);
      return Math.hypot(a-(A[0]+dx*t),b-(A[1]+dy*t));
     };
     if(Math.hypot(a-pond[0],b-pond[1])<.74||distanceToSegment(path[0],path[1])<.44||distanceToSegment(path[1],path[2])<.44)continue;
     if([[.22,.78],[.77,.23]].some(([u,v])=>Math.hypot(a-(i+w*u),b-(j+d*v))<.55))continue;
     const s=.69+(k%3)*.09;
     put(a,b,()=>this.tree(a,b,s),.03);
    }
   }
   if(showType==='mixed'||showType==='dc'){
    const H=Math.max(5,(showType==='mixed'?72:80)*(active?pct:1));
    if(showType==='mixed'){
     const a=i+w*.55,b=j+.30,dw=w*.35,dd=d*.65;
     put(a+dw,b+dd,()=>this.dataCenter(a,b,dw,dd,H,1));
    }else{
     const count=w>5?3:2;
     for(let k=0;k<count;k++){
      const a=i+.18+(w-.36)*k/count,b=j+.28,dw=(w-.4)/count-.08,dd=d-.58;
      put(a+dw,b+dd,()=>this.dataCenter(a,b,dw,dd,H+(k%2)*8,k));
     }
    }
   }else if(showType==='homes'){
    for(let k=0;k<3;k++){
     const a=i+.16+k*(w-.22)/3,b=j+.3,dw=(w-.3)/3-.09,dd=d*.51;
     put(a+dw,b+dd,()=>this.building({i:a,j:b,w:dw,d:dd,h:35+(k%2)*10,type:'house',tone:k}));
    }
   }else if(['clinic','school','market','transit','solar','floodgate'].includes(showType)){
    const a=i+.35,b=j+.35,dw=w-.7,dd=d-.72,H=Math.max(7,({clinic:63,school:72,market:46,transit:40,solar:23,floodgate:25})[showType]*(active?pct:1));
    if(showType==='floodgate'){
     put(a+dw,b+dd,()=>{
      this.box(a,b,dw,dd,H,'#c7d8d1','#8eacae','#6c9194');
      const q=this.iso(a+dw*.55,b+dd*.5);this.round(q.x-25,q.y-H-12,50,19,4,'#eff6e5');this.text('雨に備える',q.x,q.y-H-3,11,'#426b70','center');
     });
    }else if(showType==='solar'){
     put(a+dw,b+dd,()=>{
      this.box(a,b,dw,dd,H,'#9dc6c4','#76a5a6','#5c8a95');
      for(let k=0;k<5;k++){const x=a+.2+k*.48;this.box(x,b+.3,.34,.5,3,'#3b788c','#4c7583','#416a7a',H);}
     });
    }else{
     const type=showType==='market'?'market':showType==='school'?'library':showType==='transit'?'station':'civic';
     put(a+dw,b+dd,()=>this.building({i:a,j:b,w:dw,d:dd,h:H,type,tone:0}));
    }
   }
   if(active){
    const pi=i+w*.56,pj=j+d*.65;
    put(pi,pj,()=>{const p=this.iso(pi,pj);this.line(p.x-34,p.y-28,p.x-34,p.y-130,'#c39654',4);this.line(p.x-36,p.y-130,p.x+60,p.y-130,'#c39654',5);this.line(p.x+39,p.y-130,p.x+39,p.y-92,'#9b8661',2);},.1);
   }
   if(['pending','review','checking'].includes(s.state)){
    const pi=i+w*.5,pj=j+d*.5;
    put(pi,pj,()=>{const p=this.iso(pi,pj),color=s.state==='checking'?'#528e8a':'#a88149';
     this.ellipse(p.x,p.y-4,39,17,'rgba(252,222,132,.17)');
     this.line(p.x,p.y-7,p.x,p.y-55,color,3);this.ellipse(p.x,p.y-58,9,9,'#fff5d5');this.text('?',p.x,p.y-59,12,color,'center','800');
    },.7);
   }
  }
  dataCenter(i,j,w,d,h,tone){
   const base=tone%2===0?['#d4e3e1','#9ebdc0','#789ca3']:['#c9d9e4','#91b4c5','#6e91aa'];
   this.box(i,j,w,d,h,base[0],base[1],base[2]);
   const p=this.iso(i+w*.5,j+d*.4),baseY=p.y-h;
   for(let k=0;k<2;k++){
    this.ellipse(p.x+(k*14-7),baseY+3,7,4,'#7fa6a8');this.ellipse(p.x+(k*14-7),baseY+1,4,2,'#d7e7dc');
   }
   this.rect(p.x-10,baseY-13,20,5,'#89aaa5');
  }
  // A train is not a line of road cars. Each coach has its own roof, windows,
  // doors and bogies, and the consist waits beside a platform each circuit.
  trainHead(t){
   const phase=((t%105)+105)%105;
   if(phase<25)return -14+phase*.64;
   if(phase<32)return 2;
   return 2+(phase-32)*.64; // tail leaves the map before the next circuit
  }
  trainCoach(i,j,reversed,k=0,head=false){
   const w=2.05,d=.52,h=30,p=this.box(i,j,w,d,h,'#e3eee9','#b2c8c4','#88a9a8');
   const a=this.iso(i,j+d),b=this.iso(i+w,j+d);
   const point=(t,z)=>[a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t-z];
   // Broad tinted passenger windows and a deliberately different door colour.
   for(let n=0;n<4;n++){
    const x=.12+n*.205;
    this.poly([point(x,24),point(x+.16,24),point(x+.16,13),point(x,13)],'#3e6c77');
    this.line(...point(x,22),...point(x+.16,22),'#b9deda',1);
   }
   this.poly([point(.52,25),point(.59,25),point(.59,7),point(.52,7)],'#ca8e58');
   this.line(...point(.05,7),...point(.95,7),'#4e9c82',4);
   for(const t of [.17,.81]){const q=point(t,0);this.ellipse(q[0],q[1]+2,7,4,'#3b5556');}
   // Cab end is visually distinct from intermediate coaches.
   if(head){const cab=this.iso(i+(reversed?0:w),j+d*.52);
    this.poly([[cab.x+(reversed?-5:5),cab.y-h+6],[cab.x+(reversed?-12:12),cab.y-h+10],[cab.x+(reversed?-12:12),cab.y-h+25],[cab.x+(reversed?-5:5),cab.y-h+23]],'#c4dedd');
    this.ellipse(cab.x+(reversed?-10:10),cab.y-7,3,3,'#fff6c7');
   }
  }
  // Dynamic water objects share the scene's depth order with buildings.
  boat(i,j,type='ferry',reverse=false){
   const q=this.iso(i,j),c=this.ctx;c.save();c.translate(q.x,q.y);c.rotate(Math.atan2(18,36));if(reverse)c.scale(-1,1);
   const cargo=type==='cargo',ferry=type==='ferry',length=cargo?130:ferry?90:62,half=length/2;
   this.poly([[-half+10,-14],[half-14,-14],[half,0],[half-13,17],[-half+12,17],[-half,0]],cargo?'#58717b':ferry?'#f6f1e4':'#d7aa77');
   this.line(-half+8,-12,half-12,-12,'#e8f3e9',3);
   this.poly([[-half+17,-9],[half-21,-9],[half-12,1],[-half+13,1]],cargo?'#d7ded8':'#e3efeb');
   if(cargo){
    for(let k=0;k<4;k++){this.round(-half+20+k*23,-17,20,11,2,['#d0a272','#8ea9a3','#bd896c','#67979c'][k]);this.line(-half+20+k*23,-17,-half+20+k*23,-7,'#fff5dd',1);}
    this.rect(-half+14,-27,19,11,'#eae7d9');this.rect(-half+9,-31,10,6,'#5d8490');
   }else if(ferry){
    this.round(-half+22,-29,length-49,17,4,'#e8f2ee');
    for(let k=0;k<4;k++)this.round(-half+27+k*(length-55)/4,-25,8,8,1,'#477d90');
    this.rect(-half+19,-11,length-38,4,'#3b977e');
   }else{
    this.round(-10,-27,26,16,3,'#f6ebd4');this.round(-4,-22,12,7,2,'#5c8996');
    this.line(14,-24,14,-39,'#796c55',2);this.poly([[14,-37],[38,-27],[14,-22]],'#f2e4bd');
   }
   if(!this.reduced){for(let k=0;k<3;k++)this.line(-half-26-k*16,4+(k%2)*8,-half-14-k*14,7+(k%2)*8,'rgba(232,250,248,.75)',2);}
   c.restore();
  }
  drawCoastalGround(){
   const mode=this.model.harborMode||'shared';
   // The quay belongs to the sea rather than replacing any street parcels.
   this.tile(23.8,22.25,8.7,1.35,mode==='cargo'?'#bfc7b4':mode==='promenade'?'#d4d9bd':'#cbd2c2','#9fafa8');
   this.tile(25.0,23.55,4.25,1.25,mode==='promenade'?'#d4d5af':'#c9c9ae','#a8b6a5');
   this.tile(4.0,23.0,4.4,.6,'#d9cfb7','#a6b4a4');
   // Surface markings communicate whether this shore is for goods or people.
   if(mode==='cargo')for(let n=0;n<4;n++)this.path([[24.5+n*1.8,22.53],[24.5+n*1.8,23.43]],'#e2deca',2,[8,7]);
   if(mode==='promenade')this.path([[23.9,22.8],[31.9,22.8]],'#f1ebd1',8);
   if(mode==='seawall'){
    this.box(23.9,24.65,8.45,.24,18,'#e4e2d4','#9faaa3','#859e98');
    for(let n=0;n<9;n++){const p=this.iso(24+n,24.73);this.line(p.x,p.y-18,p.x,p.y-36,'#73928d',2);}
   }
  }
  waterTraffic(time=this.time,mode=this.model.harborMode||'shared'){
   const inbound=offset=>-14+((time*.19+9+offset)%54);
   const outbound=offset=>42-((time*.155+12+offset)%55);
   const boats=[
    {i:inbound(0),j:29.48,type:'ferry',reverse:false},
    {i:inbound(24),j:29.48,type:'fishing',reverse:false},
    {i:outbound(0),j:28.20,type:'cargo',reverse:true}
   ];
   if(mode==='cargo')boats.push({i:outbound(25),j:28.20,type:'cargo',reverse:true});
   if(mode==='promenade')boats.push({i:inbound(32),j:29.48,type:'ferry',reverse:false});
   return boats;
  }
  coastObjects(add){
   const m=this.model,mode=m.harborMode||'shared',put=(i,j,fn)=>add({depth:i+j+.12},fn);
   // A lighthouse, a small ferry dock and mooring posts remain year-round.
   put(7.9,24.1,()=>{
    this.box(7.55,23.95,.62,.62,76,'#f5f0d9','#c6d1c0','#a6beb4');
    const p=this.iso(7.86,24.26);this.ellipse(p.x,p.y-80,22,8,'#bd8b62');
    this.round(p.x-15,p.y-94,30,13,4,'#e7e2be');this.ellipse(p.x,p.y-96,7,4,'#f9e9a1');
    this.poly([[p.x-19,p.y-93],[p.x,p.y-112],[p.x+19,p.y-93]],'#b96f5d');
   });
   put(6.0,23.25,()=>{
    for(let k=0;k<5;k++){const p=this.iso(4.3+k*.77,23.30);this.line(p.x,p.y+8,p.x,p.y-9,'#817b60',3);this.ellipse(p.x,p.y-10,5,4,'#ddd6ac');}
   });
   // The same shoreline visibly changes with the approved plan.
   if(mode==='cargo'){
    for(let k=0;k<9;k++){const i=24.45+(k%5)*1.26,j=22.56+Math.floor(k/5)*.7;
     put(i,j,()=>this.box(i,j,.99,.57,23,['#c88768','#729b93','#e0b17d'][k%3],'#a7aaa0','#8e9f99'));}
    put(30.9,23.8,()=>{
     const p=this.iso(30.9,23.8);this.line(p.x,p.y-5,p.x,p.y-135,'#c79567',8);
     this.line(p.x-86,p.y-128,p.x+44,p.y-128,'#c79567',9);
     this.line(p.x-83,p.y-128,p.x-83,p.y-81,'#817f70',3);
     this.poly([[p.x-96,p.y-81],[p.x-70,p.y-81],[p.x-76,p.y-66],[p.x-90,p.y-66]],'#7d9b9a');
    });
   }else if(mode==='promenade'){
    for(let k=0;k<5;k++){const i=24.4+k*1.45,j=23.0;
     put(i,j,()=>{const p=this.iso(i,j);this.line(p.x,p.y,p.x,p.y-31,'#8a8167',3);
      this.poly([[p.x-23,p.y-28],[p.x,p.y-44],[p.x+23,p.y-28]],k%2?'#e7b67f':'#a9c9ae');
      this.bench(i+.1,j+.4);});}
    for(let k=0;k<5;k++){const p=this.atPath([[24.2,23.7],[31.3,23.7]],(this.time*.011+k*.18)%1);put(p.i,p.j,()=>this.person(p.x,p.y,k+1));}
   }else if(mode==='seawall'){
    for(let k=0;k<5;k++){const i=24.4+k*1.6,j=24.5;put(i,j,()=>{
     const p=this.iso(i,j);this.round(p.x-8,p.y-44,16,20,4,'#ebf0e3');this.ellipse(p.x,p.y-46,7,5,'#d8b76e');
     this.line(p.x,p.y-46,p.x,p.y-55,'#8e957d',2);
    });}
   }else{
    for(let k=0;k<3;k++){const i=25+k*1.7,j=22.85;put(i,j,()=>this.box(i,j,1.2,.55,13,'#d7c9a6','#b6b6a1','#9eae9f'));}
   }
   // Distinctive water traffic: cargo ships, ferries, small fishing boats.
   // Offshore lanes are separate from the marina's moored craft and piers.
   // All boats sharing a lane move in the same direction and keep a long gap.
   for(const b of this.waterTraffic(this.time,mode)){
    if(b.i<-11||b.i>39)continue;
    put(b.i,b.j,()=>this.boat(b.i,b.j,b.type,b.reverse));
   }
   if(m.harborTrouble==='high-tide')for(let k=0;k<6;k++){const i=23.8+k*1.55,j=24.7;
    put(i,j,()=>{const q=this.iso(i,j);this.line(q.x-15,q.y+2,q.x+15,q.y+2,'#e6f7ef',3);this.ellipse(q.x,q.y+4,25,6,'rgba(242,249,239,.25)');});
   }
  }

  vehicleRoads(){
   // No road vehicle travels across an open rail track. The coastal ring road
   // carries traffic south of the railway; approach roads end at a stop line.
   // Closed two-lane district loops avoid vehicles teleporting when the
   // animation phase wraps back to the start of a street.
   const returnRoad=(i,start)=>[[i-.39,start],[i-.39,14.62],
     [i+.39,14.62],[i+.39,start],[i-.39,start]];
   const crossRoad=(j)=>{const v=j===20?20.12:j;return [[-8,v-.37],[35,v-.37],
     [35,v+.37],[-8,v+.37],[-8,v-.37]];};
   return [
    crossRoad(-6),returnRoad(1,-7.5),returnRoad(11,-7.5),
    returnRoad(22,-7.5),returnRoad(28,.8),
    crossRoad(8),crossRoad(15),crossRoad(20)
   ];
  }
  railTraffic(time=this.time){
   const westHead=this.trainHead(time+21);
   // Reverse service stops with its entire three-car consist at the east platform.
   const eastHead=30.6-this.trainHead(time+68);
   return [[westHead,this.railLines[0],false],[eastHead,this.railLines[1],true]]
    .map(([head,j,reverse],line)=>({line,head,j,reverse,
      coaches:Array.from({length:3},(_,k)=>({
       i:reverse?head+k*this.railCoachPitch:head-k*this.railCoachPitch,
       j,w:this.railLength,d:this.railWidth,k,head:k===0
      }))}));
  }
  advanceActors(dt){
   // Small deterministic local traffic simulation: yielding at crossings avoids
   // decorative cars driving through each other or walking residents.
   const cars=this.vehicleRoads();
   const countCars=20+(this.model.industry>=6?4:0)+(this.model.transitReady?5:0);
   const countWalkers=42+(this.model.residence?6:0)+(this.model.sites.some(s=>s.current==='school')?5:0);
   const carRoute=k=>cars[k%cars.length];
   const walkerRoute=k=>this.walkPaths[(k*7+Math.floor(k/7))%this.walkPaths.length];
   // New visitors/vehicles spawn at safe, reproducible positions, not on top
   // of an existing person or another car.
   for(let k=0;k<countCars;k++)if(this.carPhases[k]===undefined){
    for(let n=0;n<120;n++){
     const phase=(this.time*.018+k*.097+n*.019)%1,p=this.atPath(carRoute(k),phase);
     if(this.carPhases.slice(0,k).every((f,l)=>Math.hypot(p.x-this.atPath(carRoute(l),f).x,p.y-this.atPath(carRoute(l),f).y)>=25)){
      this.carPhases[k]=phase;break;
     }
    }
    if(this.carPhases[k]===undefined)this.carPhases[k]=(this.time*.018+k*.097)%1;
   }
   for(let k=0;k<countWalkers;k++)if(this.walkerPhases[k]===undefined){
    for(let n=0;n<120;n++){
     const phase=(this.time*.018+k*.129+n*.021)%1,p=this.atPath(walkerRoute(k),phase);
     if(this.carPhases.slice(0,countCars).every((f,l)=>Math.hypot(p.x-this.atPath(carRoute(l),f).x,p.y-this.atPath(carRoute(l),f).y)>=19)){
      this.walkerPhases[k]=phase;break;
     }
    }
    if(this.walkerPhases[k]===undefined)this.walkerPhases[k]=(this.time*.018+k*.129)%1;
   }
   const carAt=k=>this.atPath(carRoute(k),this.carPhases[k]);
   const walkerAt=k=>this.atPath(walkerRoute(k),this.walkerPhases[k]);
   if(!(dt>0)||this.model.paused||this.reduced)return;
   // Skip large tab-resume deltas so pedestrians never teleport through traffic.
   let remaining=Math.min(dt,.5);
   while(remaining>.00001){
    const step=Math.min(.06,remaining),amount=step*.018;
    const carNow=Array.from({length:countCars},(_,k)=>carAt(k));
    const walkerNow=Array.from({length:countWalkers},(_,k)=>walkerAt(k));
    // Residents approaching a crossing wait when a vehicle is within reach.
    for(let k=0;k<countWalkers;k++){
     const next=(this.walkerPhases[k]+amount)%1;
     const p=this.atPath(walkerRoute(k),next);
     if(carNow.every(c=>Math.hypot(c.x-p.x,c.y-p.y)>=16)){
      this.walkerPhases[k]=next;walkerNow[k]=p;
     }
    }
    // Cars yield to pedestrians and earlier vehicles at shared junctions.
    for(let k=0;k<countCars;k++){
     const next=(this.carPhases[k]+amount)%1;
     const p=this.atPath(carRoute(k),next);
     // Traffic stops farther away from a pedestrian crossing a junction;
     // walkers then clear the intersection instead of both sides deadlocking.
     const blocked=walkerNow.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<
       (Math.abs(Math.sin(p.dir-q.dir))>.55?30:16))||
      carNow.some((q,l)=>l!==k&&Math.hypot(q.x-p.x,q.y-p.y)<23);
     if(!blocked){this.carPhases[k]=next;carNow[k]=p;}
    }
    remaining-=step;
   }
  }
  dynamicEntities(){
   const m=this.model,entities=[],add=(p,draw)=>entities.push({depth:p.depth??p.i+p.j,draw});
   const walks=this.walkPaths;
   // A busier residential and learning district brings more pedestrians.
   const people=m.crisisVisual==='departure'?10:42+(m.residence?6:0)+(m.sites.some(s=>s.current==='school')?5:0);
   for(let k=0;k<people;k++){
    const p=this.atPath(walks[(k*7+Math.floor(k/7))%walks.length],this.walkerPhases[k]??((this.time*.018+k*.129)%1));
    add(p,()=>this.person(p.x,p.y,k));
   }
   // Jobs and transit change traffic volume, but vehicles stay on the same roads.
   const drives=this.vehicleRoads();
   const traffic=20+(m.industry>=6?4:0)+(m.transitReady?5:0);
   for(let k=0;k<traffic;k++){
    const p=this.atPath(drives[k%drives.length],this.carPhases[k]??((this.time*.018+k*.097)%1));
    add(p,()=>this.car(p.x,p.y,p.dir,k));
   }
   // Three-car services pass on separate physical tracks, never on the same strip.
   for(const train of this.railTraffic())for(const coach of train.coaches){
    const {i,j,k}=coach;
    if(i<-13||i>39)continue;
    add({depth:i+j+2.5},()=>this.trainCoach(i,j,train.reverse,k,k===0));
   }
   // A heatwave crowd stays on a paved sidewalk and shares normal sprite depth sorting.
   if(m.serviceState==='heat'){
    const crowded=this.walkPaths.filter(route=>route.some(q=>Math.hypot(q[0]-12.8,q[1]-11.6)<6));
    if(crowded.length){for(let k=0;k<5;k++){
     const p=this.atPath(crowded[k%crowded.length],(.21+k*.17+this.time*.002)%1);
     add(p,()=>this.person(p.x,p.y,k,false));
    }}
   }

   // Peaceful resident gatherings visualize live issues without occupying roads or parcels.
   for(const event of (m.civicEvents||[]).filter(e=>e.state!=='resolved')){
    const site=m.site(event.siteId),path=this.agentPath(site,1);
    for(let k=0;k<5;k++){
     const p=this.atPath(path,.28+k*.09);
     add(p,()=>{
      this.person(p.x,p.y,k+3,false);
      if(k===1||k===3){this.line(p.x+4,p.y-6,p.x+4,p.y-25,'#806b4e',1.5);this.round(p.x-7,p.y-35,24,14,2,'#fff8e3','#a77e4e');this.text('声',p.x+5,p.y-28,9,'#78532d','center','700');}
     });
    }
   }
   // The newcomer is drawn in the same depth-sorted world as the residents,
   // so roofs, trees and people have coherent front/back placement.
   if(this.visitorEntrance&&m.visitor){
    const p=this.entrancePosition(),name=this.visitorEntrance.name;
    if(p)add(p,()=>{
     this.ellipse(p.x,p.y+7,20,8,'rgba(232,172,75,.52)');
     this.ctx.save();this.ctx.translate(p.x,p.y);this.ctx.scale(.6,.6);
     this.drawHuman(0,0,'#dc9860');this.rect(-10,-1,20,8,'#507c9b');
     this.ctx.restore();
     const font=12,width=Math.min(195,Math.max(65,Array.from(name).length*font+25));
     this.round(p.x-width/2,p.y-66,width,22,7,'#fff5db','#a77940');
     this.text(name+'さん',p.x,p.y-55,font,'#714923','center','800');
    });
   }
   // Quays, public sea walk and moving boats are real parts of the live city.
   this.coastObjects(add);
   // Editable sites are depth-sorted tree-by-tree and building-by-building.
   for(const site of m.sites)this.addSiteObjects(site,add);
   return entities;
  }
  render(dt=0){
   if(!this.reduced&&!this.model.paused&&this.model.crisisVisual!=='transit')this.time+=dt;
   this.advanceActors(this.model.crisisVisual==='transit'?0:dt);
   if(this.reduced){this.zoom=this.zoomTarget;}else if(Math.abs(this.zoomTarget-this.zoom)>.001){this.zoom+= (this.zoomTarget-this.zoom)*Math.min(1,dt*8);}
   else this.zoom=this.zoomTarget;this.layout();const c=this.ctx,r=this.canvas.getBoundingClientRect();
   c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle='#e4e9dd';c.fillRect(0,0,r.width,r.height);
   c.setTransform(this.dpr*this.scale,0,0,this.dpr*this.scale,this.dpr*this.ox,this.dpr*this.oy);this.drawWorld();this.drawServices();this.drawDecisionHighlight();
  }
  setDecisionHighlight(id,label){const site=this.model.site(id);if(!site)return false;this.decisionHighlight={id,label,startedAt:performance.now()};return true;}
  clearDecisionHighlight(){this.decisionHighlight=null;}
  drawDecisionHighlight(){
   const beat=this.decisionHighlight;if(!beat)return;
   const site=this.model.site(beat.id);if(!site){this.decisionHighlight=null;return;}
   const elapsed=performance.now()-beat.startedAt;if(!this.reduced&&elapsed>850){this.decisionHighlight=null;return;}
   // Convert the iso-space district center to the *viewport* before drawing.
   // Canvas world scale can be ~0.2 on iPhone: world-space text would become unreadable.
   const p=this.project([site.cell[0]+site.w*.52,site.cell[1]+site.d*.55],0,-16);
   const c=this.ctx,r=this.canvas.getBoundingClientRect(),t=this.reduced?1:Math.min(1,elapsed/850);
   const ease=1-Math.pow(1-t,3),radius=this.reduced?37:24+ease*30,alpha=this.reduced?.82:1-t*.6;
   c.save();c.setTransform(this.dpr,0,0,this.dpr,0,0);c.globalAlpha=alpha;
   c.strokeStyle='#fff5b8';c.lineWidth=4;c.beginPath();c.ellipse(p.x,p.y,radius,radius*.52,0,0,Math.PI*2);c.stroke();
   c.strokeStyle='#257657';c.lineWidth=2.5;c.beginPath();c.ellipse(p.x,p.y,radius+8,(radius+8)*.52,0,0,Math.PI*2);c.stroke();
   if(!this.reduced&&elapsed<650){
    for(let k=0;k<5;k++){const a=k*Math.PI*2/5+Math.PI/5,dist=radius+16;
     c.fillStyle=k%2?'#fff5b8':'#8fcda1';c.beginPath();c.arc(p.x+Math.cos(a)*dist,p.y+Math.sin(a)*dist*.54,3.5,0,Math.PI*2);c.fill();}
   }
   if(elapsed<650||this.reduced){
    const label=beat.label;c.font='800 15px "Yu Gothic","Noto Sans CJK JP",sans-serif';
    const w=c.measureText(label).width+24,h=30;
    const x=Math.max(8,Math.min(r.width-w-8,p.x-w/2)),y=Math.max(45,Math.min(r.height-h-8,p.y-79));
    c.fillStyle='rgba(255,253,239,.97)';c.beginPath();c.roundRect(x,y,w,h,8);c.fill();
    c.strokeStyle='#2f7454';c.lineWidth=1.5;c.stroke();
    c.fillStyle='#245642';c.textAlign='center';c.textBaseline='middle';c.fillText(label,x+w/2,y+h/2);
   }
   c.restore();
  }
  drawServices(){
   const m=this.model,c=this.ctx,spot=this.iso(25,10);
   // Operational trouble is derived from completed decisions, not random decoration.
   if(m.serviceState==='rain'){
    // Broad inundation follows the coastal roads; static water keeps reduced-motion readable.
    for(const corners of [[[2,14],[31,14],[31,20],[2,20]],[[19,6],[32,6],[32,20],[19,20]]]){
     this.poly(corners.map(p=>this.pt(p)),'rgba(46,136,173,.52)','#4b9ab5',2);
    }
    for(let k=0;k<18;k++){const p=this.iso(3+k*1.6,15+(k%3));this.line(p.x-20,p.y,p.x+20,p.y,'rgba(222,247,255,.72)',3);}
    for(const cell of [[8,15],[22,10],[28,15]]){const p=this.iso(...cell);this.round(p.x-58,p.y-35,116,30,5,'#fff1df','#a14c3f');this.text('浸水・通行止め',p.x,p.y-19,14,'#8b352c','center','800');}
    for(let k=0;k<34;k++){const x=450+(k*103)%1850,y=210+(k*79)%780;this.line(x,y,x-10,y+25,'rgba(72,118,151,.55)',2);}
   }
   if(m.serviceState==='demand'){
    for(const s of m.sites.filter(x=>x.current==='dc')){const p=this.iso(s.cell[0]+s.w*.5,s.cell[1]+s.d*.5);this.round(p.x-24,p.y-99,48,23,5,'#fff0d7');this.text('節電',p.x,p.y-87,14,'#825b2d','center');}
   }
   if(m.crisisVisual==='transit')for(const cell of [[1,15],[16,8],[28,15]]){const p=this.iso(...cell);this.round(p.x-45,p.y-24,90,24,4,'#fff1dd','#a34d3a');this.text('交通停止',p.x,p.y-11,14,'#8b352c','center','800');this.line(p.x-34,p.y+5,p.x+34,p.y+5,'#b24c3c',6);}
   if(m.crisisVisual==='economy')for(const cell of [[22,7],[28,7],[24,12]]){const p=this.iso(...cell);this.round(p.x-35,p.y-58,70,27,4,'#e2dfd7','#84796e');this.text('休業',p.x,p.y-44,15,'#65584c','center','800');}
   if(m.crisisVisual==='departure'){const p=this.iso(13,12);this.round(p.x-70,p.y-40,140,29,5,'#f5eddf','#9b8061');this.text('人通りが途切れた',p.x,p.y-24,15,'#795c43','center','800');}
   if(m.crisisVisual==='divide'){
    const west=this.iso(8,10),east=this.iso(23,10);
    this.round(west.x-86,west.y-67,172,28,5,'#fff3d6','#ad7f4a');
    this.text('施設が充実した地区',west.x,west.y-49,13,'#795b32','center','800');
    this.round(east.x-85,east.y-66,170,28,5,'#e2e4e2','#7a8184');
    this.text('取り残された地区',east.x,east.y-48,13,'#62676b','center','800');
    const divider=this.iso(15.5,10);
    this.line(divider.x-12,divider.y-70,divider.x+12,divider.y+55,'#bb7452',7);
   }
   if(m.crisisVisual==='protest')for(let k=0;k<7;k++){const p=this.iso(13+k*.7,9);this.person(p.x,p.y,k,false);this.line(p.x+6,p.y-8,p.x+6,p.y-40,'#796147',2);this.round(p.x-20,p.y-54,54,22,3,'#fff6da','#936d49');this.text('説明を',p.x+6,p.y-42,12,'#794d32','center','800');}
   if(m.finalWarning){const p=this.iso(m.warningVisual==='flood'?25:13,m.warningVisual==='flood'?12:9);this.ellipse(p.x,p.y+6,90,28,'rgba(211,156,58,.30)');this.round(p.x-75,p.y-70,150,30,5,'#fff3d6','#b1853c');this.text('残った課題を点検中',p.x,p.y-54,15,'#785321','center','800');}
   if(m.shadePrepared){const p=this.iso(8.3,12.2);for(let k=0;k<3;k++){const x=p.x+k*32;this.line(x,p.y-30,x,p.y+2,'#806d52',3);this.poly([[x-23,p.y-30],[x,p.y-43],[x+23,p.y-30]],'#d8cbb0');}}

  }
  drawWorld(){
   const c=this.ctx,m=this.model;c.drawImage(this.ground,0,0);this.drawCoastalGround();
   // Flat site tiles lie beneath every passer-by; trees and buildings are sorted separately.
   m.sites.forEach(s=>this.siteGround(s));
   const entities=this.dynamicEntities();this.props.forEach(p=>entities.push({depth:p.depth,draw:()=>c.drawImage(p.image,p.x,p.y)}));
   entities.sort((a,b)=>a.depth-b.depth);entities.forEach(e=>e.draw());
   // District names are part of the landscape; no extra permanent dashboard.
   if(this.zoom<=1.25){
    const labels=[['住宅街',[2,8]],[m.parks<.01?'緑地跡':m.parks<1?'公園と施設':'中央公園',[13.5,13.2]],['仕事の街',[25.2,7]],['駅前',[0,17]],['港と海辺',[28,25.15]],['学びの街',[4.6,13.1]]];
    for(const [label,p] of labels){const q=this.iso(...p);this.round(q.x-(label.length>4?57:43),q.y-13,label.length>4?114:86,27,7,'rgba(255,253,233,.92)');this.text(label,q.x,q.y,17,'#365f52','center','800');}
   }
  }

 }
 root.F5CityScene=TownScene;
})(window);

/* F5 v12 art direction: a hand-crafted, runtime-rendered 2.5D city skin.
   All geometry is generated locally with Canvas primitives; no hosted artwork,
   third-party tiles, network calls, or changes to the decision simulation.
   The player can switch back to the exact v11.2 scene painter at any moment. */
(function(root){
 'use strict';
 const Base=root.F5CityScene;
 const nclamp=(n,a,b)=>Math.min(b,Math.max(a,n));
 const palette={
  sand:'#ead6ac',ivory:'#fff4db',deep:'#284e51',steel:'#597a82',ink:'#304b53',
  ocean:'#4c9bb7',foam:'#e0f7ed', grass:'#9ebf7b',leaf:'#568e72',roof:'#be7955'
 };
 function shade(col,amount){
  const m=/^#([\da-f]{6})$/i.exec(col);if(!m)return col;
  const n=parseInt(m[1],16);return '#'+[16,8,0].map(sh=>nclamp(((n>>sh)&255)+amount,0,255).toString(16).padStart(2,'0')).join('');
 }
 class IllustratedScene extends Base{
  constructor(...args){super(...args);this.artMode='illustrated';}
  setArtMode(mode){
   if(mode!=='classic'&&mode!=='illustrated')return false;
   if(this.artMode===mode)return false;
   this.artMode=mode;
   this.buildCache();this.lastLayout='';this.layout();this.render(0);
   return true;
  }
  buildCache(){
   super.buildCache();
   if(this.artMode==='classic')return;
   const c=this.ctx;
   for(const [i,j,name] of [[-4.2,16.66,'西駅'],[27.2,16.66,'東駅']]){
    const q=this.iso(i+1.8,j+.18);
    const x=Math.floor(q.x-145),y=Math.floor(q.y-152),w=295,h=255;
    const im=document.createElement('canvas');im.width=w;im.height=h;
    this.ctx=im.getContext('2d');this.ctx.translate(-x,-y);
    this.stationArt(i,j,name);
    this.props.push({depth:i+j+.23,image:im,x,y});
   }
   this.ctx=c;this.props.sort((a,b)=>a.depth-b.depth);
  }
  // Reusable three-dimensional geometry: transparent shadows, inset facade
  // panes and roof trim all share the scene's original world coordinates.
  roofDetail(i,j,w,d,height,co,type,tone){
   const p=(u,v,z=height)=>{const q=this.iso(i+u*w,j+v*d);return[q.x,q.y-z];};
   if(type==='house'){
    const ridge=p(.5,0,height+21),ridge2=p(.5,1,height+21);
    this.poly([p(0,0),ridge,ridge2,p(0,1)],tone%2?'#668678':'#c4785c','#f9e7c7',1);
    this.poly([ridge,p(1,0),p(1,1),ridge2],tone%2?'#567c74':'#9d5e4e','#f8dcb8',1);
    for(let k=1;k<4;k++){
     const u=k/4;const a=p(u,0,height+Math.max(0,1-Math.abs(u-.5)*2)*21),b=p(u,1,height+Math.max(0,1-Math.abs(u-.5)*2)*21);
     this.line(...a,...b,'rgba(255,239,209,.26)',1.3);
    }
    this.poly([p(.2,.26,height+22),p(.35,.26,height+28),p(.35,.56,height+28),p(.2,.56,height+22)],'#f3e0b8');
   }else if(['tower','office','technology'].includes(type)){
    this.poly([p(.07,.07,height+3),p(.91,.07,height+3),p(.91,.92,height+3),p(.07,.92,height+3)],shade(co[0],12),'#e2f3e7',1);
    for(let k=0;k<3;k++){
     const a=p(.16+k*.25,.16,height+4),b=p(.27+k*.25,.16,height+4),c=p(.27+k*.25,.47,height+4),d=p(.16+k*.25,.47,height+4);
     this.poly([a,b,c,d],k%2?'#29647a':'#3b8491');this.line(...a,...b,'#a5d5d6',1);
    }
    const a=p(.66,.61),b=p(.82,.61),c=p(.82,.78),d=p(.66,.78);
    this.poly([a,b,c,d],'#a9c4c0');
    const p2=p(.74,.69,height+9);this.ellipse(p2[0],p2[1],9,4,'#d4e5e0');
   }else if(type==='station'||type==='platform'){
    this.poly([p(0,0,height+5),p(1,0,height+5),p(1,1,height+5),p(0,1,height+5)],'#456e68','#e1f1dc',2);
    for(let k=0;k<4;k++){let a=p(k*.25,0,height+5),b=p(k*.25,1,height+5);this.line(...a,...b,'rgba(243,254,243,.38)',2);}
   }else{
    this.poly([p(.05,.05,height+4),p(.95,.05,height+4),p(.95,.95,height+4),p(.05,.95,height+4)],shade(co[3],-10));
    if(['shop','cafe','market','civic','library'].includes(type)){
     for(let k=0;k<3;k++){const q=p(.2+k*.28,.55,height+6);this.ellipse(q[0],q[1],8,4,k%2?'#deb883':'#adc6ab');}
    }
   }
  }
  building(b){
   if(this.artMode==='classic')return super.building(b);
   const {i,j,w,d,h,type,tone=0}=b;
   const residential=['house','apartment'].includes(type);
   const high=['tower','technology','office'].includes(type);
   const service=['shop','cafe','market'].includes(type);
   const bases={
    house:['#f5ddbb','#eed0ac','#d5b392','#be7756'],apartment:['#d9e7de','#bfd5cf','#9fbdb3','#5f9d9a'],
    tower:['#b8e4e7','#75b8c4','#4b8c9f','#2f657e'],office:['#d6e5e4','#9fc6cd','#75a4af','#487f90'],
    technology:['#c9e3dd','#95c4bf','#5f9a9c','#3c7f8b'],shop:['#f4e1bc','#dec59d','#c39d7b','#d28e63'],
    cafe:['#f0d7ad','#e8cda1','#d5a982','#c67e5b'],market:['#f8e7cb','#dec6a2','#c7ad8e','#b97960'],
    civic:['#eee7d4','#d8d7c1','#b8c4b7','#568d82'],station:['#e4ebe0','#bed2c7','#90b0a9','#4c7e7d'],
    platform:['#e6dccb','#c6baaa','#a6ada0','#587b77'],factory:['#d6dad0','#afc0b2','#869d97','#8b7d70'],
    arena:['#e5e1ce','#c4d0bc','#95b3a9','#68a5b1'],library:['#f1e1c8','#d7c2a7','#bfa88b','#7a9e83']
   };
   const raw=bases[type]||bases.house;
   const co=tone%3===0?raw:[shade(raw[0],tone%3===1?5:-9),shade(raw[1],tone%3===1?7:-5),shade(raw[2],tone%3===1?6:-5),raw[3]];
   const pp=[[i,j],[i+w,j],[i+w,j+d],[i,j+d]].map(q=>this.iso(...q));
   // Crisp ambient shadow, outline at foot, sunlight from the northwest.
   this.poly(pp.map(p=>[p.x+13+Math.min(h*.055,13),p.y+8+Math.min(h*.04,8)]),'rgba(34,68,65,.14)');
   const {p,t}=this.box(i,j,w,d,h,co[0],co[1],co[2]);
   this.line(p[3].x,p[3].y,p[2].x,p[2].y,shade(co[1],-25),2);
   this.line(p[2].x,p[2].y,p[1].x,p[1].y,shade(co[2],-24),2);
   const left=(u,z)=>{const x=p[3].x+(p[2].x-p[3].x)*u,y=p[3].y+(p[2].y-p[3].y)*u;return[x,y-z];};
   const right=(u,z)=>{const x=p[1].x+(p[2].x-p[1].x)*u,y=p[1].y+(p[2].y-p[1].y)*u;return[x,y-z];};
   const storeys=Math.max(1,Math.floor((h-14)/25));
   const countLeft=Math.max(1,Math.floor(w*2.3));
   const countRight=Math.max(1,Math.floor(d*2.3));
   for(let row=0;row<storeys;row++){
    const z=h-17-row*24;
    for(let col=0;col<countLeft;col++){
     const a=(col+.14)/countLeft,b=(col+.78)/countLeft;
     const A=left(a,z),B=left(b,z),C=left(b,z-14),D=left(a,z-14);
     this.poly([A,B,C,D],high?'#3e8296':'#4d8886',shade(co[1],-24),.8);
     this.poly([[A[0]+1,A[1]+1],[B[0]-1,B[1]+.5],[B[0]-1,B[1]+4],[A[0]+1,A[1]+4.5]],'rgba(231,253,239,.55)');
     if(high&&row%2===0)this.poly([left(a,z-9),left(b,z-9),left(b,z-11),left(a,z-11)],'rgba(131,211,218,.42)');
     if(type==='apartment'&&(row+col)%2===0){const ra=left(a-.015,z-15),rb=left(b+.015,z-15);this.line(...ra,...rb,'#f3e9cf',2);this.line(...ra,ra[0],ra[1]+5,'#f2e5ce',1.4);}
    }
    for(let col=0;col<countRight;col++){
     const a=(col+.19)/countRight,b=(col+.79)/countRight;
     const A=right(a,z),B=right(b,z),C=right(b,z-14),D=right(a,z-14);
     this.poly([A,B,C,D],high?'#235f77':'#5b918b',shade(co[2],-21),.8);
     this.line(A[0]+.8,A[1]+2,B[0]-.8,B[1]+2,'rgba(226,248,241,.58)',1.5);
    }
    if(high){const l=left(0,z-19),r=left(1,z-19);this.line(...l,...r,'rgba(216,247,233,.42)',1);}
   }
   if(service){
    const a=left(.05,15),z=left(.95,15);this.line(...a,...z,'#fcf0cb',3);
    for(let k=0;k<7;k++){
     const a=left(.05+k*.13,25),b=left(.17+k*.13,25),c=left(.17+k*.13,14),d=left(.05+k*.13,14);
     this.poly([a,b,c,d],k%2===0?co[3]:'#fff1d2');
    }
    const s=left(.5,37);this.round(s[0]-21,s[1]-8,43,14,3,'#fff1d3');
    // Signs are kept logo-like, not English placeholder copy.
    for(let k=0;k<3;k++)this.ellipse(s[0]-9+k*8,s[1],2,2,co[3]);
   }
   if(high){
    const a=left(0,7),b=left(1,7);this.line(...a,...b,'#d0e9dd',3);
    for(let k=0;k<2;k++){const q=left(.17+k*.6,h-22);this.line(q[0],q[1],q[0],q[1]-12,'#bfe4db',2);}
   }
   this.roofDetail(i,j,w,d,h,co,type,tone);
   if(type==='house'){
    const door=left(.54,13);this.poly([[door[0]-5,door[1]],[door[0]+5,door[1]+3],[door[0]+5,door[1]+16],[door[0]-5,door[1]+13]],'#82695b');
    this.ellipse(door[0]+2,door[1]+8,1.1,1.1,'#fcdda3');
   }
   if(type==='station'){
    const q=this.iso(i+w/2,j+d);this.round(q.x-25,q.y-h+8,50,19,4,'#fff1cf','#527d73');this.text('駅',q.x,q.y-h+18,14,'#2b6664','center');
   }
   if(type==='tower'&&h>160){const q=this.iso(i+w*.52,j+d*.52);this.line(q.x,q.y-h-7,q.x,q.y-h-32,'#719fa1',2);this.ellipse(q.x,q.y-h-34,4,4,'#edc889');}
   if(type==='factory'){const q=this.iso(i+w*.7,j+d*.2);this.box(i+w*.65,j+d*.05,.16,.16,37,'#ded5bb','#9db0a5','#7e9b9b',h);this.ellipse(q.x+8,q.y-h-41,9,4,'rgba(237,245,232,.45)');}
  }
  tree(i,j,s=1){
   if(this.artMode==='classic')return super.tree(i,j,s);
   const p=this.iso(i,j),t=this.time||0,wind=this.reduced?0:Math.sin(t*.8+i*.9+j*.45)*.7;
   this.ellipse(p.x+9*s,p.y+6*s,17*s,6*s,'rgba(45,87,61,.17)');
   this.poly([[p.x-3*s,p.y],[p.x+3*s,p.y],[p.x+1.5*s+wind,p.y-25*s],[p.x-2*s+wind,p.y-25*s]],'#947958');
   this.ellipse(p.x+wind-8*s,p.y-26*s,12*s,14*s,'#3d8066');
   this.ellipse(p.x+wind+7*s,p.y-29*s,13*s,16*s,'#487e66');
   this.ellipse(p.x+wind,p.y-39*s,15*s,17*s,'#70a677');
   this.ellipse(p.x+wind-6*s,p.y-40*s,8*s,9*s,'#91bf84');
   this.ellipse(p.x+wind+8*s,p.y-25*s,5*s,6*s,'#80b783');
   this.ellipse(p.x+wind+5*s,p.y-39*s,4*s,4*s,'rgba(220,243,187,.43)');
  }
  dataCenter(i,j,w,d,h,tone){
   if(this.artMode==='classic')return super.dataCenter(i,j,w,d,h,tone);
   const raw=tone%2?['#d5e7df','#9ac5c0','#679e9d']:['#dbeae4','#9ac4ce','#638faa'];
   this.box(i,j,w,d,h,...raw);
   const q=this.iso(i+w*.5,j+d*.5),r=this.iso(i+w*.5,j+d*.18);
   this.tile(i+.08,j+.06,w-.16,d-.12,'rgba(255,255,255,.10)');
   for(let k=0;k<5;k++){
    const a=this.iso(i+w*(.12+k*.165),j+d*.75),b=this.iso(i+w*(.12+k*.165),j+d*.95);
    this.line(a.x,a.y-h*.67,b.x,b.y-h*.67,'#518797',3);
   }
   for(let k=0;k<3;k++){
    const a=this.iso(i+w*(.2+k*.28),j+d*.28);
    this.ellipse(a.x,a.y-h-3,7,4,'#5f8992');this.ellipse(a.x,a.y-h-5,3.5,1.5,'#c2e2df');
   }
   this.line(r.x-17,r.y-h-7,r.x+19,r.y-h-7,'#e5f6e9',2);
  }
  drawGround(){
   if(this.artMode==='classic')return super.drawGround();
   const c=this.ctx;
   const sky=c.createLinearGradient(0,0,0,this.H);sky.addColorStop(0,'#deeee8');sky.addColorStop(1,'#c5dfc8');
   this.rect(0,0,this.W,this.H,sky);
   // Island foundation and thin coastal relief, in the original map grid.
   this.tile(-11,-9.5,49,41,'#8dad89');
   this.tile(-11,-9.5,49,40.7,'#d2e0bd');
   const rng=(i,j)=>{const n=Math.sin(i*127.1+j*311.7)*43758.545;return n-Math.floor(n);};
   for(let i=-10;i<37;i++)for(let j=-9;j<30;j++){
    const k=rng(i,j);
    this.tile(i,j,1,1,k<.18?'#c6d9b1':k<.42?'#d2e0bc':k<.71?'#dae4c5':'#d3e1c4');
    if(k>.84){const a=this.iso(i+.35,j+.4);this.ellipse(a.x,a.y,2.1,1.1,'rgba(91,138,89,.22)');}
   }
   // Sea is blue-green with a brighter south-facing open water gradient.
   const sea=c.createLinearGradient(600,320,1800,1480);
   sea.addColorStop(0,'#4494a9');sea.addColorStop(.35,'#4aadc3');sea.addColorStop(.75,'#68c0d0');sea.addColorStop(1,'#78c6d1');
   this.tile(-10.5,-9,3.5,43,sea);
   this.tile(-10.5,22,48,8,sea);
   this.tile(-10.5,21.84,48,.27,'#a1c6b6');
   this.tile(-10.5,21.68,48,.20,'#ead9ac');
   this.tile(-7.1,-9,.47,34,'#e7d6aa');
   // Water sparkle clusters keep the waterfront readable as water at overview scale.
   for(let i=-8;i<37;i+=1.1)for(let j=23;j<30;j+=.85){
    const n=rng(i*3,j*7);if(n<.48)continue;
    const p=this.iso(i+n*.55,j+n*.32);this.line(p.x-4,p.y,p.x+4+n*5,p.y,'rgba(233,252,244,.45)',1.5);
    if(n>.86)this.ellipse(p.x+7,p.y-4,1.5,1,'rgba(241,255,247,.65)');
   }
   for(let j=-8;j<23;j+=1.15){const n=rng(j,9);const q=this.iso(-8.8+n*.5,j);this.line(q.x-6,q.y,q.x+7,q.y,'rgba(233,251,246,.43)',1.8);}
   // Subtle zoning color is kept below the road grid; plots remain editable.
   this.tile(11.55,8.7,3.85,5.92,'#a1c78c');
   this.tile(-5.8,9.1,3.2,3.3,'#a9ceb0');
   this.tile(26.5,8.75,7.3,8.2,'#c3d5ba');
   this.tile(14,-8.1,20,12,'#bed6d0');
   // Accent gardens along blocks, without overlapping any building or road.
   for(let k=0;k<90;k++){
    const i=-6+(k*5.743)%40,j=-6+(k*3.767)%26;
    if(this.roadOverlap(i-.15,j-.15,.3,.3,1.25)||this.parcelOverlap(i-.15,j-.15,.3,.3,.28))continue;
    const p=this.iso(i,j),r=1.7+(k%3);
    this.ellipse(p.x,p.y,r*1.7,r*.7,k%2?'rgba(84,142,78,.2)':'rgba(248,231,176,.4)');
   }
   // Roads: warm curb, strong edge, asphalt and restrained center markings.
   for(const i of this.roadsI){
    const wide=i===1||i===22;
    this.path([[i,-9.5],[i,22.1]],'#e8e2cd',wide?43:32);
    this.path([[i,-9.5],[i,22.1]],'#9cb3aa',wide?35:26);
    this.path([[i,-9.5],[i,22.1]],'#627d80',wide?28:19);
    this.path([[i,-9.5],[i,22.1]],'#e8e9d9',1.8,[9,14],.93);
   }
   for(const j of this.roadsJ){
    const wide=j===15;
    this.path([[-10,j],[37,j]],'#ebe6d4',wide?45:33);
    this.path([[-10,j],[37,j]],'#9aafa5',wide?37:26);
    this.path([[-10,j],[37,j]],'#667e82',wide?31:19);
    this.path([[-10,j],[37,j]],'#e6e8d6',1.6,[10,13],.93);
   }
   // Zebra crossings and four-corner markings at visible junctions.
   for(const i of this.roadsI)for(const j of this.roadsJ){
    if(j>16)continue;
    const q=this.iso(i,j);if(q.x<85||q.x>this.W-60||q.y<60||q.y>this.H-40)continue;
    const aa=this.iso(i+.20,j-.30),bb=this.iso(i-.18,j+.28);
    for(let k=-2;k<=2;k++){const t=k*.17;this.line(q.x-13+t*3,q.y-6+t*12,q.x+10+t*3,q.y+6+t*12,'rgba(244,245,223,.56)',2.2);}
    this.ellipse(aa.x,aa.y,2,2,'#e3c17f');this.ellipse(bb.x,bb.y,2,2,'#f0d197');
   }
   // Rail sleepers, ballast and two parallel tracks. A station is a destination,
   // not a bar on the map.
   for(const j of this.railLines){
    this.path([[-10,j],[37,j]],'#b4c2b4',20);
    this.path([[-10,j],[37,j]],'#6b7f77',17);
    for(let i=-10;i<37;i+=.45)this.path([[i,j-.23],[i,j+.23]],'#998b73',3);
    this.path([[-10,j-.11],[37,j-.11]],'#e6ddd0',2.8);
    this.path([[-10,j+.11],[37,j+.11]],'#ebeee0',2.8);
   }
   for(const [i,w] of [[-5.7,9.5],[26.2,8.1]]){
    this.tile(i,16.59,w,.32,'#f2e4c6','#a3b4a9');
    this.tile(i,16.91,w,.055,'#d8a457');
    this.tile(i,17.86,w,.66,'#f2e4c6','#a3b4a9');
    this.tile(i,17.86,w,.065,'#d8a457');
    this.tile(i,18.45,w,.065,'#d8a457');
   }
   // Three slender bridges meet the waterfront, with visible pier structure.
   for(const i of [2,15,29]){
    this.path([[i,19.95],[i,27]],'#829b99',43);
    this.path([[i,19.95],[i,27]],'#ebdebe',34);
    this.path([[i,19.95],[i,27]],'#a8b7a8',2.6,[9,16]);
    this.path([[i-.46,19.95],[i-.46,27]],'#567f83',2);
    this.path([[i+.46,19.95],[i+.46,27]],'#567f83',2);
   }
   // Wooden and brick piers have individual planks and bollards at scale.
   this.tile(3.5,22.16,5.2,1.15,'#c9a880','#866f60');
   for(let n=0;n<12;n++)this.path([[3.5+n*.4,22.17],[3.5+n*.4,23.29]],'rgba(255,237,205,.35)',1);
   this.tile(23.8,22.15,8.7,1,'#bec9b5','#8a9f95');
   this.tile(-4,5.7,2.5,1.4,'#8abf9d');
   // A few maritime foam strokes make the edge feel wet, not hard-clipped.
   for(let i=-10;i<37;i+=1.6){const a=this.iso(i,21.95);this.line(a.x-9,a.y+6,a.x+11,a.y+6,'rgba(250,254,237,.55)',1.4);}
  }
  // Scenic quay geometry is retained in both seasons; land use decisions still
  // alter the working eastern pier. This old market pier is a small landmark.
  marinaGround(){
   const planks='#c9a077',edge='#806e5e';
   this.tile(10.3,22.22,4.4,1.1,planks,edge);
   this.tile(12.0,23.0,1.45,2.45,'#c6a17a',edge);
   this.tile(8.7,25.1,4.65,.92,'#d3b089',edge);
   for(let k=0;k<11;k++)this.path([[10.35+k*.39,22.23],[10.35+k*.39,23.31]],'rgba(252,230,186,.40)',1.4);
   for(let k=0;k<12;k++)this.path([[8.74+k*.38,25.13],[8.74+k*.38,26]],'rgba(254,235,193,.38)',1.4);
   for(const [i,j] of [[10.35,22.3],[14.62,22.3],[11.59,25.16],[16.7,25.93]]){
    const p=this.iso(i,j);this.ellipse(p.x,p.y,5,2,'#5d746c');
    this.ellipse(p.x,p.y-5,3,3,'#f8edcb');
   }
  }
  stationArt(i,j,name){
   const p=this.iso(i+1.8,j+.18),a=this.iso(i,j),b=this.iso(i+3.7,j);
   // Open-air covered platform, with prominent roof, glazing and clock.
   this.ellipse(p.x+14,p.y+13,119,18,'rgba(48,75,74,.13)');
   const x=p.x,y=p.y;
   for(const col of [-75,-26,32,76]){
    this.line(x+col,y+7,x+col,y-73,'#587c76',4);
    this.ellipse(x+col,y+9,5,3,'#e7e1c5');
   }
   this.poly([[x-101,y-73],[x-22,y-107],[x+100,y-71],[x+20,y-38]],'#568d88','#d5e9d6',2);
   this.poly([[x-101,y-73],[x+20,y-38],[x+20,y-28],[x-101,y-63]],'#315e62');
   this.poly([[x-22,y-107],[x+100,y-71],[x+100,y-61],[x-22,y-97]],'#3c7575');
   for(let k=0;k<6;k++){
    const u=k/6,x1=x-91+k*31,y1=y-70+k*5;
    this.line(x1,y1-1,x1+63,y1-26,'rgba(212,243,223,.46)',1.9);
   }
   this.round(x-35,y-72,70,22,5,'#fff6db','#739c8b');
   this.text(name,x,y-61,16,'#28655a','center');
   // A clock is more recognisable from far away than tiny timetable text.
   this.ellipse(x+77,y-89,10,10,'#fff6de');
   this.ellipse(x+77,y-89,8,8,'#4d7b75');
   this.line(x+77,y-89,x+77,y-94,'#f6ecd2',2);
   this.line(x+77,y-89,x+81,y-88,'#f6ecd2',2);
   // Ticket machines, planters and a couple of waiting travellers.
   for(let k=0;k<2;k++){
    const px=x-68+k*104;this.round(px,y-28,15,24,2,k?'#e9b880':'#b8d8cb');
    this.round(px+2,y-24,11,11,1,'#467f85');this.rect(px+5,y-9,5,2,'#faecd4');
   }
   this.ellipse(x-40,y+13,9,3,'#93b6a0');this.ellipse(x+43,y+15,10,3,'#93b6a0');
   // Overhead pedestrian bridge: paired walkway across the two tracks.
   this.line(x-39,y+32,x+28,y+61,'#ead9b8',8);
   this.line(x-39,y+30,x+28,y+59,'#668c86',2);
   this.line(x-39,y+37,x+28,y+66,'#668c86',2);
  }
  pierCafeArt(){
   const i=12.3,j=23.0,p=this.iso(i,j),cx=p.x+19,cy=p.y-35;
   this.ellipse(cx+5,cy+44,53,13,'rgba(36,79,71,.16)');
   this.box(i,j,1.75,1.05,39,'#fff0cb','#e4c69d','#c6a886');
   const q=this.iso(i+.87,j+.50);
   this.poly([[q.x-56,q.y-43],[q.x,q.y-85],[q.x+58,q.y-43],[q.x+2,q.y-8]],'#c87557','#fff1d9',2);
   this.poly([[q.x-56,q.y-43],[q.x+2,q.y-8],[q.x+2,q.y+1],[q.x-56,q.y-34]],'#9d5d48');
   this.poly([[q.x,q.y-85],[q.x+58,q.y-43],[q.x+58,q.y-35],[q.x,q.y-76]],'#b96a4c');
   this.ellipse(q.x+4,q.y-84,7,3,'#f7e4ba');
   this.round(q.x-29,q.y-30,56,13,3,'#f6e7c9','#ac7659');
   for(let n=0;n<3;n++)this.ellipse(q.x-16+n*16,q.y-23,3,3,'#cf875e');
   for(let k=0;k<3;k++){
    const a=this.iso(9.1+k*1.5,25.1);
    this.ellipse(a.x,a.y+3,14,5,'rgba(68,104,86,.13)');
    this.line(a.x,a.y,a.x,a.y-31,'#87705a',3);
    this.poly([[a.x-21,a.y-30],[a.x,a.y-42],[a.x+22,a.y-30],[a.x,a.y-17]],k%2?'#eebd85':'#80b8a9');
    this.bench(9.18+k*1.5,25.2);
   }
  }
  marinaBoat(i,j,sailColor='#fff0cf',big=false){
   const q=this.iso(i,j),c=this.ctx;
   c.save();c.translate(q.x,q.y);c.rotate(Math.atan2(18,36));
   const L=big?61:47;
   this.ellipse(0,12,L*.56,10,'rgba(41,99,119,.22)');
   this.poly([[-L/2,-4],[L/2-8,-4],[L/2+4,3],[L/2-8,13],[-L/2+6,13],[-L/2-3,4]],'#f8e9c8','#6e9e9c',1);
   this.poly([[-L/2+9,-2],[L/2-11,-2],[L/2-7,3],[-L/2+10,3]],'#c58d66');
   this.line(0,-9,0,-63,'#657e71',3);
   this.poly([[0,-61],[3,-10],[-21,-16]],sailColor,'#e7e4d0',1);
   this.poly([[4,-54],[20,-17],[4,-15]],'#f6ead0','#a4beb0',1);
   this.ellipse(0,-64,3,3,'#f6dbaf');
   c.restore();
  }
  marinaExtras(add){
   // Add multiple vertical silhouettes to the waterfront; all are depth sorted.
   // The movable parts do not affect resources, traffic, or build decisions.
   const put=(i,j,fn)=>add({depth:i+j+.15},fn);
   put(13.1,24.5,()=>this.pierCafeArt());
   for(const b of [[8.7,26.5,'#f7edd0'],[17.9,26.8,'#f5b888'],[20.3,26.6,'#d4f5e9'],[5.0,27.1,'#f2e7b9']]){
    const [i,j,color]=b;put(i,j,()=>this.marinaBoat(i,j,color,j<27));
   }
   // Small boardwalk signage, ropes, buoys and gulls.
   for(let k=0;k<7;k++){
    const i=8.6+k*1.35,j=24.3+.4*Math.sin(k*3);
    put(i,j,()=>{const p=this.iso(i,j);this.line(p.x,p.y,p.x,p.y-25,'#917d5b',2);
     this.ellipse(p.x,p.y-26,6,7,k%3===0?'#e8b77a':'#f1e2c8');this.ellipse(p.x,p.y-26,2,2,'#a98a66');});
   }
   const t=this.time||0;
   for(let k=0;k<7;k++){
    const i=6.1+(k*4.3)%19,j=25.3+(k*1.91)%3;
    put(i,j,()=>{const p=this.iso(i,j);const y=p.y-65-(this.reduced?0:5*Math.sin(t*.7+k));
      this.line(p.x-10,y+2,p.x-2,y-1,'rgba(243,252,244,.8)',2);
      this.line(p.x-2,y-1,p.x+5,y+2,'rgba(243,252,244,.8)',2);});
   }
  }

  drawCoastalGround(){
   if(this.artMode==='classic')return super.drawCoastalGround();
   const mode=this.model.harborMode||'shared';
   const ground=mode==='cargo'?'#a8b6a8':mode==='promenade'?'#e5d7b4':mode==='seawall'?'#b8d3c7':'#c7ceba';
   this.tile(23.8,22.25,8.7,1.35,ground,'#789f9a');
   this.tile(25,23.55,4.25,1.25,mode==='promenade'?'#d9d7ad':'#b9bfa8','#879c8e');
   this.tile(4,23,4.4,.6,'#dfc99f','#899b88');
   this.marinaGround();
   if(mode==='cargo'){
    for(let k=0;k<5;k++)this.path([[24.2+k*1.5,22.55],[24.2+k*1.5,23.43]],'#f2e4cf',2,[5,5]);
    for(let k=0;k<4;k++){const q=this.iso(24.7+k*1.8,23.5);this.ellipse(q.x,q.y,3,3,'#cbd0b8');}
   }else if(mode==='promenade'){
    this.path([[23.9,22.79],[31.9,22.79]],'#f6efce',9);
    this.path([[23.9,22.83],[31.9,22.83]],'#acbfa2',1.5,[6,11]);
    for(let k=0;k<6;k++){const a=this.iso(24.1+k*1.34,23.5);this.ellipse(a.x,a.y,6,3,'#83ad78');}
   }else if(mode==='seawall'){
    this.box(23.9,24.6,8.45,.28,21,'#e7e5da','#abbcb2','#7e9f9f');
    for(let k=0;k<12;k++){const a=this.iso(24.1+k*.68,24.67);this.line(a.x,a.y-21,a.x,a.y-39,'#68989b',1.8);}
   }else{
    for(let k=0;k<4;k++){const a=24.4+k*1.9;this.tile(a,22.6,1.4,.60,'#d6c3a4','#9bac9b');}
   }
  }
  boat(i,j,type='ferry',reverse=false){
   if(this.artMode==='classic')return super.boat(i,j,type,reverse);
   const q=this.iso(i,j),c=this.ctx;c.save();c.translate(q.x,q.y);c.rotate(Math.atan2(18,36));if(reverse)c.scale(-1,1);
   const cargo=type==='cargo',ferry=type==='ferry',length=cargo?142:ferry?108:67,half=length/2;
   if(!this.reduced){
    for(let k=0;k<3;k++)this.ellipse(-half-21-k*14,8+((k+this.time*.25)%2)*3,18-k*3,3,'rgba(231,251,249,.45)');
   }
   this.ellipse(3,12,half+9,11,'rgba(40,95,114,.22)');
   this.poly([[-half+6,-14],[half-12,-14],[half,2],[half-11,18],[-half+9,18],[-half,2]],cargo?'#365a6e':ferry?'#f7f3e9':'#c58963','#e6f3e4',1.6);
   this.poly([[-half+10,-12],[half-15,-12],[half-12,3],[-half+12,3]],'#e8e8d7');
   if(cargo){
    const colors=['#c97e58','#70a8a7','#e3b36b','#7e9f9a','#df9985'];
    for(let k=0;k<5;k++){
     const x=-half+16+k*23;this.round(x,-20,21,15,2,colors[k]);this.line(x+3,-18,x+18,-18,'rgba(255,241,215,.5)',1);
     if(k%2===0)this.round(x+2,-27,19,6,1,shade(colors[k],20));
    }
    this.round(half-35,-35,26,20,3,'#f4f0e0','#73999b');this.round(half-28,-31,12,6,1,'#517c91');
    this.rect(half-18,-43,4,9,'#bba982');
   }else if(ferry){
    this.round(-half+15,-33,length-29,20,7,'#f7f2e4','#96c3bd');
    this.round(-half+21,-42,length-43,11,4,'#e4f5ed');
    for(let k=0;k<6;k++){
     const x=-half+22+k*(length-42)/6;this.round(x,-27,10,10,2,'#548da5');
     this.round(x+2,-25,4,3,1,'rgba(230,251,249,.68)');
    }
    this.rect(-half+15,-9,length-29,5,'#2c9c9b');
   }else{
    this.round(-16,-29,32,17,5,'#f9edcc','#c99568');this.round(-8,-23,16,8,2,'#6c99a9');
    this.line(18,-27,18,-52,'#7a765e',3);
    this.poly([[19,-51],[46,-30],[19,-31]],'#fff3d5','#b9cbbc',1);
   }
   c.restore();
  }
  trainCoach(i,j,reversed,k=0,head=false){
   if(this.artMode==='classic')return super.trainCoach(i,j,reversed,k,head);
   const w=2.07,d=.54,h=34;
   const {p}=this.box(i,j,w,d,h,'#f7f5e8','#dae7de','#8eabb0');
   const a=this.iso(i,j+d),b=this.iso(i+w,j+d);
   const pt=(t,z)=>[a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t-z];
   // Crisp long windows and a distinctive turquoise accent make this a train,
   // even in the full-city view at half size.
   for(let n=0;n<5;n++){
    const t=.07+n*.18,A=pt(t,27),B=pt(t+.145,27),C=pt(t+.145,16),D=pt(t,16);
    this.poly([A,B,C,D],'#3f8194','#dcefe9',.8);
    this.line(A[0]+2,A[1]+2,B[0]-1,B[1]+2,'rgba(238,251,247,.76)',1.8);
   }
   this.poly([pt(.49,28),pt(.57,28),pt(.57,7),pt(.49,7)],'#e3ad62');
   this.line(...pt(.03,8),...pt(.97,8),'#1d9c9a',5);
   this.line(...pt(.05,6),...pt(.96,6),'#ddf8ed',1.6);
   for(const t of [.20,.78]){const q=pt(t,0);this.ellipse(q[0],q[1]+2.5,7,4,'#425a61');this.ellipse(q[0],q[1]+2.5,3,2,'#a2c4bf');}
   if(head){const q=this.iso(i+(reversed?.12:w-.12),j+d*.5);this.poly([[q.x-8,q.y-h+7],[q.x+8,q.y-h+8],[q.x+8,q.y-h+26],[q.x-8,q.y-h+25]],'#51919d');this.ellipse(q.x+6,q.y-8,3,3,'#ffe4ab');}
  }
  coastObjects(add){
   if(this.artMode==='classic')return super.coastObjects(add);
   super.coastObjects(add);
   this.marinaExtras(add);
   const mode=this.model.harborMode||'shared',put=(i,j,fn)=>add({depth:i+j+.08},fn);
   // Decorative structures only: game decisions remain owned by CityModel.
   for(let n=0;n<4;n++){
    const i=10+n*2.0,j=23.3;
    put(i,j,()=>{
     const p=this.iso(i,j);
     this.ellipse(p.x,p.y,10,4,'#dfcbb2');
     this.box(i,j,.25,.32,10,'#e9e8d8','#9da9a0','#809c98');
     this.ellipse(p.x,p.y-12,7,5,n%2?'#e9c494':'#f5ead2');
    });
   }
   if(mode==='promenade'){
    for(let k=0;k<4;k++){
     const i=24.3+k*1.9,j=24.0;
     put(i,j,()=>{
      const p=this.iso(i,j);
      this.ellipse(p.x,p.y+4,17,5,'rgba(36,85,71,.13)');
      this.line(p.x,p.y,p.x,p.y-40,'#987f60',3);
      this.poly([[p.x-26,p.y-37],[p.x,p.y-54],[p.x+26,p.y-37],[p.x,p.y-20]],k%2?'#eda774':'#a4ccb1');
      this.bench(i+.2,j+.2);
     });
    }
   }else if(mode==='cargo'){
    for(let k=0;k<3;k++){
     const i=27.3+k*1.65,j=24.25;
     put(i,j,()=>{
      this.box(i,j,1.2,.6,30,k%2?'#d7a878':'#8ac1bb','#a0ac9c','#718f92');
      const p=this.iso(i+.6,j+.3);this.line(p.x,p.y-33,p.x,p.y-49,'#ecddbf',2);
     });
    }
   }else if(mode==='seawall'){
    for(let k=0;k<4;k++){
     const i=24.5+k*2.1,j=23.45;
     put(i,j,()=>{const p=this.iso(i,j);this.ellipse(p.x,p.y,13,5,'rgba(255,255,255,.55)');this.rect(p.x-2,p.y-19,4,19,'#b0bca8');this.ellipse(p.x,p.y-20,7,4,'#fff0c9');});
    }
   }
  }
 }
 root.F5CityScene=IllustratedScene;
})(window);

