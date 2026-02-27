# إضافة حقول المساحات الجديدة لمشاريع Porto Said و Celebration

## 📋 نظرة عامة

تم إضافة حقول جديدة لتفصيل المساحات في الوحدات الخاصة بمشروعي **Porto Said** و **Celebration** فقط:

### الحقول الجديدة:
1. **`net_area`** (صافي المساحة) - المساحة الصافية للوحدة بدون الحديقة
2. **`garden_area`** (مساحة الحديقة) - مساحة الحديقة الخاصة بالوحدة
3. **`area`** (إجمالي المساحة) - موجود مسبقاً = net_area + garden_area

## 🔧 التغييرات المطبقة

### 1. قاعدة البيانات (Cloudflare D1)

**الملف**: `src/worker.js`

تم تحديث schema جدول `units`:

```sql
CREATE TABLE units (
    unit_id TEXT PRIMARY KEY,
    project_id TEXT,
    building_id TEXT,
    code TEXT,
    floor TEXT,
    area INTEGER,              -- إجمالي المساحة
    net_area INTEGER,          -- ✨ جديد: صافي المساحة
    garden_area INTEGER,       -- ✨ جديد: مساحة الحديقة
    view TEXT,
    price INTEGER,
    purpose TEXT DEFAULT 'Sale',
    payment_plan TEXT,
    images TEXT DEFAULT '[]',
    status TEXT DEFAULT 'Available'
)
```

**التغييرات**:
- ✅ إضافة عمود `net_area`
- ✅ إضافة عمود `garden_area`
- ✅ تحديث قائمة الأعمدة في عملية النسخ (migration)

### 2. Admin API

**الملف**: `public/api/admin-api.js`

#### دالة `createUnit`:
```javascript
const newUnit = {
    unit_id: unitId,
    code: unitData.code,
    building_id: unitData.buildingId || unitData.building_id,
    project_id: unitData.projectId || unitData.project_id,
    floor: unitData.floor,
    area: parseInt(unitData.area) || 0,
    net_area: parseInt(unitData.net_area) || null,      // ✨ جديد
    garden_area: parseInt(unitData.garden_area) || null, // ✨ جديد
    view: unitData.view,
    price: parseInt(unitData.price) || 0,
    purpose: unitData.purpose || unitData.intent || 'buy',
    payment_plan: unitData.paymentPlan || unitData.payment_plan,
    status: unitData.status || 'Available',
    images: unitData.images || []
};
```

#### دالة `updateUnit`:
```javascript
if (mappedUpdates.netArea) { 
    mappedUpdates.net_area = mappedUpdates.netArea; 
    delete mappedUpdates.netArea; 
}
if (mappedUpdates.gardenArea) { 
    mappedUpdates.garden_area = mappedUpdates.gardenArea; 
    delete mappedUpdates.gardenArea; 
}
```

### 3. صفحة رفع B15

**الملف**: `public/pages/upload-b15.html`

تم إنشاء صفحة مخصصة لرفع **34 وحدة** من مبنى B15 مع الحقول الجديدة:

**مثال على البيانات**:
```javascript
{
    code: "15001",
    floor: "Ground floor",
    area: 153,           // إجمالي المساحة
    net_area: 108,       // صافي المساحة
    garden_area: 45,     // مساحة الحديقة
    view: "champs elysees",
    price: 9423000
}
```

**المميزات**:
- ✅ واجهة احترافية بألوان Porto Said (أخضر/تركواز)
- ✅ شريط تقدم مباشر
- ✅ عرض تفاصيل كل وحدة أثناء الرفع
- ✅ إحصائيات شاملة
- ✅ معالجة أخطاء ذكية

## 📊 بيانات مبنى B15

### الإحصائيات:
- **عدد الوحدات**: 34 وحدة
- **المبنى**: B15
- **المشروع**: Porto Said
- **الطابق**: Ground Floor (الأرضي)
- **الإطلالات**: 
  - Champs Elysees
  - Sea View Club1

### توزيع المساحات:
| إجمالي المساحة | صافي المساحة | مساحة الحديقة | عدد الوحدات |
|----------------|--------------|---------------|-------------|
| 45-50 م²       | 40 م²        | 5-10 م²       | 15 وحدة     |
| 61-70 م²       | 50-51 م²     | 11-19 م²      | 12 وحدة     |
| 115-118 م²     | 92 م²        | 23-26 م²      | 3 وحدات     |

## 🚀 كيفية الاستخدام

### 1. رفع وحدات B15:
```
1. افتح: public/pages/upload-b15.html
2. اضغط على "ابدأ رفع الوحدات"
3. انتظر حتى اكتمال الرفع
4. تحقق من النتائج
```

### 2. إضافة وحدة جديدة بالحقول الجديدة:
```javascript
await window.robelAdminAPI.createUnit({
    code: "15070",
    buildingId: "B15",
    projectId: "porto-said",
    floor: "Ground floor",
    area: 150,
    net_area: 110,
    garden_area: 40,
    view: "Sea view",
    price: 9000000,
    status: "Available"
});
```

### 3. تحديث وحدة موجودة:
```javascript
await window.robelAdminAPI.updateUnit("unit_B15_15001", {
    net_area: 105,
    garden_area: 48
});
```

## 📝 ملاحظات مهمة

### ✅ الحقول الجديدة متاحة فقط لـ:
- مشروع **Porto Said** (B15, B16, B33, إلخ)
- مشروع **Celebration**

### ❌ الحقول الجديدة غير متاحة لـ:
- مشروع **Porto Golf Marina** (B133, B136, B230, B243, إلخ)
- المشاريع الأخرى

### القيم الافتراضية:
- إذا لم يتم تحديد `net_area` أو `garden_area`، ستكون القيمة `null`
- الحقل `area` (إجمالي المساحة) **إلزامي** دائماً

## 🔄 الخطوات التالية

1. ✅ **رفع البيانات**: افتح `upload-b15.html` وارفع الوحدات
2. ⏳ **نشر التحديثات**: قم بنشر Worker المحدث إلى Cloudflare
3. ⏳ **تحديث لوحة التحكم**: أضف حقول العرض في واجهة Admin Panel
4. ⏳ **تحديث صفحة التفاصيل**: أضف عرض الحقول الجديدة في `unit-details.html`

## 📂 الملفات المعدلة

| الملف | التغيير | الحالة |
|------|---------|--------|
| `src/worker.js` | إضافة أعمدة net_area و garden_area | ✅ مكتمل |
| `public/api/admin-api.js` | دعم الحقول الجديدة في create/update | ✅ مكتمل |
| `public/pages/upload-b15.html` | صفحة رفع B15 مع البيانات الجديدة | ✅ مكتمل |

## 🎯 الأهداف المحققة

- ✅ إضافة حقول المساحات الجديدة لقاعدة البيانات
- ✅ تحديث Admin API لدعم الحقول الجديدة
- ✅ إنشاء صفحة رفع احترافية لـ B15
- ✅ توثيق شامل للتغييرات
- ⏳ نشر التحديثات على Cloudflare (يتطلب تنفيذ يدوي)
- ⏳ تحديث واجهة لوحة التحكم (المرحلة التالية)

---

**تاريخ الإنشاء**: 2026-02-10  
**المطور**: Robel Real Estate System  
**النسخة**: 2.0 - Porto Said Enhanced
