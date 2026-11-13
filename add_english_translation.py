#!/usr/bin/env python3
"""index.html-এর ভেতরে পুরো ইংরেজি অনুবাদ (Sahih International) বসিয়ে দেয়।
ব্যবহার (ইন্টারনেট চালু অবস্থায়, index.html-এর পাশের ফোল্ডারে):
    python3 add_english_translation.py
অন্য ফাইল থেকে নিতে চাইলে:  python3 add_english_translation.py --json translation.json
(JSON = ১১৪টি তালিকার তালিকা, প্রতিটি আয়াতের লেখা; অথবা alquran.cloud-এর /quran/ আউটপুট)"""
import json, re, sys, shutil, urllib.request
html = sys.argv[sys.argv.index('--html')+1] if '--html' in sys.argv else 'index.html'
if '--json' in sys.argv:
    data = json.load(open(sys.argv[sys.argv.index('--json')+1], encoding='utf-8'))
else:
    req = urllib.request.Request('https://api.alquran.cloud/v1/quran/en.sahih', headers={'User-Agent': 'Mozilla/5.0'})
    data = json.load(urllib.request.urlopen(req, timeout=120))
if isinstance(data, dict):
    data = [[a['text'] for a in s['ayahs']] for s in data['data']['surahs']]
assert len(data) == 114 and sum(map(len, data)) == 6236, 'ডাটা ঠিক নেই (১১৪ সূরা / ৬২৩৬ আয়াত হওয়ার কথা)'
blob = json.dumps(data, ensure_ascii=True, separators=(',', ':')).replace('</', '<\\/')
t = open(html, encoding='utf-8', newline='').read()
pat = re.compile(r'(<script type="application/json" id="qr-en">).*?(</script>)', re.S)
assert pat.search(t), 'index.html-এ qr-en ব্লক নেই'
shutil.copy(html, html + '.bak')
open(html, 'w', encoding='utf-8', newline='').write(pat.sub(lambda m: m.group(1) + blob + m.group(2), t, count=1))
print('হয়েছে! পুরনো ফাইল', html + '.bak', 'নামে রাখা আছে।')
