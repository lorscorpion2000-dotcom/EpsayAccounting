$ErrorActionPreference = 'Stop'
Push-Location 'E:\EpsayAccounting\backend'
try {
    $ts   = Get-Date -Format 'yyyyMMdd-HHmmss'
    $utf8 = New-Object System.Text.UTF8Encoding $false
    $base = (Get-Location).Path
    $rsPath = Join-Path $base 'src\modules\accounting\reports.service.ts'
    $alPath = Join-Path $base 'src\modules\accounting\reports\advanced-ledger.service.ts'

    foreach ($p in @($rsPath, $alPath)) {
        if (-not (Test-Path -LiteralPath $p)) { throw "Missing: $p" }
    }

    $rs = [System.IO.File]::ReadAllText($rsPath, $utf8)
    $al = [System.IO.File]::ReadAllText($alPath, $utf8)

    if ($rs.Contains('type AgingPartnerAccum') -and $al.Contains('Prisma.JournalLineWhereInput')) {
        Write-Host "[SKIP] Patches already applied." -ForegroundColor Yellow
        return
    }

    $rsCRLF = $rs.Contains("`r`n")
    $alCRLF = $al.Contains("`r`n")
    $rs = $rs.Replace("`r`n", "`n")
    $al = $al.Replace("`r`n", "`n")

    function RS {
        param($t, $f, $r, $l)
        $fn = $f.Replace("`r`n", "`n").TrimEnd([char]10)
        $rn = $r.Replace("`r`n", "`n").TrimEnd([char]10)
        if (-not $t.Contains($fn)) { throw "FAIL [$l]: pattern not found" }
        return $t.Replace($fn, $rn)
    }

    # ============================================================
    # REPORTS.SERVICE.TS
    # ============================================================

    $oldImport = "import { Injectable } from '@nestjs/common';`nimport { PrismaService } from '../../shared/prisma/prisma.service';"
    $newImport = @'
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AccountLevel, AccountNature } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';

type TrialBalanceAccum = {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountLevel: AccountLevel;
  nature: AccountNature;
  debit: number;
  credit: number;
};

type ProfitLossAccum = {
  accountId: string;
  code: string;
  name: string;
  level: AccountLevel;
  debit: number;
  credit: number;
};

type BalanceSheetAccum = {
  accountId: string;
  code: string;
  name: string;
  level: AccountLevel;
  nature: AccountNature;
  debit: number;
  credit: number;
};

type AgingPartnerAccum = {
  partnerId: string;
  partnerCode: string;
  partnerName: string;
  balance: number;
  current: number;
  days31_60: number;
  days61_90: number;
  days91_180: number;
  days180plus: number;
};

type DetailedTBAccum = {
  accountId: string;
  accountCode: string;
  accountName: string;
  openingDebit: number;
  openingCredit: number;
  periodDebit: number;
  periodCredit: number;
};
'@
    $rs = RS $rs $oldImport $newImport "rs: imports"

    # Where blocks
    $oldBlockA = @'
    const where: any = {
      journalEntry: {
        fiscalYearId: query.fiscalYearId,
        status: { in: ['POSTED', 'REVERSED'] },
        deletedAt: null,
      },
    };

    if (query.fromDate || query.toDate) {
      where.journalEntry.entryDate = {};
      if (query.fromDate) where.journalEntry.entryDate.gte = new Date(query.fromDate);
      if (query.toDate) where.journalEntry.entryDate.lte = new Date(query.toDate);
    }
'@
    $newBlock = @'
    const jeFilter: Prisma.JournalEntryWhereInput = {
      fiscalYearId: query.fiscalYearId,
      status: { in: ['POSTED', 'REVERSED'] },
      deletedAt: null,
    };

    if (query.fromDate || query.toDate) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (query.fromDate) dateFilter.gte = new Date(query.fromDate);
      if (query.toDate) dateFilter.lte = new Date(query.toDate);
      jeFilter.entryDate = dateFilter;
    }

    const where: Prisma.JournalLineWhereInput = { journalEntry: jeFilter };
'@
    $rs = RS $rs $oldBlockA $newBlock "rs: block A"

    $oldBlockB = @'
    const where: any = {
      journalEntry: {
        fiscalYearId: query.fiscalYearId,
        status: { in: ['POSTED', 'REVERSED'] },
        deletedAt: null,
      },
    };
    if (query.fromDate || query.toDate) {
      where.journalEntry.entryDate = {};
      if (query.fromDate) where.journalEntry.entryDate.gte = new Date(query.fromDate);
      if (query.toDate) where.journalEntry.entryDate.lte = new Date(query.toDate);
    }
