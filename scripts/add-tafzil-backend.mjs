import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

// ═══════════════════════════════════════════════════════════════
// 1) DTO
// ═══════════════════════════════════════════════════════════════
const dtoPath = ROOT + '/backend/src/modules/accounting/dto/create-account.dto.ts';
if (fs.existsSync(dtoPath)) {
  let dto = fs.readFileSync(dtoPath, 'utf8');
  if (!dto.includes('detailType')) {
    dto = dto.replace(
      /(@IsOptional\(\)[\s\S]*?description\?: string;)/,
      `@IsOptional()
  @IsString()
  detailType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  detailId?: string;

  $1`
    );
    fs.writeFileSync(dtoPath, dto, 'utf8');
    console.log('OK DTO');
  } else {
    console.log('SKIP DTO');
  }
}

// ═══════════════════════════════════════════════════════════════
// 2) Service
// ═══════════════════════════════════════════════════════════════
const svcPath = ROOT + '/backend/src/modules/accounting/accounts.service.ts';
if (fs.existsSync(svcPath)) {
  let svc = fs.readFileSync(svcPath, 'utf8');
  let changed = false;

  // create: افزودن detailType/detailId
  if (!svc.includes('detailType: dto.detailType')) {
    // پیدا کردن اولین "data: {" در create
    svc = svc.replace(
      /(async create\(dto: CreateAccountDto\)[\s\S]*?data:\s*\{)/,
      `$1
        detailType: (dto as any).detailType as any || null,
        detailId: (dto as any).detailId || null,`
    );
    changed = true;
  }

  // update: افزودن
  if (!svc.includes("dto.detailType !== undefined")) {
    svc = svc.replace(
      /(async update[\s\S]*?const data: any = \{\};)/,
      `$1
    if ((dto as any).detailType !== undefined) data.detailType = (dto as any).detailType;
    if ((dto as any).detailId !== undefined) data.detailId = (dto as any).detailId;`
    );
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(svcPath, svc, 'utf8');
    console.log('OK service');
  } else {
    console.log('SKIP service');
  }
}

console.log('');
console.log('=== DONE ===');