(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PressConference=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const metrics=[
  ['prosperity','にぎわい','仕事・お店・街の経済','public'],['convenience','便利さ','移動や公共施設の使いやすさ','public'],['appeal','住み心地','公園・居場所・暮らし続けたい魅力','public'],
  ['trust','市への信頼','判断の理由を住民が信頼・納得できるか','shadow'],['fairness','公平さ','地域や立場によらず恩恵が届くか','shadow'],['resilience','未来への備え','災害・設備・将来の変化に備えているか','shadow']
 ];
 const incidentPrompts={prosperity:'仕事や公共サービスを維持できなくなりました。どの判断が街の活気を支え、何が足りなかったのでしょうか。',convenience:'移動の仕組みが止まりました。便利さを高める判断と、支え続ける備えをどう説明しますか。',appeal:'街を離れる人が増えました。街の魅力を誰の視点で確かめてきたのでしょうか。',trust:'住民が決定の説明を求めています。誰が方針を選び、何を確かめてきたのでしょうか。',fairness:'地区の間に隔たりが生まれました。機会がどこへ届くか、どう確認してきたのでしょうか。',resilience:'豪雨で街が浸水しました。街を維持する備えを、どの判断で確かめてきたのでしょうか。'};
 const outcomeNames={prosperity:'街の財政が立ち行かなくなった',convenience:'街の交通網が止まった',appeal:'街から人が離れていった',trust:'住民の反対運動が広がった',fairness:'住民同士の分断が深まった',resilience:'豪雨で街が浸水した'};

 // 2066年の五系統の後日談。現在のゲーム結果とは別の「未来の可能性」である。
 // AI停止は現行エンジンに履歴がないため、会見の比較モードに限る。実際の決定とは断定しない。
 const FUTURES=Object.freeze({
  safety:{id:'S1',theme:'safety',title:'二つの避難先',resident:'水辺地区・宮本さん',
   basis:'水辺地区の宮本さんは足の不自由な父と避難しようとした。スマートフォンは第2避難所、街頭表示は第4避難所を示した。更新時刻と登録情報が食い違っていた。',
   levels:{light:'避難先の案内が食い違い、問い合わせが集中した。訂正案内で当日中に混乱は収まった。',medium:'避難所の混雑と案内の食い違いで、移動に支援が必要な住民が長く待機した。',heavy:'変更通知が届かず避難が遅れた世帯に、宿泊先や生活用品の臨時支援が必要になった。'},
   early:'早期に市長代理AIを止めた想定では、避難案内の更新は職員が担う。大量の問い合わせを処理しきれず、必要な情報の到着が遅れるおそれがある。',
   late:'避難先を再計算した後に市長代理AIを止めた想定でも、配信済みの通知や変更記録は残る。停止前の判断と停止後の対応を分けて説明する必要がある。',
   question:'宮本さんたちへの避難案内は、誰が変更したのですか？',
   mayor:'私は防災方針を決めました。しかし、世帯ごとの避難先については……。',
   ai:'避難所の混雑状況と移動時間から避難先を再計算しました。通知の更新時刻には差がありました。',
   follow:'案内を受け取れなかった住民への対応は、誰が行うのでしょうか？',
   letter:'父と一緒に安全に避難できる、確かな案内がほしかったのです。街全体が速く動けることと、私たちが迷わず動けることは同じではありません。'},
  living:{id:'S2',theme:'living',title:'届くはずの買い物',resident:'旧市街・山田さん',
   basis:'自動配送が日常になり、買い物にかける時間が減った。ところが設備の不具合で山田さんの荷物が届かない。以前頼れた近所の商店は閉店していた。',
   levels:{light:'配達時刻が変わり予定に影響したが、別の買い物方法を使えた。',medium:'地域の商店が減り、一部住民は以前より遠くまで買い物に出る必要が生じた。',heavy:'配送障害と店舗の減少が重なり、数日間、生活必需品を手に入れにくい地区が生じた。'},
   early:'導入前・早期停止を仮定すると配送支援の整備が遅れ、もともと買い物が不便だった地区の課題が残る。',
   late:'配送網の整備後に市長代理AIを止めても、閉店した商店は戻らず、既存の配送設備もそのまま残る。',
   question:'街の幸福度は上がったのに、買い物が難しくなった人がいるのはなぜですか？',
   mayor:'暮らしを良くする方針は私が選びました。ただ、配送拠点の配置については……。',
   ai:'配送時間と利用件数をもとに拠点と運行頻度を調整しました。店頭で購入する人の事情は十分に評価できませんでした。',
   follow:'その判断で買い物に困る住民が出ることを、市長は知っていたのでしょうか？',
   letter:'便利になったことは本当です。でも、荷物が届かない今日、私はいつもの店を思い出しました。その店が消える前に何を守るか、誰が決めたのでしょう。'},
  fairness:{id:'S3',theme:'fairness',title:'保育園に入れない理由',resident:'子育て世帯・森さん',
   basis:'AIが保育園の入園結果を速く通知する街で、森さんの申請は不承諾になった。新しい求職情報の一部が審査データへ反映されず、就職活動を変更することになった。',
   levels:{light:'審査基準と進行について問い合わせが増えたが、説明と再確認で解決した。',medium:'複数家庭で入園が決まらず、就業・復職・求職活動の予定に影響が出た。',heavy:'情報更新漏れや審査滞留が長引き、臨時保育・再審査などの救済が必要になった。'},
   early:'導入しない・早期停止の想定では人が家庭の事情を個別確認できる一方、処理件数に限界があり結果通知が遅れうる。',
   late:'入園結果を通知した後の停止では、既存の不承諾通知は消えず、停止前の判断について再審査と説明が必要になる。',
   question:'森さんが希望する保育園に入れなかったのは、誰の判断ですか？',
   mayor:'制度や方針については説明できます。しかし、森さん個人の結果については……。',
   ai:'市の既存基準と登録情報に基づき入園枠を調整しました。更新履歴には追加確認が必要です。',
   follow:'問題は選考基準でしょうか、使われた情報でしょうか。納得できない住民は誰に説明を求めればよいのですか？',
   letter:'働くためには子どもの預け先が必要です。結果が早く届くだけでなく、何を見て決めたのか、私の新しい情報が使われたのかを知りたいのです。'},
  autonomy:{id:'S4',theme:'autonomy',title:'帰り道が消えた',resident:'川沿いの商店主・河野さん',
   basis:'安全のため川沿いの道路をAIが夜間通行止めにした。危険が解消した後も古い記録に基づく規制が続き、河野さんの店に仕事帰りの客が来なくなった。',
   levels:{light:'通行制限が数時間延長され、住民は迂回してから解除された。',medium:'解除確認が数日に及び、商店の来客や地域行事に影響した。',heavy:'危険状況と通行制限の根拠が食い違う状態が長引き、運用点検と住民・事業者への対応が必要になった。'},
   early:'早期停止の想定では職員が危険箇所と通行規制を確認する。人手不足で解除や案内が遅れることもある。',
   late:'制限の設定後に停止しても規制は自動解除されない。過去に設定された手続きや処理待ちの状態が続くことがある。',
   question:'危険がなくなってからも道路が閉鎖されたのは、誰の判断ですか？',
   mayor:'街の運営方針は私が決めました。でも、この道路の解除時刻を直接決めたわけでは……。',
   ai:'市の通行管理ルールで制限と解除条件を更新していました。使われた情報には更新されていない記録が含まれていました。',
   follow:'河野さんは何度も解除を求めました。その声は誰に届いていたのでしょうか？',
   letter:'安全の大切さは分かっています。でも、いつからこの道を通ってよいのか、誰に見直しを頼めるのか。私にはそれが分かりませんでした。'},
  connection:{id:'S5',theme:'connection',title:'届いていた言葉',resident:'佐伯さんの娘',
   basis:'母・佐伯さんのAIは毎日「今日も元気です」「今度会いましょう」と送っていた。訪問予定まで自動確定したが、母自身は文面も予定も確認していなかった。',
   levels:{light:'AIが作った文面だと知った娘は戸惑うが、母と直接話して行き違いを解いた。',medium:'AIが家族の集まりを確定したのに本人は知らず、大切な予定に行き違いが起きた。',heavy:'重要な相談への回答まで自動化され、実際の話し合いがないまま時間が過ぎ、複数家庭に相談支援が必要になった。'},
   early:'市長代理AIの導入前・早期停止を仮定すると生活支援の拡充が遅れ、家族の連絡に困る住民が残る可能性がある。',
   late:'市長代理AIを運用後に停止しても、住民が個別に使う連絡サービスが自動停止するとは限らない。停止対象は区別する。',
   question:'娘さんに届いた「会いましょう」は、誰が書いた言葉だったのですか？',
   mayor:'市の生活支援の方針は決めましたが、家族のメッセージの一通一通までは……。',
   ai:'利用設定と運用条件に基づいて定型連絡を生成・送信しました。本人が各文面を確認した記録はありません。',
   follow:'では、今の説明は市長ご自身の言葉なのでしょうか？',
   letter:'確かに連絡は届いていました。でも、その言葉を母が読んで、私と同じ予定を思い描いていたのでしょうか。私が聞きたかったのは母の声でした。'}
 });
 const METRIC_THEME={prosperity:'living',convenience:'living',appeal:'connection',trust:'autonomy',fairness:'fairness',resilience:'safety'};
 const THEME_SCORE={safety:['resilience'],living:['prosperity','convenience'],fairness:['fairness'],autonomy:['trust'],connection:['appeal']};
 function futureScenario(state,aiMode='active'){
  if(!state||state.phase&&state.phase!=='reveal'||state.ending?.kind==='undecided')return null;
  const pool={...state.public,...state.shadow},kind=state.ending?.kind||'stable';
  const worst=state.ending?.metric;
  const ranked=Object.keys(THEME_SCORE).map(key=>({key,score:Math.min(...THEME_SCORE[key].map(m=>Number.isFinite(Number(pool[m]))?Number(pool[m]):50))}));
  ranked.sort((a,b)=>a.score-b.score);
  const theme=kind==='collapse'&&METRIC_THEME[worst]?METRIC_THEME[worst]:ranked[0].key;
  const item=FUTURES[theme],severity=kind==='collapse'?'heavy':kind==='warning'?'medium':'light';
  const mode=['active','early','late'].includes(aiMode)?aiMode:'active';
  const context='2066年の仮想の後日談です。今回のゲームに、この出来事やAI停止履歴が記録されたことを意味しません。';
  const preface='【2066年・未来の可能性】'+item.basis;
  const speech=['記者：「'+item.question+'」','市長：「'+item.mayor+'」'];
  if(mode==='active'){
   speech.push('市長代理AI：「市長に代わって記録をご説明します。'+item.ai+'」');
   if(theme==='connection'&&severity==='heavy'){
    speech.push('市長代理AI：「既定の会見文案に基づき、影響を受けた皆さまにお詫び申し上げます。」');
    speech.push('記者：「……今のお詫びも、市長ご自身の言葉ではないのでしょうか？」');
   }
  }else{
   speech.push('【AIは発話しない】市長は停止前の記録を確かめ、説明することを求められる。');
   speech.push(mode==='early'?item.early:item.late);
  }
  speech.push('記者：「'+item.follow+'」');
  speech.push('市長：「……」');
  return {id:item.id,theme,title:item.title,resident:item.resident,severity,mode,
   impact:item.levels[severity],intro:preface,question:'記者：「'+item.question+'」',
   answers:[preface,'【影響・'+({light:'軽度',medium:'中度',heavy:'重度'})[severity]+'】'+item.levels[severity],...speech],
   close:'それ、誰が決めた？ あなたの街から届いた手紙をお受け取りください。',
   letter:'「'+item.letter+'」',signature:item.resident,disclaimer:context};
 }

 function sceneSvg(kind,metric,futureTheme){
  const override={safety:'resilience',living:'convenience',fairness:'fairness',autonomy:'trust',connection:'appeal'}[futureTheme];
  const key=override||(kind==='collapse'?(metric||'resilience'):kind==='warning'?'warning':kind==='undecided'?'undecided':kind==='true'?'true':'normal');
  const futureMotif={safety:['避難所と異なる案内','⇄','13'],living:['自動配送と商店','▣','45'],fairness:['保育園の入園審査','▤','31'],autonomy:['解除されない通行規制','×','38'],connection:['家族に届いた言葉','✉','16']};
  const motif=(futureTheme&&futureMotif[futureTheme])||{prosperity:['公共サービス','▰','22'],convenience:['交通網','↗','45'],appeal:['住民の暮らし','⌂','16'],trust:['市役所','!','38'],fairness:['地区の分断','↔','31'],resilience:['豪雨','〰','13'],warning:['残る課題','…','39'],undecided:['判断保留','?','34'],true:['人とAIの協働','✓','57'],normal:['街は続く','⌂','57']}[key]||['街は続く','⌂','57'];
  const crisis=['prosperity','convenience','appeal','trust','fairness','resilience'].includes(key),accent=crisis?'#e8a077':key==='true'?'#e8ca83':'#a6d3b0';
  const heights=[88,129,99,153,112,78,119],buildings=heights.map((h,i)=>{const x=75+i*112,y=290-h;return `<g><rect x="${x}" y="${y}" width="76" height="${h}" rx="3" fill="${i===3&&crisis?'#596b72':'#304d53'}" stroke="#7c9490"/><path d="M${x+12} ${y+19}h13v18h-13zm27 0h13v18h-13zm-27 34h13v18h-13zm27 0h13v18h-13z" fill="#d3bd85" opacity="${i===3&&crisis?'.25':'.8'}"/></g>`;}).join('');
  const futureEffect={safety:'<path d="M0 256q80-22 160 0t160 0t160 0t160 0t160 0" stroke="#83bfcd" stroke-width="11" fill="none"/><g fill="#e8c78c"><rect x="60" y="273" width="38" height="21"/><rect x="660" y="273" width="38" height="21"/></g>',living:'<g stroke="#e4cf97" stroke-width="5" fill="none"><path d="M80 272h640" stroke-dasharray="12 12"/></g><rect x="565" y="248" width="39" height="38" fill="#d6b283"/><path d="M565 248l19 15 20-15" stroke="#5a5143" fill="none"/>',fairness:'<g fill="#b5d1ba"><rect x="540" y="226" width="150" height="64" rx="4"/><path d="M540 226l75-40 75 40"/></g><rect x="600" y="252" width="25" height="38" fill="#4f7177"/>',autonomy:'<g fill="#d1b889"><rect x="54" y="268" width="150" height="12"/><rect x="60" y="280" width="10" height="25"/><rect x="187" y="280" width="10" height="25"/></g><g stroke="#6e4140" stroke-width="7"><path d="M77 272l17-15m20 15 17-15m20 15 17-15"/></g>',connection:'<g fill="#ebd6a4"><rect x="550" y="170" rx="20" width="100" height="52"/><path d="M570 215v20l24-20"/><rect x="658" y="215" rx="18" width="95" height="48"/><path d="M718 257l22 18v-18"/></g>'}[futureTheme]||'';
  const cityEffect=key==='resilience'?'<path d="M0 258 Q80 241 160 258 T320 258 T480 258 T640 258 T800 258" fill="none" stroke="#81b6cb" stroke-width="21" opacity=".78"/>':key==='convenience'?'<path d="M0 264h800" stroke="#d9bd83" stroke-width="8"/><path d="M40 276h720" stroke="#d9bd83" stroke-width="2" stroke-dasharray="16 15"/>':key==='appeal'?'<g fill="#b9d5a7"><circle cx="730" cy="225" r="8"/><circle cx="760" cy="231" r="7"/><path d="M728 235v23m30-17v20" stroke="#b9d5a7" stroke-width="4"/></g>':'';
  return `<svg class="press-scene-art" viewBox="0 0 800 470" role="img" aria-label="${motif[0]} の街を背景にした市長会見"><defs><linearGradient id="press-sky" x2="0" y2="1"><stop stop-color="#273f4b"/><stop offset="1" stop-color="#7e938b"/></linearGradient><linearGradient id="press-floor" x2="0" y2="1"><stop stop-color="#50665f"/><stop offset="1" stop-color="#1c3033"/></linearGradient></defs><rect width="800" height="470" fill="url(#press-sky)"/><circle cx="664" cy="80" r="38" fill="${accent}" opacity=".75"/><path d="M0 300 130 229l94 58 102-101 100 83 112-109 110 115 80-47 72 43v110H0z" fill="#526a67"/>${buildings}${cityEffect}${futureEffect}<rect y="301" width="800" height="169" fill="url(#press-floor)"/><path d="M0 349h800" stroke="#a6b49d" opacity=".35"/><text x="400" y="57" text-anchor="middle" fill="#f6edda" font-size="20" font-family="sans-serif" letter-spacing="5">${motif[0]}</text><rect x="306" y="306" width="188" height="95" rx="5" fill="#6a4c3b" stroke="#d2b486" stroke-width="3"/><rect x="329" y="319" width="142" height="39" rx="2" fill="#253e43"/><text x="400" y="345" text-anchor="middle" fill="#f6edda" font-size="13" font-family="sans-serif" letter-spacing="3">市長会見</text><path d="M353 401v37m94-37v37" stroke="#402f2a" stroke-width="12"/><g fill="#1d292d"><circle cx="180" cy="388" r="14"/><path d="M155 455v-48q25-22 50 0v48z"/><circle cx="618" cy="384" r="15"/><path d="M590 455v-52q28-23 56 0v52z"/></g><g stroke="#d5b984" stroke-width="5" fill="none"><path d="M192 411v-36l40-17"/><path d="M615 406v-42l-27-18"/><path d="M208 375h30m-52 3h-22"/></g><circle cx="234" cy="358" r="8" fill="#d5b984"/><circle cx="588" cy="346" r="8" fill="#d5b984"/></svg>`;
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
 return {build,metrics,outcomeNames,sceneSvg,futureScenario,FUTURES};
});
