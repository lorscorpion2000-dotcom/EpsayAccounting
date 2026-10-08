const {PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
(async()=>{
  const c=await p.salesCustomer.count();
  const a=await p.account.count({where:{detailType:'CUSTOMER'}});
  const par=await p.account.findFirst({where:{code:'1.1.2'}});
  console.log('SalesCustomer count:', c);
  console.log('CUSTOMER detail accounts:', a);
  console.log('Parent 1.1.2:', par? par.name+' (postable='+par.isPostable+')' : 'NOT FOUND');
})().finally(()=>p.$disconnect());
