# حسابداری محمد صدرا — آپدیت ۲۲۶

اصلاح مشکل Enter در شروع فاکتور جدید: روی شمارهٔ پیشنهادی Enter بزنید تا به تاریخ بروید، سربرگ و سطر را کامل کنید و در پایان سطر Enter بزنید تا ثبت شود. برای باز کردن فاکتور قبلی شمارهٔ آن را تایپ و Enter بزنید. F1 فاکتور جدید است.

تمام قابلیت‌های نسخهٔ ۲۲۵ حفظ شده‌اند. تغییر واحد نرخ و مظنه، گزارش و اقساط طبق README-browser-225.md و docs/STATUS-225.md در مخزن توضیح داده شده‌اند.

فایل‌های index.html، next-core.js، next-forms.js، next-report.js، next-ui.js، next-ui.css و fonts باید کنار هم باشند. تست: node --test tests/*.test.cjs؛ تست مرورگرِ اصلاح: SADRA_BASE_URL=http://127.0.0.1:8015/ node tests/browser226.cjs با سرور محلی، Playwright و Chromium محیط.
