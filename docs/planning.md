# Planning.md - خطة تطوير file-operation-mcp

**تاريخ الإنشاء**: 2026-04-25  
**تاريخ التحديث**: 2026-04-25  
**الحالة**: � مكتمل تقريباً (95%)  
**الهدف**: إصلاح الأخطاء المنطقية والتكرار وتوحيد API

---

## 📋 الملخص التنفيذي

### القرارات الأساسية

| القرار | التفاصيل |
|--------|----------|
| **تنسيق الردود** | Markdown نصي ( وليس JSON) - توفير للـ tokens |
| **glob library** | `fast-glob` من npm |
| **حجم الملفات** | Metric (1000-based): KB, MB, GB |
| **tmp cleanup** | FIFO (الأقدم), max 200 ملف |
| **Buffer في tmp** | base64 encoding |
| **مسار tmp في الرد** | المسار الكامل absolute |

### إعادة التسمية

| الأداة القديمة | الجديدة | السبب |
|----------------|---------|-------|
| `delete` | `remove` | تجنب التباس مع كلمة محجوزة في بعض اللغات |
| `map` | `tree` | أقصر وأوضح |
| `grep` | `grep` | ⬅️ كما هي (مقبولة) |
| `glob` | `glob` | ⬅️ كما هي (مقبولة) |

---

## 🏗️ البنية الجديدة للمشروع

```
src/
├── index.ts                    # ✅ Entry point مع initializeTools()
├── tools/
│   ├── index.ts               # ✅ Registry مع ensureTmpDir & cleanupTmp
│   ├── count-files.ts         # ✅ محسّن بـ getDirectoryStats()
│   ├── list-files.ts          # ✅ يستخدم getDefaultPath() + تنسيق جدول
│   ├── copy-files.ts          # ✅ يستخدم utils بدلاً من التكرار
│   ├── move-files.ts          # ✅ يستخدم utils + permission checks
│   ├── remove.ts              # ✅ (كان delete) - مُحسّن بالتنسيق
│   ├── create-item.ts         # ✅ كما هو
│   ├── read-file.ts           # ✅ يستخدم getFileMetadata() للباينري
│   ├── write-file.ts          # ✅ يستخدم saveToTmp() + formatFileSize
│   ├── execute-command.ts     # ⬜ لم يُحدّث (يمكن استخدام timeout.ts)
│   ├── find-and-replace.ts    # ⬜ لم يُحدّث
│   ├── tree.ts                # ✅ (كان map.ts) - مُحسّن بالتنسيق
│   ├── http-request.ts        # ⬜ لم يُحدّث
│   ├── grep.ts                # ✅ تخطي الباينري + ignore patterns
│   └── glob.ts                # ✅ استبدال implementation بـ fast-glob
├── utils/                      # ✅ مكتمل (5 ملفات)
│   ├── index.ts               # ✅ Barrel file (hybrid approach)
│   ├── file-operations.ts      # ✅ 375 سطر
│   ├── directory-utils.ts      # ✅ 392 سطر
│   ├── platform.ts             # ✅ 205 سطور
│   └── formatters.ts           # ✅ 157 سطر
└── types/                      # ⬜ لم يُنشأ (غير ضروري - في utils)
```

---

## 🔧 مواصفات utils بالتفصيل

### 1. utils/formatters.ts

```typescript
/**
 * تحويل البايتات لصيغة مقروءة (Metric)
 * @param bytes - عدد البايتات
 * @returns "2.4 MB" أو "156 KB" أو "1.2 GB"
 */
export function formatFileSize(bytes: number): string;

/**
* عد أسطر النص
* @param content - محتوى الملف
* @returns number
*/
export function countLines(content: string): number;

/**
* تنسيق التاريخ للـ tmp filenames
* @returns "2026-04-25T03-14-22" (ISO مع استبدال : بـ -)
*/
export function formatTimestamp(): string;
```

### 2. utils/platform.ts

