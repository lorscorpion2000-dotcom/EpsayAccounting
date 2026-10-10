import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(__dirname, 'src', 'common', 'filters', 'all-exceptions.filter.ts');
console.log(fs.readFileSync(FILE, 'utf8'));