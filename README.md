# EduTizim — moliya moduli

Node.js + TypeScript + Express, MongoDB/Mongoose va React + TypeScript.

## O‘rnatish va ishga tushirish

Node.js 22+, MongoDB lokal server kerak. Yangi nusxada loyiha ildizidan:

```powershell
npm ci
npm ci --prefix backend
npm ci --prefix frontend
Copy-Item backend/.env.example backend/.env
npm run dev
```

Mavjud `backend/.env`ni ustidan yozmang. Lokal ulanish: `mongodb://127.0.0.1:27017/edutizim`.
Frontend: http://localhost:5173 (band bo‘lsa Vite boshqa portni ko‘rsatadi).
Backend: http://localhost:4000. Demo login: `admin / 123456`.

## Buyruqlar

- `npm run dev` — backend va frontend.
- `npm run build` — TypeScript va production frontend.
- `npm test` — moliyaviy stsenariylar, regressiya va HTTP integratsiya testlari. Har test fayli noyob `edutizim_test_*` bazasini yaratadi; faqat shu vaqtinchalik bazalar tozalanadi.
- `npm run seed` — alohida `edutizim_demo` bazasiga 3 yillik ma’lumot. Asosiy `edutizim` bazasi saqlanadi. Tugallangan demo qayta yozilmaydi, faqat tekshiriladi. Boshqa ma’lumotli yoki tugallanmagan demo bazaga yozish rad etiladi; yangi tajriba uchun `SEED_DB_NAME=edutizim_demo_2` kabi yangi nom ishlating.
- `npm run reconcile` — ulangan bazadagi barcha oylarni o‘zgartirmasdan tekshiradi. Xato bo‘lsa exit 1, aks holda exit 0.
- `npm run benchmark` — ulangan bazaning oxirgi oyi uchun uch endpointni HTTP orqali besh martadan o‘lchaydi, 1000 ms dan oshsa exit 1.

Demo bazani tekshirish va interfeysda ochish:

```powershell
npm run seed
$env:DB_NAME = 'edutizim_demo'
npm run reconcile
npm run benchmark
npm run dev
```

Oddiy bazaga qaytish uchun shu terminalda `Remove-Item Env:DB_NAME` ishlating. macOS/Linux’da `DB_NAME=edutizim_demo npm run dev`. Backend `MONGODB_URI`dan serverni, ixtiyoriy `DB_NAME`dan baza nomini oladi.

## Model tanlovi

Operatsiyalar manbalari: `CashTransaction`, `FinanceEvent`, yakunlangan `Lesson`.
Ular sanalar tartibida debet-kredit `JournalEntry` yozuvlariga aylantiriladi.
Har yozuvda debet = kredit, summalar butun so‘m. O‘quvchi/o‘qituvchi `balance` va `CenterAccount` tez ko‘rsatish uchun qayta hisoblanadigan qiymatlar; hisobotlarning haqiqat manbasi jurnal.

Jurnalni qayta hisoblash tarixiy to‘lov tahriridan keyin avans/qarz taqsimotini ham to‘g‘rilaydi.
Baza bo‘yicha writer lock parallel moliyaviy yozuvlarni navbatlaydi. Yangi jurnal va kunlik yig‘indilar yangi generation’da to‘liq tayyorlanib, faol generation bitta yozuv orqali almashtiriladi. Hisobotlar yarim yozilgan jurnalni o‘qimaydi; eski generation saqlanadi. Jarayon uzilsa manba operatsiyalari saqlanadi, keyingi backend startida qayta hisoblanadi. Bu MongoDB standalone bilan ishlaydi; source yozish va hisoblash yagona MongoDB transaction emas. Har bir qayta hisoblash to‘liq tarixni ko‘rib chiqadi, shuning uchun katta bazada yozish amali hisobot o‘qishidan sekinroq.

Dars daromadi darsning sanasiga yoziladi. Tugmani bosish vaqti audit uchun alohida. Dars yakunida o‘quvchilar, individual chegirmali summalar va o‘qituvchining hisoblangan ulushi muzlatiladi; keyingi narx/foiz o‘zgarishi eski darsga ta’sir qilmaydi. Eski yozuvlar ilk migratsiyada mavjud tarixiy summalar bilan snapshotga aylanadi. Moliyaviy tarixi bor guruh/o‘quvchi/o‘qituvchi yoki ishlatilgan xarajat asosini oddiy o‘chirish bloklanadi.

## Moliyaviy qoidalar

