const {PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
(async()=>{
  const cust=await p.salesCustomer.findMany({select:{id:true,fullName:true,isActive:true}});
  console.log('SalesCustomers:');
  cust.forEach(c=>console.log(' -',c.fullName,'| isActive:',c.isActive));
  const accs=await p.account.findMany({where:{detailType:'CUSTOMER'},select:{code:true,name:true,isActive:true}});
  console.log('Detail accounts:');
  accs.forEach(a=>console.log(' -',a.code,a.name,'| isActive:',a.isActive));
})().finally(()=>p.$disconnect());
