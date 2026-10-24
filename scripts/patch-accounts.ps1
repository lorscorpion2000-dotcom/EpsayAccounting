# ============================================================
# Patch: accounts.service + accounts.controller
# Removes all explicit any (~20 occurrences)
# Safe: nothing written if any pattern missing
# ============================================================

$ErrorActionPreference = 'Stop'
Push-Location 'E:\EpsayAccounting\backend'
try {
    $ts   = Get-Date -Format 'yyyyMMdd-HHmmss'
    $utf8 = New-Object System.Text.UTF8Encoding $false
    $base = (Get-Location).Path

    $svcPath  = Join-Path $base 'src\modules\accounting\accounts.service.ts'
    $ctrlPath = Join-Path $base 'src\modules\accounting\accounts.controller.ts'

    foreach ($p in @($svcPath, $ctrlPath)) {
        if (-not (Test-Path -LiteralPath $p)) { throw "Missing: $p" }
    }

    $service    = [System.IO.File]::ReadAllText($svcPath,  $utf8)
    $controller = [System.IO.File]::ReadAllText($ctrlPath, $utf8)

    if ($service.Contains('type AccountNode') -and $controller.Contains('type AuthenticatedRequest')) {
        Write-Host "[SKIP] Patches already applied." -ForegroundColor Yellow
        return
    }

    $svcCRLF  = $service.Contains("`r`n")
    $ctrlCRLF = $controller.Contains("`r`n")
    $service    = $service.Replace("`r`n", "`n")
    $controller = $controller.Replace("`r`n", "`n")

    function Apply-Patch {
        param([string]$text, [string]$find, [string]$repl, [string]$label)
        $fn = $find.Replace("`r`n", "`n")
        $rn = $repl.Replace("`r`n", "`n")
        if (-not $text.Contains($fn)) {
            Write-Host "[FAIL] $label" -ForegroundColor Red
            Write-Host "---" -ForegroundColor DarkGray
            Write-Host $fn -ForegroundColor DarkGray
            Write-Host "---" -ForegroundColor DarkGray
            throw "Patch failed: $label"
        }
        return $text.Replace($fn, $rn)
    }

    # ============================================================
    # SERVICE
    # ============================================================

    # 1. Import Prisma + Account type; add AccountNode helper
    $oldImports = @'
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateAccountDto, AccountLevelDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
'@
    $newImports = @'
import { Prisma } from '@prisma/client';
import type { Account } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateAccountDto, AccountLevelDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

/**
 * Tree node shape used by findTree(). Account is the base Prisma model type;
 * children is added recursively for the tree response.
 */
type AccountNode = Account & { children: AccountNode[] };
'@
    $service = Apply-Patch $service $oldImports $newImports "service: imports + AccountNode"

    # 2. Replace findTree
    $oldFindTree = @'
  async findTree() {
    const accounts = await this.prisma.account.findMany({
      orderBy: { code: 'asc' },
    });
    const map = new Map<string, any>();
    accounts.forEach((a) => map.set(a.id, { ...a, children: [] }));
    const roots: any[] = [];
    map.forEach((acc) => {
      if (acc.parentId) {
        const parent = map.get(acc.parentId);
        if (parent) parent.children.push(acc);
      } else {
        roots.push(acc);
      }
    });
    return roots;
  }
'@
    $newFindTree = @'
  async findTree(): Promise<AccountNode[]> {
    const accounts = await this.prisma.account.findMany({
      orderBy: { code: 'asc' },
    });
    const map = new Map<string, AccountNode>();
    accounts.forEach((a) => map.set(a.id, { ...a, children: [] }));
    const roots: AccountNode[] = [];
    map.forEach((acc) => {
      if (acc.parentId) {
        const parent = map.get(acc.parentId);
        if (parent) parent.children.push(acc);
      } else {
        roots.push(acc);
      }
    });
    return roots;
  }
'@
    $service = Apply-Patch $service $oldFindTree $newFindTree "service: findTree"

    # 3. findPostable — TAFZIL check without any
    $service = Apply-Patch $service `
        "if (a.level === 'DETAIL' || (a.level as any) === 'TAFZIL') return true;" `
        "if (a.level === 'DETAIL' || (a.level as string) === 'TAFZIL') return true;" `
        "service: findPostable TAFZIL check"

    # 4. Replace create
    $oldCreate = @'
    return this.prisma.account.create({
      data: {
        detailType: (dto as any).detailType as any || null,
        detailId: (dto as any).detailId || null,
        code: dto.code,
        name: dto.name,
        level: dto.level as any,
        nature: dto.nature as any,
        parentId: dto.parentId,
        isActive: dto.isActive ?? true,
        isPostable: dto.isPostable ?? true,
        description: dto.description,
      },
    });
'@
    $newCreate = @'
    const data: Prisma.AccountUncheckedCreateInput = {
      code: dto.code,
      name: dto.name,
      level: dto.level as unknown as Prisma.AccountUncheckedCreateInput['level'],
      nature: dto.nature as unknown as Prisma.AccountUncheckedCreateInput['nature'],
      parentId: dto.parentId,
      isActive: dto.isActive ?? true,
      isPostable: dto.isPostable ?? true,
      description: dto.description,
      detailType: dto.detailType || null,
      detailId: dto.detailId || null,
    };
    return this.prisma.account.create({ data });
'@
    $service = Apply-Patch $service $oldCreate $newCreate "service: create"

    # 5. Replace update
    $oldUpdate = @'
    const data: any = {};
    if ((dto as any).detailType !== undefined) data.detailType = (dto as any).detailType || null;
    if ((dto as any).detailId !== undefined) data.detailId = (dto as any).detailId || null;
    if (dto.code !== undefined) data.code = dto.code;
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.level !== undefined) data.level = dto.level;
    if (dto.nature !== undefined) data.nature = dto.nature;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.isPostable !== undefined) data.isPostable = dto.isPostable;
    if (dto.description !== undefined) data.description = dto.description;
    return this.prisma.account.update({ where: { id }, data });
'@
    $newUpdate = @'
    const data: Prisma.AccountUncheckedUpdateInput = {};
    if (dto.detailType !== undefined) data.detailType = dto.detailType || null;
    if (dto.detailId !== undefined) data.detailId = dto.detailId || null;
    if (dto.code !== undefined) data.code = dto.code;
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.level !== undefined) data.level = dto.level as unknown as Prisma.AccountUncheckedUpdateInput['level'];
    if (dto.nature !== undefined) data.nature = dto.nature as unknown as Prisma.AccountUncheckedUpdateInput['nature'];
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.isPostable !== undefined) data.isPostable = dto.isPostable;
    if (dto.description !== undefined) data.description = dto.description;
    return this.prisma.account.update({ where: { id }, data });
'@
    $service = Apply-Patch $service $oldUpdate $newUpdate "service: update"

    # 6. Replace nextLevel
    $oldNext = @'
  private nextLevel(current: string): AccountLevelDto {
    const order: AccountLevelDto[] = [
      'GROUP' as any, 'GENERAL' as any, 'SUBSIDIARY' as any, 'DETAIL' as any,
    ];
    const idx = order.indexOf(current as any);
    return order[Math.min(idx + 1, order.length - 1)];
  }
'@
    $newNext = @'
  private nextLevel(current: string): AccountLevelDto {
    const order: AccountLevelDto[] = [
      AccountLevelDto.GROUP,
      AccountLevelDto.GENERAL,
      AccountLevelDto.SUBSIDIARY,
      AccountLevelDto.DETAIL,
    ];
    const idx = order.indexOf(current as AccountLevelDto);
    return order[Math.min(idx + 1, order.length - 1)];
  }
'@
    $service = Apply-Patch $service $oldNext $newNext "service: nextLevel"

    # ============================================================
    # CONTROLLER
    # ============================================================

    # 1. Add UnauthorizedException
    $oldCtrlImport = "import {`n  Body, Controller, Delete, Get, Param, Patch, Post, Query, Req,`n} from '@nestjs/common';"
    $newCtrlImport = "import {`n  Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UnauthorizedException,`n} from '@nestjs/common';"
    $controller = Apply-Patch $controller $oldCtrlImport $newCtrlImport "controller: UnauthorizedException"

    # 2. Add Request types after last import
    $findOptInt = "import { OptionalIntPipe } from '../../common/pipes/optional-int.pipe';"
    $replOptInt = $findOptInt + @'


import type { Request } from 'express';

interface AuthUser {
  id?: string;
  email?: string;
  name?: string;
}

type AuthenticatedRequest = Request & { user?: AuthUser };
type AdminUser = Parameters<SoftDeleteService['adminDelete']>[0]['user'];
'@
    $controller = Apply-Patch $controller $findOptInt $replOptInt "controller: types"

    # 3. remove signature
    $controller = Apply-Patch $controller `
        "remove(@Param('id') id: string, @Req() req: any) {" `
        "remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {" `
        "controller: remove signature"

    # 4. adminDelete
    $oldAdmin = @'
  async adminDelete(
    @Param('id') id: string,
    @Body() body: ReasonDto,
    @Req() req: any,
  ) {
    const user = req.user || {};
    return this.softDelete.adminDelete({
      model: 'account',
      id,
      user,
      reason: body?.reason || '',
      meta: { ipAddress: req.ip, userAgent: req.headers?.['user-agent'] },
    });
  }
'@
    $newAdmin = @'
  async adminDelete(
    @Param('id') id: string,
    @Body() body: ReasonDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user) throw new UnauthorizedException('Authentication required');
    const user = req.user as unknown as AdminUser;
    return this.softDelete.adminDelete({
      model: 'account',
      id,
      user,
      reason: body?.reason || '',
      meta: { ipAddress: req.ip, userAgent: req.headers['user-agent'] },
    });
  }