'@
    $rs = RS $rs $oldBlockB $newBlock "rs: block B"

    $oldBlockBS = @'
    const where: any = {
      journalEntry: {
        fiscalYearId: query.fiscalYearId,
        status: { in: ['POSTED', 'REVERSED'] },
        deletedAt: null,
      },
    };
    if (query.asOfDate) {
      where.journalEntry.entryDate = { lte: new Date(query.asOfDate) };
    }
'@
    $newBlockBS = @'
    const jeFilter: Prisma.JournalEntryWhereInput = {
      fiscalYearId: query.fiscalYearId,
      status: { in: ['POSTED', 'REVERSED'] },
      deletedAt: null,
    };
    if (query.asOfDate) {
      jeFilter.entryDate = { lte: new Date(query.asOfDate) };
    }
    const where: Prisma.JournalLineWhereInput = { journalEntry: jeFilter };
'@
    $rs = RS $rs $oldBlockBS $newBlockBS "rs: block BS"

    $oldLedger = @'
    const where: any = {
      accountId: query.accountId,
      journalEntry: { status: { in: ['POSTED', 'REVERSED'] } },
    };

    if (query.fromDate || query.toDate) {
      where.journalEntry.entryDate = {};
      if (query.fromDate) where.journalEntry.entryDate.gte = new Date(query.fromDate);
      if (query.toDate) where.journalEntry.entryDate.lte = new Date(query.toDate);
    }
'@
    $newLedger = @'
    const jeFilter: Prisma.JournalEntryWhereInput = { status: { in: ['POSTED', 'REVERSED'] } };

    if (query.fromDate || query.toDate) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (query.fromDate) dateFilter.gte = new Date(query.fromDate);
      if (query.toDate) dateFilter.lte = new Date(query.toDate);
      jeFilter.entryDate = dateFilter;
    }

    const where: Prisma.JournalLineWhereInput = { accountId: query.accountId, journalEntry: jeFilter };
'@
    $rs = RS $rs $oldLedger $newLedger "rs: ledger"

    $oldJB = @'
    const where: any = {
      fiscalYearId: query.fiscalYearId,
      status: { in: ['POSTED', 'REVERSED'] },
      deletedAt: null,
    };

    if (query.fromDate || query.toDate) {
      where.entryDate = {};
      if (query.fromDate) where.entryDate.gte = new Date(query.fromDate);
      if (query.toDate) where.entryDate.lte = new Date(query.toDate);
    }
'@
    $newJB = @'
    const where: Prisma.JournalEntryWhereInput = {
      fiscalYearId: query.fiscalYearId,
      status: { in: ['POSTED', 'REVERSED'] },
      deletedAt: null,
    };

    if (query.fromDate || query.toDate) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (query.fromDate) dateFilter.gte = new Date(query.fromDate);
      if (query.toDate) dateFilter.lte = new Date(query.toDate);
      where.entryDate = dateFilter;
    }
'@
    $rs = RS $rs $oldJB $newJB "rs: journalBook"

    $oldParty = @'
    const where: any = {
      partnerId: query.partnerId,
      journalEntry: { status: { in: ['POSTED', 'REVERSED'] }, deletedAt: null },
    };
    if (query.fiscalYearId) where.journalEntry.fiscalYearId = query.fiscalYearId;
    if (query.fromDate || query.toDate) {
      where.journalEntry.entryDate = {};
      if (query.fromDate) where.journalEntry.entryDate.gte = new Date(query.fromDate);
      if (query.toDate) where.journalEntry.entryDate.lte = new Date(query.toDate);
    }
'@
    $newParty = @'
    const jeFilter: Prisma.JournalEntryWhereInput = { status: { in: ['POSTED', 'REVERSED'] }, deletedAt: null };
    if (query.fiscalYearId) jeFilter.fiscalYearId = query.fiscalYearId;
    if (query.fromDate || query.toDate) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (query.fromDate) dateFilter.gte = new Date(query.fromDate);
      if (query.toDate) dateFilter.lte = new Date(query.toDate);
      jeFilter.entryDate = dateFilter;
    }
    const where: Prisma.JournalLineWhereInput = { partnerId: query.partnerId, journalEntry: jeFilter };
