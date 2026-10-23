// AUTO-REPLACED: seed-admin.mjs delegated to reset-admin.mjs
// (This file previously contained a hardcoded password)
import('./reset-admin.mjs').catch((e) => {
  console.error('reset-admin failed:', e);
  process.exit(1);
});
