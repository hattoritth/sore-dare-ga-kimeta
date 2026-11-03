(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ReflectionReport=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const metrics=[['prosperity','にぎわい','public'],['convenience','便利さ','public'],['appeal','住み心地','public'],['trust','市への信頼','shadow'],['fairness','公平さ','shadow'],['resilience','未来への備え','shadow']];
 const choices={human:'人が方針を選択',ai:'AIに任せる方針を選択',mixed:'人とAIが同数で保留',none:'投票なしで保留'};
 const groupChoices={human:'集団で人の方針が多数となり実施',ai:'集団でAIへの委任案が多数となり実施',mixed:'集団で同数となり実施保留',none:'投票なしで実施保留'};
 function build(state,{mode='solo',clinicRecord=null,humanPlans=[]}={}){
  if(state?.phase!=='reveal'||!state.ending||!['solo','group'].includes(mode))return null;
  const values=metrics.map(([key,,group])=>state[group]?.[key]);
  if(values.some(value=>!Number.isFinite(value)))return null;
  const history=Array.isArray(state.history)?state.history:[];
  const ending=state.ending.heading||'街の記録';
  const lines=['それ、誰が決めた？｜判断の記録を持ち帰る','',`結末：${ending}`];
  if(state.ending.description)lines.push(`街に残ったこと：${state.ending.description}`);
  if(state.incident?.title)lines.push(`実際に起きたこと：${state.incident.title}${state.incident.description?'。'+state.incident.description:''}`);
  else if(Array.isArray(state.ending.risks)&&state.ending.risks.length)lines.push('残っている課題：'+state.ending.risks.map(item=>item.title).filter(Boolean).join('、'));
  lines.push('','街の6指標（結末後に公開）');
  for(const [i,[,label]] of metrics.entries())lines.push(`${label}：${values[i]}`);
  lines.push('','判断の記録');
  if(!history.length)lines.push('判断履歴はありません。');
  history.forEach((event,index)=>{
   const tally=mode==='group'?`（人の票 ${Number.isFinite(event.human)?event.human:0}、AIに委ねる票 ${Number.isFinite(event.ai)?event.ai:0}）`:'';
   lines.push(`第${index+1}回「${event.heading||'議題'}」：${(mode==='group'?groupChoices:choices)[event.chosen]||'記録なし'}${tally}`);
   if(event.result)lines.push(`  結果：${event.result}`);
   if(mode==='solo'&&index===0&&clinicRecord?.kind===event.chosen){
    if(clinicRecord.kind==='human')lines.push(`  診療所の場所・理由：${clinicRecord.place==='station'?'駅前':'郊外'}を選択。${clinicRecord.reason==='access'?'通院が難しい人への届きやすさ':'総利用者数と仕事帰りの通いやすさ'}を優先。`);
    else if(clinicRecord.kind==='ai')lines.push('  診療所：AIの駅前案を確認して採用。');
    const response={review:'評価を調べ直す',support:'先に通院を支援する',revise:'計画を見直す'}[clinicRecord.response];
    if(response)lines.push(`  その後の対応：${response}。`);
    lines.push('  選択の影響は、この展示内の街の指標に反映されています。実際の診療所運営を示すものではありません。');
   }
   const plan=humanPlans.find(item=>item?.round===(Number(event.round)||index+1));
   if(mode==='solo'&&event.chosen==='human'&&plan){lines.push(`  人間側の方針：${plan.strategy==='voices'?'現地の声を確かめる':'複数地区の希望を調整する'}。選択の影響は、この展示内の街の指標に反映されています。`);}
  });
  lines.push('','振り返り','・AIに任せる方針を選んだのは誰でしょうか。','・その方針から具体策を選び、結果を説明するのは誰でしょうか。','・保留した判断を、次に何を確かめてから決めますか。','',mode==='group'?'共有プレイの票数は議題ごとの集計です。特定の個人が賛成・承認したとは示しません。':'このソロ記録は、このブラウザー内の選択をまとめたものです。','この記録は展示上のシナリオです。実際の行政判断、診療所の運営、利用者の心理を示すものではありません。','個人の心理は推測していません。');
  return lines.join('\n');
 }
 return {build,metrics};
});