```typescript
import * as os from 'os';
import * as path from 'path';

/**
 * اسم المستخدم الحالي (مرة واحدة فقط)
 * لا يُكرر في عدة ملفات
 */
export const username: string = os.userInfo().username;

/**
 * نظام التشغيل الحالي
 */
export const platform: 'linux' | 'darwin' | 'win32' = process.platform;

/**
 * المسار الافتراضي للـ Desktop حسب المنصة
 * - Linux: ~/Desktop
 * - macOS: /Users/{username}/Desktop
 * - Windows: C:\Users\{username}\Desktop
 */
export function getDefaultPath(): string;

/**
 * هل المسار مطلق (absolute)؟
 */
export function isAbsolutePath(filePath: string): boolean;

/**
 * تحويل المسار النسبي لمطلق
 */
export function resolvePath(filePath: string): string;
```

### 3. utils/file-operations.ts

```typescript
import * as fs from 'fs-extra';

/**
 * مسار مجلد tmp (يُحدد مرة واحدة عند import)
 * يستخدم __dirname لضمان المسار الصحيح
 */
export const TMP_DIR: string;

/**
 * واجهة موحدة لـ metadata الملف
 * تُستخدم في read-file, grep, write-file, إلخ
 */
export interface FileMetadata {
  exists: boolean;           // هل الملف موجود؟
  isFile: boolean;          // هل هو ملف (وليس مجلد)؟
  isDirectory: boolean;     // هل هو مجلد؟
  isBinary: boolean;        // فحص بـ 8KB فقط (fs.open + fs.read)
  isReadable: boolean;      // fs.access R_OK
  isWritable: boolean;      // fs.access W_OK
  size: number;             // bytes
  lineCount?: number;       // للملفات النصية فقط
  extension?: string;        // ".ts", ".js", إلخ
  created?: Date;           // تاريخ الإنشاء
  modified?: Date;          // تاريخ آخر تعديل
}

/**
 * جمع metadata للملف
 * تقرأ 8KB فقط للتحقق من الباينري (لا تُفرّغ الذاكرة)
 * 
 * @param filePath - مسار الملف
 * @returns FileMetadata
 * @throws إذا حدث خطأ غير متوقع
 */
export async function getFileMetadata(filePath: string): Promise<FileMetadata>;

/**
 * فحص سريع إذا كان المحتوى باينري
 * تقرأ sampleSize بايت فقط (افتراضي: 8000)
 * 
 * @param buffer - الـ buffer للفحص
 * @param sampleSize - عدد البايتات للفحص
 * @returns true إذا وجد null byte (0x00)
 */
export function isBinaryContent(buffer: Buffer, sampleSize?: number): boolean;

/**
 * التحقق من صلاحية الكتابة
 * 
 * @param filePath - مسار الملف أو المجلد
 * @returns true إذا يمكن الكتابة
 */
export async function checkWritePermission(filePath: string): Promise<boolean>;

/**
 * التحقق من صلاحية القراءة
 * 
 * @param filePath - مسار الملف أو المجلد
 * @returns true إذا يمكن القراءة
 */
export async function checkReadPermission(filePath: string): Promise<boolean>;

/**
 * حفظ المحتوى في tmp
 * - يُنشئ المجلد إذا لم يكن موجوداً
 * - يُنشئ اسم الملف مع timestamp + uuid
 * - يُحول Buffer لـ base64
 * - ينفذ cleanup تلقائياً بعد الحفظ
 * 
 * @param content - المحتوى (string أو Buffer)
 * @param reason - سبب الحفظ (للـ logging)
 * @returns المسار الكامل للملف المحفوظ
 */
export async function saveToTmp(
  content: string | Buffer,
  reason: string
): Promise<string>;

/**
 * تنظيف tmp folder
 * تحذف الأقدم (FIFO) إذا تجاوز العدد maxFiles
 * 
 * @param maxFiles - الحد الأقصى للملفات (افتراضي: 200)
 * @returns { deleted: number, remaining: number }
 */
export async function cleanupTmp(maxFiles?: number): Promise<{ deleted: number; remaining: number }>;

/**
 * إنشاء مجلد tmp إذا لم يكن موجوداً
 * تُنفذ مرة واحدة عند بدء السيرفر
 */
export async function ensureTmpDir(): Promise<void>;

/**
 * توليد اسم ملف فريد للـ tmp
 * الصيغة: {timestamp}-{uuid}.txt
 * مثال: "2026-04-25T03-14-22-abc123-def456.txt"
 * 
 * @param extension - الامتداد (افتراضي: .txt)
 */
export function generateTmpFilename(extension?: string): string;
```

### 4. utils/directory-utils.ts

