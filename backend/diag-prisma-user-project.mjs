// scripts/diag-prisma-user-project.mjs
import { PrismaClient } from '@prisma/client';

function listModelDelegates(prisma) {
  return Object.keys(prisma)
    .filter((k) => !k.startsWith('_'))
    .filter((k) => typeof prisma[k] === 'object' || typeof prisma[k] === 'function');
}

function findUserProjectDelegateKey(keys) {
  // Common generated names:
  // UserProject -> userProject
  // user_projects -> user_projects (rare)
  // userProjects (if model named UserProjects)
  const candidates = keys.filter((k) =>
    /user.?project/i.test(k) || /user_projects/i.test(k)
  );

  // Prefer exact expected camelCase
  const preferred =
    candidates.find((k) => k === 'userProject') ||
    candidates.find((k) => k === 'userProjects') ||
    candidates[0];

  return { candidates, preferred };
}

async function main() {
  const prisma = new PrismaClient();

  try {
    const keys = listModelDelegates(prisma);
    console.log('Prisma delegates (first 300):');
    console.log(keys.slice(0, 300));

    const { candidates, preferred } = findUserProjectDelegateKey(keys);
    console.log('\nUserProject-related delegate candidates:', candidates);
    console.log('Selected delegate key:', preferred);

    if (!preferred || typeof prisma[preferred]?.deleteMany !== 'function') {
      console.error(
        '\nERROR: No usable delegate for UserProject was found on PrismaClient.\n' +
          'This usually means Prisma Client is outdated.\n' +
          'Try: npx prisma generate (in backend) and rebuild tests.'
      );
      process.exitCode = 2;
      return;
    }

    // Optional: do a harmless count (won't modify DB)
    const count = await prisma[preferred].count();
    console.log(`\n${preferred}.count() =>`, count);

    // Optional cleanup mode:
    // node scripts/diag-prisma-user-project.mjs --cleanup --projectId=<uuid>
    // OR --userId=<uuid>
    const args = Object.fromEntries(
      process.argv.slice(2).map((a) => {
        const [k, v] = a.split('=');
        return [k.replace(/^--/, ''), v ?? true];
      })
    );

    if (args.cleanup) {
      const where = {};
      if (args.projectId) where.projectId = args.projectId;
      if (args.userId) where.userId = args.userId;

      if (!where.projectId && !where.userId) {
        console.error('\nFor --cleanup you must pass at least --projectId=... or --userId=...');
        process.exitCode = 3;
        return;
      }

      const res = await prisma[preferred].deleteMany({ where });
      console.log('\nCleanup result:', res);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
