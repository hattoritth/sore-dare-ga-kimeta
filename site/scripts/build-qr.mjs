import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {svgForUrl} from '../src/qr.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const url='https://machi-no-tsuzuki-20261031.tthkpba.chatgpt.site/';
await writeFile(path.join(root,'public/site-qr.svg'),svgForUrl(url));
console.log('Generated the static official-site QR.');
