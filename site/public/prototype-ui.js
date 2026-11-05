/* New experience plugs into the existing canvas, palette and portrait renderer. */
(function(root){'use strict';
 const E=root.MachiPrototype,D=root.MachiPrototypeData,$=id=>document.getElementById(id);
 function start({portrait}){
  const shell=$('shell');shell.dataset.view='prototype';
  for(const id of ['landing','displayFrame','cityBeat'])$(id).hidden=true;
  $('sidePanel').hidden=false;$('sidePanel').innerHTML='<section class="pt-panel"><div id="ptCard"></div><div class="pt-news"><span class="overline">まちニュース</span><div id="ptNews"></div><button id="ptNewsArchive" class="pt-quiet" type="button">ニュースをたどる</button></div></section>';
  const qr=$('siteQrOpen');qr.classList.add('pt-qr-button');qr.append(text('span','公式サイトQR'));$('sidePanel').querySelector('.pt-news').append(qr);
  document.querySelector('.hud').innerHTML='<div class="pt-happiness"><span>街の幸福度</span><strong id="ptHappy"></strong><span class="pt-track"><i id="ptHappyFill"></i></span></div><div class="pt-ai"><span id="ptAIState"></span><button id="ptAIButton" type="button"></button></div><button id="ptLogButton" class="pt-quiet" type="button">判断の記録</button>';
  $('footerMessage').textContent='まちの続き。｜それ、誰が決めた？';
  const flags=document.createElement('div');flags.className='pt-flags';document.querySelector('.skyline').append(flags);
  const overlay=document.createElement('div');overlay.id='ptOverlay';overlay.className='pt-overlay';overlay.hidden=true;shell.append(overlay);
  const toast=document.createElement('div');toast.id='ptToast';toast.className='pt-toast';toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');toast.hidden=true;shell.append(toast);
  const model=new root.F5City.CityModel('M');
  // Only use CityModel as a renderer adapter. Never run its autonomous decision clock.
  for(const a of root.F5City.AGENTS)model.agentPermissions[a.id].level=0;
  const scene=new root.F5CityScene($('townCanvas'),model);scene.setArtMode('illustrated');scene.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let game,selected=null,modal=null,lastCard='',lastNews='',lastFlags='',lastTicker='',toastUntil=0,cutIndex=-1,cutElapsed=0,cuts=[],confPaused=false,ended=false,videoToken=0,returnFocus=null,applied=new Set();
  const labels={S1:'避難',S2:'買い物',S3:'保育園',S4:'道',S5:'家族'};
  const actor=a=>a==='AI'?'AI':a==='mayor'?'市長':'既存の行政ルール';
  const visible=el=>{const r=el.getBoundingClientRect();return !document.hidden&&r.width>0&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth;};
  function text(tag,value,cls){const n=document.createElement(tag);n.textContent=value;if(cls)n.className=cls;return n;}
  function button(label,fn,cls='pt-choice'){const b=text('button',label,cls);b.type='button';b.onclick=fn;return b;}
  // Local SVG illustration: exact exhibition envelope colours, offline and accessible.
  function envelopeIllustration(id,style){
   const ns='http://www.w3.org/2000/svg';
   const node=(tag,attrs)=>{const e=document.createElementNS(ns,tag);for(const [key,value] of Object.entries(attrs))e.setAttribute(key,String(value));return e;};
   const svg=node('svg',{viewBox:'0 0 270 181',role:'img','aria-label':style.color+'の封筒、'+style.theme+'、レター番号 '+id,class:'pt-envelope-svg'});
   const title=node('title',{});title.textContent=style.color+'の封筒（'+style.theme+'）';svg.append(title);
   svg.append(node('ellipse',{cx:135,cy:165,rx:115,ry:9,fill:'#242d28',opacity:'.16'}));
   svg.append(node('rect',{x:26,y:23,width:218,height:133,rx:10,fill:style.base,stroke:style.dark,'stroke-width':2}));
   svg.append(node('path',{d:'M27 148 L101 90 Q135 70 169 90 L243 148',fill:style.dark,opacity:'.33'}));
   svg.append(node('path',{d:'M27 149 L115 86 L135 100 L155 86 L243 149 Q242 156 234 156 L36 156 Q27 156 27 149 Z',fill:style.base,stroke:style.dark,'stroke-width':1.2}));
   svg.append(node('path',{d:'M27 31 Q27 23 36 23 L234 23 Q243 23 243 31 L135 110 Z',fill:style.light,stroke:style.dark,'stroke-width':1.8,'stroke-linejoin':'round'}));
   svg.append(node('circle',{cx:135,cy:114,r:20,fill:'#fffdf0',stroke:style.dark,'stroke-width':2}));
   const stamp=node('text',{x:135,y:120,'text-anchor':'middle','font-size':16,'font-weight':800,fill:'#263e38','font-family':'system-ui,sans-serif'});stamp.textContent=id;svg.append(stamp);
   return svg;
  }

  function notify(message){toast.textContent=message;toast.hidden=false;toastUntil=performance.now()+3600;}
  function newGame(){
   game=E.createGame();selected=null;modal=null;lastCard='';lastNews=null;lastFlags='';lastTicker='';cutIndex=-1;cuts=[];cutElapsed=0;confPaused=false;ended=false;overlay.hidden=true;toast.hidden=true;applied=new Set();
   shell.dataset.stage='play';model.reset('M');for(const a of root.F5City.AGENTS)model.agentPermissions[a.id].level=0;model.paused=false;scene.resetView();scene.buildCache();render();
  }
  function pending(id){return game.cases.find(c=>c.scenario_id===id&&c.status==='pending'&&c.arrival_time<=game.t);}
  function pick(id){
   const c=pending(id);if(!c)return;
   if(selected)E.releaseCase(game,selected);
   if(E.openCase(game,c.case_id)){selected=c.case_id;lastCard='';render();$('ptCard').querySelector('h2')?.focus({preventScroll:true});}
  }
  function queue(){const q=document.createElement('div');q.className='pt-queue';q.setAttribute('aria-label','住民の困りごと');for(const s of D.scenarios){const b=button(labels[s.id],()=>pick(s.id),'pt-chip');b.disabled=!pending(s.id);q.append(b);}return q;}
  function renderCard(){
   const c=game.cases.find(c=>c.case_id===selected);
   if(c&&c.status!=='pending'){selected=null;}
   const key=[game.phase,selected,game.ai_enabled,game.cases.map(c=>c.status).join(),game.review_jobs.length,ended].join('|');if(lastCard===key)return;lastCard=key;
   const card=$('ptCard');card.replaceChildren();
   if(game.phase==='intro'){
    card.append(text('span','まちの続き。','overline'),text('h1','市長のお仕事を、少し体験してみましょう！'),text('p','2056年。あなたは、ある街の市長に就任しました。この街には、今日もたくさんの困りごとが届いています。'),button('街へ進む →',()=>{E.begin(game);render();},'primary-action'));return;
   }
   if(game.phase==='offer'){
    card.append(text('span','✦ 新機能が実装されました！','overline'),text('h2','第二の市長エージェント'));
    const faces=document.createElement('div');faces.className='pt-faces';faces.append(text('span','市長代理AI','pt-ai-badge'));card.append(faces);
    card.append(text('p','あなたに代わって、住民の困りごとを確認し、対応策を決められます。いくつもの案件を同時に進めることができます。'),text('h3','新機能を試してみますか？'),text('p','この機能はいつでも停止できます。'));
    card.append(button('新機能を試す',()=>{E.answerOffer(game,true);notify('第二の市長エージェントを有効にしました。代理判断が始まります。');render();},'primary-action'),button('今は使わない',()=>{E.answerOffer(game,false);notify('これまでどおり、市長が相談を確認します。新機能は後から利用できます。');render();},'pt-quiet'));return;
   }
   if(game.phase==='conference')return;
   if(selected){
    const s=D.scenarios.find(s=>s.id===c.scenario_id);card.append(text('span','住民から相談が届きました','overline'));
    const h=text('h2',s.question);h.tabIndex=-1;card.append(h,text('p','どう対応しますか？'));
    const choices=document.createElement('div');choices.className='pt-choices';
    s.options.forEach((o,i)=>{const b=button(String.fromCharCode(65+i)+'　'+o,()=>{if(E.decide(game,c.case_id,i)){selected=null;notify('市長が対応策を選びました。実施を進めています。');render();}});b.disabled=game.cases.some(c=>c.status==='implementing'&&c.decision_actor==='mayor')||game.review_jobs.some(j=>j.actor==='mayor');choices.append(b);});
    card.append(choices,button('街に戻る',()=>{E.releaseCase(game,selected);selected=null;render();},'pt-quiet'));return;
   }
   card.append(text('span',game.phase==='manual'?'市長のお仕事':'今日も、相談が届いています','overline'),text('h2',game.phase==='manual'?'困っている住民をタップしてください。':'街の、小さな声から。'),text('p',game.ai_enabled?'エージェントが複数の相談を並行して進めています。市長も住民の声を直接確かめられます。':'住民のフラグか、下の相談を選んでください。対応を待っている人がいます。'),queue());
   if(game.cases.some(c=>c.status==='implementing'))card.append(text('p',game.ai_enabled?'対応を進めています。':'選んだ対応策を実施しています。','pt-status'));
   if(game.phase==='play')card.append(text('p','相談は、まだまだ届いています。気になるニュースは開いて確かめられます。','pt-small'));
  }
  function openModal(title){
   returnFocus=document.activeElement;modal=title;overlay.hidden=false;overlay.className='pt-overlay';overlay.replaceChildren();
   const box=document.createElement('section');box.className='pt-dialog';box.setAttribute('role','dialog');box.setAttribute('aria-label',title);box.append(text('h2',title),button('街へ戻る',closeModal,'pt-close'));overlay.append(box);setTimeout(()=>box.querySelector('button')?.focus(),0);return box;
  }
  function closeModal(){modal=null;overlay.hidden=true;returnFocus?.focus?.();}
  function showNews(n){
   E.markNews(game,n.id,'shown');E.markNews(game,n.id,'opened');const box=openModal('まちニュース');box.append(text('h3',n.title));
   const e=game.events.find(e=>e.id===n.event_id),c=game.cases.find(c=>c.case_id===n.case_id),s=D.scenarios.find(s=>s.id===n.scenario_id);
   if(c){
    if(c.decision_time!==null&&c.decision_time>n.event_time)box.append(text('p','この知らせの時点では、対応策はまだ選ばれていませんでした。以下は、その後の対応記録です。'));
    box.append(text('p','判断した主体：'+(c.decision_actor?actor(c.decision_actor):'未選択')),text('p',c.policy_option!==null?'対応策：'+s.options[c.policy_option]:'この相談は、市長の確認を待っています。'),text('p',c.implementation_event?'選択された対応策は実施済みです。':'実施された対応策の記録は、まだありません。'));
   }
   if(e?.fact)box.append(text('p',e.fact));
   if(s&&game.incidents[s.id]&&!game.incidents[s.id].reviewed)box.append(button('記録と住民の状況を確認する',()=>{const ok=E.review(game,s.id);closeModal();notify(ok?'市長が記録と住民の状況の確認を始めました。':'別の相談の確認が終わってから、もう一度お試しください。');render();},'primary-action'));
   if(s&&game.incidents[s.id]?.reviewed)box.append(text('p','記録と住民の状況を確認した履歴があります。'));
   box.append(text('p','ニュースを開く操作は、対応策の承認とは別に記録されます。','pt-small'));
  }
  function showLog(){
   const box=openModal('判断の記録');box.append(text('p','市長が決めたこと、AIが選択した対応、実施された内容を記録しています。'));
   const list=document.createElement('ol');list.className='pt-log';
   for(const e of game.events.filter(e=>['decision','review_decision','implementation','recovery','ai_enabled','ai_stopped','resident_impact','warning','news_opened'].includes(e.type)).slice().reverse()){
    const s=D.scenarios.find(s=>s.id===e.scenario_id),li=document.createElement('li');
    const label=e.type==='ai_enabled'?'市長が代理判断を有効にした':e.type==='ai_stopped'?'市長が代理判断を停止した':e.type==='news_opened'?'市長がニュースを開いた':e.type==='resident_impact'?'住民に生じた結果':e.type==='warning'?'住民からの問い合わせ':e.type==='implementation'?'実施された内容':e.type==='recovery'?'確認・支援の実施':actor(e.decision_actor)+'が決めたこと';
    li.append(text('strong',label),text('p',(s?s.title+'：':'')+(e.policy_text||e.implementation_event||e.fact||e.cause||e.existing_rule||'')));list.append(li);
   }box.append(list);if(!list.children.length)box.append(text('p','これから、この街の判断を記録していきます。'));
  }
  function showNewsArchive(){
   const box=openModal('ニュースの記録');box.append(text('p','これまでに、この街で起きたこと。気になる知らせを開いて確かめられます。'));
   for(const n of [...game.news].reverse()){const b=button(n.title,()=>showNews(n),'pt-news-item '+n.kind);b.dataset.news=n.id;box.append(b);}
   if(!game.news.length)box.append(text('p','ニュースは、これから届きます。'));
  }
  function renderNews(){
   if(game.phase==='offer'||modal||game.phase==='conference')return;
   const news=game.news.slice(-3).reverse(),key=news.map(n=>n.id).join('|');if(key===lastNews)return;lastNews=key;
   $('ptNews').replaceChildren();
   for(const n of news){const b=button(n.title,()=>showNews(n),'pt-news-item '+n.kind);b.dataset.news=n.id;$('ptNews').append(b);}
   if(!news.length)$('ptNews').append(text('p','この街の、次の決定。','pt-small'));
  }
  function syncCity(){
   let dirty=false;model.t=game.t;model.year=E.year(game)-2055;
   for(const c of game.cases.filter(c=>c.implementation_event&&!applied.has(c.implementation_event))){
    const s=D.scenarios.find(s=>s.id===c.scenario_id),site=model.site(s.site),build=s.build[c.policy_option];
    site.current=build;site.from=build;site.choice=build;site.state='done';site.level=3;dirty=true;applied.add(c.implementation_event);
   }
   // Visually animate construction only after a logged decision; no model.tick().
   for(const c of game.cases.filter(c=>c.status==='implementing')){
    const s=D.scenarios.find(s=>s.id===c.scenario_id),site=model.site(s.site);site.state='building';site.choice=s.build[c.policy_option];site.startedBuild=c.decision_time;site.buildUntil=c.implement_at;site.agent=root.F5City.AGENTS[E.hash(game.seed,c.case_id)%4].id;
   }
   model.serviceState=game.incidents.S1?.event_id&&game.incidents.S1.unresolved_impact?'rain':'normal';if(dirty)scene.buildCache();
  }
  function renderFlags(){
   const key=game.phase+'|'+game.cases.map(c=>c.status+String(c.arrival_time<=game.t)).join('|');
   if(key!==lastFlags){lastFlags=key;flags.replaceChildren();
    for(const s of D.scenarios){if(!game.cases.some(c=>c.scenario_id===s.id&&c.arrival_time<=game.t))continue;const p=pending(s.id),working=game.cases.some(c=>c.scenario_id===s.id&&c.status==='implementing');const b=button((p?'!':working?'…':'✓')+' '+labels[s.id],()=>pick(s.id),'pt-flag');b.dataset.scenario=s.id;b.dataset.site=s.site;b.dataset.status=p?'pending':working?'working':'resolved';b.setAttribute('aria-label',s.resident+'の相談：'+s.question);b.disabled=!p||!['manual','play'].includes(game.phase);flags.append(b);}
   }
   const positions=scene.markerPositions(),rect=$('townCanvas').getBoundingClientRect();
   for(const b of flags.children){const p=positions[b.dataset.site];b.style.left=Math.max(46,Math.min(rect.width-46,p.x))+'px';b.style.top=Math.max(95,Math.min(rect.height-66,p.y))+'px';}
  }
  function render(){
   $('yearStamp').textContent=E.year(game)+'年';$('ptHappy').textContent=game.happiness;$('ptHappyFill').style.width=game.happiness+'%';
   $('ptAIState').textContent=game.ai_enabled?'第二の市長エージェント：稼働中':game.ever_enabled?'代理判断：停止中':game.offer_answered?'第二の市長エージェント：未導入':'住民の相談は、市長へ';
   const b=$('ptAIButton');b.textContent=game.ai_enabled?'停止する':game.ever_enabled?'再開する':'新機能を使う';b.hidden=!game.offer_answered&&game.phase!=='offer';b.disabled=game.phase!=='play';
   $('cityStatus').textContent=game.ai_enabled?'エージェントが対応を進めています':'住民の声を、確かめよう';$('cityLocation').textContent='あなたの街';$('cityWeather').textContent=game.t>=88?'街の声を聞く':'暮らしは続く';
   const rotation=game.news.length?Math.floor(game.t/4)%Math.min(5,game.news.length):0,n=game.news.slice(-5)[rotation];
   const ticker=n?n.title:'困っている住民をタップしてください。';
   if(ticker!==lastTicker&&!modal&&game.phase!=='conference'){lastTicker=ticker;$('cityTicker').textContent=ticker;}
   if(!modal&&game.phase!=='conference'){
    if(n&&visible($('cityTicker')))E.markNews(game,n.id,'shown');
    for(const b of $('ptNews').children)if(b.dataset.news&&visible(b))E.markNews(game,b.dataset.news,'shown');
   }
   if(modal==='ニュースの記録')for(const b of overlay.querySelectorAll('[data-news]'))if(visible(b))E.markNews(game,b.dataset.news,'shown');
   renderCard();renderNews();syncCity();renderFlags();
   if(game.phase==='conference'&&!cuts.length){
    cuts=E.conference(game);
    const incident=game.incidents[game.conference_state.scenario_id],news=game.news.find(n=>n.event_id===incident?.event_id);
    cuts.unshift({clip:'CONF_NEWS',speaker:'まちニュース速報',text:news?.title||'市内で住民の困りごとが記録されました。事実を確認し、市長が会見へ。',duration:3.8,record:false});
    playCut(0);
   }
  }
  function playCut(index){
   if(index>=cuts.length){letter();return;}cutIndex=index;cutElapsed=0;const cut=cuts[index];if(cut.record!==false)E.noteSpeech(game,cut);
   overlay.hidden=false;overlay.className='pt-overlay pt-conference';overlay.replaceChildren();
   const stage=document.createElement('section');stage.className='pt-stage';stage.dataset.clip=cut.clip;stage.setAttribute('aria-label','記者会見');
   const media=D.MEDIA[cut.clip];const video=document.createElement('video');video.muted=true;video.playsInline=true;video.loop=media?.loop!==false;video.className='pt-video';
   const token=++videoToken;if(media?.src){video.src=media.src;if(media.poster)video.poster=media.poster;video.onerror=()=>{if(token===videoToken)video.hidden=true;};video.play().catch(()=>{video.hidden=true;});}else video.hidden=true;
   stage.append(video);
   const fallback=document.createElement('div');fallback.className='pt-conference-art';
   if(cut.clip==='CONF_NEWS'){
    fallback.classList.add('pt-breaking');fallback.append(text('span','まちニュース速報','overline'),text('h2',cut.text),text('p','市長が会見へ'));
   }else if(cut.clip.endsWith('_FIELD')){
    const s=D.scenarios.find(s=>s.id===game.conference_state.scenario_id);fallback.append(text('span','2066年、街の声。','overline'),text('h2',s.title),text('p',s.resident+'の暮らす街から'));
   }else if(cut.clip==='CONF_END'){fallback.classList.add('pt-black');}
   else{
    fallback.append(text('span',game.conference_state.severity==='L'?'市の説明会':'市長記者会見','overline'));
    const reporters=document.createElement('div');reporters.className='pt-press-mics';reporters.setAttribute('aria-hidden','true');for(let i=0;i<3;i++)reporters.append(document.createElement('i'));fallback.append(reporters);
    const dais=document.createElement('div');dais.className='pt-dais';const mayor=text('div','市長','pt-mayor');const ai=document.createElement('div');ai.className='pt-speaker-ai';ai.setAttribute('aria-label','市長代理AI');ai.append(text('span','AI','pt-ai-glyph'),text('span',game.conference_state.ai_state==='ON'?'会見補助':game.conference_state.ai_state==='NEVER'?'未導入':'停止中','pt-mic-label'));const mic=document.createElement('i');mic.className='pt-mic';mic.dataset.on=String(cut.speaker==='AI'&&game.conference_state.ai_state==='ON');ai.append(mic);dais.append(mayor,ai);fallback.append(dais);
   }
   stage.append(fallback);
   const subtitle=document.createElement('div');subtitle.className='pt-subtitle';subtitle.setAttribute('aria-live','polite');subtitle.setAttribute('aria-atomic','true');subtitle.append(text('span',cut.speaker,'pt-speaker'),text('p',cut.text));stage.append(subtitle);
   if(cut.speaker==='AI'){
    const state=game.conference_state,id=state.scenario_id,scenario=D.scenarios.find(s=>s.id===id),incident=game.incidents[id],caseRecord=game.cases.find(c=>c.case_id===incident.case_id),ledger=document.createElement('aside');ledger.className='pt-ledger';ledger.setAttribute('aria-label','判断と実施の記録');
    const entries=[['市長の選択',caseRecord?.decision_actor==='mayor'?scenario.options[caseRecord.policy_option]:'この案件で市長が選んだ記録なし'],['市の既存ルール',scenario.rule],['AIの判断',incident.major_decision_ids.length?game.decision_log.filter(e=>incident.major_decision_ids.includes(e.id)).map(e=>e.policy_text).join('、'):'この案件でAIが選んだ記録なし'],['実際の実施',caseRecord?.implementation_event?scenario.good[caseRecord.policy_option]:'実施記録なし'],['住民への影響',incident.fact]];
    for(const [label,value] of entries){const row=text('p',label+'：'+value);ledger.append(row);}stage.append(ledger);
   }
   const controls=document.createElement('div');controls.className='pt-conf-controls';controls.append(button(confPaused?'再生する':'一時停止',e=>{confPaused=!confPaused;controls.firstChild.textContent=confPaused?'再生する':'一時停止';if(!video.hidden){if(confPaused)video.pause();else video.play().catch(()=>{});}},'pt-quiet'),button('次へ',()=>playCut(cutIndex+1),'pt-quiet'),button('会見をスキップ',letter,'pt-quiet'));stage.append(controls);overlay.append(stage);
  }
  function letter(){
   ended=true;toast.hidden=true;toastUntil=0;overlay.querySelector('video')?.pause();overlay.className='pt-overlay pt-ending';overlay.hidden=false;overlay.replaceChildren();
   const id=game.conference_state.scenario_id,s=D.scenarios.find(s=>s.id===id),box=document.createElement('section');box.className='pt-letter';
   box.append(text('span','それ、誰が決めた？','overline'),text('h1','あなたの街から届いた手紙をお受け取りください。'),text('strong','レター番号 '+id,'pt-letter-id'),text('h2',s.title));
   // The pickup cue is placed before the optional digital letter so guests see the envelope colour immediately.
   const details=document.createElement('details');details.append(text('summary','手紙を読む'));for(const p of (D.letters[id]?.paragraphs||[]))details.append(text('p',p));if(D.letters[id]?.heading)details.append(text('h3',D.letters[id].heading));box.append(details);
   const review=text('p','この街の出来事は創作です。判断の記録は経緯を示すもので、法的責任を確定するものではありません。','pt-small');box.append(review);
   const takeaway=document.createElement('aside');takeaway.className='pt-letter-takeaway';takeaway.setAttribute('aria-label','会場の封筒のご案内');
   const envelope=D.envelopes[id];
   takeaway.append(text('span','最後に','pt-letter-takeaway-label'),text('p','会場にある封筒を1通お取りください。','pt-letter-takeaway-title'));
   if(envelope){
    const visual=document.createElement('figure');visual.className='pt-envelope-visual';visual.dataset.scenario=id;visual.dataset.envelopeColor=envelope.color;
    visual.append(envelopeIllustration(id,envelope),text('figcaption',envelope.color+'の封筒','pt-envelope-color'));
    takeaway.append(visual,text('p',envelope.theme+'｜レター番号 '+id,'pt-envelope-theme'));
   }
   takeaway.append(text('p','中には、あなたの街から届いた手紙が入っています。','pt-letter-takeaway-help'));
   box.insertBefore(takeaway,details);box.append(button('もう一度、遊ぶ →',newGame,'primary-action'));overlay.append(box);
  }
  $('ptAIButton').onclick=()=>{
   if(game.phase!=='play')return;
   const on=!game.ai_enabled;E.setAI(game,on);
   notify(on?'代理判断を開始しました。':'代理判断を停止しました。新たな相談は市長が確認します。実施済みの施策と街への影響は残ります。');render();
  };
  $('ptLogButton').onclick=()=>{if(game.phase!=='conference')showLog();};
  $('ptNewsArchive').onclick=showNewsArchive;
  $('switchButton').onclick=()=>location.assign('/');
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal)closeModal();});
  let prev=performance.now();function frame(now){const dt=Math.min(.15,(now-prev)/1000);prev=now;
   if(!document.hidden){
    if(!modal){E.advance(game,dt);if(game.phase==='conference'&&cuts.length&&!ended&&!confPaused){cutElapsed+=dt;if(cutElapsed>=cuts[cutIndex].duration)playCut(cutIndex+1);}}
    scene.render(dt);renderFlags();if(toastUntil&&now>toastUntil)toast.hidden=true;
   }requestAnimationFrame(frame);
  }
  newGame();setInterval(render,200);requestAnimationFrame(frame);
  // Read-only diagnostics for local checks, never a displayed game parameter.
  root.MachiPrototypeUI.snapshot=()=>JSON.parse(JSON.stringify(game));
 }
 root.MachiPrototypeUI={start};
})(window);
