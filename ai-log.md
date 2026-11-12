# EduTizim — AI bilan ishlash hisoboti

## Maqsad va qo‘llanish doirasi

Loyihada OpenAI Codex talablarni tahlil qilish, kod yozish va qayta ishlash, xatolarni aniqlash hamda avtomatlashtirilgan tekshiruvlarni bajarish uchun ishlatildi. Ish React + TypeScript frontend, Express + TypeScript backend va MongoDB ma’lumotlar modelini qamrab oldi.

Vazifalar bosqichma-bosqich berildi: avval boshqaruv interfeysi, keyin dars va kassa operatsiyalari, so‘ng moliyaviy hisobotlar va texnik topshiriqdagi hisoblash misollariga muvofiqlik. AI taklifining to‘g‘riligi faqat javob matniga qarab emas, kod, test natijalari va bazadagi hisoblar orqali baholandi.

## Asosiy topshiriqlar va natijalar

Quyidagilar suhbatdagi so‘rovlarning mazmunan tahrirlangan bayonidir; ular so‘zma-so‘z prompt nusxalari emas.

| Bosqich | AI’ga berilgan vazifa | Natija |
|---|---|---|
| Loyiha asoslari | React va Node.js loyihasi, administrator kirishi va MongoDB ulanishini tayyorlash | Frontend/backend tuzilmasi, autentifikatsiya va baza konfiguratsiyasi |
| O‘quv jarayoni | O‘quvchi, o‘qituvchi, guruh va darslarni boshqarish | CRUD, modal formalar, jadvaldan dars sanalarini shakllantirish |
| Kassa | To‘lov, maosh va xarajatlarni hisobga olish, operatsiyalarni tahrirlash | To‘lov turlari, qarz/avans hisobi va tarixiy tahrirdan keyingi qayta hisoblash |
| Talablar auditi | Dastur natijalarini TZ’dagi misollar bilan solishtirish | To‘lov/daromad, hisoblangan/to‘langan maosh, kredit asosiy qarzi/foizini ajratish |
| Moliyaviy model | Auditda aniqlangan kamchiliklarni tuzatish | Debet/kredit jurnali, davr bo‘yicha hisobotlar va tarixiy dars summalarini saqlash |
| Yakuniy tekshiruv | Git va ekran yozuvidan tashqari qolgan topshiriqlarni bajarish | Uch yillik demo, testlar, reconcile, HTTP tezlik o‘lchovi va hujjatlar |

## Muhim texnik qarorlar

**Hisoblarning asosiy manbasi — jurnal.** Dastlabki balans maydonlariga tayangan yondashuv hisobotlar uchun yetarli emasligi aniqlandi. Kassa operatsiyalari, moliyaviy hodisalar va yakunlangan darslardan debet/kredit jurnalini shakllantirish joriy qilindi. Balanslar shu yozuvlardan qayta hosil qilinadi. Tarixiy to‘lov o‘zgarganda keyingi avans va qarz taqsimoti ham qayta hisoblanadi.

**Hisoblash sanasi va tarix saqlanadi.** Dars daromadi tugma bosilgan kunga emas, dars sanasiga tegishli. Dars yakunida o‘quvchilar tarkibi, individual summalar va o‘qituvchi ulushi saqlanadi. Keyingi narx yoki foiz o‘zgarishi yakunlangan darsning hisoblarini o‘zgartirmaydi.

**Pul harakati va foyda ajratiladi.** O‘quvchi avansi darhol daromad deb olinmaydi. Oldin hisoblangan maosh to‘langanda xarajat takror yaratilmaydi. Investor kapitali va kredit olish P&L daromadiga kiritilmaydi. Jihoz xaridi aktiv va investitsion chiqim sifatida hisoblanadi.

**Hisobotlar tayyor jurnal versiyasidan o‘qiladi.** Parallel moliyaviy yozuvlar baza darajasidagi qulf orqali navbatlanadi. Yangi jurnal va kunlik yig‘indilar to‘liq tayyorlangach faol versiya almashtiriladi. Hisobot tezligi uchun `LedgerDaily` yig‘indilari ishlatiladi. Davr filtri moliyaviy jamilarni, shaxs/guruh/to‘lov turi filtrlari esa operatsiyalar tafsilotini belgilaydi.

