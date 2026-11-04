// Read-only integration QA: all group API responses are synthetic; no production D1 writes.
const fs=require('fs'),path=require('path'),os=require('os');
let puppeteer;
try { puppeteer=require(process.env.F5_PUPPETEER_MODULE||'puppeteer'); }
catch { puppeteer=require(path.join(os.homedir(),'.local/share/desktop-commander-remote/node_modules/puppeteer')); }
const Engine=require('../engine.js');
const root=path.join(__dirname,'..','public');
const base='https://machi-no-tsuzuki-20261031.tthkpba.chatgpt.site/';
const sourceOrigin=new URL(base).origin;
const out=process.env.F5_QA_OUTPUT||fs.mkdtempSync(path.join(os.tmpdir(),'f5-v21-guest-'));
fs.mkdirSync(out,{recursive:true});console.log('QA_ARTIFACT_DIR',out);
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const assert=(x,msg)=>{if(!x)throw new Error(msg)};
function stateFor(phase,isParticipant=false){
 const g=Engine.createGame(1000,{autostart:phase==='active'||phase==='reveal'});
 if(isParticipant)Engine.join(g,'mock','合成',1001);
 if(phase==='lobby'){if(g.phase==='waiting')Engine.join(g,'test-holder','合成',1000);}
 if(phase==='waiting')g.phase='waiting';
 if(phase==='reveal')while(g.phase==='active')Engine.advance(g,g.roundEndsAt+1);
 const s=Engine.publicState(g,isParticipant?'mock':'',Date.now());
 if(s.phase!==phase)throw Error('Engine phase mismatch '+s.phase+' vs '+phase);
 return s;
}
async function check(browser,size,phase,participant){
 const tag=phase+(participant?'-member':'-guest')+'-'+size[0];
 const page=await browser.newPage();await page.setViewport({width:size[0],height:size[1],deviceScaleFactor:1,isMobile:size[0]<600,hasTouch:size[0]<600});
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
 await page.setCacheEnabled(false);
 const state=stateFor(phase,participant),errors=[],requests=[];
 page.on('pageerror',err=>errors.push(err.message));
 await page.setRequestInterception(true);
 page.on('request',r=>{
  const u=new URL(r.url());
  if(r.method()!=='GET'&&r.method()!=='HEAD'){requests.push('blocked write '+r.method()+' '+u.pathname);return r.abort();}
  if(u.origin===sourceOrigin){
   if(u.pathname==='/api/state'){requests.push('mock GET /api/state');return r.respond({status:200,contentType:'application/json',body:JSON.stringify(state)});}
   if(u.pathname==='/app.js'||u.pathname==='/style.css'||u.pathname==='/'){const file=u.pathname==='/'?'index.html':u.pathname.slice(1);return r.respond({status:200,contentType:file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'text/html',body:fs.readFileSync(path.join(root,file))});}
   if(u.pathname==='/api/qr.svg'&&r.method()==='GET')return r.respond({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1" />'});
   if(u.pathname.startsWith('/api/')){requests.push('blocked '+r.method()+' '+u.pathname);return r.abort();}
  }
  return r.continue();
 });
 try{
  await page.goto(base+'?mode=group',{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>document.querySelector('#cityTicker')?.textContent!=='この街の、次の決定。',{timeout:12000});
  await delay(1250);
  const data=await page.evaluate(()=>{
   const rect=id=>{const x=document.getElementById(id);if(!x)return null;const r=x.getBoundingClientRect();return{visible:!x.hidden&&getComputedStyle(x).display!=='none',y:r.y,bottom:r.bottom,height:r.height,text:x.textContent.slice(0,250)}};
   return{w:innerWidth,h:innerHeight,scrollWidth:document.documentElement.scrollWidth,status:document.querySelector('#cityTicker')?.textContent,notice:rect('groupRevealNotice'),next:rect('endingNext'),join:rect('joinPanel'),result:rect('resultPanel'),solo:rect('groupRevealSolo')};
  });
  const expected=phase==='reveal'&&!participant;
  assert(data.notice?.visible===expected,tag+' wrong notice '+JSON.stringify(data));
  assert(data.scrollWidth<=size[0]+2,tag+' horizontal scroll');
  if(expected){
   assert(data.result.visible,tag+' result hidden');assert(!data.join.visible,tag+' join exposed in reveal');
   assert(data.notice.text.includes('今は結果を表示中'),tag+' missing explanation');
   assert(data.status!==data.notice.text,tag+' duplicate announcement wastes visual attention');
   assert(data.solo.height>=44,tag+' touch too small');
   assert(data.next.bottom<=size[1]-8,tag+' ending CTA off viewport '+JSON.stringify(data.next));
  }
  if(phase==='waiting'&&!participant)assert(data.join.visible,tag+' waiting join disabled');
  await page.screenshot({path:path.join(out,tag+'.png')});
  if(expected&&size[0]===390){
   await page.click('#groupRevealSolo');
   await page.waitForFunction(()=>location.search.includes('mode=solo')&&!document.querySelector('#questionPanel').hidden,{timeout:18000});
   assert((await page.url()).includes('?mode=solo'),tag+' solo escape failed');
  }
  assert(errors.length===0,tag+' JS errors '+errors.join(' | '));
  assert(!requests.some(x=>x.startsWith('blocked')),tag+' unexpected API calls '+requests.join(' | '));
  console.log('PASS',tag,JSON.stringify({notice:data.notice?.visible,noticeBottom:data.notice?.bottom,ctaBottom:data.next?.bottom,join:data.join?.visible,ticker:data.status,requests,errors}));
 }finally{await page.close();}
}
(async()=>{const b=await puppeteer.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-dev-shm-usage']});try{
 for(const phase of ['waiting','lobby','active','reveal'])await check(b,[390,844],phase,false);
 for(const size of [[320,700],[1024,768]])await check(b,size,'reveal',false);
 await check(b,[390,844],'reveal',true);
 console.log('ALL_V21_MOCK_GROUP_GUEST_QA_PASSED');
}finally{await b.close()}})().catch(e=>{console.error('FAILED',e.stack||e);process.exitCode=1});
