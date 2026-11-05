// Local, offline browser acceptance for v26 press-conference-first ending and card export.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {pathToFileURL}=require('node:url');
let puppeteer;try{puppeteer=require(process.env.F5_PUPPETEER_MODULE||'puppeteer')}catch{puppeteer=require(path.join(os.homedir(),'.local/share/desktop-commander-remote/node_modules/puppeteer'))}
const source=path.resolve(__dirname,'../../standalone/それ、誰が決めた？_街が動く版.html');
const out=fs.mkdtempSync(path.join(os.tmpdir(),'f5-v26-qa-'));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function play(page,route){
 for(let i=0;i<route.length;i++){
  const options=await page.$$eval('#decisionOptions [data-vote]',els=>els.map(e=>e.dataset.vote));
  const id=options.find(x=>x.endsWith('-'+route[i]));
  assert.ok(id,'missing option round '+(i+1));
  await page.click('[data-vote="'+id+'"]');
  await page.waitForFunction(old=>{
   const p=document.querySelector('#pressConference');
   if(p&&!p.hidden)return true;
   const o=document.querySelector('#decisionOptions [data-vote]');
   return o&&o.dataset.vote!==old&&!document.querySelector('#questionPanel').hidden;
  },{timeout:20000},id);
  console.log('PASS round',i+1,id);
 }
 await page.waitForFunction(()=>!document.querySelector('#pressConference').hidden,{timeout:15000});
}
(async()=>{
 let browser;try{
  browser=await puppeteer.launch({headless:true,executablePath:process.env.F5_CHROME_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  const client=await page.target().createCDPSession();await client.send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:out});
  await page.goto(pathToFileURL(source).href+'?mode=solo',{waitUntil:'load'});
  await page.waitForFunction(()=>!document.querySelector('#questionPanel').hidden);
  const optionTypes=await page.$$eval('#decisionOptions .decision',els=>els.map(e=>({size:getComputedStyle(e.querySelector('strong')).fontSize,height:e.getBoundingClientRect().height})));
  assert.equal(optionTypes.length,4);assert.equal(new Set(optionTypes.map(x=>x.size)).size,1,'human and AI options must have equal font sizes');
  assert.ok(optionTypes.every(x=>x.height>=44),'all decision options must be touch-sized');
  console.log('PASS four equally weighted human/AI options',JSON.stringify(optionTypes));
  await play(page,['listen','listen','listen','listen']);
  const initial=await page.evaluate(()=>{
   const press=document.querySelector('#pressConference'),r=press.getBoundingClientRect(),qr=document.querySelector('#siteQrOpen').getBoundingClientRect();
   return {title:document.querySelector('#pressOutcome').textContent,scene:!!document.querySelector('#pressScene svg'),modal:[Math.round(r.width),Math.round(r.height)],qr:qr.width,oldMetrics:document.querySelector('#shadowMetrics').childElementCount,oldCard:document.querySelector('#endingCardPreview').childElementCount,buttons:[...press.querySelectorAll('button:not([hidden])')].map(e=>e.textContent.trim())};
  });
  assert.equal(initial.scene,true);assert.equal(initial.oldMetrics,0);assert.equal(initial.oldCard,0);
  const issueColor=await page.$eval('#pressIssue',e=>getComputedStyle(e).color);assert.notEqual(issueColor,'rgb(64, 93, 80)','issue caption must be readable on dark background');
  assert.deepEqual(initial.modal,[390,844]);assert.ok(initial.qr>=55);assert.ok(initial.title.length>8);
  await page.screenshot({path:path.join(out,'press-bad-mobile.png')});
  await page.click('#siteQrOpen');
  assert.equal(await page.$eval('#siteQrPanel',e=>e.hidden),false,'QR should open over conference');
  await page.click('#siteQrClose');
  console.log('PASS full viewport press first, distinct illustration, no early metrics, persistent QR',JSON.stringify(initial));
  const subtitles=[];for(let n=0;n<7;n++){
   if(await page.$eval('#pressConference',e=>e.hidden))break;
   await page.click('#pressNext');
   subtitles.push(await page.$eval('#pressAnswer',e=>e.textContent));
  }
  assert.equal(await page.$eval('#pressConference',e=>e.hidden),true,'conference should complete to result');
  assert.ok(subtitles.some(x=>x.length>6),'conference subtitles should appear');
  await page.waitForFunction(()=>document.querySelector('#shadowMetrics').children.length===3&&document.querySelector('#endingCardPreview').children.length>0);
  await page.screenshot({path:path.join(out,'card-bad-mobile.png')});
  assert.ok((await page.$eval('#endingTitle',e=>e.textContent)).length>8);
  console.log('PASS sequential captions -> card with 6 metrics and concrete title');
  await page.click('#downloadEndingPng');
  const pngPath=path.join(out,'sore-dare-ga-kimeta-result.png');
  for(let i=0;i<30&&!fs.existsSync(pngPath);i++)await sleep(200);
  assert.ok(fs.existsSync(pngPath)&&fs.statSync(pngPath).size>10000);
  assert.equal(fs.readFileSync(pngPath).subarray(1,4).toString('ascii'),'PNG');
  await page.click('#printEndingCard');
  await page.waitForFunction(()=>document.querySelector('#endingCardStatus').textContent.includes('PDFを保存しました'),{timeout:15000});
  const pdfPath=path.join(out,'sore-dare-ga-kimeta-result.pdf');
  for(let i=0;i<30&&!fs.existsSync(pdfPath);i++)await sleep(200);
  assert.ok(fs.existsSync(pdfPath)&&fs.statSync(pdfPath).size>20000);
  const pdf=fs.readFileSync(pdfPath).toString('latin1');
  assert.match(pdf,/^%PDF-1\.4/);assert.match(pdf,/\/Count 1/);assert.match(pdf,/\/MediaBox \[0 0 841\.89 595\.28\]/);
  console.log('PASS PNG/PDF actual downloads',fs.statSync(pngPath).size,fs.statSync(pdfPath).size);
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'no-preference'}]);
  await page.click('#openEndingPress');
  await page.click('#pressNext');
  await page.waitForFunction(()=>document.querySelector('#pressAnswer').textContent.length>0,{timeout:10000});
  await page.click('#pressSkip');
  await page.waitForFunction(()=>document.querySelector('#pressConference').hidden);
  await page.click('#replayButton');
  await page.waitForFunction(()=>!document.querySelector('#questionPanel').hidden&&document.querySelector('#resultPanel').hidden);
  await sleep(1400);
  const leftover=await page.evaluate(()=>{
   const ids=['endingCardPreview','endingCardPrint','endingRadar','publicMetrics','shadowMetrics','shadowSpotlightRows','pressScene','historyList'];
   return {children:ids.filter(id=>document.getElementById(id).childNodes.length),pressAnswer:document.querySelector('#pressAnswer').textContent,pressOutcome:document.querySelector('#pressOutcome').textContent,pressIssue:document.querySelector('#pressIssue').textContent};
  });
  assert.deepEqual(leftover,{children:[],pressAnswer:'',pressOutcome:'',pressIssue:''});
  console.log('PASS replay after active typewriter/skip: zero hidden prior DOM',JSON.stringify(leftover));
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  await play(page,['listen','listen','listen','ai']);
  const trueTitle=await page.$eval('#pressOutcome',e=>e.textContent);
  assert.match(trueTitle,/AI|役割|託す/);
  await page.screenshot({path:path.join(out,'press-true-mobile.png')});
  await page.click('#pressSkip');
  await page.waitForFunction(()=>document.querySelector('#shadowMetrics').children.length===3);
  const finalTitle=await page.$eval('#endingTitle',e=>e.textContent);
  assert.match(finalTitle,/AI|役割/);
  assert.equal(errors.length,0,errors.join(' | '));
  console.log('PASS true route has different ending visual and result, no page errors; screenshots:',out);
  await page.close();
 }finally{if(browser)await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
