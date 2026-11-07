// Android প্রজেক্টে আযানের সাউন্ড, আইকন ও দরকারি পারমিশন বসায়
const fs = require('fs'), path = require('path');
const res = 'android/app/src/main/res';
const mk = d => fs.mkdirSync(d, { recursive: true });

// 1) আযান সাউন্ড
mk(`${res}/raw`);
fs.copyFileSync('adhan.mp3', `${res}/raw/adhan.mp3`);

// 2) নোটিফিকেশনের ছোট আইকন
mk(`${res}/drawable`);
fs.copyFileSync('ic_stat_noor.png', `${res}/drawable/ic_stat_noor.png`);

// 3) অ্যাপ আইকন (ডিফল্ট আইকন সরিয়ে নিজের আইকন)
for (const d of fs.readdirSync(res)) {
  if (d === 'mipmap-anydpi-v26' || d === 'mipmap-anydpi') fs.rmSync(path.join(res, d), { recursive: true, force: true });
}
for (const d of fs.readdirSync(res).filter(x => x.startsWith('mipmap-'))) {
  for (const n of ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png']) {
    const p = path.join(res, d, n);
    if (fs.existsSync(p)) fs.copyFileSync('icon-512.png', p);
  }
}

// 4) পারমিশন
const mf = 'android/app/src/main/AndroidManifest.xml';
let x = fs.readFileSync(mf, 'utf8');
const perms = [
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.SCHEDULE_EXACT_ALARM',
  'android.permission.USE_EXACT_ALARM',
  'android.permission.RECEIVE_BOOT_COMPLETED',
  'android.permission.VIBRATE',
  'android.permission.WAKE_LOCK',
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.ACCESS_FINE_LOCATION'
];
const add = perms.filter(p => !x.includes(`"${p}"`)).map(p => `    <uses-permission android:name="${p}" />`).join('\n');
x = x.replace('</manifest>', add + '\n</manifest>');
fs.writeFileSync(mf, x);
console.log('Android patch done');
