const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SCHEMA = path.join(ROOT, 'prisma', 'schema.prisma');
let s = fs.readFileSync(SCHEMA, 'utf8').replace(/\r\n/g, '\n');
const log = (m) => console.log(m);

function insertIntoBlock(src, keyword, name, insertText) {
  const re = new RegExp(`(${keyword}\\s+${name}\\s*\\{[\\s\\S]*?)(\\n\\})`, 'm');
  if (!re.test(src)) { log(`   ⚠ ${keyword} ${name} پیدا نشد`); return src; }
  return src.replace(re, `$1\n${insertText}$2`);
}

/* ── enums ── */
if (!/\benum\s+PurchaseInvoiceStatus\b/.test(s)) {
  const block = `

enum PurchaseInvoiceStatus {
  DRAFT
  APPROVED
  PARTIALLY_PAID
  PAID
  CANCELLED
}

enum SupplierPaymentMethod {
  CASH
  BANK_TRANSFER
  CHEQUE
  OTHER
}
`;
  const firstModelIdx = s.indexOf('\nmodel ');
  if (firstModelIdx > 0) s = s.slice(0, firstModelIdx) + block + s.slice(firstModelIdx);
  else s += block;
  log('   ✅ enums: PurchaseInvoiceStatus + SupplierPaymentMethod');
} else log('   ✓ enums');

/* ── models ── */
if (!/\bmodel\s+PurchaseInvoice\b/.test(s)) {
  const models = `

model PurchaseInvoice {
  id            String   @id @default(uuid()) @db.Uuid
  code          String   @unique @db.VarChar(32)
  invoiceNumber String   @map("invoice_number") @db.VarChar(64)
  invoiceDate   DateTime @map("invoice_date") @db.Date
  dueDate       DateTime? @map("due_date") @db.Date

  supplierId String  @map("supplier_id") @db.Uuid
  supplier   Partner @relation("PurchaseInvoiceSupplier", fields: [supplierId], references: [id])

  projectId String?  @map("project_id") @db.Uuid
  project   Project? @relation("PurchaseInvoiceProject", fields: [projectId], references: [id])

  poId String?         @map("po_id") @db.Uuid
  po   PurchaseOrder?  @relation("PIFromPO", fields: [poId], references: [id])

  grId String?       @map("gr_id") @db.Uuid
  gr   GoodsReceipt? @relation("PIFromGR", fields: [grId], references: [id])

  subtotal       Decimal @default(0) @db.Decimal(20, 2)
  taxPercent     Decimal @default(9) @map("tax_percent") @db.Decimal(5, 2)
  taxAmount      Decimal @default(0) @map("tax_amount") @db.Decimal(20, 2)
  discountAmount Decimal @default(0) @map("discount_amount") @db.Decimal(20, 2)
  totalAmount    Decimal @default(0) @map("total_amount") @db.Decimal(20, 2)
  paidAmount     Decimal @default(0) @map("paid_amount") @db.Decimal(20, 2)

  status PurchaseInvoiceStatus @default(DRAFT)
  notes  String?               @db.VarChar(500)

  journalEntryId String?       @map("journal_entry_id") @db.Uuid
  journalEntry   JournalEntry? @relation("PIJournal", fields: [journalEntryId], references: [id])

  approvedAt DateTime? @map("approved_at")
  approvedBy String?   @map("approved_by") @db.Uuid

  createdById String? @map("created_by_id") @db.Uuid

  items    PurchaseInvoiceItem[]
  payments SupplierPayment[]

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([supplierId])
  @@index([projectId])
  @@index([status])
  @@map("purchase_invoices")
}

model PurchaseInvoiceItem {
  id        String          @id @default(uuid()) @db.Uuid
  invoiceId String          @map("invoice_id") @db.Uuid
  invoice   PurchaseInvoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)

  rowNumber   Int      @map("row_number")
  description String   @db.VarChar(500)
  quantity    Decimal  @db.Decimal(20, 4)
  unit        PRItemUnit
  unitPrice   Decimal  @map("unit_price") @db.Decimal(20, 2)
  totalPrice  Decimal  @map("total_price") @db.Decimal(20, 2)

  accountId String?  @map("account_id") @db.Uuid
  account   Account? @relation("PIItemAccount", fields: [accountId], references: [id])

  wbsItemId String?  @map("wbs_item_id") @db.Uuid
  wbsItem   WbsItem? @relation("PIItemWbs", fields: [wbsItemId], references: [id])

  notes String? @db.VarChar(500)

  createdAt DateTime @default(now()) @map("created_at")

  @@index([invoiceId])
  @@map("purchase_invoice_items")
}

model SupplierPayment {
  id   String @id @default(uuid()) @db.Uuid
  code String @unique @db.VarChar(32)

  supplierId String  @map("supplier_id") @db.Uuid
  supplier   Partner @relation("SupplierPaymentSupplier", fields: [supplierId], references: [id])

  invoiceId String?          @map("invoice_id") @db.Uuid
  invoice   PurchaseInvoice? @relation(fields: [invoiceId], references: [id])

  method SupplierPaymentMethod

  bankAccountId String?      @map("bank_account_id") @db.Uuid
  bankAccount   BankAccount? @relation("SupplierPaymentBank", fields: [bankAccountId], references: [id])

  amount      Decimal  @db.Decimal(20, 2)
  paymentDate DateTime @map("payment_date") @db.Date
  reference   String?  @db.VarChar(128)
  notes       String?  @db.VarChar(500)

  journalEntryId String?       @map("journal_entry_id") @db.Uuid
  journalEntry   JournalEntry? @relation("SupplierPaymentJournal", fields: [journalEntryId], references: [id])

  createdById String? @map("created_by_id") @db.Uuid

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([supplierId])
  @@index([invoiceId])
  @@map("supplier_payments")
}
`;
  s = s.replace(/\s*$/, '') + models + '\n';
  log('   ✅ models: PurchaseInvoice + PurchaseInvoiceItem + SupplierPayment');
} else log('   ✓ models');

