// Padomu raksti (SEO). Saturs glabājas kodā — vienkārši, ātri un bez papildu datubāzes.
export type Block =
  | { t: 'h2'; v: string }
  | { t: 'p'; v: string }
  | { t: 'ul'; v: string[] }
  | { t: 'ol'; v: string[] }
  | { t: 'tip'; v: string }
  | { t: 'cta'; v: string; href: string; label: string };

export type Article = { slug: string; title: string; description: string; date: string; tag: string; read: number; blocks: Block[] };

export const ARTICLES: Article[] = [
  {
    slug: 'ekii-atbalsts-elektroauto-soli-pa-solim',
    title: 'EKII atbalsts elektroauto iegādei 2026: soli pa solim',
    description: 'Cik lielu valsts atbalstu var saņemt elektroauto iegādei, kādas ir prasības auto un pircējam, un kā atbalstu apvienot ar līzingu.',
    date: '2026-09-29',
    tag: 'Elektroauto',
    read: 5,
    blocks: [
      { t: 'p', v: 'Emisijas kvotu izsolīšanas instrumenta (EKII) programma ļauj privātpersonām saņemt valsts atbalstu jauna vai lietota elektroauto iegādei. Programmu administrē Vides investīciju fonds, un to regulē MK noteikumi Nr. 238 (21.04.2026). Pieteikties var līdz 2029. gada beigām vai kamēr pietiek finansējuma.' },
      { t: 'h2', v: 'Cik liels ir atbalsts' },
      { t: 'ul', v: ['Jauns elektroauto vai plug-in hibrīds — 4000 €', 'Lietots elektroauto — 3000 €', 'Goda ģimenei (auto ar 5+ sēdvietām) — 6750 € jaunam, 5000 € lietotam', 'Goda ģimenei (auto ar 7+ sēdvietām) — 9000 € jaunam, 6750 € lietotam', '+1000 € par katru bērnu, sākot ar ceturto', '+2000 €, nododot veco iekšdedzes auto utilizācijā vai Ukrainas armijai'] },
      { t: 'tip', v: 'Kopējais atbalsts nedrīkst pārsniegt 90% no auto pārdošanas cenas. Lētākam auto un daudzbērnu ģimenēm tas nozīmē, ka valsts var apmaksāt lielāko daļu cenas.' },
      { t: 'h2', v: 'Prasības auto' },
      { t: 'ul', v: ['Cena līdz 45 000 € bez PVN (auto ar 6+ sēdvietām — līdz 60 000 €)', 'Lietotam: ne vecāks par 7 gadiem un nobraukums līdz 150 000 km', 'Lietotam: Latvijā reģistrēts ne ilgāk par 12 mēnešiem — tāpēc no Eiropas ievesti auto parasti der', 'Plug-in hibrīdiem atbalsts pieejams tikai jauniem auto'] },
      { t: 'h2', v: 'Prasības pircējam' },
      { t: 'ul', v: ['Privātpersona — Latvijas pastāvīgais iedzīvotājs', 'Viens auto ar atbalstu uz personu', 'Auto jāpatur 5 gadus vai līdz 60 000 km un to nedrīkst izmantot saimnieciskajā darbībā'] },
      { t: 'h2', v: 'Kā notiek iegāde' },
      { t: 'ol', v: ['Izvēlies auto un pārbaudi atbilstību — mūsu kalkulators to parāda uzreiz.', 'Mēs sagatavojam rēķinu un pieteikuma dokumentus.', 'Ja pērc līzingā, atbalsts samazina finansējamo summu un līdz ar to mēneša maksājumu.', 'Pēc apstiprinājuma saņem auto un paraksti līgumu.'] },
      { t: 'cta', v: 'Aprēķini savu gala cenu ar atbalstu un līzinga maksājumu.', href: '/elektroauto#kalkulators', label: 'Atvērt EKII kalkulatoru' },
    ],
  },
  {
    slug: 'ka-parbaudit-lietotu-auto-pirms-pirkuma',
    title: 'Kā pārbaudīt lietotu auto pirms pirkuma: 12 punktu saraksts',
    description: 'Praktisks saraksts, ko pārbaudīt pirms lietota auto iegādes: dokumenti, nobraukums, OCTA, tehniskais stāvoklis un testa brauciens.',
    date: '2026-09-29',
    tag: 'Padomi',
    read: 6,
    blocks: [
      { t: 'p', v: 'Lietots auto var būt lielisks pirkums, ja zini, uz ko skatīties. Šis saraksts palīdzēs izvairīties no dārgiem pārsteigumiem — neatkarīgi no tā, vai pērc no privātpersonas vai tirgotāja.' },
      { t: 'h2', v: 'Dokumenti un vēsture' },
      { t: 'ol', v: ['Salīdzini VIN kodu uz auto ar reģistrācijas apliecību.', 'Pārbaudi nobraukuma vēsturi CSDD tehniskās apskates ierakstos — nobraukumam jāaug secīgi.', 'Pārbaudi, vai auto ir spēkā esoša OCTA (LTAB bezmaksas pārbaude).', 'Pajautā servisa vēsturi, rēķinus un cik īpašnieku bijis.'] },
      { t: 'cta', v: 'OCTA, nobraukumu un nodokli vari pārbaudīt bez maksas.', href: '/parbaudes', label: 'Bezmaksas pārbaudes' },
      { t: 'h2', v: 'Virsbūve un salons' },
      { t: 'ol', v: ['Apskati spraugas starp detaļām un krāsas toni — atšķirības var liecināt par remontu.', 'Pārbaudi rūsu sliekšņos, riteņu arkās un zem durvīm.', 'Salona nolietojumam (stūre, sēdekļi, pedāļi) jāatbilst nobraukumam.', 'Ieslēdz visas elektrosistēmas: logus, kondicionieri, multimediju, apsildes.'] },
      { t: 'h2', v: 'Tehnika un testa brauciens' },
      { t: 'ol', v: ['Aukstā dzinēja iedarbināšana — vai nav trokšņu un dūmu.', 'Ātrumkārbai jāpārslēdzas vienmērīgi, bez raustīšanās.', 'Braucot taisni, auto nedrīkst vilkt uz sāniem; bremzējot — nedrīkst vibrēt.', 'Pārbaudi auto neatkarīgā servisā — tas maksā mazāk nekā viens neparedzēts remonts.'] },
      { t: 'tip', v: 'Pie mums katru auto vari pārbaudīt servisā pēc savas izvēles un pieteikt testa braucienu. Daudziem auto lapā redzama arī CSDD nobraukuma vēsture.' },
      { t: 'cta', v: 'Apskati pārbaudītus auto ar līzingu.', href: '/katalogs', label: 'Auto katalogs' },
    ],
  },
  {
    slug: 'lizings-ar-sabojatu-kreditvesturi',
    title: 'Auto līzings ar sabojātu kredītvēsturi — vai tas iespējams?',
    description: 'Kā iegādāties auto līzingā, ja bankā atteica: no kā atkarīgs lēmums, ko sagatavot un kā palielināt izredzes.',
    date: '2026-09-29',
    tag: 'Līzings',
    read: 4,
    blocks: [
      { t: 'p', v: 'Bankas atteikums nenozīmē, ka auto līzingā nav iespējams. Līzinga devēji vērtē riskus dažādi — daļa strādā arī ar klientiem, kuriem pagātnē bijuši kavējumi. Mēs sadarbojamies ar vairākiem līzinga devējiem un meklējam risinājumu katram.' },
      { t: 'h2', v: 'No kā atkarīgs lēmums' },
      { t: 'ul', v: ['Pašreizējie regulārie ienākumi un to stabilitāte', 'Esošās kredītsaistības un to maksājumi mēnesī', 'Vai kavējumi ir vēsturiski un nokārtoti, vai joprojām aktīvi', 'Pirmās iemaksas apmērs un izvēlētā auto cena'] },
      { t: 'h2', v: 'Kā palielināt izredzes' },
      { t: 'ol', v: ['Izvēlies auto, kura mēneša maksājums nepārsniedz aptuveni trešdaļu no neto ienākumiem.', 'Ja iespējams, veic lielāku pirmo iemaksu — arī vecais auto var būt iemaksa.', 'Sagatavo ienākumus apliecinošus dokumentus (konta izraksts, darba līgums).', 'Norādi patiesu informāciju — tas paātrina izskatīšanu.'] },
      { t: 'cta', v: 'Aprēķini, cik dārgu auto vari atļauties pēc saviem ienākumiem.', href: '/kalkulatori#budzets', label: 'Budžeta kalkulators' },
      { t: 'tip', v: 'Pieteikuma izskatīšana ir bezmaksas un tevi ne pie kā nesaista. Parasti atbildi sniedzam tās pašas dienas laikā.' },
      { t: 'cta', v: 'Aizpildi līzinga pieteikumu dažās minūtēs.', href: '/lizings#pieteikums', label: 'Pieteikties līzingam' },
    ],
  },
  {
    slug: 'auto-lizings-stradajot-arzemes',
    title: 'Auto līzings, strādājot ārzemēs: kā tas notiek',
    description: 'Vai var saņemt auto līzingu Latvijā, ja strādā Norvēģijā, Vācijā vai citur ārzemēs? Kādi dokumenti vajadzīgi un kā noformēt attālināti.',
    date: '2026-09-29',
    tag: 'Līzings',
    read: 4,
    blocks: [
      { t: 'p', v: 'Daudzi latvieši strādā ārzemēs, bet auto vēlas iegādāties un reģistrēt Latvijā. Tas ir iespējams — ārzemēs gūtie ienākumi var būt pamats līzingam, ja tos var apliecināt.' },
      { t: 'h2', v: 'Kas parasti nepieciešams' },
      { t: 'ul', v: ['Personu apliecinošs dokuments', 'Darba līgums vai darba devēja izziņa', 'Algas izraksti vai bankas konta izraksts par pēdējiem mēnešiem', 'Kontaktinformācija Latvijā un ārzemēs'] },
      { t: 'tip', v: 'Precīzs dokumentu saraksts atkarīgs no līzinga devēja. Mēs pateiksim, kas tieši vajadzīgs tavā gadījumā, un palīdzēsim visu sagatavot.' },
      { t: 'h2', v: 'Kā noformēt, ja esi ārzemēs' },
      { t: 'ol', v: ['Izvēlies auto katalogā un nosūti pieteikumu tiešsaistē.', 'Dokumentus vari atsūtīt elektroniski.', 'Kad lēmums pieņemts, auto sagatavojam, un to vari saņemt, atbraucot uz Latviju.'] },
      { t: 'cta', v: 'Piesakies līzingam — izskatīšana bez maksas.', href: '/lizings#pieteikums', label: 'Pieteikties līzingam' },
    ],
  },
  {
    slug: 'ka-izveleties-lietotu-elektroauto',
    title: 'Kā izvēlēties lietotu elektroauto: baterija, nobraukums, uzlāde',
    description: 'Uz ko skatīties, pērkot lietotu elektroauto: baterijas stāvoklis, reālais nobraukums ar uzlādi, uzlādes iespējas un EKII atbalsts.',
    date: '2026-09-29',
    tag: 'Elektroauto',
    read: 5,
    blocks: [
      { t: 'p', v: 'Lietots elektroauto var būt ļoti izdevīgs — īpaši kopā ar EKII atbalstu. Tomēr izvēlē ir dažas lietas, kas iekšdedzes auto nav tik svarīgas.' },
      { t: 'h2', v: 'Baterijas stāvoklis' },
      { t: 'p', v: 'Baterija ir dārgākā elektroauto daļa. Pajautā baterijas stāvokļa (SOH) rādījumu un pārbaudi, vai vēl ir spēkā ražotāja baterijas garantija — daudziem ražotājiem tā ir 8 gadi vai 160 000 km.' },
      { t: 'h2', v: 'Reālais nobraukums ar vienu uzlādi' },
      { t: 'p', v: 'Ražotāja norādītais nobraukums ir ideālos apstākļos. Ziemā un uz šosejas reālais nobraukums parasti ir ievērojami mazāks. Izvēlies auto ar rezervi saviem ikdienas braucieniem.' },
      { t: 'h2', v: 'Uzlāde' },
      { t: 'ul', v: ['Vai vari uzlādēt mājās vai darbā — tas ir lētākais variants', 'Kāda ir maksimālā ātrās uzlādes jauda (kW) garākiem braucieniem', 'Vai auto ir siltumsūknis — tas uzlabo nobraukumu ziemā'] },
      { t: 'h2', v: 'Izmaksas' },
      { t: 'p', v: 'Elektroauto ir atbrīvoti no transportlīdzekļa ekspluatācijas nodokļa, un apkope parasti ir vienkāršāka. Salīdzini ikmēneša izmaksas ar mūsu kalkulatoru.' },
      { t: 'cta', v: 'Salīdzini degvielas un elektrības izmaksas.', href: '/kalkulatori#izmaksas', label: 'Izmaksu kalkulators' },
      { t: 'cta', v: 'Apskati elektroauto, kuriem pieejams EKII atbalsts.', href: '/lietoti-auto/elektroauto', label: 'Lietoti elektroauto' },
    ],
  },
  {
    slug: 'ka-atri-pardot-savu-auto',
    title: 'Kā ātri un izdevīgi pārdot savu auto',
    description: 'Pārdot pašam, atstāt tirgotājam vai ieskaitīt kā pirmo iemaksu — salīdzinām iespējas un dodam padomus labākai cenai.',
    date: '2026-09-29',
    tag: 'Padomi',
    read: 4,
    blocks: [
      { t: 'p', v: 'Auto pārdošana pašam var aizņemt nedēļas: sludinājumi, zvani, apskates un kaulēšanās. Ir arī ātrāki ceļi — atkarībā no tā, kas tev svarīgāk: laiks vai maksimālā cena.' },
      { t: 'h2', v: 'Trīs iespējas' },
      { t: 'ul', v: ['Pārdot pašam — potenciāli augstāka cena, bet vairāk laika un risku', 'Pārdot tirgotājam — nauda uzreiz, bez sludinājumiem un svešiem cilvēkiem', 'Ieskaitīt kā pirmo iemaksu jaunākam auto — viss vienā darījumā'] },
      { t: 'h2', v: 'Kā iegūt labāku cenu' },
      { t: 'ol', v: ['Nomazgā auto un iztīri salonu — pirmais iespaids ietekmē cenu.', 'Sagatavo servisa vēsturi, abas atslēgas un riepu komplektus.', 'Novērs sīkus defektus, ja to cena ir neliela.', 'Salīdzini cenas līdzīgiem auto sludinājumos.'] },
      { t: 'cta', v: 'Saņem bezmaksas novērtējumu — atbildēsim 24 stundu laikā.', href: '/auto-novertejums', label: 'Novērtēt manu auto' },
    ],
  },
  {
    slug: 'pagarinata-garantija-lietotam-auto',
    title: 'Pagarinātā garantija lietotam auto — vai tā atmaksājas?',
    description: 'Ko sedz pagarinātā garantija, cik maksā tipiski remonti un kad garantija ir izdevīga lietota auto pircējam.',
    date: '2026-09-29',
    tag: 'Garantija',
    read: 4,
    blocks: [
      { t: 'p', v: 'Lietota auto lielākais risks ir negaidīts dārgs remonts — dzinējs, ātrumkārba, turbokompresors. Pagarinātā garantija šos riskus sedz par fiksētu cenu.' },
      { t: 'h2', v: 'Ko parasti sedz' },
      { t: 'ul', v: ['Dzinēja un pārnesumkārbas iekšējās detaļas', 'Diferenciālis un piedziņa', 'Plašākos plānos — turbo, stūres iekārta, elektronika, kondicionieris', 'Evakuators, ja auto nevar pārvietoties'] },
      { t: 'h2', v: 'Kad tā ir izdevīga' },
      { t: 'p', v: 'Garantija ir īpaši vērtīga auto ar lielāku nobraukumu un sarežģītu tehniku, kur viens remonts var izmaksāt vairāk nekā garantija visam termiņam. Mēs piedāvājam garantiju sadarbībā ar Mango Insurance līdz 36 mēnešiem, un to var iekļaut līzingā.' },
      { t: 'cta', v: 'Aprēķini, kāds plāns der tavam auto.', href: '/garantija#kalkulators', label: 'Garantijas kalkulators' },
    ],
  },
];

export const articleBySlug = (s: string) => ARTICLES.find((a) => a.slug === s);
