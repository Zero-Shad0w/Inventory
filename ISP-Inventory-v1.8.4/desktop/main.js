'use strict';
const {app,BrowserWindow,dialog,Menu,shell,ipcMain,safeStorage}=require('electron');
const {spawn}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path'),net=require('node:net'),http=require('node:http'),https=require('node:https');
let backend=null,mainWindow=null,connectionWindow=null,stopping=false,activeUrl='';
const appRoot=path.join(process.resourcesPath,'inventory-app');
const runtime=path.join(process.resourcesPath,'runtime','node.exe');
const dataDir=path.join(app.getPath('userData'),'data');
const appIcon=path.join(__dirname,'assets','company-icon.ico');
const configPath=path.join(app.getPath('userData'),'connection.json');
function loadConnection(){try{const o=JSON.parse(fs.readFileSync(configPath,'utf8'));return {mode:o.mode==='shared'&&o.url?'shared':'local',url:typeof o.url==='string'?o.url:'',localPort:validPort(o.localPort)};}catch{return {mode:'local',url:'',localPort:0};}}
function validPort(v){if(v==null||v===''||Number(v)===0)return 0;const n=Number(v);if(!Number.isInteger(n)||n<1024||n>65535)throw Error('Port must be between 1024 and 65535');return n;}
function validateConnection(input){
 if(!input||!['local','shared'].includes(input.mode))throw Error('Choose Local or Shared');
 if(input.mode==='local')return {mode:'local',url:'',localPort:validPort(input.localPort)};
 const raw=String(input.url||'').trim();let url;
 try{url=new URL(raw);}catch{throw Error('Enter a complete URL, for example http://192.168.1.20:3000');}
 if(url.username||url.password||url.search||url.hash||url.pathname!=='/')throw Error('Use only the server address and port, without a path or password');
 if(url.protocol!=='https:'&&url.protocol!=='http:')throw Error('Use an HTTP or HTTPS address');
 if(url.protocol==='http:'){
  const ip=url.hostname.split('.').map(Number);
  const privateIp=ip.length===4&&ip.every(n=>Number.isInteger(n)&&n>=0&&n<=255)&&(ip[0]===10||(ip[0]===172&&ip[1]>=16&&ip[1]<=31)||(ip[0]===192&&ip[1]===168)||(ip[0]===127));
  if(!privateIp)throw Error('Unencrypted HTTP is allowed only for private IPv4 LAN addresses. Use HTTPS for other hosts.');
 }
 return {mode:'shared',url:url.origin,localPort:validPort(input.localPort)};
}
function freePort(){return new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});}
function checkPort(port){return new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',e=>reject(Error('Port '+port+' is unavailable: '+e.message)));server.listen(port,'127.0.0.1',()=>server.close(resolve));});}
function getJson(url,cookie=''){return new Promise((resolve,reject)=>{const u=new URL(url);const transport=u.protocol==='https:'?https:http;const req=transport.get(url,{timeout:3500,headers:cookie?{Cookie:cookie}:{}},res=>{let chunks='';res.on('data',x=>chunks+=x.toString());res.on('end',()=>{try{resolve({status:res.statusCode,data:JSON.parse(chunks)})}catch{reject(Error('The server returned an invalid response'))}})});req.on('timeout',()=>req.destroy(Error('Connection timed out')));req.on('error',reject);});}
async function waitForBackend(port){for(let i=0;i<80;i++){if(stopping)throw Error('Shutting down');if(backend?.exitCode!==null)throw Error('Local inventory service stopped unexpectedly');try{if((await getJson(`http://127.0.0.1:${port}/api/status`)).status===200)return;}catch{}await new Promise(r=>setTimeout(r,200));}throw Error('Local service did not start');}
function stopBackend(){if(backend){try{backend.kill()}catch{}backend=null;}}
async function adminAuthenticated(){
 if(!mainWindow||mainWindow.isDestroyed())return false;
 const cookies=await mainWindow.webContents.session.cookies.get({url:activeUrl,name:'isp_session'});
 if(!cookies.length)return false;
 try{const r=await getJson(activeUrl+'/api/me','isp_session='+cookies[0].value);return r.status===200&&r.data.role==='Administrator';}catch{return false;}
}
function openConnectionWindow(){
 if(connectionWindow&&!connectionWindow.isDestroyed()){connectionWindow.focus();return;}
 connectionWindow=new BrowserWindow({parent:mainWindow,modal:true,width:610,height:560,minWidth:530,minHeight:500,autoHideMenuBar:true,title:'Database Connection Settings',icon:appIcon,backgroundColor:'#11141d',webPreferences:{preload:path.join(__dirname,'preload.js'),nodeIntegration:false,contextIsolation:true,sandbox:true}});
 connectionWindow.loadFile(path.join(__dirname,'connection.html'));
 connectionWindow.on('closed',()=>{connectionWindow=null});
}
ipcMain.handle('connection:get',async(event)=>{if(event.sender!==connectionWindow?.webContents||!await adminAuthenticated())throw Error('Administrator access required');return loadConnection();});
ipcMain.handle('connection:open',async(event)=>{if(event.sender!==mainWindow?.webContents||!await adminAuthenticated())throw Error('Administrator access required');openConnectionWindow();return true;});
ipcMain.handle('connection:test',async(event,input)=>{
 if(event.sender!==connectionWindow?.webContents||!await adminAuthenticated())throw Error('Administrator access required');
 const c=validateConnection(input);
 if(c.mode==='local'){if(c.localPort){if(activeUrl===`http://127.0.0.1:${c.localPort}`)return {ok:true,message:`Port ${c.localPort} is currently used by this application.`};await checkPort(c.localPort);return {ok:true,message:`Port ${c.localPort} is available.`};}return {ok:true,message:'Automatic local port selection enabled.'};}
 const r=await getJson(c.url+'/api/status');
 if(r.status!==200||typeof r.data.setup!=='boolean')throw Error('This address is not a compatible ISP Inventory server');
 return {ok:true,message:`Shared server online. Version: ${r.data.version||'unknown'}. ${r.data.setup?'Administrator setup is required on the host.':'Ready to sign in.'}`};
});
ipcMain.handle('connection:save',async(event,input)=>{
 if(event.sender!==connectionWindow?.webContents||!await adminAuthenticated())throw Error('Administrator access required');
 const c=validateConnection(input);
 if(c.mode==='shared'){const r=await getJson(c.url+'/api/status');if(r.status!==200||typeof r.data.setup!=='boolean')throw Error('Cannot connect to the shared ISP Inventory server');}
 fs.mkdirSync(path.dirname(configPath),{recursive:true});
 const tmp=configPath+'.tmp';fs.writeFileSync(tmp,JSON.stringify(c,null,2),{mode:0o600});fs.renameSync(tmp,configPath);
 dialog.showMessageBoxSync(connectionWindow,{type:'info',title:'Database mode saved',message:'The application will restart to switch database mode.',buttons:['OK']});
 app.relaunch();app.quit();return {ok:true};
});
// Credentials are encrypted with Electron safeStorage (Windows DPAPI) and scoped to the selected server.
const credentialsPath=path.join(app.getPath('userData'),'saved-login.json');
function credentialSender(event){if(event.sender!==mainWindow?.webContents||!activeUrl)throw Error('Login storage is available only in the main application window');}
ipcMain.handle('credentials:get',async event=>{
 credentialSender(event);
 if(!safeStorage.isEncryptionAvailable())return {supported:false};
 try{
  const record=JSON.parse(fs.readFileSync(credentialsPath,'utf8'));
  if(record.origin!==activeUrl)return {supported:true};
  const decrypted=safeStorage.decryptString(Buffer.from(record.encrypted,'base64'));
  const saved=JSON.parse(decrypted);
  return {supported:true,username:saved.username,password:saved.password};
 }catch{return {supported:true};}
});
ipcMain.handle('credentials:save',async(event,input)=>{
 credentialSender(event);
 if(!safeStorage.isEncryptionAvailable())throw Error('Secure password storage is unavailable on this computer');
 const username=String(input?.username||''),password=String(input?.password||'');
 if(!username||!password||username.length>100||password.length>1024)throw Error('Invalid saved credentials');
 const encrypted=safeStorage.encryptString(JSON.stringify({username,password})).toString('base64');
 fs.mkdirSync(path.dirname(credentialsPath),{recursive:true});
 const tmp=credentialsPath+'.tmp';
 fs.writeFileSync(tmp,JSON.stringify({origin:activeUrl,encrypted}),{mode:0o600});
 fs.renameSync(tmp,credentialsPath);
 return {ok:true};
});
ipcMain.handle('credentials:clear',async event=>{
 credentialSender(event);
 try{fs.rmSync(credentialsPath,{force:true})}catch{}
 return {ok:true};
});
async function start(){
 fs.mkdirSync(dataDir,{recursive:true});
 const connection=loadConnection();
 if(connection.mode==='shared'){
  const valid=validateConnection(connection);
  const r=await getJson(valid.url+'/api/status');
  if(r.status!==200||typeof r.data.setup!=='boolean')throw Error('Shared server did not respond as ISP Inventory');
  activeUrl=valid.url;
 }else{
  if(!fs.existsSync(runtime)||!fs.existsSync(path.join(appRoot,'server','index.js')))throw Error('Local runtime files missing. Reinstall ISP Inventory.');
  const port=connection.localPort||await freePort(),otherPort=await freePort();
  if(port===otherPort)throw Error('Port conflict; restart and try again');
  const env={...process.env,ISP_DATA_DIR:dataDir,ISP_SERVER_PORT:String(port),ISP_FRONTEND_PORT:String(otherPort)};
  delete env.ELECTRON_RUN_AS_NODE;
  backend=spawn(runtime,[path.join(appRoot,'server','index.js')],{cwd:appRoot,env,windowsHide:true,stdio:['ignore','pipe','pipe']});
  let errors='';backend.stderr.on('data',d=>{errors=(errors+d.toString()).slice(-4000)});backend.stdout.on('data',()=>{});
  try{await waitForBackend(port)}catch(e){throw Error(e.message+(errors?'\n'+errors:''));}
  activeUrl=`http://127.0.0.1:${port}`;
 }
 mainWindow=new BrowserWindow({width:1520,height:940,minWidth:900,minHeight:620,show:false,backgroundColor:'#101116',autoHideMenuBar:true,title:'ISP Inventory Management',icon:appIcon,webPreferences:{preload:path.join(__dirname,'preload.js'),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
 mainWindow.once('ready-to-show',()=>mainWindow.show());
 mainWindow.on('closed',()=>{mainWindow=null;app.quit()});
 mainWindow.webContents.setWindowOpenHandler(({url})=>{if(/^https:\/\//i.test(url))shell.openExternal(url);return {action:'deny'};});
 mainWindow.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith(activeUrl+'/'))event.preventDefault()});
 mainWindow.webContents.on('did-fail-load',(_e,code,desc)=>{if(code!==-3)dialog.showErrorBox('ISP Inventory','Unable to load application: '+desc)});
 Menu.setApplicationMenu(null);
 await mainWindow.loadURL(activeUrl+'/');
}
if(!app.requestSingleInstanceLock()){app.quit();}else{
 app.on('second-instance',()=>{if(mainWindow){if(mainWindow.isMinimized())mainWindow.restore();mainWindow.focus()}});
 app.whenReady().then(()=>start().catch(e=>{
  const c=loadConnection();
  if(c.mode==='shared'){
   const choice=dialog.showMessageBoxSync({type:'warning',title:'Shared database unavailable',message:e.message,detail:'You can switch to your local database without changing or deleting the shared database.',buttons:['Retry','Switch to Local','Exit'],defaultId:0,cancelId:2});
   if(choice===1){fs.writeFileSync(configPath,JSON.stringify({mode:'local',url:'',localPort:c.localPort||0}));app.relaunch();app.quit();return;}
   if(choice===0){app.relaunch();app.quit();return;}
  }else dialog.showErrorBox('ISP Inventory failed to start',e.message);
  app.quit();
 }));
 app.on('before-quit',()=>{stopping=true;stopBackend()});
 app.on('window-all-closed',()=>app.quit());
}
