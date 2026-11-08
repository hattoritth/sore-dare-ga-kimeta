// v38 browser QA: optional v37 conference, touch-safe progression and non-mutating comparison.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {pathToFileURL}=require('node:url');
let puppeteer;try{puppeteer=require(process.env.F5_PUPPETEER_MODULE||'puppeteer')}catch{puppeteer=require(path.join(os.homedir(),'.local/share/desktop-commander-remote/node_modules/puppeteer'))}
const source=path.resolve(__dirname,'../../standalone/それ、誰が決めた？_街が動く版.html');
const out=fs.mkdtempSync(path.join(os.tmpdir(),'f5-v38-optional-'));
const summary=[];
async function run(browser,[w,h]){
 const page=await browser.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.setViewport({width:w,height:h,deviceScaleFactor:w<600?2:1,isMobile:w<600,hasTouch:w<600});
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
 await page.goto(pathToFileURL(source).href+'?mode=solo',{waitUntil:'load'});
 await page.waitForFunction(()=>!document.querySelector('#questionPanel').hidden);
 for(let i=0;i<4;i++){
  const id=await page.$eval('#decisionOptions [data-vote]',el=>el.dataset.vote);
  await page.click('#decisionOptions [data-vote]');
  await page.waitForFunction(prev=>{const btn=document.querySelector('#decisionOptions [data-vote]');return (!document.querySelector('#resultPanel').hidden)||(btn&&btn.dataset.vote!==prev&&!document.querySelector('#questionPanel').hidden)},{timeout:25000},id);
 }
 await page.waitForFunction(()=>!document.querySelector('#resultPanel').hidden&&document.querySelector('#endingCardTools').hidden===false,{timeout:25000});
 assert.equal(await page.$eval('#pressConference',e=>e.hidden),true,'press must be optional after the ending');
 assert.equal(await page.$eval('#endingCardTools',e=>e.hidden),false,'export tools first');
 const before=await page.$$eval('.reveal-stat strong',els=>els.map(e=>Number(e.textContent)));
 assert.equal(before.length,6,'six actual metrics must appear before optional hearing');
 await page.click('#openEndingPress');
 await page.waitForSelector('#pressConference:not([hidden])');
 assert.equal(await page.$eval('#siteQrOpen',e=>getComputedStyle(e).visibility),'hidden','QR must not overlap progress badge during optional press');
 const initial=await page.evaluate(()=>{
  const rect=id=>{const e=document.getElementById(id),r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};
  return {screen:[innerWidth,innerHeight],scroll:document.documentElement.scrollWidth,heading:document.getElementById('pressHeading').textContent,guide:document.getElementById('pressGuide').textContent,progress:document.getElementById('pressStepLabel').textContent,open:document.getElementById('pressModePanel').open,
   title:document.getElementById('pressOutcome').textContent,issue:document.getElementById('pressIssue').textContent,layout:{scene:rect('pressScene'),caption:rect('pressConference'),qr:rect('siteQrOpen'),heading:rect('pressHeading'),next:rect('pressNext'),skip:rect('pressSkip')},colors:{background:getComputedStyle(document.querySelector('.press-caption')).backgroundColor,text:getComputedStyle(document.querySelector('.press-caption h2')).color}};
 });
 assert.match(initial.heading,/2066年.*記者会見/);
 assert.match(initial.guide,/仮想/);assert.match(initial.progress,/1 \/ \d+/);assert.equal(initial.open,false);
 assert.ok(initial.scroll<=w+2,'horizontal overflow '+JSON.stringify(initial));
 assert.ok(initial.layout.next.height>=44&&initial.layout.skip.height>=44,'small tap targets '+JSON.stringify(initial.layout));
 if(w<600){const a=initial.layout.qr,b=initial.layout.heading;assert.ok(!(a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y),'QR overlaps press heading '+JSON.stringify(initial.layout));}
 await page.screenshot({path:path.join(out,'press-'+w+'.png')});
 if(w===390){
  await page.click('#pressModePanel summary');
  assert.equal(await page.$eval('#pressModePanel',e=>e.open),true);
  await page.click('[data-ai-mode=early]');
  assert.equal(await page.$eval('[data-ai-mode=early]',e=>e.getAttribute('aria-pressed')),'true');
  assert.match(await page.$eval('#pressStepLabel',e=>e.textContent),/1 \/ \d+/);
  await page.screenshot({path:path.join(out,'compare-'+w+'.png')});
  await page.click('#pressModePanel summary');
  assert.equal(await page.$eval('#pressModePanel',e=>e.open),false);
 }
 await page.click('#pressNext');
 await page.waitForFunction(()=>document.querySelector('#pressStepLabel').textContent.startsWith('会見 2 /'));
 assert.match(await page.$eval('#pressNext',e=>e.textContent),/次の発言へ/);
 await page.screenshot({path:path.join(out,'speech-'+w+'.png')});
 await page.click('#pressSkip');
 await page.waitForFunction(()=>document.querySelector('#pressConference').hidden);
 assert.notEqual(await page.$eval('#siteQrOpen',e=>getComputedStyle(e).visibility),'hidden','QR must return on results screen');
 await page.waitForFunction(()=>document.querySelector('#shadowMetrics').children.length===3&&document.querySelector('#endingCardTools').hidden===false);
 const values=await page.$$eval('.reveal-stat strong',els=>els.map(e=>Number(e.textContent)));
 assert.deepEqual(values,before,'optional press or comparison must never change stored scores');
 assert.deepEqual(errors,[],'javascript errors: '+errors.join('|'));
 const result={w,h,initial,values};summary.push(result);
 console.log('PASS conference clarity',w+'x'+h,JSON.stringify({progress:initial.progress,modeOpen:initial.open,scroll:initial.scroll,next:initial.layout.next,skip:initial.layout.skip,values}));
 await page.close();
}
(async()=>{const browser=await puppeteer.launch({headless:true,executablePath:process.env.F5_CHROME_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--no-sandbox','--disable-dev-shm-usage']});try{
 for(const size of (process.env.F5_QA_QUICK ? [[390,844],[1920,1080]] : [[320,700],[390,844],[1024,768],[1920,1080]]))await run(browser,size);
 assert.deepEqual(summary[0].values,summary[1].values,'AI comparison must not change 6 actual game metrics');
 console.log('ALL_V38_OPTIONAL_CONFERENCE_QA_PASSED',out);
}finally{await browser.close();}})().catch(error=>{console.error(error.stack||error);process.exitCode=1});
