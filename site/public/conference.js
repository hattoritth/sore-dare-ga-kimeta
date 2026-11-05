(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PressConference=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const metrics=[
  ['prosperity','にぎわい','仕事・お店・街の経済','public'],['convenience','便利さ','移動や公共施設の使いやすさ','public'],['appeal','住み心地','公園・居場所・暮らし続けたい魅力','public'],
  ['trust','市への信頼','判断の理由を住民が信頼・納得できるか','shadow'],['fairness','公平さ','地域や立場によらず恩恵が届くか','shadow'],['resilience','未来への備え','災害・設備・将来の変化に備えているか','shadow']
 ];
 const incidentPrompts={prosperity:'仕事や公共サービスを維持できなくなりました。どの判断が街の活気を支え、何が足りなかったのでしょうか。',convenience:'移動の仕組みが止まりました。便利さを高める判断と、支え続ける備えをどう説明しますか。',appeal:'街を離れる人が増えました。街の魅力を誰の視点で確かめてきたのでしょうか。',trust:'住民が決定の説明を求めています。誰が方針を選び、何を確かめてきたのでしょうか。',fairness:'地区の間に隔たりが生まれました。機会がどこへ届くか、どう確認してきたのでしょうか。',resilience:'豪雨で街が浸水しました。街を維持する備えを、どの判断で確かめてきたのでしょうか。'};
 const outcomeNames={prosperity:'街の財政が立ち行かなくなった',convenience:'街の交通網が止まった',appeal:'街から人が離れていった',trust:'住民の反対運動が広がった',fairness:'住民同士の分断が深まった',resilience:'豪雨で街が浸水した'};
 function sceneSvg(kind,metric){
  const key=kind==='collapse'?(metric||'resilience'):kind==='warning'?'warning':kind==='undecided'?'undecided':kind==='true'?'true':'normal';
  const motif={prosperity:['公共サービス','▰','22'],convenience:['交通網','↗','45'],appeal:['住民の暮らし','⌂','16'],trust:['市役所','!','38'],fairness:['地区の分断','↔','31'],resilience:['豪雨','〰','13'],warning:['残る課題','…','39'],undecided:['判断保留','?','34'],true:['人とAIの協働','✓','57'],normal:['街は続く','⌂','57']}[key]||['街は続く','⌂','57'];
  const crisis=['prosperity','convenience','appeal','trust','fairness','resilience'].includes(key),accent=crisis?'#e8a077':key==='true'?'#e8ca83':'#a6d3b0';
  const heights=[88,129,99,153,112,78,119],buildings=heights.map((h,i)=>{const x=75+i*112,y=290-h;return `<g><rect x="${x}" y="${y}" width="76" height="${h}" rx="3" fill="${i===3&&crisis?'#596b72':'#304d53'}" stroke="#7c9490"/><path d="M${x+12} ${y+19}h13v18h-13zm27 0h13v18h-13zm-27 34h13v18h-13zm27 0h13v18h-13z" fill="#d3bd85" opacity="${i===3&&crisis?'.25':'.8'}"/></g>`;}).join('');
  const cityEffect=key==='resilience'?'<path d="M0 258 Q80 241 160 258 T320 258 T480 258 T640 258 T800 258" fill="none" stroke="#81b6cb" stroke-width="21" opacity=".78"/>':key==='convenience'?'<path d="M0 264h800" stroke="#d9bd83" stroke-width="8"/><path d="M40 276h720" stroke="#d9bd83" stroke-width="2" stroke-dasharray="16 15"/>':key==='appeal'?'<g fill="#b9d5a7"><circle cx="730" cy="225" r="8"/><circle cx="760" cy="231" r="7"/><path d="M728 235v23m30-17v20" stroke="#b9d5a7" stroke-width="4"/></g>':'';
  return `<svg class="press-scene-art" viewBox="0 0 800 470" role="img" aria-label="${motif[0]} の街を背景にした市長会見"><defs><linearGradient id="press-sky" x2="0" y2="1"><stop stop-color="#273f4b"/><stop offset="1" stop-color="#7e938b"/></linearGradient><linearGradient id="press-floor" x2="0" y2="1"><stop stop-color="#50665f"/><stop offset="1" stop-color="#1c3033"/></linearGradient></defs><rect width="800" height="470" fill="url(#press-sky)"/><circle cx="664" cy="80" r="38" fill="${accent}" opacity=".75"/><path d="M0 300 130 229l94 58 102-101 100 83 112-109 110 115 80-47 72 43v110H0z" fill="#526a67"/>${buildings}${cityEffect}<rect y="301" width="800" height="169" fill="url(#press-floor)"/><path d="M0 349h800" stroke="#a6b49d" opacity=".35"/><text x="400" y="57" text-anchor="middle" fill="#f6edda" font-size="20" font-family="sans-serif" letter-spacing="5">${motif[0]}</text><rect x="306" y="306" width="188" height="95" rx="5" fill="#6a4c3b" stroke="#d2b486" stroke-width="3"/><rect x="329" y="319" width="142" height="39" rx="2" fill="#253e43"/><text x="400" y="345" text-anchor="middle" fill="#f6edda" font-size="13" font-family="sans-serif" letter-spacing="3">市長会見</text><path d="M353 401v37m94-37v37" stroke="#402f2a" stroke-width="12"/><g fill="#1d292d"><circle cx="180" cy="388" r="14"/><path d="M155 455v-48q25-22 50 0v48z"/><circle cx="618" cy="384" r="15"/><path d="M590 455v-52q28-23 56 0v52z"/></g><g stroke="#d5b984" stroke-width="5" fill="none"><path d="M192 411v-36l40-17"/><path d="M615 406v-42l-27-18"/><path d="M208 375h30m-52 3h-22"/></g><circle cx="234" cy="358" r="8" fill="#d5b984"/><circle cx="588" cy="346" r="8" fill="#d5b984"/></svg>`;
 }
 function build(state,clinicRecord,humanPlans=[]){
  const ending=state?.ending||{}, metric=ending.metric||state?.incident?.metric||ending.risks?.[0]?.metric;
  const actual=state?.incident;
  const prompt=incidentPrompts[metric]||'起きたことと、これまでの判断を説明してください。';
  const eventTitle=String(actual?.title||'');
  const alreadyDescribed=eventTitle.length>=5&&prompt.split('。')[0].startsWith(eventTitle.slice(0,5));
  let question=actual?(alreadyDescribed?prompt:(eventTitle?eventTitle+'。':'')+prompt):'';
  if(!actual){const risk=ending.risks?.[0];question=ending.kind==='undecided'?'議題は保留されました。何が決まらず、どんな確認が必要だったのでしょうか。':risk?risk.title+'。大きな事故には至っていませんが、この課題をどう見ていますか。':ending.kind==='true'?'街を守る役割とAIに任せた運用をどう分け、その結果を誰が確かめたのでしょうか。':'街は続いています。どんな成果を守り、これから何を確かめますか。';}
  const allHistory=state?.history||[],history=allHistory.slice(-2).map((event,index)=>{let text='第'+(allHistory.length- Math.min(2,allHistory.length)+index+1)+'回「'+event.heading+'」は';
   if(event.chosen==='human')text+='人の方針が選ばれました。'+event.result;
   else if(event.chosen==='ai')text+='AIに委ねる方針が選ばれました。'+(event.result||'')+' 具体策の選定に使われた経緯は、この記録だけでは確認できません。';
   else if(event.chosen==='mixed'||event.chosen==='none')text+=(event.chosen==='mixed'?'同数票':'投票なし')+'で保留され、施策は実施されていません。'+(event.result||'');
   else text+='判断の記録がありません。';
   if(allHistory.length-Math.min(2,allHistory.length)+index===0&&clinicRecord?.kind){text+=' 診療所については、'+(clinicRecord.kind==='human'?'人が'+(clinicRecord.place==='station'?'駅前':'郊外')+'を選び、'+(clinicRecord.reason==='access'?'通院が難しい人への届きやすさ':'総利用者数と仕事帰りの通いやすさ')+'を優先しました。':'AIの駅前案を確認して採用しました。');const response={review:'評価を調べ直す方針を選びました。',support:'通院の支援を先に進める方針を選びました。',revise:'計画を見直す方針を選びました。'}[clinicRecord.response];if(response)text+=' '+response;}
   const planRound=Number(event.round)||allHistory.length-Math.min(2,allHistory.length)+index+1;
   const plan=humanPlans.find(item=>item?.round===planRound);
   if(plan&&event.chosen==='human')text+=' 今回は「'+(plan.strategy==='voices'?'現地の声を確かめる':'複数地区の希望を調整する')+'」方針を実施し、その影響を街の指標に反映しました。';
   return text;
  });
  return {causeMetric:metric||null,question,answers:history.length?history:['判断履歴はありません。'],close:'任せる方針を選んだのは誰か。具体策を選び、結果を説明するのは誰か。',metrics:state?.phase&&state.phase!=='reveal'?[]:metrics.map(([key,label,meaning,group])=>({key,label,meaning,group,value:Number(state?.[group]?.[key]??0)}))};
 }
 return {build,metrics,outcomeNames,sceneSvg};
});
