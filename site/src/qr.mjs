import QRCode from '../vendor/QRCode/index.js';
import Level from '../vendor/QRCode/QRErrorCorrectLevel.js';

export function svgForUrl(url) {
  const qr = new QRCode(-1, Level.M);
  qr.addData(url);
  qr.make();
  const count=qr.getModuleCount(), margin=4, side=count+margin*2;
  const path=[];
  for(let y=0;y<count;y++) for(let x=0;x<count;x++) if(qr.isDark(y,x)) path.push(`M${x+margin} ${y+margin}h1v1h-1z`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${side} ${side}" shape-rendering="crispEdges" role="img" aria-label="まちの続き 参加QR"><rect width="100%" height="100%" fill="white"/><path d="${path.join('')}" fill="#142e28"/></svg>`;
}
