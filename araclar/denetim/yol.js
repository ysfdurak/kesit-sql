// Ortak yollar: depo kökü (site dosyaları) ve çıktı klasörü. Ortam değişkenleriyle değiştirilebilir.
const path=require('path'), fs=require('fs');
const ROOT=path.resolve(process.env.KESIT_KOK||path.join(__dirname,'..','..'))+'/';
const OUT=path.resolve(process.env.KESIT_CIKTI||path.join(__dirname,'cikti'));
fs.mkdirSync(OUT,{recursive:true});
module.exports={ROOT,OUT};
