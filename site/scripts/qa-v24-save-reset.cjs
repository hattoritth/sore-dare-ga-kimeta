// Full offline solo browser acceptance: actual 4 decisions, PDF download, and replay privacy.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {pathToFileURL}=require('node:url');
let puppeteer;try{puppeteer=require(process.env.F5_PUPPETEER_MODULE||'puppeteer')}catch{puppeteer=require(path.join(os.homedir(),'.local/share/desktop-commander-remote/node_modules/puppeteer'))}
const source=path.resolve(__dirname,'../../standalone/それ、誰が決めた？_街が動く版.html');
const out=fs.mkdtempSync(path.join(os.tmpdir(),'f5-v24-qa-'));
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
 const browser=await puppeteer.launch({headless:true,executablePath:process.env.F5_CHROME_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  const client=await page.target().createCDPSession();await client.send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:out});
  await page.goto(pathToFileURL(source).href+'?mode=solo',{waitUntil:'load'});
  await page.waitForFunction(()=>!document.querySelector('#questionPanel').hidden);
  for(let round=0;round<4;round++){
   const id=await page.$eval('#decisionOptions [data-vote]',b=>b.dataset.vote);
   assert.match(id,/^e\d-/);
   await page.click('#decisionOptions [data-vote]');
   await page.waitForFunction(previous=>{
    const btn=document.querySelector('#decisionOptions [data-vote]'),active=!document.querySelector('#questionPanel').hidden;
    return active&&btn&&btn.dataset.vote!==previous||!document.querySelector('#resultPanel').hidden;
   },{timeout:20000},id);
   console.log('PASS round',round+1,'option',id);
  }
  await page.waitForFunction(()=>!document.querySelector('#resultPanel').hidden);
  await page.click('#endingShowAll');
  await page.waitForFunction(()=>document.querySelector('#shadowMetrics').children.length===3);
  await page.click('#endingNext');
  await page.waitForFunction(()=>!document.querySelector('#endingCardTools').hidden&&document.querySelector('#endingCardPreview').children.length>0);
  const prior=await page.evaluate(()=>({
   shadow:document.querySelector('#shadowMetrics').textContent.trim(),
   spotlight:document.querySelector('#shadowSpotlightRows').textContent.trim(),
   preview:document.querySelector('#endingCardPreview').textContent.trim(),
  }));
  assert.ok(prior.shadow.length>20&&prior.preview.length>20,'six actual scores must be revealed');
  await page.click('#printEndingCard');
  await page.waitForFunction(()=>document.querySelector('#endingCardStatus').textContent.includes('PDFを保存しました。'),{timeout:15000});
  const pdfPath=path.join(out,'sore-dare-ga-kimeta-result.pdf');
  for(let i=0;i<40&&!fs.existsSync(pdfPath);i++)await sleep(200);
  assert.ok(fs.existsSync(pdfPath),'PDF file must download without opening a new tab');
  const pdf=fs.readFileSync(pdfPath),text=pdf.toString('latin1');
  assert.equal(text.slice(0,8),'%PDF-1.4');assert.ok(pdf.length>20000,'PDF should contain actual card raster');
  assert.match(text,/\/Count 1/);assert.match(text,/\/MediaBox \[0 0 841\.89 595\.28\]/);assert.match(text,/\/Subtype \/Image/);
  const pageCount=(text.match(/\/Type \/Page\b/g)||[]).length;assert.equal(pageCount,1);
  console.log('PASS PDF actual downloaded; A4 landscape, single page, bytes='+pdf.length+'; '+pdfPath);
  // Start a typewriter answer, replay while RAF is still pending, and check after a delay.
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'no-preference'}]);
  await page.click('#openEndingPress');
  await page.waitForFunction(()=>!document.querySelector('#pressConference').hidden);
  await page.click('#pressNext');
  await page.waitForFunction(()=>document.querySelector('#pressAnswer').textContent.length>0,{timeout:10000});
  assert.equal(await page.$eval('#pressAnswer',e=>e.hidden),false,'conference typing must be active before replay');
  await page.click('#replayButton');
  await page.waitForFunction(()=>!document.querySelector('#questionPanel').hidden&&document.querySelector('#resultPanel').hidden);
  await sleep(1400);
  assert.deepEqual(await page.$eval('#pressAnswer',e=>({text:e.textContent,hidden:e.hidden})),{text:'',hidden:true},'stale typewriter callback must not restore a prior answer after replay');
  console.log('PASS in-flight conference typewriter cancelled on replay; no hidden DOM resurrection after 1.4 seconds');
  const reset=await page.evaluate(()=>{
   const containers=['endingCityPicture','endingCardPreview','endingCardPrint','endingRadar','publicMetrics','shadowMetrics','groupAccountabilityList','shadowSpotlightRows','historyList'];
   const text=['endingProgress','endingTitle','endingText','endingKicker','endingIncident','pressQuestion','pressAnswer','endingCardStatus','reflectionStatus','decisionAccountability','resultNote'];
   const canvas=document.querySelector('#endingCardCanvas'),pix=canvas.getContext('2d').getImageData(800,550,1,1).data;
   return {containers:containers.filter(id=>document.getElementById(id).childNodes.length),text:text.filter(id=>document.getElementById(id).textContent.length),pixelAlpha:pix[3],happiness:document.querySelector('[data-stat="happiness"] strong').textContent};
  });
  assert.deepEqual(reset.containers,[]);assert.deepEqual(reset.text,[]);assert.equal(reset.pixelAlpha,0);assert.equal(reset.happiness,'71');
  assert.equal(errors.length,0,'no browser page errors: '+errors.join('; '));
  console.log('PASS replay: all previous six scores, hidden DOM, and canvas pixels cleared; only happiness=71 remains');
  console.log('PASS full browser QA; output: '+out);
  await page.close();
 }finally{await browser.close();}
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
