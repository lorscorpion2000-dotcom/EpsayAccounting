const {PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
(async()=>{
  const entries=await p.journalEntry.findMany({
    where:{sourceType:{in:['SALE_INSTALLMENT_CASH','SALE_INSTALLMENT_BANK']}},
    orderBy:{createdAt:'desc'},take:5,
    include:{lines:{include:{account:{select:{code:true,name:true}}}}}
  });
  console.log('Auto entries:', entries.length);
  entries.forEach(e=>{
    console.log('─', e.code, '|', e.status, '|', e.description);
    e.lines.forEach(l=>console.log('   ', Number(l.debit)>0?'Dr':'Cr', Number(l.debit)>0?l.debit:l.credit, '|', l.account.code, l.account.name));
  });
})().finally(()=>p.$disconnect());
