// Android প্রজেক্টে আযানের সাউন্ড, আইকন, পারমিশন, ভার্সন ও সই বসায়
const fs = require('fs'), path = require('path');
const res = 'android/app/src/main/res';
const mk = d => fs.mkdirSync(d, { recursive: true });

// 1) আযান সাউন্ড
mk(`${res}/raw`);
fs.copyFileSync('adhan.mp3', `${res}/raw/adhan.mp3`);

// 2) নোটিফিকেশনের ছোট আইকন
mk(`${res}/drawable`);
fs.copyFileSync('ic_stat_noor.png', `${res}/drawable/ic_stat_noor.png`);

// 3) অ্যাপ আইকন
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

// 5) ভার্সন নম্বর ও স্থায়ী সই (build.gradle)
const gf = 'android/app/build.gradle';
let g = fs.readFileSync(gf, 'utf8');
const build = process.env.BUILD_NUMBER || '1';
g = g.replace(/versionCode\s+\d+/, `versionCode ${build}`).replace(/versionName\s+"[^"]*"/, `versionName "${build}"`);
if (process.env.KEYSTORE_PATH) {
  const signing = `signingConfigs {
        release {
            storeFile file(System.getenv("KEYSTORE_PATH"))
            storePassword System.getenv("KEYSTORE_PASSWORD")
            keyAlias "noor"
            keyPassword System.getenv("KEYSTORE_PASSWORD")
            storeType "pkcs12"
        }
    }
    buildTypes {`;
  g = g.replace(/buildTypes\s*\{/, signing);
  g = g.replace(/(buildTypes\s*\{\s*release\s*\{)/, '$1\n            signingConfig signingConfigs.release');
}
fs.writeFileSync(gf, g);
console.log('Android patch done, build', build);