**Noaniq biznes qoidalari taxmin qilinmaydi.** Investor foydasidagi ulush kapital miqdoridan avtomatik chiqarilmadi. Aniqlashtiriladigan savollar va birinchi versiya chegaralari [DECISIONS.md](DECISIONS.md)da qayd etildi.

## Aniqlangan muammolar va tuzatishlar

| Muammo | Tuzatish yoki nazorat |
|---|---|
| To‘lov turi yo‘q eski yozuvlarning naqd/bank hisobiga noto‘g‘ri ta’siri | Naqd pul qoidasi belgilandi; to‘lov turini tahrirlash HTTP testi bilan tekshirildi |
| Kech yakunlangan dars boshqa oy daromadiga tushishi | Jurnal sanasi dars sanasidan olinadigan qilindi; regressiya testi qo‘shildi |
| Narx yoki foiz o‘zgarishi eski dars hisobiga ta’sir qilishi | Yakunlangan dars summalari alohida saqlanadigan qilindi |
| Chegirmali narxni darslarga bo‘lishda yaxlitlash farqi | Qoldiq so‘mlar taqsimlandi; darslar yig‘indisi oylik narxga tengligi tekshirildi |
| Tekshiruv jurnalni qayta qurib, mavjud xatoni yashirishi | `reconcile` faqat o‘qiydigan tekshiruvga aylantirildi; buzilgan jurnalni aniqlash testi qo‘shildi |
| Demo ma’lumotlar takrorlanishi yoki asosiy bazaga aralashishi | Alohida demo baza va tugallangan seed’ni qayta yozmaslik tekshiruvi joriy qilindi |

## Tekshiruv natijalari

2026-11-11 kungi lokal tekshiruvlar:

- `npm run build`: backend va frontend muvaffaqiyatli yig‘ildi.
- `npm test`: 10 ta test o‘tdi, 0 ta xato.
- TZ’dagi beshta holat tekshirildi: oldindan to‘lov, keyingi oyda to‘langan maosh, investor kapitali, kredit asosiy qarzi/foizi va jihoz xaridi.
- Qo‘shimcha tekshiruvlar chegirma/yaxlitlash, inkassatsiya, tarixiy dars summalari, parallel qayta hisoblash, buzilgan jurnal va HTTP orqali kassa tahririni qamrab oldi.
- Demo: 500 o‘quvchi, 20 xodim, 8 640 dars, 25 070 faol jurnal yozuvi. Davr: 2023-yil yanvar — 2025-yil dekabr.
- `reconcile`: 36 oy uchun balans tengligi, pul qoldig‘i va foyda o‘zgarishi tekshirildi. Uchalasida ham 0 xato, farq 0.
- Har bir hisobot endpointi besh martadan HTTP orqali o‘lchandi: P&L maksimum 75 ms, pul oqimi 25 ms, balans 20 ms. Bu lokal muhit natijalari.
- Seed takror ishga tushirilganda ma’lumotlar qayta qo‘shilmasligi tekshirildi.

Buyruqlar va o‘lchov tafsilotlari [README.md](README.md)da berilgan. Natijalar barcha mumkin bo‘lgan holatlar yoki interfeysning har bir oqimi brauzerda tekshirilganini anglatmaydi.

## Cheklovlar va keyingi nazorat

MongoDB standalone bilan ishlash uchun manba operatsiyasini yozish va jurnalni qayta hisoblash yagona MongoDB tranzaksiyasiga birlashtirilmagan. Jarayon uzilsa, keyingi backend ishga tushishida jurnal qayta hisoblanadi. To‘liq tarixni qayta hisoblash va eski jurnal versiyalarini saqlash katta hajmda yozish tezligi hamda disk sarfiga ta’sir qiladi.

Demo bazaning mavjudligi brauzerdagi dastur aynan shu bazaga ulanganini kafolatlamaydi. Eski ma’lumot ko‘rinayotgani haqidagi so‘rovdan keyin ishlayotgan backend konfiguratsiyasini tekshirish yakunlanmagan; ulanish holati alohida tasdiqlanishi kerak.

AI yordamida yozilgan kod uchun texnik mas’uliyat loyiha egasida qoladi. Keyingi o‘zgarishlarda, ayniqsa `ledger.ts`, `pricing.ts`, `reports.ts` va `reconciliation.ts` uchun, biznes qoidasi bilan test kutilmasi birga ko‘rib chiqilishi kerak. Git tarixi va ekran yozuvi foydalanuvchi so‘roviga ko‘ra ish doirasidan tashqarida qoldirildi.
