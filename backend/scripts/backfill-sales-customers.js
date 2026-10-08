const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
(async () => {
  const parent = await prisma.account.findFirst({ where: { code: "1.1.2" } });
  if (!parent) throw new Error("Parent 1.1.2 not found");
  const customers = await prisma.salesCustomer.findMany();
  console.log("Found " + customers.length + " customers");
  let created = 0, skipped = 0;
  for (const c of customers) {
    const existing = await prisma.account.findFirst({ where: { detailType: "CUSTOMER", detailId: c.id } });
    if (existing) { skipped++; continue; }
    const siblings = await prisma.account.findMany({ where: { parentId: parent.id }, select: { code: true } });
    let maxLast = 0;
    for (const s of siblings) { const p = s.code.split("."); const l = parseInt(p[p.length-1],10)||0; if (l>maxLast) maxLast=l; }
    const nextCode = parent.code + "." + String(maxLast+1).padStart(2,"0");
    await prisma.account.create({ data: { code: nextCode, name: c.fullName, level: "DETAIL", nature: parent.nature, parentId: parent.id, isPostable: true, isActive: true, detailType: "CUSTOMER", detailId: c.id } });
    console.log("  + " + nextCode + "  " + c.fullName);
    created++;
  }
  if (parent.isPostable) await prisma.account.update({ where: { id: parent.id }, data: { isPostable: false } });
  console.log("Done. Created: " + created + ", Skipped: " + skipped);
})().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
