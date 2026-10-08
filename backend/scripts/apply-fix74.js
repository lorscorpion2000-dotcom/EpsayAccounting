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
if (!/\benum\s+SalesInvoiceStatus\b/.test(s)) {
  const block = `

enum SalesInvoiceStatus {
  DRAFT
  APPROVED
  PARTIALLY_RECEIVED
  PAID
  CANCELLED
}

enum SalesReceiptMethod {
  CASH
  BANK_TRANSFER
  CHEQUE
  OTHER
}
`;
  const firstModelIdx = s.indexOf('\nmodel ');
  if (firstModelIdx > 0) s = s.slice(0, firstModelIdx) + block + s.slice(firstModelIdx);
  else s += block;
  log('   ✅ enums: SalesInvoiceStatus + SalesReceiptMethod');
} else log('   ✓ enums');

/* ── models ── */
if (!/\bmodel\s+SalesInvoice\b/.test(s)) {
  const models = `

model SalesInvoice {
  id            String   @id @default(uuid()) @db.Uuid
  code          String   @unique @db.VarChar(32)
  invoiceNumber String   @map("invoice_number") @db.VarChar(64)
  invoiceDate   DateTime @map("invoice_date") @db.Date
  dueDate       DateTime? @map("due_date") @db.Date

  customerId String        @map("customer_id")
  customer   SalesCustomer @relation("SIFromCustomer", fields: [customerId], references: [id])

  contractId String?        @map("contract_id")
  contract   SalesContract? @relation("SIFromContract", fields: [contractId], references: [id])

  projectId String?  @map("project_id") @db.Uuid
  project   Project? @relation("SIProject", fields: [projectId], references: [id])

  /** Partner متناظر مشتری — هنگام approve ساخته/وصل می‌شود */
  partnerId String?  @map("partner_id") @db.Uuid
  partner   Partner? @relation("SIPartner", fields: [partnerId], references: [id])

  subtotal       Decimal @default(0) @db.Decimal(20, 2)
  taxPercent     Decimal @default(9) @map("tax_percent") @db.Decimal(5, 2)
  taxAmount      Decimal @default(0) @map("tax_amount") @db.Decimal(20, 2)
  discountAmount Decimal @default(0) @map("discount_amount") @db.Decimal(20, 2)
  totalAmount    Decimal @default(0) @map("total_amount") @db.Decimal(20, 2)
  receivedAmount Decimal @default(0) @map("received_amount") @db.Decimal(20, 2)

  status SalesInvoiceStatus @default(DRAFT)
  notes  String?            @db.VarChar(500)

  journalEntryId String?       @map("journal_entry_id") @db.Uuid
  journalEntry   JournalEntry? @relation("SIJournal", fields: [journalEntryId], references: [id])

  approvedAt DateTime? @map("approved_at")
  approvedBy String?   @map("approved_by") @db.Uuid

  createdById String? @map("created_by_id") @db.Uuid

  items    SalesInvoiceItem[]
  receipts SalesReceipt[]

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([customerId])
  @@index([contractId])
  @@index([status])
  @@map("sales_invoices")
}

model SalesInvoiceItem {
  id        String       @id @default(uuid()) @db.Uuid
  invoiceId String       @map("invoice_id") @db.Uuid
  invoice   SalesInvoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)

  rowNumber   Int      @map("row_number")
  description String   @db.VarChar(500)
  quantity    Decimal  @db.Decimal(20, 4)
  unit        String?  @db.VarChar(32)
  unitPrice   Decimal  @map("unit_price") @db.Decimal(20, 2)
  totalPrice  Decimal  @map("total_price") @db.Decimal(20, 2)

  accountId String?  @map("account_id") @db.Uuid
  account   Account? @relation("SIItemAccount", fields: [accountId], references: [id])

  notes String? @db.VarChar(500)

  createdAt DateTime @default(now()) @map("created_at")

  @@index([invoiceId])
  @@map("sales_invoice_items")
}

model SalesReceipt {
  id   String @id @default(uuid()) @db.Uuid
  code String @unique @db.VarChar(32)

  customerId String        @map("customer_id")
  customer   SalesCustomer @relation("SRFromCustomer", fields: [customerId], references: [id])

  invoiceId String?       @map("invoice_id") @db.Uuid
  invoice   SalesInvoice? @relation(fields: [invoiceId], references: [id])

  method SalesReceiptMethod

  bankAccountId String?      @map("bank_account_id") @db.Uuid
  bankAccount   BankAccount? @relation("SRBank", fields: [bankAccountId], references: [id])

  amount      Decimal  @db.Decimal(20, 2)
  receiptDate DateTime @map("receipt_date") @db.Date
  reference   String?  @db.VarChar(128)
  notes       String?  @db.VarChar(500)

  journalEntryId String?       @map("journal_entry_id") @db.Uuid
  journalEntry   JournalEntry? @relation("SRJournal", fields: [journalEntryId], references: [id])

  createdById String? @map("created_by_id") @db.Uuid

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([customerId])
  @@index([invoiceId])
  @@map("sales_receipts")
}
`;
  s = s.replace(/\s*$/, '') + models + '\n';
  log('   ✅ models: SalesInvoice + SalesInvoiceItem + SalesReceipt');
} else log('   ✓ models');

