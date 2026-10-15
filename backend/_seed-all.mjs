// _seed-all.mjs v2 ΓÇö master seed: run all seed steps in correct order
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const cwd = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));

const steps = [
  {
    name: '█▒/█╢ ┘╛╪º█î┘ç (roles, users, core perms)',
    cmd: 'npx ts-node prisma/seed.ts',
    check: 'prisma/seed.ts',
  },
  {
    name: '█▓/█╢ ┌⌐╪»█î┘å┌» ╪¡╪│╪º╪¿ΓÇî┘ç╪º',
    cmd: 'npx ts-node prisma/seed-accounting.ts',
    check: 'prisma/seed-accounting.ts',
  },
  {
    name: '█│/█╢ ╪¡╪│╪º╪¿ΓÇî┘ç╪º█î ┌»┘à + mapping ┘╛╪º█î┘ç',
    cmd: 'node _seed-extra.mjs',
    check: '_seed-extra.mjs',
  },
  {
    name: '█┤/█╢ ╪¡╪│╪º╪¿ΓÇî┘ç╪º█î ┘à╪º╪┤█î┘å + mapping B3',
    cmd: 'node _b3-0.mjs',
    check: '_b3-0.mjs',
  },
  {
    name: '█╡/█╢ ╪º╪│┌⌐┘å ┘ê ╪│╪º╪«╪¬ permission ┌»┘à',
    cmd: 'node _scan-perms.mjs',
    check: '_scan-perms.mjs',
  },
  {
    name: '█╢/█╢ ┘é╪º┘ä╪¿ΓÇî┘ç╪º█î ┘é╪▒╪º╪▒╪»╪º╪»',
    cmd: 'node _b15-3-seed.mjs',
    check: '_b15-3-seed.mjs',
  },
];

console.log('ΓòÉΓòÉΓòÉ MASTER SEED ΓòÉΓòÉΓòÉ');

let failed = 0;
for (const s of steps) {
  const abs = path.join(cwd, s.check);
  if (!fs.existsSync(abs)) {
    console.log('');
    console.log('[~] ' + s.name + ' ΓÇö skipped');
    console.log('    file not found: ' + abs);
    continue;
  }
  console.log('');
  console.log('Γû╢ ' + s.name);
  try {
    execSync(s.cmd, { cwd, stdio: 'inherit' });
    console.log('Γ£ô ' + s.name);
  } catch (e) {
    console.error('Γ£ù ' + s.name + ' ΓÇö failed with exit code ' + e.status);
    failed++;
  }
}

console.log('');
if (failed === 0) {
  console.log('ΓòÉΓòÉΓòÉ ALL DONE ΓòÉΓòÉΓòÉ');
  console.log('╪º┌⌐┘å┘ê┘å ╪│╪▒┘ê█î╪│ ╪▒╪º ╪▒█îΓÇî╪º╪│╪¬╪º╪▒╪¬ ┌⌐┘å:');
  if (process.platform === 'win32') {
    console.log('  powershell -ExecutionPolicy Bypass -File E:\\EpsayAccounting\\rebuild-restart.ps1');
  }
} else {
  console.log('ΓòÉΓòÉΓòÉ ' + failed + ' STEP(S) FAILED ΓòÉΓòÉΓòÉ');
  console.log('╪»╪│╪¬┘ê╪▒ ╪«╪╖╪º╪»╪º╪▒ ╪▒╪º ╪»╪│╪¬█î ╪¿╪▒╪▒╪│█î ┌⌐┘å.');
  process.exit(1);
}
