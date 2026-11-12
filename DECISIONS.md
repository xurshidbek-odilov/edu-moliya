# Investorning foydadagi ulushi — v1 qarorlari

## Aniqlashtiriladigan savollar

Investordan va direktor/ta’sischilardan:
- Har bir investorning ulushi necha foiz va qaysi sanadan amal qiladi? Bu ustav ulushimi yoki alohida foyda taqsimlash shartnomasimi?
- Qo‘shimcha kapital kiritish ulushlarni o‘zgartiradimi? Oy o‘rtasida kirgan investor uchun kunlar bo‘yicha hisoblanadimi?
- Ulush qaysi foydadan olinadi: hisoblangan sof foydadanmi yoki pul bilan ta’minlangan, taqsimlashga tasdiqlangan foydadanmi?
- Oldingi zararlar avval qoplanadimi? Zararli oyda ulush nolmi yoki zarar keyingi oyga o‘tadimi?
- Barcha foyda taqsimlanadimi yoki biznesda qoladigan zaxira bormi? Qarorni kim va qachon tasdiqlaydi?

Buxgalterdan: hisob davri qachon yopiladi, keyingi tuzatishlar ilgari tasdiqlangan ulushga qanday ta’sir qiladi, hisoblash va haqiqiy to‘lash sanalari qaysilar?

## Javob kutmasdan qabul qilingan qarorlar

Investor pulini daromad emas, kapital sifatida saqlaymiz. Foizlarni kiritilgan mablag‘lar nisbatidan taxmin qilmaymiz: mablag‘ miqdori va foydadagi huquq bir xil bo‘lishi shart emas. Hozirgi P&L ulush ajratilishidan oldingi sof foydani ko‘rsatadi. Javoblar bo‘lmagani uchun avtomatik ulush yoki dividend majburiyati yaratmaymiz.

## Model va hisobotlarga ta’siri

Kelajakda `Investor`, amal qilish sanalari bo‘lgan `OwnershipAgreement`, tasdiqlangan `ProfitDistribution` va uning to‘lovlari qo‘shiladi. Tasdiqlangan taqsimot kapital/taqsimlanmagan foydani kamaytirib, investor oldidagi majburiyatni oshiradi; to‘lov majburiyat va pulni kamaytiradi. Bu P&L xarajati hisoblanmaydi. Sana va tasdiqlash tarixi saqlanadi, eski hisoblar yangi foizlar bilan qayta yozilmaydi.

## Birinchi versiyaga kiritilmaydi

Investor ulushini taxminiy hisoblash, avtomatik dividend to‘lovi, ulush sotish/qayta baholash va soliq hisob-kitobi. V1 kapital kiritish, uni balans va moliyaviy pul oqimida ko‘rsatish bilan cheklanadi.
