// Browser regression for the optional ending press conference and decision alignment.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
let puppeteer;
try{puppeteer=require(process.env.F5_PUPPETEER_MODULE||'puppeteer');}
catch{puppeteer=require(path.join(os.homedir(),'.local/share/desktop-commander-remote/node_modules/puppeteer'));}
const Engine=require('../engine.js'),root=path.join(__dirname,'..','public');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function revealState(){const game=Engine.createGame(1000,{autostart:true});while(game.phase==='active')Engine.advance(game,game.roundEndsAt+1);return Engine.publicState(game,'',Date.now());}
function assert(value,message){if(!value)throw Error(message);}
async function check(browser,size,baseUrl){
 const page=await browser.newPage();await page.setViewport({width:size[0],height:size[1],deviceScaleFactor:size[0]<600?2:1,isMobile:size[0]<600,hasTouch:size[0]<600});
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'no-preference'}]);
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.goto(baseUrl+'/?mode=group',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#cityTicker')?.textContent!=='この街の、次の決定。');
  await page.waitForFunction(()=>!document.querySelector('#resultPanel').hidden);
  assert(await page.$eval('#pressConference',el=>el.hidden),'conference must remain optional on initial results');
  assert(await page.$eval('#endingCardTools',el=>!el.hidden),'PDF and PNG save actions must appear first');
  assert(await page.$eval('#openEndingPress',el=>!el.hidden),'the optional conference entry must be available');
  await page.click('#openEndingPress');
  await page.waitForFunction(()=>!document.querySelector('#pressConference').hidden);
  const modal=await page.$eval('#pressConference',el=>({width:Math.round(el.getBoundingClientRect().width),height:Math.round(el.getBoundingClientRect().height)}));
  assert(modal.width===size[0]&&modal.height===size[1],`${size.join('x')} conference should fill the viewport: ${JSON.stringify(modal)}`);
  assert(await page.$eval('#pressModePanel',el=>!el.open),'AI comparison must be collapsed by default');
  const prompt=await page.$eval('#pressQuestion',el=>el.textContent);assert(prompt.length>10,'opening question missing');
  await page.click('#pressNext');
  await page.waitForFunction(()=>document.querySelector('#pressAnswer').textContent.length>0);
  await delay(350);
  await page.click('#pressNext');
  const revealed=await page.$eval('#pressAnswer',el=>({text:el.textContent,hidden:el.hidden}));
  assert(!revealed.hidden&&revealed.text.length>5,'click during typing did not reveal the current answer');
  const snapshot=revealed.text;
  await page.click('#pressNext');
  await page.waitForFunction(old=>document.querySelector('#pressAnswer').textContent!==old,{},snapshot);
  await page.waitForFunction(()=>document.querySelector('#pressAnswer').textContent.length>5);
  await page.click('#pressSkip');assert(await page.$eval('#pressConference',el=>el.hidden),'skip did not return to results');
  await page.click('#openEndingPress');assert(await page.$eval('#pressConference',el=>!el.hidden),'reopen did not show conference');
  assert((await page.$eval('#pressAnswer',el=>el.textContent))==='','reopen retained stale answer');
  await page.click('#pressNext');await page.waitForFunction(()=>document.querySelector('#pressAnswer').textContent.length>0);
  await page.click('#pressSkip');assert(await page.$eval('#pressConference',el=>el.hidden),'skip did not return to results');
  const hidden=await page.$eval('#pressAnswer',el=>({hidden:el.hidden,text:el.textContent}));assert(hidden.hidden,'closed answer remains exposed');
  assert(errors.length===0,`${size[0]}px browser errors: ${errors.join(' | ')}`);
  console.log('PASS',size.join('x'),JSON.stringify({optionalConference:true,question:prompt,skipReplayClose:true,errors}));
 }finally{await page.close();}
}
(async()=>{
 const state=revealState();
 const server=http.createServer((req,res)=>{
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405).end();return;}
  const pathname=new URL(req.url,'http://127.0.0.1').pathname;
  if(pathname==='/api/state'){res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify(state));return;}
  if(pathname==='/api/qr.svg'){res.writeHead(200,{'Content-Type':'image/svg+xml'}).end('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>');return;}
  const name=pathname==='/'?'index.html':decodeURIComponent(pathname.slice(1)),file=path.resolve(root,name);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
  const type=name.endsWith('.css')?'text/css':name.endsWith('.js')?'text/javascript':name.endsWith('.svg')?'image/svg+xml':name.endsWith('.html')?'text/html':'application/octet-stream';
  res.writeHead(200,{'Content-Type':type});fs.createReadStream(file).pipe(res);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await puppeteer.launch({headless:true,executablePath:process.env.F5_CHROME_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-dev-shm-usage']});
  const baseUrl='http://127.0.0.1:'+server.address().port;
  for(const size of [[320,700],[390,844],[1024,768],[1920,1080]])await check(browser,size,baseUrl);
  console.log('ALL_PRESS_CHOICE_BROWSER_QA_PASSED');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error('FAILED',error.stack||error);process.exitCode=1;});
