# 🎯 اسم فامیل — آنلاین

## راه‌اندازی روی Liara

### ۱. نصب Liara CLI
```bash
npm install -g @liara/cli
```

### ۲. لاگین
```bash
liara login
```

### ۳. ساخت اپ در داشبورد Liara
- برو به https://console.liara.ir/apps
- یه اپ جدید بساز با پلن Node.js
- اسم اپ رو یادداشت کن

### ۴. دیپلوی
```bash
cd esm-famil-v2
liara deploy --app اسم-اپت --port 3000
```

یا با Docker:
```bash
liara deploy --app اسم-اپت --dockerfile Dockerfile --port 3000
```

## قابلیت‌ها
- 🔒 رمز اتاق (اختیاری)
- 👥 لیست بازیکنان آنلاین
- ✅ تأیید آمادگی توسط همه
- ⏰ تایمر قابل تنظیم
- 🏁 اعلام پایان توسط هر بازیکن
- 📋 جدول پاسخ‌های همه
- ⭐ امتیازدهی شخصی (ضد تقلب)
- 🏆 جدول امتیازات بعد هر راند