```typescript
/**
 * حساب حجم المجلد بشكل recursive
 * يُستخدم في copy-files, move-files, count-files
 * 
 * @param dirPath - مسار المجلد
 * @returns الحجم بالبايت
 */
export async function calculateDirectorySize(dirPath: string): Promise<number>;

/**
* عد الملفات في المجلد (لا يحسب المجلدات!)
* يُستخدم في copy-files, move-files, count-files
* 
* @param dirPath - مسار المجلد
* @returns عدد الملفات فقط
*/
export async function countFilesInDirectory(dirPath: string): Promise<number>;

/**
* إحصائيات شاملة للمجلد
* - عدد الملفات
* - عدد المجلدات
* - الحجم الإجمالي
* - أقصى عمق
* 
* @param dirPath - مسار المجلد
* @returns DirectoryStats
*/
export interface DirectoryStats {
  fileCount: number;
  dirCount: number;
  totalSize: number;
  maxDepth: number;
  byExtension?: Record<string, number>; // { ".ts": 45, ".js": 30 }
}

export async function getDirectoryStats(dirPath: string): Promise<DirectoryStats>;
```

### 5. utils/index.ts (Hybrid Barrel)

```typescript
// ============ Exports from formatters.ts ============
export { formatFileSize, countLines, formatTimestamp } from './formatters';

// ============ Exports from platform.ts ============
export { username, platform, getDefaultPath, isAbsolutePath, resolvePath } from './platform';

// ============ Exports from file-operations.ts ============
export {
  TMP_DIR,
  FileMetadata,
  getFileMetadata,
  isBinaryContent,
  checkWritePermission,
  checkReadPermission,
  saveToTmp,
  cleanupTmp,
  ensureTmpDir,
  generateTmpFilename
} from './file-operations';

// ============ Exports from directory-utils.ts ============
export {
  calculateDirectorySize,
  countFilesInDirectory,
  DirectoryStats,
  getDirectoryStats
} from './directory-utils';
```

---

## ✅ حالة المهام

### تم إنجازه ✅

| المهمة | التفاصيل | Commit |
|--------|----------|--------|
| **utils كاملة** | 5 ملفات، 1,224 سطر، JSDoc كامل | ✅ commit |
| **count-files.ts** | استخدام getDirectoryStats، تنسيق Markdown | ✅ commit |
| **write-file.ts** | استخدام saveToTmp، checkWritePermission | ✅ commit |
| **read-file.ts** | استخدام getFileMetadata للباينري | ✅ commit |
| **glob.ts** | استبدال بـ fast-glob | ✅ commit |
| **move-files.ts** | إزالة التكرار، استخدام utils | ✅ commit |
| **copy-files.ts** | إزالة التكرار، استخدام utils | ✅ commit |
| **grep.ts** | تخطي الباينري، ignore patterns | ✅ commit |
| **list-files.ts** | تنسيق جدول، getDefaultPath | ✅ commit |
| **delete→remove.ts** | إعادة تسمية + تحديث | ✅ commit |
| **map→tree.ts** | إعادة تسمية + تحديث | ✅ commit |
| **index.ts** | initializeTools() + ensureTmpDir | ✅ commit |
| **AGENT.md** | تحديث كامل بالتغييرات | ✅ commit |

### متبقي ⬜ (اختياري)

| المهمة | الأولوية | السبب |
|--------|----------|-------|
| **execute-command.ts** | منخفض | يعمل حالياً، timeout.ts متاح إذا لزم |
| **find-and-replace.ts** | منخفض | يعمل حالياً |
| **http-request.ts** | منخفض | يعمل حالياً |
| **tests** | منخفض | جودة عالية لكن لا يوجد tests حالياً |
| **Docker support** | منخفض جداً | للمستقبل |
| **CI/CD** | منخفض جداً | للمستقبل |

---

## 🔨 تعديلات الأدوات بالتفصيل (الأرشيف)

### الأداة: count-files.ts

**التغييرات المطلوبة:**

1. استخدام `getDirectoryStats()` بدلاً من `fs.readdir()`
2. استخدام `getDefaultPath()` بدلاً من `/Users/${username}/Desktop`
3. تغيير الـ output لـ PWA style:

```markdown
**Project**: /home/youusef/my-project

**Summary**:
- Files: 156
- Directories: 23
- Total Size: 2.4 MB

**By Extension**:
- .ts: 45
- .js: 30
- .json: 12
```

