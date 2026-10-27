'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {openDb}=require('./db'),{move}=require('./ledger'),{port,dataDir}=require('./config');
fs.mkdirSync(dataDir,{recursive:true});
const pending=path.join(dataDir,'restore-pending.json');
if(fs.existsSync(pending)){
 const {DatabaseSync}=require('node:sqlite');const {name}=JSON.parse(fs.readFileSync(pending,'utf8'));
 if(!/^inventory-[0-9TZ-]+\.sqlite$/.test(name))throw Error('Invalid pending restore');
 const src=path.join(dataDir,'backups',name),target=path.join(dataDir,'inventory.sqlite');
 if(!fs.existsSync(src))throw Error('Restore snapshot missing');
 if(fs.existsSync(target)){
  const current=new DatabaseSync(target);current.exec('PRAGMA wal_checkpoint(TRUNCATE)');current.close();
  const safety=path.join(dataDir,'backups','pre-restore-'+Date.now()+'.sqlite');fs.copyFileSync(target,safety);
  const evidence=path.join(dataDir,'signoff-evidence');if(fs.existsSync(evidence))fs.cpSync(evidence,safety+'.files',{recursive:true});const images=path.join(dataDir,'material-images');if(fs.existsSync(images))fs.cpSync(images,safety+'.images',{recursive:true});const brand=path.join(dataDir,'brand-assets');if(fs.existsSync(brand))fs.cpSync(brand,safety+'.brand',{recursive:true});const avatars=path.join(dataDir,'user-avatars');if(fs.existsSync(avatars))fs.cpSync(avatars,safety+'.avatars',{recursive:true});
 }
 fs.copyFileSync(src,target);
 const backupFiles=src+'.files',liveFiles=path.join(dataDir,'signoff-evidence');
 if(fs.existsSync(backupFiles)&&fs.existsSync(liveFiles))fs.rmSync(liveFiles,{recursive:true,force:true});
 if(fs.existsSync(backupFiles))fs.cpSync(backupFiles,liveFiles,{recursive:true});const liveImages=path.join(dataDir,'material-images');if(fs.existsSync(src+'.images')&&fs.existsSync(liveImages))fs.rmSync(liveImages,{recursive:true,force:true});if(fs.existsSync(src+'.images'))fs.cpSync(src+'.images',liveImages,{recursive:true});const liveBrand=path.join(dataDir,'brand-assets');if(fs.existsSync(src+'.brand')&&fs.existsSync(liveBrand))fs.rmSync(liveBrand,{recursive:true,force:true});if(fs.existsSync(src+'.brand'))fs.cpSync(src+'.brand',liveBrand,{recursive:true});const liveAvatars=path.join(dataDir,'user-avatars');if(fs.existsSync(src+'.avatars')&&fs.existsSync(liveAvatars))fs.rmSync(liveAvatars,{recursive:true,force:true});if(fs.existsSync(src+'.avatars'))fs.cpSync(src+'.avatars',liveAvatars,{recursive:true});
 fs.rmSync(pending);console.log('Restore applied from',name);
}
const db=openDb(dataDir),root=path.resolve(__dirname,'../public'),cookieName='isp_session';
const roles=['Administrator','Warehouse Manager','Warehouse Operator','Field Team Leader','Viewer / Auditor'];
const schemas={categories:['name','parent_id'],warehouses:['name','kind'],teams:['name','leader','phone','active'],suppliers:['name','contact','phone','email'],work_orders:['reference','name','team_id','status','notes'],devices:['material_id','serial','mac','status','location','customer_ref','notes'],returns:['device_id','material_id','serial','mac','customer_ref','reason','condition','status','team_id','notes'],repairs:['return_id','provider','status','cost','notes'],stocktakes:['location','status','notes']};
const can=(u,action)=>u&& (u.role==='Administrator'||({read:roles,write:['Warehouse Manager','Warehouse Operator'],approve:['Warehouse Manager'],team:['Warehouse Manager','Warehouse Operator','Field Team Leader'],backup:[]}[action]||[]).includes(u.role));
const hash=(s)=>crypto.createHash('sha256').update(s).digest('hex');
const pw=(s,salt)=>crypto.scryptSync(s,salt,64).toString('hex');
const reply=(res,status,obj,extra={})=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra});res.end(JSON.stringify(obj));};
async function parse(req){let chunks=[],n=0;for await(const c of req){n+=c.length;if(n>1024*1024)throw Error('Request too large');chunks.push(c);}return JSON.parse(Buffer.concat(chunks).toString()||'{}');}
const getUser=req=>{let t=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='));if(!t)return null;const row=db.prepare('SELECT u.id,u.username,u.role,u.team_id FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1').get(hash(t.split('=').slice(1).join('=')),Date.now());return row||null;};
const audit=(u,action,details={})=>db.prepare('INSERT INTO audit(user_id,action,details) VALUES(?,?,?)').run(u?.id||null,action,JSON.stringify(details));
function transaction(fn){db.exec('BEGIN IMMEDIATE');try{const r=fn();db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}}
function requireRole(u,action){if(!can(u,action))throw Object.assign(Error('Permission denied'),{status:403});}
function safeTable(name){if(!schemas[name])throw Error('Unknown module');return name;}
function insert(table,b){const keys=schemas[table].filter(k=>b[k]!==undefined&&b[k]!==''),vals=keys.map(k=>b[k]);if(!keys.length)throw Error('No fields supplied');const q=`INSERT INTO ${table}(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`;return Number(db.prepare(q).run(...vals).lastInsertRowid);}
function update(table,id,b){const keys=schemas[table].filter(k=>b[k]!==undefined),vals=keys.map(k=>b[k]);if(!keys.length)throw Error('No fields supplied');db.prepare(`UPDATE ${table} SET ${keys.map(k=>k+'=?').join(',')} WHERE id=?`).run(...vals,id);}
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost'),p=url.pathname;const origin=req.headers.origin;if(origin&&new URL(origin).host!==req.headers.host)throw Object.assign(Error('Origin rejected'),{status:403});
if(p.startsWith('/api/')){
const b=['POST','PUT','PATCH'].includes(req.method)&&!/^\/api\/signoffs\/\d+\/upload$/.test(p)&&!/^\/api\/materials\/\d+\/image$/.test(p)&&p!=='/api/logo/upload'&&p!=='/api/backups/upload'&&!/^\/api\/users\/\d+\/avatar$/.test(p)?await parse(req):{},u=getUser(req),setup=db.prepare('SELECT COUNT(*) n FROM users').get().n===0;
if(p==='/api/status'&&req.method==='GET')return reply(res,200,{setup,version:'1.8.4'});
if(p==='/api/setup'&&req.method==='POST'){if(!setup)throw Error('Setup already complete');if(!b.username||String(b.password||'').length<12)throw Error('Username and password of at least 12 characters required');const salt=crypto.randomBytes(16).toString('hex');db.prepare('INSERT INTO users(username,password_hash,salt,role) VALUES(?,?,?,?)').run(b.username,pw(b.password,salt),salt,'Administrator');return reply(res,201,{ok:true});}
if(p==='/api/login'&&req.method==='POST'){const x=db.prepare('SELECT * FROM users WHERE username=? AND active=1').get(b.username);if(!x||!crypto.timingSafeEqual(Buffer.from(pw(String(b.password||''),x.salt),'hex'),Buffer.from(x.password_hash,'hex')))return reply(res,401,{error:'Incorrect username or password. Check that you are connected to the correct local or shared database.'});if(x.role==='Viewer / Auditor'&&!x.team_id)return reply(res,403,{error:'This viewer account has no team assigned. Ask an administrator to assign a team.'});const t=crypto.randomBytes(32).toString('hex');db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash(t),x.id,Date.now()+8*3600000);audit(x,'login');return reply(res,200,{username:x.username,role:x.role},{'Set-Cookie':`${cookieName}=${t}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`});}
if(p==='/api/logout'&&req.method==='POST'){const t=(req.headers.cookie||'').match(/isp_session=([^;]+)/);if(t)db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(t[1]));return reply(res,200,{ok:true},{'Set-Cookie':`${cookieName}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`});}
if(!u)return reply(res,401,{error:'Login required'});
if(p==='/api/me')return reply(res,200,{...u,avatar_path:db.prepare('SELECT avatar_path FROM users WHERE id=?').get(u.id)?.avatar_path||null});
if(u.role==='Viewer / Auditor'&&!u.team_id)throw Object.assign(Error('Viewer account must be linked to a team by an administrator'),{status:403});
// Read-only team-linked users: all viewing is scoped to their own team's holdings.
const teamViewer=u.role==='Viewer / Auditor'&&u.team_id!=null;
if(teamViewer&&!(/^\/api\/users\/\d+\/avatar$/.test(p)||/^\/api\/materials\/\d+\/image$/.test(p)||['/api/me','/api/dashboard','/api/materials','/api/balances','/api/movements','/api/signoffs'].includes(p)||/^\/api\/signoffs\/\d+(?:\/evidence)?$/.test(p)))throw Object.assign(Error('Team viewers have read-only access to their team'),{status:403});
if(teamViewer&&req.method!=='GET'&&!(req.method==='POST'&&p==='/api/users/'+u.id+'/avatar'))throw Object.assign(Error('Read-only team account'),{status:403});

