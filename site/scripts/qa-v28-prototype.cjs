const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {pathToFileURL}=require('node:url');
let puppeteer;try{puppeteer=require(process.env.F5_PUPPETEER_MODULE||'puppeteer')}catch{puppeteer=require(path.join(os.homedir(),'.local/share/desktop-commander-remote/node_modules/puppeteer'))}
const target=path.resolve(__dirname,'../../standalone/それ、誰が決めた？_街が動く版.html');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'f5-v28-qa-'));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function start(page){
 await page.goto(pathToFileURL(target).href+'?prototype=1',{waitUntil:'load'});
 await page.waitForFunction(()=>document.querySelector('#shell')?.dataset.view==='prototype'&&window.MachiPrototypeUI?.snapshot?.().phase==='intro',{timeout:15000});
 await page.click('#ptCard button.primary-action');
 await page.waitForFunction(()=>MachiPrototypeUI.snapshot().phase==='manual',{timeout:10000});
 await page.evaluate(()=>{const advance=MachiPrototype.advance;MachiPrototype.advance=(g,dt)=>advance(g,dt*18);});
 for(const id of ['S2','S3']){
  await page.waitForSelector('.pt-flag[data-scenario="'+id+'"]:not([disabled])',{visible:true,timeout:20000});
  await page.evaluate(id=>{const b=document.querySelector('.pt-flag[data-scenario="'+id+'"]');if(!b||b.disabled)throw Error('No active flag '+id);b.click();},id);
  await page.waitForSelector('#ptCard .pt-choice',{visible:true,timeout:10000});
  assert.equal(await page.$$eval('#ptCard .pt-choice',els=>els.length),4);
  await page.evaluate(()=>{const b=document.querySelector('#ptCard .pt-choice');if(!b)throw Error('No option');b.click();});
  await page.waitForFunction(()=>!MachiPrototypeUI.snapshot().cases.some(c=>c.status==='implementing'&&c.decision_actor==='mayor'),{timeout:10000});
 }
 await page.waitForFunction(()=>MachiPrototypeUI.snapshot().phase==='offer',{timeout:10000});
}
(async()=>{let browser;try{
 browser=await puppeteer.launch({headless:true,executablePath:process.env.F5_CHROME_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const [w,h] of [[320,700],[390,844],[1024,768],[1920,1080]]){
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewport({width:w,height:h,deviceScaleFactor:w<600?2:1,isMobile:w<600,hasTouch:w<600});
  await page.goto(pathToFileURL(target).href+'?prototype=1',{waitUntil:'load'});
  await page.waitForFunction(()=>document.querySelector('#shell')?.dataset.view==='prototype');
  const ui=await page.evaluate(()=>({year:document.querySelector('#yearStamp').textContent,phase:MachiPrototypeUI.snapshot().phase,scroll:document.documentElement.scrollWidth,window:innerWidth,visibleStats:[...document.querySelectorAll('[data-stat]')].filter(n=>getComputedStyle(n).display!=='none'&&n.offsetWidth>0).length,qr:document.querySelector('#siteQrOpen')?.getBoundingClientRect().width}));
  assert.equal(ui.phase,'intro');assert.match(ui.year,/2056/);assert.ok(ui.scroll<=w,'horizontal scroll at '+w+': '+JSON.stringify(ui));assert.equal(ui.visibleStats,0);assert.ok(ui.qr>=44);
  if(w===390)await page.screenshot({path:path.join(dir,'intro-mobile.png')});
  assert.deepEqual(errors,[]);await page.close();console.log('PASS prototype viewport',w,h,JSON.stringify(ui));
 }
 for(const mode of ['NEVER','ON','EARLY_OFF']){
  const page=await browser.newPage(),errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:\/\//.test(r.url()))requests.push(r.url())});
  await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await start(page);
  await page.waitForFunction(()=>document.querySelector('#ptCard')?.textContent.includes('新機能を試してみますか'),{timeout:10000});
  await page.click(mode==='NEVER'?'#ptCard button.pt-quiet':'#ptCard button.primary-action');
  await page.waitForFunction(()=>MachiPrototypeUI.snapshot().phase==='play');
  if(mode==='EARLY_OFF'){await page.click('#ptAIButton');await page.waitForFunction(()=>!MachiPrototypeUI.snapshot().ai_enabled);}
  await page.evaluate(()=>{const old=MachiPrototype.advance;MachiPrototype.advance=(g,dt)=>old(g,dt*2.5)});
  await page.waitForFunction(()=>MachiPrototypeUI.snapshot().phase==='conference',{timeout:20000});
  const info=await page.evaluate(()=>({s:MachiPrototypeUI.snapshot().conference_state,clips:MachiPrototype.conference(MachiPrototypeUI.snapshot()).map(c=>({speaker:c.speaker,clip:c.clip,text:c.text}))}));
  assert.equal(info.s.ai_state,mode);const ai=info.clips.filter(c=>c.speaker==='AI');assert.equal(ai.length>0,mode==='ON');
  await page.waitForFunction(()=>document.querySelector('.pt-stage')?.dataset.clip==='CONF_NEWS',{timeout:10000});
  assert.match(await page.$eval('.pt-stage',e=>e.textContent),/まちニュース速報/);
  await page.click('.pt-conf-controls button:last-child');
  await page.waitForSelector('.pt-letter-id',{visible:true,timeout:10000});
  const letter=await page.$eval('.pt-letter-id',e=>e.textContent);assert.match(letter,/S[1-5]/);
  await page.screenshot({path:path.join(dir,'letter-'+mode+'.png')});
  await page.click('.pt-letter .primary-action');await page.waitForFunction(()=>MachiPrototypeUI.snapshot().phase==='intro',{timeout:10000});
  assert.deepEqual(errors,[],'page errors '+mode+': '+errors.join(' | '));assert.deepEqual(requests,[],'external requests '+mode);
  console.log('PASS prototype actual play',mode,info.s.scenario_id,info.s.severity,'ai_speech',ai.length,'letter',letter);
  await page.close();
 }
 console.log('ALL_V28_PROTOTYPE_BROWSER_QA_PASSED',dir);
 }finally{await browser?.close();}})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
