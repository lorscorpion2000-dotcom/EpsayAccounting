import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ═══ ۱. خواندن schema و پیدا کردن مدل‌های دارای deletedAt ═══
const SCHEMA = path.join(__dirname, 'prisma', 'schema.prisma');
const schema = fs.readFileSync(SCHEMA, 'utf8');

const models = [];
const modelRe = /model\s+(\w+)\s*\{([\s\S]*?)\n\}/g;
let m;
while ((m = modelRe.exec(schema)) !== null) {
  if (/deletedAt\s+DateTime\?/.test(m[2])) {
    models.push(m[1]);
  }
}

console.log('📋 مدل‌های دارای deletedAt:', models.length);
console.log('   ', models.join(', '));

// ═══ ۲. patch PrismaService ═══
const PSRV = path.join(__dirname, 'src', 'shared', 'prisma', 'prisma.service.ts');
const ts = new Date().toISOString().replace(/[:.]/g, '-');
fs.copyFileSync(PSRV, PSRV + '.bak-mw-' + ts);
console.log('\n✅ بکاپ:', PSRV);

let src = fs.readFileSync(PSRV, 'utf8');
const wasCRLF = src.includes('\r\n');
let srcN = src.replace(/\r\n/g, '\n');

if (srcN.includes('__softDeleteInstalled')) {
  console.log('ℹ️  middleware از قبل نصب شده');
  process.exit(0);
}

// پیدا کردن constructor
// الگو: constructor(...) { super(...); }
// ماژول: src/shared/prisma/prisma.service.ts

// ۳. ساخت کد middleware
const modelsList = models.map(m => `'${m[0].toLowerCase() + m.slice(1)}'`).join(', ');

const middlewareCode = `
    // ═══════════════════════════════════════════════════════
    // Soft-Delete Middleware
    // — همه کوئری‌های خواندن به‌صورت خودکار رکوردهای حذف‌شده را فیلتر می‌کنند
    // ═══════════════════════════════════════════════════════
    (this as any).__softDeleteInstalled = true;

    const SOFT_DELETE_MODELS = [
      ${modelsList},
    ] as const;

    (this as any).$use(async (params: any, next: any) => {
      // ۱. bypass (برای listDeleted و restore)
      if ((globalThis as any).__BYPASS_SOFT_DELETE) {
        return next(params);
      }

      // ۲. مدل‌های soft-delete رو چک کن
      if (!params.model || !SOFT_DELETE_MODELS.includes(params.model)) {
        return next(params);
      }

      // ۳. actions که باید فیلتر بشن
      const READ_ACTIONS = ['findMany', 'findFirst', 'findFirstOrThrow', 'count', 'aggregate', 'groupBy'];
      const UNIQUE_ACTIONS = ['findUnique', 'findUniqueOrThrow'];

      if (READ_ACTIONS.includes(params.action)) {
        params.args = params.args || {};
        if (!params.args.where) params.args.where = {};
        if (params.args.where.deletedAt === undefined) {
          params.args.where.deletedAt = null;
        }
      } else if (UNIQUE_ACTIONS.includes(params.action)) {
        // تبدیل findUnique به findFirst با فیلتر
        params.action = params.action === 'findUnique' ? 'findFirst' : 'findFirstOrThrow';
        params.args = params.args || {};
        params.args.where = params.args.where || {};
        if (params.args.where.deletedAt === undefined) {
          params.args.where.deletedAt = null;
        }
      }

      return next(params);
    });
`;

// ۴. درج بعد از super() در constructor
// الگو: constructor(...) { super(...); ... }
const superMatch = srcN.match(/super\([^)]*\);/);
if (!superMatch) {
  console.log('❌ `super(` پیدا نشد — ساختار PrismaService رو دستی چک کن');
  console.log(srcN.slice(0, 800));
  process.exit(1);
}

const idx = srcN.indexOf(superMatch[0]) + superMatch[0].length;
srcN = srcN.slice(0, idx) + middlewareCode + srcN.slice(idx);

console.log('\n✅ middleware به PrismaService اضافه شد');

fs.writeFileSync(PSRV, wasCRLF ? srcN.replace(/\n/g, '\r\n') : srcN, 'utf8');
console.log('✅ ذخیره شد:', PSRV);