- O‘quvchi to‘lovi avval qarzni yopadi, ortig‘i oldindan to‘lov majburiyati.
- Dars o‘tilganda avans kamayadi yoki debitor qarz paydo bo‘ladi va daromad tan olinadi.
- Chegirma o‘quvchi formasida foiz bilan beriladi. Oylik chegirmali narx butun so‘mga yaxlitlanadi; darslarga bo‘lish qoldig‘i birinchi darslarga 1 so‘mdan taqsimlanadi.
- Foizli o‘qituvchi uchun darsda maosh hisoblanadi. Qat’iy oylik xodim uchun maosh foizini 0 qilib, Moliyaviy hodisalar → Ish haqi hisoblash orqali oy oxirida summa kiriting. Bitta ish haqini ikki usulda takror hisoblamang.
- Maosh to‘lovi majburiyatni yopadi, ortiqcha to‘lov o‘qituvchi avansi bo‘ladi; qayta P&L xarajati emas.
- Investor kapitali va kredit olish — moliyaviy kirim, daromad emas.
- Kredit to‘lovi Kassada ikki yozuv: asosiy qarz → moliyaviy chiqim/qarz kamayishi; foiz → operatsion chiqim/xarajat. Yillik foiz ma’lumot sifatida saqlanadi, bank hisoblagan haqiqiy foiz summasi kiritiladi.
- Jihoz → investitsion chiqim va asosiy vosita. Amortizatsiya hisoblanmaydi.
- Moliyaviy hodisalar → Inkassatsiya: kassa kamayadi, bank oshadi, umumiy pul oqimi va foyda o‘zgarmaydi.
- Barcha sanalar UTC kalendar kuni sifatida hisoblanadi. Davr oxiri to‘liq kunni o‘z ichiga oladi.
- O‘quvchi guruhdan chiqarilsa keyingi darslar uchun hisoblanmaydi; mavjud avans/qarz tarixi qoladi.

## Hisobot API

JWT `Authorization: Bearer TOKEN` orqali. Token `POST /api/auth/login`dan olinadi.

- `GET /api/reports/profit-loss?month=2025-12`
- `GET /api/reports/cash-flow?month=2025-12`
- `GET /api/reports/balance?date=2025-12-31`
- `GET /api/reports?from=2025-12-01&to=2025-12-31` — UI uchun umumiy javob.

P&L daromad, xarajatlar hisoblar bo‘yicha, jami xarajat va sof foydani beradi.
Pul oqimi boshlang‘ich/yakuniy haqiqiy qoldiq, uch toifa bo‘yicha kirim/chiqim va sof o‘zgarishni beradi.
Balans berilgan sanagacha aktiv, majburiyat va kapitalni ko‘rsatadi.

UI’da oy yoki sana oralig‘i barcha moliyaviy hisobotlarga tegishli. Shaxs, guruh, to‘lov turi, operatsiya turi va xarajat asosi **Operatsiyalar tafsiloti** uchun; to‘liq balansni shaxs filtri bilan aralashtirmaydi. Tafsilotlar oxirgi 200 yozuv bilan cheklangan, moliyaviy jamilar to‘liq davrdan hisoblanadi.

## Seed hajmi va o‘lchovlar

Deterministik davr: 2023-01–2025-12 (36 oy).
500 o‘quvchi (10% chegirmali qism, 3 oylik avans qiluvchilar, ayrim oylarda to‘lamaydiganlar), 20 xodim, 20 guruh.
Ish haqi keyingi oyning 5-sanasida; oxirgi dekabr oyligi davr oxirida majburiyat bo‘lib qoladi.
Ikki investor, 19-oyda qo‘shimcha kapital; bitta 18% kredit, har oy asosiy qarz/foiz to‘lovi; 240 mln boshlang‘ich jihoz; har oy ijara/elektr/kommunal/marketing va inkassatsiya.

| Ma’lumot | Soni |
|---|---:|
| Kassa operatsiyasi | 15 670 |
| Moliyaviy hodisa | 760 |
| Yakunlangan dars | 8 640 |
| Faol jurnal yozuvi | 25 070 |

2026-11-11, lokal Windows/Node 22/MongoDB, 2025-12 uchun HTTP javobi to‘liq o‘qilishigacha o‘lchandi. Har biri 5 marta:

| Endpoint | O‘lchovlar (ms) | Maksimum |
|---|---|---:|
| P&L | 75, 23, 20, 23, 20 | 75 ms |
| Pul oqimi | 25, 22, 18, 23, 18 | 25 ms |
| Balans | 19, 17, 20, 20, 16 | 20 ms |

Optimallashtirish: har hisobotda barcha dars/student qatorlarini yuklash o‘rniga generation bo‘yicha kunlik hisob yig‘indilari `LedgerDaily`da tayyorlanadi; hisobot MongoDB aggregation orqali yig‘adi. Jurnal generation/date indekslari ishlatiladi. Bu aynan 3 yillik hajmda har hisobotni 1 soniyadan tez qiladi; boshqa kompyuterda `benchmark`ni takrorlang.

## Tekshiruv ishonchliligi

`reconcile` jurnalni qayta yaratmaydi. Har bir manba uchun jurnal mavjudligi, qatorlar debet/kredit tengligi, butun so‘m summalar va kunlik yig‘indilarning asl jurnalga mosligini tekshiradi. Har kalendar oy (operatsiyasiz oraliq oy ham) uchun:

1. Aktivlar = majburiyatlar + kapital.
2. Boshlang‘ich pul + operatsion + investitsion + moliyaviy = yakuniy pul.
3. Oylik sof foyda = taqsimlanmagan foydaning o‘zgarishi.

Demo bazada 36 oy, uchala tenglik uchun 0 xato va 0 farq. Besh TZ stsenariysi va qo‘shimcha yaxlitlash/chegirma, kech belgilash, inkassatsiya, parallel qayta hisoblash, buzilgan jurnal va HTTP orqali Kassa tahriri testlari mavjud. Moslashtiruvchi balans qatori ishlatilmaydi.

Git repository/commitlar va ekran yozuvi foydalanuvchining keyingi ishi sifatida qoldirilgan.

