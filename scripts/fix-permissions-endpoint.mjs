import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

// ═══════════════════════════════════════════════════════════════
// 1) بازنویسی permissions.controller.ts — برگرداندن آرایه
// ═══════════════════════════════════════════════════════════════
const controller = `import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Permissions - مجوزها')
@ApiBearerAuth()
@Controller('permissions')
export class PermissionsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @RequirePermissions('settings.read')
  async findAll() {
    return this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });
  }
}
`;

const p = ROOT + '/backend/src/modules/roles/permissions.controller.ts';
fs.writeFileSync(p, controller, 'utf8');
console.log('OK permissions.controller.ts');

// ═══════════════════════════════════════════════════════════════
// 2) محافظت اضافی در frontend — پذیرش هر دو شکل
// ═══════════════════════════════════════════════════════════════
const apiPath = ROOT + '/frontend/src/modules/settings/services/roles.api.ts';
let api = fs.readFileSync(apiPath, 'utf8');

// پیدا کردن permissionsApi.list
const oldList = `  list: async (): Promise<SystemPermission[]> => {
    const { data } = await api.get<SystemPermission[]>('/permissions');
    return data;
  },`;

const newList = `  list: async (): Promise<SystemPermission[]> => {
    const res: any = await api.get('/permissions');
    const d = res?.data;
    if (Array.isArray(d)) return d;
    // اگر grouped object بود
    if (d && typeof d === 'object') {
      return Object.values(d).flat() as SystemPermission[];
    }
    return [];
  },`;

if (api.includes(oldList)) {
  api = api.replace(oldList, newList);
  fs.writeFileSync(apiPath, api, 'utf8');
  console.log('OK roles.api.ts (محافظت)');
} else {
  console.log('SKIP roles.api (الگو نبود)');
}

console.log('');
console.log('=== DONE ===');