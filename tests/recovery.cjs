/* Node 20+, dış bağımlılık yok. Kurtarma katmanının veri koruma sözleşmesi. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const file=process.argv[2]||'recovery.js',src=fs.readFileSync(path.resolve(file),'utf8');
const cfg=JSON.parse(src.split('\n')[0].replace(/^window.KESIT_RECOVERY_KEYS=/,'').replace(/;$/,''));
let tests=0;
for(const [key,spec] of Object.entries(cfg)){
 for(const bad of ['{"bad":','null',spec.array?'{}':'[]',spec.array?'1':'{"xp":"bad"}','{"__proto__":{"polluted":true}}']){
  const data=new Map([[key,bad],['healthy','keep']]);const native={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};
  const window={localStorage:native,KESIT_RECOVERY_KEYS:cfg};const context={window,document:{readyState:'loading',addEventListener(){}},Map,JSON,Number,Object,Array,Error};vm.runInNewContext(src,context);
  assert.equal(window.KESIT_STORAGE.isBlocked(key),true);assert.equal(window.KESIT_STORAGE.getItem(key),null);
  assert.equal(window.KESIT_STORAGE.setItem(key,'{}'),false);window.KESIT_STORAGE.removeItem(key);assert.equal(data.get(key),bad);assert.equal(data.get('healthy'),'keep');tests++;
 }
 const good=JSON.stringify(spec.array?[]:{xp:42,done:{},ex:{},days:{},drafts:{},sr:{},sc:{}}),data=new Map([[key,good]]);let quota=false;
 const window={localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>{if(quota)throw Error('quota');data.set(k,v)},removeItem:k=>data.delete(k)}};
 vm.runInNewContext(src,{window,document:{readyState:'loading',addEventListener(){}},Map,JSON,Number,Object,Array,Error});
 assert.equal(window.KESIT_STORAGE.isBlocked(),false);assert.equal(window.KESIT_STORAGE.getItem(key),good);assert.equal(window.KESIT_STORAGE.setItem(key,good),true);quota=true;assert.throws(()=>window.KESIT_STORAGE.setItem(key,good),/quota/);assert.equal(data.get(key),good);tests++;
}
console.log(`${tests} kurtarma veri koruma kontrolü geçti.`);
