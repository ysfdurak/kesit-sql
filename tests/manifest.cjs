// Sürüm bildirimi (release-manifest.json) dosyalarla aynı mı: listedeki her dosyanın SHA-256 özeti tutmalı.
// Bir dosya değişip özet güncellenmezse CI durur. Güncellemek için özetleri yeniden hesaplayıp gönder.
const { createHash } = require('node:crypto');
const { readFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');
const root = join(__dirname, '..');
const m = JSON.parse(readFileSync(join(root, 'release-manifest.json'), 'utf8'));
const bad = [];
for (const [file, hash] of Object.entries(m.files)) {
  const p = join(root, file);
  if (!existsSync(p)) { bad.push(file + ' (dosya yok)'); continue; }
  if (createHash('sha256').update(readFileSync(p)).digest('hex') !== hash) bad.push(file);
}
if (bad.length) {
  console.error('release-manifest.json güncel değil: ' + bad.join(', '));
  process.exit(1);
}
console.log(`release-manifest.json: ${Object.keys(m.files).length} dosyanın özeti doğru.`);
