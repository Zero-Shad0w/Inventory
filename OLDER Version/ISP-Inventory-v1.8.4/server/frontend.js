'use strict';
// Same-origin frontend gateway: forwards /api requests (including cookies and streamed uploads)
// to the private backend. Browsers never need to contact the backend port directly.
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {port,frontendPort}=require('./config');
const root=path.resolve(__dirname,'../public');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
const gateway=http.createServer((req,res)=>{
 let pathname;
 try{pathname=new URL(req.url,'http://localhost').pathname;}catch{return res.writeHead(400).end('Bad URL');}
 if(pathname.startsWith('/api/')){
  const headers={...req.headers,host:`127.0.0.1:${port}`};
  // Backend origin check uses Host. Browser origin points to frontend; map it to private backend.
  if(headers.origin){try{const origin=new URL(headers.origin);if(origin.hostname!=='127.0.0.1'&&origin.hostname!=='localhost'||Number(origin.port||80)!==frontendPort){res.writeHead(403).end('Origin rejected');return;}headers.origin=`http://127.0.0.1:${port}`;}catch{res.writeHead(403).end('Origin rejected');return;}}
  const upstream=http.request({hostname:'127.0.0.1',port,path:req.url,method:req.method,headers},up=>{res.writeHead(up.statusCode,up.headers);up.pipe(res)});
  upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Backend server is unavailable'}))});
  req.pipe(upstream);return;
 }
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end('Method not allowed');return;}
 const target=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(!target.startsWith(root+path.sep)){res.writeHead(403).end('Forbidden');return;}
 fs.stat(target,(err,st)=>{if(err||!st.isFile()){res.writeHead(404).end('Not found');return;}
  res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});
  if(req.method==='HEAD')return res.end();fs.createReadStream(target).pipe(res);
 });
});
gateway.on('error',e=>{console.error('Frontend server error:',e.message);process.exitCode=1});
gateway.listen(frontendPort,'127.0.0.1',()=>console.log(`ISP Inventory frontend: http://127.0.0.1:${frontendPort} (API backend port ${port})`));
process.on('SIGINT',()=>gateway.close());
