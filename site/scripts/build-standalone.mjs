/** Generate the offline solo exhibition page from the same tested public assets. */
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const site=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const parent=path.resolve(site,'..');
let html=await readFile(path.join(site,'public/index.html'),'utf8');
const css=await readFile(path.join(site,'public/style.css'),'utf8');
html=html.replace('<link rel="stylesheet" href="/style.css">',`<style>${css}</style>`);
for(const name of ['city-art.js','engine.js','conference.js','reflection-report.js','decision-ux.js','group-accountability.js','ending-card.js','app.js']){
 const body=await readFile(path.join(site,'public',name),'utf8');
 if(body.includes('</script>'))throw Error(`${name} cannot be safely inlined`);
 const tag=`<script src="/${name}"></script>`;
 if(!html.includes(tag))throw Error(`Missing ${tag}`);
 html=html.replace(tag,`<script>\n${body}\n</script>`);
}
if(html.includes('<script src=')||html.includes('<link rel="stylesheet"'))throw Error('Unexpected external asset');
const target=path.join(parent,'standalone','それ、誰が決めた？_街が動く版.html');
await writeFile(target,html);
console.log('Offline solo HTML synchronized with site/public.');