'@
    $controller = Apply-Patch $controller $oldAdmin $newAdmin "controller: adminDelete"

    # 5. restore
    $oldRestore = @'
  async restore(@Param('id') id: string, @Req() req: any) {
    const user = req.user || {};
    return this.softDelete.restore({
      model: 'account',
      id,
      user,
      meta: { ipAddress: req.ip, userAgent: req.headers?.['user-agent'] },
    });
  }
'@
    $newRestore = @'
  async restore(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    if (!req.user) throw new UnauthorizedException('Authentication required');
    const user = req.user as unknown as AdminUser;
    return this.softDelete.restore({
      model: 'account',
      id,
      user,
      meta: { ipAddress: req.ip, userAgent: req.headers['user-agent'] },
    });
  }
'@
    $controller = Apply-Patch $controller $oldRestore $newRestore "controller: restore"

    # ============================================================
    # WRITE
    # ============================================================
    if ($svcCRLF)  { $service    = $service.Replace("`n", "`r`n") }
    if ($ctrlCRLF) { $controller = $controller.Replace("`n", "`r`n") }

    Copy-Item -LiteralPath $svcPath  "$svcPath.bak-$ts"  -Force
    Copy-Item -LiteralPath $ctrlPath "$ctrlPath.bak-$ts" -Force

    [System.IO.File]::WriteAllText($svcPath,  $service,    $utf8)
    [System.IO.File]::WriteAllText($ctrlPath, $controller, $utf8)

    Write-Host ""
    Write-Host "=== All patches applied ===" -ForegroundColor Green
    Write-Host "Backups: *.bak-$ts" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "Verify:" -ForegroundColor Cyan
    Write-Host "  npm run build"
    Write-Host "  npx eslint src/modules/accounting/accounts.service.ts src/modules/accounting/accounts.controller.ts --ext .ts"
    Write-Host ""
}
finally {
    Pop-Location
}