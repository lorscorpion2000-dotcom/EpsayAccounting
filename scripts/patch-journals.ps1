# ============================================================
# Patch: journals.service + journals.controller
# Removes all explicit any (28 -> 0)
# Also FIXES BUG: journalNo: journal.no -> journalNo: journal.code
# Pure ASCII patterns (mojibake-safe)
# Safe: nothing written if any pattern missing
# ============================================================

$ErrorActionPreference = 'Stop'
Push-Location 'E:\EpsayAccounting\backend'
try {
    $ts   = Get-Date -Format 'yyyyMMdd-HHmmss'
    $utf8 = New-Object System.Text.UTF8Encoding $false
    $base = (Get-Location).Path

    $svcPath  = Join-Path $base 'src\modules\accounting\journals.service.ts'
    $ctrlPath = Join-Path $base 'src\modules\accounting\journals.controller.ts'

    foreach ($p in @($svcPath, $ctrlPath)) {
        if (-not (Test-Path -LiteralPath $p)) { throw "Missing: $p" }
    }

    $service    = [System.IO.File]::ReadAllText($svcPath,  $utf8)
    $controller = [System.IO.File]::ReadAllText($ctrlPath, $utf8)

    if ($service.Contains('type JournalWithLines') -and $controller.Contains('type AuthenticatedRequest')) {
        Write-Host "[SKIP] Patches already applied." -ForegroundColor Yellow
        return
    }

    $svcCRLF  = $service.Contains("`r`n")
    $ctrlCRLF = $controller.Contains("`r`n")
    $service    = $service.Replace("`r`n", "`n")
    $controller = $controller.Replace("`r`n", "`n")

    # ============================================================
    # SERVICE
    # ============================================================

    # 1. import JournalLineDto
    $find1 = "import { CreateJournalDto } from './dto/create-journal.dto';"
    $repl1 = "import { CreateJournalDto, JournalLineDto } from './dto/create-journal.dto';"
    if (-not $service.Contains($find1)) { throw "svc: CreateJournalDto import not found" }
    $service = $service.Replace($find1, $repl1)

    # 2. JournalWithLines helper after 'const D = Prisma.Decimal;'
    $find2 = 'const D = Prisma.Decimal;'
    $repl2 = "const D = Prisma.Decimal;`n`ntype JournalWithLines = Prisma.JournalEntryGetPayload<{`n  include: { lines: { include: { account: true } } };`n}>;"
    if (-not $service.Contains($find2)) { throw "svc: 'const D' not found" }
    $service = $service.Replace($find2, $repl2)

    # 3. where: any -> typed
    $find3 = 'const where: any = { deletedAt: null };'
    $repl3 = 'const where: Prisma.JournalEntryWhereInput = { deletedAt: null };'
    if (-not $service.Contains($find3)) { throw "svc: 'where: any' not found" }
    $service = $service.Replace($find3, $repl3)

    # 4. status cast
    $find4 = 'where.status = query.status;'
    $repl4 = "where.status = query.status as Prisma.JournalEntryWhereInput['status'];"
    if (-not $service.Contains($find4)) { throw "svc: 'where.status = query.status;' not found" }
    $service = $service.Replace($find4, $repl4)

    # 5. date filter block
    $find5 = "      where.entryDate = {};`n      if (query.fromDate) where.entryDate.gte = new Date(query.fromDate);`n      if (query.toDate) where.entryDate.lte = new Date(query.toDate);"
    $repl5 = "      const entryDateFilter: Prisma.DateTimeFilter = {};`n      if (query.fromDate) entryDateFilter.gte = new Date(query.fromDate);`n      if (query.toDate) entryDateFilter.lte = new Date(query.toDate);`n      where.entryDate = entryDateFilter;"
    if (-not $service.Contains($find5)) { throw "svc: date filter block not found" }
    $service = $service.Replace($find5, $repl5)

    # 6. validateAccounts / validateAndCompute signatures
    $find6a = 'private async validateAccounts(lines: any[]) {'
    $repl6a = 'private async validateAccounts(lines: JournalLineDto[]) {'
    if (-not $service.Contains($find6a)) { throw "svc: validateAccounts sig not found" }
    $service = $service.Replace($find6a, $repl6a)

    $find6b = 'private validateAndCompute(lines: any[]) {'
    $repl6b = 'private validateAndCompute(lines: JournalLineDto[]) {'
    if (-not $service.Contains($find6b)) { throw "svc: validateAndCompute sig not found" }
    $service = $service.Replace($find6b, $repl6b)

    # 7. update data: any -> typed
    $find7 = 'const data: any = {};'
    $repl7 = 'const data: Prisma.JournalEntryUpdateInput = {};'
    if (-not $service.Contains($find7)) { throw "svc: 'data: any' not found" }
    $service = $service.Replace($find7, $repl7)

    # 8. journal: any -> JournalWithLines | null (2 occurrences)
    $find8 = 'const journal: any = await this.prisma.journalEntry.findUnique({'
    $repl8 = 'const journal: JournalWithLines | null = await this.prisma.journalEntry.findUnique({'
    if (-not $service.Contains($find8)) { throw "svc: 'journal: any' not found" }
    $service = $service.Replace($find8, $repl8)

    # 9. (journal as any).deletedAt -> journal.deletedAt
    $find9 = '(journal as any).deletedAt'
    $repl9 = 'journal.deletedAt'
    if (-not $service.Contains($find9)) { throw "svc: '(journal as any).deletedAt' not found" }
    $service = $service.Replace($find9, $repl9)

    # 10. .map((l: any) -> .map((l)
    $find10 = 'lines: (journal.lines || []).map((l: any) => ({'
    $repl10 = 'lines: (journal.lines || []).map((l) => ({'
    if (-not $service.Contains($find10)) { throw "svc: '.map((l: any)' not found" }
    $service = $service.Replace($find10, $repl10)

    # 11. reduce (debit + credit)
    $find11a = 'const totalDebit = (journal.lines || []).reduce((s: number, l: any) => s + Number(l.debit || 0), 0);'
    $repl11a = 'const totalDebit = (journal.lines || []).reduce((s, l) => s + Number(l.debit || 0), 0);'
    if (-not $service.Contains($find11a)) { throw "svc: reduce debit not found" }
    $service = $service.Replace($find11a, $repl11a)

    $find11b = 'const totalCredit = (journal.lines || []).reduce((s: number, l: any) => s + Number(l.credit || 0), 0);'
    $repl11b = 'const totalCredit = (journal.lines || []).reduce((s, l) => s + Number(l.credit || 0), 0);'
    if (-not $service.Contains($find11b)) { throw "svc: reduce credit not found" }
    $service = $service.Replace($find11b, $repl11b)

    # 12. snapshot as any -> InputJsonValue
    $find12a = 'linesSnapshot: snapshot.lines as any,'
    $repl12a = 'linesSnapshot: snapshot.lines as unknown as Prisma.InputJsonValue,'
    if (-not $service.Contains($find12a)) { throw "svc: linesSnapshot not found" }
    $service = $service.Replace($find12a, $repl12a)

    $find12b = 'journalSnapshot: snapshot.journal as any,'
    $repl12b = 'journalSnapshot: snapshot.journal as unknown as Prisma.InputJsonValue,'
    if (-not $service.Contains($find12b)) { throw "svc: journalSnapshot not found" }
    $service = $service.Replace($find12b, $repl12b)

    # 13. } as any, -> },
    $find13 = '} as any,'
    $repl13 = '},'
    if (-not $service.Contains($find13)) { throw "svc: '} as any,' not found" }
    $service = $service.Replace($find13, $repl13)

    # 14. existing: any -> no type
    $find14 = 'const existing: any = await this.prisma.journalEntry.findUnique({ where: { id } });'
    $repl14 = 'const existing = await this.prisma.journalEntry.findUnique({ where: { id } });'
    if (-not $service.Contains($find14)) { throw "svc: 'existing: any' not found" }
    $service = $service.Replace($find14, $repl14)

    # 15. FIX BUG: journalNo: journal.no -> journalNo: journal.code
    $find15 = 'journalNo: journal.no,'
    $repl15 = 'journalNo: journal.code,'
    if (-not $service.Contains($find15)) { throw "svc: 'journalNo: journal.no' not found (bug fix target)" }
    $service = $service.Replace($find15, $repl15)

    # ============================================================
    # CONTROLLER
    # ============================================================

    # 1. cleanup ';;'
    $controller = $controller.Replace(';;', ';')

    # 2. add UnauthorizedException
    $findC2 = "Query, Req } from '@nestjs/common';"
    $replC2 = "Query, Req, UnauthorizedException } from '@nestjs/common';"
    if (-not $controller.Contains($findC2)) { throw "ctrl: nestjs/common import line not found" }
    $controller = $controller.Replace($findC2, $replC2)

    # 3. JournalEntry type import after JournalStatus import
    $findC3 = "import { JournalStatus } from '@prisma/client';"
    $replC3 = "import { JournalStatus } from '@prisma/client';`nimport type { JournalEntry } from '@prisma/client';"
    if (-not $controller.Contains($findC3)) { throw "ctrl: JournalStatus import not found" }
    $controller = $controller.Replace($findC3, $replC3)

    # 4. AuthUser/AuthenticatedRequest types
    $findC4 = "import { ReasonDto, ReasonForceDto } from '../../common/dto';"
    $replC4 = "import { ReasonDto, ReasonForceDto } from '../../common/dto';`n`nimport type { Request } from 'express';`n`ninterface AuthUser {`n  id?: string;`n  email?: string;`n  name?: string;`n  username?: string;`n  fullName?: string;`n  permissions?: string[];`n}`n`ntype AuthenticatedRequest = Request & { user?: AuthUser };"
    if (-not $controller.Contains($findC4)) { throw "ctrl: ReasonDto import not found" }
    $controller = $controller.Replace($findC4, $replC4)

    # 5. (dto as any).reversalDate -> dto.reversalDate (2 occurrences)
    $findC5 = '(dto as any).reversalDate'
    $replC5 = 'dto.reversalDate'
    if (-not $controller.Contains($findC5)) { throw "ctrl: '(dto as any).reversalDate' not found" }
    $controller = $controller.Replace($findC5, $replC5)

    # 6. @Req() req: any -> @Req() req: AuthenticatedRequest (3 occurrences)
    $findC6 = '@Req() req: any'
    $replC6 = '@Req() req: AuthenticatedRequest'
    if (-not $controller.Contains($findC6)) { throw "ctrl: '@Req() req: any' not found" }
    $controller = $controller.Replace($findC6, $replC6)

    # 7. user = req.user || {} -> guard + cast (3 occurrences)
    $findC7 = 'const user = req.user || {};'
    $replC7 = "if (!req.user?.id) throw new UnauthorizedException('Authentication required');`n    const user = req.user as AuthUser & { id: string };"
    if (-not $controller.Contains($findC7)) { throw "ctrl: 'user = req.user || {}' not found" }
    $controller = $controller.Replace($findC7, $replC7)

    # 8. const j: any -> const j: JournalEntry | null
    $findC8 = 'const j: any = '
    $replC8 = 'const j: JournalEntry | null = '
    if (-not $controller.Contains($findC8)) { throw "ctrl: 'const j: any' not found" }
    $controller = $controller.Replace($findC8, $replC8)

    # 9. const err: any = new Error( -> Error & { status?: number }
    $findC9 = 'const err: any = new Error('
    $replC9 = 'const err: Error & { status?: number } = new Error('
    if (-not $controller.Contains($findC9)) { throw "ctrl: 'const err: any = new Error(' not found" }
    $controller = $controller.Replace($findC9, $replC9)

    # ============================================================
    # VERIFICATION: any remaining
    # ============================================================
    $svcRemaining  = ([regex]::Matches($service,    ':\s*any\b|<any>|as any|any\[\]')).Count
    $ctrlRemaining = ([regex]::Matches($controller, ':\s*any\b|<any>|as any|any\[\]')).Count

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
    Write-Host "Service 'any' remaining    : $svcRemaining"
    Write-Host "Controller 'any' remaining : $ctrlRemaining"
    Write-Host "BUG FIXED                  : journalNo now uses journal.code (was journal.no)"
    Write-Host "Backups                    : *.bak-$ts" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "Verify:" -ForegroundColor Cyan
    Write-Host "  npm run build"
    Write-Host "  npx eslint src/modules/accounting/journals.service.ts src/modules/accounting/journals.controller.ts --ext .ts"
    Write-Host ""
}
finally {
    Pop-Location
}