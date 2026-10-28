const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
test('navigation groups contain each requested page exactly once and keep permission restrictions',()=>{
 const code=fs.readFileSync(path.join(__dirname,'../public/js/app.js'),'utf8');
 const begin=code.indexOf('const navGroups='),end=code.indexOf('\nconst table=',begin);
 assert.ok(begin>=0&&end>begin);
 const nav=vm.runInNewContext(code.slice(begin,end)+'\n({navGroups,pages,adminOnlyPages,viewerPages})');
 assert.equal(nav.navGroups.length,7);
 const expected=['Dashboard','Reports','Audit Log','Inventory','Stock Movements','Balances','Stocktaking','Customer Returns','Materials','Supplier Receipts','Suppliers','Work Orders','Repairs','Technical Sign-off','Load Teams','Teams','Users','Warehouses','Categories','Devices','Settings','Backups'];
 assert.deepEqual([...nav.pages].sort(),[...expected].sort());
 assert.equal(new Set(nav.pages).size,expected.length);
 for(const p of ['Users','Audit Log','Backups','Settings'])assert.equal(nav.adminOnlyPages.has(p),true);
 for(const p of ['Materials','Supplier Receipts','Settings','Users','Load Teams'])assert.equal(nav.viewerPages.has(p),false);
});
