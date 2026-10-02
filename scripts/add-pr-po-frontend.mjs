import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

// ═══════════════════════════════════════════════════════════════
// 1) POListPage — افزودن badge «از درخواست خرید» + نمایش کارپرداز
// ═══════════════════════════════════════════════════════════════
const listPath = ROOT + '/frontend/src/modules/procurement/pages/POListPage.tsx';
if (fs.existsSync(listPath)) {
  let c = fs.readFileSync(listPath, 'utf8');
  let changed = 0;
  
  // badge کنار ردیفهای بدون تأمینکننده
  if (!c.includes('بدون تأمینکننده') && !c.includes('در انتظار تأمینکننده')) {
    // پیدا کردن جای نمایش supplier
    const supplierRegex = /\{po\.supplier\?\.name \|\| [^}]+\}/;
    const match = c.match(supplierRegex);
    if (match) {
      c = c.replace(
        match[0],
        `{po.supplier?.name || <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">در انتظار تأمینکننده</span>}`
      );
      changed++;
      console.log('✅ badge «در انتظار تأمینکننده»');
    } else {
      console.log('ℹ supplier نمایش داده نشده — بررسی دستی');
    }
  }
  
  // badge «از PR» اگر prId دارد
  if (!c.includes('از درخواست')) {
    const codeRegex = /(<span className="[^"]*num[^"]*"[^>]*>\{po\.code\}<\/span>)/;
    const match = c.match(codeRegex);
    if (match) {
      c = c.replace(
        match[0],
        match[0] + `{(po as any).prId && <span className="inline-block ms-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700" title="تبدیلشده از درخواست خرید">از PR</span>}`
      );
      changed++;
      console.log('✅ badge «از PR»');
    }
  }
  
  if (changed > 0) {
    fs.writeFileSync(listPath, c, 'utf8');
    console.log('✅ POListPage.tsx — ' + changed + ' تغییر');
  }
} else {
  console.log('❌ POListPage پیدا نشد');
}

// ═══════════════════════════════════════════════════════════════
// 2) POFormPage — پشتیبانی از supplierId خالی + پر کردن خودکار
// ═══════════════════════════════════════════════════════════════
const formPath = ROOT + '/frontend/src/modules/procurement/pages/POFormPage.tsx';
if (fs.existsSync(formPath)) {
  let c = fs.readFileSync(formPath, 'utf8');
  let changed = 0;
  
  // چک supplierId
  if (!c.includes("supplierId: ''") && !c.includes('supplierId:')) {
    // افزودن به defaultValues
    const dvRegex = /(defaultValues:\s*\{[\s\S]*?)(\})/;
    const match = c.match(dvRegex);
    if (match && !match[1].includes('supplierId')) {
      c = c.replace(
        match[0],
        match[1] + "      supplierId: '',\n    " + match[2]
      );
      changed++;
      console.log('✅ supplierId در defaultValues');
    }
  }
  
  // اختیاری کردن supplier
  if (!c.includes("'تأمینکننده الزامی است'") && c.includes('supplierId')) {
    // چک آیا register('supplierId', { required: ...
    const regRegex = /register\(['"]supplierId['"][^)]*required:\s*['"][^'"]+['"][^)]*\)/;
    if (regRegex.test(c)) {
      c = c.replace(regRegex, "register('supplierId')");
      changed++;
      console.log('✅ required از supplierId برداشته شد');
    }
  }
  
  if (changed > 0) {
    fs.writeFileSync(formPath, c, 'utf8');
    console.log('✅ POFormPage.tsx — ' + changed + ' تغییر');
  } else {
    console.log('ℹ POFormPage — تغییری لازم نبود');
  }
} else {
  console.log('ℹ POFormPage پیدا نشد');
}

// ═══════════════════════════════════════════════════════════════
// 3) Backend PO create — پذیرش supplierId اختیاری
// ═══════════════════════════════════════════════════════════════
const dtoPath = ROOT + '/backend/src/modules/procurement/dto/create-po.dto.ts';
if (fs.existsSync(dtoPath)) {
  let dto = fs.readFileSync(dtoPath, 'utf8');
  if (dto.includes('@IsUUID()') && dto.includes('supplierId')) {
    // تبدیل به اختیاری
    dto = dto.replace(
      /(@IsUUID\(\)\s*\r?\n\s*)supplierId!/,
      '  @IsOptional()\n  @IsUUID()\n  supplierId?:'
    );
    fs.writeFileSync(dtoPath, dto, 'utf8');
    console.log('✅ DTO: supplierId اختیاری شد');
  } else {
    console.log('ℹ DTO — بررسی دستی:');
    dto.split('\n').forEach((l, i) => {
      if (l.includes('supplierId')) {
        console.log('  L' + (i + 1) + ': ' + l.trim());
      }
    });
  }
}

console.log('');
console.log('=== DONE ===');