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

test('happiness HUD and four direct choices have no per-indicator delta markup',()=>{
 assert.match(html,/data-stat="happiness"/);assert.doesNotMatch(html,/data-stat="prosperity"|data-stat="convenience"|data-stat="appeal"|impact-chip|humanImpact|aiImpact/);
 const app=fs.readFileSync(path.join(root,'public/app.js'),'utf8');assert.match(app,/button\.dataset\.vote=option\.id/);assert.doesNotMatch(app,/impactPreview|aiImpact|humanImpact|data-strategy/);assert.match(html,/id="shadowSpotlight"[^>]*hidden/);
});

test('waterfront topic uses the common four-action responsive decision grid',()=>{
 assert.match(css,/\.decision-options/);assert.match(css,/\.decision\{min-height:64px/);assert.match(css,/@media\(max-width:750px\)/);assert.match(html,/id="decisionOptions"/);assert.doesNotMatch(html,/cancelStrategy|strategyChoice/);
});
