const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SCHEMA = path.join(ROOT, 'prisma', 'schema.prisma');
let s = fs.readFileSync(SCHEMA, 'utf8').replace(/\r\n/g, '\n');

const changed = { enums: 0, models: 0, backrefs: 0 };
const log = (m) => console.log(m);

/* پیدا کردن محل بسته شدن یک model / enum و درج متن قبل از آن */
function insertIntoBlock(src, keyword, name, insertText) {
  const re = new RegExp(`(${keyword}\\s+${name}\\s*\\{[\\s\\S]*?)(\\n\\})`, 'm');
  if (!re.test(src)) { log(`   ⚠ ${keyword} ${name} پیدا نشد`); return src; }
  return src.replace(re, `$1\n${insertText}$2`);
}

/* ────────────────────────────── 1) enums ────────────────────────────── */
if (!/\benum\s+FixedAssetStatus\b/.test(s)) {
  const enumsBlock = `

enum FixedAssetStatus {
  ACTIVE
  FULLY_DEPRECIATED
  DISPOSED
}

enum DepreciationMethod {
  STRAIGHT_LINE
  DECLINING_BALANCE
}
`;
  // درج قبل از اولین model
  const firstModelIdx = s.indexOf('\nmodel ');
  if (firstModelIdx > 0) {
    s = s.slice(0, firstModelIdx) + enumsBlock + s.slice(firstModelIdx);
  } else {
    s = s + enumsBlock;
  }
  changed.enums += 2;
  log('   ✅ enums: FixedAssetStatus + DepreciationMethod اضافه شدند');
} else {
  log('   ✓ enums: از قبل موجودند');
}

/* ────────────────────────────── 2) models ────────────────────────────── */
const newModels = `

model FixedAsset {
  id          String  @id @default(uuid()) @db.Uuid
  code        String  @unique @db.VarChar(32)
  name        String  @db.VarChar(200)
  description String? @db.VarChar(500)

  acquisitionDate  DateTime @map("acquisition_date") @db.Date
  acquisitionCost  Decimal  @map("acquisition_cost") @db.Decimal(20, 2)
  residualValue    Decimal  @default(0) @map("residual_value") @db.Decimal(20, 2)
  usefulLifeMonths Int      @map("useful_life_months")

  depreciationMethod  DepreciationMethod @default(STRAIGHT_LINE) @map("depreciation_method")
  monthlyDepreciation Decimal            @map("monthly_depreciation") @db.Decimal(20, 2)

  accumulatedDepreciation Decimal @default(0) @map("accumulated_depreciation") @db.Decimal(20, 2)
  bookValue               Decimal @default(0) @map("book_value") @db.Decimal(20, 2)

  status FixedAssetStatus @default(ACTIVE)

  assetAccountId             String  @map("asset_account_id") @db.Uuid
  assetAccount               Account @relation("FixedAssetGL", fields: [assetAccountId], references: [id])

  depreciationAccountId      String  @map("depreciation_account_id") @db.Uuid
  depreciationAccount        Account @relation("FixedAssetDeprecGL", fields: [depreciationAccountId], references: [id])

  accumulatedDeprecAccountId String  @map("accumulated_deprec_account_id") @db.Uuid
  accumulatedDeprecAccount   Account @relation("FixedAssetAccumGL", fields: [accumulatedDeprecAccountId], references: [id])

  projectId String?  @map("project_id") @db.Uuid
  project   Project? @relation("FixedAssetProject", fields: [projectId], references: [id])

  costCenterId String?     @map("cost_center_id") @db.Uuid
  costCenter   CostCenter? @relation("FixedAssetCostCenter", fields: [costCenterId], references: [id])

  acquisitionJournalEntryId String?       @map("acquisition_journal_entry_id") @db.Uuid
  acquisitionJournalEntry   JournalEntry? @relation("FixedAssetAcquisitionJE", fields: [acquisitionJournalEntryId], references: [id])

  disposalDate           DateTime? @map("disposal_date") @db.Date
  disposalProceeds       Decimal?  @map("disposal_proceeds") @db.Decimal(20, 2)
  disposalJournalEntryId String?   @map("disposal_journal_entry_id") @db.Uuid
  disposalJournalEntry   JournalEntry? @relation("FixedAssetDisposalJE", fields: [disposalJournalEntryId], references: [id])

  createdById String? @map("created_by_id") @db.Uuid

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  depreciationEntries DepreciationEntry[]

  @@index([status])
  @@index([projectId])
  @@index([acquisitionDate])
  @@map("fixed_assets")
}

model DepreciationEntry {
  id   String @id @default(uuid()) @db.Uuid
  code String @unique @db.VarChar(32)

  fixedAssetId String     @map("fixed_asset_id") @db.Uuid
  fixedAsset   FixedAsset @relation(fields: [fixedAssetId], references: [id], onDelete: Cascade)

  periodYear  Int      @map("period_year")
  periodMonth Int      @map("period_month")
  entryDate   DateTime @map("entry_date") @db.Date

  amount            Decimal @db.Decimal(20, 2)
  accumulatedBefore Decimal @map("accumulated_before") @db.Decimal(20, 2)
  accumulatedAfter  Decimal @map("accumulated_after")  @db.Decimal(20, 2)
  bookValueAfter    Decimal @map("book_value_after")   @db.Decimal(20, 2)

  journalEntryId String?       @map("journal_entry_id") @db.Uuid
  journalEntry   JournalEntry? @relation("DepreciationEntryJE", fields: [journalEntryId], references: [id])

  createdById String? @map("created_by_id") @db.Uuid

  createdAt DateTime @default(now()) @map("created_at")

  @@unique([fixedAssetId, periodYear, periodMonth])
  @@index([periodYear, periodMonth])
  @@map("depreciation_entries")
}
`;