'@
    $rs = RS $rs $oldParty $newParty "rs: partyLedger"

    $oldProj = @'
    const where: any = {
      projectId: query.projectId,
      journalEntry: { status: { in: ['POSTED', 'REVERSED'] }, deletedAt: null },
    };
    if (query.fiscalYearId) where.journalEntry.fiscalYearId = query.fiscalYearId;
    if (query.fromDate || query.toDate) {
      where.journalEntry.entryDate = {};
      if (query.fromDate) where.journalEntry.entryDate.gte = new Date(query.fromDate);
      if (query.toDate) where.journalEntry.entryDate.lte = new Date(query.toDate);
    }
'@
    $newProj = @'
    const jeFilter: Prisma.JournalEntryWhereInput = { status: { in: ['POSTED', 'REVERSED'] }, deletedAt: null };
    if (query.fiscalYearId) jeFilter.fiscalYearId = query.fiscalYearId;
    if (query.fromDate || query.toDate) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (query.fromDate) dateFilter.gte = new Date(query.fromDate);
      if (query.toDate) dateFilter.lte = new Date(query.toDate);
      jeFilter.entryDate = dateFilter;
    }
    const where: Prisma.JournalLineWhereInput = { projectId: query.projectId, journalEntry: jeFilter };
'@
    $rs = RS $rs $oldProj $newProj "rs: projectLedger"

    $oldAgingStart = @'
    const where: any = {
      journalEntry: { status: { in: ['POSTED', 'REVERSED'] } },
      partnerId: { not: null },
    };
    if (query.fiscalYearId) where.journalEntry.fiscalYearId = query.fiscalYearId;
'@
    $newAgingStart = @'
    const jeFilter: Prisma.JournalEntryWhereInput = { status: { in: ['POSTED', 'REVERSED'] } };
    if (query.fiscalYearId) jeFilter.fiscalYearId = query.fiscalYearId;
'@
    $rs = RS $rs $oldAgingStart $newAgingStart "rs: aging start"

    $oldAgingEnd = @'
    where.accountId = { in: accountIds };
    where.journalEntry.entryDate = { lte: asOf };
'@
    $newAgingEnd = @'
    jeFilter.entryDate = { lte: asOf };
    const where: Prisma.JournalLineWhereInput = {
      journalEntry: jeFilter,
      partnerId: { not: null },
      accountId: { in: accountIds },
    };
