const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:900}});
 await p.route('**/config.js', async r=>{ const body=fs.readFileSync(require('./yol.js').ROOT+'config.js','utf8').replace("name: '',","name: 'Ad Soyad',").replace("linkedin: '',","linkedin: 'https://www.linkedin.com/in/ornek',").replace("github: '',","github: 'https://github.com/ornek',"); r.fulfill({contentType:'text/javascript', body}); });
 await p.goto('http://localhost:8765/index.html#hakkinda'); await p.waitForFunction(()=>document.querySelector('#sideStats .engine .dot.ok'),null,{timeout:180000}); await p.waitForTimeout(800);
 await p.screenshot({path:require('./yol.js').OUT+'/hakkinda-onizleme.png', fullPage:true});
 await p.setViewportSize({width:390,height:844}); await p.waitForTimeout(400); console.log('mobil sw', await p.evaluate(()=>document.documentElement.scrollWidth)); await b.close(); })();
