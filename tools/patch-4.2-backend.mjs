import fs from 'node:fs';
import path from 'node:path';

const mainPath = 'E:\\EpsayAccounting\\backend\\src\\main.ts';
const STAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

fs.copyFileSync(mainPath, `${mainPath}.bak-${STAMP}`);
console.log(`✅ backup: main.ts.bak-${STAMP}`);

let txt = fs.readFileSync(mainPath, 'utf8');

// ۱) import helmet
if (!txt.includes("from 'helmet'")) {
  txt = txt.replace(
    `import cookieParser from 'cookie-parser';`,
    `import cookieParser from 'cookie-parser';\nimport helmet from 'helmet';`
  );
  console.log('✅ import helmet');
}

// ۲) helmet config بعد از cookieParser
const marker = `  app.use(cookieParser());`;

const helmetCode = `  app.use(cookieParser());

  // ─── Security Headers (helmet) ───
  app.use(
    helmet({
      // CSP مخصوص API + Swagger UI
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"], // Swagger UI نیاز داره
          styleSrc: ["'self'", "'unsafe-inline'"], // Swagger UI نیاز داره
          imgSrc: ["'self'", 'data:', 'blob:'],
          fontSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // اجازه fetch شدن uploads از فرانت
      crossOriginEmbedderPolicy: false,
      // HSTS فقط اگه HTTPS باشه — الان روی LAN HTTP داریم
      hsts: false,
      referrerPolicy: { policy: 'no-referrer' },
      frameguard: { action: 'deny' },
      noSniff: true,
      xssFilter: true,
    }),
  );`;

if (txt.includes(marker) && !txt.includes('helmet({')) {
  txt = txt.replace(marker, helmetCode);
  console.log('✅ helmet اضافه شد');
} else if (txt.includes('helmet({')) {
  console.log('ℹ️ helmet از قبل هست');
} else {
  console.log('❌ marker پیدا نشد');
  process.exit(1);
}

fs.writeFileSync(mainPath, txt, 'utf8');
console.log('\n=== DONE ✅ ===');