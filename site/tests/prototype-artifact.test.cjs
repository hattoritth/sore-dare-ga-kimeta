const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('built artifact serves every prototype asset without creating shared participants',async()=>{
 const source=fs.readFileSync(path.join(__dirname,'../dist/server/index.js'));
 const worker=(await import('data:text/javascript;base64,'+source.toString('base64'))).default;
 for(const name of ['prototype-data.js','prototype-engine.js','prototype-ui.js','prototype.css']){
  const res=await worker.fetch(new Request('https://city.example/'+name),{});
  assert.equal(res.status,200,name);assert.ok((await res.text()).length>100);
  assert.match(res.headers.get('content-type'),name.endsWith('.css')?/text\/css/:/javascript/);
 }
 const page=await worker.fetch(new Request('https://city.example/?prototype=1'),{});assert.equal(page.status,200);assert.match(await page.text(),/prototype-ui\.js/);
});
