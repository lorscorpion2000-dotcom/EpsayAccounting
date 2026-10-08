/* diag-login.js — پروب login با چاپ کامل پاسخ‌ها */
const BASE = process.env.API_BASE || 'http://localhost:3000';

const PATHS = [
  '/auth/login',
  '/api/auth/login',
  '/api/v1/auth/login',
  '/users/login',
  '/api/users/login'
];

const BODIES = [
  { username: 'admin', password: 'Admin@1404' },
  { email:    'admin', password: 'Admin@1404' },
  { username: 'admin', password: 'admin' },
  { username: 'Admin', password: 'Admin@1404' }
];

async function tryOne(path, body) {
  const url = BASE + path;
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch (e) {
    console.log(`  ⛔ ${path}  [${JSON.stringify(body)}]  → شبکه: ${e.cause?.code || e.message}`);
    return null;
  }
  const text = await res.text();
  const short = text.length > 300 ? text.slice(0, 300) + '…' : text;
  console.log(`  ${res.ok ? '✅' : '❌'} ${path}  [${Object.keys(body).join(',')}]  → ${res.status}  ${short}`);
  if (res.ok) {
    let j; try { j = JSON.parse(text); } catch { return null; }
    return j;
  }
  return null;
}

async function run() {
  console.log('🌐 BASE =', BASE);

  // 1) reachability
  console.log('\n[1] reachability:');
  for (const p of ['/', '/api', '/health', '/api/health', '/auth/login']) {
    try {
      const r = await fetch(BASE + p, { method: 'GET' });
      console.log(`  GET ${p.padEnd(18)} → ${r.status}`);
    } catch (e) {
      console.log(`  GET ${p.padEnd(18)} → ⛔ ${e.cause?.code || e.message}`);
    }
  }

  // 2) login probes
  console.log('\n[2] login probes:');
  let hit = null;
  for (const p of PATHS) {
    for (const b of BODIES) {
      const j = await tryOne(p, b);
      if (j) { hit = { path: p, body: b, res: j }; break; }
    }
    if (hit) break;
  }

  if (hit) {
    console.log('\n🎉 login موفق:');
    console.log('  path :', hit.path);
    console.log('  body :', JSON.stringify(hit.body));
    console.log('  keys :', Object.keys(hit.res).join(', '));
    console.log('  token:', hit.res.access_token || hit.res.accessToken || hit.res.token || '(?)');
  } else {
    console.log('\n💥 هیچ ترکیبی کار نکرد. اگر همه 404 بودند → مسیر login فرق دارد (routes را در backend چک کن).');
  }
}

run();