**الكود المقترح:**
```typescript
import { getDirectoryStats, getDefaultPath, formatFileSize } from '../utils';
// ...
const stats = await getDirectoryStats(targetPath);
return {
  content: [{
    type: 'text' as const,
    text: `**Project**: ${targetPath}\n\n**Summary**:\n- Files: ${stats.fileCount}\n- Directories: ${stats.dirCount}\n- Total Size: ${formatFileSize(stats.totalSize)}`
  }]
};
```

---

### الأداة: write-file.ts

**التغييرات المطلوبة:**

1. استخدام `checkWritePermission()` قبل الكتابة
2. استخدام `saveToTmp()` بدلاً من الدالة المحلية
3. استخدام `cleanupTmp(200)` بعد كل حفظ
4. استخدام `generateTmpFilename()` للأسماء
5. تغيير `error: any` لـ `unknown`

**الكود المقترح:**
```typescript
import {
  checkWritePermission,
  getFileMetadata,
  saveToTmp,
  formatFileSize,
  TMP_DIR
} from '../utils';
// ...
const canWrite = await checkWritePermission(filePath);
if (!canWrite) {
  const tmpPath = await saveToTmp(content, 'permission denied');
  return {
    content: [{
      type: 'text' as const,
      text: `❌ Error: No write permission for: ${filePath}\n✅ Content saved to: ${tmpPath}`
    }],
    isError: true
  };
}
```

---

### الأداة: read-file.ts

**التغييرات المطلوبة:**

1. استخدام `getFileMetadata()` للفحص الباينري (8KB فقط)
2. استخدام `formatFileSize()` للحجم
3. استخدام `countLines()` إذا احتجنا

**ملاحظة:** الـ implementation الحالي يقرأ الملف كاملاً ثم يفحص 8KB. يجب تغييره لـ `fs.open()` + `fs.read()`.

---

### الأداة: glob.ts

**التغييرات المطلوبة:**

1. إزالة الـ implementation المحلي (Regex handmade)
2. استخدام `fast-glob` من npm
3. الحفاظ على نفس الـ interface

**الخطوات:**
```bash
pnpm add fast-glob
```

```typescript
import fg from 'fast-glob';
// ...
const results = await fg(pattern, {
  cwd,
  ignore,
  absolute,
  onlyFiles: true
});
```

---

### الأداة: grep.ts

**التغييرات المطلوبة:**

1. استخدام `isBinaryContent()` أو `getFileMetadata()` لتخطي الملفات الثنائية
2. إضافة option: `skipBinary: z.boolean().default(true)`

---

### الأداة: move-files.ts

**التغييرات المطلوبة:**

1. إصلاح خطأ الـ overwrite:
   - إذا الهدف موجود والـ overwrite = true
   - انقل المصدر لـ temp أولاً
   - احذف الهدف
   - انقل من temp للهدف
   - إذا فشل: استعد من temp

2. استخدام `calculateDirectorySize()` و `countFilesInDirectory()` من utils

---

### الأداة: copy-files.ts

**التغييرات المطلوبة:**

1. استخدام `calculateDirectorySize()` من utils (بدلاً من التكرار)
2. استخدام `countFilesInDirectory()` من utils (بدلاً من التكرار)

---

### الأداة: list-files.ts

**التغييرات المطلوبة:**

1. استخدام `getDefaultPath()` بدلاً من `/Users/${username}/Desktop`

---

### الأداة: delete.ts → remove.ts

**التغييرات:**

1. إعادة تسمية الملف فقط
2. تحديث registry في `tools/index.ts`
3. لا تغيير في المنطق

---

### الأداة: map.ts → tree.ts

**التغييرات:**

1. إعادة تسمية الملف فقط
2. تحديث registry
3. تحديث الوثائق

---

### الأداة: index.ts (Registry)

**التغييرات المطلوبة:**

```typescript
// 1. إضافة ensureTmpDir عند بدء السيرفر
import { ensureTmpDir, cleanupTmp } from '../utils';

export default function registryTools(server: McpServer) {
  // تنظيف tmp عند البدء
  await ensureTmpDir();
  await cleanupTmp(200); // تنظيف أولي
  
  // باقي الـ registry...
}
```

---

