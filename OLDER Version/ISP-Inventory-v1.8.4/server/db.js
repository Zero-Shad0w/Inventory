const fs=require('node:fs'),path=require('node:path');const {DatabaseSync}=require('node:sqlite');
function openDb(dir){fs.mkdirSync(dir,{recursive:true});const db=new DatabaseSync(path.join(dir,'inventory.sqlite'));db.exec('PRAGMA journal_mode=WAL;PRAGMA foreign_keys=ON;PRAGMA busy_timeout=5000;');db.exec(`
CREATE TABLE IF NOT EXISTS materials(id INTEGER PRIMARY KEY,sku TEXT UNIQUE NOT NULL,name TEXT NOT NULL,category TEXT NOT NULL DEFAULT 'General',unit TEXT NOT NULL DEFAULT 'pcs',min_stock REAL NOT NULL DEFAULT 0,technology TEXT DEFAULT 'Both',model TEXT DEFAULT '',tracking TEXT DEFAULT 'bulk',active INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS supplier_receipts(id INTEGER PRIMARY KEY, supplier_id INTEGER NOT NULL REFERENCES suppliers(id), document_number TEXT NOT NULL, document_date TEXT NOT NULL, warehouse TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', created_by INTEGER REFERENCES users(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(supplier_id,document_number));
CREATE TABLE IF NOT EXISTS supplier_receipt_lines(id INTEGER PRIMARY KEY,receipt_id INTEGER NOT NULL REFERENCES supplier_receipts(id),material_id INTEGER NOT NULL REFERENCES materials(id),quantity REAL NOT NULL CHECK(quantity>0),movement_id INTEGER NOT NULL REFERENCES movements(id));
CREATE TABLE IF NOT EXISTS balances(material_id INTEGER NOT NULL REFERENCES materials(id),location TEXT NOT NULL,qty REAL NOT NULL DEFAULT 0 CHECK(qty>=0),PRIMARY KEY(material_id,location));
CREATE TABLE IF NOT EXISTS movements(id INTEGER PRIMARY KEY,material_id INTEGER NOT NULL REFERENCES materials(id),src TEXT,dst TEXT,qty REAL NOT NULL CHECK(qty>0),note TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,username TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,salt TEXT NOT NULL,role TEXT NOT NULL,active INTEGER DEFAULT 1,team_id INTEGER);
CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,user_id INTEGER,action TEXT NOT NULL,details TEXT NOT NULL DEFAULT '{}',created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS categories(id INTEGER PRIMARY KEY,name TEXT UNIQUE NOT NULL, parent_id INTEGER);
CREATE TABLE IF NOT EXISTS warehouses(id INTEGER PRIMARY KEY,name TEXT UNIQUE NOT NULL,kind TEXT DEFAULT 'warehouse');
CREATE TABLE IF NOT EXISTS teams(id INTEGER PRIMARY KEY,name TEXT UNIQUE NOT NULL,leader TEXT DEFAULT '',phone TEXT DEFAULT '',active INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS suppliers(id INTEGER PRIMARY KEY,name TEXT UNIQUE NOT NULL,contact TEXT DEFAULT '',phone TEXT DEFAULT '',email TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS work_orders(id INTEGER PRIMARY KEY,reference TEXT UNIQUE NOT NULL,name TEXT NOT NULL,team_id INTEGER,status TEXT DEFAULT 'Open',notes TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS devices(id INTEGER PRIMARY KEY,material_id INTEGER REFERENCES materials(id),serial TEXT UNIQUE,mac TEXT UNIQUE,status TEXT DEFAULT 'available',location TEXT DEFAULT 'Main Warehouse',customer_ref TEXT DEFAULT '',notes TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS returns(id INTEGER PRIMARY KEY,device_id INTEGER REFERENCES devices(id),material_id INTEGER REFERENCES materials(id),serial TEXT,mac TEXT,customer_ref TEXT DEFAULT '',reason TEXT DEFAULT '',condition TEXT DEFAULT 'unknown',status TEXT DEFAULT 'Quarantine',team_id INTEGER,notes TEXT DEFAULT '',created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS repairs(id INTEGER PRIMARY KEY,return_id INTEGER REFERENCES returns(id),provider TEXT DEFAULT '',status TEXT DEFAULT 'Pending',cost REAL DEFAULT 0,notes TEXT DEFAULT '',created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS stocktakes(id INTEGER PRIMARY KEY,location TEXT NOT NULL,status TEXT DEFAULT 'Draft',notes TEXT DEFAULT '',created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS stocktake_lines(id INTEGER PRIMARY KEY,stocktake_id INTEGER REFERENCES stocktakes(id),material_id INTEGER REFERENCES materials(id),expected REAL NOT NULL,counted REAL NOT NULL,UNIQUE(stocktake_id,material_id));
CREATE TABLE IF NOT EXISTS technical_signoffs(id INTEGER PRIMARY KEY,document_number TEXT NOT NULL,team_id INTEGER NOT NULL REFERENCES teams(id),work_reference TEXT DEFAULT '',notes TEXT DEFAULT '',status TEXT DEFAULT 'Pending',evidence_filename TEXT,evidence_mime TEXT,evidence_data TEXT,created_by INTEGER REFERENCES users(id),reviewed_by INTEGER REFERENCES users(id),created_at TEXT DEFAULT CURRENT_TIMESTAMP,reviewed_at TEXT,UNIQUE(team_id,document_number));
CREATE TABLE IF NOT EXISTS technical_signoff_lines(id INTEGER PRIMARY KEY,signoff_id INTEGER REFERENCES technical_signoffs(id),material_id INTEGER REFERENCES materials(id),qty REAL NOT NULL CHECK(qty>0),movement_id INTEGER REFERENCES movements(id),source_location TEXT,UNIQUE(signoff_id,material_id,source_location));
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS supplier_dispatches(id INTEGER PRIMARY KEY,supplier_id INTEGER NOT NULL REFERENCES suppliers(id),warehouse TEXT NOT NULL,reference TEXT NOT NULL,notes TEXT DEFAULT '',created_by INTEGER REFERENCES users(id),created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS supplier_dispatch_lines(id INTEGER PRIMARY KEY,dispatch_id INTEGER NOT NULL REFERENCES supplier_dispatches(id),material_id INTEGER NOT NULL REFERENCES materials(id),quantity REAL NOT NULL,movement_id INTEGER NOT NULL REFERENCES movements(id));
CREATE TABLE IF NOT EXISTS supplier_dispatch_returns(dispatch_id INTEGER NOT NULL REFERENCES supplier_dispatches(id),return_id INTEGER NOT NULL UNIQUE REFERENCES returns(id),PRIMARY KEY(dispatch_id,return_id));
CREATE TRIGGER IF NOT EXISTS no_movement_update BEFORE UPDATE ON movements BEGIN SELECT RAISE(ABORT,'Ledger is append-only'); END;
CREATE TRIGGER IF NOT EXISTS no_movement_delete BEFORE DELETE ON movements BEGIN SELECT RAISE(ABORT,'Ledger is append-only'); END;
CREATE TRIGGER IF NOT EXISTS no_audit_update BEFORE UPDATE ON audit BEGIN SELECT RAISE(ABORT,'Audit is append-only'); END;
CREATE TRIGGER IF NOT EXISTS no_audit_delete BEFORE DELETE ON audit BEGIN SELECT RAISE(ABORT,'Audit is append-only'); END;
`);if(!db.prepare("PRAGMA table_info(users)").all().some(c=>c.name==='deleted_at'))db.exec("ALTER TABLE users ADD COLUMN deleted_at TEXT");
if(!db.prepare("PRAGMA table_info(users)").all().some(c=>c.name==='avatar_path'))db.exec("ALTER TABLE users ADD COLUMN avatar_path TEXT");
if(!db.prepare("PRAGMA table_info(materials)").all().some(c=>c.name==='image_path'))db.exec("ALTER TABLE materials ADD COLUMN image_path TEXT");if(!db.prepare("PRAGMA table_info(technical_signoff_lines)").all().some(c=>c.name==='source_location'))db.exec("ALTER TABLE technical_signoff_lines ADD COLUMN source_location TEXT");const lineSchema=db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='technical_signoff_lines'").get()?.sql||'';
if(/UNIQUE\s*\(\s*signoff_id\s*,\s*material_id\s*\)/i.test(lineSchema)){
 db.exec(`BEGIN IMMEDIATE;
 CREATE TABLE technical_signoff_lines_new(
 id INTEGER PRIMARY KEY,
 signoff_id INTEGER REFERENCES technical_signoffs(id),
 material_id INTEGER REFERENCES materials(id),
 qty REAL NOT NULL CHECK(qty>0),
 movement_id INTEGER REFERENCES movements(id),
 source_location TEXT,
 UNIQUE(signoff_id,material_id,source_location));
 INSERT INTO technical_signoff_lines_new(id,signoff_id,material_id,qty,movement_id,source_location)
 SELECT id,signoff_id,material_id,qty,movement_id,source_location FROM technical_signoff_lines;
 DROP TABLE technical_signoff_lines;
 ALTER TABLE technical_signoff_lines_new RENAME TO technical_signoff_lines;
 COMMIT;`);
}
if(!db.prepare("PRAGMA table_info(technical_signoffs)").all().some(c=>c.name==='evidence_path'))db.exec("ALTER TABLE technical_signoffs ADD COLUMN evidence_path TEXT");for(const n of ['Fiber Optic','Coaxial','Customer Equipment','General'])db.prepare('INSERT OR IGNORE INTO categories(name) VALUES(?)').run(n);if(db.prepare('SELECT COUNT(*) n FROM warehouses').get().n===0 && !db.prepare("SELECT 1 FROM settings WHERE key='warehouses_seeded'").get()){for(const n of ['Main Warehouse','Quarantine','Defective','Repair'])db.prepare('INSERT OR IGNORE INTO warehouses(name) VALUES(?)').run(n);}db.prepare("INSERT OR IGNORE INTO settings(key,value) VALUES('warehouses_seeded','1')").run();return db;}
module.exports={openDb};
