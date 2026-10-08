const {PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
(async()=>{
  const par=await p.account.findFirst({where:{code:'2.1.2'},select:{id:true,code:true,name:true,isPostable:true,nature:true}});
  console.log('Parent 2.1.2:', par);
  const partners=await p.partner.count({where:{type:'EMPLOYEE'}});
  console.log('Partners with type=EMPLOYEE:', partners);
  const emps=await p.employeeProfile.findMany({select:{id:true,partnerId:true}});
  console.log('EmployeeProfile count:', emps.length);
})().finally(()=>p.$disconnect());
