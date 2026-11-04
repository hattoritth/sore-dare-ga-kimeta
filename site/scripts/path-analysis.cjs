const fs=require('node:fs'),path=require('node:path');
const Engine=require('../engine.js');

function enumerate(n,symbols){
 return Array.from({length:symbols.length**n},(_,i)=>{
  const row=Array(n);for(let j=n-1;j>=0;j--){row[j]=symbols[i%symbols.length];i=Math.floor(i/symbols.length);}return row;
 });
}
function simulate(sequence,{solo=false,voters=1}={}){
 const g=Engine.createGame(0,{autostart:true,storyMode:solo?'solo':undefined});
 for(let i=0;i<voters;i++)Engine.join(g,`p${i}`,`P${i}`,0);
 for(const symbol of sequence){
  if(g.phase!=='active')break;
  for(let i=0;i<voters;i++)Engine.vote(g,`p${i}`,symbol==='T'?(i<voters/2?'human':'ai'):symbol==='A'?'ai':'human',g.roundStartedAt+100+i);
  Engine.advance(g,g.roundEndsAt+1);
 }
 const state=Engine.publicState(g,'p0',g.revealEndsAt||0);
 return {path:sequence.join(''),outcome:g.outcome||'active',endingKind:state.ending?.kind||null,rounds:g.history.length,trigger:state.incident?.metric||null,
  warnings:g.history.filter(x=>Object.values({...x.visible,...x.hidden}).some(v=>v<Engine.WARN_THRESHOLD)).length,
  interventionAttempts:g.history.filter(x=>x.interventionAttempted).length,
  warningRecoveryEvents:g.history.filter(x=>x.warningRecovered?.length).length,
  crisisAvertedEvents:g.history.filter(x=>x.crisisAverted?.length).length,
  avoidedMetrics:[...new Set(g.history.flatMap(x=>x.crisisAverted||[]))],metrics:{...g.public,...g.shadow}};
}
const distribution=(rows,key)=>rows.reduce((a,x)=>{if(x[key]!=null)a[x[key]]=(a[x[key]]||0)+1;return a;},{});
function summary(rows){
 return {paths:rows.length,collapse:rows.filter(x=>x.outcome==='collapse').length,survived:rows.filter(x=>x.outcome==='survived').length,undecided:rows.filter(x=>x.outcome==='undecided').length,active:rows.filter(x=>x.outcome==='active').length,
  endingDistribution:distribution(rows,'endingKind'),triggerDistribution:distribution(rows,'trigger'),endingRoundDistribution:distribution(rows,'rounds'),
  warningPaths:rows.filter(x=>x.warnings>0).length,interventionAttemptPaths:rows.filter(x=>x.interventionAttempts>0).length,
  interventionAttemptEvents:rows.reduce((n,x)=>n+x.interventionAttempts,0),warningRecoveryPaths:rows.filter(x=>x.warningRecoveryEvents>0).length,warningRecoveryEvents:rows.reduce((n,x)=>n+x.warningRecoveryEvents,0),
  crisisAvertedPaths:rows.filter(x=>x.crisisAvertedEvents>0).length,crisisAvertedEvents:rows.reduce((n,x)=>n+x.crisisAvertedEvents,0),
  crisisAvertedMetrics:rows.reduce((a,x)=>{for(const m of x.avoidedMetrics)a[m]=(a[m]||0)+1;return a;},{}),uniqueFinalStates:new Set(rows.map(x=>JSON.stringify(x.metrics))).size};
}
function analyze(){
 const soloPaths=enumerate(4,['H','A']).map(x=>simulate(x,{solo:true}));
 const sharedPaths=enumerate(7,['H','A']).map(x=>simulate(x));
 const multiVoterPaths=enumerate(7,['H','A','T']).map(x=>simulate(x,{voters:2}));
 return {generatedAt:new Date().toISOString(),definitions:{multiVoter:'Two-voter aggregate classes across seven rounds: H=both human, A=both AI, T=one each (implementation deferred). 3^7=2,187; individual vote ordering and attendance are not enumerated.',interventionAttempt:'Human-majority decision while a metric is below 30.',warningRecovery:'A warned metric reaches at least 30 following a human-majority decision, including its episode effect and intervention bonus.',crisisAverted:'A warned metric would be below 10 after the episode effect alone and is at least 10 after the intervention bonus.'},solo:summary(soloPaths),shared:summary(sharedPaths),multiVoter:summary(multiVoterPaths),soloPaths,sharedPaths,multiVoterPaths};
}
function run(outputFile=path.resolve('post-path-analysis.json')){
 const report=analyze();fs.writeFileSync(outputFile,JSON.stringify(report,null,2));
 console.log(JSON.stringify({solo:report.solo,shared:report.shared,multiVoter:report.multiVoter},null,2));return report;
}
module.exports={analyze,run};
if(require.main===module)run(process.argv[2]);
