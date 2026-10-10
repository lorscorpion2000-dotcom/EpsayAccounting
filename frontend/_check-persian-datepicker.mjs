import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(__dirname, 'src', 'components', 'PersianDatePicker.tsx');

const src = fs.readFileSync(FILE, 'utf8');
console.log(src);