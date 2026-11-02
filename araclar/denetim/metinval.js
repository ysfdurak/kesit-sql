/* Kesit SQL ayarları: yazarın HTML'i ham basılan alanlar (RAW), kaçışlanan alanlar (ESC). */
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
require('./metinval_core.js')({
  root:require('./yol.js').ROOT, wait:4000, dump:process.env.DUMP,
  RAW:['SQLP_LESSONS[].ex[].hint','SQLP_LESSONS[].ex[].q','SQLP_LESSONS[].ex[].why','SQLP_LESSONS[].ex[].o[]','SQLP_PRACTICE[].q','SQLP_PRACTICE[].hint','SQLP_EXAMS[].qs[].q','SQLP_EXAMS[].qs[].o[]','SQLP_EXAMS[].qs[].w','SQLP_ARENA.ch[].q','SQLP_ARENA.det[].intro','SQLP_ARENA.det[].outro','SQLP_ARENA.det[].steps[].q'],
  ESC:['SQLP_ARENA.ch[].hint','SQLP_ARENA.pred[].why'],
  async dom(p,scan){
    const go=async h=>{ await p.evaluate(x=>{location.hash=x},h); await sleep(120); };
    const pick=await p.evaluate(()=>{ const o=[]; SQLP_LESSONS.forEach(l=>(l.ex||[]).forEach((e,i)=>{ if(e.t!=='mc'&&e.hint&&/<code>|&lt;/.test(e.hint)) o.push([l.id,i+1]); })); return o.filter((x,i)=>i%25===0); });
    for(const [id,i] of pick){ await go('#ders-'+id+'/'+i); const b=await p.$('[data-act="hint"]'); if(b) await b.click(); await sleep(40); await scan('#fb,.tip,#hintBox','ipucu '+id+'#'+i); }
  }
});
