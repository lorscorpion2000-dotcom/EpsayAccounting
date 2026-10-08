const {PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
(async()=>{
  const fy=await p.fiscalYear.findFirst({where:{status:'OPEN'},select:{id:true,code:true,name:true}});
  console.log('Open FY:', fy);
  const cust=await p.salesCustomer.findFirst({where:{isActive:true},select:{id:true,fullName:true}});
  console.log('SalesCustomer:', cust);
  const contracts=await p.salesContract.findMany({where:{status:'ACTIVE'},take:3,select:{id:true,code:true,customerId:true,status:true}});
  console.log('Contracts:', contracts);
})().finally(()=>p.$disconnect());