'@
    $rs = RS $rs $oldAgingEnd $newAgingEnd "rs: aging end"

    # ============================================================
    # Map replacements - 5 distinct regex (ordered)
    # ============================================================
    Write-Host ""
    Write-Host "Map replacements:" -ForegroundColor Cyan

    $rs = $rs -replace "Map<string, any>(?=\(\);\s*for \(const line of lines\))", 'Map<string, TrialBalanceAccum>'
    $rs = $rs -replace "Map<string, any>(?=\(\);\s*for \(const l of lines\)\s*\{\s*const acc = l\.account;\s*const first = acc\.code\.charAt\(0\);\s*if \(first !== '4' && first !== '5'\))", 'Map<string, ProfitLossAccum>'
    $rs = $rs -replace "Map<string, any>(?=\(\);\s*for \(const l of lines\)\s*\{\s*const acc = l\.account;\s*const first = acc\.code\.charAt\(0\);\s*if \(!\['1','2','3','4','5'\]\.includes\(first\)\))", 'Map<string, BalanceSheetAccum>'
    $rs = $rs -replace "Map<string, any>(?=\(\);\s*for \(const l of lines\)\s*\{\s*const pid = l\.partnerId!)", 'Map<string, AgingPartnerAccum>'
    $rs = $rs -replace "Map<string, any>", 'Map<string, DetailedTBAccum>'

    $rsRemaining = ([regex]::Matches($rs, 'Map<string, any>')).Count
    Write-Host "  Remaining Map<string, any>: $rsRemaining"

    $rsAny = ([regex]::Matches($rs, ':\s*any\b|<any>|as any|any\[\]')).Count
    $alAny = ([regex]::Matches($al, ':\s*any\b|<any>|as any|any\[\]')).Count

    # ============================================================
    # ADVANCED-LEDGER.SERVICE.TS
    # ============================================================
    $alOldImport = "import { BadRequestException, Injectable } from '@nestjs/common';`nimport { PrismaService } from '../../../shared/prisma/prisma.service';"
    $alNewImport = "import { BadRequestException, Injectable } from '@nestjs/common';`nimport { Prisma } from '@prisma/client';`nimport type { Account } from '@prisma/client';`nimport { PrismaService } from '../../../shared/prisma/prisma.service';"
    $al = RS $al $alOldImport $alNewImport "al: imports"

    $al = RS $al 'let accounts: any[] = [];' 'let accounts: Account[] = [];' "al: accounts"
    $al = RS $al 'const commonWhere: any = {' 'const commonWhere: Prisma.JournalLineWhereInput = {' "al: commonWhere"
    $al = RS $al 'journalEntry: { ...commonWhere.journalEntry, entryDate: { lt: fromDate } },' 'journalEntry: { ...(commonWhere.journalEntry as Prisma.JournalEntryWhereInput), entryDate: { lt: fromDate } },' "al: opening spread"
    $al = RS $al 'journalEntry: { ...commonWhere.journalEntry, entryDate: { gte: fromDate, lte: toDate } },' 'journalEntry: { ...(commonWhere.journalEntry as Prisma.JournalEntryWhereInput), entryDate: { gte: fromDate, lte: toDate } },' "al: lines spread"
    $al = RS $al 'entryNumber: (l.journalEntry as any).entryNumber,' 'entryNumber: l.journalEntry.entryNumber,' "al: entryNumber"
    $al = RS $al 'private async getAccountTree(rootId: string): Promise<any[]> {' 'private async getAccountTree(rootId: string): Promise<Account[]> {' "al: getAccountTree sig"
    $al = RS $al 'const result: any[] = [];' 'const result: Account[] = [];' "al: result"
    $al = RS $al 'const where: any = {' 'const where: Prisma.JournalLineWhereInput = {' "al: where"
    $al = RS $al 'const byAccount: Record<string, any> = {};' 'const byAccount: Record<string, { code: string; name: string; debit: number; credit: number; isRevenue: boolean }> = {};' "al: byAccount"
    $al = RS $al '.filter((a: any) => a.isRevenue)' '.filter((a) => a.isRevenue)' "al: revenues filter"
    $al = RS $al '.map((a: any) => ({ ...a, amount: a.credit - a.debit }));' '.map((a) => ({ ...a, amount: a.credit - a.debit }));' "al: revenues map"
    $al = RS $al '.filter((a: any) => !a.isRevenue)' '.filter((a) => !a.isRevenue)' "al: expenses filter"
    $al = RS $al '.map((a: any) => ({ ...a, amount: a.debit - a.credit }));' '.map((a) => ({ ...a, amount: a.debit - a.credit }));' "al: expenses map"
    $al = RS $al 'const totalRevenue = revenues.reduce((s: number, r: any) => s + r.amount, 0);' 'const totalRevenue = revenues.reduce((s, r) => s + r.amount, 0);' "al: totalRevenue"
    $al = RS $al 'const totalExpense = expenses.reduce((s: number, r: any) => s + r.amount, 0);' 'const totalExpense = expenses.reduce((s, r) => s + r.amount, 0);' "al: totalExpense"

    # re-compute after al
    $alAny = ([regex]::Matches($al, ':\s*any\b|<any>|as any|any\[\]')).Count

    # ============================================================
    # WRITE
    # ============================================================
    if ($rsCRLF) { $rs = $rs.Replace("`n", "`r`n") }
    if ($alCRLF) { $al = $al.Replace("`n", "`r`n") }

    Copy-Item -LiteralPath $rsPath "$rsPath.bak-$ts" -Force
    Copy-Item -LiteralPath $alPath "$alPath.bak-$ts" -Force

    [System.IO.File]::WriteAllText($rsPath, $rs, $utf8)
    [System.IO.File]::WriteAllText($alPath, $al, $utf8)

    Write-Host ""
    Write-Host "=== All patches applied ===" -ForegroundColor Green
    Write-Host "reports.service.ts              any remaining: $rsAny"
    Write-Host "advanced-ledger.service.ts      any remaining: $alAny"
    Write-Host "Backups: *.bak-$ts" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "Verify: npm run build" -ForegroundColor Cyan
    Write-Host ""
}
finally {
    Pop-Location
}