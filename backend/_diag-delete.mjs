import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

(async () => {
  // ۱. اولین پروژه رو بگیر
  const proj = await p.project.findFirst({
    select: { id: true, name: true, code: true, deletedAt: true },
  });
  console.log('═══ اولین پروژه ═══');
  console.log(JSON.stringify(proj, null, 2));

  if (!proj) {
    console.log('❌ هیچ پروژه‌ای نیست');
    await p.$disconnect();
    return;
  }

  // ۲. چک کن در dist admin endpoint هست
  console.log('\n═══ endpoint های admin در dist ═══');
  const fs = await import('node:fs');
  const path = await import('node:path');
  const url = await import('node:url');
  const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

  const distFile = path.join(__dirname, 'dist', 'src', 'modules', 'projects', 'projects.controller.js');
  if (fs.existsSync(distFile)) {
    const src = fs.readFileSync(distFile, 'utf8');
    const adminRoutes = src.match(/Delete\(['"][^'"]*admin[^'"]*['"]\)|adminDelete/g);
    console.log('admin routes:', adminRoutes ? adminRoutes.join(', ') : 'هیچی پیدا نشد');
  } else {
    console.log('❌ dist file پیدا نشد');
  }

  await p.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });