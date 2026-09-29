// Normalizes raw scraped lizingsauto.lv data into data/cars.json
import fs from 'node:fs';
const raw = [1, 2, 3].flatMap((n) => JSON.parse(fs.readFileSync(`data/raw${n}.json`, 'utf8')));
const WP = 'https://lizingsauto.lv/wp-content/uploads/';

const MAKE_FIX = { Mercedes: 'Mercedes-Benz', Mini: 'MINI', Zaz: 'ZAZ' };
const FUEL = { Dizelis: 'diesel', Benzīns: 'petrol', Elektro: 'electric', Hybrid: 'hybrid' };
const BODY = { Apvidus: 'suv', Universāls: 'wagon', Sedans: 'sedan', Hečbeks: 'hatchback', Kupeja: 'coupe', Minivens: 'minivan', Mikroautobuss: 'van' };
const GEAR = { Automāts: 'automatic', Manuāla: 'manual' };
const STATUS = { '': 'published', rezervēts: 'reserved', pārdots: 'sold' };

const MODEL_OVERRIDE = {
  'id3-pro-58-62kwh-150kw-melns': 'ID.3 Pro',
  'id3-pros-79-82kwh-150kw': 'ID.3 Pro S',
  'id3-pro-58-62kwh-150kw-2': 'ID.3 Pro',
  'vw-id4-gtx-4x4-pilnpiedzina-220kw': 'ID.4 GTX',
  'jauna-auto-status-pvn-cupra-born-58-62kwh-150kw': 'Born',
  'john-cooper-works-contryman-se-all4-plug-hibrids-facelift-modelis': 'Countryman JCW SE ALL4',
  'land-rover-facelift-hse-sdv6-range-rover-sport-3-0-dizelis-automats-188-kw': 'Range Rover Sport HSE SDV6',
  'land-rover-range-rover-4-4-dizelis-auto-teicama-stavokli': 'Range Rover Vogue SDV8',
  'land-rover-discovery-sport-awd-automats-2-0-dizelis-110kw': 'Discovery Sport',
  '90-gadu-kulta-auto-mercedes-benz-s500-w140-long-5-0-benzins-automats': 'S500 W140 Long',
  'mercedes-benz-e300de-hibrids-dizelis-2022-gads': 'E300de',
  'mercedes-benz-e300de-hibrids-dizelis-nav-jamaksa-celu-nodoklis-dinamisks-un-ekonomisks-auto': 'E300de',
  'mercedes-benz-eqb-300-4matic-4x4-pilnpiedzina-168kw': 'EQB 300 4MATIC',
  'jauns-auto-astra-gt-sports-tourer-1-2-turbo-benzins-automats': 'Astra GT Sports Tourer',
  'mazu-nobraukumu-vw-transporter-t6-2-0-dizelis-manuals': 'Transporter T6',
  'zaz-retro-auto': 'Zaporozhets (retro)',
  'tesla-model-y-rwd-255kw': 'Model Y',
  'bmw-g02-x4-2-0d-xdrive-m-sportpak-automats-nesen-ievests-un-bez-nobraukuma-pa-latviju': 'X4 20d xDrive (G02)',
  'bmw-x4-3-0d-xdrive-m-sportpak-190kw-automats': 'X4 30d xDrive',
  'bmw-x3-xdrive35d-m-paka-3-0-dizelis-automats-230kw': 'X3 xDrive35d',
  'bmw-x3-xdrive-2-0-dizelis-automats-135kw': 'X3 xDrive20d',
  'bmw-x1-xdrive23i-m-paka-2-0benzins-automats': 'X1 xDrive23i',
  'bmw-ix50-xdrive': 'iX xDrive50',
  'bmw-i4-edrive35-mpaka': 'i4 eDrive35',
  'bmw-i4-m50-x-drive-mpaka-tumsi-zils': 'i4 M50 xDrive',
  'bmw-530-facelift-f10-m-paka-3-0-dizelis-automats-190kw': '530d xDrive (F10)',
  'bmw-520-g31-2-0-dizelis-automats-140kw': '520d Touring (G31)',
  'bmw-220d-xdrive-grand-tourer-2-0-dizelis-140-kw-automats': '220d xDrive Gran Tourer',
  'bmw-e92-325i-3-0-benzins-n53-automats': '325i (E92)',
  'bmw-325-facelift-3-0-dizelis-automats': '325d Touring',
  'bmw-730d-facelift-3-0-dizelis-sedans-automats-170-kw': '730d',
  'bmw-m550-4-4-benzins-automats-sedans': 'M550i',
  'skoda-octavia-iv-plugin-hybrid-ar-1-4-benzina-elektro': 'Octavia IV iV',
  'subaru-crosstrek-2-0-benzins-hybrid-automats': 'Crosstrek e-Boxer',
  'kia-optima-sport-wagon-2-0-plug-hibrids': 'Optima Sportswagon PHEV',
  'kia-ev6-gt-line-awd-pilnpiedzinas-77-2kwh': 'EV6 GT-Line AWD',
  'fiat-ducato-bve-35-l3h2-100-elektro-79-kwh': 'E-Ducato L3H2',
  'peugeot-e208-gt-line-50kwh': 'e-208 GT Line',
  'audi-r8-4-2-quattro-individuals-mazu-nobraukumu': 'R8 4.2 quattro',
  'audi-a1-sportback-facelift-s-line-1-4-dizelis-automats': 'A1 Sportback S-Line',
  'alfa-romeo-giulia-q2-2-2-dizelis-132kw-automats-sedans': 'Giulia Q2',
  'pieejama-garantija-nissan-juke-1-5-dizelis-manuals': 'Juke',
  'opel-corsa-e-1-4-benzins-automats': 'Corsa E',
  'opel-insignia-limousine-hb-2-0-dizelis-manuals': 'Insignia',
  'ar-pvn-ford-transit-connect-1-6-dizelis-manuals': 'Transit Connect',
  'ar-pvn-citroen-berlingo-1-6-dizelis-manuals': 'Berlingo',
  'ar-pvn-subaru-xv-4x4-2-0-dizelis-manuals': 'XV',
  'vw-t4-2-4-dizelis-kemperis': 'Transporter T4 kemperis',
  'vw-multivan-t4-2-5-dizelis-manuals-75-kw': 'Multivan T4',
  'volvo-v-60-1-6-dizelis-manuals': 'V60',
  'ford-focus-st-2-0-turbo-benzins-184kw': 'Focus ST',
  'audi-a4-quattro-2-5-dizelis-automats': 'A4 Avant quattro S-Line',
  'audi-a4-sedans-2-0-dizelis-automats-2': 'A4 sedans',
  'audi-a4-sedans-2-0-dizelis-automats': 'A4 sedans',
  'audi-a4-s-line-3-0-dizelis-quattro-automats-176kw': 'A4 Avant quattro S-Line',
  'vw-passat-b8-facelift-1-5-benzins-sedans-automats-110-kw-loti-bagatigu-komplektaciju': 'Passat B8',
};

const MAKE_WORDS = /^(VW|Volkswagen|BMW|Bmw|Mercedes[- ]Benz|Mercedes|Audi|Subaru|Opel|Peugeot|Hyundai|Mazda|Ford|Citroen|Kia|KIA|Chrysler|Nissan|Volvo|Skoda|Tesla|Fiat|Land Rover|Alfa Romeo|Cupra|Mini|Zaz)\s+/i;

function deriveModel(slug, title) {
  if (MODEL_OVERRIDE[slug]) return MODEL_OVERRIDE[slug];
  let t = title.split(',')[0].replace(/\.$/, '').trim();
  t = t.replace(MAKE_WORDS, '').trim();
  return t;
}

const equipClean = (s) =>
  s.split(';').map((x) => x.trim()).filter((x) => x && !/:$/.test(x) && !/^(Cena norādīta ar PVN|Cana ar PVN|daudz citas ekstras)$/i.test(x));

const cars = raw.map((r, i) => {
  const [slug, title, price, old, monthly, make, year, fuelRaw, vol, bodyRaw, gearRaw, mileage, statusRaw, cons, badgesRaw, notes, equip, imgs] = r;
  const text = `${title} ${notes} ${equip}`;
  let fuel = FUEL[fuelRaw] || 'petrol';
  if (fuel === 'hybrid' && /plug|plugin|iv\b|phev|se all4|e300de/i.test(`${slug} ${title}`)) fuel = 'plugin_hybrid';
  const kw = (title.match(/(\d{2,3})\s*kW(?!h)/i) || notes.match(/(\d{2,3})\s*kW(?!h)/i) || [])[1];
  const awd = /4x4|awd|quattro|xdrive|x-drive|4matic|all4|pilnpiedzi/i.test(text);
  const badges = new Set(badgesRaw);
  if (/jauna\s*TA|svaiga\s*TA/i.test(text)) badges.add('fresh_ta');
  if (/jauns auto|jauna auto st/i.test(text)) badges.add('like_new');
  if (/mazu nobraukumu/i.test(text) || (mileage && mileage < 30000 && year >= 2019)) badges.add('low_mileage');
  if (price <= 5000) badges.add('low_price');
  let images = [];
  if (imgs.includes('|')) {
    const [folder, list] = imgs.split('|');
    images = list.split(',').map((n) => WP + folder + n);
  } else images = imgs.split(',').map((n) => (n.startsWith('http') ? n : WP + n));
  images = images.filter((u) => /\.(jpe?g|png|webp)$/i.test(u));
  // Put "Mango"/"MElektro" promo banners (leasing/EV promo cards) at the end
  const promo = images.filter((u) => /\/(Mango|MElektro)[^/]*$/.test(u));
  images = [...images.filter((u) => !promo.includes(u)), ...promo];
  const volNum = parseFloat(vol);
  return {
    legacy_slug: slug,
    slug,
    status: STATUS[statusRaw] || 'published',
    title,
    make: MAKE_FIX[make] || make,
    model: deriveModel(slug, title),
    year,
    fuel,
    engine_volume: fuel === 'electric' || !volNum || volNum < 0.9 ? null : volNum,
    power_kw: kw ? parseInt(kw) : null,
    body_type: BODY[bodyRaw] || 'sedan',
    transmission: GEAR[gearRaw] || (/autom/i.test(title) ? 'automatic' : 'manual'),
    drive: awd ? 'awd' : null,
    mileage,
    price,
    old_price: old && old > price ? old : null,
    vat_included: badges.has('vat'),
    consumption: cons,
    description: notes,
    equipment: [...new Set(equipClean(equip))],
    badges: [...badges].filter((b) => b !== 'vat'),
    images,
    featured: false,
    sort: i,
  };
});
// feature a handful of attractive published cars
const feat = ['bmw-x1-xdrive23i-m-paka-2-0benzins-automats', 'bmw-m550-4-4-benzins-automats-sedans', 'bmw-i4-edrive35-mpaka', 'mercedes-benz-e300de-hibrids-dizelis-2022-gads', 'subaru-crosstrek-2-0-benzins-hybrid-automats', 'jauna-auto-status-pvn-cupra-born-58-62kwh-150kw'];
cars.forEach((c) => (c.featured = feat.includes(c.slug)));
fs.writeFileSync('data/cars.json', JSON.stringify(cars, null, 1));
console.log(cars.length, 'cars;', cars.reduce((a, c) => a + c.images.length, 0), 'images');
for (const c of cars) console.log(c.status.padEnd(9), c.make.padEnd(13), c.model.padEnd(30), c.year, c.fuel.padEnd(13), c.power_kw ?? '-', c.drive ?? '', c.badges.join(','));