if(p==='/api/dashboard'){
 requireRole(u,'read');
 const team=teamViewer?db.prepare('SELECT name FROM teams WHERE id=?').get(u.team_id)?.name:null;
 const location=teamViewer?'Team: '+team:null;
 const materials=db.prepare(`SELECT m.id,m.sku,m.name,m.category,m.unit,m.min_stock,m.image_path,
 COALESCE((SELECT SUM(b.qty) FROM balances b WHERE b.material_id=m.id ),0) total
 FROM materials m WHERE m.active=1 ORDER BY m.name`).all();
 const stockRows=teamViewer?db.prepare('SELECT material_id,qty,location FROM balances WHERE location=?').all(location):db.prepare('SELECT material_id,qty,location FROM balances').all();
 const qtyByMaterial=new Map();
 for(const row of stockRows)qtyByMaterial.set(row.material_id,(qtyByMaterial.get(row.material_id)||0)+Number(row.qty));
 const visibleMaterials=teamViewer?materials.filter(m=>qtyByMaterial.has(m.id)):materials;
 const inventory=visibleMaterials.map(m=>({...m,total:qtyByMaterial.get(m.id)||0}));
 const lowItems=inventory.filter(m=>Number(m.min_stock)>0&&m.total<Number(m.min_stock)).map(m=>({...m,shortage:Number(m.min_stock)-m.total}));
 const teamNames=teamViewer?[team]:db.prepare('SELECT name FROM teams WHERE active=1 ORDER BY name').all().map(t=>t.name);
 const teamStock=teamNames.map(name=>{const location='Team: '+name,rows=stockRows.filter(b=>b.location===location&&Number(b.qty)>0);
 return {name,materialTypes:new Set(rows.map(r=>r.material_id)).size,lines:rows.length,materials:rows.map(r=>{const m=inventory.find(m=>m.id===r.material_id);return {sku:m?.sku||'',name:m?.name||'',qty:r.qty,unit:m?.unit||''};}).filter(m=>m.sku)};});
 const recent=teamViewer?db.prepare('SELECT x.id,x.src,x.dst,x.qty,x.note,x.created_at,m.sku,m.name FROM movements x JOIN materials m ON m.id=x.material_id WHERE x.src=? OR x.dst=? ORDER BY x.id DESC LIMIT 12').all(location,location):db.prepare('SELECT x.id,x.src,x.dst,x.qty,x.note,x.created_at,m.sku,m.name FROM movements x JOIN materials m ON m.id=x.material_id ORDER BY x.id DESC LIMIT 12').all();
 const count=t=>db.prepare(`SELECT COUNT(*) n FROM ${t}`).get().n;
 const categories=Object.entries(inventory.reduce((a,m)=>{const key=m.category||'Uncategorized';a[key]=(a[key]||0)+1;return a},{})).map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count);
 const warehouses=teamViewer?[]:db.prepare("SELECT name FROM warehouses WHERE kind='warehouse' ORDER BY name").all().map(w=>({name:w.name,qty:stockRows.filter(r=>r.location===w.name).reduce((a,r)=>a+Number(r.qty),0)}));
 return reply(res,200,{categories,warehouses,warehouseCount:warehouses.length,materials:inventory.length,teams:teamNames.length,devices:teamViewer?0:count('devices'),returns:teamViewer?0:count('returns'),
 totalStock:stockRows.reduce((n,r)=>n+Number(r.qty),0),lowStock:lowItems.length,lowItems,inventory:inventory.map(m=>({id:m.id,sku:m.sku,name:m.name,category:m.category,unit:m.unit,total:m.total,min_stock:m.min_stock})),teamStock,movements:recent});
}
if(p==='/api/supplier-receipts'&&req.method==='GET'){requireRole(u,'read');return reply(res,200,db.prepare(`SELECT r.id,r.document_number,r.document_date,r.warehouse,r.notes,r.created_at,s.name AS supplier,COUNT(l.id) AS items,COALESCE(SUM(l.quantity),0) AS total_units FROM supplier_receipts r JOIN suppliers s ON s.id=r.supplier_id LEFT JOIN supplier_receipt_lines l ON l.receipt_id=r.id GROUP BY r.id ORDER BY r.id DESC LIMIT 250`).all());}
if(/^\/api\/supplier-receipts\/\d+$/.test(p)&&req.method==='GET'){requireRole(u,'read');const id=Number(p.split('/').pop());const receipt=db.prepare('SELECT r.*,s.name supplier FROM supplier_receipts r JOIN suppliers s ON s.id=r.supplier_id WHERE r.id=?').get(id);if(!receipt)return reply(res,404,{error:'Receipt not found'});return reply(res,200,{...receipt,lines:db.prepare('SELECT l.*,m.sku,m.name,m.unit FROM supplier_receipt_lines l JOIN materials m ON m.id=l.material_id WHERE receipt_id=?').all(id)});}
if(p==='/api/supplier-receipts'&&req.method==='POST'){requireRole(u,'write');const supplierId=Number(b.supplier_id),document=String(b.document_number||'').trim(),date=String(b.document_date||''),warehouse=String(b.warehouse||'').trim(),notes=String(b.notes||'').trim();if(!db.prepare('SELECT id FROM suppliers WHERE id=?').get(supplierId))throw Error('Choose a valid supplier');if(!document||document.length>120)throw Error('Bill / document number is required (max 120 characters)');if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date)))throw Error('Valid document date is required');if(!warehouse||warehouse.length>120||!db.prepare("SELECT 1 FROM warehouses WHERE name=? AND kind='warehouse'").get(warehouse))throw Error('Select a valid destination warehouse');if(!Array.isArray(b.lines)||!b.lines.length||b.lines.length>100)throw Error('Add between 1 and 100 materials');const lines=b.lines.map(x=>({material_id:Number(x.material_id),quantity:Number(x.quantity)}));if(lines.some(x=>!Number.isInteger(x.material_id)||!Number.isFinite(x.quantity)||x.quantity<=0||x.quantity>1e9||Math.round(x.quantity*1e6)!==x.quantity*1e6))throw Error('Invalid material or quantity (maximum 6 decimal places)');for(const x of lines)if(!db.prepare('SELECT id FROM materials WHERE id=? AND active=1').get(x.material_id))throw Error('Material not found or inactive: '+x.material_id);
const id=transaction(()=>{const r=db.prepare('INSERT INTO supplier_receipts(supplier_id,document_number,document_date,warehouse,notes,created_by) VALUES(?,?,?,?,?,?)').run(supplierId,document,date,warehouse,notes,u.id);const rid=Number(r.lastInsertRowid);for(const x of lines){db.prepare('INSERT INTO balances(material_id,location,qty) VALUES(?,?,?) ON CONFLICT(material_id,location) DO UPDATE SET qty=ROUND(qty+excluded.qty,6)').run(x.material_id,warehouse,x.quantity);const mv=db.prepare('INSERT INTO movements(material_id,src,dst,qty,note) VALUES(?,?,?,?,?)').run(x.material_id,null,warehouse,x.quantity,`Supplier receipt #${rid} | Document ${document} | ${notes}`.slice(0,500));db.prepare('INSERT INTO supplier_receipt_lines(receipt_id,material_id,quantity,movement_id) VALUES(?,?,?,?)').run(rid,x.material_id,x.quantity,Number(mv.lastInsertRowid));}audit(u,'supplier.receipt.created',{id:rid,supplier_id:supplierId,document_number:document,lines:lines.length});return rid;});return reply(res,201,{id});}

if(p==='/api/signoffs'&&req.method==='GET'){requireRole(u,'read');return reply(res,200,db.prepare(`SELECT s.id,s.document_number,s.work_reference,s.notes,s.status,s.evidence_filename,s.created_at,s.reviewed_at,t.name team FROM technical_signoffs s JOIN teams t ON t.id=s.team_id WHERE (? IS NULL OR s.team_id=?) ORDER BY s.id DESC`).all((u.role==='Field Team Leader'||teamViewer)?u.team_id:null,u.team_id));}
if(/^\/api\/signoffs\/\d+$/.test(p)&&req.method==='GET'){requireRole(u,'read');const id=Number(p.split('/').pop()),r=db.prepare('SELECT * FROM technical_signoffs WHERE id=?').get(id);if(!r)return reply(res,404,{error:'Not found'});if((u.role==='Field Team Leader'||teamViewer)&&r.team_id!==u.team_id)return reply(res,403,{error:'Permission denied'});return reply(res,200,{...r,evidence_data:undefined,lines:db.prepare('SELECT l.qty,l.movement_id,l.source_location,m.sku,m.name,m.unit FROM technical_signoff_lines l JOIN materials m ON m.id=l.material_id WHERE signoff_id=?').all(id)});}
if(/^\/api\/signoffs\/\d+\/evidence$/.test(p)&&req.method==='GET'){requireRole(u,'read');const id=Number(p.split('/')[3]),r=db.prepare('SELECT * FROM technical_signoffs WHERE id=?').get(id);if(!r||(!r.evidence_data&&!r.evidence_path))return reply(res,404,{error:'Evidence not found'});if((u.role==='Field Team Leader'||teamViewer)&&r.team_id!==u.team_id)return reply(res,403,{error:'Permission denied'});if(r.evidence_path){const file=path.join(dataDir,'signoff-evidence',r.evidence_path);if(!fs.existsSync(file))return reply(res,404,{error:'Evidence missing'});res.writeHead(200,{'Content-Type':r.evidence_mime,'Content-Disposition':`attachment; filename=\"${r.evidence_filename.replace(/[^a-zA-Z0-9._-]/g,'_')}\"`,'X-Content-Type-Options':'nosniff'});return fs.createReadStream(file).pipe(res);}const bytes=Buffer.from(r.evidence_data,'base64');res.writeHead(200,{'Content-Type':r.evidence_mime,'Content-Disposition':`attachment; filename="${r.evidence_filename.replace(/[^a-zA-Z0-9._-]/g,'_')}"`,'X-Content-Type-Options':'nosniff'});return res.end(bytes);}