/* ── back-references ── */
if (!/salesInvoices\s+SalesInvoice\[\]\s+@relation\("SIFromCustomer"\)/.test(s)) {
  s = insertIntoBlock(s, 'model', 'SalesCustomer',
    `  salesInvoices SalesInvoice[] @relation("SIFromCustomer")
  salesReceipts SalesReceipt[] @relation("SRFromCustomer")`);
  log('   ✅ SalesCustomer: ۲ back-ref');
}
if (!/salesInvoices\s+SalesInvoice\[\]\s+@relation\("SIFromContract"\)/.test(s)) {
  s = insertIntoBlock(s, 'model', 'SalesContract',
    `  salesInvoices SalesInvoice[] @relation("SIFromContract")`);
  log('   ✅ SalesContract: back-ref');
}
if (!/salesInvoices\s+SalesInvoice\[\]\s+@relation\("SIProject"\)/.test(s)) {
  s = insertIntoBlock(s, 'model', 'Project',
    `  salesInvoices SalesInvoice[] @relation("SIProject")`);
  log('   ✅ Project: back-ref');
}
if (!/salesInvoicesAsPartner\s+SalesInvoice\[\]\s+@relation\("SIPartner"\)/.test(s)) {
  s = insertIntoBlock(s, 'model', 'Partner',
    `  salesInvoicesAsPartner SalesInvoice[] @relation("SIPartner")`);
  log('   ✅ Partner: back-ref');
}
if (!/salesInvoices\s+SalesInvoice\[\]\s+@relation\("SIJournal"\)/.test(s)) {
  s = insertIntoBlock(s, 'model', 'JournalEntry',
    `  salesInvoices SalesInvoice[] @relation("SIJournal")
  salesReceipts SalesReceipt[] @relation("SRJournal")`);
  log('   ✅ JournalEntry: ۲ back-ref');
}
if (!/salesInvoiceItems\s+SalesInvoiceItem\[\]\s+@relation\("SIItemAccount"\)/.test(s)) {
  s = insertIntoBlock(s, 'model', 'Account',
    `  salesInvoiceItems SalesInvoiceItem[] @relation("SIItemAccount")`);
  log('   ✅ Account: back-ref');
}
if (!/salesReceipts\s+SalesReceipt\[\]\s+@relation\("SRBank"\)/.test(s)) {
  s = insertIntoBlock(s, 'model', 'BankAccount',
    `  salesReceipts SalesReceipt[] @relation("SRBank")`);
  log('   ✅ BankAccount: back-ref');
}

fs.writeFileSync(SCHEMA, s, 'utf8');
log('\n🎉 apply-fix74 تمام شد');