### الأداة: index.ts (Main Entry)

**التغييرات المطلوبة:**

```typescript
// إضافة graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  // إغلاق الاتصالات
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  // محاولة تنظيف قبل الإغلاق
  process.exit(1);
});
```

---

## 📦 Dependencies

### إضافة جديدة
```bash
pnpm add fast-glob
```

### إزالة
```bash
pnpm remove tar archiver
```

### نقل لـ devDependencies
```bash
# package.json تعديل يدوي:
# @types/archiver
# @types/tar
# @types/express
# @types/node
# @types/fs-extra
```

---

## ✅ ترتيب التنفيذ الفعلي (تم)

### المرحلة 1: utils ✅
1. ✅ `utils/formatters.ts`
2. ✅ `utils/platform.ts`
3. ✅ `utils/file-operations.ts`
4. ✅ `utils/directory-utils.ts`
5. ✅ `utils/index.ts`

### المرحلة 2: dependencies ✅
6. ✅ إضافة `fast-glob`
7. ✅ إزالة `tar`, `archiver` (تمت في session سابقة)

### المرحلة 3: أدوات الأساس ✅
8. ✅ `tools/glob.ts` (استبدال بـ fast-glob)
9. ✅ `tools/count-files.ts` (تحسين كبير)
10. ✅ `tools/write-file.ts` (تحسين كبير)
11. ✅ `tools/read-file.ts` (تحسين الأداء)

### المرحلة 4: إصلاحات ✅
12. ✅ `tools/move-files.ts` (إزالة التكرار)
13. ✅ `tools/copy-files.ts` (إزالة التكرار)
14. ✅ `tools/grep.ts` (تخطي الباينري)
15. ✅ `tools/list-files.ts` (default path)

### المرحلة 5: إعادة تسمية ✅
16. ✅ `delete.ts` → `remove.ts`
17. ✅ `map.ts` → `tree.ts`

### المرحلة 6: entry point ✅
18. ✅ `tools/index.ts` (initializeTools)
19. ✅ `src/index.ts` (استدعاء initializeTools)

### المرحلة 7: documentation ✅
20. ✅ تحديث `AGENT.md`
21. ✅ تحديث `planning.md` (هذا الملف)

---

## ✅ قائمة التحقق النهائية (Checklist)

### تم ✅
- [x] قراءة كل الملفات الحالية وفهمها
- [x] نسخ احتياطي من المشروع (git commits متعددة)
- [x] `pnpm build` ناجح (69.7 kB ESM)
- [x] جميع utils منفذة (5 ملفات)
- [x] جميع الأدوات الرئيسية مُحدّثة (8 أدوات)
- [x] إعادة تسمية الأدوات (delete→remove, map→tree)
- [x] تحديث `tools/index.ts` مع initializeTools()
- [x] تحديث `src/index.ts` لاستدعاء initializeTools()
- [x] تحديث `AGENT.md` بالكامل
- [x] `fast-glob` مُضاف للـ dependencies

### متبقي ⬜ (اختياري)
- [ ] اختبار يدوي لكل أداة (يمكن تأجيله)
- [ ] `pnpm start` للتأكد من عمل السيرفر (يمكن تأجيله)
- [ ] git commit نهائي للـ planning.md

---

## ⚠️ مخاطر وتحذيرات

1. **إعادة التسمية** قد تُكسر clients قديمة (لكنك لم تنشر بعد)
2. **تغيير output format** قد يؤثر على prompts الحالية في Claude/Cursor
3. **tmp cleanup** قد يحذف ملفات مفيدة إذا المستخدم لم ينتبه
4. **إزالة dependencies** يحتاج `pnpm install` بعد التعديل

---

## 📝 ملاحظات للمستقبل

### أدوات Draft (لاحقاً)
- `append-to-file`: إضافة نص لنهاية ملف
- `update-file`: الكتابة فوق ملف موجود
- `diff-files`: مقارنة ملفين
- `watch-file`: مراقبة تغيرات ملف

### تحسينات لاحقة
- unit tests (jest أو vitest)
- CI/CD (GitHub Actions)
- Docker support
- Rate limiting (إذا نشرت publicly)

---

**أخيراً**: هذه الخطة شاملة. لا تتردد في تعديل أي جزء أثناء التنفيذ إذا وجدت مشكلة أو فكرة أفضل.
