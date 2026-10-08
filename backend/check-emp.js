const {PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
(async()=>{
  const a=await p.account.findMany({where:{detailType:'EMPLOYEE'},select:{code:true,name:true,isActive:true}});
  console.log('EMPLOYEE details:');
  if(a.length===0) console.log('  (none yet)');
  a.forEach(x=>console.log(' -',x.code,x.name,'| active:',x.isActive));
  const emps=await p.employeeProfile.findMany({select:{id:true,partnerId:true,partner:{select:{name:true}}}});
  console.log('EmployeeProfile count:', emps.length);
  emps.forEach(e=>console.log('  *', e.partner?.name, '| partnerId:', e.partnerId));
})().finally(()=>p.$disconnect());
