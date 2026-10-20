import fs from 'node:fs';
import path from 'node:path';

const target = path.resolve(process.cwd(), 'test/e2e/forward-materials.e2e.test.ts');

if (!fs.existsSync(target)) {
  console.error('Target file not found:', target);
  process.exit(1);
}

let src = fs.readFileSync(target, 'utf8');

const MARK_START = '/* __AUTO_PATCH_USER_PROJECT_CLEANUP__ START */';
const MARK_END   = '/* __AUTO_PATCH_USER_PROJECT_CLEANUP__ END */';

if (src.includes(MARK_START)) {
  console.log('Patch already applied. Nothing to do.');
  process.exit(0);
}

const afterIdx = src.indexOf('after(async () => {');
if (afterIdx === -1) {
  console.error('Could not find after(async () => { in file.');
  process.exit(2);
}

const insertPos = src.indexOf('{', afterIdx);
if (insertPos === -1) {
  console.error('Could not locate "{" of after()');
  process.exit(3);
}

const patchBlock = `
  ${MARK_START}
  // Auto-added: cleanup userProject rows so teardown doesn't fail when users/projects are deleted
  try {
    if (typeof prisma !== 'undefined' && prisma?.userProject) {
      if (typeof projectId !== 'undefined' && projectId) {
        await prisma.userProject.deleteMany({ where: { projectId } });
      }
    }
  } catch (e) {
    // ignore cleanup errors in tests
  }
  ${MARK_END}
`;

src = src.slice(0, insertPos + 1) + patchBlock + src.slice(insertPos + 1);

fs.writeFileSync(target, src, 'utf8');
console.log('Patched:', target);
