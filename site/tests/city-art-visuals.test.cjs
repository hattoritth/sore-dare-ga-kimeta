const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

test('dynamic city drawing omits legacy agent walkers and retains residents and city traffic',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../public/city-art.js'),'utf8');
 const start=source.indexOf('  dynamicEntities(){');
 const end=source.indexOf('  render(dt=0){',start);
 assert.ok(start>=0&&end>start,'dynamicEntities method exists');
 const method=source.slice(start,end);
 assert.doesNotMatch(method,/drawAgent|AGENTS\.forEach/);
 for(const drawing of ['this.person(p.x,p.y,k)','this.car(p.x,p.y,p.dir,k)','this.trainCoach(i,j,train.reverse,k,k===0)','this.entrancePosition()','this.addSiteObjects(site,add)']){
  assert.ok(method.includes(drawing),`retains ${drawing}`);
 }
 assert.match(source,/root\.F5City\.AGENTS/,'legacy simulation actors remain available to engine compatibility');
});