if (!/\bmodel\s+FixedAsset\b/.test(s)) {
  s = s.replace(/\s*$/, '') + newModels + '\n';
  changed.models += 2;
  log('   ✅ models: FixedAsset + DepreciationEntry اضافه شدند');
} else {
  log('   ✓ models: از قبل موجودند');
}

/* ────────────────────────────── 3) back-references ────────────────────────────── */

// Account
if (!/fixedAssetsAsAsset\b/.test(s)) {
  s = insertIntoBlock(s, 'model', 'Account', `  fixedAssetsAsAsset             FixedAsset[] @relation("FixedAssetGL")
  fixedAssetsAsDepreciation      FixedAsset[] @relation("FixedAssetDeprecGL")
  fixedAssetsAsAccumulatedDeprec FixedAsset[] @relation("FixedAssetAccumGL")`);
  changed.backrefs += 3;
  log('   ✅ Account: ۳ back-reference اضافه شد');
} else {
  log('   ✓ Account: از قبل پچ شده');
}

// Project
if (!/fixedAssets\s+FixedAsset\[\]\s+@relation\("FixedAssetProject"\)/.test(s)) {
  s = insertIntoBlock(s, 'model', 'Project', `  fixedAssets FixedAsset[] @relation("FixedAssetProject")`);
  changed.backrefs += 1;
  log('   ✅ Project: back-reference اضافه شد');
} else {
  log('   ✓ Project: از قبل پچ شده');
}

// CostCenter
if (!/fixedAssets\s+FixedAsset\[\]\s+@relation\("FixedAssetCostCenter"\)/.test(s)) {
  s = insertIntoBlock(s, 'model', 'CostCenter', `  fixedAssets FixedAsset[] @relation("FixedAssetCostCenter")`);
  changed.backrefs += 1;
  log('   ✅ CostCenter: back-reference اضافه شد');
} else {
  log('   ✓ CostCenter: از قبل پچ شده');
}

// JournalEntry
if (!/fixedAssetsAcquisition\b/.test(s)) {
  s = insertIntoBlock(s, 'model', 'JournalEntry', `  fixedAssetsAcquisition FixedAsset[]       @relation("FixedAssetAcquisitionJE")
  fixedAssetsDisposal    FixedAsset[]       @relation("FixedAssetDisposalJE")
  depreciationEntries    DepreciationEntry[] @relation("DepreciationEntryJE")`);
  changed.backrefs += 3;
  log('   ✅ JournalEntry: ۳ back-reference اضافه شد');
} else {
  log('   ✓ JournalEntry: از قبل پچ شده');
}

/* ────────────────────────────── write ────────────────────────────── */
fs.writeFileSync(SCHEMA, s, 'utf8');
log(`\n🎉 apply-fix52 تمام شد (enums=${changed.enums}, models=${changed.models}, backrefs=${changed.backrefs})`);