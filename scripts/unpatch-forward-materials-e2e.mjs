// backend/scripts/unpatch-forward-materials-e2e.mjs
import fs from 'node:fs';
import path from 'node:path';

const target = path.resolve(
  process.cwd(),
  'test/e2e/forward-materials.e2e.test.ts'
);

let src = fs.readFileSync(target, 'utf8');

const MARK_START = '/* __AUTO_PATCH_USER_PROJECT_CLEANUP__ START */';
const MARK_END = '/* __AUTO_PATCH_USER_PROJECT_CLEANUP__ END */';

if (!src.includes(MARK_START)) {
  console.log('No patch markers found. Nothing to remove.');
  process.exit(0);
}

const start = src.indexOf(MARK_START);
const end = src.indexOf(MARK_END);

if (start === -1 || end === -1 || end < start) {
  console.error('Patch markers corrupted; cannot safely unpatch.');
  process.exit(2);
}

const endPos = end + MARK_END.length;
src = src.slice(0, start) + src.slice(endPos);

fs.writeFileSync(target, src, 'utf8');
console.log('Unpatched:', target);
