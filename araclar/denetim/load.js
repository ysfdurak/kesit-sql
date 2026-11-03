const fs=require('fs'), vm=require('vm');
const D=require('./yol.js').ROOT+'';
const ctx={console}; ctx.window=ctx; ctx.self=ctx; ctx.globalThis=ctx;
vm.createContext(ctx);
for(const f of ['db.js','hv.js','lk.js','ik.js','bk.js','dialect.js','c1.js','c2.js','c3.js','c4.js','cx.js','c5.js','c6.js','c7.js','c8.js','c9.js','c10.js','c11.js','c12.js','c13.js','c14.js','c15.js','c16.js','c17.js','c18.js','c19.js','c20.js','c21.js','c22.js','c23.js','c24.js','c25.js','c26.js','c27.js','c28.js','c29.js','c30.js','c31.js','c32.js','c33.js','c34.js','c35.js','c36.js','plan-ciktilari.js','c37.js','c38.js','ipuclari.js']){
  try{ vm.runInContext(fs.readFileSync(D+f,'utf8'),ctx,{filename:f}); }catch(e){ console.error('LOADERR',f,e.message); }
}
module.exports=ctx;
