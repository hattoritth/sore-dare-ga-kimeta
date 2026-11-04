'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const card=require('../public/ending-card.js');
const source=fs.readFileSync(path.join(root,'public/ending-card.js'),'utf8');
const css=fs.readFileSync(path.join(root,'public/style.css'),'utf8');
const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');

test('result-card rasterization uses CSP-approved data SVG and retains PNG canvas output',()=>{
 assert.match(source,/data:image\/svg\+xml;charset=utf-8,\$\{encodeURIComponent\(buildSvg\(context\)\)\}/);
 assert.doesNotMatch(source,/URL\.createObjectURL\(new Blob\(\[svg\]/);
 assert.match(source,/img\.onerror=\(\)=>reject\(new Error\('結果カードをPNG画像に変換できませんでした。'\)\)/);
 assert.match(source,/ctx\.drawImage\(img,0,0,canvas\.width,canvas\.height\)/);
 assert.match(source,/canvas\.toDataURL\('image\/png'\)/);
 const valid='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/wT8AAAAASUVORK5CYII=';
 const svg=card.buildSvg({kind:'stable',scene:'stable',sceneImage:valid,title:'<script>alert(1)</script>',description:'& < > " \'',values:[68,74,61,82,55,93]});
 assert.match(svg,/&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
 assert.match(svg,/href="data:image\/png;base64,/);
 assert.equal((svg.match(/class="metricvalue"/g)||[]).length,6);
 assert.match(svg,/class="axis"/);
 assert.doesNotMatch(card.buildSvg({sceneImage:'data:image/svg+xml,<svg onload=alert(1)>'}),/onload=alert/);
});

test('AI and human choices both retain three public impact chips without exposing shadow metrics early',()=>{
 assert.doesNotMatch(css,/\.decision\[data-vote=ai\][^{]*\.impact-row\s*\{\s*display:\s*none/);
 assert.match(css,/\.impact-row\{display:flex/);
 const app=fs.readFileSync(path.join(root,'public/app.js'),'utf8');
 assert.match(app,/aiImpact/);
 assert.match(app,/humanImpact/);
 assert.match(app,/strategyChoice'\)\.dataset\.site=e\.site/);
 assert.match(html,/id="shadowSpotlight"[^>]*hidden/);
 assert.match(app,/shadowSpotlight'\)\.hidden=endingFlowStage!==3/);
});

test('waterfront detail gets a shorter mobile city while preserving three 44px choices',()=>{
 assert.match(css,/\.shell\[data-view=solo\]:has\(#strategyChoice\[data-site=waterfront\]:not\(\[hidden\]\)\) \.skyline\{height:clamp\(160px,22dvh,210px\);min-height:0\}/);
 assert.match(css,/\.strategy-choice button\[data-strategy\]\{[^}]*min-height:48px/);
 assert.match(css,/\.strategy-choice #cancelStrategy\{min-height:44px\}/);
 assert.match(css,/@media\(max-width:360px\) and \(max-height:740px\)/);
 assert.match(html,/id="cancelStrategy" class="text-action"/);
 const qa=fs.readFileSync(path.join(__dirname,'..','scripts','qa-v20-public-ux.cjs'),'utf8');
 assert.match(qa,/\[390,375,320\]/);
 assert.match(qa,/bottom<=layout\.viewportHeight/);
 assert.match(qa,/scrollWidth/);
});
