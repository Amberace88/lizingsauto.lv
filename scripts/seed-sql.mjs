import fs from 'node:fs';
const cars = JSON.parse(fs.readFileSync('data/cars.json', 'utf8'));
const q = (v) => (v === null || v === undefined ? 'null' : typeof v === 'number' || typeof v === 'boolean' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const arr = (a) => `array[${a.map(q).join(',')}]::text[]`;
let sql = '-- 69 automašīnas no vecās lizingsauto.lv lapas\nbegin;\n';
for (const c of cars) {
  const cols = ['slug','legacy_slug','status','title','make','model','year','fuel','engine_volume','power_kw','body_type','transmission','drive','mileage','price','old_price','vat_included','consumption','description','featured','sort'];
  sql += `with c as (insert into public.cars(${cols.join(',')},equipment,badges,published_at${c.status==='sold'?',sold_at':''}) values (${cols.map((k) => q(c[k])).join(',')},${arr(c.equipment)},${arr(c.badges)},now()${c.status==='sold'?',now()':''}) on conflict (slug) do nothing returning id)\n`;
  sql += `insert into public.car_images(car_id,url,source_url,sort) select c.id, v.u, v.u, v.s from c, (values ${c.images.map((u, i) => `(${q(u)},${i})`).join(',')}) as v(u,s);\n`;
}
sql += 'commit;\n';
fs.writeFileSync('supabase/seed.sql', sql);
console.log('seed.sql', (sql.length / 1024).toFixed(0), 'KB');
