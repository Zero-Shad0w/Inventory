function move(db,{material_id,src=null,dst=null,qty,note=''}){
if(!Number.isInteger(material_id)||!Number.isFinite(qty)||qty<=0||(!src&&!dst)||(src&&dst&&src===dst))throw Error('Invalid movement');
if(!db.prepare('SELECT id FROM materials WHERE id=?').get(material_id))throw Error('Unknown material');
db.exec('BEGIN IMMEDIATE');try{
if(src){const result=db.prepare('UPDATE balances SET qty=ROUND(qty-?,6) WHERE material_id=? AND location=? AND qty>=?').run(qty,material_id,src,qty);if(result.changes!==1)throw Error('Insufficient stock');}
if(dst)db.prepare('INSERT INTO balances(material_id,location,qty) VALUES(?,?,?) ON CONFLICT(material_id,location) DO UPDATE SET qty=ROUND(qty+excluded.qty,6)').run(material_id,dst,qty);
const result=db.prepare('INSERT INTO movements(material_id,src,dst,qty,note) VALUES(?,?,?,?,?)').run(material_id,src,dst,qty,String(note).slice(0,500));db.exec('COMMIT');return Number(result.lastInsertRowid);
}catch(e){db.exec('ROLLBACK');throw e;}}
module.exports={move};