/* ── back-references ── */
// Partner
if (!/purchaseInvoices\s+PurchaseInvoice\[\]\s+@relation\("PurchaseInvoiceSupplier"\)/.test(s)) {
  s = insertIntoBlock(s, 'model', 'Partner',
    `  purchaseInvoices    PurchaseInvoice[]    @relation("PurchaseInvoiceSupplier")
  supplierPayments    SupplierPayment[]    @relation("SupplierPaymentSupplier")`);
  log('   ✅ Partner: ۲ back-ref');
}
// Project
if (!/purchaseInvoices\s+PurchaseInvoice\[\]\s+@relation\("PurchaseInvoiceProject"\)/.test(s)) {
  s = insertIntoBlock(s, 'model', 'Project',
    `  purchaseInvoices PurchaseInvoice[] @relation("PurchaseInvoiceProject")`);
  log('   ✅ Project: back-ref');
}
// PurchaseOrder
if (!/invoices\s+PurchaseInvoice\[\]\s+@relation\("PIFromPO"\)/.test(s)) {
  s = insertIntoBlock(s, 'model', 'PurchaseOrder',
    `  invoices PurchaseInvoice[] @relation("PIFromPO")`);
  log('   ✅ PurchaseOrder: back-ref');
}
// GoodsReceipt
if (!/purchaseInvoices\s+PurchaseInvoice\[\]\s+@relation\("PIFromGR"\)/.test(s)) {
  s = insertIntoBlock(s, 'model', 'GoodsReceipt',
    `  purchaseInvoices PurchaseInvoice[] @relation("PIFromGR")`);
  log('   ✅ GoodsReceipt: back-ref');
}
// JournalEntry
if (!/purchaseInvoices\s+PurchaseInvoice\[\]\s+@relation\("PIJournal"\)/.test(s)) {
  s = insertIntoBlock(s, 'model', 'JournalEntry',
    `  purchaseInvoices PurchaseInvoice[] @relation("PIJournal")
  supplierPayments SupplierPayment[] @relation("SupplierPaymentJournal")`);
  log('   ✅ JournalEntry: ۲ back-ref');
}
// Account
if (!/purchaseInvoiceItems\s+PurchaseInvoiceItem\[\]\s+@relation\("PIItemAccount"\)/.test(s)) {
  s = insertIntoBlock(s, 'model', 'Account',
    `  purchaseInvoiceItems PurchaseInvoiceItem[] @relation("PIItemAccount")`);
  log('   ✅ Account: back-ref');
}
// WbsItem
if (!/purchaseInvoiceItems\s+PurchaseInvoiceItem\[\]\s+@relation\("PIItemWbs"\)/.test(s)) {
  s = insertIntoBlock(s, 'model', 'WbsItem',
    `  purchaseInvoiceItems PurchaseInvoiceItem[] @relation("PIItemWbs")`);
  log('   ✅ WbsItem: back-ref');
}
// BankAccount
if (!/supplierPayments\s+SupplierPayment\[\]\s+@relation\("SupplierPaymentBank"\)/.test(s)) {
  s = insertIntoBlock(s, 'model', 'BankAccount',
    `  supplierPayments SupplierPayment[] @relation("SupplierPaymentBank")`);
  log('   ✅ BankAccount: back-ref');
}

fs.writeFileSync(SCHEMA, s, 'utf8');
log('\n🎉 apply-fix68 تمام شد');