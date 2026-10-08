const {PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
(async()=>{
  const accs=await p.account.findMany({where:{detailType:'PETTY_CASH'},select:{code:true,name:true,isActive:true}});
  console.log('PETTY_CASH detail accounts:');
  accs.forEach(a=>console.log(' -',a.code,a.name,'| active:',a.isActive));
  const parent=await p.account.findFirst({where:{code:'1.1.5'},select:{code:true,name:true,isPostable:true}});
  console.log('Parent 1.1.5:',parent);
})().finally(()=>p.$disconnect());
