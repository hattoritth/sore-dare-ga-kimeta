(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PressConference=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const metrics=[
  ['prosperity','にぎわい','仕事・お店・街の経済','public'],['convenience','便利さ','移動や公共施設の使いやすさ','public'],['appeal','住み心地','公園・居場所・暮らし続けたい魅力','public'],
  ['trust','市への信頼','判断の理由を住民が信頼・納得できるか','shadow'],['fairness','公平さ','地域や立場によらず恩恵が届くか','shadow'],['resilience','未来への備え','災害・設備・将来の変化に備えているか','shadow']
 ];
 const incidentPrompts={prosperity:'仕事や公共サービスを維持できなくなりました。どの判断が街の活気を支え、何が足りなかったのでしょうか。',convenience:'移動の仕組みが止まりました。便利さを高める判断と、支え続ける備えをどう説明しますか。',appeal:'街を離れる人が増えました。街の魅力を誰の視点で確かめてきたのでしょうか。',trust:'住民が決定の説明を求めています。誰が方針を選び、何を確かめてきたのでしょうか。',fairness:'地区の間に隔たりが生まれました。機会がどこへ届くか、どう確認してきたのでしょうか。',resilience:'豪雨で街が浸水しました。街を維持する備えを、どの判断で確かめてきたのでしょうか。'};
 function build(state,clinicRecord,humanPlans=[]){
  const ending=state?.ending||{}, metric=ending.metric||state?.incident?.metric||ending.risks?.[0]?.metric;
  const actual=state?.incident;
  const prompt=incidentPrompts[metric]||'起きたことと、これまでの判断を説明してください。';
  const eventTitle=String(actual?.title||'');
  const alreadyDescribed=eventTitle.length>=5&&prompt.split('。')[0].startsWith(eventTitle.slice(0,5));
  let question=actual?(alreadyDescribed?prompt:(eventTitle?eventTitle+'。':'')+prompt):'';
  if(!actual){const risk=ending.risks?.[0];question=ending.kind==='undecided'?'議題は保留されました。何が決まらず、どんな確認が必要だったのでしょうか。':risk?risk.title+'。大きな事故には至っていませんが、この課題をどう見ていますか。':'街は続いています。どんな成果を守り、これから何を確かめますか。';}
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
 return {build,metrics};
});
