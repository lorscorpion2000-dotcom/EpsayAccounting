const {PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
(async()=>{
  const accounts=await p.account.findMany({
    where:{isActive:true, level:{in:['GENERAL','SUBSIDIARY']}},
    select:{code:true,name:true,level:true,nature:true,subtype:true},
    orderBy:{code:'asc'}
  });
  console.log('Total:', accounts.length);
  accounts.forEach(a=>console.log('  '+a.code.padEnd(10)+' | '+String(a.level).padEnd(11)+' | '+String(a.nature).padEnd(6)+' | '+String(a.subtype||'-').padEnd(15)+' | '+a.name));
})().finally(()=>p.$disconnect());
