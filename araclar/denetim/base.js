// Denetim betikleri için hızlı taban: base.sqlite güncelse onu kullan
const fs=require('fs');
module.exports=(SQL,c)=>{ const f=__dirname+'/base.sqlite', hf=__dirname+'/base.hash'; if(fs.existsSync(f)&&fs.existsSync(hf)&&fs.readFileSync(hf,'utf8')===c.SQLP_SEED_HASH()) return new Uint8Array(fs.readFileSync(f)); const db=new SQL.Database(); c.SQLP_EXEC_SEED(db); const B=db.export(); db.close(); return B; };
