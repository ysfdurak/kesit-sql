const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),m=JSON.parse(fs.readFileSync(root+'/release-manifest.json','utf8'));
for(const [f,hash] of Object.entries(m.files))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex'),hash,f+' test edilen dosyadan farklı');
console.log(Object.keys(m.files).length+' dosya özeti doğrulandı.');
