'use strict';
const $=id=>document.getElementById(id),mode=()=>document.querySelector('input[name=mode]:checked').value;
function update(){ $('remote').style.display=mode()==='shared'?'block':'none';$('local').style.display=mode()==='local'?'block':'none';$('test').disabled=false; }
document.querySelectorAll('input[name=mode]').forEach(x=>x.onchange=update);
function config(){const host=$('server').value.trim();const port=$('sharedPort').value.trim();let url='';if(mode()==='shared'){if(!/^https?:\/\//i.test(host))url='http://'+host;else url=host;try{const u=new URL(url);if(port)u.port=port;url=u.origin;}catch{url=host;}}return {mode:mode(),url,localPort:$('localPort').value.trim()||0}}
async function run(action){$('message').textContent='Please wait...';try{const r=await window.inventoryDesktop[action](config());$('message').textContent=r.message||'Saved.'}catch(e){$('message').textContent=e.message||String(e)}}
$('test').onclick=()=>run('testConnection');$('save').onclick=()=>run('saveConnection');
window.inventoryDesktop.getConnection().then(c=>{document.querySelector(`input[value="${c.mode}"]`).checked=true;if(c.url){try{const u=new URL(c.url);$('server').value=u.hostname;$('sharedPort').value=u.port||(u.protocol==='https:'?'443':'80');}catch{$('server').value=c.url}}$('localPort').value=c.localPort||'';update()}).catch(e=>{$('message').textContent=e.message});
