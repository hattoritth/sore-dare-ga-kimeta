import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
let puppeteer;
try{puppeteer=require('puppeteer-core')}catch{puppeteer=require(path.join(homedir(),'.local/share/desktop-commander-remote/node_modules/puppeteer'))}
import fs from 'node:fs';
import path from 'node:path';
const base=pathToFileURL(path.resolve(import.meta.dirname,'../../standalone/それ、誰が決めた？_街が動く版.html')).href+'?mode=solo';
const out=fs.mkdtempSync(path.join(process.env.TMPDIR||'/tmp','f5-v38-collapse-'));
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
  const page=await browser.newPage();
  await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.goto(base,{waitUntil:'load',timeout:30000});
  for(let i=0;i<4;i++){
    await page.waitForSelector('#decisionOptions [data-vote$="-ai"]',{visible:true,timeout:25000});
    const option=await page.$eval('#decisionOptions [data-vote$="-ai"]',e=>e.getAttribute('data-vote'));
    if(i===3){
      await page.evaluate(()=>{
       window.__citySamples=[];
       window.__cityTimer=setInterval(()=>{
        const c=document.querySelector('#townCanvas');if(!c)return;
        const ctx=c.getContext('2d'),N=5,pixels=[]; let zeros=0,dark=0;
        try {
          for(let y=0;y<N;y++)for(let x=0;x<N;x++){
           const d=ctx.getImageData(Math.floor(c.width*(x+.5)/N),Math.floor(c.height*(y+.5)/N),1,1).data;
           pixels.push([...d]); if(d[3]<30)zeros++;if(d[0]+d[1]+d[2]<35)dark++;
          }
        }catch(e){pixels.push([e.message])}
        const ending=document.querySelector('#endingCityPicture'),im=ending?.querySelector('img');
        window.__citySamples.push({t:performance.now(),phase:document.querySelector('#shell')?.dataset.stage,
          resultVisible:!document.querySelector('#resultPanel')?.hidden,beatVisible:!document.querySelector('#cityBeat')?.hidden,
          dims:[c.width,c.height],dark,zeros,center:pixels[12],image:im?{complete:im.complete,naturalWidth:im.naturalWidth}:null});
       },33);
      });
    }
    await page.tap('#decisionOptions [data-vote$="-ai"]');
    if(await page.$('#cityBeat:not([hidden])')){
      await page.waitForSelector('#cityBeatNext',{visible:true});
      await page.tap('#cityBeatNext');
    }
    if(i<3) await page.waitForFunction(prev=>{const a=document.querySelector('#decisionOptions [data-vote$="-ai"]');return a?.dataset.vote!==prev&&!!document.querySelector('#questionPanel:not([hidden])')},{timeout:25000},option);
  }
  await page.waitForSelector('#resultPanel',{visible:true,timeout:20000});
  await new Promise(resolve=>setTimeout(resolve,2500));
  const result=await page.evaluate(()=>{clearInterval(window.__cityTimer);const s=window.__citySamples||[];const pic=document.querySelector('#endingCityPicture');return {n:s.length,s,finalImg:pic?.outerHTML.slice(0,200),ending:document.querySelector('#shell')?.dataset.ending}});
  await page.screenshot({path:path.join(out,'ending.png')});
  const first=result.s.find(x=>x.resultVisible), after=result.s.filter(x=>x.resultVisible);
  const summary={n:result.n,ending:result.ending,first:first&&{t:first.t,dark:first.dark,zeros:first.zeros,image:first.image},last:after.at(-1)&&{t:after.at(-1).t,dark:after.at(-1).dark,zeros:after.at(-1).zeros,image:after.at(-1).image},darkFrames:after.filter(x=>x.dark>=20).length,alphaZeroFrames:after.filter(x=>x.zeros>=20).length,errors:errs};
  fs.writeFileSync(path.join(out,'samples.json'),JSON.stringify({summary,samples:result.s},null,2));
  assert.equal(summary.ending,'collapse','four AI-delegated decisions must produce collapse');
  assert.ok(summary.n>15,'enough samples were recorded');
  assert.ok(summary.darkFrames<=1 && summary.alphaZeroFrames<=1,
    'resize must not leave a blank canvas while results are visible: '+JSON.stringify(summary));
  assert.deepEqual(summary.errors,[],'no JS errors during ending transition');
  console.log('PASS V38_COLLAPSE_CANVAS_NO_FLASH',JSON.stringify(summary),out);
} finally {await browser.close()}
