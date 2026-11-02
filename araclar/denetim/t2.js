const fs=require('fs'), vm=require('vm');const D=require('./yol.js').ROOT+'';const ctx={console}; ctx.window=ctx; ctx.self=ctx; ctx.globalThis=ctx; vm.createContext(ctx);
for(const f of ['db.js','hv.js','lk.js','dialect.js']){ const t=Date.now(); vm.runInContext(fs.readFileSync(D+f,'utf8'),ctx,{filename:f}); console.log(f,Date.now()-t); }