if(/^\/api\/signoffs\/\d+\/upload$/.test(p)&&req.method==='POST'){
 requireRole(u,'team');const id=Number(p.split('/')[3]);const r=db.prepare('SELECT * FROM technical_signoffs WHERE id=?').get(id);
 if(!r||r.status!=='Pending')return reply(res,409,{error:'Sign-off missing or already reviewed'});
 if(u.role==='Field Team Leader'&&r.team_id!==u.team_id)throw Object.assign(Error('Not your team'),{status:403});
 if(u.role==='Field Team Leader'&&r.created_by!==u.id)throw Object.assign(Error('Only the creator can upload evidence'),{status:403});
 const mime=String(req.headers['content-type']||'').split(';')[0];if(!['application/pdf','image/jpeg','image/png'].includes(mime))throw Error('Only PDF, JPG, PNG accepted');
 const filename=decodeURIComponent(String(req.headers['x-filename']||'document')).slice(0,180);
 const dir=path.join(dataDir,'signoff-evidence');fs.mkdirSync(dir,{recursive:true});const key=crypto.randomBytes(20).toString('hex'),dest=path.join(dir,key);
 const output=fs.createWriteStream(dest,{flags:'wx',mode:0o600});
 try{await new Promise((resolve,reject)=>{req.on('error',reject);output.on('error',reject);output.on('finish',resolve);req.pipe(output)});
 const fd=fs.openSync(dest,'r');const head=Buffer.alloc(8);fs.readSync(fd,head,0,8,0);fs.closeSync(fd);
 const valid=mime==='application/pdf'?head.subarray(0,5).toString()==='%PDF-':mime==='image/jpeg'?head.subarray(0,3).equals(Buffer.from('ffd8ff','hex')):head.equals(Buffer.from('89504e470d0a1a0a','hex'));
 if(!valid)throw Error('Invalid document content');
 db.prepare('UPDATE technical_signoffs SET evidence_filename=?,evidence_mime=?,evidence_path=?,evidence_data=NULL WHERE id=?').run(filename,mime,key,id);
 if(r.evidence_path)fs.rmSync(path.join(dir,r.evidence_path),{force:true});audit(u,'signoff.evidence.uploaded',{id,filename});return reply(res,200,{ok:true});
 }catch(e){fs.rmSync(dest,{force:true});throw e;}
}
if(p==='/api/signoffs'&&req.method==='POST'){requireRole(u,'team');const teamId=Number(b.team_id),doc=String(b.document_number||'').trim(),ref=String(b.work_reference||'').trim(),notes=String(b.notes||'').trim();if(u.role==='Field Team Leader'&&u.team_id!==teamId)throw Object.assign(Error('Not your team'),{status:403});if(!db.prepare('SELECT id FROM teams WHERE id=? AND active=1').get(teamId))throw Error('Select active team');if(!doc||doc.length>120||ref.length>120||notes.length>1000)throw Error('Invalid document number or notes');if(!Array.isArray(b.lines)||!b.lines.length||b.lines.length>100)throw Error('Select 1 to 100 materials');const lines=b.lines.map(x=>({sku:String(x.sku||'').trim(),qty:Number(x.qty),source_location:String(x.source_location||'').trim()}));if(lines.some(x=>!x.sku||!x.source_location||!Number.isFinite(x.qty)||x.qty<=0||Math.abs(x.qty*1e6-Math.round(x.qty*1e6))>0.0001)||new Set(lines.map(x=>x.sku.toLowerCase()+'|'+x.source_location)).size!==lines.length)throw Error('Invalid or duplicate SKU / quantity');for(const l of lines){const team=db.prepare('SELECT name FROM teams WHERE id=?').get(teamId);if(l.source_location!=='Team: '+team.name){if(u.role==='Field Team Leader')throw Object.assign(Error('Team leaders cannot deduct warehouse stock'),{status:403});if(!db.prepare("SELECT name FROM warehouses WHERE name=? AND kind='warehouse'").get(l.source_location))throw Error('Invalid warehouse source: '+l.source_location);}}let ev=null;if(b.evidence){const name=String(b.evidence.name||''),mime=String(b.evidence.mime||''),data=String(b.evidence.data||'');if(!['image/png','image/jpeg','application/pdf'].includes(mime)||name.length>150||data.length>700000||!/^[A-Za-z0-9+/]+={0,2}$/.test(data))throw Error('Only JPG, PNG or PDF, max 500 KB');const bytes=Buffer.from(data,'base64');if(bytes.length>500000||!(mime==='image/png'?bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')):mime==='image/jpeg'?bytes.subarray(0,3).equals(Buffer.from('ffd8ff','hex')):bytes.subarray(0,5).toString()==='%PDF-'))throw Error('Invalid attachment');ev={name,mime,data};}
const id=transaction(()=>{const id=Number(db.prepare('INSERT INTO technical_signoffs(document_number,team_id,work_reference,notes,evidence_filename,evidence_mime,evidence_data,created_by) VALUES(?,?,?,?,?,?,?,?)').run(doc,teamId,ref,notes,ev?.name||null,ev?.mime||null,ev?.data||null,u.id).lastInsertRowid);for(const l of lines){const m=db.prepare('SELECT id FROM materials WHERE sku=? COLLATE NOCASE AND active=1').get(l.sku);if(!m)throw Error('Unknown SKU: '+l.sku);db.prepare('INSERT INTO technical_signoff_lines(signoff_id,material_id,qty,source_location) VALUES(?,?,?,?)').run(id,m.id,l.qty,l.source_location);}audit(u,'signoff.submitted',{id,document:doc});return id;});return reply(res,201,{id,status:'Pending'});}
if(/^\/api\/signoffs\/\d+\/(approve|reject)$/.test(p)&&req.method==='POST'){requireRole(u,'approve');const id=Number(p.split('/')[3]),action=p.split('/')[4];const status=transaction(()=>{const r=db.prepare('SELECT s.*,t.name team FROM technical_signoffs s JOIN teams t ON t.id=s.team_id WHERE s.id=?').get(id);if(!r||r.status!=='Pending')throw Error('Sign-off already processed or not found');if(action==='approve'){const lines=db.prepare('SELECT l.*,m.sku FROM technical_signoff_lines l JOIN materials m ON m.id=l.material_id WHERE signoff_id=?').all(id);for(const l of lines){const source=l.source_location||'Team: '+r.team;const changed=db.prepare('UPDATE balances SET qty=ROUND(qty-?,6) WHERE material_id=? AND location=? AND qty>=?').run(l.qty,l.material_id,source,l.qty);if(changed.changes!==1)throw Error('Insufficient stock in '+source+' for '+l.sku+'; nothing deducted');const movement=Number(db.prepare('INSERT INTO movements(material_id,src,dst,qty,note) VALUES(?,?,?,?,?)').run(l.material_id,source,null,l.qty,`Technical sign-off ${id} | ${r.document_number} | ${r.work_reference}`.slice(0,500)).lastInsertRowid);db.prepare('UPDATE technical_signoff_lines SET movement_id=? WHERE id=?').run(movement,l.id);}}const status=action==='approve'?'Approved':'Rejected';db.prepare('UPDATE technical_signoffs SET status=?,reviewed_by=?,reviewed_at=CURRENT_TIMESTAMP WHERE id=?').run(status,u.id,id);audit(u,'signoff.'+action,{id});return status;});return reply(res,200,{id,status});}

if(p==='/api/team-issuance'&&req.method==='POST'){requireRole(u,'write');
const team=db.prepare('SELECT id,name,active FROM teams WHERE id=?').get(Number(b.team_id));
if(!team||team.active===0)throw Error('Select an active field team');
const warehouse=String(b.warehouse||'').trim(),note=String(b.note||'').trim();
if(!warehouse||warehouse.length>120||!db.prepare("SELECT 1 FROM warehouses WHERE name=? AND kind='warehouse'").get(warehouse))throw Error('Select a valid source warehouse');
if(!Array.isArray(b.lines)||b.lines.length<1||b.lines.length>100)throw Error('Add 1 to 100 materials');
const lines=b.lines.map(x=>({sku:String(x.sku||'').trim(),qty:Number(x.qty)}));
if(lines.some(x=>!x.sku||!Number.isFinite(x.qty)||x.qty<=0||x.qty>1e9||Math.abs(x.qty*1e6-Math.round(x.qty*1e6))>0.0001))throw Error('Invalid SKU or quantity');
if(new Set(lines.map(x=>x.sku.toLowerCase())).size!==lines.length)throw Error('Combine duplicate materials into one line');
const result=transaction(()=>{const dest='Team: '+team.name,ids=[];
for(const x of lines){const material=db.prepare('SELECT id FROM materials WHERE sku=? COLLATE NOCASE AND active=1').get(x.sku);if(!material)throw Error('Unknown or inactive SKU: '+x.sku);
const changed=db.prepare('UPDATE balances SET qty=ROUND(qty-?,6) WHERE material_id=? AND location=? AND qty>=?').run(x.qty,material.id,warehouse,x.qty);
if(changed.changes!==1)throw Error('Insufficient stock for '+x.sku+' in '+warehouse);
db.prepare('INSERT INTO balances(material_id,location,qty) VALUES(?,?,?) ON CONFLICT(material_id,location) DO UPDATE SET qty=ROUND(qty+excluded.qty,6)').run(material.id,dest,x.qty);
ids.push(Number(db.prepare('INSERT INTO movements(material_id,src,dst,qty,note) VALUES(?,?,?,?,?)').run(material.id,warehouse,dest,x.qty,('Team issuance | '+note+' | by '+u.username).slice(0,500)).lastInsertRowid));}
audit(u,'team.issued',{team_id:team.id,warehouse,ids});return ids;});return reply(res,201,{ok:true,movement_ids:result});}

if(/^\/api\/materials\/\d+\/image$/.test(p)&&req.method==='GET'){
 requireRole(u,'read');
 const id=Number(p.split('/')[3]),m=db.prepare('SELECT id,image_path FROM materials WHERE id=?').get(id);
 if(!m||!m.image_path)return reply(res,404,{error:'Material photo not found'});
 if(teamViewer){const team=db.prepare('SELECT name FROM teams WHERE id=?').get(u.team_id)?.name;
 if(!db.prepare('SELECT 1 FROM balances WHERE material_id=? AND location=?').get(id,'Team: '+team))return reply(res,403,{error:'Not your team material'});}
 const file=path.join(dataDir,'material-images',m.image_path),ext=path.extname(m.image_path).toLowerCase();
 if(!['.jpg','.png','.webp'].includes(ext)||!fs.existsSync(file))return reply(res,404,{error:'Material image missing'});
 res.writeHead(200,{'Content-Type':ext==='.jpg'?'image/jpeg':ext==='.png'?'image/png':'image/webp','Cache-Control':'private, max-age=120','X-Content-Type-Options':'nosniff'});return fs.createReadStream(file).pipe(res);
}
if(/^\/api\/materials\/\d+\/image$/.test(p)&&req.method==='POST'){
 requireRole(u,'write');
 const id=Number(p.split('/')[3]),m=db.prepare('SELECT id,image_path FROM materials WHERE id=?').get(id);
 if(!m)return reply(res,404,{error:'Material not found'});
 const mime=String(req.headers['content-type']||'').split(';')[0];
 const extensions={'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp'};
 if(!extensions[mime])return reply(res,415,{error:'Only JPG, PNG and WebP photos supported'});
 const dir=path.join(dataDir,'material-images');fs.mkdirSync(dir,{recursive:true});
 const key=crypto.randomBytes(18).toString('hex')+extensions[mime],target=path.join(dir,key);
 let size=0;
 try{
  await new Promise((resolve,reject)=>{
   const stream=fs.createWriteStream(target,{flags:'wx',mode:0o600});
   req.on('data',chunk=>{size+=chunk.length;if(size>10*1024*1024){req.unpipe(stream);stream.destroy();reject(Object.assign(Error('Material image maximum is 10 MB'),{status:413}));}});
   req.on('error',reject);stream.on('error',reject);stream.on('finish',resolve);req.pipe(stream);
  });
  const fd=fs.openSync(target,'r'),head=Buffer.alloc(12);fs.readSync(fd,head,0,12,0);fs.closeSync(fd);
  const valid=mime==='image/jpeg'?head.subarray(0,3).equals(Buffer.from('ffd8ff','hex')):mime==='image/png'?head.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')):head.subarray(0,4).toString()==='RIFF'&&head.subarray(8,12).toString()==='WEBP';
  if(!size||!valid)throw Error('Invalid image file');
  db.prepare('UPDATE materials SET image_path=? WHERE id=?').run(key,id);
  audit(u,'material.image.updated',{id});
  if(m.image_path)fs.rmSync(path.join(dir,m.image_path),{force:true});
  return reply(res,200,{ok:true});
 }catch(e){fs.rmSync(target,{force:true});throw e;}
}
if(/^\/api\/materials\/\d+$/.test(p)&&req.method==='PUT'){
 requireRole(u,'write');
 const id=Number(p.split('/')[3]),existing=db.prepare('SELECT * FROM materials WHERE id=?').get(id);
 if(!existing)return reply(res,404,{error:'Material not found'});
 const sku=String(b.sku??'').trim(),name=String(b.name??'').trim(),category=String(b.category??'').trim(),unit=String(b.unit??'').trim(),technology=String(b.technology??'').trim(),model=String(b.model??'').trim(),tracking=String(b.tracking??'').trim(),minStock=Number(b.min_stock),active=Number(b.active);
 if(!sku||sku.length>120||!name||name.length>250||!category||category.length>120||model.length>200)throw Error('SKU, name or category is missing or too long');
 if(!['pcs','m','rolls','boxes','sets'].includes(unit))throw Error('Invalid unit');
 if(!['Both','Fiber','Coax','Other'].includes(technology))throw Error('Invalid technology');
 if(!['bulk','serialized'].includes(tracking))throw Error('Invalid tracking type');
 if(!Number.isFinite(minStock)||minStock<0||minStock>1e12)throw Error('Minimum stock must be zero or higher');
 if(![0,1].includes(active))throw Error('Invalid active status');
 if((unit!==existing.unit||tracking!==existing.tracking)&&db.prepare('SELECT 1 FROM movements WHERE material_id=? LIMIT 1').get(id))throw Error('Unit and tracking cannot be changed after stock movements. Create a new material if the unit or tracking type differs.');
 const conflict=db.prepare('SELECT id FROM materials WHERE sku=? COLLATE NOCASE AND id<>?').get(sku,id);
 if(conflict)return reply(res,409,{error:'Another material already uses this SKU'});
 db.prepare('UPDATE materials SET sku=?,name=?,category=?,unit=?,technology=?,model=?,min_stock=?,tracking=?,active=? WHERE id=?').run(sku,name,category,unit,technology,model,minStock,tracking,active,id);
 audit(u,'material.updated',{id,before:{sku:existing.sku,name:existing.name,category:existing.category,unit:existing.unit,technology:existing.technology,model:existing.model,min_stock:existing.min_stock,tracking:existing.tracking,active:existing.active},after:{sku,name,category,unit,technology,model,min_stock:minStock,tracking,active}});
 return reply(res,200,{ok:true,id});
}
if(p==='/api/materials'&&req.method==='GET'){requireRole(u,'read');if(teamViewer){const team=db.prepare('SELECT name FROM teams WHERE id=?').get(u.team_id)?.name;return reply(res,200,db.prepare('SELECT m.*,COALESCE((SELECT SUM(qty) FROM balances b WHERE b.material_id=m.id AND b.location=?),0) total FROM materials m WHERE EXISTS(SELECT 1 FROM balances b WHERE b.material_id=m.id AND b.location=?) ORDER BY m.name').all('Team: '+team,'Team: '+team));}return reply(res,200,db.prepare('SELECT m.*,COALESCE((SELECT SUM(qty) FROM balances b WHERE b.material_id=m.id),0) total FROM materials m ORDER BY m.name').all());}
if(p==='/api/materials'&&req.method==='POST'){requireRole(u,'write');if(!b.sku||!b.name)throw Error('SKU and name required');const id=Number(db.prepare('INSERT INTO materials(sku,name,category,unit,min_stock,technology,model,tracking) VALUES(?,?,?,?,?,?,?,?)').run(b.sku,b.name,b.category||'General',b.unit||'pcs',Number(b.min_stock||0),b.technology||'Both',b.model||'',b.tracking||'bulk').lastInsertRowid);audit(u,'material.created',{id});return reply(res,201,{id});}
if(p==='/api/balances'){requireRole(u,'read');const team=teamViewer?db.prepare('SELECT name FROM teams WHERE id=?').get(u.team_id)?.name:null;return reply(res,200,teamViewer?db.prepare('SELECT b.*,m.name,m.sku FROM balances b JOIN materials m ON m.id=b.material_id WHERE b.location=? ORDER BY m.name').all('Team: '+team):db.prepare('SELECT b.*,m.name,m.sku FROM balances b JOIN materials m ON m.id=b.material_id ORDER BY m.name').all());}
if(p==='/api/movements'&&req.method==='GET'){requireRole(u,'read');const team=teamViewer?db.prepare('SELECT name FROM teams WHERE id=?').get(u.team_id)?.name:null;return reply(res,200,teamViewer?db.prepare('SELECT x.id,x.src,x.dst,x.qty,x.note,x.created_at,m.sku,m.name FROM movements x JOIN materials m ON m.id=x.material_id WHERE x.src=? OR x.dst=? ORDER BY x.id DESC LIMIT 1000').all('Team: '+team,'Team: '+team):db.prepare('SELECT x.id,x.src,x.dst,x.qty,x.note,x.created_at,m.sku,m.name FROM movements x JOIN materials m ON m.id=x.material_id ORDER BY x.id DESC LIMIT 1000').all());}
if(p==='/api/movements'&&req.method==='POST'){requireRole(u,'write');const material=db.prepare('SELECT id FROM materials WHERE sku=? COLLATE NOCASE AND active=1').get(String(b.sku||'').trim());if(!material)throw Error('Select a valid material SKU');const id=move(db,{material_id:material.id,src:b.src||null,dst:b.dst||null,qty:Number(b.qty),note:`${b.type||'Transfer'} | ${b.note||''} | by ${u.username}`});audit(u,'stock.moved',{id,...b});return reply(res,201,{id});}
if(p==='/api/stocktakes/apply'&&req.method==='POST'){requireRole(u,'approve');const id=Number(b.id);
 transaction(()=>{const st=db.prepare('SELECT * FROM stocktakes WHERE id=?').get(id);if(!st||st.status!=='Draft')throw Error('Stocktake not available');
 for(const l of db.prepare('SELECT * FROM stocktake_lines WHERE stocktake_id=?').all(id)){
 const counted=Number(l.counted);if(!Number.isFinite(counted)||counted<0)throw Error('Invalid counted quantity');
 const current=db.prepare('SELECT qty FROM balances WHERE material_id=? AND location=?').get(l.material_id,st.location)?.qty||0;
 const difference=Math.round((counted-current)*1e6)/1e6;
 if(difference===0)continue;
 if(difference<0){const result=db.prepare('UPDATE balances SET qty=ROUND(qty-?,6) WHERE material_id=? AND location=? AND qty>=?').run(-difference,l.material_id,st.location,-difference);if(result.changes!==1)throw Error('Stock changed during count. Recheck material '+l.material_id);}
 else db.prepare('INSERT INTO balances(material_id,location,qty) VALUES(?,?,?) ON CONFLICT(material_id,location) DO UPDATE SET qty=ROUND(qty+excluded.qty,6)').run(l.material_id,st.location,difference);
 db.prepare('INSERT INTO movements(material_id,src,dst,qty,note) VALUES(?,?,?,?,?)').run(l.material_id,difference<0?st.location:null,difference>0?st.location:null,Math.abs(difference),'Stocktake '+id);
 }
 db.prepare("UPDATE stocktakes SET status='Applied' WHERE id=?").run(id);audit(u,'stocktake.applied',{id});
 });return reply(res,200,{ok:true});}
if(p==='/api/stocktake-lines'&&req.method==='POST'){requireRole(u,'write');const st=db.prepare('SELECT * FROM stocktakes WHERE id=?').get(b.stocktake_id);if(!st||st.status!=='Draft')throw Error('Stocktake is closed');const expected=db.prepare('SELECT qty FROM balances WHERE material_id=? AND location=?').get(b.material_id,st.location)?.qty||0;db.prepare('INSERT INTO stocktake_lines(stocktake_id,material_id,expected,counted) VALUES(?,?,?,?) ON CONFLICT(stocktake_id,material_id) DO UPDATE SET counted=excluded.counted').run(b.stocktake_id,b.material_id,expected,Number(b.counted));return reply(res,201,{ok:true});}
if(p==='/api/stocktake-lines'&&req.method==='GET')return reply(res,200,db.prepare('SELECT l.*,m.name FROM stocktake_lines l JOIN materials m ON m.id=l.material_id ORDER BY l.id DESC').all());

// User avatars: admins may upload any account; users may upload their own portrait.
if(/^\/api\/users\/\d+\/avatar$/.test(p)){
 const id=Number(p.split('/')[3]);
 if(!db.prepare('SELECT 1 FROM users WHERE id=?').get(id))return reply(res,404,{error:'User not found'});
 if(id!==u.id)requireRole(u,'backup');
 if(req.method==='GET'){
  const avatar=db.prepare('SELECT avatar_path FROM users WHERE id=?').get(id)?.avatar_path;
  if(!avatar||!/^[a-f0-9]{32}\.(png|jpg|webp)$/.test(avatar))return reply(res,404,{error:'No profile photo'});
  const file=path.join(dataDir,'user-avatars',avatar);if(!fs.existsSync(file))return reply(res,404,{error:'Profile photo missing'});
  res.writeHead(200,{'Content-Type':avatar.endsWith('.png')?'image/png':avatar.endsWith('.jpg')?'image/jpeg':'image/webp','Cache-Control':'private, max-age=60','X-Content-Type-Options':'nosniff'});
  return fs.createReadStream(file).pipe(res);
 }
 if(req.method==='POST'){
  const mime=String(req.headers['content-type']||'').split(';')[0].toLowerCase();
  const ext={'image/png':'.png','image/jpeg':'.jpg','image/webp':'.webp'}[mime];
  if(!ext)throw Object.assign(Error('Choose PNG, JPG or WebP'),{status:415});
  const dir=path.join(dataDir,'user-avatars');fs.mkdirSync(dir,{recursive:true});
  const filename=crypto.randomBytes(16).toString('hex')+ext,file=path.join(dir,filename);
  let bytes=0;
  try{
   await new Promise((resolve,reject)=>{const output=fs.createWriteStream(file,{flags:'wx',mode:0o600});
    req.on('data',chunk=>{bytes+=chunk.length;if(bytes>10*1024*1024){req.unpipe(output);output.destroy();reject(Object.assign(Error('Profile photo exceeds 10 MB'),{status:413}));}});
    req.on('error',reject);output.on('error',reject);output.on('finish',resolve);req.pipe(output);
   });
   const head=Buffer.alloc(12),fd=fs.openSync(file,'r');fs.readSync(fd,head,0,12,0);fs.closeSync(fd);
   const valid=ext==='.png'?head.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')):ext==='.jpg'?head.subarray(0,3).equals(Buffer.from('ffd8ff','hex')):head.subarray(0,4).toString()==='RIFF'&&head.subarray(8,12).toString()==='WEBP';
   if(!bytes||!valid)throw Error('Invalid profile image');
   const old=db.prepare('SELECT avatar_path FROM users WHERE id=?').get(id)?.avatar_path;
   db.prepare('UPDATE users SET avatar_path=? WHERE id=?').run(filename,id);
   if(old&&/^[a-f0-9]{32}\.(png|jpg|webp)$/.test(old))fs.rmSync(path.join(dir,old),{force:true});
   audit(u,'user.avatar.updated',{id,bytes});return reply(res,200,{ok:true});
  }catch(e){fs.rmSync(file,{force:true});throw e;}
 }
}
// Identifiers may be added after physical stock has already been received.
const normalizeIdentifier=(value,kind)=>{
 const text=String(value??'').trim().toUpperCase();
 if(!text)return null;
 if(kind==='mac'){
  const hex=text.replace(/[:-]/g,'').replace(/\./g,'');
  if(!/^[0-9A-F]{12}$/.test(hex))throw Error('MAC must contain 12 hexadecimal digits');
  return hex.match(/.{2}/g).join(':');
 }
 if(text.length>120||/[\r\n]/.test(text))throw Error('Serial must be at most 120 characters');
 return text;
};
const validateIdentifiers=(rows,existingIds=[])=>{
 const seenSerial=new Set(),seenMac=new Set();
 const normalized=rows.map(row=>({serial:normalizeIdentifier(row.serial,'serial'),mac:normalizeIdentifier(row.mac,'mac')}));
 for(const row of normalized){for(const [key,seen] of [['serial',seenSerial],['mac',seenMac]]){
  const value=row[key];if(!value)continue;
  if(seen.has(value))throw Error('Duplicate '+key+' in this batch: '+value);
  seen.add(value);
 }}
 for(const [key,seen] of [['serial',seenSerial],['mac',seenMac]])for(const value of seen){
  const found=db.prepare(`SELECT id FROM devices WHERE ${key}=?`).get(value);
  if(found&&!existingIds.includes(found.id))throw Error('Identifier already assigned to another device: '+value);
  const other=db.prepare(`SELECT id FROM returns WHERE ${key}=? AND ${key} IS NOT NULL`).get(value);
  // Returns may refer to existing device identifiers; reject only when assigning to unrelated return rows.
  if(other&&rows._returnIds&&!rows._returnIds.includes(other.id))throw Error('Identifier already used by another return: '+value);
 }
 return normalized;
};
if(p==='/api/devices/bulk'&&req.method==='POST'){
 requireRole(u,'write');const materialId=Number(b.material_id),material=db.prepare('SELECT id,tracking,unit FROM materials WHERE id=?').get(materialId);
 if(!material||material.tracking!=='serialized'||material.unit!=='pcs')throw Error('Select a serialized material measured in pieces');
 const location=String(b.location||'Main Warehouse').trim(),count=Number(b.quantity);
 if(!Number.isInteger(count)||count<1||count>500)throw Error('Quantity must be 1–500 devices');
 if(!location||location.length>120)throw Error('Select a valid location');
 const stock=db.prepare('SELECT qty FROM balances WHERE material_id=? AND location=?').get(materialId,location)?.qty||0;
 const tracked=db.prepare('SELECT COUNT(*) n FROM devices WHERE material_id=? AND location=?').get(materialId,location).n;
 if(count>stock-tracked)throw Error(`Only ${Math.max(0,stock-tracked)} received units remain unregistered at this location. Receive stock first.`);
 const ids=transaction(()=>{const result=[];for(let i=0;i<count;i++)result.push(Number(db.prepare('INSERT INTO devices(material_id,location,status,notes) VALUES(?,?,?,?)').run(materialId,location,'available',String(b.notes||'').slice(0,500)).lastInsertRowid));audit(u,'devices.bulk.created',{material_id:materialId,location,count});return result});
 return reply(res,201,{ok:true,ids});
}
if(p==='/api/devices/identifiers'&&req.method==='POST'){
 requireRole(u,'write');const entries=b.entries;
 if(!Array.isArray(entries)||!entries.length||entries.length>500)throw Error('Provide 1–500 identifier rows');
 const ids=entries.map(x=>Number(x.id));if(new Set(ids).size!==ids.length||ids.some(x=>!Number.isInteger(x)||x<1))throw Error('Invalid or repeated device IDs');
 const existing=ids.map(id=>db.prepare('SELECT id,serial,mac FROM devices WHERE id=?').get(id));if(existing.some(x=>!x))throw Error('Device not found');
 const rows=entries.map((e,i)=>({serial:e.serial===undefined?existing[i].serial:e.serial,mac:e.mac===undefined?existing[i].mac:e.mac}));
 const normalized=validateIdentifiers(rows,ids);
 // Also ensure no duplicate return identifiers are introduced.
 transaction(()=>{normalized.forEach((row,i)=>db.prepare('UPDATE devices SET serial=?,mac=? WHERE id=?').run(row.serial,row.mac,ids[i]));audit(u,'devices.identifiers.updated',{count:ids.length});});
 return reply(res,200,{ok:true,updated:ids.length});
}
if(p==='/api/returns/bulk'&&req.method==='POST'){
 requireRole(u,'team');const materialId=Number(b.material_id),material=db.prepare('SELECT id,tracking,unit FROM materials WHERE id=?').get(materialId);
 if(!material||material.tracking!=='serialized'||material.unit!=='pcs')throw Error('Select a serialized material measured in pieces');
 const count=Number(b.quantity);if(!Number.isInteger(count)||count<1||count>500)throw Error('Quantity must be 1–500 returned devices');
 const condition=String(b.condition||'unknown').slice(0,80),reason=String(b.reason||'').slice(0,500),customer=String(b.customer_ref||'').slice(0,120),notes=String(b.notes||'').slice(0,500);
 const ids=transaction(()=>{const result=[];for(let i=0;i<count;i++)result.push(Number(db.prepare('INSERT INTO returns(material_id,customer_ref,reason,condition,status,notes) VALUES(?,?,?,?,?,?)').run(materialId,customer,reason,condition,'Quarantine',notes).lastInsertRowid));audit(u,'returns.bulk.created',{material_id:materialId,count});return result});
 return reply(res,201,{ok:true,ids});
}
if(p==='/api/returns/identifiers'&&req.method==='POST'){
 requireRole(u,'team');const entries=b.entries;
 if(!Array.isArray(entries)||!entries.length||entries.length>500)throw Error('Provide 1–500 identifier rows');
 const ids=entries.map(e=>Number(e.id));if(new Set(ids).size!==ids.length||ids.some(x=>!Number.isInteger(x)||x<1))throw Error('Invalid or repeated return IDs');
 const existing=ids.map(id=>db.prepare('SELECT id,serial,mac FROM returns WHERE id=?').get(id));if(existing.some(x=>!x))throw Error('Return not found');
 const normalized=entries.map((e,i)=>({serial:normalizeIdentifier(e.serial===undefined?existing[i].serial:e.serial,'serial'),mac:normalizeIdentifier(e.mac===undefined?existing[i].mac:e.mac,'mac')}));
 for(const key of ['serial','mac']){
  const seen=new Set();for(const row of normalized){if(!row[key])continue;if(seen.has(row[key]))throw Error('Duplicate '+key+' in this batch');seen.add(row[key]);
   const other=db.prepare(`SELECT id FROM returns WHERE ${key}=?`).get(row[key]);if(other&&!ids.includes(other.id))throw Error('Identifier already assigned to return '+other.id);
  }
 }
 transaction(()=>{normalized.forEach((row,i)=>db.prepare('UPDATE returns SET serial=?,mac=? WHERE id=?').run(row.serial,row.mac,ids[i]));audit(u,'returns.identifiers.updated',{count:ids.length});});
 return reply(res,200,{ok:true,updated:ids.length});
}
if(p==='/api/users'&&req.method==='GET'){requireRole(u,'backup');return reply(res,200,db.prepare('SELECT id,username,role,active,team_id,avatar_path FROM users WHERE deleted_at IS NULL ORDER BY id').all());}
if(p==='/api/users'&&req.method==='POST'){requireRole(u,'backup');if(!roles.includes(b.role)||String(b.password||'').length<12)throw Error('Valid role and 12-character password required');if(b.team_id&&!db.prepare('SELECT id FROM teams WHERE id=?').get(Number(b.team_id)))throw Error('Unknown team');if(b.role==='Viewer / Auditor'&&!b.team_id)throw Error('Viewer accounts must be linked to a team');const salt=crypto.randomBytes(16).toString('hex');const username=String(b.username||'').trim();if(!username||username.length>100)throw Error('Enter a valid username');const id=Number(db.prepare('INSERT INTO users(username,password_hash,salt,role,team_id) VALUES(?,?,?,?,?)').run(username,pw(b.password,salt),salt,b.role,b.team_id||null).lastInsertRowid);audit(u,'user.created',{id});return reply(res,201,{id});}
if(/^\/api\/users\/\d+$/.test(p)&&req.method==='DELETE'){
 requireRole(u,'backup');const id=Number(p.split('/').pop());const target=db.prepare('SELECT id,username,role,active,deleted_at FROM users WHERE id=?').get(id);
 if(!target||target.deleted_at)return reply(res,404,{error:'User not found'});
 if(id===u.id)throw Object.assign(Error('You cannot delete your own account'),{status:400});
 if(target.role==='Administrator'&&db.prepare("SELECT COUNT(*) n FROM users WHERE role='Administrator' AND active=1 AND deleted_at IS NULL").get().n<=1)throw Object.assign(Error('Cannot delete the last active administrator'),{status:400});
 transaction(()=>{db.prepare('DELETE FROM sessions WHERE user_id=?').run(id);db.prepare('UPDATE users SET active=0,deleted_at=CURRENT_TIMESTAMP,username=? WHERE id=?').run('__deleted_user_'+id,id);audit(u,'user.deleted',{id,username:target.username});});
 return reply(res,200,{ok:true,message:'User deleted. Historical records are preserved.'});
}
if(/^\/api\/users\/\d+\/password$/.test(p)&&req.method==='POST'){
 requireRole(u,'backup');const id=Number(p.split('/')[3]);const target=db.prepare('SELECT id,deleted_at FROM users WHERE id=?').get(id);
 if(!target||target.deleted_at)return reply(res,404,{error:'User not found'});
 if(String(b.password||'').length<12)throw Error('New password must contain at least 12 characters');
 const salt=crypto.randomBytes(16).toString('hex');transaction(()=>{db.prepare('UPDATE users SET salt=?,password_hash=? WHERE id=?').run(salt,pw(b.password,salt),id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(id);audit(u,'user.password.reset',{id});});
 return reply(res,200,{ok:true,message:'Password updated. Existing sessions were signed out.'});
}
if(p==='/api/users/update'&&req.method==='POST'){requireRole(u,'backup');if(b.role&&!roles.includes(b.role))throw Error('Invalid role');const target=db.prepare('SELECT * FROM users WHERE id=? AND deleted_at IS NULL').get(Number(b.id));if(!target)throw Object.assign(Error('User not found'),{status:404});if(target.role==='Administrator'&&target.active&&((b.role&&b.role!=='Administrator')||b.active===0||b.active==='0')&&db.prepare("SELECT COUNT(*) n FROM users WHERE role='Administrator' AND active=1 AND deleted_at IS NULL").get().n<=1)throw Error('Cannot remove the last active administrator');if(b.role)db.prepare('UPDATE users SET role=? WHERE id=?').run(b.role,b.id);if(b.team_id!==undefined){if(b.team_id&&!db.prepare('SELECT id FROM teams WHERE id=?').get(Number(b.team_id)))throw Error('Unknown team');if(!b.team_id&&db.prepare('SELECT role FROM users WHERE id=?').get(b.id)?.role==='Viewer / Auditor')throw Error('Viewer must remain linked to a team');db.prepare('UPDATE users SET team_id=? WHERE id=?').run(b.team_id||null,b.id);}if(b.active!==undefined)db.prepare('UPDATE users SET active=? WHERE id=?').run(Number(b.active),b.id);audit(u,'user.updated',{id:b.id});return reply(res,200,{ok:true});}
if(p==='/api/audit'){requireRole(u,'backup');return reply(res,200,db.prepare('SELECT a.*,u.username FROM audit a LEFT JOIN users u ON u.id=a.user_id ORDER BY a.id DESC LIMIT 500').all());}
if(p==='/api/backup'&&req.method==='POST'){requireRole(u,'backup');const dest=path.join(dataDir,'backups');fs.mkdirSync(dest,{recursive:true});const name='inventory-'+new Date().toISOString().replace(/[:.]/g,'-')+'.sqlite';db.exec('PRAGMA wal_checkpoint(PASSIVE)');const file=path.join(dest,name);await require('node:sqlite').backup(db,file);const attachments=path.join(dataDir,'signoff-evidence');if(fs.existsSync(attachments))fs.cpSync(attachments,path.join(dest,name+'.files'),{recursive:true});const images=path.join(dataDir,'material-images');if(fs.existsSync(images))fs.cpSync(images,path.join(dest,name+'.images'),{recursive:true});const brand=path.join(dataDir,'brand-assets');if(fs.existsSync(brand))fs.cpSync(brand,path.join(dest,name+'.brand'),{recursive:true});const avatars=path.join(dataDir,'user-avatars');if(fs.existsSync(avatars))fs.cpSync(avatars,path.join(dest,name+'.avatars'),{recursive:true});audit(u,'backup.created',{name});return reply(res,201,{name});}
if(p==='/api/backups'){requireRole(u,'backup');const d=path.join(dataDir,'backups');return reply(res,200,fs.existsSync(d)?fs.readdirSync(d).filter(x=>x.endsWith('.sqlite')).reverse():[]);}


// Admin-only SQLite upload: validated on disk, then selectable for the normal staged restore.
if(p==='/api/backups/upload'&&req.method==='POST'){
 requireRole(u,'backup');
 if(req.headers['content-type']!=='application/vnd.sqlite3'&&req.headers['content-type']!=='application/octet-stream')throw Object.assign(Error('Upload a .sqlite database snapshot'),{status:415});
 const dir=path.join(dataDir,'backups');fs.mkdirSync(dir,{recursive:true});
 const name='inventory-'+new Date().toISOString().replace(/[:.]/g,'-')+'.sqlite';
 const target=path.join(dir,name);let size=0;
 try{
  await new Promise((resolve,reject)=>{
   const output=fs.createWriteStream(target,{flags:'wx',mode:0o600});
   req.on('data',chunk=>{size+=chunk.length;if(size>200*1024*1024){req.unpipe(output);output.destroy();reject(Object.assign(Error('Backup exceeds 200 MB'),{status:413}));}});
   req.on('error',reject);output.on('error',reject);output.on('finish',resolve);req.pipe(output);
  });
  if(size<100)throw Error('Invalid database backup');
  const {DatabaseSync}=require('node:sqlite');const check=new DatabaseSync(target,{readOnly:true});
  try{
   if(check.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error('SQLite integrity check failed');
   for(const t of ['users','materials','balances','movements','settings'])if(!check.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(t))throw Error('Not an ISP Inventory database: missing '+t);
  }finally{check.close()}
  audit(u,'backup.uploaded',{name,bytes:size});return reply(res,201,{name,bytes:size,warning:'SQLite-only upload does not contain photo or evidence attachments. Existing attachments will be preserved during restore.'});
 }catch(e){fs.rmSync(target,{force:true});throw e;}
}
if(p==='/api/returns/dispatch'&&req.method==='POST'){
 requireRole(u,'write');
 const ids=[...new Set((Array.isArray(b.return_ids)?b.return_ids:[]).map(Number))];
 if(!ids.length||ids.length>500||ids.some(id=>!Number.isSafeInteger(id)||id<=0))throw Error('Select 1–500 returned devices');
 const supplier=db.prepare('SELECT id,name FROM suppliers WHERE id=?').get(Number(b.supplier_id));if(!supplier)throw Error('Select a valid supplier');
 const warehouse=db.prepare('SELECT name FROM warehouses WHERE name=?').get(String(b.location||''));if(!warehouse)throw Error('Select a valid source warehouse');
 const reference=String(b.reference||'').trim();if(!reference||reference.length>120)throw Error('Enter a dispatch reference (max 120 characters)');
 const note=String(b.notes||'').slice(0,400);
 const result=transaction(()=>{
  const rows=ids.map(id=>db.prepare('SELECT id,material_id,serial,mac,status FROM returns WHERE id=?').get(id));
  if(rows.some(x=>!x||!x.material_id))throw Error('All selected returns must have a material');
  if(rows.some(x=>x.status==='Sent to Supplier'))throw Error('One or more returns have already been sent to a supplier');
  const lines=new Map();for(const r of rows)lines.set(r.material_id,(lines.get(r.material_id)||0)+1);
  for(const [materialId,qty] of lines){const balance=db.prepare('SELECT qty FROM balances WHERE material_id=? AND location=?').get(materialId,warehouse.name);if(!balance||balance.qty<qty)throw Error('Insufficient warehouse stock for material #'+materialId+' (need '+qty+')');}
  const dispatchId=Number(db.prepare('INSERT INTO supplier_dispatches(supplier_id,warehouse,reference,notes,created_by) VALUES(?,?,?,?,?)').run(supplier.id,warehouse.name,reference,note,u.id).lastInsertRowid);
  for(const [materialId,qty] of lines){
   const changed=db.prepare('UPDATE balances SET qty=ROUND(qty-?,6) WHERE material_id=? AND location=? AND qty>=?').run(qty,materialId,warehouse.name,qty);if(changed.changes!==1)throw Error('Insufficient stock for material #'+materialId);const moved=Number(db.prepare('INSERT INTO movements(material_id,src,dst,qty,note) VALUES(?,?,?,?,?)').run(materialId,warehouse.name,null,qty,`Supplier dispatch #${dispatchId} | ${supplier.name} | ${reference}`).lastInsertRowid);
   db.prepare('INSERT INTO supplier_dispatch_lines(dispatch_id,material_id,quantity,movement_id) VALUES(?,?,?,?)').run(dispatchId,materialId,qty,moved);
  }
  for(const r of rows){db.prepare("UPDATE returns SET status='Sent to Supplier' WHERE id=?").run(r.id);db.prepare('INSERT INTO supplier_dispatch_returns(dispatch_id,return_id) VALUES(?,?)').run(dispatchId,r.id);}
  audit(u,'supplier.dispatch.created',{dispatch_id:dispatchId,return_ids:ids,supplier_id:supplier.id,location:warehouse.name});return {id:dispatchId,quantity:rows.length};
 });return reply(res,201,result);
}
if(p==='/api/supplier-dispatches'&&req.method==='GET'){
 requireRole(u,'read');return reply(res,200,db.prepare('SELECT d.*,s.name supplier_name,u.username created_by_name FROM supplier_dispatches d JOIN suppliers s ON s.id=d.supplier_id LEFT JOIN users u ON u.id=d.created_by ORDER BY d.id DESC LIMIT 500').all());
}
if(p==='/api/restore'&&req.method==='POST'){
 requireRole(u,'backup');const name=String(b.name||'');if(!/^inventory-[0-9TZ-]+\.sqlite$/.test(name))throw Error('Invalid backup name');
 if(b.confirm!=='RESTORE DATABASE')throw Error('Type RESTORE DATABASE to confirm');
 const source=path.join(dataDir,'backups',name);if(!fs.existsSync(source))throw Error('Backup missing');
 const {DatabaseSync}=require('node:sqlite');const check=new DatabaseSync(source,{readOnly:true});let integrity;try{integrity=check.prepare('PRAGMA integrity_check').get().integrity_check;}finally{check.close();}if(integrity!=='ok')throw Error('Backup integrity check failed');
 fs.writeFileSync(path.join(dataDir,'restore-pending.json'),JSON.stringify({name,requested_at:new Date().toISOString()}),{flag:'w',mode:0o600});audit(u,'restore.scheduled',{name});return reply(res,200,{ok:true,message:'Restore staged. Close the server and restart it to apply. A safety snapshot is created first.'});
}

if(p==='/api/logo'&&req.method==='GET'){
 const saved=db.prepare("SELECT value FROM settings WHERE key='logo_file'").get()?.value;
 if(saved&&/^[a-f0-9]{32}\.(png|jpg|webp|gif)$/.test(saved)){
  const file=path.join(dataDir,'brand-assets',saved);
  if(fs.existsSync(file)){
   const type=saved.endsWith('.png')?'image/png':saved.endsWith('.jpg')?'image/jpeg':saved.endsWith('.gif')?'image/gif':'image/webp';
   res.writeHead(200,{'Content-Type':type,'Content-Length':fs.statSync(file).size,'Cache-Control':'private, max-age=60','X-Content-Type-Options':'nosniff'});
   return fs.createReadStream(file).pipe(res);
  }
 }
 return reply(res,404,{error:'Logo not uploaded'});
}
if(p==='/api/logo/upload'&&req.method==='POST'){
 requireRole(u,'backup');
 const mime=String(req.headers['content-type']||'').split(';')[0].trim().toLowerCase();
 const ext={'image/png':'.png','image/jpeg':'.jpg','image/webp':'.webp','image/gif':'.gif'}[mime];
 if(!ext)throw Object.assign(Error('Choose a PNG, JPG, WebP or GIF image'),{status:415});
 const dir=path.join(dataDir,'brand-assets');fs.mkdirSync(dir,{recursive:true});
 const filename=crypto.randomBytes(16).toString('hex')+ext,target=path.join(dir,filename);
 let size=0;
 try{
  await new Promise((resolve,reject)=>{
   const out=fs.createWriteStream(target,{flags:'wx',mode:0o600});
   req.on('data',chunk=>{size+=chunk.length;if(size>50*1024*1024){req.unpipe(out);out.destroy();reject(Object.assign(Error('Logo file exceeds 50 MB'),{status:413}));}});
   req.on('error',reject);out.on('error',reject);out.on('finish',resolve);req.pipe(out);
  });
  const header=Buffer.alloc(16),fd=fs.openSync(target,'r');fs.readSync(fd,header,0,16,0);fs.closeSync(fd);
  const valid=ext==='.png'?header.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')):ext==='.jpg'?header.subarray(0,3).equals(Buffer.from('ffd8ff','hex')):ext==='.gif'?['GIF87a','GIF89a'].includes(header.subarray(0,6).toString()):header.subarray(0,4).toString()==='RIFF'&&header.subarray(8,12).toString()==='WEBP';
  if(!size||!valid)throw Error('Invalid image file');
  const previous=db.prepare("SELECT value FROM settings WHERE key='logo_file'").get()?.value;
  db.prepare("INSERT INTO settings(key,value) VALUES('logo_file',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(filename);
  if(previous&&/^[a-f0-9]{32}\.(png|jpg|webp|gif)$/.test(previous))fs.rmSync(path.join(dir,previous),{force:true});
  audit(u,'logo.updated',{bytes:size});
  return reply(res,200,{ok:true,bytes:size});
 }catch(e){fs.rmSync(target,{force:true});throw e;}
}
if(p==='/api/network'&&req.method==='GET'){
 if(u.role!=='Administrator')throw Object.assign(Error('Administrator access required'),{status:403});
 const configFile=path.join(dataDir,'network.json');
 let configured={port:3000};try{configured=JSON.parse(fs.readFileSync(configFile,'utf8'))}catch{}
 return reply(res,200,{configuredPort:configured.port||3000,effectivePort:server.address()?.port||port,host:process.env.ISP_LISTEN_HOST==='0.0.0.0'?'0.0.0.0':'127.0.0.1',environmentOverride:!!process.env.ISP_SERVER_PORT});
}
if(p==='/api/network'&&req.method==='POST'){
 if(u.role!=='Administrator')throw Object.assign(Error('Administrator access required'),{status:403});
 const n=Number(b.port);
 if(!Number.isInteger(n)||n<1024||n>65535)throw Error('Server port must be between 1024 and 65535');
 const configFile=path.join(dataDir,'network.json'),tmp=configFile+'.tmp';
 fs.writeFileSync(tmp,JSON.stringify({port:n},null,2),{mode:0o600});fs.renameSync(tmp,configFile);
 audit(u,'network.port.changed',{port:n});
 return reply(res,200,{ok:true,port:n,restartRequired:true,environmentOverride:!!process.env.ISP_SERVER_PORT});
}
if(p==='/api/settings'&&req.method==='GET')return reply(res,200,db.prepare('SELECT * FROM settings').all());
if(p==='/api/settings'&&req.method==='POST'){requireRole(u,'backup');if(!['company_name','software_name','logo_data','theme_accent','theme_background','theme_glow_primary','theme_glow_secondary','theme_glow_accent','logo_size','backup_note'].includes(b.key))throw Error('Unknown setting');const val=String(b.value||'');if(b.key==='logo_data'&&(!/^data:image\/(png|jpeg|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(val)||val.length>2000000))throw Error('Invalid logo (max 1.5 MB)');if(['theme_accent','theme_background','theme_glow_primary','theme_glow_secondary','theme_glow_accent'].includes(b.key)&&!/^#[0-9a-fA-F]{6}$/.test(val))throw Error('Use a six-digit hex color');if(b.key==='logo_size'&&(!/^\d{2,3}$/.test(val)||Number(val)<32||Number(val)>320))throw Error('Logo size must be 32–320 pixels');if(['software_name','company_name'].includes(b.key)&&(val.length<1||val.length>100))throw Error('Name must be 1–100 characters');db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(b.key,val);audit(u,'setting.changed',{key:b.key});return reply(res,200,{ok:true});}
if(p==='/api/export'&&req.method==='GET'){requireRole(u,'read');if(teamViewer)throw Object.assign(Error('Team viewers cannot export company-wide data'),{status:403});const table=url.searchParams.get('table');if(!['materials','balances','movements','returns','devices','teams','suppliers','work_orders'].includes(table))throw Error('Invalid report');const rows=table==='movements'?db.prepare('SELECT x.id,m.sku,m.name,x.src,x.dst,x.qty,x.note,x.created_at FROM movements x JOIN materials m ON m.id=x.material_id ORDER BY x.id DESC LIMIT 10000').all():db.prepare(`SELECT * FROM ${table} LIMIT 10000`).all();const keys=rows.length?Object.keys(rows[0]):[];const csv=[keys.join(','),...rows.map(r=>keys.map(k=>'"'+String(r[k]??'').replace(/"/g,'""')+'"').join(','))].join('\r\n');res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="${table}.csv"`});return res.end('\ufeff'+csv);}
// Team and warehouse lifecycle: never silently destroy stock, user links, or historical references.
function referenced(table,id,name){
 const checks=table==='teams'?[['users','team_id',id],['work_orders','team_id',id],['returns','team_id',id],['technical_signoffs','team_id',id]]:
 [['supplier_receipts','warehouse',name]];
 const location=table==='teams'?'Team: '+name:name;
 checks.push(['balances','location',location],['movements','src',location],['movements','dst',location],['stocktakes','location',location],['devices','location',location],['technical_signoff_lines','source_location',location]);
 return checks.filter(([t,c,v])=>db.prepare(`SELECT 1 FROM ${t} WHERE ${c}=? LIMIT 1`).get(v)).map(([t])=>t);
}
if(/^\/api\/data\/(teams|warehouses)\/\d+$/.test(p)&&['PUT','DELETE'].includes(req.method)){
 requireRole(u,'backup');const [,table,idText]=p.match(/^\/api\/data\/(teams|warehouses)\/(\d+)$/),id=Number(idText);
 const current=db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(id);if(!current)return reply(res,404,{error:'Record not found'});
 if(req.method==='DELETE'){
  const refs=referenced(table,id,current.name);
  if(refs.length)throw Object.assign(Error('Cannot delete '+current.name+' because it is used in: '+refs.join(', ')+'. Preserve historical records or use another location.'),{status:409});
  transaction(()=>{db.prepare(`DELETE FROM ${table} WHERE id=?`).run(id);audit(u,table+'.deleted',{id,name:current.name});});return reply(res,200,{ok:true});
 }
 const name=String(b.name??current.name).trim();if(!name||name.length>120)throw Error('Name must contain 1–120 characters');
 if(db.prepare(`SELECT id FROM ${table} WHERE name=? AND id<>?`).get(name,id))throw Object.assign(Error('That name is already in use'),{status:409});
 if(table==='warehouses'&&b.kind!==undefined&&!['warehouse','quarantine','defective','repair'].includes(String(b.kind).toLowerCase()))throw Error('Invalid warehouse type');
 if(table==='teams'&&b.active!==undefined&&![0,1].includes(Number(b.active)))throw Error('Active must be 0 or 1');
 const before=table==='teams'?'Team: '+current.name:current.name,after=table==='teams'?'Team: '+name:name;
 if(before!==after&&db.prepare('SELECT 1 FROM balances WHERE location=? LIMIT 1').get(after))throw Object.assign(Error('The destination stock location already has records. Rename cannot merge quantities automatically.'),{status:409});
 transaction(()=>{
  if(before!==after){
   db.prepare('UPDATE balances SET location=? WHERE location=?').run(after,before);
   db.prepare('UPDATE stocktakes SET location=? WHERE location=?').run(after,before);
   db.prepare('UPDATE devices SET location=? WHERE location=?').run(after,before);
   db.prepare('UPDATE technical_signoff_lines SET source_location=? WHERE source_location=? AND movement_id IS NULL').run(after,before);
   if(table==='warehouses')db.prepare('UPDATE supplier_receipts SET warehouse=? WHERE warehouse=?').run(after,before);
  }
  if(table==='teams')db.prepare('UPDATE teams SET name=?,leader=?,phone=?,active=? WHERE id=?').run(name,String(b.leader??current.leader).slice(0,200),String(b.phone??current.phone).slice(0,100),Number(b.active??current.active),id);
  else db.prepare('UPDATE warehouses SET name=?,kind=? WHERE id=?').run(name,String(b.kind??current.kind),id);
  audit(u,table+'.updated',{id,previous_name:current.name,name});
 });
 return reply(res,200,{ok:true});
}
const match=p.match(/^\/api\/data\/([a-z_]+)(?:\/(\d+))?$/);if(match){const table=safeTable(match[1]);if(req.method==='GET'){requireRole(u,'read');if(teamViewer){if(table==='teams')return reply(res,200,db.prepare('SELECT * FROM teams WHERE id=?').all(u.team_id));throw Object.assign(Error('Team viewer access is limited to team inventory and sign-offs'),{status:403});}return reply(res,200,db.prepare(`SELECT * FROM ${table} ORDER BY id DESC LIMIT 1000`).all());}requireRole(u,table==='returns'?'team':'write');if(req.method==='POST'){const id=insert(table,b);audit(u,table+'.created',{id});return reply(res,201,{id});}if(req.method==='PUT'&&match[2]){if(['returns','repairs','stocktakes'].includes(table)&&u.role!=='Administrator'&&u.role!=='Warehouse Manager')throw Object.assign(Error('Approval required'),{status:403});update(table,Number(match[2]),b);audit(u,table+'.updated',{id:match[2]});return reply(res,200,{ok:true});}}
return reply(res,404,{error:'Endpoint not found'});}
if(!['GET','HEAD'].includes(req.method))return reply(res,405,{error:'Method not allowed'});const target=path.resolve(root,'.'+(p==='/'?'/index.html':p));if(!target.startsWith(root+path.sep))return reply(res,403,{error:'Forbidden'});const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'};const data=fs.readFileSync(target);res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});res.end(data);
}catch(e){if(!res.headersSent)reply(res,e.status|| (e.code==='ENOENT'?404:400),{error:e.message});}});
const listenHost=process.env.ISP_LISTEN_HOST==='0.0.0.0'?'0.0.0.0':'127.0.0.1';
let configuredPort=port;
if(!process.env.ISP_SERVER_PORT){try{const v=JSON.parse(fs.readFileSync(path.join(dataDir,'network.json'),'utf8')).port;if(Number.isInteger(v)&&v>=1024&&v<=65535)configuredPort=v;}catch{}}
server.listen(configuredPort,listenHost,()=>console.log(`ISP Inventory: http://${listenHost}:${configuredPort}`));
process.on('SIGINT',()=>server.close(()=>{db.close();process.exit(0)}));
