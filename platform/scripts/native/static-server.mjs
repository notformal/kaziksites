import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.env.STATIC_ROOT||'apps/lobby/dist');
const port=Number(process.env.STATIC_PORT||8080);
const host='127.0.0.1';
const role=process.env.STATIC_ROLE||'lobby';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.wav':'audio/wav','.mp3':'audio/mpeg','.woff2':'font/woff2'};
function resolveFile(url){const pathname=decodeURIComponent(new URL(url,'http://localhost').pathname),candidate=path.resolve(root,`.${pathname}`);if(candidate!==root&&!candidate.startsWith(`${root}${path.sep}`))return null;if(fs.existsSync(candidate)&&fs.statSync(candidate).isFile())return candidate;const index=path.join(candidate,'index.html');if(fs.existsSync(index))return index;return path.join(root,'index.html')}
const scriptPolicy=role==='games'?"'self' 'unsafe-inline' 'unsafe-eval'":"'self'";
const server=http.createServer((req,res)=>{if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'}).end();return}const file=resolveFile(req.url);if(!file||!fs.existsSync(file)){res.writeHead(404).end('Not found');return}const ext=path.extname(file).toLowerCase(),immutable=/[.-][a-f0-9]{8,}\./i.test(path.basename(file));res.writeHead(200,{'Content-Type':mime[ext]||'application/octet-stream','Cache-Control':immutable?'public, max-age=31536000, immutable':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Permissions-Policy':'camera=(), microphone=(), geolocation=(), payment=()','Content-Security-Policy':`default-src 'self'; script-src ${scriptPolicy}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' http://127.0.0.1:*; frame-src 'self' http://127.0.0.1:*; media-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'`});if(req.method==='HEAD'){res.end();return}fs.createReadStream(file).pipe(res)});
server.listen(port,host,()=>console.log(`Static origin ${root} on http://${host}:${port}`));
const stop=()=>server.close(()=>process.exit(0));process.on('SIGINT',stop);process.on('SIGTERM',stop);
