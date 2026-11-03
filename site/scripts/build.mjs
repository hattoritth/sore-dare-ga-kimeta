import { readFile, readdir, mkdir, rm, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const read = (p) => readFile(path.join(root, p), 'utf8');
await copyFile(path.join(root, 'engine.js'), path.join(root, 'public/engine.js'));
const files = ['index.html', 'style.css', 'app.js', 'city-art.js', 'engine.js', 'conference.js', 'reflection-report.js', 'decision-ux.js', 'group-accountability.js', 'ending-card.js'];
const assets = Object.fromEntries(await Promise.all(files.map(async (name) => [name, await read(`public/${name}`)])));
const modules = {};
for (const name of (await readdir(path.join(root, 'vendor/QRCode'))).filter((x) => x.endsWith('.js'))) modules[`./${name.slice(0, -3)}`] = await read(`vendor/QRCode/${name}`);
const definitions = Object.entries(modules).map(([key, source]) => `${JSON.stringify(key)}:function(module,exports,require){\n${source}\n}`).join(',\n');
let qr = (await read('src/qr.mjs')).replace(/^import .*?;\s*$/gm, '').replace('export function svgForUrl', 'function svgForUrl');
let worker = (await read('src/worker.mjs')).replace(/^import .*?;\s*$/gm, '').replace('return env.ASSETS.fetch(req);', 'return serveAsset(req);');
const csp = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'";
const prelude = `const assets=${JSON.stringify(assets)};\nfunction serveAsset(req){const p=new URL(req.url).pathname;const name=p==='/'?'index.html':p.slice(1);if(!Object.prototype.hasOwnProperty.call(assets,name))return new Response('Not found',{status:404});const type=name.endsWith('.html')?'text/html':name.endsWith('.css')?'text/css':'text/javascript';return new Response(assets[name],{headers:{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':${JSON.stringify(csp)}}})}\n`;
const loader = `const qrModules={${definitions}};const qrCache={};function qrRequire(id){if(qrCache[id])return qrCache[id].exports;if(!qrModules[id])throw Error('Unknown QR module');const module={exports:{}};qrCache[id]=module;qrModules[id](module,module.exports,qrRequire);return module.exports}const QRCode=qrRequire('./index');const Level=qrRequire('./QRErrorCorrectLevel');\n`;
await rm(path.join(root, 'dist'), {recursive:true, force:true});
await mkdir(path.join(root, 'dist/server'), {recursive:true});
await mkdir(path.join(root, 'dist/.openai'), {recursive:true});
await writeFile(path.join(root, 'dist/server/index.js'), `${prelude}\n${await read('public/engine.js')}\n${loader}\n${qr}\n${worker}`);
// A company-side local build must not depend on a personal Sites project binding.
try {
  await copyFile(path.join(root, '.openai/hosting.json'), path.join(root, 'dist/.openai/hosting.json'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  await writeFile(path.join(root, 'dist/.openai/hosting.json'), JSON.stringify({
    d1: [], r2: [],
    note: 'Local validation only. No deployment is configured.'
  }, null, 2));
}
console.log('Built dependency-free Worker artifact.');
