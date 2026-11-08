const {JSDOM,requestInterceptor,VirtualConsole}=require('jsdom');
const assert=require('assert'),fs=require('fs'); const ROOT=process.env.KESIT_KOK || require('path').resolve(__dirname,'../../..');

(async()=>{
 const errors=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Not implemented|Could not load link/.test(e.message))errors.push(e.message);});
 const dom=new JSDOM(fs.readFileSync(ROOT+'/index.html','utf8').replace('fromHash();\n})();','fromHash();\nwindow.__testEval = code => eval(code);\n})();'),{url:'http://127.0.0.1:8812/index.html',runScripts:'dangerously',resources:{interceptors:[requestInterceptor(req=>new Response(req.url.startsWith('http://127.0.0.1:8812/')?fs.readFileSync(ROOT+new URL(req.url).pathname):'',{headers:{'Content-Type':'application/javascript'}}))]},pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  w.fetch=async(url,opt)=>new Response(fs.readFileSync(ROOT+new URL(url,w.location.href).pathname));for(const k of ['TextDecoder','TextEncoder','DecompressionStream','CompressionStream','Response','Request','Headers'])w[k]=global[k];
  w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});w.scrollTo=()=>{};w.ResizeObserver=class{observe(){}disconnect(){}};
  w.localStorage.setItem('sqlpatika.v1',JSON.stringify({done:{},ex:{},xp:0,dialect:'sqlite',dialectChosen:true,goalChosen:true}));
 }});
 const w=dom.window;const deadline=Date.now()+180000;while(!/hazır/.test(w.document.querySelector('#sideStats')?.textContent||'')){if(Date.now()>deadline)throw Error('Engine timeout '+errors.join(';'));await new Promise(r=>setTimeout(r,250));}
 console.log('Loaded',w.SQLP_SABIT_HEDEFLER.length,'targets');
 async function nav(hash){w.location.hash=hash;await new Promise(r=>setTimeout(r,20));}
 async function submit(code){w.__testEval('ED.set('+JSON.stringify(code)+'); submitEx();');return w.document.querySelector('#fb').textContent;}
 const sol=w.SQLP_LESSONS.find(x=>x.id==='alias-distinct').ex[0].sol;
 await nav('ders-alias-distinct/1');
 const fake=w.__testEval(`(()=>{const e=SQLP_LESSONS.find(x=>x.id==='alias-distinct').ex[0],db=fresh(),r=run(db,e.sol,'sqlite');db.close();return lastSet(r).values.map(x=>"SELECT '"+x[0].replace(/'/g,"''")+"' AS segment FROM (SELECT 1 FROM customers LIMIT 1)").join(' UNION ALL ');})()`);
 let feedback=await submit(fake);assert(!feedback.includes('Doğru!'),feedback);assert.equal(w.__testEval("P.ex['alias-distinct:0']||0"),0);console.log('Literal rejected, progress unchanged');
 const disguised=fake.replace(/SELECT ('[^']*') AS segment/g,'SELECT CASE WHEN COUNT(*) >= 0 THEN $1 ELSE $1 END AS segment').replace(/FROM \(SELECT 1 FROM customers LIMIT 1\)/g,'FROM customers');
 w.__testEval('window._originalRun=DX.runDialect; window._originalVariant=DX.varyantFail; DX.varyantFail=()=>"TEST hidden guard"; DX.runDialect=function(...args){const r=_originalRun(...args);r.ms=3001;return r;};');
 feedback=await submit(sol);assert(feedback.includes('TEST hidden guard'),feedback);console.log('Variant control runs above 2 seconds'); w.__testEval('DX.runDialect=_originalRun; DX.varyantFail=_originalVariant;');
 feedback=await submit(sol);assert(feedback.includes('Doğru!'),feedback);console.log('Valid solution accepted');
 await nav('ders-performans-lab/1');
 const p=w.SQLP_LESSONS.find(x=>x.id==='performans-lab').ex[0];feedback=await submit(p.sol.slice(p.sol.indexOf('EXPLAIN')));assert(!feedback.includes('Doğru!'),feedback);console.log('Missing index rejected');
 feedback=await submit(p.sol);assert(feedback.includes('Doğru!'),feedback);console.log('Real EXPLAIN with index accepted');
 w.__testEval(`EX={items:['t004'],codes:["SELECT 'Ankara' AS city FROM customers LIMIT 1;"],d:'sqlite'};`);
 assert.equal(w.__testEval('gradeCode()[0].ok'),false);console.log('Code exam uses shared checks');
 w.__testEval(`EX={items:['op22'],codes:[SQLP_PRACTICE.find(x=>x.id==='op22').sol],d:'sqlite'};`); assert.equal(w.__testEval('gradeCode()[0].ok'),true);console.log('Valid plan exam accepted');
 assert.deepEqual(errors,[]);console.log('UI HATA 0');w.close();
})().catch(e=>{console.error(e);process.exit(1);});
