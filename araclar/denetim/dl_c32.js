const c=require('./load.js');
const ids=process.argv[2].split(',');
for(const id of ids){const l=c.SQLP_LESSONS.find(x=>x.id===id); if(!l){console.log('YOK',id);continue;}
console.log('=====',id,l.lv,l.mod,l.title,'| body',l.body.length);
const txt=l.body.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/g,(m,a)=>'\n[CODE '+(m.match(/data-\w+(="[^"]*")?/g)||[]).join(' ')+']\n'+a.replace(/&lt;/g,'<').replace(/&amp;/g,'&')+'\n[/CODE]\n').replace(/<h2>/g,'\n## ').replace(/<[^>]+>/g,' ').replace(/[ \t]+/g,' ');
console.log(process.env.FULL?txt:txt.slice(0,+process.env.N||2500));
(l.ex||[]).forEach((e,i)=>console.log(' EX'+(i+1),e.t,e.base||'',JSON.stringify(e.dl||''),(e.q||'').replace(/<[^>]+>/g,'').slice(0,200),'\n   SOL:',(e.sol||(e.o?JSON.stringify(e.o):'')).slice(0,300),e.check?'\n   CHECK:'+e.check:''));}
