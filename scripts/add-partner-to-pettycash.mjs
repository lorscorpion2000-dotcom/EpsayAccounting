import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

// ═══════════ 1) Schema ═══════════
const sp = ROOT + '/backend/prisma/schema.prisma';
let s = fs.readFileSync(sp, 'utf8');

if (!s.includes('partnerId String?   @map("partner_id")')) {
  const anchor = '  employee   Employee? @relation(fields: [employeeId], references: [id])';
  if (s.includes(anchor)) {
    s = s.replace(anchor, anchor + '\n\n  partnerId String?   @map("partner_id") @db.Uuid\n  partner   Partner?  @relation("PCPartnerHolder", fields: [partnerId], references: [id])');
    console.log('OK PettyCashAccount.partnerId');
  } else {
    console.log('!! anchor PettyCashAccount not found');
  }
} else {
  console.log('SKIP PettyCashAccount');
}

if (!s.includes('pettyCashAccountsAsPartnerHolder')) {
  const anchorP = '  capitalWithdrawals      PartnerCapitalWithdrawal[]';
  if (s.includes(anchorP)) {
    s = s.replace(anchorP, anchorP + '\n  pettyCashAccountsAsPartnerHolder PettyCashAccount[] @relation("PCPartnerHolder")');
    console.log('OK Partner reverse relation');
  } else {
    console.log('!! anchor Partner not found');
  }
} else {
  console.log('SKIP Partner');
}

fs.writeFileSync(sp, s, 'utf8');

// ═══════════ 2) DTO ═══════════
const dtoPath = ROOT + '/backend/src/modules/petty-cash/dto/create-account.dto.ts';
let dto = fs.readFileSync(dtoPath, 'utf8');

if (!dto.includes('partnerId?: string')) {
  const anchor = '  employeeId?: string;';
  if (dto.includes(anchor)) {
    dto = dto.replace(anchor, anchor + '\n\n  @ApiPropertyOptional()\n  @IsOptional()\n  @IsUUID()\n  partnerId?: string;');
    console.log('OK DTO.partnerId');
  } else {
    console.log('!! anchor DTO not found');
  }
} else {
  console.log('SKIP DTO');
}
fs.writeFileSync(dtoPath, dto, 'utf8');

// ═══════════ 3) Service ═══════════
const svcPath = ROOT + '/backend/src/modules/petty-cash/accounts.service.ts';
let svc = fs.readFileSync(svcPath, 'utf8');

if (!svc.includes('partnerId: dto.partnerId')) {
  const anchor = 'employeeId: dto.employeeId || null,';
  if (svc.includes(anchor)) {
    svc = svc.replace(anchor, anchor + '\n            partnerId: dto.partnerId || null,');
    console.log('OK service.create');
  } else {
    console.log('!! anchor service.create not found');
  }
}

if (!svc.includes('dto.partnerId !== undefined')) {
  const anchorU = 'if (dto.employeeId !== undefined) data.employeeId = dto.employeeId;';
  if (svc.includes(anchorU)) {
    svc = svc.replace(anchorU, anchorU + '\n        if (dto.partnerId !== undefined) data.partnerId = dto.partnerId;');
    console.log('OK service.update');
  } else {
    console.log('!! anchor service.update not found');
  }
}

// include partner (اگر هنوز نبود)
const includes = [...svc.matchAll(/employee: \{ select: \{ id: true, fullName: true, code: true \} \},/g)];
if (includes.length > 0) {
  svc = svc.replace(
    /employee: \{ select: \{ id: true, fullName: true, code: true \} \},/g,
    'employee: { select: { id: true, fullName: true, code: true } },\n            partner: { select: { id: true, name: true, code: true } },'
  );
  console.log('OK service.includes (' + includes.length + ')');
}

fs.writeFileSync(svcPath, svc, 'utf8');

console.log('');
console.log('=== DONE ===');